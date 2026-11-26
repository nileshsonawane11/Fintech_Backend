package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanRepaymentAttemptRepository extends JpaRepository<LoanRepaymentAttempt, UUID> {
    List<LoanRepaymentAttempt> findByRepaymentIdOrderByAttemptNumberAsc(String repaymentId);
    int countByRepaymentId(String repaymentId);
    Page<LoanRepaymentAttempt> findAllByOrderByAttemptTimestampDesc(Pageable pageable);
}
