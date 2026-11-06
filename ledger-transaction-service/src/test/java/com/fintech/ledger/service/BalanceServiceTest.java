package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.NormalBalance;
import com.fintech.ledger.repository.AccountHoldRepository;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BalanceServiceTest {

    @Mock
    private LedgerAccountRepository accountRepository;

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private BalanceService balanceService;

    private LedgerAccount customerAccount;
    private LedgerBalanceSnapshot snapshot;
    private final UUID customerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        customerAccount = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-1001", UUID.randomUUID(), "ACC-1001",
                customerId, "Test Customer", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), customerAccount, BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");
    }

    @Test
    @DisplayName("Balance Test: Initial ledger balance ₹25,000, Active holds ₹1,500 -> Available ₹23,500")
    void getAccountBalance_withActiveHolds_shouldCalculateAvailableCorrectly() {
        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(customerAccount));
        when(snapshotRepository.findByLedgerAccount(customerAccount)).thenReturn(Optional.of(snapshot));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccount.getId())).thenReturn(new BigDecimal("1500.00"));

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", customerId.toString(), false);

        assertNotNull(balance);
        assertEquals("ACC-1001", balance.accountId());
        assertEquals(new BigDecimal("25000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("1500.00"), balance.holdBalance());
        assertEquals(new BigDecimal("23500.00"), balance.availableBalance());
        assertEquals("INR", balance.currency());
    }

    @Test
    @DisplayName("Balance Test: After releasing hold -> Available ₹25,000")
    void getAccountBalance_afterHoldRelease_shouldEqualLedgerBalance() {
        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(customerAccount));
        when(snapshotRepository.findByLedgerAccount(customerAccount)).thenReturn(Optional.of(snapshot));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccount.getId())).thenReturn(BigDecimal.ZERO);

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", customerId.toString(), false);

        assertNotNull(balance);
        assertEquals(new BigDecimal("25000.00"), balance.ledgerBalance());
        assertEquals(BigDecimal.ZERO, balance.holdBalance());
        assertEquals(new BigDecimal("25000.00"), balance.availableBalance());
    }

    @Test
    @DisplayName("Rebuild Balance Projection: Authoritatively recalculate balance from immutable entries")
    void rebuildAccountBalanceProjection_shouldRecalculateAccurately() {
        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(customerAccount));
        when(snapshotRepository.findWithLockByLedgerAccountId(customerAccount.getId())).thenReturn(Optional.of(snapshot));
        when(entryRepository.sumDebitsByAccountId(customerAccount.getId())).thenReturn(new BigDecimal("5000.00"));
        when(entryRepository.sumCreditsByAccountId(customerAccount.getId())).thenReturn(new BigDecimal("30000.00"));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccount.getId())).thenReturn(new BigDecimal("2000.00"));

        BalanceResponse response = balanceService.rebuildAccountBalanceProjection("ACC-1001", "ops-admin");

        assertNotNull(response);
        // Liability account balance: Credits - Debits = 30000 - 5000 = 25000
        assertEquals(new BigDecimal("25000.00"), response.ledgerBalance());
        assertEquals(new BigDecimal("23000.00"), response.availableBalance());
        verify(snapshotRepository).save(any(LedgerBalanceSnapshot.class));
    }
}
