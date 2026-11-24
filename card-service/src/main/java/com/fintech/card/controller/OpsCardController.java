package com.fintech.card.controller;

import com.fintech.card.dto.request.ApproveCardApplicationRequest;
import com.fintech.card.dto.request.RejectCardApplicationRequest;
import com.fintech.card.dto.response.OpsCardApplicationResponse;
import com.fintech.card.service.CardApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ops/api/v1/cards")
@Tag(name = "Card Operations (Staff / Manager)", description = "APIs for operations staff, branch managers, and underwriters to review, approve, and decline card applications")
@SecurityRequirement(name = "BearerAuth")
public class OpsCardController {

    private final CardApplicationService cardApplicationService;

    public OpsCardController(CardApplicationService cardApplicationService) {
        this.cardApplicationService = cardApplicationService;
    }

    @GetMapping("/applications")
    @Operation(summary = "List Card Applications Queue",
            description = "Retrieves all pending and historical card applications for back-office and underwriter review.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Applications queue retrieved successfully",
                    content = @Content(schema = @Schema(implementation = OpsCardApplicationResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires staff operations permissions")
    })
    public ResponseEntity<List<OpsCardApplicationResponse>> getApplications() {
        List<OpsCardApplicationResponse> list = cardApplicationService.getAllApplications();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/applications/{cardApplicationId}/approve")
    @Operation(summary = "Approve Card Application",
            description = "Sanctions credit limit and automatically issues the active physical/virtual card.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application approved and card issued",
                    content = @Content(schema = @Schema(implementation = OpsCardApplicationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Application not found"),
            @ApiResponse(responseCode = "409", description = "Application already approved / card already issued"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<OpsCardApplicationResponse> approveApplication(
            @Parameter(description = "Card application identifier", example = "CARD-APP-400123")
            @PathVariable String cardApplicationId,
            @RequestBody(required = false) ApproveCardApplicationRequest request) {
        if (request == null) {
            request = new ApproveCardApplicationRequest();
        }
        OpsCardApplicationResponse response = cardApplicationService.approveApplication(cardApplicationId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/applications/{cardApplicationId}/reject")
    @Operation(summary = "Decline Card Application",
            description = "Declines a card application with underwriting audit remarks.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Application declined successfully",
                    content = @Content(schema = @Schema(implementation = OpsCardApplicationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Application not found"),
            @ApiResponse(responseCode = "409", description = "Application already decided"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<OpsCardApplicationResponse> rejectApplication(
            @Parameter(description = "Card application identifier", example = "CARD-APP-400123")
            @PathVariable String cardApplicationId,
            @RequestBody(required = false) RejectCardApplicationRequest request) {
        if (request == null) {
            request = new RejectCardApplicationRequest();
        }
        OpsCardApplicationResponse response = cardApplicationService.rejectApplication(cardApplicationId, request);
        return ResponseEntity.ok(response);
    }
}
