package com.fintech.identity.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/customer")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerPortalController {

    @GetMapping("/account")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW')")
    public Map<String, Object> getCustomerAccount() {
        return Map.of(
                "status", "SUCCESS",
                "message", "Customer account accessed successfully."
        );
    }
}
