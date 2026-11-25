package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.model.ProviderModels.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class RazorpayClientsTest {

    private RazorpayProperties properties;
    private ObjectMapper objectMapper;
    private RazorpayHttpSupport httpSupport;

    @BeforeEach
    void setUp() {
        properties = new RazorpayProperties();
        properties.setBaseUrl("https://api.razorpay.com/v1");
        properties.setKeyId("rzp_test_key");
        properties.setKeySecret("rzp_test_secret");
        properties.getRazorpayx().setBaseUrl("https://api.razorpay.com/v1");
        properties.getRazorpayx().setSourceAccountNumber("7878780080316316");
        objectMapper = new ObjectMapper().findAndRegisterModules();
        httpSupport = new RazorpayHttpSupport(objectMapper);
    }

    @Test
    void smartCollectCreatesCustomerAndVirtualAccount() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RazorpaySmartCollectClient client = new RazorpaySmartCollectClient(builder, properties, httpSupport, objectMapper);

        server.expect(requestTo("https://api.razorpay.com/v1/customers"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", org.hamcrest.Matchers.startsWith("Basic ")))
                .andRespond(withSuccess("{\"id\":\"cust_rzp_1\",\"name\":\"Aarav\",\"email\":\"a@b.com\"}",
                        MediaType.APPLICATION_JSON));

        server.expect(requestTo("https://api.razorpay.com/v1/virtual_accounts"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {
                          "id": "va_1001",
                          "customer_id": "cust_rzp_1",
                          "status": "active",
                          "name": "FinBank Aarav",
                          "receivers": [
                            {"entity":"bank_account","account_number":"1112220001","ifsc":"RATN0VAAPIS","bank_name":"RBL Bank"},
                            {"entity":"vpa","address":"finbank.1001@okicici"}
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        ProviderCustomerResult cust = client.createOrGetCustomer(
                new ProviderCustomerRequest("Aarav", "a@b.com", "+919876543210", "CUS-1", Map.of()));
        assertEquals("cust_rzp_1", cust.providerCustomerId());

        VirtualAccountResult va = client.createVirtualAccount(
                new CreateVirtualAccountCommand("cust_rzp_1", List.of("bank_account", "vpa"), "Collection VA", null, Map.of()));
        assertEquals("va_1001", va.providerVaId());
        assertEquals("1112220001", va.bankAccountNumber());
        assertEquals("finbank.1001@okicici", va.vpaAddress());
        server.verify();
    }

    @Test
    void razorpayXCreatesPayoutWithIdempotencyHeaderAndConvertsPaise() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RazorpayXPayoutClient client = new RazorpayXPayoutClient(builder, properties, httpSupport);

        server.expect(requestTo("https://api.razorpay.com/v1/payouts"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Payout-Idempotency", "idemp-uuid-1"))
                .andExpect(jsonPath("$.amount").value(125050))
                .andExpect(jsonPath("$.account_number").value("7878780080316316"))
                .andExpect(jsonPath("$.mode").value("IMPS"))
                .andRespond(withSuccess("""
                        {
                          "id": "pout_1001",
                          "fund_account_id": "fa_1",
                          "amount": 125050,
                          "currency": "INR",
                          "mode": "IMPS",
                          "status": "processing"
                        }
                        """, MediaType.APPLICATION_JSON));

        PayoutResult res = client.createPayout(new CreatePayoutCommand(
                "idemp-uuid-1", "fa_1", new BigDecimal("1250.50"), "INR", "IMPS",
                "payout", "PAY-1", "Transfer", Map.of()));

        assertFalse(res.timedOut());
        assertEquals("pout_1001", res.providerPayoutId());
        assertEquals("processing", res.status());
        server.verify();
    }

    @Test
    void razorpayXReturnsTimedOutMarkerWithoutBlindRetryOnTimeout() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RazorpayXPayoutClient client = new RazorpayXPayoutClient(builder, properties, httpSupport);

        server.expect(requestTo("https://api.razorpay.com/v1/payouts"))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out");
                });

        PayoutResult res = client.createPayout(new CreatePayoutCommand(
                "idemp-timeout", "fa_1", new BigDecimal("500.00"), "INR", "NEFT",
                "payout", "PAY-2", "Transfer", Map.of()));

        assertTrue(res.timedOut());
        assertEquals("UNKNOWN", res.status());
        server.verify();
    }

    @Test
    void throwsExplicitNotConfiguredWhenCredentialsAreMissing() {
        RazorpayProperties emptyProps = new RazorpayProperties();
        RestClient.Builder builder = RestClient.builder();
        RazorpaySmartCollectClient sc = new RazorpaySmartCollectClient(builder, emptyProps, httpSupport, objectMapper);

        ApiException ex = assertThrows(ApiException.class,
                () -> sc.fetchVirtualAccount("va_1"));
        assertEquals("PROVIDER_NOT_CONFIGURED", ex.getCode());
        assertEquals(503, ex.getStatus().value());
    }
}
