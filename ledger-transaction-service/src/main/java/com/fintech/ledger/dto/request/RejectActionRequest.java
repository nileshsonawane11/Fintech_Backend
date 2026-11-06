package com.fintech.ledger.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RejectActionRequest(
        @NotBlank(message = "Rejection reason is required")
        String reason,

        String remarks
) {}
