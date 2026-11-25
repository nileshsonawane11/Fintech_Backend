package com.fintech.payment.controller;

import com.fintech.payment.dto.response.OpsDtos.ReconciliationRunSummaryResponse;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.service.BeneficiaryService;
import com.fintech.payment.service.IncomingPaymentService;
import com.fintech.payment.service.PaymentService;
import com.fintech.payment.service.ReconciliationService;
import com.fintech.payment.service.WebhookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:payment_ctrl_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.service-registry.auto-registration.enabled=false",
        "spring.kafka.admin.auto-create=false",
        "spring.kafka.listener.auto-startup=false",
        "payment.reconciliation.enabled=false"
})
class PaymentControllersSecurityTest {

    @Autowired private WebApplicationContext context;
    private MockMvc mockMvc;

    @MockitoBean private BeneficiaryService beneficiaryService;
    @MockitoBean private PaymentService paymentService;
    @MockitoBean private IncomingPaymentService incomingPaymentService;
    @MockitoBean private WebhookService webhookService;
    @MockitoBean private ReconciliationService reconciliationService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    void rejectsUnauthenticatedCustomerRequests() throws Exception {
        mockMvc.perform(get("/api/v1/beneficiaries"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forbidsCustomerFromCallingOpsEndpoints() throws Exception {
        mockMvc.perform(post("/ops/api/v1/payments/reconciliation/run")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void allowsOperationsRoleToRunReconciliation() throws Exception {
        when(reconciliationService.runReconciliation("ops-1")).thenReturn(
                new ReconciliationRunSummaryResponse("REC-RUN-1", 1, 0, 0, 0, 0, Instant.now()));

        mockMvc.perform(post("/ops/api/v1/payments/reconciliation/run")
                        .with(jwt().jwt(j -> j.subject("ops-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATIONS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value("REC-RUN-1"));
    }

    @Test
    void rejectsInvalidIfscAndInvalidUpiFormatsAtControllerValidation() throws Exception {
        mockMvc.perform(post("/api/v1/beneficiaries")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nickname": "Bad",
                                  "beneficiaryName": "Test",
                                  "accountNumber": "123",
                                  "ifscCode": "INVALID",
                                  "bankName": "Bank"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        mockMvc.perform(post("/api/v1/beneficiaries/upi")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "vpa": "not-a-valid-upi",
                                  "beneficiaryName": "Test",
                                  "nickname": "Bad UPI"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void allowsUnsignedWebhookEndpointWithoutJwtWhileDelegatingToSignatureVerification() throws Exception {
        when(webhookService.processRazorpaySmartCollectWebhook(any(), any(), any()))
                .thenReturn(new WebhookResponse(true));

        mockMvc.perform(post("/api/v1/payments/webhooks/razorpay/smart-collect")
                        .header("X-Razorpay-Signature", "a".repeat(64))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"event\":\"virtual_account.credited\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
    }
}
