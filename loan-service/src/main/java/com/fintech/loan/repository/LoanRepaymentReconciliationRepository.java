package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentReconciliation;
import com.fintech.loan.enums.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanRepaymentReconciliationRepository extends JpaRepository<LoanRepaymentReconciliation, UUID> {
    Optional<LoanRepaymentReconciliation> findByReconciliationId(String reconciliationId);
    Optional<LoanRepaymentReconciliation> findByReferenceIdAndStatusIn(String referenceId, Collection<ReconciliationStatus> statuses);
    Page<LoanRepaymentReconciliation> findByStatusOrderByCreatedAtDesc(ReconciliationStatus status, Pageable pageable);
    Page<LoanRepaymentReconciliation> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<LoanRepaymentReconciliation> findByStatusIn(Collection<ReconciliationStatus> statuses);
}
