package com.fintech.account.dto.request;

import jakarta.validation.constraints.Size;

public record ApproveApplicationRequest(
        @Size(max = 500, message = "Remarks must not exceed 500 characters")
        String remarks
) {}
