package com.Fintech.userservice.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserServiceRequest(

    @NotBlank(message = "Mobile number is required")
    @Pattern(
            regexp = "^[0-9]{10}$",
            message = "Mobile number must contain exactly 10 digits"
    )
    String mobileNumber,

    @NotBlank(message = "Email is required")
    @Email(message = "Email address is invalid")
    @Size(max = 254, message = "Email must not exceed 254 characters")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 12, max = 128,
            message = "Password must contain between 12 and 128 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S+$",
            message = "Password must contain uppercase, lowercase, numeric and special characters"
    )
    String password,

    @NotBlank(message = "Accepted terms version is required")
    @Size(max = 50)
    String acceptedTermsVersion,

    boolean marketingConsent
){}