package com.fintech.ledger.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ResolveDiscrepancyRequest(
        @NotBlank(message = "Resolution code is required")
        String resolutionCode,

        String remarks
) {}
