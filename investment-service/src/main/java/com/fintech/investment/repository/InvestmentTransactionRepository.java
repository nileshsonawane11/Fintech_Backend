package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentEnums.TransactionStatus;
import com.fintech.investment.entity.InvestmentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentTransactionRepository extends JpaRepository<InvestmentTransaction, UUID> {
    List<InvestmentTransaction> findByInvestmentIdOrderByCreatedAtDesc(String investmentId);
    List<InvestmentTransaction> findByStatusOrderByCreatedAtDesc(TransactionStatus status);
    Optional<InvestmentTransaction> findByTransactionId(String transactionId);
}
