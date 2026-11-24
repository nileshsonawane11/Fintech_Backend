package com.fintech.account.controller;

import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.dto.response.InternalAccountResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.service.AccountHoldService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/api/v1/accounts")
@Tag(name = "Internal Account Verification", description = "Internal service APIs for inter-service account validation and eligibility verification")
public class InternalAccountController {

    private final AccountRepository accountRepository;
    private final AccountHoldService holdService;

    public InternalAccountController(AccountRepository accountRepository, AccountHoldService holdService) {
        this.accountRepository = accountRepository;
        this.holdService = holdService;
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

    @GetMapping("/{accountId}/holds")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Account Holds (Internal)",
            description = "Retrieves active or all holds placed on a specific account for internal service processing")
    public ResponseEntity<CursorPagedResponse<AccountHoldResponse>> getAccountHolds(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Filter by hold status") @RequestParam(required = false) HoldStatus status,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "100") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountHoldResponse> response = holdService.listAccountHolds(accountId, status, cursor, limit);
        return ResponseEntity.ok(response);
    }
}
