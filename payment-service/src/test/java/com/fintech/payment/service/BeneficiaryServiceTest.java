package com.fintech.payment.service;

import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.request.AddUpiBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
import com.fintech.payment.dto.response.BeneficiaryValidationResponse;
import com.fintech.payment.entity.Beneficiary;
import com.fintech.payment.entity.BeneficiaryValidation;
import com.fintech.payment.entity.ProviderContact;
import com.fintech.payment.entity.ProviderFundAccount;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.repository.BeneficiaryRepository;
import com.fintech.payment.repository.BeneficiaryValidationRepository;
import com.fintech.payment.repository.ProviderContactRepository;
import com.fintech.payment.repository.ProviderFundAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BeneficiaryServiceTest {

    private static final String AES_KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Mock private BeneficiaryRepository beneficiaryRepository;
    @Mock private BeneficiaryValidationRepository validationRepository;
    @Mock private ProviderContactRepository contactRepository;
    @Mock private ProviderFundAccountRepository fundAccountRepository;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private PayoutProvider payoutProvider;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    private PaymentPiiEncryptionService encryptionService;
    private BeneficiaryService beneficiaryService;
    private CustomerProfileDto approvedCustomer;

    @BeforeEach
    void setUp() {
        encryptionService = new PaymentPiiEncryptionService(AES_KEY, "test-salt");
        RazorpayProperties props = new RazorpayProperties();
        beneficiaryService = new BeneficiaryService(
                beneficiaryRepository, validationRepository, contactRepository, fundAccountRepository,
                encryptionService, customerServiceClient, payoutProvider, props,
                outboxService, auditService, new BigDecimal("0.65"), false);
        approvedCustomer = new CustomerProfileDto(
                "CUS-1001", "Aarav Sharma", LocalDate.of(1995, 5, 10),
                "+919876543210", "aarav@example.com", "ABCDE1234F", "APPROVED", "LOW", Instant.now(), "MALE");
    }

    @Test
    void addsBankBeneficiaryWithEncryptedAccountAndHash() {
        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.existsByUserIdAndAccountNumberHashAndIfscCodeAndStatusNot(
                eq("user-1"), anyString(), eq("HDFC0001234"), eq("INACTIVE"))).thenReturn(false);

        AddBeneficiaryRequest req = new AddBeneficiaryRequest();
        req.setNickname("Priya Savings");
        req.setBeneficiaryName("Priya Verma");
        req.setAccountNumber("123456789012");
        req.setConfirmAccountNumber("123456789012");
        req.setIfscCode("hdfc0001234");
        req.setBankName("HDFC Bank");

        BeneficiaryResponse response = beneficiaryService.addBeneficiary("user-1", req);

        assertEquals("PENDING_VALIDATION", response.getStatus());
        assertEquals("**********9012", response.getMaskedAccountNumber());
        verify(beneficiaryRepository).save(argThat(b ->
                encryptionService.isEncrypted(b.getAccountNumber())
                        && b.getAccountNumberHash() != null
                        && "HDFC0001234".equals(b.getIfscCode())));
        verify(outboxService).enqueueEvent(any(), any(), any(), eq("BeneficiaryCreated"), any(), any(), any());
    }

    @Test
    void rejectsDuplicateBankBeneficiary() {
        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.existsByUserIdAndAccountNumberHashAndIfscCodeAndStatusNot(
                eq("user-1"), anyString(), eq("HDFC0001234"), eq("INACTIVE"))).thenReturn(true);

        AddBeneficiaryRequest req = new AddBeneficiaryRequest();
        req.setNickname("Priya");
        req.setBeneficiaryName("Priya Verma");
        req.setAccountNumber("123456789012");
        req.setIfscCode("HDFC0001234");
        req.setBankName("HDFC Bank");

        ApiException ex = assertThrows(ApiException.class, () -> beneficiaryService.addBeneficiary("user-1", req));
        assertEquals("DUPLICATE_BENEFICIARY", ex.getCode());
        assertEquals(409, ex.getStatus().value());
    }

    @Test
    void addsUpiBeneficiaryInPendingValidationState() {
        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.existsByUserIdAndVpaHashAndStatusNot(eq("user-1"), anyString(), eq("INACTIVE")))
                .thenReturn(false);

        BeneficiaryResponse res = beneficiaryService.addUpiBeneficiary("user-1",
                new AddUpiBeneficiaryRequest("Priya.Verma@okaxis", "Priya Verma", "Priya UPI", null, null));

        assertEquals("UPI", res.getBeneficiaryType());
        assertEquals("PENDING_VALIDATION", res.getStatus());
        assertEquals("pr***@okaxis", res.getMaskedVpa());
    }

    @Test
    void validatesBankBeneficiarySuccessfullyWithNameMatch() {
        Beneficiary b = createBankBeneficiary("user-1");
        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.findByBeneficiaryIdAndUserId("BEN-1", "user-1")).thenReturn(Optional.of(b));
        when(payoutProvider.isValidationAvailable()).thenReturn(true);
        when(payoutProvider.providerName()).thenReturn("RAZORPAYX");
        when(contactRepository.findByProviderNameAndOwnerTypeAndOwnerRef(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(payoutProvider.createContact(any())).thenReturn(new ContactResult("cont_1", "Priya Verma", "customer"));
        when(fundAccountRepository.findByProviderNameAndBeneficiaryId(any(), any())).thenReturn(Optional.empty());
        when(payoutProvider.createBankFundAccount(any()))
                .thenReturn(new FundAccountResult("fa_1", "cont_1", "bank_account", true));
        when(payoutProvider.validateFundAccount(any())).thenReturn(new ValidationResult(
                "fav_1", "fa_1", "completed", "active", "PRIYA VERMA", "UTR123", null, null, null));

        BeneficiaryValidationResponse result = beneficiaryService.validateBeneficiary("user-1", "BEN-1");

        assertEquals("VERIFIED", result.status());
        assertEquals("VERIFIED", b.getStatus());
        verify(outboxService).enqueueEvent(any(), eq("BEN-1"), any(), eq("BeneficiaryVerified"), any(), any(), any());
    }

    @Test
    void rejectsBeneficiaryValidationOnNameMismatch() {
        Beneficiary b = createBankBeneficiary("user-1");
        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.findByBeneficiaryIdAndUserId("BEN-1", "user-1")).thenReturn(Optional.of(b));
        when(payoutProvider.isValidationAvailable()).thenReturn(true);
        when(payoutProvider.providerName()).thenReturn("RAZORPAYX");

        ProviderContact existingContact = new ProviderContact();
        existingContact.setProviderContactId("cont_1");
        when(contactRepository.findByProviderNameAndOwnerTypeAndOwnerRef(any(), any(), any()))
                .thenReturn(Optional.of(existingContact));
        ProviderFundAccount existingFa = new ProviderFundAccount();
        existingFa.setProviderFundAccountId("fa_1");
        when(fundAccountRepository.findByProviderNameAndBeneficiaryId(any(), any()))
                .thenReturn(Optional.of(existingFa));
        when(payoutProvider.validateFundAccount(any())).thenReturn(new ValidationResult(
                "fav_2", "fa_1", "completed", "active", "COMPLETELY DIFFERENT PERSON", "UTR124", null, null, null));

        BeneficiaryValidationResponse result = beneficiaryService.validateBeneficiary("user-1", "BEN-1");

        assertEquals("REJECTED", result.status());
        assertEquals("NAME_MISMATCH", result.failureReason());
        assertEquals("REJECTED", b.getStatus());
    }

    @Test
    void failsUpiValidationWhenVpaInvalid() {
        Beneficiary b = new Beneficiary();
        b.setBeneficiaryId("BEN-UPI-1");
        b.setUserId("user-1");
        b.setCustomerId("CUS-1001");
        b.setBeneficiaryType("UPI");
        b.setBeneficiaryName("Priya Verma");
        b.setVpaEncrypted(encryptionService.encrypt("bad@upi"));
        b.setStatus("PENDING_VALIDATION");
        b.setVerificationStatus("INITIATED");

        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(approvedCustomer);
        when(beneficiaryRepository.findByBeneficiaryIdAndUserId("BEN-UPI-1", "user-1")).thenReturn(Optional.of(b));
        when(payoutProvider.isValidationAvailable()).thenReturn(true);
        when(payoutProvider.providerName()).thenReturn("RAZORPAYX");
        when(contactRepository.findByProviderNameAndOwnerTypeAndOwnerRef(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(payoutProvider.createContact(any())).thenReturn(new ContactResult("cont_2", "Priya Verma", "customer"));
        when(fundAccountRepository.findByProviderNameAndBeneficiaryId(any(), any())).thenReturn(Optional.empty());
        when(payoutProvider.createVpaFundAccount(any()))
                .thenReturn(new FundAccountResult("fa_upi_1", "cont_2", "vpa", true));
        when(payoutProvider.validateFundAccount(any())).thenReturn(new ValidationResult(
                "fav_upi_1", "fa_upi_1", "failed", "invalid", "", null, "beneficiary_bank",
                "vpa_not_found", "The VPA does not exist or is inactive"));

        BeneficiaryValidationResponse result = beneficiaryService.validateBeneficiary("user-1", "BEN-UPI-1");

        assertEquals("FAILED", result.status());
        assertEquals("vpa_not_found", result.failureReason());
        assertEquals("FAILED", b.getStatus());
    }

    @Test
    void preventsCrossCustomerBeneficiaryAccess() {
        when(beneficiaryRepository.findByBeneficiaryIdAndUserId("BEN-1", "other-user")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> beneficiaryService.getBeneficiary("other-user", "BEN-1"));
        assertEquals("BENEFICIARY_NOT_FOUND", ex.getCode());
        assertEquals(404, ex.getStatus().value());
    }

    private Beneficiary createBankBeneficiary(String userId) {
        Beneficiary b = new Beneficiary();
        b.setBeneficiaryId("BEN-1");
        b.setUserId(userId);
        b.setCustomerId("CUS-1001");
        b.setBeneficiaryType("BANK_ACCOUNT");
        b.setBeneficiaryName("Priya Verma");
        b.setAccountNumber(encryptionService.encrypt("123456789012"));
        b.setIfscCode("HDFC0001234");
        b.setBankName("HDFC Bank");
        b.setStatus("PENDING_VALIDATION");
        b.setVerificationStatus("INITIATED");
        return b;
    }
}
