package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanRepaymentAllocationRepository extends JpaRepository<LoanRepaymentAllocation, UUID> {
    List<LoanRepaymentAllocation> findByRepaymentId(String repaymentId);
    List<LoanRepaymentAllocation> findByLoanAccountIdOrderByCreatedAtDesc(String loanAccountId);
}
