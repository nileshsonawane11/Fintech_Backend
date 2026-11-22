package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.request.CreateHoldRequest;
import com.fintech.account.dto.request.ReleaseHoldRequest;
import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountHoldServiceTest {

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private LedgerServiceClient ledgerServiceClient;

    @Mock
    private AccountNumberGenerator numberGenerator;

    @Mock
    private OutboxEventService outboxEventService;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private AccountHoldService holdService;

    private Account testAccount;
    private AccountHold testHold;

    @BeforeEach
    void setUp() {
        testAccount = new Account();
        testAccount.setId(UUID.randomUUID());
        testAccount.setAccountId("ACC-1001");
        testAccount.setAccountStatus(AccountStatus.ACTIVE);
        testAccount.setCurrency("INR");

        testHold = new AccountHold();
        testHold.setId(UUID.randomUUID());
        testHold.setHoldId("HOLD-551122");
        testHold.setAccountId("ACC-1001");
        testHold.setAmount(new BigDecimal("1500.00"));
        testHold.setCurrency("INR");
        testHold.setReasonCode("DISPUTE_INVESTIGATION");
        testHold.setHoldStatus(HoldStatus.ACTIVE);

        lenient().when(idempotencyService.execute(any(), any(), any(), any(), any()))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(4)).get());
    }

    @Test
    void placeHold_whenLedgerRejects_shouldNotRecordHold_Scenario7() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(numberGenerator.generateHoldId()).thenReturn("HOLD-551122");
        when(ledgerServiceClient.reserveHoldFunds(eq("ACC-1001"), eq("HOLD-551122"), any(), eq("INR"), any()))
                .thenReturn(false);

        CreateHoldRequest request = new CreateHoldRequest(new BigDecimal("500000.00"), "DISPUTE", "Remarks");

        AccountException ex = assertThrows(AccountException.class,
                () -> holdService.placeHold("ACC-1001", null, request, "OPS-2001"));

        assertEquals("HOLD_RESERVATION_FAILED", ex.getCode());
        verify(holdRepository, never()).save(any());
    }

    @Test
    void placeHold_whenSuccessful_shouldRecordHoldAndEmitEvent() {
        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(testAccount));
        when(numberGenerator.generateHoldId()).thenReturn("HOLD-551122");
        when(ledgerServiceClient.reserveHoldFunds(eq("ACC-1001"), eq("HOLD-551122"), any(), eq("INR"), any()))
                .thenReturn(true);
        when(holdRepository.save(any(AccountHold.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateHoldRequest request = new CreateHoldRequest(new BigDecimal("1500.00"), "DISPUTE_INVESTIGATION", "Remarks");

        AccountHoldResponse response = holdService.placeHold("ACC-1001", null, request, "OPS-2001");

        assertNotNull(response);
        assertEquals("HOLD-551122", response.holdId());
        assertEquals("ACC-1001", response.accountId());
        assertEquals(HoldStatus.ACTIVE, response.status());

        verify(outboxEventService).enqueueEvent(eq("HOLD-551122"), eq("AccountHold"), eq("AccountHoldPlacedEvent"), any());
    }

    @Test
    void releaseHold_whenAlreadyReleased_shouldReturnIdempotentlyWithoutReleasingTwice_Scenario9() {
        testHold.setHoldStatus(HoldStatus.RELEASED);
        when(holdRepository.findByHoldId("HOLD-551122")).thenReturn(Optional.of(testHold));

        ReleaseHoldRequest request = new ReleaseHoldRequest("DISPUTE_RESOLVED", "Cleared");
        AccountHoldResponse response = holdService.releaseHold("HOLD-551122", request, "OPS-2001");

        assertNotNull(response);
        assertEquals(HoldStatus.RELEASED, response.status());
        verify(ledgerServiceClient, never()).releaseHoldFunds(any(), any(), any(), any());
    }

    @Test
    void releaseHold_whenActive_shouldCoordinateWithLedgerAndRelease() {
        when(holdRepository.findByHoldId("HOLD-551122")).thenReturn(Optional.of(testHold));
        when(ledgerServiceClient.releaseHoldFunds("ACC-1001", "HOLD-551122", new BigDecimal("1500.00"), "INR")).thenReturn(true);
        when(holdRepository.save(any(AccountHold.class))).thenAnswer(inv -> inv.getArgument(0));

        ReleaseHoldRequest request = new ReleaseHoldRequest("DISPUTE_RESOLVED", "Cleared");
        AccountHoldResponse response = holdService.releaseHold("HOLD-551122", request, "OPS-2001");

        assertNotNull(response);
        assertEquals(HoldStatus.RELEASED, testHold.getHoldStatus());
        verify(outboxEventService).enqueueEvent(eq("HOLD-551122"), eq("AccountHold"), eq("AccountHoldReleasedEvent"), any());
    }

    @Test
    void listOpsHolds_whenNoFilters_shouldReturnPagedResponse() {
        when(holdRepository.findOpsHoldsWithCursor(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(PageRequest.of(0, 20))))
                .thenReturn(new SliceImpl<>(List.of(testHold), PageRequest.of(0, 20), false));

        var response = holdService.listOpsHolds(null, null, null, null, null, null, null, 20);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertEquals("HOLD-551122", response.data().get(0).holdId());
        assertFalse(response.pagination().hasMore());
        assertNull(response.pagination().nextCursor());
    }

    @Test
    void listOpsHolds_withPaginationAndHasMore_shouldComputeNextCursor() {
        AccountHold hold2 = new AccountHold();
        hold2.setHoldId("HOLD-551121");
        hold2.setAccountId("ACC-1001");
        hold2.setAmount(new BigDecimal("500.00"));
        hold2.setCurrency("INR");
        hold2.setReasonCode("SUSPICIOUS");
        hold2.setHoldStatus(HoldStatus.ACTIVE);

        when(holdRepository.findOpsHoldsWithCursor(eq("ACC-1001"), eq("CUS-100"), eq(HoldStatus.ACTIVE), eq("SUSPICIOUS"), any(), any(), eq("HOLD-999"), eq(PageRequest.of(0, 2))))
                .thenReturn(new SliceImpl<>(List.of(testHold, hold2), PageRequest.of(0, 2), true));

        var response = holdService.listOpsHolds("ACC-1001", "CUS-100", HoldStatus.ACTIVE, "SUSPICIOUS", Instant.now().minusSeconds(3600), Instant.now(), "HOLD-999", 2);

        assertNotNull(response);
        assertEquals(2, response.data().size());
        assertTrue(response.pagination().hasMore());
        assertEquals("HOLD-551121", response.pagination().nextCursor());
        assertEquals(2, response.pagination().limit());
    }
}
