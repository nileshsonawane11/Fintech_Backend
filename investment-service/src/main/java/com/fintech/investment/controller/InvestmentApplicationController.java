package com.fintech.investment.controller;

import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.service.InvestmentApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/investments/applications")
@Tag(name = "Investment Applications", description = "Customer investment application initiation, document upload, and status tracking")
public class InvestmentApplicationController {

    private final InvestmentApplicationService applicationService;

    public InvestmentApplicationController(InvestmentApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit a new FD, RD, SIP, or SSY investment application (with optional immediate booking)")
    public ApplicationResponse submit(
            @Valid @RequestBody CreateApplicationRequest request,
            @RequestHeader(value = InvestmentConstants.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey) {
        return applicationService.submitApplication(request, idempotencyKey);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List authenticated customer's investment applications")
    public List<ApplicationResponse> myApplications() {
        return applicationService.getMyApplications();
    }
}
