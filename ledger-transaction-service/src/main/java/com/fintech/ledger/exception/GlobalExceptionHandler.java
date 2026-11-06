package com.fintech.ledger.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private String getCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        return correlationId;
    }

    @ExceptionHandler(LedgerException.class)
    public ResponseEntity<ErrorResponse> handleLedgerException(LedgerException ex, HttpServletRequest request) {
        log.warn("Ledger business error: [{}] - {}", ex.getErrorCode(), ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                ex.getStatus().value(),
                ex.getErrorCode(),
                ex.getMessage(),
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(ex.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> validationErrors = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            validationErrors.add(Map.of(
                    "field", fieldError.getField(),
                    "message", Optional.ofNullable(fieldError.getDefaultMessage()).orElse("Invalid value")
            ));
        }

        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                "Request validation failed",
                request.getRequestURI(),
                getCorrelationId(request),
                validationErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "CONSTRAINT_VIOLATION",
                ex.getMessage(),
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex, HttpServletRequest request) {
        String code = "MISSING_HEADER";
        if ("Idempotency-Key".equalsIgnoreCase(ex.getHeaderName())) {
            code = "IDEMPOTENCY_KEY_REQUIRED";
        }
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                code,
                ex.getMessage(),
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "MALFORMED_REQUEST",
                "Malformed JSON request body: " + ex.getMessage(),
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "Access denied: insufficient permissions to perform this operation",
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHORIZED",
                "Authentication required or credentials invalid",
                request.getRequestURI(),
                getCorrelationId(request)
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        log.error("Unhandled internal server error [correlationId: {}]: ", correlationId, ex);
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected financial service error occurred. Please contact system support.",
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
