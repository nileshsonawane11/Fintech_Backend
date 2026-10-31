package com.fintech.identity.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/operations")
@PreAuthorize("hasRole('OPERATIONS')")
public class OperationsPortalController {

    @GetMapping("/customers")
    @PreAuthorize("hasAuthority('CUSTOMER_VIEW')")
    public Map<String, Object> viewCustomers() {
        return Map.of(
                "status", "SUCCESS",
                "message", "Customer directory accessed successfully."
        );
    }

    @PostMapping("/kyc/review")
    @PreAuthorize("hasAuthority('KYC_REVIEW')")
    public Map<String, Object> reviewKyc() {
        return Map.of(
                "status", "SUCCESS",
                "message", "KYC review processed successfully."
        );
    }

    @PostMapping("/kyc/approve")
    @PreAuthorize("hasAuthority('KYC_APPROVE')")
    public Map<String, Object> approveKyc() {
        return Map.of(
                "status", "SUCCESS",
                "message", "KYC approved successfully."
        );
    }
}
