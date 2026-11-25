package com.fintech.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record CreateIncomingReceiverRequest(
        @NotBlank(message = "FinBank account ID is required")
        @Size(max = 50)
        String finbankAccountId,

        @Size(max = 200)
        String description,

        List<String> receiverTypes,

        Instant closeBy
) {}
