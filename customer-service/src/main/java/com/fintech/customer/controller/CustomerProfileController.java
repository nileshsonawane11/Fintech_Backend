package com.fintech.customer.controller;

import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.service.CustomerProfileService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerProfileController {

    private final CustomerProfileService customerService;

    public CustomerProfileController(CustomerProfileService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/me")
    public ResponseEntity<CustomerProfileResponse> getMyProfile(
            @AuthenticationPrincipal Jwt jwt) {

        CustomerProfileResponse response =
                customerService.getMyProfile(jwt.getSubject());

        return ResponseEntity.ok(response);
    }
}