package com.fintech.payment.repository;

import com.fintech.payment.entity.ReconciliationRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReconciliationRecordRepository extends JpaRepository<ReconciliationRecord, String> {

    Optional<ReconciliationRecord> findByReconciliationId(String reconciliationId);

    Page<ReconciliationRecord> findByResolutionStatusOrderByCreatedAtDesc(String resolutionStatus, Pageable pageable);

    Page<ReconciliationRecord> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
