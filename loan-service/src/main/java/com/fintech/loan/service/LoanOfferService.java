package com.fintech.loan.service;

import com.fintech.loan.dto.request.AcceptLoanOfferRequest;
import com.fintech.loan.dto.response.AcceptOfferResponse;
import com.fintech.loan.entity.LoanIdempotencyKey;
import com.fintech.loan.entity.LoanOffer;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanIdempotencyKeyRepository;
import com.fintech.loan.repository.LoanOfferRepository;
import com.fintech.loan.repository.LoanApplicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;

@Service
public class LoanOfferService {

    private final LoanOfferRepository loanOfferRepository;
    private final LoanIdempotencyKeyRepository idempotencyKeyRepository;
    private final LoanApplicationRepository loanApplicationRepository;

    public LoanOfferService(LoanOfferRepository loanOfferRepository,
                            LoanIdempotencyKeyRepository idempotencyKeyRepository,
                            LoanApplicationRepository loanApplicationRepository) {
        this.loanOfferRepository = loanOfferRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.loanApplicationRepository = loanApplicationRepository;
    }

    @Transactional
    public AcceptOfferResponse acceptOffer(String customerId, String offerId, String idempotencyKey,
                                           AcceptLoanOfferRequest request) {
        // Idempotency check
        idempotencyKeyRepository.findByIdempotencyKeyAndOperation(idempotencyKey, "ACCEPT_OFFER")
                .ifPresent(existing -> {
                    throw new ApiException("DUPLICATE_REQUEST",
                            "This offer acceptance request has already been processed.", HttpStatus.CONFLICT);
                });

        LoanOffer offer = loanOfferRepository.findById(offerId)
                .orElseThrow(() -> new ApiException("OFFER_NOT_FOUND",
                        "Loan offer not found: " + offerId, HttpStatus.NOT_FOUND));

        boolean ownedByCustomer = loanApplicationRepository
                .findById(offer.getLoanApplicationId())
                .filter(application -> customerId.equals(application.getCustomerId()))
                .isPresent();
        if (!ownedByCustomer) {
            throw new ApiException("OFFER_NOT_FOUND",
                    "Loan offer not found: " + offerId, HttpStatus.NOT_FOUND);
        }

        if ("ACCEPTED".equals(offer.getStatus())) {
            throw new ApiException("OFFER_ALREADY_ACCEPTED",
                    "This loan offer has already been accepted.", HttpStatus.CONFLICT);
        }

        if ("EXPIRED".equals(offer.getStatus())
                || (offer.getExpiresAt() != null && !offer.getExpiresAt().isAfter(Instant.now()))) {
            throw new ApiException("OFFER_EXPIRED",
                    "This loan offer has expired.", HttpStatus.GONE);
        }

        // Update offer
        offer.setStatus("ACCEPTED");
        offer.setTermsVersion(request.getAcceptedTermsVersion());
        offer.setDisbursementAccountId(request.getDisbursementAccountId());
        offer.setAcceptedAt(Instant.now());
        offer.setUpdatedAt(Instant.now());
        loanOfferRepository.save(offer);

        // Store idempotency key
        LoanIdempotencyKey ikey = new LoanIdempotencyKey();
        ikey.setIdempotencyKey(idempotencyKey);
        ikey.setOperation("ACCEPT_OFFER");
        ikey.setResponseReference(offerId);
        idempotencyKeyRepository.save(ikey);

        // Calculate EMI: P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal monthlyEmi = calculateEmi(offer.getSanctionedAmount(),
                offer.getInterestRate(), offer.getTenureMonths());

        AcceptOfferResponse response = new AcceptOfferResponse();
        response.setLoanApplicationId(offer.getLoanApplicationId());
        response.setOfferId(offer.getOfferId());
        response.setStatus("ACCEPTED");
        response.setSanctionedAmount(offer.getSanctionedAmount());
        response.setInterestRate(offer.getInterestRate());
        response.setTenureMonths(offer.getTenureMonths());
        response.setMonthlyEmi(monthlyEmi);
        return response;
    }

    private BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int n) {
        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
        }
        BigDecimal r = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);
        BigDecimal onePlusR = BigDecimal.ONE.add(r);
        BigDecimal onePlusRPowN = onePlusR.pow(n, new MathContext(15, RoundingMode.HALF_UP));
        BigDecimal numerator = principal.multiply(r).multiply(onePlusRPowN);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }
}
