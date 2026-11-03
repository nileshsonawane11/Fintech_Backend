package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.request.AccountLifecycleRequest;
import com.fintech.account.dto.response.LifecycleHistoryResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountLifecycleHistory;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountLifecycleHistoryRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountLifecycleServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private AccountLifecycleHistoryRepository historyRepository;

    @Mock
    private LedgerServiceClient ledgerServiceClient;

    @Mock
    private OutboxEventService outboxEventService;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private AccountLifecycleService lifecycleService;

    private Account testAccount;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(UUID.randomUUID());
        testAccount.setAccountId("ACC-1001");
        testAccount.setAccountStatus(AccountStatus.ACTIVE);

        lenient().when(idempotencyService.execute(any(), any(), any(), any(), any()))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(4)).get());
    }

    @Test
    void freezeAccount_whenActive_shouldTransitionToFrozen_Scenario5() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        AccountLifecycleRequest request = new AccountLifecycleRequest("SUSPICIOUS_ACTIVITY", "Investigation");
        lifecycleService.freezeAccount("ACC-1001", request, "OPS-2001");

        assertEquals(AccountStatus.FROZEN, testAccount.getAccountStatus());
        verify(historyRepository).save(argThat(h -> h.getNewStatus() == AccountStatus.FROZEN));
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountFrozenEvent"), any());
        verify(auditLogger).logAudit(eq("FREEZE_ACCOUNT"), any(), eq("ACC-1001"), eq("OPS-2001"), any());
    }

    @Test
    void unfreezeAccount_whenClosed_shouldThrowInvalidStateTransition_Scenario6() {
        testAccount.setAccountStatus(AccountStatus.CLOSED);
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        AccountLifecycleRequest request = new AccountLifecycleRequest("CLEARED", "Remarks");

        AccountException ex = assertThrows(AccountException.class,
                () -> lifecycleService.unfreezeAccount("ACC-1001", request, "OPS-2001"));

        assertEquals("INVALID_STATE_TRANSITION", ex.getCode());
    }

    @Test
    void unfreezeAccount_whenFrozen_shouldTransitionToActive() {
        testAccount.setAccountStatus(AccountStatus.FROZEN);
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));

        AccountLifecycleRequest request = new AccountLifecycleRequest("CLEARED", "Remarks");
        lifecycleService.unfreezeAccount("ACC-1001", request, "OPS-2001");

        assertEquals(AccountStatus.ACTIVE, testAccount.getAccountStatus());
        verify(historyRepository).save(argThat(h -> h.getNewStatus() == AccountStatus.ACTIVE));
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountUnfrozenEvent"), any());
    }

    @Test
    void closeAccount_whenHasOutstandingHolds_shouldThrowUnprocessable() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(holdRepository.countByAccountIdAndHoldStatus("ACC-1001", HoldStatus.ACTIVE)).thenReturn(2L);

        AccountLifecycleRequest request = new AccountLifecycleRequest("CUSTOMER_REQUEST", "Close");

        AccountException ex = assertThrows(AccountException.class,
                () -> lifecycleService.closeAccount("ACC-1001", null, request, "OPS-2001"));

        assertEquals("OUTSTANDING_HOLDS", ex.getCode());
    }

    @Test
    void closeAccount_whenZeroObligations_shouldCloseSuccessfully() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(holdRepository.countByAccountIdAndHoldStatus("ACC-1001", HoldStatus.ACTIVE)).thenReturn(0L);
        when(ledgerServiceClient.verifyZeroObligationsForClosure("ACC-1001")).thenReturn(true);

        AccountLifecycleRequest request = new AccountLifecycleRequest("CUSTOMER_REQUEST", "Close");
        lifecycleService.closeAccount("ACC-1001", null, request, "OPS-2001");

        assertEquals(AccountStatus.CLOSED, testAccount.getAccountStatus());
        assertNotNull(testAccount.getClosedAt());
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountClosedEvent"), any());
    }

    @Test
    void getLifecycleHistory_shouldReturnHistoryEntries() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        AccountLifecycleHistory history = new AccountLifecycleHistory("ACC-1001", AccountStatus.ACTIVE, AccountStatus.FROZEN, "REASON", "Remarks", "OPS");
        when(historyRepository.findByAccountIdOrderByChangedAtDesc("ACC-1001")).thenReturn(List.of(history));

        List<LifecycleHistoryResponse> list = lifecycleService.getLifecycleHistory("ACC-1001");

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(AccountStatus.FROZEN, list.get(0).newStatus());
    }
}
