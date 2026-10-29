package com.fintech.customer.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ApproveKycRequest(
        @NotBlank(message = "Remarks are required")
        String remarks,
        String riskCategory
) {}
