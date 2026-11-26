package com.fintech.loan.mapper;

import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.entity.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class RepaymentMapper {

    public RepaymentAccountResponse toRepaymentAccountResponse(LoanRepaymentAccount a) {
        return new RepaymentAccountResponse(
                a.getRepaymentAccountId(),
                a.getLoanAccountId(),
                a.getMaskedAccountNumber(),
                a.getAccountType(),
                a.getCurrency(),
                a.isPrimary(),
                a.getStatus(),
                a.getCreatedAt()
        );
    }

    public MandateResponse toMandateResponse(LoanRepaymentMandate m) {
        return new MandateResponse(
                m.getMandateId(),
                m.getLoanAccountId(),
                m.getRepaymentAccountId(),
                m.getProviderReference(),
                m.getMandateType(),
                m.getMaxAuthorizedAmount(),
                m.getFrequency(),
                m.getStartDate(),
                m.getEndDate(),
                m.getStatus(),
                m.getFailureReason(),
                m.getActivatedAt(),
                m.getCreatedAt()
        );
    }

    public InstallmentDetailResponse toInstallmentDetailResponse(LoanRepaymentSchedule s) {
        BigDecimal remaining = s.getRemainingAmount() != null
                ? s.getRemainingAmount()
                : s.getTotalAmount().add(nonNull(s.getChargesAmount())).subtract(nonNull(s.getPaidAmount())).max(BigDecimal.ZERO);
        return new InstallmentDetailResponse(
                s.getInstallmentId(),
                s.getLoanAccountId(),
                s.getScheduleVersion(),
                s.getInstallmentNumber(),
                s.getDueDate(),
                s.getGracePeriodEndDate(),
                s.getOpeningPrincipal(),
                s.getTotalAmount(),
                s.getPrincipalAmount(),
                s.getInterestAmount(),
                nonNull(s.getChargesAmount()),
                s.getClosingPrincipal(),
                nonNull(s.getPaidAmount()),
                remaining,
                s.getStatus(),
                s.getPaidAt()
        );
    }

    public RepaymentResponse toRepaymentResponse(LoanRepayment r) {
        return new RepaymentResponse(
                r.getRepaymentId(),
                r.getRepaymentReference(),
                r.getLoanAccountId(),
                r.getInstallmentId(),
                r.getAmount(),
                r.getPrincipalAmount(),
                r.getInterestAmount(),
                r.getChargesAmount(),
                r.getPaymentMethod(),
                r.getRepaymentStatus(),
                r.getPaymentReference(),
                r.getLedgerTransactionReference() != null ? r.getLedgerTransactionReference() : r.getTransactionReference(),
                r.getInitiatedAt(),
                r.getCompletedAt(),
                r.getFailureCode(),
                r.getFailureReason(),
                r.getReceiptReference()
        );
    }

    public RepaymentReceiptResponse toReceiptResponse(LoanRepayment r) {
        return new RepaymentReceiptResponse(
                r.getReceiptReference(),
                r.getRepaymentId(),
                r.getRepaymentReference(),
                r.getLoanAccountId(),
                r.getInstallmentId(),
                r.getAmount(),
                r.getPrincipalAmount(),
                r.getInterestAmount(),
                r.getChargesAmount(),
                r.getExcessAmount(),
                r.getCurrency(),
                r.getPaymentMethod(),
                r.getLedgerTransactionReference() != null ? r.getLedgerTransactionReference() : r.getTransactionReference(),
                r.getCompletedAt()
        );
    }

    public RepaymentAttemptResponse toAttemptResponse(LoanRepaymentAttempt a) {
        return new RepaymentAttemptResponse(
                a.getAttemptId(),
                a.getRepaymentId(),
                a.getAttemptNumber(),
                a.getProviderReference(),
                a.getIdempotencyKey(),
                a.getStatus(),
                a.getFailureCode(),
                a.getFailureReason(),
                a.getAttemptTimestamp()
        );
    }

    public ReconciliationResponse toReconciliationResponse(LoanRepaymentReconciliation rec) {
        return new ReconciliationResponse(
                rec.getReconciliationId(),
                rec.getReconciliationType(),
                rec.getReferenceId(),
                rec.getLoanAccountId(),
                rec.getLoanApplicationId(),
                rec.getExpectedAmount(),
                rec.getAccountTransactionReference(),
                rec.getLedgerTransactionReference(),
                rec.getPaymentReference(),
                rec.getStatus(),
                rec.getFailureReason(),
                rec.getResolutionNotes(),
                rec.getRetryCount(),
                rec.getCreatedAt()
        );
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
