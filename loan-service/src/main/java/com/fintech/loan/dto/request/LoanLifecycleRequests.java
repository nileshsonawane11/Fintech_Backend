package com.fintech.loan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

public final class LoanLifecycleRequests {

    private LoanLifecycleRequests() {
    }

    public record AssignOfficerRequest(
            @NotBlank(message = "officerId is required")
            String officerId,
            String officerName,
            String remarks
    ) {}

    public record TransitionApplicationRequest(
            @Size(max = 500) String reason,
            String remarks
    ) {}

    public record ApproveLoanRequest(
            @Positive(message = "sanctionedAmount must be positive")
            BigDecimal sanctionedAmount,
            @DecimalMin(value = "0.01", message = "interestRate must be positive")
            BigDecimal interestRate,
            @Positive(message = "tenureMonths must be positive")
            Integer tenureMonths,
            String remarks
    ) {}

    public record RejectLoanRequest(
            @NotBlank(message = "Rejection reason is required")
            @Size(max = 500)
            String reason,
            String remarks
    ) {}

    public record SubmitAdditionalInfoRequest(
            @NotBlank(message = "Remarks or updated information summary is required")
            String remarks,
            Map<String, Object> additionalDetails
    ) {}
}
