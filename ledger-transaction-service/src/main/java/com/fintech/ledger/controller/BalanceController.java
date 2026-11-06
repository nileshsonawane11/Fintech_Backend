package com.fintech.ledger.controller;

import com.fintech.ledger.dto.response.BalanceHistoryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.BalanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@Tag(name = "Balances", description = "Financial balance snapshots, available balance, and historical ledger balances")
@SecurityRequirement(name = "BearerAuth")
public class BalanceController {

    private final BalanceService balanceService;

    public BalanceController(BalanceService balanceService) {
        this.balanceService = balanceService;
    }

    @GetMapping({"/api/v1/accounts/{accountId}/balance", "/api/v1/balances/{accountId}"})
    @Operation(summary = "Get Account Balance", description = "Retrieve live ledger balance, hold reservations, and available spendable balance")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> getAccountBalance(
            @Parameter(description = "Account Reference or Public Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        BalanceResponse response = balanceService.getAccountBalance(accountId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/accounts/{accountId}/balance-history")
    @Operation(summary = "Get Balance History", description = "Retrieve chronological balance trajectory from immutable ledger entries")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<BalanceHistoryItem>> getBalanceHistory(
            @Parameter(description = "Account Reference or Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        CursorPagedResponse<BalanceHistoryItem> response = balanceService.getBalanceHistory(
                accountId, customerSubject, isOps, fromDate, toDate, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/accounts/balances")
    @Operation(summary = "Get Multiple Account Balances", description = "Retrieve balances for all accounts belonging to the authenticated customer")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<List<BalanceResponse>> getMyBalances(@AuthenticationPrincipal Jwt jwt) {
        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        List<BalanceResponse> responses = balanceService.getMyAccountBalances(customerSubject);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/ops/api/v1/accounts/{accountId}/balance")
    @Operation(summary = "Get Account Balance (Operations)", description = "Operations endpoint to inspect any account's balance breakdown")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<BalanceResponse> getOpsAccountBalance(
            @Parameter(description = "Account Reference or Ledger Account ID") @PathVariable String accountId) {
        BalanceResponse response = balanceService.getAccountBalance(accountId, null, true);
        return ResponseEntity.ok(response);
    }
}
