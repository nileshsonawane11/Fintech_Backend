package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request payload for updating the active/inactive status of a card product")
public record CardProductStatusRequest(
        @NotNull(message = "Active flag is required")
        @Schema(description = "True to activate product, false to deactivate", example = "true")
        Boolean active
) {
}
