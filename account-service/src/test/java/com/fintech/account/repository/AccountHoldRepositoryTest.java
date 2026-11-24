package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AccountHoldRepositoryTest {

    @Autowired
    private AccountHoldRepository holdRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        holdRepository.deleteAll();

        // 1. HOLD-1004: ACC-1001, ACTIVE, DISPUTE, 2026-11-20T10:00:00Z
        createAndPersistHold("HOLD-1004", "ACC-1001", new BigDecimal("1000.00"), "DISPUTE",
                HoldStatus.ACTIVE, Instant.parse("2026-11-20T10:00:00Z"));

        // 2. HOLD-1003: ACC-1001, RELEASED, COURT_ORDER, 2026-11-20T12:00:00Z
        createAndPersistHold("HOLD-1003", "ACC-1001", new BigDecimal("2000.00"), "COURT_ORDER",
                HoldStatus.RELEASED, Instant.parse("2026-11-20T12:00:00Z"));

        // 3. HOLD-1002: ACC-2002, ACTIVE, DISPUTE, 2026-11-21T08:00:00Z
        createAndPersistHold("HOLD-1002", "ACC-2002", new BigDecimal("3000.00"), "DISPUTE",
                HoldStatus.ACTIVE, Instant.parse("2026-11-21T08:00:00Z"));

        // 4. HOLD-1001: ACC-2002, CANCELLED, SUSPICIOUS_ACTIVITY, 2026-11-21T15:00:00Z
        createAndPersistHold("HOLD-1001", "ACC-2002", new BigDecimal("4000.00"), "SUSPICIOUS_ACTIVITY",
                HoldStatus.CANCELLED, Instant.parse("2026-11-21T15:00:00Z"));

        entityManager.flush();
        entityManager.clear();
    }

    private void createAndPersistHold(String holdId, String accountId, BigDecimal amount,
                                      String reasonCode, HoldStatus status, Instant createdAt) {
        AccountHold hold = new AccountHold();
        hold.setId(UUID.randomUUID());
        hold.setHoldId(holdId);
        hold.setAccountId(accountId);
        hold.setAmount(amount);
        hold.setCurrency("INR");
        hold.setReasonCode(reasonCode);
        hold.setRemarks("Test remarks for " + holdId);
        hold.setHoldStatus(status);
        hold.setCreatedBy("OPS");
        hold.setCreatedAt(createdAt);
        entityManager.persist(hold);
    }

    @Test
    @DisplayName("Scenario 1: No filters provided returns all matching records sorted descending by holdId")
    void testNoFiltersProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(4, content.size());
        assertEquals("HOLD-1004", content.get(0).getHoldId());
        assertEquals("HOLD-1003", content.get(1).getHoldId());
        assertEquals("HOLD-1002", content.get(2).getHoldId());
        assertEquals("HOLD-1001", content.get(3).getHoldId());
        assertFalse(result.hasNext());
    }

    @Test
    @DisplayName("Scenario 2: Only accountId provided")
    void testOnlyAccountIdProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                "ACC-2002", null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("HOLD-1002", content.get(0).getHoldId());
        assertEquals("HOLD-1001", content.get(1).getHoldId());
    }

    @Test
    @DisplayName("Scenario 3: Only status provided")
    void testOnlyStatusProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, HoldStatus.ACTIVE, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("HOLD-1004", content.get(0).getHoldId());
        assertEquals("HOLD-1002", content.get(1).getHoldId());
    }

    @Test
    @DisplayName("Scenario 4: Only reasonCode provided")
    void testOnlyReasonCodeProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, null, "DISPUTE", null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("HOLD-1004", content.get(0).getHoldId());
        assertEquals("HOLD-1002", content.get(1).getHoldId());
    }

    @Test
    @DisplayName("Scenario 5: Only fromDate provided (inclusive)")
    void testOnlyFromDateProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, null, null, Instant.parse("2026-11-21T00:00:00Z"), null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("HOLD-1002", content.get(0).getHoldId());
        assertEquals("HOLD-1001", content.get(1).getHoldId());
    }

    @Test
    @DisplayName("Scenario 6: Only toDate provided (inclusive)")
    void testOnlyToDateProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, null, null, null, Instant.parse("2026-11-20T11:00:00Z"), null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(1, content.size());
        assertEquals("HOLD-1004", content.get(0).getHoldId());
    }

    @Test
    @DisplayName("Scenario 7: Both date filters provided")
    void testBothDateFiltersProvided() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                null, null, null,
                Instant.parse("2026-11-20T11:00:00Z"),
                Instant.parse("2026-11-21T10:00:00Z"),
                null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("HOLD-1003", content.get(0).getHoldId());
        assertEquals("HOLD-1002", content.get(1).getHoldId());
    }

    @Test
    @DisplayName("Scenario 8: Cursor pagination without other filters")
    void testCursorPaginationWithoutOtherFilters() {
        // Page 1 (limit 2)
        Slice<AccountHold> page1 = holdRepository.findOpsHoldsWithCursor(
                null, null, null, null, null, null, PageRequest.of(0, 2));

        assertNotNull(page1);
        List<AccountHold> content1 = page1.getContent();
        assertEquals(2, content1.size());
        assertEquals("HOLD-1004", content1.get(0).getHoldId());
        assertEquals("HOLD-1003", content1.get(1).getHoldId());
        assertTrue(page1.hasNext());

        String cursor = content1.get(content1.size() - 1).getHoldId();
        assertEquals("HOLD-1003", cursor);

        // Page 2 (limit 2 with cursor)
        Slice<AccountHold> page2 = holdRepository.findOpsHoldsWithCursor(
                null, null, null, null, null, cursor, PageRequest.of(0, 2));

        assertNotNull(page2);
        List<AccountHold> content2 = page2.getContent();
        assertEquals(2, content2.size());
        assertEquals("HOLD-1002", content2.get(0).getHoldId());
        assertEquals("HOLD-1001", content2.get(1).getHoldId());
        assertFalse(page2.hasNext());
    }

    @Test
    @DisplayName("Scenario 9: All filters combined")
    void testAllFiltersCombined() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                "ACC-1001",
                HoldStatus.ACTIVE,
                "DISPUTE",
                Instant.parse("2026-11-20T09:00:00Z"),
                Instant.parse("2026-11-20T11:00:00Z"),
                "HOLD-1005",
                PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountHold> content = result.getContent();
        assertEquals(1, content.size());
        assertEquals("HOLD-1004", content.get(0).getHoldId());
        assertEquals("ACC-1001", content.get(0).getAccountId());
        assertEquals(HoldStatus.ACTIVE, content.get(0).getHoldStatus());
        assertEquals("DISPUTE", content.get(0).getReasonCode());
    }

    @Test
    @DisplayName("Scenario 10: Empty result set")
    void testEmptyResultSet() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                "NON_EXISTENT_ACCOUNT",
                HoldStatus.ACTIVE,
                null, null, null, null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().isEmpty());
        assertFalse(result.hasNext());
    }

    @Test
    @DisplayName("Scenario 11: 8-parameter overload accepting customerId")
    void testCustomerIdOverload() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                "ACC-1001",
                "CUS-100",
                HoldStatus.ACTIVE,
                "DISPUTE",
                null, null, null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("HOLD-1004", result.getContent().get(0).getHoldId());
    }

    @Test
    @DisplayName("Scenario 12: Blank string parameters are treated as null/ignored")
    void testBlankStringsIgnored() {
        Slice<AccountHold> result = holdRepository.findOpsHoldsWithCursor(
                "   ", null, "   ", null, null, "   ", PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(4, result.getContent().size());
    }
}
