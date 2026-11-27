package com.fintech.gateway;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false"
})
class SwaggerDocumentationGatewayTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private RouteLocator routeLocator;

    private WebTestClient webTestClient;

    @BeforeEach
    void setUp() {
        this.webTestClient = WebTestClient.bindToApplicationContext(context).build();
    }

    @Test
    @DisplayName("Verify centralized Swagger UI endpoint is accessible without authentication")
    void testSwaggerUiEndpointAccessible() {
        webTestClient.get()
                .uri("/swagger-ui.html")
                .exchange()
                .expectStatus().is3xxRedirection();
    }

    @Test
    @DisplayName("Verify Swagger Config endpoint returns all nine microservices in urls")
    void testSwaggerConfigEndpointContainsAllNineServices() {
        webTestClient.get()
                .uri("/v3/api-docs/swagger-config")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.urls").isArray()
                .jsonPath("$.urls.length()").isEqualTo(9)
                .jsonPath("$.urls[?(@.name == 'Identity Service')].url").isEqualTo("/identity/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Customer Service')].url").isEqualTo("/customer/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Ledger and Transaction Service')].url").isEqualTo("/ledger/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Account Service')].url").isEqualTo("/account/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Payment Service')].url").isEqualTo("/payment/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Card Service')].url").isEqualTo("/card/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Loan Service')].url").isEqualTo("/loan/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Investment Service')].url").isEqualTo("/investment/v3/api-docs")
                .jsonPath("$.urls[?(@.name == 'Notification and Support Service')].url").isEqualTo("/notification/v3/api-docs");
    }

    @Test
    @DisplayName("Verify all nine documentation routes are registered in API Gateway")
    void testDocumentationRoutesRegistered() {
        List<String> routeIds = routeLocator.getRoutes()
                .map(route -> route.getId())
                .collectList()
                .block();

        assertThat(routeIds).contains(
                "identity-service-docs",
                "customer-service-docs",
                "ledger-service-docs",
                "account-service-docs",
                "payment-service-docs",
                "card-service-docs",
                "loan-service-docs",
                "investment-service-docs",
                "notification-service-docs"
        );
    }

    @Test
    @DisplayName("Verify ledger-service route is registered and routes rebuild-balance")
    void testLedgerServiceRoutesRebuildBalance() {
        org.springframework.cloud.gateway.route.Route ledgerRoute = routeLocator.getRoutes()
                .filter(route -> "ledger-service".equals(route.getId()))
                .blockFirst();

        assertThat(ledgerRoute).isNotNull();
        assertThat(ledgerRoute.getPredicate().toString()).contains("/ops/api/v1/accounts/*/rebuild-balance");
    }
}
