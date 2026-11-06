package com.fintech.ledger.controller;

import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerAccountResponse;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.BalanceService;
import com.fintech.ledger.service.LedgerAccountAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/ops/api/v1/ledger/accounts")
@Tag(name = "Ledger Accounts", description = "Chart of accounts, operational ledger accounts, lifecycle management, and balance projection rebuilding")
@SecurityRequirement(name = "BearerAuth")
public class LedgerAccountController {

    private final LedgerAccountAdminService adminService;
    private final BalanceService balanceService;

    public LedgerAccountController(LedgerAccountAdminService adminService,
                                   BalanceService balanceService) {
        this.adminService = adminService;
        this.balanceService = balanceService;
    }

    @GetMapping
    @Operation(summary = "List Ledger Accounts", description = "Operations query across all chart of accounts, internal bank accounts, and customer deposit ledger accounts")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<LedgerAccountResponse>> listLedgerAccounts(
            @Parameter(description = "Filter by account type") @RequestParam(required = false) AccountType accountType,
            @Parameter(description = "Filter by account subtype") @RequestParam(required = false) AccountSubtype accountSubtype,
            @Parameter(description = "Filter by account status") @RequestParam(required = false) AccountStatus status,
            @Parameter(description = "Filter by currency") @RequestParam(required = false) String currency,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) UUID customerId,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<LedgerAccountResponse> response = adminService.listLedgerAccounts(
                accountType, accountSubtype, status, currency, customerId, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{ledgerAccountId}")
    @Operation(summary = "Get Ledger Account Details", description = "Retrieve ledger account metadata, normal balance, and snapshot balances")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<LedgerAccountResponse> getLedgerAccountDetails(
            @Parameter(description = "Ledger Account ID or Bank Account Reference") @PathVariable String ledgerAccountId) {

        LedgerAccountResponse response = adminService.getLedgerAccountDetails(ledgerAccountId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{ledgerAccountId}/freeze")
    @Operation(summary = "Freeze Ledger Account", description = "Prevent any postings from debiting or crediting this ledger account")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_FREEZE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<LedgerAccountResponse> freezeLedgerAccount(
            @Parameter(description = "Ledger Account ID") @PathVariable String ledgerAccountId,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        LedgerAccountResponse response = adminService.freezeLedgerAccount(ledgerAccountId, opsUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{ledgerAccountId}/unfreeze")
    @Operation(summary = "Unfreeze Ledger Account", description = "Restore active status to a previously frozen ledger account")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_MANAGE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<LedgerAccountResponse> unfreezeLedgerAccount(
            @Parameter(description = "Ledger Account ID") @PathVariable String ledgerAccountId,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        LedgerAccountResponse response = adminService.unfreezeLedgerAccount(ledgerAccountId, opsUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{ledgerAccountId}/close")
    @Operation(summary = "Close Ledger Account", description = "Close a ledger account after verifying zero financial balance and zero active holds")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_MANAGE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<LedgerAccountResponse> closeLedgerAccount(
            @Parameter(description = "Ledger Account ID") @PathVariable String ledgerAccountId,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        LedgerAccountResponse response = adminService.closeLedgerAccount(ledgerAccountId, opsUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{ledgerAccountId}/rebuild-balance")
    @Operation(summary = "Rebuild Balance Projection", description = "Authoritatively recalculate account balance from immutable entries under lock without altering entry records")
    @PreAuthorize("hasAuthority('BALANCE_PROJECTION_REBUILD') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<BalanceResponse> rebuildBalanceProjection(
            @Parameter(description = "Ledger Account ID") @PathVariable String ledgerAccountId,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        BalanceResponse response = balanceService.rebuildAccountBalanceProjection(ledgerAccountId, opsUser);
        return ResponseEntity.ok(response);
    }
}
