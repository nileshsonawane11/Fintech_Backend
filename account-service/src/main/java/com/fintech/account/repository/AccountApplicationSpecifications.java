package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public final class AccountApplicationSpecifications {

    private AccountApplicationSpecifications() {
    }

    public static Specification<AccountApplication> hasStatus(ApplicationStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("applicationStatus"), status);
    }

    public static Specification<AccountApplication> hasCustomerId(String customerId) {
        return (root, query, cb) -> (customerId == null || customerId.isBlank())
                ? null : cb.equal(root.get("customerId"), customerId.trim());
    }

    public static Specification<AccountApplication> hasProductCode(String productCode) {
        return (root, query, cb) -> (productCode == null || productCode.isBlank())
                ? null : cb.equal(root.get("productCode"), productCode.trim());
    }

    public static Specification<AccountApplication> submittedAfterOrAt(Instant fromDate) {
        return (root, query, cb) -> fromDate == null
                ? null : cb.greaterThanOrEqualTo(root.get("submittedAt"), fromDate);
    }

    public static Specification<AccountApplication> submittedBeforeOrAt(Instant toDate) {
        return (root, query, cb) -> toDate == null
                ? null : cb.lessThanOrEqualTo(root.get("submittedAt"), toDate);
    }

    public static Specification<AccountApplication> applicationNumberLessThan(String cursor) {
        return (root, query, cb) -> (cursor == null || cursor.isBlank())
                ? null : cb.lessThan(root.get("applicationNumber"), cursor.trim());
    }

    public static Specification<AccountApplication> withOpsFilters(
            ApplicationStatus status,
            String customerId,
            String productCode,
            Instant fromDate,
            Instant toDate,
            String cursor
    ) {
        return Specification
                .where(hasStatus(status))
                .and(hasCustomerId(customerId))
                .and(hasProductCode(productCode))
                .and(submittedAfterOrAt(fromDate))
                .and(submittedBeforeOrAt(toDate))
                .and(applicationNumberLessThan(cursor));
    }
}
