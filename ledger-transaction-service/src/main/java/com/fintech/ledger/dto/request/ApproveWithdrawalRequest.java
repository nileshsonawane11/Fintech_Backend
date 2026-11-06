package com.fintech.ledger.dto.request;

public record ApproveWithdrawalRequest(
        String remarks,
        String externalPaymentRef
) {}
