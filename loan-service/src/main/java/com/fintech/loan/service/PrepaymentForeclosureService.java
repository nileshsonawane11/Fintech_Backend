package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.*;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.InstallmentStatus;
import com.fintech.loan.enums.LoanChargeStatus;
import com.fintech.loan.enums.RepaymentStatus;
import com.fintech.loan.enums.RepaymentType;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanChargeRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PrepaymentForeclosureService {

    private final LoanAccountAccessHelper accessHelper;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanProductService productService;
    private final LoanProductFeeRepository feeRepository;
    private final LoanChargeRepository chargeRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanRepaymentService repaymentService;
    private final RepaymentScheduleService scheduleService;
    private final LoanOutboxService outboxService;

    public PrepaymentForeclosureService(
            LoanAccountAccessHelper accessHelper,
            LoanAccountRepository loanAccountRepository,
            LoanProductService productService,
            LoanProductFeeRepository feeRepository,
            LoanChargeRepository chargeRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanRepaymentService repaymentService,
            RepaymentScheduleService scheduleService,
            LoanOutboxService outboxService) {
        this.accessHelper = accessHelper;
        this.loanAccountRepository = loanAccountRepository;
        this.productService = productService;
        this.feeRepository = feeRepository;
        this.chargeRepository = chargeRepository;
        this.scheduleRepository = scheduleRepository;
        this.repaymentService = repaymentService;
        this.scheduleService = scheduleService;
        this.outboxService = outboxService;
    }

    @Transactional(readOnly = true)
    public PrepaymentQuoteResponse quotePartPrepayment(
            String loanAccountId, PrepaymentQuoteRequest request, String actorSubject) {
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        validateActiveLoan(loan);

        BigDecimal prepayAmt = request.prepaymentAmount().setScale(2, RoundingMode.HALF_UP);
        if (prepayAmt.compareTo(loan.getOutstandingPrincipal()) >= 0) {
            throw ApiException.unprocessable("USE_FORECLOSURE_FOR_FULL_PAYOFF",
                    "Prepayment amount equals or exceeds outstanding principal; use foreclosure quote instead.");
        }

        LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : LocalDate.now();
        BigDecimal accruedInterest = calculateAccruedInterest(loan, effectiveDate);
        BigDecimal chargePct = getPrepaymentChargePct(loan.getProductCode());
        BigDecimal prepaymentCharge = prepayAmt.multiply(chargePct)
                .divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal totalPayable = prepayAmt.add(accruedInterest).add(prepaymentCharge).setScale(2, RoundingMode.HALF_UP);
        BigDecimal projectedPrincipal = loan.getOutstandingPrincipal().subtract(prepayAmt).setScale(2, RoundingMode.HALF_UP);

        return new PrepaymentQuoteResponse(
                loanAccountId,
                effectiveDate,
                loan.getOutstandingPrincipal(),
                prepayAmt,
                accruedInterest,
                prepaymentCharge,
                totalPayable,
                projectedPrincipal,
                loan.getCurrency(),
                Instant.now().plus(30, ChronoUnit.MINUTES)
        );
    }

    @Transactional
    public RepaymentResponse executePartPrepayment(
            String loanAccountId, ExecutePrepaymentRequest request, String idempotencyKey, String actorSubject) {
        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(loanAccountId)
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND", "Loan account not found: " + loanAccountId));
        if (!accessHelper.isOwner(loan, actorSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED", "You do not own loan account: " + loanAccountId);
        }
        validateActiveLoan(loan);

        PrepaymentQuoteResponse quote = quotePartPrepayment(
                loanAccountId, new PrepaymentQuoteRequest(request.prepaymentAmount(), LocalDate.now()), actorSubject);

        RepaymentResponse response = repaymentService.executeRepayment(
                loan,
                null,
                request.repaymentAccountId(),
                null,
                request.paymentMethod(),
                quote.totalPayable(),
                RepaymentType.PART_PREPAYMENT,
                idempotencyKey,
                false,
                request.vpaOrInstrumentRef()
        );

        if (response.repaymentStatus() == RepaymentStatus.SUCCESS) {
            if (request.regenerateSchedule() && loan.getOutstandingPrincipal().compareTo(BigDecimal.ZERO) > 0) {
                LoanProduct product = productService.findActiveProductOrThrow(loan.getProductCode());
                int remainingInstallments = (int) scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                        loanAccountId,
                        List.of(InstallmentStatus.DUE, InstallmentStatus.UPCOMING, InstallmentStatus.PARTIALLY_PAID)
                ).size();
                if (remainingInstallments > 0) {
                    scheduleService.regenerateSchedule(
                            loan,
                            product.getInterestCalculationMethod(),
                            loan.getOutstandingPrincipal(),
                            remainingInstallments,
                            LocalDate.now(),
                            "PART_PREPAYMENT",
                            actorSubject
                    );
                    loanAccountRepository.save(loan);
                }
            }
            outboxService.enqueueEvent(
                    LoanConstants.TOPIC_PREPAYMENT_COMPLETED,
                    response.repaymentId(),
                    "LOAN_REPAYMENT",
                    "LoanPrepaymentCompleted",
                    new LoanEvents.LoanRepaymentEventPayload(
                            response.repaymentId(),
                            response.repaymentReference(),
                            loanAccountId,
                            loan.getCustomerId(),
                            null,
                            response.amount(),
                            response.principalAmount(),
                            response.interestAmount(),
                            response.chargesAmount(),
                            response.paymentMethod().name(),
                            response.repaymentStatus().name(),
                            response.transactionReference(),
                            null,
                            Instant.now()
                    )
            );
        }
        return response;
    }

    @Transactional(readOnly = true)
    public ForeclosureQuoteResponse quoteForeclosure(
            String loanAccountId, ForeclosureQuoteRequest request, String actorSubject) {
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        validateActiveLoan(loan);

        LocalDate effectiveDate = request != null && request.effectiveDate() != null
                ? request.effectiveDate() : LocalDate.now();
        BigDecimal remainingPrincipal = loan.getOutstandingPrincipal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal accruedInterest = calculateAccruedInterest(loan, effectiveDate);
        BigDecimal pendingCharges = chargeRepository.findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(
                        loanAccountId, List.of(LoanChargeStatus.PENDING, LoanChargeStatus.PARTIALLY_PAID))
                .stream()
                .map(LoanCharge::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal foreclosurePct = getForeclosureChargePct(loan.getProductCode());
        BigDecimal foreclosureCharge = remainingPrincipal.multiply(foreclosurePct)
                .divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal totalPayable = remainingPrincipal.add(accruedInterest).add(pendingCharges).add(foreclosureCharge)
                .setScale(2, RoundingMode.HALF_UP);

        return new ForeclosureQuoteResponse(
                loanAccountId,
                effectiveDate,
                remainingPrincipal,
                accruedInterest,
                pendingCharges,
                foreclosureCharge,
                totalPayable,
                loan.getCurrency(),
                Instant.now().plus(30, ChronoUnit.MINUTES)
        );
    }

    @Transactional
    public RepaymentResponse executeForeclosure(
            String loanAccountId, ExecuteForeclosureRequest request, String idempotencyKey, String actorSubject) {
        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(loanAccountId)
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND", "Loan account not found: " + loanAccountId));
        if (!accessHelper.isOwner(loan, actorSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED", "You do not own loan account: " + loanAccountId);
        }
        validateActiveLoan(loan);

        ForeclosureQuoteResponse quote = quoteForeclosure(
                loanAccountId, new ForeclosureQuoteRequest(request.effectiveDate()), actorSubject);

        RepaymentResponse response = repaymentService.executeRepayment(
                loan,
                null,
                request.repaymentAccountId(),
                null,
                request.paymentMethod(),
                quote.totalPayable(),
                RepaymentType.FORECLOSURE,
                idempotencyKey,
                false,
                request.vpaOrInstrumentRef()
        );

        if (response.repaymentStatus() == RepaymentStatus.SUCCESS) {
            // Mark remaining open installments as PAID/WAIVED since full obligation settled
            List<LoanRepaymentSchedule> open = scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                    loanAccountId,
                    List.of(InstallmentStatus.UPCOMING, InstallmentStatus.DUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.OVERDUE)
            );
            Instant now = Instant.now();
            for (LoanRepaymentSchedule s : open) {
                s.setStatus(InstallmentStatus.PAID);
                s.setRemainingAmount(BigDecimal.ZERO);
                s.setPaidAt(now);
                scheduleRepository.save(s);
            }
            loan.setOutstandingPrincipal(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            loan.setChargesOutstanding(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            loan.setStatus("CLOSED");
            loan.setClosedAt(now);
            loan.setNextDueDate(null);
            loanAccountRepository.save(loan);
        }
        return response;
    }

    private void validateActiveLoan(LoanAccount loan) {
        if (!"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            throw ApiException.unprocessable("LOAN_NOT_ACTIVE",
                    "Loan must be ACTIVE for prepayment or foreclosure. Current status: " + loan.getStatus());
        }
    }

    private BigDecimal calculateAccruedInterest(LoanAccount loan, LocalDate effectiveDate) {
        LocalDate anchor = loan.getDisbursementDate() != null ? loan.getDisbursementDate() : LocalDate.now();
        long days = Math.max(0, Math.min(30, ChronoUnit.DAYS.between(anchor, effectiveDate)));
        if (days == 0) days = 1;
        return loan.getOutstandingPrincipal()
                .multiply(loan.getInterestRate())
                .multiply(BigDecimal.valueOf(days))
                .divide(BigDecimal.valueOf(36500), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal getPrepaymentChargePct(String productCode) {
        if (productCode == null) return BigDecimal.ZERO;
        try {
            LoanProduct product = productService.findActiveProductOrThrow(productCode);
            return feeRepository.findByProductId(product.getId())
                    .map(f -> f.getPrepaymentChargePercentage() != null ? f.getPrepaymentChargePercentage() : BigDecimal.ZERO)
                    .orElse(BigDecimal.ZERO);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal getForeclosureChargePct(String productCode) {
        if (productCode == null) return BigDecimal.ZERO;
        try {
            LoanProduct product = productService.findActiveProductOrThrow(productCode);
            return feeRepository.findByProductId(product.getId())
                    .map(f -> f.getForeclosureChargePercentage() != null ? f.getForeclosureChargePercentage() : BigDecimal.ZERO)
                    .orElse(BigDecimal.ZERO);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }
}
