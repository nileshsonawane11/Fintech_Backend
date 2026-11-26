package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanScheduleVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanScheduleVersionRepository extends JpaRepository<LoanScheduleVersion, UUID> {
    List<LoanScheduleVersion> findByLoanAccountIdOrderByVersionNumberDesc(String loanAccountId);
}
