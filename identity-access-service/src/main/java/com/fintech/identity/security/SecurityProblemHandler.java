package com.fintech.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;

@Component
public class SecurityProblemHandler
        implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public SecurityProblemHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        writeProblem(
                request,
                response,
                HttpStatus.UNAUTHORIZED,
                "UNAUTHENTICATED",
                "Authentication is required to access this resource."
        );
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception
    ) throws IOException {
        writeProblem(
                request,
                response,
                HttpStatus.FORBIDDEN,
                "ACCESS_DENIED",
                "You are not authorized to access this resource."
        );
    }

    private void writeProblem(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String detail
    ) throws IOException {

        String correlationId = request.getHeader("X-Correlation-Id");

        // Only accept a UUID-shaped correlation ID from the caller.
        if (correlationId == null
                || !correlationId.matches(
                "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
                        + "[0-9a-f]{4}-[0-9a-f]{12}"
        )) {
            correlationId = java.util.UUID.randomUUID().toString();
        }

        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setType(URI.create("about:blank"));
        problem.setTitle(status.getReasonPhrase());
        problem.setDetail(detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty("correlationId", correlationId);
        problem.setProperty("timestamp", Instant.now().toString());

        response.setStatus(status.value());
        response.setContentType("application/problem+json");
        response.setHeader("X-Correlation-Id", correlationId);

        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}