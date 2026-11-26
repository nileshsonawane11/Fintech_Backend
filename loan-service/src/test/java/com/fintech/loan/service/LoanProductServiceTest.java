package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.CreateLoanProductRequest;
import com.fintech.loan.dto.request.LoanProductFeeRequest;
import com.fintech.loan.dto.request.UpdateLoanProductRequest;
import com.fintech.loan.dto.response.LoanProductResponses.AdminLoanProductResponse;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProcessingFeeType;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import com.fintech.loan.repository.LoanProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanProductServiceTest {

    @Mock private LoanProductRepository productRepository;
    @Mock private LoanProductFeeRepository feeRepository;
    @Mock private LoanApplicationRepository applicationRepository;
    @Mock private DynamicLoanOfferService offerService;
    @Mock private LoanOutboxService outboxService;
    @Mock private LoanNotificationService notificationService;

    private LoanProductService productService;

    @BeforeEach
    void setUp() {
        productService = new LoanProductService(
                productRepository, feeRepository, applicationRepository,
                offerService, outboxService, notificationService,
                LoanConstants.TOPIC_PRODUCT_CREATED, LoanConstants.TOPIC_PRODUCT_UPDATED
        );
    }

    @Test
    void createProduct_succeedsAndPublishesEventAndAdminNotification() {
        CreateLoanProductRequest req = sampleCreateRequest("HOME_LOAN_PRO");
        when(productRepository.existsByProductCodeIgnoreCase("HOME_LOAN_PRO")).thenReturn(false);
        when(productRepository.save(any(LoanProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(feeRepository.save(any(LoanProductFee.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminLoanProductResponse res = productService.createProduct(req, "admin-1");

        assertEquals("HOME_LOAN_PRO", res.productCode());
        assertEquals(ProductStatus.ACTIVE, res.status());
        assertEquals(new BigDecimal("8.35"), res.minimumInterestRate());
        assertEquals(new BigDecimal("25000.00"), res.feesAndCharges().maximumProcessingFee());
        verify(outboxService).enqueueEvent(eq(LoanConstants.TOPIC_PRODUCT_CREATED), eq("HOME_LOAN_PRO"),
                eq("LOAN_PRODUCT"), eq(LoanConstants.EVT_PRODUCT_CREATED), any());
        verify(notificationService).notifyAdmin(eq("LOAN_PRODUCT_CREATED"), anyString(), anyString(), eq("HOME_LOAN_PRO"));
    }

    @Test
    void createProduct_rejectsDuplicateProductCode() {
        CreateLoanProductRequest req = sampleCreateRequest("HOME_LOAN");
        when(productRepository.existsByProductCodeIgnoreCase("HOME_LOAN")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> productService.createProduct(req, "admin-1"));
        assertEquals("PRODUCT_ALREADY_EXISTS", ex.getCode());
        verify(productRepository, never()).save(any());
    }

    @Test
    void createProduct_rejectsInvalidAmountRange() {
        LoanProductFeeRequest feeReq = new LoanProductFeeRequest(
                ProcessingFeeType.PERCENTAGE, new BigDecimal("0.40"),
                new BigDecimal("5000.00"), new BigDecimal("25000.00"),
                BigDecimal.ZERO, "NIL", BigDecimal.ZERO, "NIL",
                new BigDecimal("2.00"), "2% pm", new BigDecimal("400.00"), Map.of()
        );
        CreateLoanProductRequest req = new CreateLoanProductRequest(
                "BAD_LOAN", "Bad Loan", "short", "detail",
                LoanCategory.HOME, List.of("Purchase"), List.of("SALARIED"), ProductStatus.ACTIVE,
                new BigDecimal("5000000.00"), new BigDecimal("100000.00"),
                new BigDecimal("8.35"), new BigDecimal("10.15"), InterestCalculationMethod.REDUCING_BALANCE,
                60, 360, new BigDecimal("85.00"), new BigDecimal("40000.00"), new BigDecimal("60.00"),
                "INR", true, true, true, true, 60, List.of("PAN"), Map.of(), List.of(), feeReq
        );

        when(productRepository.existsByProductCodeIgnoreCase("BAD_LOAN")).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class, () -> productService.createProduct(req, "admin-1"));
        assertEquals("INVALID_AMOUNT_RANGE", ex.getCode());
    }

    @Test
    void updateAndActivateDeactivateAndSafeSoftDelete() {
        UUID id = UUID.randomUUID();
        LoanProduct existing = new LoanProduct();
        existing.setId(id);
        existing.setProductCode("HOME_LOAN");
        existing.setProductName("FinEdge Home Loan");
        existing.setLoanCategory(LoanCategory.HOME);
        existing.setStatus(ProductStatus.ACTIVE);
        existing.setMinimumLoanAmount(new BigDecimal("500000.00"));
        existing.setMaximumLoanAmount(new BigDecimal("50000000.00"));
        existing.setMinimumInterestRate(new BigDecimal("8.35"));
        existing.setMaximumInterestRate(new BigDecimal("10.15"));
        existing.setMinimumTenureMonths(60);
        existing.setMaximumTenureMonths(360);

        when(productRepository.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));
        when(feeRepository.findByProductId(id)).thenReturn(Optional.of(new LoanProductFee()));
        when(productRepository.save(any(LoanProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.existsByProductCodeIgnoreCase("HOME_LOAN")).thenReturn(true);

        AdminLoanProductResponse deactivated = productService.updateProductStatus(id.toString(), ProductStatus.INACTIVE, "admin-1");
        assertEquals(ProductStatus.INACTIVE, deactivated.status());

        AdminLoanProductResponse updated = productService.updateProduct(id.toString(),
                new UpdateLoanProductRequest("FinEdge Home Loan Updated", null, null, null, null, null,
                        ProductStatus.ACTIVE, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null, null, null, null, null, null),
                "admin-1");
        assertEquals("FinEdge Home Loan Updated", updated.productName());
        assertEquals(ProductStatus.ACTIVE, updated.status());

        // Safe soft delete: product has applications -> marks deleted=true, status=INACTIVE, never calls delete()
        productService.deleteProduct(id.toString(), "admin-1");
        assertTrue(existing.isDeleted());
        assertEquals(ProductStatus.INACTIVE, existing.getStatus());
        verify(productRepository, never()).delete(any(LoanProduct.class));
    }

    @Test
    void findActiveProductOrThrow_rejectsInactiveOrDeletedProduct() {
        when(productRepository.findByProductCodeIgnoreCaseAndStatusAndDeletedFalse("OLD_LOAN", ProductStatus.ACTIVE))
                .thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> productService.findActiveProductOrThrow("OLD_LOAN"));
        assertEquals("PRODUCT_NOT_FOUND", ex.getCode());
    }

    private CreateLoanProductRequest sampleCreateRequest(String code) {
        LoanProductFeeRequest feeReq = new LoanProductFeeRequest(
                ProcessingFeeType.PERCENTAGE, new BigDecimal("0.40"),
                new BigDecimal("5000.00"), new BigDecimal("25000.00"),
                BigDecimal.ZERO, "NIL for floating individual",
                BigDecimal.ZERO, "NIL for floating individual",
                new BigDecimal("2.00"), "2% per month on overdue EMI",
                new BigDecimal("400.00"), Map.of()
        );
        return new CreateLoanProductRequest(
                code, "FinEdge Home Loan Pro", "Home Loan", "Detailed Home Loan",
                LoanCategory.HOME, List.of("Purchase"), List.of("SALARIED"), ProductStatus.ACTIVE,
                new BigDecimal("500000.00"), new BigDecimal("50000000.00"),
                new BigDecimal("8.35"), new BigDecimal("10.15"), InterestCalculationMethod.REDUCING_BALANCE,
                60, 360, new BigDecimal("85.00"), new BigDecimal("40000.00"), new BigDecimal("60.00"),
                "INR", true, true, true, true, 60, List.of("PAN_CARD", "AADHAAR_CARD"),
                Map.of("min_age", 21), List.of(), feeReq
        );
    }
}
