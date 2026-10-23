package com.fintech.payment.service;

import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
import com.fintech.payment.entity.Beneficiary;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.BeneficiaryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.UUID;

@Service
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final PaymentPiiEncryptionService piiEncryptionService;

    public BeneficiaryService(BeneficiaryRepository beneficiaryRepository,
                              PaymentPiiEncryptionService piiEncryptionService) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.piiEncryptionService = piiEncryptionService;
    }

    public BeneficiaryResponse addBeneficiary(String userId, AddBeneficiaryRequest request) {
        String beneficiaryId = "BEN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId(beneficiaryId);
        beneficiary.setUserId(userId);
        beneficiary.setNickname(request.getNickname());
        beneficiary.setBeneficiaryName(request.getBeneficiaryName());
        beneficiary.setAccountNumber(piiEncryptionService.encrypt(request.getAccountNumber()));
        beneficiary.setIfscCode(request.getIfscCode());
        beneficiary.setBankName(request.getBankName());
        beneficiary.setStatus("PENDING_VERIFICATION");
        beneficiary.setVerificationStatus("INITIATED");

        beneficiaryRepository.save(beneficiary);

        String masked = maskAccountNumber(request.getAccountNumber());

        BeneficiaryResponse response = new BeneficiaryResponse();
        response.setBeneficiaryId(beneficiaryId);
        response.setStatus("PENDING_VERIFICATION");
        response.setMaskedAccountNumber(masked);
        response.setVerificationStatus("INITIATED");
        return response;
    }

    @Transactional
    public boolean encryptLegacyAccountNumbers(int pageNumber) {
        Page<Beneficiary> page = beneficiaryRepository.findAll(
                PageRequest.of(pageNumber, 200, Sort.by(Sort.Direction.ASC, "id")));
        boolean hasPlaintext = page.getContent().stream()
                .anyMatch(beneficiary -> !piiEncryptionService.isEncrypted(beneficiary.getAccountNumber()));
        if (hasPlaintext && !piiEncryptionService.isConfigured()) {
            throw new IllegalStateException(
                    "PAYMENT_PII_ENCRYPTION_KEY is required to encrypt existing beneficiary account numbers");
        }
        page.getContent().stream()
                .filter(beneficiary -> !piiEncryptionService.isEncrypted(beneficiary.getAccountNumber()))
                .forEach(beneficiary -> beneficiary.setAccountNumber(
                        piiEncryptionService.encrypt(beneficiary.getAccountNumber())));
        beneficiaryRepository.saveAll(page.getContent());
        return page.hasNext();
    }

    public Beneficiary findActiveBeneficiary(String userId, String beneficiaryId) {
        return beneficiaryRepository.findByBeneficiaryIdAndUserId(beneficiaryId, userId)
                .filter(b -> "ACTIVE".equals(b.getStatus()))
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "BENEFICIARY_NOT_ACTIVE", "The beneficiary is not active for transfers"));
    }

    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4) return "****";
        String last4 = accountNumber.substring(accountNumber.length() - 4);
        return "**********" + last4;
    }
}
