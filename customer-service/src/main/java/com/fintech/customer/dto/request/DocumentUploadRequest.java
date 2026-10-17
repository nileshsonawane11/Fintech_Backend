package com.fintech.customer.dto.request;

import com.fintech.customer.model.document.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record DocumentUploadRequest(
        @NotNull
        DocumentType documentType,

        @NotBlank
        @Size(max = 255)
        String fileName,

        @NotBlank
        String contentType,

        @NotNull
        @Positive
        Long contentSizeBytes
) {
}