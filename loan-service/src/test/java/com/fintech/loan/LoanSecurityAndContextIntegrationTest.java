package com.fintech.loan;

import com.fintech.loan.config.JwtAuthenticationConverter;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanApplication;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProcessingFeeType;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import com.fintech.loan.repository.LoanProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class LoanSecurityAndContextIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private JwtAuthenticationConverter jwtAuthenticationConverter;
    @Autowired private LoanProductRepository productRepository;
    @Autowired private LoanProductFeeRepository feeRepository;
    @Autowired private LoanApplicationRepository applicationRepository;
    @Autowired private LoanAccountRepository accountRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        if (productRepository.findByProductCodeIgnoreCase("HOME_LOAN").isEmpty()) {
            LoanProduct home = new LoanProduct();
            home.setId(UUID.randomUUID());
            home.setProductCode("HOME_LOAN");
            home.setProductName("FinEdge Home Loan");
            home.setLoanCategory(LoanCategory.HOME);
            home.setStatus(ProductStatus.ACTIVE);
            home.setCurrency("INR");
            home.setMinimumLoanAmount(new BigDecimal("500000.00"));
            home.setMaximumLoanAmount(new BigDecimal("50000000.00"));
            home.setMinimumInterestRate(new BigDecimal("8.35"));
            home.setMaximumInterestRate(new BigDecimal("10.15"));
            home.setInterestCalculationMethod(InterestCalculationMethod.REDUCING_BALANCE);
            home.setMinimumTenureMonths(60);
            home.setMaximumTenureMonths(360);
            home.setMaximumLTVPercentage(new BigDecimal("85.00"));
            home.setMinimumMonthlyIncome(new BigDecimal("40000.00"));
            home.setMaxFoirPercentage(new BigDecimal("60.00"));
            home.setSecured(true);
            home.setBalanceTransferAllowed(true);
            home.setTopUpAllowed(true);
            home.setStepUpEMIAllowed(true);
            home.setStepUpEMIDurationMonths(60);
            LoanProduct saved = productRepository.save(home);

            LoanProductFee fee = new LoanProductFee();
            fee.setId(UUID.randomUUID());
            fee.setProductId(saved.getId());
            fee.setProcessingFeeType(ProcessingFeeType.PERCENTAGE);
            fee.setProcessingFeeValue(new BigDecimal("0.40"));
            fee.setMinimumProcessingFee(new BigDecimal("5000.00"));
            fee.setMaximumProcessingFee(new BigDecimal("25000.00"));
            fee.setPrepaymentChargePercentage(BigDecimal.ZERO);
            fee.setPrepaymentCharges("NIL");
            fee.setForeclosureChargePercentage(BigDecimal.ZERO);
            fee.setForeclosureCharges("NIL");
            fee.setLatePaymentPenalty(new BigDecimal("2.00"));
            fee.setChequeBounceCharges(new BigDecimal("400.00"));
            feeRepository.save(fee);
        }
    }

    @Test
    void jwtConverterRejectsMfaTokenAndMapsRolesAndPermissions() {
        Jwt mfaJwt = Jwt.withTokenValue("mfa-tok")
                .header("alg", "RS256")
                .subject("cust-1")
                .claim("token_use", "MFA")
                .build();
        assertThrows(InvalidBearerTokenException.class, () -> jwtAuthenticationConverter.convert(mfaJwt));

        Jwt accessJwt = Jwt.withTokenValue("acc-tok")
                .header("alg", "RS256")
                .subject("cust-1")
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("CUSTOMER"))
                .claim("permissions", List.of("LOAN_APPLY"))
                .build();
        AbstractAuthenticationToken auth = jwtAuthenticationConverter.convert(accessJwt);
        assertEquals("cust-1", auth.getName());
        assertTrue(auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        assertTrue(auth.getAuthorities().contains(new SimpleGrantedAuthority("LOAN_APPLY")));
    }

    @Test
    void publicProductEndpointsAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/loans/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productCode").value("HOME_LOAN"));

        mockMvc.perform(get("/api/v1/loans/products/HOME_LOAN/interest-rates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minimumInterestRate").value(8.35))
                .andExpect(jsonPath("$.maximumInterestRate").value(10.15));
    }

    @Test
    void roleBasedAuthorizationEnforcedOnAdminAndOpsEndpoints() throws Exception {
        // Customer cannot access admin or ops endpoints
        mockMvc.perform(get("/api/v1/loans/admin/products")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS").claim("roles", List.of("CUSTOMER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/loans/ops/applications")
                        .with(jwt().jwt(j -> j.subject("cust-1").claim("token_use", "ACCESS").claim("roles", List.of("CUSTOMER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        // LOAN_OFFICER can list ops applications, cannot approve or access admin
        mockMvc.perform(get("/api/v1/loans/ops/applications")
                        .with(jwt().jwt(j -> j.subject("off-1").claim("token_use", "ACCESS").claim("roles", List.of("LOAN_OFFICER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_LOAN_OFFICER"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/loans/ops/applications/LN-NONE/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .with(jwt().jwt(j -> j.subject("off-1").claim("token_use", "ACCESS").claim("roles", List.of("LOAN_OFFICER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_LOAN_OFFICER"))))
                .andExpect(status().isForbidden());

        // ADMIN can access admin product management
        mockMvc.perform(get("/api/v1/loans/admin/products")
                        .with(jwt().jwt(j -> j.subject("admin-1").claim("token_use", "ACCESS").claim("roles", List.of("ADMIN")))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].productCode").value("HOME_LOAN"));
    }

    @Test
    void customerOwnershipEnforcedOnApplicationsAndRepaymentSchedules() throws Exception {
        LoanApplication app = new LoanApplication();
        app.setId(UUID.randomUUID().toString());
        app.setLoanApplicationId("LN-APP-OWN-1");
        app.setCustomerId("CUS-A");
        app.setIdentitySubject("sub-owner-a");
        app.setProductCode("HOME_LOAN");
        app.setRequestedAmount(new BigDecimal("1000000.00"));
        app.setTenureMonths(120);
        app.setCreditBureauConsent(true);
        app.setStatus("SUBMITTED");
        app.setCreditAssessmentStatus("QUEUED_FOR_UNDERWRITING");
        applicationRepository.save(app);

        LoanAccount loanAcc = new LoanAccount();
        loanAcc.setLoanAccountId("LN-ACC-OWN-1");
        loanAcc.setLoanApplicationId("LN-APP-OWN-1");
        loanAcc.setOfferId("OFFER-1");
        loanAcc.setCustomerId("CUS-A");
        loanAcc.setIdentitySubject("sub-owner-a");
        loanAcc.setPrincipalAmount(new BigDecimal("1000000.00"));
        loanAcc.setOutstandingPrincipal(new BigDecimal("1000000.00"));
        loanAcc.setInterestRate(new BigDecimal("8.35"));
        loanAcc.setTenureMonths(120);
        loanAcc.setCurrency("INR");
        loanAcc.setEmiAmount(new BigDecimal("12320.00"));
        loanAcc.setDisbursementDate(LocalDate.now());
        loanAcc.setNextDueDate(LocalDate.now().plusMonths(1));
        loanAcc.setStatus("ACTIVE");
        accountRepository.save(loanAcc);

        // Attacker B denied
        mockMvc.perform(get("/api/v1/loans/applications/LN-APP-OWN-1")
                        .with(jwt().jwt(j -> j.subject("sub-attacker-b").claim("token_use", "ACCESS").claim("roles", List.of("CUSTOMER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/loans/LN-ACC-OWN-1/schedule")
                        .with(jwt().jwt(j -> j.subject("sub-attacker-b").claim("token_use", "ACCESS").claim("roles", List.of("CUSTOMER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());

        // Owner A allowed
        mockMvc.perform(get("/api/v1/loans/applications/LN-APP-OWN-1")
                        .with(jwt().jwt(j -> j.subject("sub-owner-a").claim("token_use", "ACCESS").claim("roles", List.of("CUSTOMER")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanApplicationId").value("LN-APP-OWN-1"));
    }
}
