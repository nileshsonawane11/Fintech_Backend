package com.Fintech.userservice.dto;

import java.util.UUID;

public record CustomerServiceResponse (
    UUID Id,
    String mobileNumber,
    String email
){}