package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanApplicationHistoryRepository extends JpaRepository<LoanApplicationHistory, UUID> {

    List<LoanApplicationHistory> findByLoanApplicationIdOrderByChangedAtAsc(String loanApplicationId);
}
