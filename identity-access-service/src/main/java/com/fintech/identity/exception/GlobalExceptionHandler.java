
package com.fintech.identity.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ProblemDetail> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        ProblemDetail problem = ProblemDetail.forStatus(exception.getStatus());
        problem.setTitle(exception.getStatus().getReasonPhrase());
        problem.setDetail("The request could not be completed.");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", exception.getCode());
        problem.setProperty("timestamp", Instant.now().toString());

        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        problem.setProperty("correlationId", correlationId);

        return ResponseEntity.status(exception.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header("X-Correlation-Id", correlationId)
                .body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        List<Map<String, String>> errors =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(error -> Map.of(
                                "field", error.getField(),
                                "code", "VALIDATION_FAILED",
                                "message", error.getDefaultMessage() == null
                                        ? "Invalid value"
                                        : error.getDefaultMessage()
                        ))
                        .toList();

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "One or more request fields are invalid."
        );

        problem.setTitle("Validation failed");
        problem.setType(URI.create(
                "https://api.finbank.example.com/errors/validation-failed"
        ));
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("correlationId", correlationId(request));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errors", errors);

        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Request validation failed."
        );

        problem.setTitle("Validation failed");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("correlationId", correlationId(request));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.badRequest().body(problem);
    }

    private String correlationId(HttpServletRequest request) {
        String supplied = request.getHeader("X-Correlation-Id");

        if (supplied != null) {
            try {
                return UUID.fromString(supplied).toString();
            } catch (IllegalArgumentException ignored) {
                // Do not trust an invalid correlation ID.
            }
        }

        return UUID.randomUUID().toString();
    }
}