package com.fintech.account.dto.response;

import com.fintech.account.enums.NomineeRelationship;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AccountNomineeResponse(
        UUID nomineeId,
        String accountId,
        String fullName,
        NomineeRelationship relationship,
        LocalDate dateOfBirth,
        String mobileNumber,
        Integer allocationPercentage,
        Instant createdAt
) {}
