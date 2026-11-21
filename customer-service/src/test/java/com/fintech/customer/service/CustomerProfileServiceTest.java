package com.fintech.customer.service;

import com.fintech.customer.dto.request.ApplicantProfileRequest;
import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.model.CustomerAddress;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.repository.CustomerAddressRepository;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import com.fintech.customer.security.FieldEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerProfileServiceTest {

    @Mock
    private CustomerProfileRepository customerProfileRepository;

    @Mock
    private CustomerAddressRepository customerAddressRepository;

    @Mock
    private KycCaseRepository kycCaseRepository;

    @Mock
    private FieldEncryptionService encryptionService;

    @InjectMocks
    private CustomerProfileService customerProfileService;

    private ApplicantProfileRequest testRequest;

    @BeforeEach
    void setUp() {
        testRequest = new ApplicantProfileRequest(
                "sub-101",
                "Sunita Sharma",
                LocalDate.of(1994, 6, 12),
                "FEMALE",
                "9812345678",
                "sunita@example.com",
                "ABCDE1234F",
                "123456789012",
                "123 MG Road",
                "Suite 4B",
                "Bengaluru",
                "Karnataka",
                "560001",
                "INDIA",
                "RESIDENTIAL",
                "SALARIED",
                "500000_1000000"
        );
    }

    @Test
    @DisplayName("Provision new applicant profile creates profile, address, and KYC case")
    void testProvisionNewApplicantProfile_Success() {
        when(customerProfileRepository.findByIdentitySubject("sub-101")).thenReturn(Optional.empty());
        when(encryptionService.encrypt(any())).thenReturn("encrypted_pan");

        when(customerProfileRepository.save(any(CustomerProfile.class))).thenAnswer(inv -> {
            CustomerProfile p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
        when(customerAddressRepository.findAddressDetailsByCustomerIds(any())).thenReturn(Collections.emptyList());
        when(kycCaseRepository.findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc("sub-101"))
                .thenReturn(Optional.empty());

        CustomerProfileResponse response = customerProfileService.provisionOrUpdateApplicantProfile(testRequest);

        assertNotNull(response);
        assertEquals("Sunita Sharma", response.fullName());
        assertEquals(LocalDate.of(1994, 6, 12), response.dateOfBirth());
        assertEquals("SUBMITTED", response.kycStatus());
        assertEquals("FEMALE", response.gender());

        verify(customerProfileRepository, atLeastOnce()).save(any(CustomerProfile.class));
        verify(customerAddressRepository).save(any(CustomerAddress.class));
        verify(kycCaseRepository).save(any(KycCase.class));
    }

    @Test
    @DisplayName("Provision existing applicant profile preserves APPROVED KYC status")
    void testProvisionExistingApplicantProfile_PreservesApprovedKyc() {
        CustomerProfile existing = CustomerProfile.create("CUS-9999", "sub-101");
        existing.setFullName("Sunita Sharma");
        existing.setDateOfBirth(LocalDate.of(1994, 6, 12));
        existing.setKycStatus("APPROVED");
        existing.setRiskCategory("LOW");

        KycCase approvedCase = KycCase.submitted("KYC-1", existing, "FEMALE", "SALARIED", "500000_1000000", null, true);
        approvedCase.setStatus(KycStatus.APPROVED);

        when(customerProfileRepository.findByIdentitySubject("sub-101")).thenReturn(Optional.of(existing));
        when(customerAddressRepository.findAddressDetailsByCustomerIds(any())).thenReturn(Collections.emptyList());
        when(kycCaseRepository.findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc("sub-101"))
                .thenReturn(Optional.of(approvedCase));

        CustomerProfileResponse response = customerProfileService.provisionOrUpdateApplicantProfile(testRequest);

        assertNotNull(response);
        assertEquals("APPROVED", response.kycStatus());
        assertEquals("CUS-9999", response.customerId());

        // Verify we did NOT submit a new KYC case or downgrade KYC status
        verify(kycCaseRepository, never()).save(any(KycCase.class));
    }
}
