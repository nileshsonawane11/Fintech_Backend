package com.fintech.ledger.controller;

import com.fintech.ledger.dto.response.BalanceHistoryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.TotalBalanceResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.BalanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@Tag(name = "Balances", description = "Financial balance snapshots, available balance, and historical ledger balances")
@SecurityRequirement(name = "BearerAuth")
public class BalanceController {

    private static final Logger log = LoggerFactory.getLogger(BalanceController.class);
    private final BalanceService balanceService;

    public BalanceController(BalanceService balanceService) {
        this.balanceService = balanceService;
    }

    @GetMapping({"/api/v1/accounts/{accountId}/balance"})
    @Operation(summary = "Get Account Balance", description = "Retrieve live ledger balance and available spendable balance from Ledger Service")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> getAccountBalance(
            @Parameter(description = "Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        BalanceResponse response = balanceService.getAccountBalance(accountId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/accounts/{accountId}/balance-history")
    @Operation(summary = "Get Balance History", description = "Retrieve chronological balance trajectory from immutable ledger entries")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<BalanceHistoryItem>> getBalanceHistory(
            @Parameter(description = "Account ID") @PathVariable String accountId,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        CursorPagedResponse<BalanceHistoryItem> response = balanceService.getBalanceHistory(
                accountId, customerSubject, isOps, fromDate, toDate, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/ledger/total-balance")
    @Operation(summary = "Get Balance of All Accounts", description = "Retrieve Balance of all owned accounts of customer")
    @PreAuthorize("hasAuthority('ACCOUNT_BALANCE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<TotalBalanceResponse> getTotalBalance(
            @AuthenticationPrincipal Jwt jwt
    ){
        String identitySubject = jwt.getSubject();
        log.debug("Called GET /api/v1/accounts/customer/total-balance");
        TotalBalanceResponse totalBalanceResponse = balanceService.getTotalBalance(identitySubject);
        return ResponseEntity.ok(totalBalanceResponse);
    }

    @GetMapping("/ops/api/v1/accounts/{accountId}/balance")
    @Operation(summary = "Get Account Balance (Operations)", description = "Operations endpoint to inspect any account's balance breakdown")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<BalanceResponse> getOpsAccountBalance(
            @Parameter(description = "Account ID") @PathVariable String accountId) {
        BalanceResponse response = balanceService.getAccountBalance(accountId, null, true);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/ops/api/v1/accounts/{accountId}/rebuild-balance", "/ops/api/v1/ledger/accounts/{accountId}/rebuild-balance"})
    @Operation(summary = "Rebuild Balance Projection", description = "Authoritatively recalculate account balance from immutable entries under lock without altering entry records")
    @PreAuthorize("hasAuthority('BALANCE_PROJECTION_REBUILD') or hasRole('ADMIN') or hasRole('MANAGER') or hasRole('OPERATIONS')")
    public ResponseEntity<BalanceResponse> rebuildBalanceProjection(
            @Parameter(description = "Account ID") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        BalanceResponse response = balanceService.rebuildAccountBalanceProjection(accountId, opsUser);
        return ResponseEntity.ok(response);
    }
}