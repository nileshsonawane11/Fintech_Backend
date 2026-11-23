package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;

import java.util.List;

@Schema(description = "Paginated response container for card products")
public record PagedCardProductResponse<T>(
        @Schema(description = "List of items on current page")
        List<T> content,

        @Schema(description = "Current page index (0-based)", example = "0")
        int page,

        @Schema(description = "Page size", example = "20")
        int size,

        @Schema(description = "Total number of elements across all pages", example = "42")
        long totalElements,

        @Schema(description = "Total number of pages", example = "3")
        int totalPages,

        @Schema(description = "Whether current page is the first page", example = "true")
        boolean first,

        @Schema(description = "Whether current page is the last page", example = "false")
        boolean last
) {
    public static <T> PagedCardProductResponse<T> of(Page<T> page) {
        return new PagedCardProductResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }
}
