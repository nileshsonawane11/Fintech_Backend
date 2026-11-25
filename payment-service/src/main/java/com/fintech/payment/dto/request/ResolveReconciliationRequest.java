package com.fintech.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResolveReconciliationRequest(
        @NotBlank(message = "Resolution status is required")
        @Pattern(regexp = "^(RESOLVED|WAIVED|ESCALATED)$", message = "Status must be RESOLVED, WAIVED, or ESCALATED")
        String resolutionStatus,

        @Size(max = 500)
        String notes
) {}
