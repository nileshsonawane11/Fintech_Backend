package com.fintech.payment.controller;

import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
import com.fintech.payment.service.BeneficiaryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @PostMapping
    public ResponseEntity<BeneficiaryResponse> addBeneficiary(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddBeneficiaryRequest request) {

        String userId = jwt.getSubject();
        BeneficiaryResponse response =
                beneficiaryService.addBeneficiary(userId, request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}