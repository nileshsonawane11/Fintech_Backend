package com.fintech.payment.client.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class LedgerDtos {

    private LedgerDtos() {}

    public record PostingEntryRequest(
            String accountId,
            String entryType,
            BigDecimal amount,
            String narrative,
            String referenceNumber
    ) {}

    public record MultiLinePostingRequest(
            String transactionType,
            String currency,
            String correlationId,
            String narrative,
            String referenceNumber,
            List<PostingEntryRequest> entries
    ) {}

    public record LedgerPostingResponseDto(
            String transactionId,
            String status,
            BigDecimal amount,
            String currency,
            String debitLedgerEntryId,
            String creditLedgerEntryId,
            List<String> entryIds,
            Instant postedAt
    ) {}

    public record ReverseTransactionRequest(
            String reasonCode,
            String remarks
    ) {}

    public record ReversalResponseDto(
            String originalTransactionId,
            String reversalTransactionId,
            String status,
            String reasonCode,
            String remarks,
            String reversedBy,
            Instant reversedAt
    ) {}
}
