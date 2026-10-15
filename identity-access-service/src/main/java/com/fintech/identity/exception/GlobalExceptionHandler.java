package com.fintech.identity.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String BASE_ERROR_TYPE =
            "https://api.finbank.example.com/errors/";

    private static final String VALIDATION_CODE = "VALIDATION_FAILED";

    // 1. Application-specific exceptions

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ProblemDetail> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(
                exception.getStatus().value()
        );

        String code = exception.getCode();

        String field = switch (code) {
            case "MOBILE_ALREADY_REGISTERED" -> "mobileNumber";
            case "EMAIL_ALREADY_REGISTERED" -> "email";
            default -> "request";
        };

        List<Map<String, String>> errors = List.of(
                Map.of(
                        "field", field,
                        "message", exception.getMessage(),
                        "code", code
                )
        );

        ProblemDetail problem = buildProblem(
                status,
                status.getReasonPhrase(),
                "The request could not be completed.",
                code,
                "https://api.finbank.example.com/errors/"
                        + code.toLowerCase().replace('_', '-'),
                request,
                errors
        );

        return response(problem, request);
    }

    // 2. @Valid request-body validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        List<Map<String, String>> errors =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(error -> Map.of(
                                "field", error.getField(),
                                "message", error.getDefaultMessage() == null
                                        ? "Invalid value"
                                        : error.getDefaultMessage(),
                                "code", VALIDATION_CODE
                        ))
                        .toList();

        ProblemDetail problem = buildProblem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request fields are invalid.",
                VALIDATION_CODE,
                BASE_ERROR_TYPE + "validation-failed",
                request,
                errors
        );

        return response(problem, request);
    }

    // 3. Method-level validation errors
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        List<Map<String, String>> errors =
                ex.getConstraintViolations().stream()
                        .map(violation -> Map.of(
                                "field", violation.getPropertyPath().toString(),
                                "message", violation.getMessage(),
                                "code", VALIDATION_CODE
                        ))
                        .toList();

        ProblemDetail problem = buildProblem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request fields are invalid.",
                VALIDATION_CODE,
                BASE_ERROR_TYPE + "validation-failed",
                request,
                errors
        );

        return response(problem, request);
    }

    // 4. Invalid JSON or unreadable request body
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleUnreadableBody(
            HttpMessageNotReadableException ex,
            HttpServletRequest request) {

        ProblemDetail problem = buildProblem(
                HttpStatus.BAD_REQUEST,
                "Malformed request",
                "The request body is missing, malformed, or contains invalid values.",
                "MALFORMED_REQUEST",
                BASE_ERROR_TYPE + "malformed-request",
                request,
                List.of()
        );

        return response(problem, request);
    }

    // 5. Missing query or request parameters
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetail> handleMissingParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest request) {

        List<Map<String, String>> errors = List.of(Map.of(
                "field", ex.getParameterName(),
                "message", "Required parameter is missing.",
                "code", "VALIDATION_FAILED"
        ));

        ProblemDetail problem = buildProblem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request parameters are missing.",
                VALIDATION_CODE,
                BASE_ERROR_TYPE + "validation-failed",
                request,
                errors
        );

        return response(problem, request);
    }

    // 6. Invalid path-variable or parameter types, such as an invalid UUID
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request) {

        List<Map<String, String>> errors = List.of(Map.of(
                "field", ex.getName(),
                "message", "The supplied value has an invalid format.",
                "code", VALIDATION_CODE
        ));

        ProblemDetail problem = buildProblem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request parameters have invalid values.",
                VALIDATION_CODE,
                BASE_ERROR_TYPE + "validation-failed",
                request,
                errors
        );

        return response(problem, request);
    }

    // 7. Unsupported HTTP methods
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemDetail> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request) {

        ProblemDetail problem = buildProblem(
                HttpStatus.METHOD_NOT_ALLOWED,
                "Method not allowed",
                "The HTTP method is not supported for this endpoint.",
                "METHOD_NOT_ALLOWED",
                BASE_ERROR_TYPE + "method-not-allowed",
                request,
                List.of()
        );

        return response(problem, request);
    }

    // 8. Endpoint not found, when MVC raises this exception
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(
            NoHandlerFoundException ex,
            HttpServletRequest request) {

        ProblemDetail problem = buildProblem(
                HttpStatus.NOT_FOUND,
                "Resource not found",
                "The requested endpoint was not found.",
                "RESOURCE_NOT_FOUND",
                BASE_ERROR_TYPE + "resource-not-found",
                request,
                List.of()
        );

        return response(problem, request);
    }

    // 9. Final fallback for unexpected controller/application exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpectedException(
            Exception ex,
            HttpServletRequest request) {

        log.error(
                "Unexpected exception. correlationId={}, path={}",
                correlationId(request),
                request.getRequestURI(),
                ex
        );

        ProblemDetail problem = buildProblem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error",
                "An unexpected error occurred. Please try again later.",
                "INTERNAL_SERVER_ERROR",
                BASE_ERROR_TYPE + "internal-server-error",
                request,
                List.of()
        );

        return response(problem, request);
    }

    // Common response builder: every response has the same properties
    private ProblemDetail buildProblem(
            HttpStatus status,
            String title,
            String detail,
            String code,
            String type,
            HttpServletRequest request,
            List<Map<String, String>> errors) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                status,
                detail
        );

        problem.setTitle(title);
        problem.setType(URI.create(type));
        problem.setInstance(URI.create(request.getRequestURI()));

        problem.setProperty("code", code);
        problem.setProperty("correlationId", correlationId(request));
        problem.setProperty("timestamp", Instant.now().toString());
        problem.setProperty("errors", errors);

        return problem;
    }

    // Set the same correlation ID in the response body and header
    private ResponseEntity<ProblemDetail> response(
            ProblemDetail problem,
            HttpServletRequest request) {

        String correlationId = (String) problem.getProperties()
                .get("correlationId");

        return ResponseEntity
                .status(problem.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header("X-Correlation-Id", correlationId)
                .body(problem);
    }

    private String correlationId(HttpServletRequest request) {
        String supplied = request.getHeader("X-Correlation-Id");

        if (supplied != null && !supplied.isBlank()) {
            try {
                return UUID.fromString(supplied).toString();
            } catch (IllegalArgumentException ignored) {
                // Generate a new ID if the supplied value is invalid.
            }
        }

        return UUID.randomUUID().toString();
    }
}