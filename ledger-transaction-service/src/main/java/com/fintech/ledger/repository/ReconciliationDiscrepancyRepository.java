package com.fintech.ledger.repository;

import com.fintech.ledger.entity.ReconciliationDiscrepancy;
import com.fintech.ledger.enums.DiscrepancyStatus;
import com.fintech.ledger.enums.DiscrepancyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReconciliationDiscrepancyRepository extends JpaRepository<ReconciliationDiscrepancy, UUID> {

    @Query("SELECT d FROM ReconciliationDiscrepancy d WHERE " +
           "(:reconciliationId IS NULL OR d.reconciliationRun.reconciliationId = :reconciliationId) AND " +
           "(:accountId IS NULL OR d.ledgerAccount.accountReference = :accountId OR d.ledgerAccount.ledgerAccountId = :accountId) AND " +
           "(:discrepancyType IS NULL OR d.discrepancyType = :discrepancyType) AND " +
           "(:status IS NULL OR d.status = :status) " +
           "ORDER BY d.createdAt DESC")
    Page<ReconciliationDiscrepancy> searchDiscrepancies(
            @Param("reconciliationId") String reconciliationId,
            @Param("accountId") String accountId,
            @Param("discrepancyType") DiscrepancyType discrepancyType,
            @Param("status") DiscrepancyStatus status,
            Pageable pageable
    );
}
