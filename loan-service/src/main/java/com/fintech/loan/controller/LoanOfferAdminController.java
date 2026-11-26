package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.request.CreateLoanOfferRequest;
import com.fintech.loan.dto.request.UpdateLoanOfferRequest;
import com.fintech.loan.dto.response.DynamicOfferResponses.DynamicOfferResponse;
import com.fintech.loan.dto.response.DynamicOfferResponses.OfferVersionResponse;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.enums.OfferStatus;
import com.fintech.loan.service.DynamicLoanOfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loans/admin/offers")
@Tag(name = "Admin - Dynamic Loan Offers", description = "Admin endpoints for creating, updating, activating, deactivating, and inspecting versioned loan promotional offers")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class LoanOfferAdminController {

    private final DynamicLoanOfferService offerService;

    public LoanOfferAdminController(DynamicLoanOfferService offerService) {
        this.offerService = offerService;
    }

    @PostMapping
    @Operation(summary = "Create Dynamic Loan Offer")
    public ResponseEntity<DynamicOfferResponse> createOffer(@Valid @RequestBody CreateLoanOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(offerService.createOffer(request, SecurityUtils.getAuthenticatedSubject()));
    }

    @PutMapping("/{idOrCode}")
    @Operation(summary = "Update Dynamic Loan Offer (Creates New Offer Version; Non-Retroactive)")
    public ResponseEntity<DynamicOfferResponse> updateOffer(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateLoanOfferRequest request) {
        return ResponseEntity.ok(offerService.updateOffer(idOrCode, request, SecurityUtils.getAuthenticatedSubject()));
    }

    @PatchMapping("/{idOrCode}/activate")
    @Operation(summary = "Activate Loan Offer")
    public ResponseEntity<DynamicOfferResponse> activateOffer(@PathVariable String idOrCode) {
        return ResponseEntity.ok(offerService.activateOffer(idOrCode, SecurityUtils.getAuthenticatedSubject()));
    }

    @PatchMapping("/{idOrCode}/deactivate")
    @Operation(summary = "Deactivate Loan Offer")
    public ResponseEntity<DynamicOfferResponse> deactivateOffer(@PathVariable String idOrCode) {
        return ResponseEntity.ok(offerService.deactivateOffer(idOrCode, SecurityUtils.getAuthenticatedSubject()));
    }

    @GetMapping("/{idOrCode}")
    @Operation(summary = "Get Loan Offer Details")
    public ResponseEntity<DynamicOfferResponse> getOffer(@PathVariable String idOrCode) {
        return ResponseEntity.ok(offerService.getOffer(idOrCode));
    }

    @GetMapping("/{idOrCode}/versions")
    @Operation(summary = "List Immutable Offer Version History")
    public ResponseEntity<List<OfferVersionResponse>> getOfferVersions(@PathVariable String idOrCode) {
        return ResponseEntity.ok(offerService.getOfferVersions(idOrCode));
    }

    @GetMapping
    @Operation(summary = "List Dynamic Loan Offers")
    public ResponseEntity<PagedResponse<DynamicOfferResponse>> listOffers(
            @RequestParam(required = false) OfferStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(offerService.listAdminOffers(status, search, page, size));
    }
}
