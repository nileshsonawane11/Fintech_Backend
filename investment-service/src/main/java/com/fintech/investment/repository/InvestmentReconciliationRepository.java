package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentReconciliationRepository extends JpaRepository<InvestmentReconciliation, UUID> {
    Optional<InvestmentReconciliation> findByReconciliationId(String reconciliationId);
    List<InvestmentReconciliation> findByStatusOrderByCreatedAtDesc(String status);
}
