package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.LedgerPostingRequest;
import com.fintech.ledger.dto.request.MultiLinePostingRequest;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerEntryResponse;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.TransactionResponse;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.service.BalanceService;
import com.fintech.ledger.service.LedgerPostingEngine;
import com.fintech.ledger.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/ops/api/v1/ledger", "/internal/api/v1/ledger"})
@Tag(name = "Internal Ledger Postings", description = "Trusted inter-service double-entry accounting posting engine")
@SecurityRequirement(name = "BearerAuth")
public class LedgerPostingController {

    private final LedgerPostingEngine postingEngine;
    private final TransactionService transactionService;
    private final BalanceService balanceService;
    private final LedgerEntryRepository entryRepository;

    public LedgerPostingController(LedgerPostingEngine postingEngine,
                                   TransactionService transactionService,
                                   BalanceService balanceService,
                                   LedgerEntryRepository entryRepository) {
        this.postingEngine = postingEngine;
        this.transactionService = transactionService;
        this.balanceService = balanceService;
        this.entryRepository = entryRepository;
    }

    @PostMapping("/postings")
    @Operation(summary = "Create Ledger Posting", description = "Internal service API to record a balanced two-legged debit/credit posting atomically")
    @PreAuthorize("hasAuthority('LEDGER_POSTING_CREATE') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<LedgerPostingResponse> createPosting(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Parameter(description = "Correlation ID", required = false)
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody LedgerPostingRequest request) {

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem(request.debitAccountId(), EntryType.DEBIT, request.amount(), request.narrative(), request.referenceNumber()),
                new PostingEntryItem(request.creditAccountId(), EntryType.CREDIT, request.amount(), request.narrative(), request.referenceNumber())
        );

        LedgerPostingResponse response = postingEngine.post(
                request.transactionType(),
                request.currency(),
                correlationId != null ? correlationId : request.correlationId(),
                request.narrative(),
                request.referenceNumber(),
                idempotencyKey,
                "INTERNAL_SERVICE",
                "INTERNAL",
                entries
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/postings/batch")
    @Operation(summary = "Create Multi-Line Ledger Posting", description = "Internal service API to post complex multi-legged balanced journals atomically")
    @PreAuthorize("hasAuthority('LEDGER_POSTING_CREATE') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<LedgerPostingResponse> createMultiLinePosting(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Parameter(description = "Correlation ID", required = false)
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody MultiLinePostingRequest request) {

        LedgerPostingResponse response = postingEngine.post(
                request.transactionType(),
                request.currency(),
                correlationId != null ? correlationId : request.correlationId(),
                request.narrative(),
                request.referenceNumber(),
                idempotencyKey,
                "INTERNAL_SERVICE",
                "INTERNAL",
                request.entries()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/transactions/{transactionId}")
    @Operation(summary = "Get Ledger Transaction", description = "Internal service API to inspect transaction posting status and ledger entry IDs")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<TransactionResponse> getLedgerTransaction(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId) {

        TransactionResponse response = transactionService.getTransactionDetails(transactionId, null, true);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/accounts/{accountId}/entries")
    @Operation(summary = "Get Account Entries", description = "Operations and internal service API to retrieve immutable debits and credits posted to an account")
    @PreAuthorize("hasAuthority('LEDGER_ACCOUNT_READ_INTERNAL') or hasAuthority('LEDGER_ACCOUNT_READ') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN') or hasRole('OPERATIONS') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<LedgerEntryResponse>> getLedgerAccountEntries(
            @Parameter(description = "Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "50") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<LedgerEntryResponse> response = transactionService.getAccountEntries(
                accountId, fromDate, toDate, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/accounts/{accountId}/balance")
    @Operation(summary = "Get Account Balance (Internal)", description = "Internal service API to inspect accounting balance and snapshot metadata")
    @PreAuthorize("hasAuthority('LEDGER_BALANCE_READ_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> getLedgerAccountBalance(
            @Parameter(description = "Account ID") @PathVariable String accountId) {

        BalanceResponse response = balanceService.getAccountBalance(accountId, null, true);
        return ResponseEntity.ok(response);
    }
}
