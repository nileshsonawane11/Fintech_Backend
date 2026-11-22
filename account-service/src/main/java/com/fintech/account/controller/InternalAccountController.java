package com.fintech.account.controller;

import com.fintech.account.dto.response.InternalAccountResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/api/v1/accounts")
@Tag(name = "Internal Account Verification", description = "Internal service APIs for inter-service account validation and eligibility verification")
public class InternalAccountController {

    private final AccountRepository accountRepository;

    public InternalAccountController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @GetMapping("/{accountId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Account Verification Info (Internal)",
            description = "Retrieves customer ownership, account type, and active status for an account ID")
    public ResponseEntity<InternalAccountResponse> getAccountById(@PathVariable String accountId) {
        Account account = accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));

        InternalAccountResponse response = new InternalAccountResponse(
                account.getAccountId(),
                SecurityUtils.maskAccountNumber(account.getAccountNumber()),
                account.getCustomerId(),
                account.getIdentitySubject(),
                account.getAccountType(),
                account.getProductCode(),
                account.getAccountStatus(),
                account.getCurrency(),
                account.getOpenedAt()
        );

        return ResponseEntity.ok(response);
    }
}
