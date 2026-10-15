package com.fintech.identity.dto.request;

import com.fintech.identity.model.enums.ConsentPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateConsentRequest(

        @NotNull(message = "Consent purpose is required")
        ConsentPurpose purpose,

        @NotBlank(message = "Consent text version is required")
        @Size(max = 100)
        String consentTextVersion
) {
}