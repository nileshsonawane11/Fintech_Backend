package com.fintech.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityProblemHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecurityProblemHandler handler = new SecurityProblemHandler(objectMapper);

    @Test
    @DisplayName("commence returns 401 UNAUTHORIZED on missing or invalid JWT")
    void testCommenceReturns401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/admin/roles");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.commence(request, response, new BadCredentialsException("Invalid token"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("handle returns 404 NOT_FOUND on protected role route when access is denied")
    void testHandleReturns404ForProtectedRoutes() throws Exception {
        String[] protectedUris = {
                "/api/v1/admin/roles",
                "/api/v1/operations/kyc/approve",
                "/api/v1/manager/reports",
                "/api/v1/customer/account"
        };

        for (String uri : protectedUris) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI(uri);
            MockHttpServletResponse response = new MockHttpServletResponse();

            handler.handle(request, response, new AccessDeniedException("Access denied"));

            assertEquals(404, response.getStatus(), "Expected 404 for protected URI: " + uri);
            assertTrue(response.getContentAsString().contains("RESOURCE_NOT_FOUND"));
        }
    }

    @Test
    @DisplayName("handle returns 403 FORBIDDEN for generic non-role routes")
    void testHandleReturns403ForGenericRoutes() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/other-resource");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("Access denied"));

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("ACCESS_DENIED"));
    }
}
