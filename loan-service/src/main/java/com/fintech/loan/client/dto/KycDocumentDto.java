package com.fintech.loan.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KycDocumentDto(
        String documentReferenceId,
        String documentType,
        String fileName,
        String contentType,
        Long contentSizeBytes,
        String status,
        Instant uploadedAt
) {
}
