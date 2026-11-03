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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.util.List;
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
        testProduct.setAccountType(AccountType.SAVINGS);
        testProduct.setCurrency("INR");
        testProduct.setMinimumBalance(new BigDecimal("10000.00"));
        testProduct.setMinimumInitialFunding(new BigDecimal("5000.00"));
        testProduct.setInterestRate(new BigDecimal("3.50"));
        testProduct.setDailyTransferLimit(new BigDecimal("100000.00"));
        testProduct.setMonthlyTransferLimit(new BigDecimal("1000000.00"));
        testProduct.setMinimumAge(18);
        testProduct.setActive(true);
        testProduct.setRequiresKyc(true);
    }

    @Test
    void listProducts_shouldReturnPagedResponse() {
        when(productRepository.findProductsWithCursor(eq(AccountType.SAVINGS), eq(true), isNull(), any(Pageable.class)))
                .thenReturn(new SliceImpl<>(List.of(testProduct)));

        CursorPagedResponse<AccountProductResponse> result = productService.listProducts(AccountType.SAVINGS, true, null, 20);

        assertNotNull(result);
        assertEquals(1, result.data().size());
        assertEquals("SAVINGS_REGULAR", result.data().get(0).productCode());
        assertFalse(result.pagination().hasMore());
    }

    @Test
    void getProductDetails_whenExists_shouldReturnProduct() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));

        AccountProductResponse response = productService.getProductDetails("SAVINGS_REGULAR");

        assertNotNull(response);
        assertEquals("SAVINGS_REGULAR", response.productCode());
        assertEquals("Regular Savings Account", response.productName());
    }

    @Test
    void getProductDetails_whenNotFound_shouldThrowNotFound() {
        when(productRepository.findByProductCode("UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(AccountException.class, () -> productService.getProductDetails("UNKNOWN"));
    }

    @Test
    void createProduct_whenValid_shouldCreateProduct() {
        CreateProductRequest request = new CreateProductRequest(
                "SAVINGS_NEW",
                "New Savings",
                "Description",
                AccountType.SAVINGS,
                "INR",
                new BigDecimal("5000.00"),
                new BigDecimal("2000.00"),
                new BigDecimal("4.00"),
                new BigDecimal("50000.00"),
                new BigDecimal("500000.00"),
                18,
                null,
                true,
                true
        );

        when(productRepository.existsByProductCode("SAVINGS_NEW")).thenReturn(false);
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountProductResponse response = productService.createProduct(request, "ADMIN");

        assertNotNull(response);
        assertEquals("SAVINGS_NEW", response.productCode());
        verify(auditLogger).logAudit(eq("CREATE_PRODUCT"), eq("AccountProduct"), eq("SAVINGS_NEW"), any(), any());
    }

    @Test
    void createProduct_whenDuplicateCode_shouldThrowConflict() {
        CreateProductRequest request = new CreateProductRequest(
                "SAVINGS_REGULAR",
                "Regular Savings",
                null,
                AccountType.SAVINGS,
                "INR",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                18,
                null,
                true,
                true
        );

        when(productRepository.existsByProductCode("SAVINGS_REGULAR")).thenReturn(true);

        assertThrows(AccountException.class, () -> productService.createProduct(request, "ADMIN"));
    }

    @Test
    void updateProductStatus_shouldUpdateActiveFlag() {
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(AccountProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountProductResponse response = productService.updateProductStatus("SAVINGS_REGULAR", false, "ADMIN");

        assertNotNull(response);
        assertFalse(response.active());
        verify(productRepository).save(argThat(p -> !p.isActive()));
    }
}
