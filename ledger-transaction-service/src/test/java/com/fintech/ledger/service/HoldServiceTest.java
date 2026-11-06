package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.PlaceHoldRequest;
import com.fintech.ledger.dto.request.ReleaseHoldRequest;
import com.fintech.ledger.dto.response.AccountHoldResponse;
import com.fintech.ledger.entity.AccountHold;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.HoldStatus;
import com.fintech.ledger.enums.NormalBalance;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.AccountHoldRepository;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HoldServiceTest {

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private LedgerAccountRepository accountRepository;

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private LedgerEventProducer eventProducer;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private HoldService holdService;

    private LedgerAccount account;
    private LedgerBalanceSnapshot snapshot;

    @BeforeEach
    void setUp() {
        account = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-1001", UUID.randomUUID(), "ACC-1001",
                UUID.randomUUID(), "Customer Account", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), account, BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");
    }

    @Test
    @DisplayName("Hold Test: Place valid hold - reserves funds without altering ledger balance")
    void placeHold_whenSufficientFunds_shouldReserveFunds() {
        PlaceHoldRequest request = new PlaceHoldRequest(
                "ACC-1001", null, new BigDecimal("1500.00"), "INR", "DISPUTE_INVESTIGATION", "Dispute hold", "HOLD-REQ-1");

        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(account));
        when(snapshotRepository.findWithLockByLedgerAccountId(account.getId())).thenReturn(Optional.of(snapshot));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(holdRepository.save(any(AccountHold.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountHoldResponse response = holdService.placeHold("ACC-1001", request, "OPS-USER", "idemp-hold-1");

        assertNotNull(response);
        assertEquals(HoldStatus.ACTIVE, response.status());
        assertEquals(new BigDecimal("1500.00"), response.amount());
        assertEquals(new BigDecimal("23500.00"), response.availableBalance());
        // Verify ledger balance snapshot was NOT modified
        assertEquals(new BigDecimal("25000.00"), snapshot.getLedgerBalance());
        verify(holdRepository).save(any(AccountHold.class));
        verify(eventProducer).enqueueEvent(any(), any(), eq("HOLD_PLACED"), any(), any());
    }

    @Test
    @DisplayName("Hold Test: Reject hold exceeding available funds")
    void placeHold_whenExceedsAvailableFunds_shouldThrowInsufficientBalance() {
        PlaceHoldRequest request = new PlaceHoldRequest(
                "ACC-1001", null, new BigDecimal("30000.00"), "INR", "COURT_ORDER", "Freeze excess", "HOLD-REQ-2");

        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(account));
        when(snapshotRepository.findWithLockByLedgerAccountId(account.getId())).thenReturn(Optional.of(snapshot));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);

        LedgerException ex = assertThrows(LedgerException.class, () ->
                holdService.placeHold("ACC-1001", request, "OPS-USER", "idemp-hold-2"));

        assertEquals("INSUFFICIENT_BALANCE", ex.getErrorCode());
        verify(holdRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hold Test: Release active hold - restores available balance")
    void releaseHold_whenActive_shouldReleaseAndRestoreAvailableBalance() {
        AccountHold hold = new AccountHold(
                UUID.randomUUID(), "HOLD-551122", account, account.getBankAccountId(), account.getCustomerId(),
                new BigDecimal("1500.00"), "INR", "DISPUTE_INVESTIGATION", "Hold", "REF", "OPS");

        when(holdRepository.findByHoldId("HOLD-551122")).thenReturn(Optional.of(hold));
        when(holdRepository.save(any(AccountHold.class))).thenAnswer(inv -> inv.getArgument(0));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(snapshotRepository.findByLedgerAccount(account)).thenReturn(Optional.of(snapshot));

        ReleaseHoldRequest request = new ReleaseHoldRequest("HOLD-551122", "ACC-1001", new BigDecimal("1500.00"), "INR", "RESOLVED", "Resolved");
        AccountHoldResponse response = holdService.releaseHold("HOLD-551122", request, "OPS-USER");

        assertNotNull(response);
        assertEquals(HoldStatus.RELEASED, response.status());
        assertEquals(new BigDecimal("25000.00"), response.availableBalance());
        verify(eventProducer).enqueueEvent(any(), any(), eq("HOLD_RELEASED"), any(), any());
    }

    @Test
    @DisplayName("Hold Test: Duplicate release is handled idempotently without error")
    void releaseHold_whenAlreadyReleased_shouldReturnIdempotently() {
        AccountHold hold = new AccountHold(
                UUID.randomUUID(), "HOLD-551122", account, account.getBankAccountId(), account.getCustomerId(),
                new BigDecimal("1500.00"), "INR", "DISPUTE_INVESTIGATION", "Hold", "REF", "OPS");
        hold.setHoldStatus(HoldStatus.RELEASED);
        hold.setReleasedAt(Instant.now());

        when(holdRepository.findByHoldId("HOLD-551122")).thenReturn(Optional.of(hold));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(snapshotRepository.findByLedgerAccount(account)).thenReturn(Optional.of(snapshot));

        AccountHoldResponse response = holdService.releaseHold("HOLD-551122", null, "OPS-USER");

        assertEquals(HoldStatus.RELEASED, response.status());
        verify(eventProducer, never()).enqueueEvent(any(), any(), eq("HOLD_RELEASED"), any(), any());
    }
}
