package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentEnums.WithdrawalStatus;
import com.fintech.investment.entity.InvestmentWithdrawalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentWithdrawalRequestRepository extends JpaRepository<InvestmentWithdrawalRequest, UUID> {
    Optional<InvestmentWithdrawalRequest> findByRequestId(String requestId);
    List<InvestmentWithdrawalRequest> findByInvestmentIdOrderByCreatedAtDesc(String investmentId);
    List<InvestmentWithdrawalRequest> findByStatusInOrderByCreatedAtDesc(List<WithdrawalStatus> statuses);
}
