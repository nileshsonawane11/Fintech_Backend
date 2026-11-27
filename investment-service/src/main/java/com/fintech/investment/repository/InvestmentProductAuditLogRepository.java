package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentProductAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvestmentProductAuditLogRepository extends JpaRepository<InvestmentProductAuditLog, UUID> {
    List<InvestmentProductAuditLog> findByProductIdOrderByCreatedAtDesc(UUID productId);
    List<InvestmentProductAuditLog> findTop100ByOrderByCreatedAtDesc();
}
