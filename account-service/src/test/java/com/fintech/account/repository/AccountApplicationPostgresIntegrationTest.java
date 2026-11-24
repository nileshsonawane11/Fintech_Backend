package com.fintech.account.repository;

import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.service.AccountApplicationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/fintech_account",
        "spring.datasource.username=postgres",
        "spring.datasource.password=root",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=false"
})
@Transactional
class AccountApplicationPostgresIntegrationTest {

    @Autowired
    private AccountApplicationRepository applicationRepository;

    @Autowired
    private AccountApplicationService applicationService;

    @PersistenceContext
    private EntityManager entityManager;

    private static final UUID PRODUCT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        // ACC-APP-PG-1004: PENDING_APPROVAL, CUS-PG-100, SAVINGS_REGULAR, 2026-11-20T10:00:00Z
        createAndPersist("ACC-APP-PG-1004", "CUS-PG-100", "usr-pg-1", "SAVINGS_REGULAR",
                ApplicationStatus.PENDING_APPROVAL, Instant.parse("2026-11-20T10:00:00Z"));

        // ACC-APP-PG-1003: APPROVED, CUS-PG-100, SAVINGS_REGULAR, 2026-11-20T12:00:00Z
        createAndPersist("ACC-APP-PG-1003", "CUS-PG-100", "usr-pg-1", "SAVINGS_REGULAR",
                ApplicationStatus.APPROVED, Instant.parse("2026-11-20T12:00:00Z"));

        // ACC-APP-PG-1002: REJECTED, CUS-PG-200, SAVINGS_REGULAR, 2026-11-21T08:00:00Z
        createAndPersist("ACC-APP-PG-1002", "CUS-PG-200", "usr-pg-2", "SAVINGS_REGULAR",
                ApplicationStatus.REJECTED, Instant.parse("2026-11-21T08:00:00Z"));

        // ACC-APP-PG-1001: CANCELLED, CUS-PG-200, CURRENT_STANDARD, 2026-11-21T15:00:00Z
        createAndPersist("ACC-APP-PG-1001", "CUS-PG-200", "usr-pg-2", "CURRENT_STANDARD",
                ApplicationStatus.CANCELLED, Instant.parse("2026-11-21T15:00:00Z"));

        entityManager.flush();
    }

    private void createAndPersist(String appNumber, String customerId, String identitySubject,
                                  String productCode, ApplicationStatus status, Instant submittedAt) {
        AccountApplication app = new AccountApplication();
        app.setId(UUID.randomUUID());
        app.setApplicationNumber(appNumber);
        app.setCustomerId(customerId);
        app.setIdentitySubject(identitySubject);
        app.setProductId(PRODUCT_ID);
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
    @DisplayName("PostgreSQL Scenario 1: No filters provided (reproduces previously failing $7 query)")
    void testPostgres_NoFiltersProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertFalse(result.getContent().isEmpty());
    }

    @Test
    @DisplayName("PostgreSQL Scenario 2: Only status provided")
    void testPostgres_OnlyStatusProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.PENDING_APPROVAL, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().stream().allMatch(a -> a.getApplicationStatus() == ApplicationStatus.PENDING_APPROVAL));
    }

    @Test
    @DisplayName("PostgreSQL Scenario 3: Only customer ID provided")
    void testPostgres_OnlyCustomerIdProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, "CUS-PG-200", null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(2, result.getContent().size());
        assertEquals("ACC-APP-PG-1002", result.getContent().get(0).getApplicationNumber());
        assertEquals("ACC-APP-PG-1001", result.getContent().get(1).getApplicationNumber());
    }

    @Test
    @DisplayName("PostgreSQL Scenario 4: Only product code provided")
    void testPostgres_OnlyProductCodeProvided() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, "CURRENT_STANDARD", null, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().stream().allMatch(a -> "CURRENT_STANDARD".equals(a.getProductCode())));
    }

    @Test
    @DisplayName("PostgreSQL Scenario 5: Only submittedAtFrom provided (without $7 type inference error)")
    void testPostgres_OnlySubmittedAtFromProvided() {
        Instant from = Instant.parse("2026-11-21T00:00:00Z");
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, from, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().stream().allMatch(a -> !a.getSubmittedAt().isBefore(from)));
    }

    @Test
    @DisplayName("PostgreSQL Scenario 6: Only submittedAtTo provided")
    void testPostgres_OnlySubmittedAtToProvided() {
        Instant to = Instant.parse("2026-11-20T11:00:00Z");
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, null, to, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().stream().allMatch(a -> !a.getSubmittedAt().isAfter(to)));
    }

    @Test
    @DisplayName("PostgreSQL Scenario 7: Both date filters provided")
    void testPostgres_BothDateFiltersProvided() {
        Instant from = Instant.parse("2026-11-20T11:00:00Z");
        Instant to = Instant.parse("2026-11-21T10:00:00Z");
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                null, null, null, from, to, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().stream().allMatch(a -> !a.getSubmittedAt().isBefore(from) && !a.getSubmittedAt().isAfter(to)));
    }

    @Test
    @DisplayName("PostgreSQL Scenario 8: Cursor pagination without other filters")
    void testPostgres_CursorPaginationWithoutOtherFilters() {
        Slice<AccountApplication> page1 = applicationRepository.findOpsApplicationsWithCursor(
                null, "CUS-PG-100", null, null, null, null, PageRequest.of(0, 1));

        assertNotNull(page1);
        assertEquals(1, page1.getContent().size());
        assertEquals("ACC-APP-PG-1004", page1.getContent().get(0).getApplicationNumber());
        assertTrue(page1.hasNext());

        Slice<AccountApplication> page2 = applicationRepository.findOpsApplicationsWithCursor(
                null, "CUS-PG-100", null, null, null, "ACC-APP-PG-1004", PageRequest.of(0, 1));

        assertNotNull(page2);
        assertEquals(1, page2.getContent().size());
        assertEquals("ACC-APP-PG-1003", page2.getContent().get(0).getApplicationNumber());
        assertFalse(page2.hasNext());
    }

    @Test
    @DisplayName("PostgreSQL Scenario 9: All filters combined")
    void testPostgres_AllFiltersCombined() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.PENDING_APPROVAL,
                "CUS-PG-100",
                "SAVINGS_REGULAR",
                Instant.parse("2026-11-20T09:00:00Z"),
                Instant.parse("2026-11-20T11:00:00Z"),
                "ACC-APP-PG-1005",
                PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("ACC-APP-PG-1004", result.getContent().get(0).getApplicationNumber());
    }

    @Test
    @DisplayName("PostgreSQL Scenario 10: Empty result set")
    void testPostgres_EmptyResultSet() {
        Slice<AccountApplication> result = applicationRepository.findOpsApplicationsWithCursor(
                ApplicationStatus.APPROVED,
                "NON_EXISTENT_POSTGRES_CUSTOMER",
                null, null, null, null,
                PageRequest.of(0, 10));

        assertNotNull(result);
        assertTrue(result.getContent().isEmpty());
        assertFalse(result.hasNext());
    }

    @Test
    @DisplayName("PostgreSQL Service call: listOpsApplications with cursor response")
    void testPostgres_ServiceListOpsApplications() {
        CursorPagedResponse<AccountApplicationResponse> response = applicationService.listOpsApplications(
                null, "CUS-PG-200", null, null, null, null, 1);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertEquals("ACC-APP-PG-1002", response.data().get(0).accountApplicationId());
        assertTrue(response.pagination().hasMore());
        assertEquals("ACC-APP-PG-1002", response.pagination().nextCursor());

        CursorPagedResponse<AccountApplicationResponse> page2 = applicationService.listOpsApplications(
                null, "CUS-PG-200", null, null, null, response.pagination().nextCursor(), 1);

        assertNotNull(page2);
        assertEquals(1, page2.data().size());
        assertEquals("ACC-APP-PG-1001", page2.data().get(0).accountApplicationId());
        assertFalse(page2.pagination().hasMore());
        assertNull(page2.pagination().nextCursor());
    }
}
