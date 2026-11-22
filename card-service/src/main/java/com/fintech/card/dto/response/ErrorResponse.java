package com.fintech.card.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Standardized error response body for failed API operations")
public record ErrorResponse(
        @Schema(description = "UTC timestamp of the error", example = "2026-11-22T10:00:00Z")
        String timestamp,

        @Schema(description = "HTTP status code", example = "403")
        int status,

        @Schema(description = "HTTP error title", example = "FORBIDDEN")
        String error,

        @Schema(description = "Domain-specific error code", example = "ACCOUNT_OWNERSHIP_MISMATCH")
        String code,

        @Schema(description = "Human-readable error description", example = "The selected account is not available for this customer.")
        String message,

        @Schema(description = "Request URI path", example = "/api/v1/cards/applications")
        String path,

        @Schema(description = "Distributed trace correlation ID", example = "4a18e0d3-3563-4b65-bf04-db5f8f8b898a")
        String correlationId
) {
    public static ErrorResponse of(int status, String error, String code, String message, String path, String correlationId) {
        return new ErrorResponse(
                Instant.now().toString(),
                status,
                error,
                code,
                message,
                path,
                correlationId
        );
    }
}
