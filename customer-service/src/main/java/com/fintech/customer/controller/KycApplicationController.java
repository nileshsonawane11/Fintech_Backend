package com.fintech.customer.controller;

import com.fintech.customer.dto.request.KycApplicationRequest;
import com.fintech.customer.dto.response.KycApplicationResponse;
import com.fintech.customer.service.KycApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/me/kyc")
@RequiredArgsConstructor
public class KycApplicationController {

    @SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
    private final KycApplicationService kycApplicationService;

    @PostMapping
    public ResponseEntity<KycApplicationResponse> submitKycApplication(
            Principal principal,
            @Valid @RequestBody KycApplicationRequest request) {

        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.submitApplication(identitySubject, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<KycApplicationResponse> getLatestKycApplication(Principal principal) {
        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.getLatestApplication(identitySubject);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<List<KycApplicationResponse>> getKycApplicationHistory(Principal principal) {
        String identitySubject = principal.getName();
        List<KycApplicationResponse> history = kycApplicationService.getApplicationHistory(identitySubject);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/{kycCaseId}")
    public ResponseEntity<KycApplicationResponse> getKycApplication(
            Principal principal,
            @PathVariable UUID kycCaseId) {

        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.getApplicationById(identitySubject, kycCaseId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{kycCaseId}/cancel")
    public ResponseEntity<Void> cancelKycApplication(
            Principal principal,
            @PathVariable UUID kycCaseId) {

        String identitySubject = principal.getName();
        kycApplicationService.cancelApplication(identitySubject, kycCaseId);
        return ResponseEntity.noContent().build();
    }
}