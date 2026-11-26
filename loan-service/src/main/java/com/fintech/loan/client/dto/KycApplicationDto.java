package com.fintech.loan.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KycApplicationDto(
        String kycCaseId,
        String customerId,
        String status,
        Instant estimatedCompletionTime
) {
}
