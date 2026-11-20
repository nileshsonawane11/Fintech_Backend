package com.fintech.card.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void testOpenAPIConfiguration() {
        OpenApiConfig config = new OpenApiConfig();
        ReflectionTestUtils.setField(config, "serverPort", "8086");

        OpenAPI openAPI = config.cardServiceOpenAPI();
        assertNotNull(openAPI);
        assertNotNull(openAPI.getInfo());
        assertEquals("FinBank Card Service API", openAPI.getInfo().getTitle());
        assertEquals("1.0.0", openAPI.getInfo().getVersion());

        // Verify Bearer JWT Security Scheme
        assertNotNull(openAPI.getComponents());
        assertNotNull(openAPI.getComponents().getSecuritySchemes());
        SecurityScheme bearerAuth = openAPI.getComponents().getSecuritySchemes().get("BearerAuth");
        assertNotNull(bearerAuth);
        assertEquals(SecurityScheme.Type.HTTP, bearerAuth.getType());
        assertEquals("bearer", bearerAuth.getScheme());
        assertEquals("JWT", bearerAuth.getBearerFormat());

        // Verify Servers
        assertNotNull(openAPI.getServers());
        assertFalse(openAPI.getServers().isEmpty());
        assertTrue(openAPI.getServers().stream().anyMatch(s -> s.getUrl().contains("8086")));
    }
}
