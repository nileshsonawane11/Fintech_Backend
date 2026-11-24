package com.fintech.account.client;

public record IdentityMatchRequest(
        String mobileNumber,
        String email
) {}
