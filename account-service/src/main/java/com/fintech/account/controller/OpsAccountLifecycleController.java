package com.fintech.account.controller;

import com.fintech.account.dto.request.AccountLifecycleRequest;
import com.fintech.account.dto.response.LifecycleHistoryResponse;
import com.fintech.account.service.AccountLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ops/api/v1/accounts")
@Tag(name = "Operations - Account Lifecycle", description = "Operations endpoints for account status transitions: freeze, unfreeze, block, close")
@SecurityRequirement(name = "BearerAuth")
public class OpsAccountLifecycleController {

    private final AccountLifecycleService lifecycleService;

    public OpsAccountLifecycleController(AccountLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @PostMapping("/{accountId}/freeze")
    @Operation(summary = "Freeze Account", description = "Freeze an active account due to risk or suspicious activity")
    @PreAuthorize("hasAuthority('ACCOUNT_FREEZE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> freezeAccount(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Valid @RequestBody AccountLifecycleRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String actor = jwt != null ? jwt.getSubject() : "OPS";
        lifecycleService.freezeAccount(accountId, request, actor);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{accountId}/unfreeze")
    @Operation(summary = "Unfreeze Account", description = "Restore a frozen account back to ACTIVE state")
    @PreAuthorize("hasAuthority('ACCOUNT_UNFREEZE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> unfreezeAccount(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Valid @RequestBody AccountLifecycleRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String actor = jwt != null ? jwt.getSubject() : "OPS";
        lifecycleService.unfreezeAccount(accountId, request, actor);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{accountId}/block")
    @Operation(summary = "Block Account", description = "Permanently or administratively block an account following confirmed fraud")
    @PreAuthorize("hasAuthority('ACCOUNT_BLOCK') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> blockAccount(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Valid @RequestBody AccountLifecycleRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String actor = jwt != null ? jwt.getSubject() : "OPS";
        lifecycleService.blockAccount(accountId, request, actor);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{accountId}/close")
    @Operation(summary = "Close Account", description = "Close an account after verifying zero obligations and holds")
    @PreAuthorize("hasAuthority('ACCOUNT_CLOSE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> closeAccount(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Idempotency key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody AccountLifecycleRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String actor = jwt != null ? jwt.getSubject() : "OPS";
        lifecycleService.closeAccount(accountId, idempotencyKey, request, actor);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{accountId}/lifecycle-history")
    @Operation(summary = "View Account Lifecycle History", description = "Audit trail of every lifecycle status change on an account")
    @PreAuthorize("hasAuthority('ACCOUNT_READ_ALL') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<List<LifecycleHistoryResponse>> getLifecycleHistory(
            @Parameter(description = "Public Account ID") @PathVariable String accountId) {

        List<LifecycleHistoryResponse> history = lifecycleService.getLifecycleHistory(accountId);
        return ResponseEntity.ok(history);
    }
}
