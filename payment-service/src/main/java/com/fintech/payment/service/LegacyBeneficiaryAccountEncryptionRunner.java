package com.fintech.payment.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class LegacyBeneficiaryAccountEncryptionRunner implements ApplicationRunner {

    private final BeneficiaryService beneficiaryService;

    public LegacyBeneficiaryAccountEncryptionRunner(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @Override
    public void run(ApplicationArguments args) {
        int page = 0;
        while (beneficiaryService.encryptLegacyAccountNumbers(page)) {
            page++;
        }
    }
}
