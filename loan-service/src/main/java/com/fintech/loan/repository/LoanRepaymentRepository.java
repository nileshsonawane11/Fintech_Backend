package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepayment;
import com.fintech.loan.enums.RepaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, UUID> {
    Optional<LoanRepayment> findByRepaymentId(String repaymentId);
    Optional<LoanRepayment> findByRepaymentReference(String repaymentReference);
    Optional<LoanRepayment> findByIdempotencyKey(String idempotencyKey);
    Optional<LoanRepayment> findByPaymentReference(String paymentReference);
    Page<LoanRepayment> findByLoanAccountIdOrderByInitiatedAtDesc(String loanAccountId, Pageable pageable);
    Page<LoanRepayment> findByRepaymentStatusOrderByInitiatedAtDesc(RepaymentStatus status, Pageable pageable);
    Page<LoanRepayment> findAllByOrderByInitiatedAtDesc(Pageable pageable);
    List<LoanRepayment> findByLoanAccountIdAndRepaymentStatusIn(String loanAccountId, Collection<RepaymentStatus> statuses);
    boolean existsByInstallmentIdAndRepaymentStatusIn(String installmentId, Collection<RepaymentStatus> statuses);
    boolean existsByRepaymentAccountIdAndRepaymentStatusIn(String repaymentAccountId, Collection<RepaymentStatus> statuses);
}
