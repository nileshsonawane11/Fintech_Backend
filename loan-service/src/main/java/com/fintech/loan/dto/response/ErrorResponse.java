package com.fintech.loan.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        String correlationId,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String code, String message, String path, String correlationId) {
        return new ErrorResponse(Instant.now(), status, error, code, message, path, correlationId, null);
    }

    public static ErrorResponse of(int status, String error, String code, String message, String path,
                                   String correlationId, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status, error, code, message, path, correlationId, fieldErrors);
    }
}
