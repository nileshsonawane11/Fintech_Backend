package com.fintech.account.client;

import com.fintech.account.config.RestClientConfig;
import com.fintech.account.dto.response.BalanceResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class InterServiceDiscoveryTest {

    @Test
    @DisplayName("Verify RestClientConfig declares @LoadBalanced RestClient.Builder bean")
    void testRestClientConfigHasLoadBalancedBean() throws NoSuchMethodException {
        RestClientConfig config = new RestClientConfig();
        assertNotNull(config.restClientBuilder());

        Method method = RestClientConfig.class.getMethod("restClientBuilder");
        assertTrue(method.isAnnotationPresent(LoadBalanced.class),
                "restClientBuilder bean method must be annotated with @LoadBalanced for Eureka service discovery");
    }

    @Test
    @DisplayName("Verify IdentityServiceClient targets http://IDENTITY-SERVICE/api/v1/auth/identities/match")
    void testIdentityServiceClientUsesServiceDiscovery() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        IdentityServiceClient client = new IdentityServiceClient(builder, "IDENTITY-SERVICE");

        server.expect(requestTo("http://IDENTITY-SERVICE/api/v1/auth/identities/match"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andRespond(withSuccess(
                        "{\"matched\":true,\"identityId\":\"11111111-1111-1111-1111-111111111111\",\"fullName\":\"John Doe\",\"mobileNumber\":\"9876543210\",\"email\":\"test@example.com\",\"status\":\"ACTIVE\"}",
                        MediaType.APPLICATION_JSON
                ));

        IdentityMatchResponse response = client.matchIdentity("9876543210", "test@example.com");
        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals("John Doe", response.fullName());

        server.verify();
    }

    @Test
    @DisplayName("Verify IdentityServiceClient createApplicantIdentity targets http://IDENTITY-SERVICE/api/v1/auth/identities/applicant")
    void testIdentityServiceClientCreateApplicantIdentity() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        IdentityServiceClient client = new IdentityServiceClient(builder, "IDENTITY-SERVICE");

        server.expect(requestTo("http://IDENTITY-SERVICE/api/v1/auth/identities/applicant"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andRespond(withSuccess(
                        "{\"matched\":true,\"identityId\":\"22222222-2222-2222-2222-222222222222\",\"fullName\":\"Alice Smith\",\"mobileNumber\":\"9876543211\",\"email\":\"alice@example.com\",\"status\":\"ACTIVE\"}",
                        MediaType.APPLICATION_JSON
                ));

        IdentityMatchResponse response = client.createApplicantIdentity("Alice Smith", "9876543211", "alice@example.com");
        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals("Alice Smith", response.fullName());

        server.verify();
    }

    @Test
    @DisplayName("Verify CustomerServiceClient targets http://CUSTOMER-SERVICE")
    void testCustomerServiceClientUsesServiceDiscovery() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        CustomerServiceClient client = new CustomerServiceClient(builder, "CUSTOMER-SERVICE");

        server.expect(requestTo("http://CUSTOMER-SERVICE/api/v1/customers/me"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        "{\"customerId\":\"CUS-123\",\"fullName\":\"John Doe\",\"dateOfBirth\":\"1990-01-01\",\"email\":\"john@example.com\",\"phone\":\"9876543210\",\"address\":\"123 Main St\",\"kycStatus\":\"APPROVED\",\"riskProfile\":\"LOW\"}",
                        MediaType.APPLICATION_JSON
                ));

        CustomerProfileDto profile = client.getCustomerProfile("usr-12345");
        assertNotNull(profile);
        assertEquals("CUS-123", profile.customerId());
        assertEquals("APPROVED", profile.kycStatus());

        server.verify();
    }

    @Test
    @DisplayName("Verify LedgerServiceClient targets http://LEDGER-SERVICE")
    void testLedgerServiceClientUsesServiceDiscovery() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        LedgerServiceClientImpl client = new LedgerServiceClientImpl(builder, "LEDGER-SERVICE", false);

        server.expect(requestTo("http://LEDGER-SERVICE/api/v1/balances/ACC-1001"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(
                        "{\"availableBalance\":5000.00,\"ledgerBalance\":5000.00,\"pendingHolds\":0.00,\"currency\":\"INR\"}",
                        MediaType.APPLICATION_JSON
                ));

        BalanceResponse balance = client.getAccountBalance("ACC-1001");
        assertNotNull(balance);
        assertEquals("INR", balance.currency());

        server.verify();
    }
}
