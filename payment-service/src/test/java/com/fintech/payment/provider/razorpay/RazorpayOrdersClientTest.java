package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.model.ProviderModels.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class RazorpayOrdersClientTest {

    private RazorpayProperties properties;
    private MockRestServiceServer mockServer;
    private RazorpayOrdersClient ordersClient;
    private RazorpayCheckoutSignatureVerifier checkoutVerifier;

    @BeforeEach
    void setUp() {
        properties = new RazorpayProperties();
        properties.setBaseUrl("https://api.razorpay.com/v1");
        properties.setKeyId("rzp_test_key");
        properties.setKeySecret("rzp_test_secret");
        properties.setMaxGetRetries(1);

        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockServer = MockRestServiceServer.bindTo(builder).build();
        ordersClient = new RazorpayOrdersClient(properties, new RazorpayHttpSupport(new ObjectMapper()), builder.build());
        checkoutVerifier = new RazorpayCheckoutSignatureVerifier();
    }

    @Test
    void createOrder_success() {
        mockServer.expect(requestTo("https://api.razorpay.com/v1/orders"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"id":"order_RZP123","amount":500000,"amount_paid":0,"amount_due":500000,"currency":"INR","receipt":"PAY-1","status":"created","attempts":0}
                        """, MediaType.APPLICATION_JSON));

        RazorpayOrderResult res = ordersClient.createOrder(new CreateOrderCommand(
                new BigDecimal("5000.00"), "INR", "PAY-1", true, Map.of("purpose", "ACCOUNT_DEPOSIT")));

        assertEquals("order_RZP123", res.orderId());
        assertEquals(0, new BigDecimal("5000.00").compareTo(res.amount()));
        assertEquals("INR", res.currency());
        assertEquals("created", res.status());
        mockServer.verify();
    }

    @Test
    void createOrder_invalidCredentials_mapsToProviderAuthFailed() {
        mockServer.expect(requestTo("https://api.razorpay.com/v1/orders"))
                .andRespond(withUnauthorizedRequest().body("{\"error\":{\"code\":\"BAD_REQUEST_ERROR\",\"description\":\"Auth failed\"}}"));

        ApiException ex = assertThrows(ApiException.class, () -> ordersClient.createOrder(
                new CreateOrderCommand(new BigDecimal("100.00"), "INR", "PAY-1", true, Map.of())));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        assertEquals("PROVIDER_AUTH_FAILED", ex.getCode());
    }

    @Test
    void createOrder_timeout_mapsToGatewayTimeout() {
        mockServer.expect(requestTo("https://api.razorpay.com/v1/orders"))
                .andRespond(request -> { throw new ResourceAccessException("Read timed out"); });

        ApiException ex = assertThrows(ApiException.class, () -> ordersClient.createOrder(
                new CreateOrderCommand(new BigDecimal("100.00"), "INR", "PAY-1", true, Map.of())));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, ex.getStatus());
        assertEquals("PROVIDER_TIMEOUT", ex.getCode());
    }

    @Test
    void createOrder_invalidOrderResponse_throwsBadGateway() {
        mockServer.expect(requestTo("https://api.razorpay.com/v1/orders"))
                .andRespond(withSuccess("{\"status\":\"created\"}", MediaType.APPLICATION_JSON));

        ApiException ex = assertThrows(ApiException.class, () -> ordersClient.createOrder(
                new CreateOrderCommand(new BigDecimal("100.00"), "INR", "PAY-1", true, Map.of())));
        assertEquals("PROVIDER_INVALID_RESPONSE", ex.getCode());
    }

    @Test
    void captureAndRefund_success() {
        mockServer.expect(requestTo("https://api.razorpay.com/v1/payments/pay_123/capture"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"id":"pay_123","order_id":"order_123","amount":100000,"currency":"INR","status":"captured","method":"upi","captured":true}
                        """, MediaType.APPLICATION_JSON));

        mockServer.expect(requestTo("https://api.razorpay.com/v1/payments/pay_123/refund"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"id":"rfnd_123","payment_id":"pay_123","amount":100000,"currency":"INR","status":"processed"}
                        """, MediaType.APPLICATION_JSON));

        RazorpayPaymentResult captured = ordersClient.capturePayment(
                new CapturePaymentCommand("pay_123", new BigDecimal("1000.00"), "INR"));
        assertTrue(captured.captured());
        assertEquals("captured", captured.status());

        RazorpayRefundResult refunded = ordersClient.refundPayment(
                new RefundPaymentCommand("pay_123", new BigDecimal("1000.00"), "RFND-1", Map.of()));
        assertEquals("rfnd_123", refunded.refundId());
        assertEquals("processed", refunded.status());
    }

    @Test
    void checkoutSignatureVerifier_validAndInvalid() throws Exception {
        String orderId = "order_DBJOWzybf0sJbb";
        String paymentId = "pay_DBJOWzybf0sJbb";
        String secret = "rzp_test_secret";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String validSig = HexFormat.of().formatHex(
                mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));

        assertTrue(checkoutVerifier.verifyCheckoutSignature(orderId, paymentId, validSig, secret));
        assertFalse(checkoutVerifier.verifyCheckoutSignature(orderId, paymentId, "0".repeat(64), secret));
        assertFalse(checkoutVerifier.verifyCheckoutSignature(orderId, paymentId, "bad", secret));
    }
}
