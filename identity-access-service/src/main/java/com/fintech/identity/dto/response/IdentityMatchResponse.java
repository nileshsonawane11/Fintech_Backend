package com.fintech.identity.dto.response;

import java.util.UUID;

public record IdentityMatchResponse(
        boolean matched,
        UUID identityId,
        String fullName,
        String mobileNumber,
        String email,
        String status
) {
    public static IdentityMatchResponse noMatch() {
        return new IdentityMatchResponse(false, null, null, null, null, null);
    }

    public static IdentityMatchResponse matched(UUID id, String name, String mobile, String email, String status) {
        return new IdentityMatchResponse(true, id, name, mobile, email, status);
    }
}
