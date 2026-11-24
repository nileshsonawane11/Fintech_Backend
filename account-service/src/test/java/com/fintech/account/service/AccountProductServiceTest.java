package com.fintech.account.service;

import com.fintech.account.dto.request.CreateProductRequest;
import com.fintech.account.dto.request.UpdateProductRequest;
import com.fintech.account.dto.response.AccountProductResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountType;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountProductRepository;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountProductServiceTest {

    @Mock
    private AccountProductRepository productRepository;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private AccountProductService productService;

    private AccountProduct testProduct;

    @BeforeEach
    void setUp() {
        testProduct = new AccountProduct();
        testProduct.setId(UUID.randomUUID());
        testProduct.setProductCode("SAVINGS_REGULAR");
        testProduct.setProductName("Regular Savings Account");
        testProduct.setDescription("Standard savings account");
        testProduct.setAccountType(AccountType.SAVINGS);
        testProduct.setCurrency("INR");
        testProduct.setMinimumBalance(new BigDecimal("10000.00"));
        testProduct.setMinimumInitialFunding(new BigDecimal("5000.00"));
        testProduct.setInterestRate(new BigDecimal("3.50"));
        testProduct.setDailyTransferLimit(new BigDecimal("100000.00"));
        testProduct.setMonthlyTransferLimit(new BigDecimal("1000000.00"));
        testProduct.setMinimumAge(18);
        testProduct.setMaximumAge(60);
        testProduct.setActive(true);
        testProduct.setRequiresKyc(true);
        testProduct.setSlug("regular-savings-account");
        testProduct.setCategory("SAVINGS");
        testProduct.setTagline("Everyday Banking");
        testProduct.setStatus("ACTIVE");
        testProduct.setInterestNote("Calculated daily, credited quarterly");
        testProduct.setAmb(Map.of("required", true, "amount", 10000));
        testProduct.setFees(Map.of("maintenanceFee", 0));
        testProduct.setCharges(List.of(Map.of("type", "ATM_WITHDRAWAL", "amount", 20)));
        testProduct.setDocuments(List.of("PAN_CARD", "AADHAAR_CARD"));
        testProduct.setEligibility(List.of("Resident Indian", "Age >= 18"));
        testProduct.setFaqs(List.of(Map.of("question", "What is minimum balance?", "answer", "INR 10,000")));
        testProduct.setFeatures(List.of("Free debit card", "Net banking"));
        testProduct.setHowToApply(List.of("Apply online in 5 minutes"));
        testProduct.setRateSlabs(List.of(Map.of("minBalance", 0, "maxBalance", 100000, "rate", 3.5)));
    }

    // 1. CREATE with only core fields
    @Test
    @DisplayName("1. CREATE product with only core fields generates sensible defaults for slug, category, status")
    void createProduct_withOnlyCoreFields_shouldCreateAndGenerateDefaults() {
        CreateProductRequest request = new CreateProductRequest(
                "SAVINGS_BASIC",
                "Basic Savings Account",
                "Basic account",
                AccountType.SAVINGS,
                "INR",
                new BigDecimal("1000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("3.00"),
                new BigDecimal("25000.00"),
                new BigDecimal("250000.00"),
                18,
                null,
                true,
                true
        );

        when(productRepository.existsByProductCode("SAVINGS_BASIC")).thenReturn(false);
        when(productRepository.existsBySlug(anyString())).thenReturn(false);
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountProductResponse response = productService.createProduct(request, "ADMIN");

        assertNotNull(response);
        assertEquals("SAVINGS_BASIC", response.productCode());
        assertEquals("Basic Savings Account", response.productName());
        assertEquals("basic-savings-account", response.slug());
        assertEquals("SAVINGS", response.category());
        assertEquals("ACTIVE", response.status());
        assertNull(response.tagline());
        assertNull(response.amb());
        assertNull(response.fees());
        assertNull(response.charges());
        verify(auditLogger).logAudit(eq("CREATE_PRODUCT"), eq("AccountProduct"), eq("SAVINGS_BASIC"), any(), any());
    }

    // 2. CREATE with all additional product fields
    @Test
    @DisplayName("2. CREATE product with all additional product fields")
    void createProduct_withAllAdditionalFields_shouldPersistAllFields() {
        Map<String, Object> amb = Map.of("required", true, "amount", 50000);
        Map<String, Object> fees = Map.of("monthlyMaintenance", 150);
        List<Map<String, Object>> charges = List.of(Map.of("code", "IMPS", "charge", 5));
        List<String> docs = List.of("PASSPORT", "DRIVING_LICENSE");
        List<String> eligibility = List.of("Resident", "Age 21-65");
        List<Map<String, Object>> faqs = List.of(Map.of("q", "Can I open joint account?", "a", "Yes"));
        List<String> features = List.of("Unlimited free ATM", "Airport lounge access");
        List<String> howToApply = List.of("Online via video KYC", "Visit branch");
        List<Map<String, Object>> rateSlabs = List.of(Map.of("from", 0, "to", 500000, "rate", 4.0));

        CreateProductRequest request = new CreateProductRequest(
                "SAVINGS_WEALTH",
                "Wealth Savings Account",
                "Exclusive account for HNI customers",
                AccountType.SAVINGS,
                "INR",
                new BigDecimal("50000.00"),
                new BigDecimal("100000.00"),
                new BigDecimal("6.00"),
                new BigDecimal("500000.00"),
                new BigDecimal("5000000.00"),
                21,
                65,
                true,
                true,
                "wealth-savings-account",
                "WEALTH",
                "Banking redfined",
                "ACTIVE",
                "Higher rates for higher balances",
                amb,
                fees,
                charges,
                docs,
                eligibility,
                faqs,
                features,
                howToApply,
                rateSlabs
        );

        when(productRepository.existsByProductCode("SAVINGS_WEALTH")).thenReturn(false);
        when(productRepository.existsBySlug("wealth-savings-account")).thenReturn(false);
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountProductResponse response = productService.createProduct(request, "ADMIN");

        assertNotNull(response);
        assertEquals("SAVINGS_WEALTH", response.productCode());
        assertEquals("wealth-savings-account", response.slug());
        assertEquals("WEALTH", response.category());
        assertEquals("Banking redfined", response.tagline());
        assertEquals("ACTIVE", response.status());
        assertEquals("Higher rates for higher balances", response.interestNote());
        assertEquals(amb, response.amb());
        assertEquals(fees, response.fees());
        assertEquals(charges, response.charges());
        assertEquals(docs, response.documents());
        assertEquals(eligibility, response.eligibility());
        assertEquals(faqs, response.faqs());
        assertEquals(features, response.features());
        assertEquals(howToApply, response.howToApply());
        assertEquals(rateSlabs, response.rateSlabs());
    }

    // 3. JSONB fields are correctly persisted and retrieved
    @Test
    @DisplayName("3. JSONB fields are correctly populated and mapped to entity and response")
    void jsonbFields_persistedAndRetrievedCorrectly() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));

        AccountProductResponse response = productService.getProductDetails("SAVINGS_REGULAR");

        assertNotNull(response.amb());
        assertEquals(10000, response.amb().get("amount"));
        assertNotNull(response.fees());
        assertEquals(0, response.fees().get("maintenanceFee"));
        assertNotNull(response.charges());
        assertEquals(1, response.charges().size());
        assertEquals("ATM_WITHDRAWAL", response.charges().get(0).get("type"));
        assertNotNull(response.documents());
        assertTrue(response.documents().contains("PAN_CARD"));
        assertNotNull(response.eligibility());
        assertEquals(2, response.eligibility().size());
        assertNotNull(response.faqs());
        assertEquals(1, response.faqs().size());
        assertNotNull(response.features());
        assertEquals(2, response.features().size());
        assertNotNull(response.howToApply());
        assertEquals(1, response.howToApply().size());
        assertNotNull(response.rateSlabs());
        assertEquals(1, response.rateSlabs().size());
    }

    // 4. UPDATE of core fields
    @Test
    @DisplayName("4. UPDATE of core fields preserves other attributes and applies changes")
    void updateProduct_coreFields_shouldUpdateCorrectly() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProductRequest updateReq = new UpdateProductRequest(
                "Updated Savings Name",
                "Updated description",
                new BigDecimal("15000.00"),
                new BigDecimal("7500.00"),
                new BigDecimal("4.25"),
                new BigDecimal("200000.00"),
                new BigDecimal("2000000.00"),
                21,
                65,
                false
        );

        AccountProductResponse response = productService.updateProduct("SAVINGS_REGULAR", updateReq, "ADMIN");

        assertNotNull(response);
        assertEquals("Updated Savings Name", response.productName());
        assertEquals("Updated description", response.description());
        assertEquals(new BigDecimal("15000.00"), response.minimumBalance());
        assertEquals(new BigDecimal("7500.00"), response.minimumInitialFunding());
        assertEquals(new BigDecimal("4.25"), response.interestRate());
        assertEquals(new BigDecimal("200000.00"), response.dailyTransferLimit());
        assertEquals(new BigDecimal("2000000.00"), response.monthlyTransferLimit());
        assertEquals(21, response.minimumAge());
        assertEquals(65, response.maximumAge());
        assertFalse(response.requiresKyc());

        // Existing additional fields preserved
        assertEquals("regular-savings-account", response.slug());
        assertEquals("SAVINGS", response.category());
        assertEquals("Everyday Banking", response.tagline());
        assertNotNull(response.amb());
    }

    // 5. UPDATE of JSONB and additional product fields
    @Test
    @DisplayName("5. UPDATE of JSONB and additional product fields")
    void updateProduct_jsonbAndAdditionalFields_shouldUpdateCorrectly() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> newAmb = Map.of("required", false);
        Map<String, Object> newFees = Map.of("annualCardFee", 200);
        List<Map<String, Object>> newCharges = List.of(Map.of("type", "SMS_ALERT", "amount", 15));
        List<String> newDocs = List.of("PASSPORT", "VOTER_ID");
        List<String> newEligibility = List.of("Resident Indian");
        List<Map<String, Object>> newFaqs = List.of(Map.of("q", "How to track?", "a", "Via mobile app"));
        List<String> newFeatures = List.of("5% cashback on debit card");
        List<String> newHowToApply = List.of("Apply online");
        List<Map<String, Object>> newRateSlabs = List.of(Map.of("from", 0, "to", 50000, "rate", 3.0));

        UpdateProductRequest updateReq = new UpdateProductRequest(
                null, null, null, null, null, null, null, null, null, null, null,
                null, "RETAIL_SAVINGS", "Next-gen Digital Account", "ACTIVE", "Interest accrued daily",
                newAmb, newFees, newCharges, newDocs, newEligibility, newFaqs, newFeatures, newHowToApply, newRateSlabs
        );

        AccountProductResponse response = productService.updateProduct("SAVINGS_REGULAR", updateReq, "ADMIN");

        assertNotNull(response);
        // Additional product fields updated
        assertEquals("RETAIL_SAVINGS", response.category());
        assertEquals("Next-gen Digital Account", response.tagline());
        assertEquals("Interest accrued daily", response.interestNote());
        assertEquals(newAmb, response.amb());
        assertEquals(newFees, response.fees());
        assertEquals(newCharges, response.charges());
        assertEquals(newDocs, response.documents());
        assertEquals(newEligibility, response.eligibility());
        assertEquals(newFaqs, response.faqs());
        assertEquals(newFeatures, response.features());
        assertEquals(newHowToApply, response.howToApply());
        assertEquals(newRateSlabs, response.rateSlabs());

        // Core fields preserved
        assertEquals("Regular Savings Account", response.productName());
        assertEquals(new BigDecimal("10000.00"), response.minimumBalance());
        assertEquals(18, response.minimumAge());
    }

    // 6. Partial UPDATE preserves omitted existing values
    @Test
    @DisplayName("6. Partial UPDATE preserves omitted existing values")
    void updateProduct_partialUpdate_shouldPreserveOmittedFields() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        // Update ONLY tagline and interestRate, omitting everything else
        UpdateProductRequest updateReq = new UpdateProductRequest(
                null, null, null, null, new BigDecimal("4.50"),
                null, null, null, null, null, null,
                null, null, "Updated Tagline Only", null, null,
                null, null, null, null, null, null, null, null, null
        );

        AccountProductResponse response = productService.updateProduct("SAVINGS_REGULAR", updateReq, "ADMIN");

        assertEquals(new BigDecimal("4.50"), response.interestRate());
        assertEquals("Updated Tagline Only", response.tagline());

        // Unmodified values are preserved!
        assertEquals("Regular Savings Account", response.productName());
        assertEquals("Standard savings account", response.description());
        assertEquals(new BigDecimal("10000.00"), response.minimumBalance());
        assertEquals(new BigDecimal("5000.00"), response.minimumInitialFunding());
        assertEquals(new BigDecimal("100000.00"), response.dailyTransferLimit());
        assertEquals(new BigDecimal("1000000.00"), response.monthlyTransferLimit());
        assertEquals(18, response.minimumAge());
        assertEquals(60, response.maximumAge());
        assertTrue(response.requiresKyc());
        assertTrue(response.active());
        assertEquals("regular-savings-account", response.slug());
        assertEquals("SAVINGS", response.category());
        assertNotNull(response.amb());
        assertNotNull(response.documents());
    }

    // 7. GET BY ID returns the complete product
    @Test
    @DisplayName("7. GET BY ID returns the complete product including all JSONB fields")
    void getProductDetails_shouldReturnCompleteProduct() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));

        AccountProductResponse response = productService.getProductDetails("SAVINGS_REGULAR");

        assertNotNull(response);
        assertEquals("SAVINGS_REGULAR", response.productCode());
        assertEquals("Regular Savings Account", response.productName());
        assertEquals("regular-savings-account", response.slug());
        assertEquals("SAVINGS", response.category());
        assertEquals("Everyday Banking", response.tagline());
        assertEquals("ACTIVE", response.status());
        assertNotNull(response.amb());
        assertNotNull(response.fees());
        assertNotNull(response.charges());
        assertNotNull(response.documents());
        assertNotNull(response.eligibility());
        assertNotNull(response.faqs());
        assertNotNull(response.features());
        assertNotNull(response.howToApply());
        assertNotNull(response.rateSlabs());
    }

    // 8. GET ALL returns the complete product information
    @Test
    @DisplayName("8. GET ALL returns complete product information for all items")
    void listProducts_shouldReturnAllProductsWithCompleteInformation() {
        when(productRepository.findProductsWithCursor(eq(AccountType.SAVINGS), eq(true), isNull(), any(Pageable.class)))
                .thenReturn(new SliceImpl<>(List.of(testProduct)));

        CursorPagedResponse<AccountProductResponse> result = productService.listProducts(AccountType.SAVINGS, true, null, 20);

        assertNotNull(result);
        assertEquals(1, result.data().size());
        AccountProductResponse item = result.data().get(0);
        assertEquals("SAVINGS_REGULAR", item.productCode());
        assertEquals("regular-savings-account", item.slug());
        assertEquals("SAVINGS", item.category());
        assertNotNull(item.amb());
        assertNotNull(item.features());
        assertNotNull(item.charges());
        assertNotNull(item.rateSlabs());
    }

    // 9. Invalid requests are rejected appropriately
    @Test
    @DisplayName("9. Invalid requests (e.g. maximumAge < minimumAge, duplicate slug, duplicate code) are rejected")
    void invalidRequests_shouldBeRejectedAppropriately() {
        // Test duplicate code on create
        CreateProductRequest dupCodeReq = new CreateProductRequest(
                "SAVINGS_REGULAR", "Name", null, AccountType.SAVINGS, "INR",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                18, null, true, true
        );
        when(productRepository.existsByProductCode("SAVINGS_REGULAR")).thenReturn(true);
        AccountException ex1 = assertThrows(AccountException.class, () -> productService.createProduct(dupCodeReq, "ADMIN"));
        assertEquals(HttpStatus.CONFLICT, ex1.getStatus());

        // Test invalid age range on create (max < min)
        CreateProductRequest invalidAgeReq = new CreateProductRequest(
                "SAVINGS_INVALID_AGE", "Name", null, AccountType.SAVINGS, "INR",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                65, 18, true, true
        );
        when(productRepository.existsByProductCode("SAVINGS_INVALID_AGE")).thenReturn(false);
        AccountException ex2 = assertThrows(AccountException.class, () -> productService.createProduct(invalidAgeReq, "ADMIN"));
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatus());

        // Test duplicate slug on create
        CreateProductRequest dupSlugReq = new CreateProductRequest(
                "SAVINGS_NEW_SLUG", "Name", null, AccountType.SAVINGS, "INR",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                18, null, true, true,
                "existing-slug", null, null, null, null, null, null, null, null, null, null, null, null, null
        );
        when(productRepository.existsByProductCode("SAVINGS_NEW_SLUG")).thenReturn(false);
        when(productRepository.existsBySlug("existing-slug")).thenReturn(true);
        AccountException ex3 = assertThrows(AccountException.class, () -> productService.createProduct(dupSlugReq, "ADMIN"));
        assertEquals(HttpStatus.CONFLICT, ex3.getStatus());

        // Test invalid age range on update (max < min)
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        UpdateProductRequest invalidUpdateAge = new UpdateProductRequest(
                null, null, null, null, null, null, null, 70, 20, null
        );
        AccountException ex4 = assertThrows(AccountException.class, () -> productService.updateProduct("SAVINGS_REGULAR", invalidUpdateAge, "ADMIN"));
        assertEquals(HttpStatus.BAD_REQUEST, ex4.getStatus());

        // Test blank product name on update
        UpdateProductRequest blankNameReq = new UpdateProductRequest(
                "   ", null, null, null, null, null, null, null, null, null
        );
        AccountException ex5 = assertThrows(AccountException.class, () -> productService.updateProduct("SAVINGS_REGULAR", blankNameReq, "ADMIN"));
        assertEquals(HttpStatus.BAD_REQUEST, ex5.getStatus());
    }

    // 10. For update, product must be available in database
    @Test
    @DisplayName("10. UPDATE when product does not exist in database throws RESOURCE_NOT_FOUND (404)")
    void updateProduct_whenNotFound_shouldThrowNotFound() {
        when(productRepository.findByProductCode("NON_EXISTENT")).thenReturn(Optional.empty());

        UpdateProductRequest updateReq = new UpdateProductRequest(
                "New Name", null, null, null, null, null, null, null, null, null
        );

        AccountException ex = assertThrows(AccountException.class,
                () -> productService.updateProduct("NON_EXISTENT", updateReq, "ADMIN"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertTrue(ex.getMessage().contains("NON_EXISTENT"));
    }

    @Test
    @DisplayName("updateProductStatus updates active flag correctly")
    void updateProductStatus_shouldUpdateActiveFlag() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountProductResponse response = productService.updateProductStatus("SAVINGS_REGULAR", false, "ADMIN");

        assertNotNull(response);
        assertFalse(response.active());
        verify(productRepository).save(argThat(p -> !p.isActive()));
    }
}
