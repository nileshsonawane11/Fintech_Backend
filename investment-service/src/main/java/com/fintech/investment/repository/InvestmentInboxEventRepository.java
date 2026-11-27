package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentInboxEvent;
import com.fintech.investment.entity.InvestmentOpsAlert;
import com.fintech.investment.entity.InvestmentReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvestmentInboxEventRepository extends JpaRepository<InvestmentInboxEvent, String> {
}
