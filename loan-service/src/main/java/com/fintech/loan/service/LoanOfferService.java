package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.AcceptLoanOfferRequest;
import com.fintech.loan.dto.response.AcceptOfferResponse;
import com.fintech.loan.dto.response.LoanLifecycleResponses.SanctionedOfferDetailsResponse;
import com.fintech.loan.entity.LoanApplication;
import com.fintech.loan.entity.LoanOffer;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanApplicationStatus;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanOfferRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

@Service
public class LoanOfferService {

    private final LoanOfferRepository loanOfferRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanIdempotencyService idempotencyService;
    private final LoanLifecycleService lifecycleService;
    private final AccountServiceClient accountServiceClient;
    private final LoanFinancialCalculator calculator;
    private final LoanNotificationService notificationService;

    public LoanOfferService(
            LoanOfferRepository loanOfferRepository,
            LoanApplicationRepository loanApplicationRepository,
            LoanIdempotencyService idempotencyService,
            LoanLifecycleService lifecycleService,
            AccountServiceClient accountServiceClient,
            LoanFinancialCalculator calculator,
            LoanNotificationService notificationService) {
        this.loanOfferRepository = loanOfferRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.idempotencyService = idempotencyService;
        this.lifecycleService = lifecycleService;
        this.accountServiceClient = accountServiceClient;
        this.calculator = calculator;
        this.notificationService = notificationService;
    }

    @Transactional
    public AcceptOfferResponse acceptOffer(String identitySubject, String offerId,
                                           String idempotencyKey, AcceptLoanOfferRequest request) {
        String requestHash = idempotencyService.computeHash(offerId + ":" + request.getAcceptedTermsVersion() + ":" + request.getDisbursementAccountId());
        Optional<AcceptOfferResponse> cached = idempotencyService.findReplay(
                idempotencyKey, "ACCEPT_OFFER", identitySubject, requestHash, AcceptOfferResponse.class);
        if (cached.isPresent()) {
            return cached.get();
        }

        LoanOffer offer = loanOfferRepository.findByOfferId(offerId)
                .orElseThrow(() -> new ApiException("OFFER_NOT_FOUND",
                        "Loan offer not found: " + offerId, HttpStatus.NOT_FOUND));

        LoanApplication application = loanApplicationRepository.findByLoanApplicationId(offer.getLoanApplicationId())
                .orElseThrow(() -> new ApiException("APPLICATION_NOT_FOUND",
                        "Loan application not found for offer: " + offerId, HttpStatus.NOT_FOUND));

        boolean ownedByCustomer = (application.getIdentitySubject() != null && application.getIdentitySubject().equalsIgnoreCase(identitySubject))
                || (application.getCustomerId() != null && application.getCustomerId().equalsIgnoreCase(identitySubject));
        if (!ownedByCustomer) {
            throw new ApiException("OFFER_NOT_FOUND", "Loan offer not found: " + offerId, HttpStatus.NOT_FOUND);
        }

        if ("ACCEPTED".equals(offer.getStatus())) {
            throw new ApiException("OFFER_ALREADY_ACCEPTED",
                    "This loan offer has already been accepted.", HttpStatus.CONFLICT);
        }

        if ("EXPIRED".equals(offer.getStatus())
                || (offer.getExpiresAt() != null && !offer.getExpiresAt().isAfter(Instant.now()))) {
            throw new ApiException("OFFER_EXPIRED", "This loan offer has expired.", HttpStatus.GONE);
        }

        // Verify disbursement account ownership & active status
        String accountIdentifier = (request.getDisbursementAccountId() != null && !request.getDisbursementAccountId().isBlank())
                ? request.getDisbursementAccountId()
                : application.getDisbursementAccountId();

        InternalAccountDto verifiedAccount = accountServiceClient.validateDisbursementAccount(
                accountIdentifier,
                identitySubject,
                application.getCustomerId(),
                offer.getCurrency()
        );

        offer.setStatus("ACCEPTED");
        offer.setTermsVersion(request.getAcceptedTermsVersion());
        offer.setDisbursementAccountId(verifiedAccount.accountId());
        offer.setAcceptedAt(Instant.now());
        offer.setUpdatedAt(Instant.now());
        loanOfferRepository.save(offer);

        application.setDisbursementAccountId(verifiedAccount.accountId());
        application.setDisbursementAccountNumber(verifiedAccount.accountNumberMasked());

        lifecycleService.transitionStatus(
                application,
                LoanApplicationStatus.OFFER_ACCEPTED,
                identitySubject,
                LoanConstants.ROLE_CUSTOMER,
                "Customer accepted sanctioned offer " + offerId + " (terms " + request.getAcceptedTermsVersion() + ")",
                "OFFER_ACCEPTED"
        );

        notificationService.notifyCustomer(
                identitySubject,
                "LOAN_OFFER_ACCEPTED",
                "Loan Offer Accepted: " + offerId,
                "You have accepted loan offer " + offerId + " for application " + application.getLoanApplicationId()
                        + ". Disbursement is being scheduled.",
                application.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_MANAGER, null,
                "LOAN_OFFER_ACCEPTED",
                "Offer Accepted - Ready for Disbursement: " + application.getLoanApplicationId(),
                "Customer accepted offer " + offerId + " for application " + application.getLoanApplicationId() + ".",
                application.getLoanApplicationId()
        );

        BigDecimal monthlyEmi = calculator.calculateEmi(
                offer.getSanctionedAmount(), offer.getInterestRate(), offer.getTenureMonths(),
                InterestCalculationMethod.REDUCING_BALANCE);

        AcceptOfferResponse response = new AcceptOfferResponse(
                offer.getLoanApplicationId(),
                offer.getOfferId(),
                "ACCEPTED",
                offer.getSanctionedAmount(),
                offer.getInterestRate(),
                offer.getTenureMonths(),
                monthlyEmi
        );

        idempotencyService.record(idempotencyKey, "ACCEPT_OFFER", identitySubject, requestHash, offerId, response);
        return response;
    }

    @Transactional(readOnly = true)
    public SanctionedOfferDetailsResponse getSanctionedOfferForApplication(String applicationId, String actorSubject, boolean isStaff) {
        LoanApplication app = loanApplicationRepository.findByLoanApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND",
                        "Loan application not found: " + applicationId));

        if (!isStaff) {
            boolean owns = (app.getIdentitySubject() != null && app.getIdentitySubject().equalsIgnoreCase(actorSubject))
                    || (app.getCustomerId() != null && app.getCustomerId().equalsIgnoreCase(actorSubject));
            if (!owns) {
                throw ApiException.forbidden("ACCESS_DENIED", "You do not own this loan application.");
            }
        }

        LoanOffer offer = loanOfferRepository.findFirstByLoanApplicationIdOrderByCreatedAtDesc(applicationId)
                .orElseThrow(() -> ApiException.notFound("OFFER_NOT_FOUND",
                        "No sanctioned offer exists yet for application: " + applicationId));

        BigDecimal emi = calculator.calculateEmi(
                offer.getSanctionedAmount(), offer.getInterestRate(), offer.getTenureMonths(),
                InterestCalculationMethod.REDUCING_BALANCE);

        return new SanctionedOfferDetailsResponse(
                offer.getOfferId(),
                offer.getLoanApplicationId(),
                offer.getSanctionedAmount(),
                offer.getInterestRate(),
                offer.getTenureMonths(),
                emi,
                offer.getCurrency(),
                offer.getStatus(),
                offer.getDisbursementAccountId(),
                offer.getExpiresAt(),
                offer.getAcceptedAt()
        );
    }
}
