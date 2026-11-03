package com.fintech.account.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccountException.class)
    public ResponseEntity<ErrorResponse> handleAccountException(AccountException ex, HttpServletRequest request) {
        log.warn("AccountException: status={}, code={}, message={}, path={}",
                ex.getStatus(), ex.getCode(), ex.getMessage(), request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                ex.getStatus().value(),
                ex.getCode(),
                ex.getMessage(),
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(ex.getStatus())
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> Map.of(
                        "field", err.getField(),
                        "message", err.getDefaultMessage() != null ? err.getDefaultMessage() : "Invalid value",
                        "code", "VALIDATION_FAILED"
                ))
                .toList();

        String message = fieldErrors.isEmpty() ? "Validation failed" : fieldErrors.get(0).get("field") + ": " + fieldErrors.get(0).get("message");

        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                message,
                request.getRequestURI(),
                correlationId(request),
                fieldErrors
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        List<Map<String, String>> fieldErrors = ex.getConstraintViolations().stream()
                .map(cv -> Map.of(
                        "field", cv.getPropertyPath().toString(),
                        "message", cv.getMessage(),
                        "code", "VALIDATION_FAILED"
                ))
                .toList();

        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                "One or more parameters are invalid",
                request.getRequestURI(),
                correlationId(request),
                fieldErrors
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "MALFORMED_REQUEST",
                "Request payload is missing, malformed, or has invalid data types.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "MISSING_PARAMETER",
                "Required request parameter '" + ex.getParameterName() + "' is missing.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "TYPE_MISMATCH",
                "Parameter '" + ex.getName() + "' is of invalid format or type.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "Access denied: insufficient permissions to access this resource.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthException(AuthenticationException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHORIZED",
                "Authentication failed or token is invalid/expired.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.METHOD_NOT_ALLOWED.value(),
                "METHOD_NOT_ALLOWED",
                "HTTP method " + ex.getMethod() + " is not supported for this path.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException ex, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.NOT_FOUND.value(),
                "NOT_FOUND",
                "The requested resource was not found.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing request at {}: {}", request.getRequestURI(), ex.getMessage(), ex);

        ErrorResponse error = new ErrorResponse(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected server error occurred. Please try again later.",
                request.getRequestURI(),
                correlationId(request)
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .header("X-Correlation-Id", error.correlationId())
                .body(error);
    }

    private String correlationId(HttpServletRequest request) {
        String mdcCorrelationId = MDC.get("correlationId");
        if (mdcCorrelationId != null && !mdcCorrelationId.isBlank()) {
            return mdcCorrelationId;
        }

        String headerCorrelationId = request.getHeader("X-Correlation-Id");
        if (headerCorrelationId != null && !headerCorrelationId.isBlank()) {
            return headerCorrelationId;
        }

        return UUID.randomUUID().toString();
    }
}
