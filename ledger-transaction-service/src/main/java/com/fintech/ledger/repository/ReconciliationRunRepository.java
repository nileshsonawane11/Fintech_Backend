package com.fintech.ledger.repository;

import com.fintech.ledger.entity.ReconciliationRun;
import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import com.fintech.ledger.repository.specification.ReconciliationRunSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReconciliationRunRepository extends JpaRepository<ReconciliationRun, UUID>, JpaSpecificationExecutor<ReconciliationRun> {

    Optional<ReconciliationRun> findByReconciliationId(String reconciliationId);

    default Page<ReconciliationRun> searchRuns(
            ReconciliationStatus status,
            ReconciliationType reconciliationType,
            Instant fromDate,
            Instant toDate,
            Pageable pageable
    ) {
        Specification<ReconciliationRun> spec = ReconciliationRunSpecifications.withFilters(
                status, reconciliationType, fromDate, toDate);

        Pageable sortedPageable = (pageable != null && pageable.getSort().isSorted())
                ? pageable
                : PageRequest.of(
                        pageable != null ? pageable.getPageNumber() : 0,
                        pageable != null ? pageable.getPageSize() : 20,
                        Sort.by(Sort.Direction.DESC, "startedAt")
                );

        return findAll(spec, sortedPageable);
    }
}
