package com.fintech.card.service;

import com.fintech.card.dto.request.CreateCardProductRequest;
import com.fintech.card.dto.request.UpdateCardProductRequest;
import com.fintech.card.dto.response.AdminCardProductResponse;
import com.fintech.card.dto.response.PagedCardProductResponse;
import com.fintech.card.dto.response.PublicCardProductResponse;
import com.fintech.card.entity.CardProduct;
import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import com.fintech.card.exception.CardProductConflictException;
import com.fintech.card.exception.CardProductNotFoundException;
import com.fintech.card.exception.CardProductValidationException;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardProductServiceTest {

    @Mock
    private CardProductRepository productRepository;

    @Mock
    private CardApplicationRepository applicationRepository;

    @InjectMocks
    private CardProductService productService;

    private CardProduct creditProduct;
    private CardProduct debitProduct;
    private CreditCardConfig creditConfig;
    private DebitCardConfig debitConfig;

    @BeforeEach
    void setUp() {
        creditConfig = new CreditCardConfig();
        creditConfig.setCreditLimitMin(new BigDecimal("30000.00"));
        creditConfig.setCreditLimitMax(new BigDecimal("300000.00"));
        creditConfig.setInterestFreePeriodDays(45);
        creditConfig.setFinanceChargeApr(new BigDecimal("39.60"));
        creditConfig.setAtmDailyLimit(new BigDecimal("25000.00"));
        creditConfig.setCashbackOnlinePercentage(new BigDecimal("5.00"));
        creditConfig.setCashbackOnlineMonthlyCap(new BigDecimal("500.00"));
        creditConfig.setCashbackOtherPercentage(new BigDecimal("1.00"));
        creditConfig.setAnnualFeeWaiverSpendThreshold(new BigDecimal("200000.00"));

        creditProduct = new CardProduct();
        creditProduct.setId(UUID.randomUUID());
        creditProduct.setProductCode("EDGE_CASHBACK_CARD");
        creditProduct.setProductName("FinEdge Edge Cashback Credit Card");
        creditProduct.setCardType(CardType.CREDIT);
        creditProduct.setNetwork("RUPAY");
        creditProduct.setJoiningFee(new BigDecimal("499.00"));
        creditProduct.setAnnualFee(new BigDecimal("499.00"));
        creditProduct.setForexMarkupPercentage(new BigDecimal("3.50"));
        creditProduct.setEligibilityMinAge(21);
        creditProduct.setEligibilityMaxAge(65);
        creditProduct.setEligibilityMinMonthlyIncome(new BigDecimal("25000.00"));
        creditProduct.setEligibilityMinCreditScore(720);
        creditProduct.setEligibilityEmploymentTypes(List.of("SALARIED", "SELF_EMPLOYED"));
        creditProduct.setEligibilityMinIncomeHistoryMonths(6);
        creditProduct.setActive(true);
        creditProduct.setDeleted(false);
        creditProduct.setCreditCardConfig(creditConfig);
        creditProduct.setBenefits(List.of(Map.of("title", "5% Cashback", "description", "Online spends")));
        creditProduct.setFeatures(List.of("45 days interest-free"));

        debitConfig = new DebitCardConfig();
        debitConfig.setAtmDailyLimit(new BigDecimal("40000.00"));
        debitConfig.setPosDailyLimit(new BigDecimal("100000.00"));
        debitConfig.setOnlineDailyLimit(new BigDecimal("100000.00"));
        debitConfig.setContactlessTransactionLimit(new BigDecimal("5000.00"));
        debitConfig.setFreeOwnBankAtmWithdrawals(-1);
        debitConfig.setFreeOtherBankAtmTransactions(5);
        debitConfig.setFeeWaiverCustomerCategories(List.of("Payroll Salary", "Campus Student"));

        debitProduct = new CardProduct();
        debitProduct.setId(UUID.randomUUID());
        debitProduct.setProductCode("CLASSIC_DEBIT_CARD");
        debitProduct.setProductName("FinEdge Classic Debit Card");
        debitProduct.setCardType(CardType.DEBIT);
        debitProduct.setNetwork("VISA");
        debitProduct.setJoiningFee(BigDecimal.ZERO);
        debitProduct.setAnnualFee(new BigDecimal("199.00"));
        debitProduct.setForexMarkupPercentage(new BigDecimal("3.50"));
        debitProduct.setEligibilityMinAge(18);
        debitProduct.setEligibilityMaxAge(75);
        debitProduct.setEligibilityMinMonthlyIncome(BigDecimal.ZERO);
        debitProduct.setEligibilityMinCreditScore(0);
        debitProduct.setActive(true);
        debitProduct.setDeleted(false);
        debitProduct.setDebitCardConfig(debitConfig);
    }

    @Test
    @DisplayName("Create credit card product successfully")
    void createCreditCardProduct_Success() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "EDGE_CASHBACK_CARD",
                "FinEdge Edge Cashback Credit Card",
                CardType.CREDIT,
                "RUPAY",
                "Short description",
                "Full description",
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21,
                65,
                new BigDecimal("25000.00"),
                720,
                List.of("SALARIED"),
                6,
                true,
                creditConfig,
                null,
                null,
                null,
                null,
                null
        );

        when(productRepository.existsByProductCode("EDGE_CASHBACK_CARD")).thenReturn(false);
        when(productRepository.save(any(CardProduct.class))).thenAnswer(inv -> {
            CardProduct cp = inv.getArgument(0);
            cp.setId(UUID.randomUUID());
            return cp;
        });

        AdminCardProductResponse response = productService.createProduct(request, "admin_user");

        assertNotNull(response);
        assertEquals("EDGE_CASHBACK_CARD", response.productCode());
        assertEquals(CardType.CREDIT, response.cardType());
        assertEquals("RUPAY", response.network());
        assertEquals(new BigDecimal("499.00"), response.joiningFee());
        assertNotNull(response.creditCardConfig());
        assertNull(response.debitCardConfig());
        assertTrue(response.isActive());
        assertFalse(response.isDeleted());
    }

    @Test
    @DisplayName("Create debit card product successfully")
    void createDebitCardProduct_Success() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "CLASSIC_DEBIT_CARD",
                "FinEdge Classic Debit Card",
                CardType.DEBIT,
                "VISA",
                "Everyday debit card",
                "Full description",
                BigDecimal.ZERO,
                new BigDecimal("199.00"),
                new BigDecimal("3.50"),
                18,
                75,
                BigDecimal.ZERO,
                0,
                List.of("SALARIED", "STUDENT"),
                0,
                true,
                null,
                debitConfig,
                null,
                null,
                null,
                null
        );

        when(productRepository.existsByProductCode("CLASSIC_DEBIT_CARD")).thenReturn(false);
        when(productRepository.save(any(CardProduct.class))).thenAnswer(inv -> {
            CardProduct cp = inv.getArgument(0);
            cp.setId(UUID.randomUUID());
            return cp;
        });

        AdminCardProductResponse response = productService.createProduct(request, "admin_user");

        assertNotNull(response);
        assertEquals("CLASSIC_DEBIT_CARD", response.productCode());
        assertEquals(CardType.DEBIT, response.cardType());
        assertEquals("VISA", response.network());
        assertEquals(BigDecimal.ZERO, response.joiningFee());
        assertNotNull(response.debitCardConfig());
        assertNull(response.creditCardConfig());
    }

    @Test
    @DisplayName("Create product with duplicate code throws conflict exception")
    void createProduct_DuplicateCode_ThrowsConflict() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "EDGE_CASHBACK_CARD",
                "Duplicate Card",
                CardType.CREDIT,
                "RUPAY",
                null, null,
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21, 65,
                new BigDecimal("25000.00"), 720,
                null, 6, true,
                creditConfig, null, null, null, null, null
        );

        when(productRepository.existsByProductCode("EDGE_CASHBACK_CARD")).thenReturn(true);

        assertThrows(CardProductConflictException.class, () ->
                productService.createProduct(request, "admin_user"));
    }

    @Test
    @DisplayName("Create CREDIT product without credit_card_config throws validation exception")
    void createCreditProduct_MissingCreditConfig_ThrowsValidation() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "EDGE_CARD",
                "Edge Card",
                CardType.CREDIT,
                "RUPAY",
                null, null,
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21, 65,
                new BigDecimal("25000.00"), 720,
                null, 6, true,
                null, null, null, null, null, null
        );

        when(productRepository.existsByProductCode("EDGE_CARD")).thenReturn(false);

        assertThrows(CardProductValidationException.class, () ->
                productService.createProduct(request, "admin_user"));
    }

    @Test
    @DisplayName("Create DEBIT product without debit_card_config throws validation exception")
    void createDebitProduct_MissingDebitConfig_ThrowsValidation() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "DEBIT_CARD",
                "Debit Card",
                CardType.DEBIT,
                "VISA",
                null, null,
                BigDecimal.ZERO,
                new BigDecimal("199.00"),
                new BigDecimal("3.50"),
                18, 75,
                BigDecimal.ZERO, 0,
                null, 0, true,
                null, null, null, null, null, null
        );

        when(productRepository.existsByProductCode("DEBIT_CARD")).thenReturn(false);

        assertThrows(CardProductValidationException.class, () ->
                productService.createProduct(request, "admin_user"));
    }

    @Test
    @DisplayName("Create product with invalid age range (maxAge < minAge) throws validation exception")
    void createProduct_InvalidAgeRange_ThrowsValidation() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "EDGE_CARD",
                "Edge Card",
                CardType.CREDIT,
                "RUPAY",
                null, null,
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                25, 20, // max < min
                new BigDecimal("25000.00"), 720,
                null, 6, true,
                creditConfig, null, null, null, null, null
        );

        when(productRepository.existsByProductCode("EDGE_CARD")).thenReturn(false);

        assertThrows(CardProductValidationException.class, () ->
                productService.createProduct(request, "admin_user"));
    }

    @Test
    @DisplayName("Update product successfully")
    void updateProduct_Success() {
        UUID id = creditProduct.getId();
        when(productRepository.findByIdAndIsDeletedFalse(id)).thenReturn(Optional.of(creditProduct));
        when(productRepository.save(any(CardProduct.class))).thenReturn(creditProduct);

        UpdateCardProductRequest updateReq = new UpdateCardProductRequest(
                null,
                "Updated Name",
                null,
                null,
                "Updated short desc",
                null,
                null,
                new BigDecimal("999.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        AdminCardProductResponse response = productService.updateProduct(id, updateReq, "editor_user");

        assertNotNull(response);
        verify(productRepository).save(creditProduct);
        assertEquals("Updated Name", creditProduct.getProductName());
        assertEquals(new BigDecimal("999.00"), creditProduct.getAnnualFee());
    }

    @Test
    @DisplayName("Update product status (activate / deactivate)")
    void updateProductStatus_Success() {
        UUID id = creditProduct.getId();
        when(productRepository.findByIdAndIsDeletedFalse(id)).thenReturn(Optional.of(creditProduct));
        when(productRepository.save(any(CardProduct.class))).thenReturn(creditProduct);

        AdminCardProductResponse response = productService.updateProductStatus(id, false, "admin_user");

        assertNotNull(response);
        assertFalse(creditProduct.isActive());
    }

    @Test
    @DisplayName("Soft delete product sets isDeleted true and isActive false")
    void deleteProduct_Success() {
        UUID id = creditProduct.getId();
        when(productRepository.findByIdAndIsDeletedFalse(id)).thenReturn(Optional.of(creditProduct));
        when(applicationRepository.existsByProductSlugIgnoreCase("EDGE_CASHBACK_CARD")).thenReturn(false);
        when(productRepository.save(any(CardProduct.class))).thenReturn(creditProduct);

        productService.deleteProduct(id, "admin_user");

        assertTrue(creditProduct.isDeleted());
        assertFalse(creditProduct.isActive());
        verify(productRepository).save(creditProduct);
    }

    @Test
    @DisplayName("Soft delete product when active applications exist succeeds safely without deleting data")
    void deleteProduct_WithExistingApplications_SoftDeletesSafely() {
        UUID id = creditProduct.getId();
        when(productRepository.findByIdAndIsDeletedFalse(id)).thenReturn(Optional.of(creditProduct));
        when(applicationRepository.existsByProductSlugIgnoreCase("EDGE_CASHBACK_CARD")).thenReturn(true);
        when(productRepository.save(any(CardProduct.class))).thenReturn(creditProduct);

        productService.deleteProduct(id, "admin_user");

        assertTrue(creditProduct.isDeleted());
        assertFalse(creditProduct.isActive());
        verify(productRepository).save(creditProduct);
    }

    @Test
    @DisplayName("List public active products returns only active non-deleted products without audit info")
    void listPublicActiveProducts_ReturnsCleanList() {
        when(productRepository.findAllByIsActiveTrueAndIsDeletedFalseOrderByProductNameAsc())
                .thenReturn(List.of(creditProduct, debitProduct));

        List<PublicCardProductResponse> list = productService.listPublicActiveProducts(null);

        assertEquals(2, list.size());
        assertEquals("EDGE_CASHBACK_CARD", list.get(0).productCode());
        assertEquals("CLASSIC_DEBIT_CARD", list.get(1).productCode());
    }

    @Test
    @DisplayName("Get public product by code returns active product")
    void getPublicProductByCode_Success() {
        when(productRepository.findByProductCodeAndIsActiveTrueAndIsDeletedFalse("EDGE_CASHBACK_CARD"))
                .thenReturn(Optional.of(creditProduct));

        PublicCardProductResponse response = productService.getPublicProductByCode("edge_cashback_card");

        assertNotNull(response);
        assertEquals("EDGE_CASHBACK_CARD", response.productCode());
        assertEquals("FinEdge Edge Cashback Credit Card", response.productName());
    }

    @Test
    @DisplayName("Get public product by code throws not found when product is inactive or missing")
    void getPublicProductByCode_NotFound() {
        when(productRepository.findByProductCodeAndIsActiveTrueAndIsDeletedFalse("INACTIVE_CARD"))
                .thenReturn(Optional.empty());

        assertThrows(CardProductNotFoundException.class, () ->
                productService.getPublicProductByCode("inactive_card"));
    }

    @Test
    @DisplayName("List admin products returns paged response with filtering")
    void listAdminProducts_Success() {
        when(productRepository.findAdminProducts(eq(CardType.CREDIT), eq(true), eq(false), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(creditProduct)));

        PagedCardProductResponse<AdminCardProductResponse> paged =
                productService.listAdminProducts("CREDIT", true, false, null, 0, 20, "productName", "ASC");

        assertEquals(1, paged.content().size());
        assertEquals("EDGE_CASHBACK_CARD", paged.content().get(0).productCode());
        assertEquals(1, paged.totalElements());
    }
}
