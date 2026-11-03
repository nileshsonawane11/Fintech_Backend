package com.fintech.account.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectApplicationRequest(
        @NotBlank(message = "Reason code is required")
        String reasonCode,

        @Size(max = 500, message = "Remarks must not exceed 500 characters")
        String remarks
) {}
