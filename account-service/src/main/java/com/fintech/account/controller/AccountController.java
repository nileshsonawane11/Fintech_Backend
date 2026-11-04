package com.fintech.account.controller;

import com.fintech.account.dto.response.AccountDetailResponse;
import com.fintech.account.dto.response.AccountResponse;
import com.fintech.account.dto.response.AccountStatusResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounts")
@Tag(name = "Customer - Accounts", description = "Endpoints for viewing customer bank accounts and balances")
@SecurityRequirement(name = "BearerAuth")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    @Operation(summary = "List My Accounts", description = "List all bank accounts belonging to the authenticated customer")
    @PreAuthorize("hasAuthority('ACCOUNT_READ_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<CursorPagedResponse<AccountResponse>> listMyAccounts(
            @Parameter(description = "Filter by account status") @RequestParam(required = false) AccountStatus status,
            @Parameter(description = "Filter by account type") @RequestParam(required = false) AccountType accountType,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        CursorPagedResponse<AccountResponse> response = accountService.listMyAccounts(identitySubject, status, accountType, cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{accountId}")
    @Operation(summary = "Get Account Details", description = "Get account details and current balance for a customer account")
    @PreAuthorize("hasAuthority('ACCOUNT_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountDetailResponse> getAccountDetails(
            @Parameter(description = "Public Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        AccountDetailResponse response = accountService.getAccountDetails(identitySubject, accountId, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{accountId}/status")
    @Operation(summary = "Get Account Status", description = "Check active lifecycle status of a specific account")
    @PreAuthorize("hasAuthority('ACCOUNT_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountStatusResponse> getAccountStatus(
            @Parameter(description = "Public Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        AccountStatusResponse response = accountService.getAccountStatus(identitySubject, accountId, isOps);
        return ResponseEntity.ok(response);
    }
}
