package com.fintech.identity.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerAccessDeniedTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Protected role-specific route returns 404 NOT_FOUND on AccessDeniedException")
    void testProtectedRoutesReturn404OnAccessDenied() {
        String[] protectedUris = {
                "/api/v1/admin/roles",
                "/api/v1/admin/users/managers",
                "/api/v1/operations/kyc/approve",
                "/api/v1/operations/customers",
                "/api/v1/manager/reports",
                "/api/v1/customer/account"
        };

        for (String uri : protectedUris) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI(uri);

            ResponseEntity<ProblemDetail> response = handler.handleAccessDenied(
                    new AccessDeniedException("Access denied"),
                    request
            );

            assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode(), "Expected 404 for " + uri);
            assertNotNull(response.getBody());
            assertEquals("RESOURCE_NOT_FOUND", response.getBody().getProperties().get("code"));
        }
    }

    @Test
    @DisplayName("Non-protected route returns 403 FORBIDDEN on AccessDeniedException")
    void testGenericRouteReturns403OnAccessDenied() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/consents");

        ResponseEntity<ProblemDetail> response = handler.handleAccessDenied(
                new AccessDeniedException("Access denied"),
                request
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ACCESS_DENIED", response.getBody().getProperties().get("code"));
    }
}
