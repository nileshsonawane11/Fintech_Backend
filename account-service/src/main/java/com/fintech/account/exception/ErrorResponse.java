package com.fintech.account.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String correlationId,
        List<Map<String, String>> errors
) {
    public ErrorResponse(Instant timestamp, int status, String error, String message, String path, String correlationId) {
        this(timestamp, status, error, message, path, correlationId, null);
    }
}
