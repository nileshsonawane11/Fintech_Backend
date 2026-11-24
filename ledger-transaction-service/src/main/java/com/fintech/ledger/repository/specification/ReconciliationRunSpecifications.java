package com.fintech.ledger.repository.specification;

import com.fintech.ledger.entity.ReconciliationRun;
import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class ReconciliationRunSpecifications {

    private ReconciliationRunSpecifications() {
    }

    public static Specification<ReconciliationRun> withFilters(
            ReconciliationStatus status,
            ReconciliationType reconciliationType,
            Instant fromDate,
            Instant toDate) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (reconciliationType != null) {
                predicates.add(cb.equal(root.get("reconciliationType"), reconciliationType));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startedAt"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("startedAt"), toDate));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
