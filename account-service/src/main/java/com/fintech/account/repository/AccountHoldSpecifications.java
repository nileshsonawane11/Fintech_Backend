package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public final class AccountHoldSpecifications {

    private AccountHoldSpecifications() {
    }

    public static Specification<AccountHold> hasAccountId(String accountId) {
        return (root, query, cb) -> (accountId == null || accountId.isBlank())
                ? null : cb.equal(root.get("accountId"), accountId.trim());
    }

    public static Specification<AccountHold> hasStatus(HoldStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("holdStatus"), status);
    }

    public static Specification<AccountHold> hasReasonCode(String reasonCode) {
        return (root, query, cb) -> (reasonCode == null || reasonCode.isBlank())
                ? null : cb.equal(root.get("reasonCode"), reasonCode.trim());
    }

    public static Specification<AccountHold> createdAfterOrAt(Instant fromDate) {
        return (root, query, cb) -> fromDate == null
                ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate);
    }

    public static Specification<AccountHold> createdBeforeOrAt(Instant toDate) {
        return (root, query, cb) -> toDate == null
                ? null : cb.lessThanOrEqualTo(root.get("createdAt"), toDate);
    }

    public static Specification<AccountHold> holdIdLessThan(String cursor) {
        return (root, query, cb) -> (cursor == null || cursor.isBlank())
                ? null : cb.lessThan(root.get("holdId"), cursor.trim());
    }

    public static Specification<AccountHold> withOpsFilters(
            String accountId,
            HoldStatus status,
            String reasonCode,
            Instant fromDate,
            Instant toDate,
            String cursor
    ) {
        return Specification
                .where(hasAccountId(accountId))
                .and(hasStatus(status))
                .and(hasReasonCode(reasonCode))
                .and(createdAfterOrAt(fromDate))
                .and(createdBeforeOrAt(toDate))
                .and(holdIdLessThan(cursor));
    }

    public static Specification<AccountHold> withOpsFilters(
            String accountId,
            String customerId,
            HoldStatus status,
            String reasonCode,
            Instant fromDate,
            Instant toDate,
            String cursor
    ) {
        // customerId is not a column on the AccountHold entity; delegate to supported filters
        return withOpsFilters(accountId, status, reasonCode, fromDate, toDate, cursor);
    }
}
