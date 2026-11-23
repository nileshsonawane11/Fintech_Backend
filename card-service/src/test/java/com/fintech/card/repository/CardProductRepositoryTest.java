package com.fintech.card.repository;

import com.fintech.card.entity.CardProduct;
import com.fintech.card.enums.CardType;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.DisplayName.class)
class CardProductRepositoryTest {

    private static final String PG_BIN = "C:\\Program Files\\PostgreSQL\\19\\bin\\pg_ctl.exe";
    private static final String PG_DATA = "C:\\Users\\niles\\.gemini\\antigravity\\brain\\984c6a00-8e90-48e5-b17f-e90846a7b846\\scratch\\pgdata";
    private static final String LOG_FILE = "C:\\Users\\niles\\.gemini\\antigravity\\brain\\984c6a00-8e90-48e5-b17f-e90846a7b846\\scratch\\pg.log";

    private static SessionFactory sessionFactory;
    private static EntityManager entityManager;
    private static CardProductRepository cardProductRepository;

    private static UUID inactiveProductId;
    private static UUID deletedProductId;

    @BeforeAll
    static void setUp() throws Exception {
        Process p = new ProcessBuilder(
                PG_BIN,
                "-D", PG_DATA,
                "-o", "-p 5433",
                "-l", LOG_FILE,
                "start", "-w"
        ).start();
        int exitCode = p.waitFor();
        assertEquals(0, exitCode, "Postgres server should start successfully");

        Map<String, Object> settings = new HashMap<>();
        settings.put("hibernate.connection.driver_class", "org.postgresql.Driver");
        settings.put("hibernate.connection.url", "jdbc:postgresql://localhost:5433/fintech_card");
        settings.put("hibernate.connection.username", "postgres");
        settings.put("hibernate.connection.password", "");
        settings.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        settings.put("hibernate.show_sql", "true");
        settings.put("hibernate.format_sql", "true");

        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySettings(settings)
                .build();

        MetadataSources sources = new MetadataSources(registry);
        sources.addAnnotatedClass(CardProduct.class);

        sessionFactory = sources.buildMetadata().buildSessionFactory();
        entityManager = sessionFactory.createEntityManager();

        JpaRepositoryFactory factory = new JpaRepositoryFactory(entityManager);
        cardProductRepository = factory.getRepository(CardProductRepository.class);

        // Clean up any test records if left over, then seed an inactive product and a deleted product
        entityManager.getTransaction().begin();
        entityManager.createQuery("DELETE FROM CardProduct p WHERE p.productCode IN ('SECURED_CREDIT_CARD', 'OLD_DEBIT_CARD')")
                .executeUpdate();

        inactiveProductId = UUID.randomUUID();
        CardProduct inactiveProduct = new CardProduct();
        inactiveProduct.setId(inactiveProductId);
        inactiveProduct.setProductCode("SECURED_CREDIT_CARD");
        inactiveProduct.setProductName("FinEdge Secured Credit Card");
        inactiveProduct.setCardType(CardType.CREDIT);
        inactiveProduct.setNetwork("VISA");
        inactiveProduct.setJoiningFee(BigDecimal.ZERO);
        inactiveProduct.setAnnualFee(BigDecimal.ZERO);
        inactiveProduct.setForexMarkupPercentage(new BigDecimal("3.50"));
        inactiveProduct.setEligibilityMinAge(18);
        inactiveProduct.setEligibilityMinMonthlyIncome(BigDecimal.ZERO);
        inactiveProduct.setEligibilityMinCreditScore(0);
        inactiveProduct.setEligibilityMinIncomeHistoryMonths(0);
        inactiveProduct.setActive(false);
        inactiveProduct.setDeleted(false);
        inactiveProduct.setCreatedAt(Instant.now());
        inactiveProduct.setUpdatedAt(Instant.now());
        inactiveProduct.setCreatedBy("TEST");
        inactiveProduct.setUpdatedBy("TEST");
        inactiveProduct.setVersion(0L);
        entityManager.persist(inactiveProduct);

        deletedProductId = UUID.randomUUID();
        CardProduct deletedProduct = new CardProduct();
        deletedProduct.setId(deletedProductId);
        deletedProduct.setProductCode("OLD_DEBIT_CARD");
        deletedProduct.setProductName("FinEdge Legacy Debit Card");
        deletedProduct.setCardType(CardType.DEBIT);
        deletedProduct.setNetwork("MASTERCARD");
        deletedProduct.setJoiningFee(BigDecimal.ZERO);
        deletedProduct.setAnnualFee(BigDecimal.ZERO);
        deletedProduct.setForexMarkupPercentage(new BigDecimal("3.50"));
        deletedProduct.setEligibilityMinAge(18);
        deletedProduct.setEligibilityMinMonthlyIncome(BigDecimal.ZERO);
        deletedProduct.setEligibilityMinCreditScore(0);
        deletedProduct.setEligibilityMinIncomeHistoryMonths(0);
        deletedProduct.setActive(false);
        deletedProduct.setDeleted(true);
        deletedProduct.setCreatedAt(Instant.now());
        deletedProduct.setUpdatedAt(Instant.now());
        deletedProduct.setCreatedBy("TEST");
        deletedProduct.setUpdatedBy("TEST");
        deletedProduct.setVersion(0L);
        entityManager.persist(deletedProduct);

        entityManager.getTransaction().commit();
    }

    @AfterAll
    static void tearDown() throws Exception {
        if (entityManager != null && entityManager.isOpen()) {
            try {
                entityManager.getTransaction().begin();
                entityManager.createQuery("DELETE FROM CardProduct p WHERE p.productCode IN ('SECURED_CREDIT_CARD', 'OLD_DEBIT_CARD')")
                        .executeUpdate();
                entityManager.getTransaction().commit();
            } catch (Exception ignored) {
            }
            entityManager.close();
        }
        if (sessionFactory != null && sessionFactory.isOpen()) {
            sessionFactory.close();
        }
        Process p = new ProcessBuilder(
                PG_BIN,
                "-D", PG_DATA,
                "stop", "-m", "fast"
        ).start();
        p.waitFor();
    }

    // Scenario 1: All filters are null
    @Test
    @DisplayName("Scenario 1: All filters are null - returns all active, non-deleted products")
    void testScenario1_AllFiltersNull() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, null, false, null, pageable);

        assertNotNull(page);
        assertEquals(3, page.getTotalElements()); // EDGE_CASHBACK_CARD, CLASSIC_DEBIT_CARD, SECURED_CREDIT_CARD
        assertTrue(page.getContent().stream().noneMatch(CardProduct::isDeleted));
    }

    // Scenario 2: Search keyword is provided
    @Test
    @DisplayName("Scenario 2: Search keyword is provided - filters by product code and name")
    void testScenario2_SearchKeywordProvided() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());

        // Search by part of product name
        Page<CardProduct> byName = cardProductRepository.findAdminProducts(null, null, false, "cashback", pageable);
        assertEquals(1, byName.getTotalElements());
        assertEquals("EDGE_CASHBACK_CARD", byName.getContent().get(0).getProductCode());

        // Search by part of product code
        Page<CardProduct> byCode = cardProductRepository.findAdminProducts(null, null, false, "classic", pageable);
        assertEquals(1, byCode.getTotalElements());
        assertEquals("CLASSIC_DEBIT_CARD", byCode.getContent().get(0).getProductCode());
    }

    // Scenario 3: Search keyword is null
    @Test
    @DisplayName("Scenario 3: Search keyword is null - does not restrict by search")
    void testScenario3_SearchKeywordIsNull() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, null, false, null, pageable);

        assertNotNull(page);
        assertEquals(3, page.getTotalElements());
    }

    // Scenario 4: Card type is provided
    @Test
    @DisplayName("Scenario 4: Card type is provided - filters correctly by CardType")
    void testScenario4_CardTypeProvided() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());

        Page<CardProduct> creditCards = cardProductRepository.findAdminProducts(CardType.CREDIT, null, false, null, pageable);
        assertEquals(2, creditCards.getTotalElements()); // EDGE_CASHBACK_CARD, SECURED_CREDIT_CARD
        assertTrue(creditCards.getContent().stream().allMatch(p -> p.getCardType() == CardType.CREDIT));

        Page<CardProduct> debitCards = cardProductRepository.findAdminProducts(CardType.DEBIT, null, false, null, pageable);
        assertEquals(1, debitCards.getTotalElements()); // CLASSIC_DEBIT_CARD
        assertTrue(debitCards.getContent().stream().allMatch(p -> p.getCardType() == CardType.DEBIT));
    }

    // Scenario 5: Active status is true
    @Test
    @DisplayName("Scenario 5: Active status is true - returns only active products")
    void testScenario5_ActiveStatusTrue() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, true, false, null, pageable);

        assertEquals(2, page.getTotalElements()); // EDGE_CASHBACK_CARD, CLASSIC_DEBIT_CARD
        assertTrue(page.getContent().stream().allMatch(CardProduct::isActive));
    }

    // Scenario 6: Active status is false
    @Test
    @DisplayName("Scenario 6: Active status is false - returns only inactive products")
    void testScenario6_ActiveStatusFalse() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, false, false, null, pageable);

        assertEquals(1, page.getTotalElements()); // SECURED_CREDIT_CARD
        assertFalse(page.getContent().get(0).isActive());
        assertEquals("SECURED_CREDIT_CARD", page.getContent().get(0).getProductCode());
    }

    // Scenario 7: Multiple filters are combined
    @Test
    @DisplayName("Scenario 7: Multiple filters combined - cardType, active, search")
    void testScenario7_MultipleFiltersCombined() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());

        // CREDIT + active=true + search="CASHBACK"
        Page<CardProduct> page = cardProductRepository.findAdminProducts(CardType.CREDIT, true, false, "CASHBACK", pageable);
        assertEquals(1, page.getTotalElements());
        assertEquals("EDGE_CASHBACK_CARD", page.getContent().get(0).getProductCode());

        // CREDIT + active=false + search="SECURED"
        Page<CardProduct> page2 = cardProductRepository.findAdminProducts(CardType.CREDIT, false, false, "SECURED", pageable);
        assertEquals(1, page2.getTotalElements());
        assertEquals("SECURED_CREDIT_CARD", page2.getContent().get(0).getProductCode());

        // DEBIT + active=false -> 0 results (non-deleted)
        Page<CardProduct> page3 = cardProductRepository.findAdminProducts(CardType.DEBIT, false, false, null, pageable);
        assertEquals(0, page3.getTotalElements());
    }

    // Scenario 8: Include-deleted flag is true
    @Test
    @DisplayName("Scenario 8: Include-deleted flag is true - includes soft-deleted products")
    void testScenario8_IncludeDeletedTrue() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, null, true, null, pageable);

        assertEquals(4, page.getTotalElements()); // includes OLD_DEBIT_CARD
        assertTrue(page.getContent().stream().anyMatch(CardProduct::isDeleted));
    }

    // Scenario 9: Include-deleted flag is false
    @Test
    @DisplayName("Scenario 9: Include-deleted flag is false - excludes soft-deleted products")
    void testScenario9_IncludeDeletedFalse() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());
        Page<CardProduct> page = cardProductRepository.findAdminProducts(null, null, false, null, pageable);

        assertEquals(3, page.getTotalElements());
        assertTrue(page.getContent().stream().noneMatch(CardProduct::isDeleted));
    }

    // Scenario 10: Pagination works correctly
    @Test
    @DisplayName("Scenario 10: Pagination works correctly - page size, page number, sorting, total elements")
    void testScenario10_PaginationAndSorting() {
        Pageable page0 = PageRequest.of(0, 2, Sort.by("productName").ascending());
        Page<CardProduct> p0 = cardProductRepository.findAdminProducts(null, null, false, null, page0);

        assertEquals(2, p0.getContent().size());
        assertEquals(3, p0.getTotalElements());
        assertEquals(2, p0.getTotalPages());
        assertTrue(p0.hasNext());

        Pageable page1 = PageRequest.of(1, 2, Sort.by("productName").ascending());
        Page<CardProduct> p1 = cardProductRepository.findAdminProducts(null, null, false, null, page1);

        assertEquals(1, p1.getContent().size());
        assertFalse(p1.hasNext());

        // Verify alphabetical sorting by productName
        List<String> names = p0.getContent().stream().map(CardProduct::getProductName).toList();
        assertTrue(names.get(0).compareTo(names.get(1)) <= 0);
    }

    // Additional: Verify case-insensitive search on both productCode and productName
    @Test
    @DisplayName("Case-insensitivity verification: both productCode and productName match case-insensitively")
    void testCaseInsensitiveSearch() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("productName").ascending());

        // lowercase search matching uppercase productCode
        Page<CardProduct> r1 = cardProductRepository.findAdminProducts(null, null, false, "edge_cashback", pageable);
        assertEquals(1, r1.getTotalElements());
        assertEquals("EDGE_CASHBACK_CARD", r1.getContent().get(0).getProductCode());

        // uppercase search matching mixed-case productName
        Page<CardProduct> r2 = cardProductRepository.findAdminProducts(null, null, false, "FINEDGE CLASSIC", pageable);
        assertEquals(1, r2.getTotalElements());
        assertEquals("CLASSIC_DEBIT_CARD", r2.getContent().get(0).getProductCode());

        // mixed-case search matching productName
        Page<CardProduct> r3 = cardProductRepository.findAdminProducts(null, null, false, "sEcUrEd", pageable);
        assertEquals(1, r3.getTotalElements());
        assertEquals("SECURED_CREDIT_CARD", r3.getContent().get(0).getProductCode());
    }
}
