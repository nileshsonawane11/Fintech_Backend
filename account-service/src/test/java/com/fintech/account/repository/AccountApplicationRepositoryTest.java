package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
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
class AccountApplicationRepositoryTest {

    @Autowired
    private AccountApplicationRepository applicationRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private UUID productId;

    @BeforeEach
    void setUp() {
        applicationRepository.deleteAll();

        productId = UUID.randomUUID();

        // 1. ACC-APP-1004: PENDING_APPROVAL, CUS-100, SAVINGS_REGULAR, 2026-11-20T10:00:00Z
        createAndPersistApplication("ACC-APP-1004", "CUS-100", "usr-1", "SAVINGS_REGULAR",
                ApplicationStatus.PENDING_APPROVAL, Instant.parse("2026-11-20T10:00:00Z"));

        // 2. ACC-APP-1003: APPROVED, CUS-100, CURRENT_STANDARD, 2026-11-20T12:00:00Z
        createAndPersistApplication("ACC-APP-1003", "CUS-100", "usr-1", "CURRENT_STANDARD",
                ApplicationStatus.APPROVED, Instant.parse("2026-11-20T12:00:00Z"));

        // 3. ACC-APP-1002: REJECTED, CUS-200, usr-2, SAVINGS_REGULAR, 2026-11-21T08:00:00Z
        createAndPersistApplication("ACC-APP-1002", "CUS-200", "usr-2", "SAVINGS_REGULAR",
                ApplicationStatus.REJECTED, Instant.parse("2026-11-21T08:00:00Z"));

        // 4. ACC-APP-1001: CANCELLED, CUS-200, usr-2, SAVINGS_STUDENT, 2026-11-21T15:00:00Z
        createAndPersistApplication("ACC-APP-1001", "CUS-200", "usr-2", "SAVINGS_STUDENT",
                ApplicationStatus.CANCELLED, Instant.parse("2026-11-21T15:00:00Z"));

        entityManager.flush();
        entityManager.clear();
    }

    private void createAndPersistApplication(String appNumber, String customerId, String identitySubject,
                                             String productCode, ApplicationStatus status, Instant submittedAt) {
        AccountApplication app = new AccountApplication();
        app.setId(UUID.randomUUID());
        app.setApplicationNumber(appNumber);
        app.setCustomerId(customerId);
        app.setIdentitySubject(identitySubject);
        app.setProductId(productId);
        app.setProductCode(productCode);
        app.setInitialFundingAmount(new BigDecimal("5000.00"));
        app.setCurrency("INR");
        app.setApplicationStatus(status);
        app.setSubmittedAt(submittedAt);
        app.setCreatedAt(submittedAt);
        app.setUpdatedAt(submittedAt);
        entityManager.persist(app);
    }

    @Test
    @DisplayName("Scenario 1: No filters provided returns all matching records sorted descending")
    void testNoFiltersProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(4, content.size());
        assertEquals("ACC-APP-1004", content.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1003", content.get(1).getApplicationNumber());
        assertEquals("ACC-APP-1002", content.get(2).getApplicationNumber());
        assertEquals("ACC-APP-1001", content.get(3).getApplicationNumber());
        assertFalse(result.hasNext());
    }

    @Test
    @DisplayName("Scenario 2: Only status provided")
    void testOnlyStatusProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.PENDING_APPROVAL, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(1, content.size());
        assertEquals("ACC-APP-1004", content.get(0).getApplicationNumber());
        assertEquals(ApplicationStatus.PENDING_APPROVAL, content.get(0).getApplicationStatus());
    }

    @Test
    @DisplayName("Scenario 3: Only customer ID provided")
    void testOnlyCustomerIdProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, "CUS-200", null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("ACC-APP-1002", content.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1001", content.get(1).getApplicationNumber());
    }

    @Test
    @DisplayName("Scenario 4: Only product code provided")
    void testOnlyProductCodeProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, "SAVINGS_REGULAR", null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("ACC-APP-1004", content.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1002", content.get(1).getApplicationNumber());
    }

    @Test
    @DisplayName("Scenario 5: Only submittedAtFrom provided (inclusive)")
    void testOnlySubmittedAtFromProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, Instant.parse("2026-11-21T00:00:00Z"), null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("ACC-APP-1002", content.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1001", content.get(1).getApplicationNumber());
    }

    @Test
    @DisplayName("Scenario 6: Only submittedAtTo provided (inclusive)")
    void testOnlySubmittedAtToProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, Instant.parse("2026-11-20T11:00:00Z"), null, PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(1, content.size());
        assertEquals("ACC-APP-1004", content.get(0).getApplicationNumber());
    }

    @Test
    @DisplayName("Scenario 7: Both date filters provided")
    void testBothDateFiltersProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null,
                Instant.parse("2026-11-20T11:00:00Z"),
                Instant.parse("2026-11-21T10:00:00Z"),
                null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(2, content.size());
        assertEquals("ACC-APP-1003", content.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1002", content.get(1).getApplicationNumber());
    }

    @Test
    @DisplayName("Scenario 8: Cursor pagination without other filters")
    void testCursorPaginationWithoutOtherFilters() {
        // Page 1 (limit 2)
        Slice<AccountApplication> page1 = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, null, null, PageRequest.of(0, 2));

        assertNotNull(page1);
        List<AccountApplication> content1 = page1.getContent();
        assertEquals(2, content1.size());
        assertEquals("ACC-APP-1004", content1.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1003", content1.get(1).getApplicationNumber());
        assertTrue(page1.hasNext());

        String cursor = content1.get(content1.size() - 1).getApplicationNumber();
        assertEquals("ACC-APP-1003", cursor);

        // Page 2 (limit 2 with cursor)
        Slice<AccountApplication> page2 = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, null, cursor, PageRequest.of(0, 2));

        assertNotNull(page2);
        List<AccountApplication> content2 = page2.getContent();
        assertEquals(2, content2.size());
        assertEquals("ACC-APP-1002", content2.get(0).getApplicationNumber());
        assertEquals("ACC-APP-1001", content2.get(1).getApplicationNumber());
        assertFalse(page2.hasNext());
    }

    @Test
    @DisplayName("Scenario 9: All filters combined")
    void testAllFiltersCombined() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.PENDING_APPROVAL,
                "CUS-100",
                "SAVINGS_REGULAR",
                Instant.parse("2026-11-20T09:00:00Z"),
                Instant.parse("2026-11-20T11:00:00Z"),
                "ACC-APP-1005",
                PageRequest.of(0, 10));

        assertNotNull(result);
        List<AccountApplication> content = result.getContent();
        assertEquals(1, content.size());
        assertEquals("ACC-APP-1004", content.get(0).getApplicationNumber());
        assertEquals(ApplicationStatus.PENDING_APPROVAL, content.get(0).getApplicationStatus());
        assertEquals("CUS-100", content.get(0).getCustomerId());
        assertEquals("SAVINGS_REGULAR", content.get(0).getProductCode());
    }

    @Test
    @DisplayName("Scenario 10: Empty result set")
    void testEmptyResultSet() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.APPROVED,
                "NON_EXISTENT_CUSTOMER",
                null, null, null, null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().isEmpty());
        assertFalse(result.hasNext());
    }
}
