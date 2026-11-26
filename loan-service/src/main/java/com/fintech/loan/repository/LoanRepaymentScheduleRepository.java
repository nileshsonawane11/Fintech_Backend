package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanRepaymentScheduleRepository extends JpaRepository<LoanRepaymentSchedule, UUID> {

    List<LoanRepaymentSchedule> findByLoanAccountIdOrderByInstallmentNumberAsc(String loanAccountId);
}
