package com.fintech.loan.service;

import com.fintech.loan.dto.request.LoanApplicationRequest;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.entity.LoanApplication;
import com.fintech.loan.entity.LoanIdempotencyKey;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanIdempotencyKeyRepository;
import com.fintech.loan.repository.LoanProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanProductRepository loanProductRepository;
    private final LoanIdempotencyKeyRepository idempotencyKeyRepository;

    public LoanApplicationService(LoanApplicationRepository loanApplicationRepository,
                                   LoanProductRepository loanProductRepository,
                                   LoanIdempotencyKeyRepository idempotencyKeyRepository) {
        this.loanApplicationRepository = loanApplicationRepository;
        this.loanProductRepository = loanProductRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    @Transactional
    public LoanApplicationResponse applyForLoan(LoanApplicationRequest request,
                                                  String idempotencyKey,
                                                  String customerId) {
        // Check idempotency
        idempotencyKeyRepository.findByIdempotencyKeyAndOperation(idempotencyKey, "LOAN_APPLICATION")
                .ifPresent(existing -> {
                    throw new ApiException("DUPLICATE_REQUEST",
                            "A request with this Idempotency-Key has already been processed.",
                            HttpStatus.CONFLICT);
                });

        // Validate credit bureau consent
        if (!Boolean.TRUE.equals(request.getCreditBureauConsent())) {
            throw new ApiException("CREDIT_BUREAU_CONSENT_REQUIRED",
                    "Credit bureau consent is required to process loan application.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Fetch product
        LoanProduct product = loanProductRepository.findById(request.getProductCode())
                .orElseThrow(() -> new ApiException("PRODUCT_NOT_FOUND",
                        "Loan product not found: " + request.getProductCode(),
                        HttpStatus.NOT_FOUND));

        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new ApiException("PRODUCT_UNAVAILABLE",
                    "Loan product is not currently available", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Validate amount range
        if (request.getRequestedAmount().compareTo(product.getMinAmount()) < 0
                || request.getRequestedAmount().compareTo(product.getMaxAmount()) > 0) {
            throw new ApiException("AMOUNT_OUT_OF_RANGE",
                    String.format("Requested amount must be between %s and %s",
                            product.getMinAmount(), product.getMaxAmount()),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        if (request.getTenureMonths() < product.getMinTenureMonths()
                || request.getTenureMonths() > product.getMaxTenureMonths()) {
            throw new ApiException("TENURE_OUT_OF_RANGE",
                    "Requested tenure is outside the selected product limits",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // KYC is not integrated yet, so do not start a credit assessment as if it passed.

        // Generate application ID
        String loanApplicationId = generateLoanApplicationId();
        LoanApplication application = new LoanApplication();
        application.setLoanApplicationId(loanApplicationId);
        application.setCustomerId(customerId);
        application.setProductCode(request.getProductCode());
        application.setRequestedAmount(request.getRequestedAmount());
        application.setTenureMonths(request.getTenureMonths());
        application.setPurpose(request.getPurpose());
        application.setCreditBureauConsent(request.getCreditBureauConsent());
        application.setStatus("PENDING_KYC_REVIEW");
        application.setCreditAssessmentStatus("NOT_STARTED");
        application.setEstimatedDecisionTime(null);
        application.setCreatedAt(Instant.now());
        application.setUpdatedAt(Instant.now());

        if (request.getIncomeDetails() != null) {
            application.setEmploymentType(request.getIncomeDetails().getEmploymentType());
            application.setMonthlyIncome(request.getIncomeDetails().getMonthlyIncome());
            application.setEmployerName(request.getIncomeDetails().getEmployerName());
        }

        loanApplicationRepository.save(application);

        // Store idempotency key
        LoanIdempotencyKey ikey = new LoanIdempotencyKey();
        ikey.setIdempotencyKey(idempotencyKey);
        ikey.setOperation("LOAN_APPLICATION");
        ikey.setResponseReference(loanApplicationId);
        idempotencyKeyRepository.save(ikey);

        return new LoanApplicationResponse(
                loanApplicationId, "PENDING_KYC_REVIEW", "NOT_STARTED", null);
    }

    private String generateLoanApplicationId() {
        return "LN-APP-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
    }
}
