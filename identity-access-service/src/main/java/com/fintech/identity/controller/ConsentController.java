package com.fintech.identity.controller;

import com.fintech.identity.dto.request.CreateConsentRequest;
import com.fintech.identity.dto.response.ConsentResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.service.ConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/consents")
@Tag(name = "Consents", description = "Endpoints for managing customer data privacy and account consents")
@SecurityRequirement(name = "BearerAuth")
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping
    @Operation(summary = "List Consents", description = "Fetch all consents granted or denied by the authenticated customer")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Consents retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized or invalid access token")
    })
    public List<ConsentResponse> findAll(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        requireAccessToken(jwt);

        return consentService.findAll(customerId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record Consent", description = "Create or update customer consent decisions")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Consent recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid consent payload"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ConsentResponse create(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
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
