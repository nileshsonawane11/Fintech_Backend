package com.fintech.payment.dto.response;

import java.time.Instant;

public record IncomingReceiverResponse(
        String receiverId,
        String finbankAccountId,
        String vaStatus,
        String virtualAccountNumber,
        String virtualIfsc,
        String virtualBankName,
        String virtualAccountName,
        String virtualVpa,
        String description,
        Instant closeBy,
        Instant createdAt
) {}
