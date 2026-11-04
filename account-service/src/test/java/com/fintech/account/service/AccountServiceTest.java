package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.response.AccountDetailResponse;
import com.fintech.account.dto.response.AccountResponse;
import com.fintech.account.dto.response.BalanceResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private LedgerServiceClient ledgerServiceClient;

    @InjectMocks
    private AccountService accountService;

    private Account testAccount;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(UUID.randomUUID());
        testAccount.setAccountId("ACC-1001");
        testAccount.setAccountNumber("5001123456781234");
        testAccount.setCustomerId("CUS-100234");
        testAccount.setIdentitySubject("sub-123");
        testAccount.setProductCode("SAVINGS_REGULAR");
        testAccount.setAccountType(AccountType.SAVINGS);
        testAccount.setCurrency("INR");
        testAccount.setAccountStatus(AccountStatus.ACTIVE);
        testAccount.setOpenedAt(Instant.now());
    }

    @Test
    void listMyAccounts_shouldReturnMaskedAccountNumbers() {
        when(accountRepository.findMyAccountsWithCursor(eq("sub-123"), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new SliceImpl<>(List.of(testAccount)));

        CursorPagedResponse<AccountResponse> response = accountService.listMyAccounts("sub-123", null, null, null, 20);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertEquals("ACC-1001", response.data().get(0).accountId());
        assertEquals("************1234", response.data().get(0).accountNumber());
    }

    @Test
    void getAccountDetails_whenOwner_shouldReturnDetailsWithBalance() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(ledgerServiceClient.getAccountBalance("ACC-1001")).thenReturn(new BalanceResponse(
                new BigDecimal("25000.00"),
                new BigDecimal("23500.00"),
                new BigDecimal("1500.00"),
                "INR"
        ));

        AccountDetailResponse response = accountService.getAccountDetails("sub-123", "ACC-1001", false);

        assertNotNull(response);
        assertEquals("ACC-1001", response.accountId());
        assertEquals("************1234", response.accountNumber());
        assertNotNull(response.balance());
        assertEquals(new BigDecimal("25000.00"), response.balance().ledgerBalance());
        assertEquals(new BigDecimal("23500.00"), response.balance().availableBalance());
        assertEquals(new BigDecimal("1500.00"), response.balance().holdBalance());
    }

    @Test
    void getAccountDetails_whenDifferentCustomer_shouldThrowForbidden_Scenario8() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        AccountException ex = assertThrows(AccountException.class,
                () -> accountService.getAccountDetails("sub-OTHER-CUSTOMER", "ACC-1001", false));

        assertEquals("ACCESS_DENIED", ex.getCode());
    }
}
