package com.fintech.account.service;

import com.fintech.account.repository.AccountApplicationRepository;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class AccountNumberGenerator {

    private final AccountRepository accountRepository;
    private final AccountApplicationRepository applicationRepository;
    private final AccountHoldRepository holdRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public AccountNumberGenerator(
            AccountRepository accountRepository,
            AccountApplicationRepository applicationRepository,
            AccountHoldRepository holdRepository) {
        this.accountRepository = accountRepository;
        this.applicationRepository = applicationRepository;
        this.holdRepository = holdRepository;
    }

    public String generateAccountId() {
        while (true) {
            long num = 1000L + secureRandom.nextInt(90000);
            String candidate = "ACC-" + num;
            if (!accountRepository.existsByAccountId(candidate)) {
                return candidate;
            }
        }
    }

    public String generateAccountNumber() {
        while (true) {
            long firstPart = 10000000L + secureRandom.nextInt(90000000);
            long secondPart = 10000000L + secureRandom.nextInt(90000000);
            String candidate = String.valueOf(firstPart) + String.valueOf(secondPart);
            if (!accountRepository.existsByAccountNumber(candidate)) {
                return candidate;
            }
        }
    }

    public String generateApplicationNumber() {
        while (true) {
            long num = 100000L + secureRandom.nextInt(900000);
            String candidate = "ACC-APP-" + num;
            if (applicationRepository.findByApplicationNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
    }

    public String generateHoldId() {
        while (true) {
            long num = 100000L + secureRandom.nextInt(900000);
            String candidate = "HOLD-" + num;
            if (holdRepository.findByHoldId(candidate).isEmpty()) {
                return candidate;
            }
        }
    }
}
