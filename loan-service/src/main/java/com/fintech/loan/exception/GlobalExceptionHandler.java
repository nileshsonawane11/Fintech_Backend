package com.fintech.loan.exception;

import com.fintech.loan.dto.response.ErrorResponse;
import com.fintech.loan.util.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);

        if (ex.getHttpStatus().is5xxServerError()) {
            log.error("Loan service integration/server error: code={}, message={}, path={}, correlationId={}",
                    ex.getCode(), ex.getMessage(), request.getRequestURI(), correlationId, ex);
        } else if (ex.getHttpStatus() == HttpStatus.FORBIDDEN) {
            log.warn("Loan service forbidden/ownership check: code={}, message={}, path={}, correlationId={}",
                    ex.getCode(), ex.getMessage(), request.getRequestURI(), correlationId);
        } else {
            log.info("Handled API exception: code={}, message={}, status={}",
                    ex.getCode(), ex.getMessage(), ex.getHttpStatus());
        }

        ErrorResponse body = ErrorResponse.of(
                ex.getHttpStatus().value(),
                ex.getHttpStatus().name(),
                ex.getCode(),
                ex.getMessage(),
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(ex.getHttpStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));

        log.warn("Validation error on path {}: {}", request.getRequestURI(), message);

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "VALIDATION_ERROR",
                message,
                request.getRequestURI(),
                correlationId,
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "VALIDATION_ERROR",
                ex.getMessage(),
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "MISSING_HEADER",
                "Required header is missing: " + ex.getHeaderName(),
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "MISSING_PARAMETER",
                "Required parameter is missing: " + ex.getParameterName(),
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "MALFORMED_REQUEST",
                "Request body is missing or contains invalid JSON/enum values.",
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.name(),
                "INVALID_PARAMETER",
                "Invalid value for parameter: " + ex.getName(),
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.name(),
                "CONCURRENT_MODIFICATION",
                "The resource was updated concurrently by another request. Please retry.",
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        log.warn("Access denied on path {}: correlationId={}, message={}",
                request.getRequestURI(), correlationId, ex.getMessage());

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.name(),
                "ACCESS_DENIED",
                "Access Denied: You do not have permission to perform this operation.",
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.name(),
                "UNAUTHENTICATED",
                "A valid authenticated identity is required.",
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String correlationId = resolveCorrelationId(request);
        log.error("Unhandled unexpected exception on path {}: correlationId={}, error={}",
                request.getRequestURI(), correlationId, ex.getMessage(), ex);

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.name(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred. Correlation ID: " + correlationId,
                request.getRequestURI(),
                correlationId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        if (correlationId != null && !correlationId.isBlank()) {
            return correlationId;
        }
        if (request != null) {
            String headerVal = request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
            if (headerVal != null && !headerVal.isBlank()) {
                return headerVal;
            }
        }
        return UUID.randomUUID().toString();
    }
}
