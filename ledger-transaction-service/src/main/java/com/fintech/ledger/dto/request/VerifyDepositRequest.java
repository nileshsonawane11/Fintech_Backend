package com.fintech.ledger.dto.request;

public record VerifyDepositRequest(
        String remarks,
        String externalSettlementRef
) {}
