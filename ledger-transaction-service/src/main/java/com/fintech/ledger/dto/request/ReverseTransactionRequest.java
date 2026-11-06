package com.fintech.ledger.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ReverseTransactionRequest(
        @NotBlank(message = "Reason code is required")
        String reasonCode,

        String remarks
) {}
