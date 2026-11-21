package com.fintech.account.client;

public record ApplicantIdentityRequest(
        String fullName,
        String mobileNumber,
        String email
) {}
