package com.fintech.ledger.dto.response;

import java.util.List;

public record CursorPagedResponse<T>(
        List<T> data,
        PaginationMetadata pagination
) {
    public record PaginationMetadata(
            String nextCursor,
            boolean hasMore,
            int limit
    ) {}

    public static <T> CursorPagedResponse<T> of(List<T> data, String nextCursor, boolean hasMore, int limit) {
        return new CursorPagedResponse<>(data, new PaginationMetadata(nextCursor, hasMore, limit));
    }
}
