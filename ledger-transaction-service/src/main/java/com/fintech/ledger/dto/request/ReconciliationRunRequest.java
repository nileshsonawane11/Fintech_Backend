package com.fintech.ledger.dto.request;

import com.fintech.ledger.enums.ReconciliationType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ReconciliationRunRequest(
        @NotNull(message = "Reconciliation type is required")
        ReconciliationType reconciliationType,

        LocalDate fromDate,

        LocalDate toDate
) {}
