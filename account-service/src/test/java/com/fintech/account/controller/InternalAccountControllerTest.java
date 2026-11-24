package com.fintech.account.controller;

import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.dto.response.InternalAccountResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.service.AccountHoldService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InternalAccountControllerTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountHoldService holdService;

    @InjectMocks
    private InternalAccountController controller;

    private Account testAccount;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(UUID.randomUUID());
        testAccount.setAccountId("ACC-1001");
        testAccount.setAccountNumber("123456789012");
        testAccount.setCustomerId("CUS-1001");
        testAccount.setIdentitySubject("usr-12345678");
        testAccount.setAccountType(AccountType.SAVINGS);
        testAccount.setProductCode("SAV-STD");
        testAccount.setAccountStatus(AccountStatus.ACTIVE);
        testAccount.setCurrency("INR");
        testAccount.setOpenedAt(Instant.now());
    }

    @Test
    @DisplayName("GET /internal/api/v1/accounts/{accountId} returns 200 OK with masked account info")
    void getAccountById_whenExists_shouldReturnVerificationInfo() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        ResponseEntity<InternalAccountResponse> response = controller.getAccountById("ACC-1001");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ACC-1001", response.getBody().accountId());
        assertEquals("********9012", response.getBody().accountNumberMasked());
        assertEquals("CUS-1001", response.getBody().customerId());
        assertEquals("usr-12345678", response.getBody().identitySubject());
        assertEquals(AccountStatus.ACTIVE, response.getBody().status());
    }

    @Test
    @DisplayName("GET /internal/api/v1/accounts/{accountId} throws 404 when not found")
    void getAccountById_whenNotFound_shouldThrowNotFound() {
        when(accountRepository.findByAccountId("ACC-9999")).thenReturn(Optional.empty());

        AccountException ex = assertThrows(AccountException.class, () -> controller.getAccountById("ACC-9999"));
        assertEquals("RESOURCE_NOT_FOUND", ex.getCode());
    }

    @Test
    @DisplayName("GET /internal/api/v1/accounts/{accountId}/holds returns 200 OK with active holds")
    void getAccountHolds_shouldReturnActiveHolds() {
        AccountHoldResponse hold1 = new AccountHoldResponse(
                "HOLD-101", "ACC-1001", new BigDecimal("1500.00"), "INR", "DISPUTE",
                HoldStatus.ACTIVE, "Remarks", "OPS", null, Instant.now(), null, null
        );
        CursorPagedResponse<AccountHoldResponse> pagedResponse =
                CursorPagedResponse.of(List.of(hold1), null, false, 100);

        when(holdService.listAccountHolds("ACC-1001", HoldStatus.ACTIVE, null, 100))
                .thenReturn(pagedResponse);

        ResponseEntity<CursorPagedResponse<AccountHoldResponse>> response =
                controller.getAccountHolds("ACC-1001", HoldStatus.ACTIVE, 100, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().data().size());
        assertEquals("HOLD-101", response.getBody().data().get(0).holdId());
        assertEquals(new BigDecimal("1500.00"), response.getBody().data().get(0).amount());
        verify(holdService).listAccountHolds("ACC-1001", HoldStatus.ACTIVE, null, 100);
    }

    @Test
    @DisplayName("GET /internal/api/v1/accounts/{accountId}/holds throws 404 when account does not exist")
    void getAccountHolds_whenAccountNotFound_shouldThrowNotFound() {
        when(holdService.listAccountHolds("ACC-9999", HoldStatus.ACTIVE, null, 100))
                .thenThrow(AccountException.notFound("Account not found: ACC-9999"));

        AccountException ex = assertThrows(AccountException.class,
                () -> controller.getAccountHolds("ACC-9999", HoldStatus.ACTIVE, 100, null));
        assertEquals("RESOURCE_NOT_FOUND", ex.getCode());
    }
}
