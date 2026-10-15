package com.fintech.identity.controller;

import com.fintech.identity.dto.request.CreateConsentRequest;
import com.fintech.identity.dto.response.ConsentResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.service.ConsentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/consents")
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping
    public List<ConsentResponse> findAll(
            @AuthenticationPrincipal Jwt jwt
    ) {
        requireAccessToken(jwt);

        return consentService.findAll(customerId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConsentResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateConsentRequest request
    ) {
        requireAccessToken(jwt);

        return consentService.create(customerId(jwt), request);
    }

    private UUID customerId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_ACCESS_TOKEN",
                    "Token subject is invalid."
            );
        }
    }

    private void requireAccessToken(Jwt jwt) {
        if (!"ACCESS".equals(jwt.getClaimAsString("token_use"))) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "ACCESS_TOKEN_REQUIRED",
                    "A full access token is required."
            );
        }
    }
}