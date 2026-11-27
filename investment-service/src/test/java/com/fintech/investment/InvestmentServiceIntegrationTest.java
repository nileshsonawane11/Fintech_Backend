package com.fintech.investment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.client.AccountServiceClient;
import com.fintech.investment.client.CustomerServiceClient;
import com.fintech.investment.client.LedgerServiceClient;
import com.fintech.investment.client.PaymentServiceClient;
import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.entity.InvestmentEnums.ProductStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import com.fintech.investment.entity.InvestmentProduct;
import com.fintech.investment.entity.InvestmentRateSlab;
import com.fintech.investment.repository.InvestmentOutboxEventRepository;
import com.fintech.investment.repository.InvestmentProductRepository;
import com.fintech.investment.repository.InvestmentRateSlabRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class InvestmentServiceIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InvestmentProductRepository productRepository;

    @Autowired
    private InvestmentRateSlabRepository slabRepository;

    @Autowired
    private InvestmentOutboxEventRepository outboxRepository;

    @MockitoBean
    private CustomerServiceClient customerClient;

    @MockitoBean
    private AccountServiceClient accountClient;

    @MockitoBean
    private LedgerServiceClient ledgerClient;

    @MockitoBean
    private PaymentServiceClient paymentClient;

    @BeforeEach
    void seedProductsIfEmpty() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        if (productRepository.findByProductCodeAndDeletedFalse("FD_CLASSIC_001").isEmpty()) {
            InvestmentProduct fd = new InvestmentProduct();
            fd.setId(UUID.randomUUID());
            fd.setProductCode("FD_CLASSIC_001");
            fd.setProductName("FinEdge Term Fixed Deposit");
            fd.setProductType(ProductType.FD);
            fd.setStatus(ProductStatus.ACTIVE);
            fd.setMinAmount(new BigDecimal("5000.00"));
            fd.setMaxAmount(new BigDecimal("50000000.00"));
            fd.setDenominationStep(new BigDecimal("100.00"));
            fd.setMinTenureMonths(3);
            fd.setMaxTenureMonths(120);
            fd.setBaseRate(new BigDecimal("6.7500"));
            fd.setMaxRate(new BigDecimal("7.6000"));
            fd.setCompoundingFrequency("QUARTERLY");
            fd.setPayoutOptions("MATURITY,MONTHLY,QUARTERLY");
            fd.setLoanAgainstFdAllowed(true);
            fd.setMaxLtvPct(new BigDecimal("90.00"));
            fd.setAutoRenewalSupported(true);
            fd.setReturnsGuaranteed(true);
            fd = productRepository.save(fd);

            InvestmentRateSlab slab = new InvestmentRateSlab();
            slab.setProductId(fd.getId());
            slab.setMinTenureDays(180);
            slab.setMaxTenureDays(1095);
            slab.setMinAmount(new BigDecimal("5000.00"));
            slab.setMaxAmount(new BigDecimal("50000000.00"));
            slab.setInterestRate(new BigDecimal("7.5000"));
            slab.setEffectiveFrom(LocalDate.now().minusDays(10));
            slabRepository.save(slab);
        }

        if (productRepository.findByProductCodeAndDeletedFalse("SIP_EQUITY_001").isEmpty()) {
            InvestmentProduct sip = new InvestmentProduct();
            sip.setId(UUID.randomUUID());
            sip.setProductCode("SIP_EQUITY_001");
            sip.setProductName("FinEdge Systematic Investment Plan");
            sip.setProductType(ProductType.SIP);
            sip.setStatus(ProductStatus.ACTIVE);
            sip.setMinAmount(new BigDecimal("500.00"));
            sip.setMaxAmount(new BigDecimal("1000000.00"));
            sip.setDenominationStep(new BigDecimal("100.00"));
            sip.setMinTenureMonths(6);
            sip.setMaxTenureMonths(360);
            sip.setBaseRate(new BigDecimal("12.0000"));
            sip.setMaxRate(new BigDecimal("12.0000"));
            sip.setCompoundingFrequency("MONTHLY");
            sip.setPayoutOptions("GROWTH");
            sip.setReturnsGuaranteed(false);
            sip.setMarketLinked(true);
            sip.setFundCategory("LARGE_CAP_EQUITY");
            productRepository.save(sip);
        }

        if (productRepository.findByProductCodeAndDeletedFalse("SSY_GOV_001").isEmpty()) {
            InvestmentProduct ssy = new InvestmentProduct();
            ssy.setId(UUID.randomUUID());
            ssy.setProductCode("SSY_GOV_001");
            ssy.setProductName("Sukanya Samriddhi Yojana");
            ssy.setProductType(ProductType.SSY);
            ssy.setStatus(ProductStatus.ACTIVE);
            ssy.setMinAmount(new BigDecimal("250.00"));
            ssy.setMaxAmount(new BigDecimal("150000.00"));
            ssy.setDenominationStep(new BigDecimal("50.00"));
            ssy.setMinTenureMonths(252);
            ssy.setMaxTenureMonths(252);
            ssy.setBaseRate(new BigDecimal("8.2000"));
            ssy.setMaxRate(new BigDecimal("8.2000"));
            ssy.setCompoundingFrequency("ANNUAL");
            ssy.setPayoutOptions("MATURITY");
            ssy.setReturnsGuaranteed(false);
            ssy.setGovernmentScheme(true);
            productRepository.save(ssy);
        }

        when(customerClient.getCurrentCustomerProfile()).thenReturn(new CustomerProfileDto(
                "CUS-1001", "Aarav Sharma", LocalDate.of(1992, 5, 10),
                "9876543210", "aarav@finedge.in", "VERIFIED", "LOW"));
        when(accountClient.validateActiveOwnedAccount(anyString(), anyString())).thenAnswer(inv ->
                new InternalAccountDto(inv.getArgument(0), "XXXX1234", "CUS-1001", inv.getArgument(1),
                        "SAVINGS", "SAVINGS_REGULAR", "ACTIVE", "INR", Instant.now()));
        when(ledgerClient.getAccountBalance(anyString())).thenReturn(
                new LedgerBalanceDto("ACC-1", new BigDecimal("500000.00"), new BigDecimal("500000.00"), "INR"));
        when(ledgerClient.postBatch(anyString(), any())).thenReturn(
                new LedgerPostingResponseDto("LTX-999", "POSTED", new BigDecimal("50000.00"),
                        "INR", "DE-1", "CE-1", List.of("DE-1"), Instant.now()));
        when(paymentClient.registerMandateBestEffort(anyString(), any())).thenReturn(Optional.empty());
    }

    @Test
    void publicProductsAndCalculatorsWorkWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/investments/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productCode").isNotEmpty());

        mockMvc.perform(post("/api/v1/investments/calculators/sip")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"monthlyInvestment": 5000, "tenureMonths": 60, "assumedAnnualReturnPct": 12}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isIllustrative").value(true))
                .andExpect(jsonPath("$.returnsGuaranteed").value(false));
    }

    @Test
    void adminProductLifecycleAndRoleProtection() throws Exception {
        String payload = """
                {
                  "productCode": "FD_TAX_SAVER_001",
                  "productName": "Tax Saver FD 5Y",
                  "productType": "FD",
                  "currency": "INR",
                  "minAmount": 5000.00,
                  "maxAmount": 150000.00,
                  "denominationStep": 100.00,
                  "minTenureMonths": 60,
                  "maxTenureMonths": 60,
                  "baseRate": 7.25,
                  "maxRate": 7.25,
                  "compoundingFrequency": "QUARTERLY",
                  "payoutOptions": "MATURITY",
                  "prematureWithdrawalAllowed": false,
                  "prematurePenaltyPct": 0.00,
                  "lockInMonths": 60,
                  "loanAgainstFdAllowed": false,
                  "maxLtvPct": 0.00,
                  "autoRenewalSupported": false,
                  "returnsGuaranteed": true,
                  "marketLinked": false,
                  "governmentScheme": false
                }
                """;

        // Customer is forbidden
        mockMvc.perform(post("/api/v1/investments/admin/products")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());

        // Admin creates, activates, and checks audit log
        mockMvc.perform(post("/api/v1/investments/admin/products")
                        .with(jwt().jwt(j -> j.subject("admin-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        mockMvc.perform(patch("/api/v1/investments/admin/products/FD_TAX_SAVER_001/status")
                        .with(jwt().jwt(j -> j.subject("admin-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE", "remarks": "Approved for launch"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/investments/admin/products/audit-logs?productCode=FD_TAX_SAVER_001")
                        .with(jwt().jwt(j -> j.subject("admin-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("STATUS_CHANGE_ACTIVE"));
    }

    @Test
    void fdBookingIdempotencyAndIdorProtection() throws Exception {
        String idempotencyKey = UUID.randomUUID().toString();
        String fdRequest = """
                {
                  "productCode": "FD_CLASSIC_001",
                  "amount": 50000.00,
                  "tenureMonths": 12,
                  "compoundingFrequency": "QUARTERLY",
                  "payoutFrequency": "MATURITY",
                  "autoRenewal": true,
                  "fundingAccountId": "ACC-1",
                  "consentAccepted": true,
                  "immediateBook": true
                }
                """;

        MvcResult first = mockMvc.perform(post("/api/v1/investments/applications")
                        .header("Idempotency-Key", idempotencyKey)
                        .with(jwt().jwt(j -> j.subject("user-a").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fdRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("BOOKED"))
                .andReturn();

        String appId = objectMapper.readTree(first.getResponse().getContentAsString()).get("applicationId").asText();

        // Replay with same Idempotency-Key returns exact same applicationId
        mockMvc.perform(post("/api/v1/investments/applications")
                        .header("Idempotency-Key", idempotencyKey)
                        .with(jwt().jwt(j -> j.subject("user-a").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fdRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationId").value(appId));

        // Reusing Idempotency-Key with different payload returns 409
        mockMvc.perform(post("/api/v1/investments/applications")
                        .header("Idempotency-Key", idempotencyKey)
                        .with(jwt().jwt(j -> j.subject("user-a").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fdRequest.replace("50000.00", "60000.00")))
                .andExpect(status().isConflict());

        // Fetch user-a's booked investment
        MvcResult invList = mockMvc.perform(get("/api/v1/investments")
                        .with(jwt().jwt(j -> j.subject("user-a").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andReturn();
        String invId = objectMapper.readTree(invList.getResponse().getContentAsString()).get(0).get("investmentId").asText();

        // IDOR check: user-b cannot access user-a's investment -> 403
        mockMvc.perform(get("/api/v1/investments/" + invId)
                        .with(jwt().jwt(j -> j.subject("user-b").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        // Outbox events emitted
        assertThat(outboxRepository.findAll()).isNotEmpty();
    }

    @Test
    void ssyAgeEligibilityAndSipPauseResumeCancel() throws Exception {
        // SSY girl child >= 10 years old must be rejected
        String ineligibleSsy = """
                {
                  "productCode": "SSY_GOV_001",
                  "amount": 10000.00,
                  "fundingAccountId": "ACC-1",
                  "ssyGirlChildName": "Ananya",
                  "ssyGirlChildDob": "2010-01-01",
                  "ssyGuardianName": "Ramesh",
                  "ssyGuardianRelationship": "FATHER",
                  "consentAccepted": true,
                  "immediateBook": false
                }
                """;
        mockMvc.perform(post("/api/v1/investments/applications")
                        .with(jwt().jwt(j -> j.subject("user-ssy").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ineligibleSsy))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("SSY_AGE_INELIGIBLE"));

        // SIP book -> pause -> resume -> cancel
        String sipReq = """
                {
                  "productCode": "SIP_EQUITY_001",
                  "amount": 5000.00,
                  "tenureMonths": 24,
                  "sipFundCategory": "LARGE_CAP_EQUITY",
                  "sipDebitDay": 10,
                  "sipAssumedReturnPct": 12.0,
                  "fundingAccountId": "ACC-1",
                  "consentAccepted": true,
                  "immediateBook": true
                }
                """;
        mockMvc.perform(post("/api/v1/investments/applications")
                        .with(jwt().jwt(j -> j.subject("user-sip").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sipReq))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("BOOKED"));

        MvcResult listRes = mockMvc.perform(get("/api/v1/investments")
                        .with(jwt().jwt(j -> j.subject("user-sip").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andReturn();
        String sipId = objectMapper.readTree(listRes.getResponse().getContentAsString()).get(0).get("investmentId").asText();

        mockMvc.perform(post("/api/v1/investments/" + sipId + "/sip/pause")
                        .with(jwt().jwt(j -> j.subject("user-sip").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));

        mockMvc.perform(post("/api/v1/investments/" + sipId + "/sip/resume")
                        .with(jwt().jwt(j -> j.subject("user-sip").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(post("/api/v1/investments/" + sipId + "/sip/cancel")
                        .with(jwt().jwt(j -> j.subject("user-sip").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void opsDashboardRequiresStaffRole() throws Exception {
        mockMvc.perform(get("/api/v1/investments/ops/dashboard")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/investments/ops/dashboard")
                        .with(jwt().jwt(j -> j.subject("ops-1").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATIONS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingApplications").isArray());
    }

    @Test
    void documentUploadListDownloadAndIdorProtection() throws Exception {
        String ssyReq = """
                {
                  "productCode": "SSY_GOV_001",
                  "amount": 5000.00,
                  "fundingAccountId": "ACC-1",
                  "ssyGirlChildName": "Diya",
                  "ssyGirlChildDob": "2022-05-15",
                  "ssyGuardianName": "Suresh",
                  "ssyGuardianRelationship": "FATHER",
                  "consentAccepted": true,
                  "immediateBook": false
                }
                """;
        MvcResult appRes = mockMvc.perform(post("/api/v1/investments/applications")
                        .with(jwt().jwt(j -> j.subject("doc-owner").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ssyReq))
                .andExpect(status().isCreated())
                .andReturn();
        String appId = objectMapper.readTree(appRes.getResponse().getContentAsString()).get("applicationId").asText();

        byte[] pdfBytes = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        MockMultipartFile pdfFile = new MockMultipartFile("file", "birth-cert.pdf", "application/pdf", pdfBytes);

        MvcResult uploadRes = mockMvc.perform(multipart("/api/v1/investments/applications/" + appId + "/documents/upload")
                        .file(pdfFile)
                        .param("documentType", "GIRL_CHILD_BIRTH_CERTIFICATE")
                        .param("documentName", "Birth Certificate")
                        .with(jwt().jwt(j -> j.subject("doc-owner").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationStatus").value("PENDING"))
                .andReturn();
        String docId = objectMapper.readTree(uploadRes.getResponse().getContentAsString()).get("documentId").asText();

        mockMvc.perform(get("/api/v1/investments/applications/" + appId + "/documents")
                        .with(jwt().jwt(j -> j.subject("doc-owner").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value(docId));

        mockMvc.perform(get("/api/v1/investments/applications/" + appId + "/documents/" + docId + "/content")
                        .with(jwt().jwt(j -> j.subject("doc-owner").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(content().bytes(pdfBytes));

        // IDOR check: another customer cannot download
        mockMvc.perform(get("/api/v1/investments/applications/" + appId + "/documents/" + docId + "/content")
                        .with(jwt().jwt(j -> j.subject("other-user").claim("token_use", "ACCESS"))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());
    }
}
