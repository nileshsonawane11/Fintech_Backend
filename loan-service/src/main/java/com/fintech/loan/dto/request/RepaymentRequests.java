package com.fintech.loan.dto.request;

import com.fintech.loan.enums.MandateType;
import com.fintech.loan.enums.RepaymentFrequency;
import com.fintech.loan.enums.RepaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class RepaymentRequests {

    private RepaymentRequests() {}

    public record RegisterRepaymentAccountRequest(
            @NotBlank(message = "Account identifier is required")
            String accountIdentifier,
            boolean primary
    ) {}

    public record CreateMandateRequest(
            @NotNull(message = "Mandate type is required")
            MandateType mandateType,
            String repaymentAccountId,
            @NotNull(message = "Maximum authorized amount is required")
            @DecimalMin(value = "1.00", message = "Maximum authorized amount must be at least 1.00")
            BigDecimal maxAuthorizedAmount,
            @NotNull(message = "Frequency is required")
            RepaymentFrequency frequency,
            @NotNull(message = "Start date is required")
            LocalDate startDate,
            LocalDate endDate
    ) {}

    public record ManualRepaymentRequest(
            String installmentId,
            String repaymentAccountId,
            @NotNull(message = "Payment method is required")
            RepaymentMethod paymentMethod,
            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.01", message = "Repayment amount must be positive")
            BigDecimal amount,
            String vpaOrInstrumentRef
    ) {}

    public record PrepaymentQuoteRequest(
            @NotNull(message = "Prepayment amount is required")
            @DecimalMin(value = "1.00", message = "Prepayment amount must be at least 1.00")
            BigDecimal prepaymentAmount,
            LocalDate effectiveDate
    ) {}

    public record ExecutePrepaymentRequest(
            @NotNull(message = "Prepayment amount is required")
            @DecimalMin(value = "1.00", message = "Prepayment amount must be at least 1.00")
            BigDecimal prepaymentAmount,
            @NotNull(message = "Payment method is required")
            RepaymentMethod paymentMethod,
            String repaymentAccountId,
            boolean regenerateSchedule,
            String vpaOrInstrumentRef
    ) {}

    public record ForeclosureQuoteRequest(
            LocalDate effectiveDate
    ) {}

    public record ExecuteForeclosureRequest(
            @NotNull(message = "Payment method is required")
            RepaymentMethod paymentMethod,
            String repaymentAccountId,
            LocalDate effectiveDate,
            String vpaOrInstrumentRef
    ) {}

    public record WaiveChargeRequest(
            @DecimalMin(value = "0.01") BigDecimal waiveAmount,
            @NotBlank String reason
    ) {}

    public record ResolveReconciliationRequest(
            @NotBlank String resolutionNotes,
            boolean retryLedgerPosting
    ) {}
}
