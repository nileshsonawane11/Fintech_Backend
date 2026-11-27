package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentOpsAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentOpsAlertRepository extends JpaRepository<InvestmentOpsAlert, UUID> {
    Optional<InvestmentOpsAlert> findByAlertId(String alertId);
    List<InvestmentOpsAlert> findByStatusOrderByCreatedAtDesc(String status);
}
