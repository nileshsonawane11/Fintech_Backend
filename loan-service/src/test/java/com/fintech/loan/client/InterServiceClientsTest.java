package com.fintech.loan.client;

import com.fintech.loan.client.dto.CustomerKycContext;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.exception.ApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class InterServiceClientsTest {

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void customerServiceClientUsesEurekaServiceIdAndPropagatesCorrelationId() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        CustomerServiceClient client = new CustomerServiceClient(builder, LoanConstants.SERVICE_CUSTOMER, 1);

        MDC.put(LoanConstants.MDC_CORRELATION_ID, "corr-loan-123");

        server.expect(requestTo("http://CUSTOMER-SERVICE/api/v1/customers/by-identity/sub-1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(LoanConstants.HEADER_CORRELATION_ID, "corr-loan-123"))
                .andRespond(withSuccess("""
                        {
                          "customerId": "CUS-1001",
                          "fullName": "Priya Nair",
                          "kycStatus": "APPROVED",
                          "riskCategory": "LOW"
                        }
                        """, MediaType.APPLICATION_JSON));

        CustomerKycContext ctx = client.verifyCustomerAndFetchKyc("sub-1");
        assertEquals("CUS-1001", ctx.profile().customerId());
        assertEquals("APPROVED", ctx.profile().kycStatus());
        server.verify();
    }

    @Test
    void customerServiceClientRetriesOn5xxAndRejectsUnverifiedKyc() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        CustomerServiceClient client = new CustomerServiceClient(builder, LoanConstants.SERVICE_CUSTOMER, 1);

        server.expect(requestTo("http://CUSTOMER-SERVICE/api/v1/customers/by-identity/sub-2"))
                .andRespond(withServerError());
        server.expect(requestTo("http://CUSTOMER-SERVICE/api/v1/customers/by-identity/sub-2"))
                .andRespond(withSuccess("""
                        {
                          "customerId": "CUS-1002",
                          "fullName": "Rahul Verma",
                          "kycStatus": "SUBMITTED",
                          "riskCategory": "LOW"
                        }
                        """, MediaType.APPLICATION_JSON));

        ApiException ex = assertThrows(ApiException.class, () -> client.verifyCustomerAndFetchKyc("sub-2"));
        assertEquals("KYC_NOT_VERIFIED", ex.getCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        server.verify();
    }

    @Test
    void accountServiceClientValidatesOwnershipActiveStatusAndEligibleType() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AccountServiceClient client = new AccountServiceClient(builder, LoanConstants.SERVICE_ACCOUNT, 0);

        server.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1001"))
                .andRespond(withSuccess("""
                        {
                          "accountId": "ACC-1001",
                          "accountNumberMasked": "****1001",
                          "customerId": "CUS-1001",
                          "identitySubject": "sub-1",
                          "accountType": "SAVINGS",
                          "status": "ACTIVE",
                          "currency": "INR"
                        }
                        """, MediaType.APPLICATION_JSON));

        InternalAccountDto ok = client.validateDisbursementAccount("ACC-1001", "sub-1", "CUS-1001", "INR");
        assertEquals("ACC-1001", ok.accountId());
        server.verify();
        server.reset();

        // Ownership mismatch
        server.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1002"))
                .andRespond(withSuccess("""
                        {
                          "accountId": "ACC-1002",
                          "customerId": "CUS-OTHER",
                          "identitySubject": "sub-other",
                          "accountType": "SAVINGS",
                          "status": "ACTIVE",
                          "currency": "INR"
                        }
                        """, MediaType.APPLICATION_JSON));

        ApiException mismatch = assertThrows(ApiException.class,
                () -> client.validateDisbursementAccount("ACC-1002", "sub-1", "CUS-1001", "INR"));
        assertEquals("ACCOUNT_OWNERSHIP_MISMATCH", mismatch.getCode());
        server.verify();
        server.reset();

        // Fixed Deposit not eligible for disbursement
        server.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-FD-1"))
                .andRespond(withSuccess("""
                        {
                          "accountId": "ACC-FD-1",
                          "customerId": "CUS-1001",
                          "identitySubject": "sub-1",
                          "accountType": "FIXED_DEPOSIT",
                          "status": "ACTIVE",
                          "currency": "INR"
                        }
                        """, MediaType.APPLICATION_JSON));

        ApiException fdEx = assertThrows(ApiException.class,
                () -> client.validateDisbursementAccount("ACC-FD-1", "sub-1", "CUS-1001", "INR"));
        assertEquals("ACCOUNT_NOT_ELIGIBLE_FOR_DISBURSEMENT", fdEx.getCode());

        server.verify();
    }
}
