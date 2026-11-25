package com.fintech.payment.client;

import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.client.dto.LedgerBalanceDto;
import com.fintech.payment.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.payment.client.dto.LedgerDtos.MultiLinePostingRequest;
import com.fintech.payment.client.dto.LedgerDtos.PostingEntryRequest;
import com.fintech.payment.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class InternalClientsTest {

    @Test
    void customerClientRejectsUnapprovedKyc() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        CustomerServiceClient client = new CustomerServiceClient(builder, "CUSTOMER-SERVICE");

        server.expect(requestTo("http://CUSTOMER-SERVICE/api/v1/customers/by-identity/user-1"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"customerId\":\"CUS-1\",\"fullName\":\"Test\",\"kycStatus\":\"UNDER_REVIEW\"}",
                        MediaType.APPLICATION_JSON));

        ApiException ex = assertThrows(ApiException.class, () -> client.verifyKycApproved("user-1"));
        assertEquals("KYC_NOT_APPROVED", ex.getCode());
        assertEquals(403, ex.getStatus().value());
        server.verify();
    }

    @Test
    void accountClientValidatesOwnershipAndActiveStatus() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AccountServiceClient client = new AccountServiceClient(builder, "ACCOUNT-SERVICE");

        server.expect(requestTo("http://ACCOUNT-SERVICE/internal/api/v1/accounts/ACC-1"))
                .andRespond(withSuccess("{\"accountId\":\"ACC-1\",\"identitySubject\":\"other-user\",\"status\":\"ACTIVE\",\"currency\":\"INR\"}",
                        MediaType.APPLICATION_JSON));

        ApiException ex = assertThrows(ApiException.class,
                () -> client.validateCustomerAccountEligible("ACC-1", "user-1", "INR"));
        assertEquals("ACCOUNT_OWNERSHIP_MISMATCH", ex.getCode());
        server.verify();
    }

    @Test
    void ledgerClientSendsInternalSecretHeaderOnBalanceAndPosting() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        LedgerServiceClient client = new LedgerServiceClient(builder, "LEDGER-TRANSACTION-SERVICE", "secret-123");

        server.expect(requestTo("http://LEDGER-TRANSACTION-SERVICE/internal/api/v1/ledger/accounts/ACC-1/balance"))
                .andExpect(header("X-Internal-Service-Secret", "secret-123"))
                .andRespond(withSuccess("{\"accountId\":\"ACC-1\",\"ledgerBalance\":5000.00,\"availableBalance\":4500.00,\"holdBalance\":500.00,\"currency\":\"INR\"}",
                        MediaType.APPLICATION_JSON));

        server.expect(requestTo("http://LEDGER-TRANSACTION-SERVICE/internal/api/v1/ledger/postings/batch"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Internal-Service-Secret", "secret-123"))
                .andExpect(header("Idempotency-Key", "idemp-1"))
                .andRespond(withSuccess("{\"transactionId\":\"TXN-1\",\"status\":\"SUCCESS\",\"amount\":100.00,\"currency\":\"INR\"}",
                        MediaType.APPLICATION_JSON));

        LedgerBalanceDto bal = client.getAccountBalance("ACC-1");
        assertEquals(new BigDecimal("4500.00"), bal.availableBalance());

        LedgerPostingResponseDto posted = client.postBatch("idemp-1", new MultiLinePostingRequest(
                "BANK_TRANSFER", "INR", "corr-1", "desc", "PAY-1",
                List.of(
                        new PostingEntryRequest("ACC-1", "DEBIT", new BigDecimal("100.00"), "d", "PAY-1"),
                        new PostingEntryRequest("SYSTEM-CLEARING-INR", "CREDIT", new BigDecimal("100.00"), "c", "PAY-1")
                )));
        assertEquals("TXN-1", posted.transactionId());
        server.verify();
    }
}
