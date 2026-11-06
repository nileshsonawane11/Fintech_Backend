package com.fintech.ledger.repository;

import com.fintech.ledger.entity.ReconciliationRun;
import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReconciliationRunRepository extends JpaRepository<ReconciliationRun, UUID> {

    Optional<ReconciliationRun> findByReconciliationId(String reconciliationId);

    @Query("SELECT r FROM ReconciliationRun r WHERE " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:reconciliationType IS NULL OR r.reconciliationType = :reconciliationType) AND " +
           "(:fromDate IS NULL OR r.startedAt >= :fromDate) AND " +
           "(:toDate IS NULL OR r.startedAt <= :toDate) " +
           "ORDER BY r.startedAt DESC")
    Page<ReconciliationRun> searchRuns(
            @Param("status") ReconciliationStatus status,
            @Param("reconciliationType") ReconciliationType reconciliationType,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );
}
