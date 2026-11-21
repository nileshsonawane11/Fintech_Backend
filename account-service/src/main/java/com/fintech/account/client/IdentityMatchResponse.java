package com.fintech.account.client;

import java.util.UUID;

public record IdentityMatchResponse(
        boolean matched,
        UUID identityId,
        String fullName,
        String mobileNumber,
        String email,
        String status
) {}
