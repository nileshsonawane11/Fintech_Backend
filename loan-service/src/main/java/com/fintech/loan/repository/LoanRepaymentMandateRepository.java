package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentMandate;
import com.fintech.loan.enums.MandateStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanRepaymentMandateRepository extends JpaRepository<LoanRepaymentMandate, UUID> {
    Optional<LoanRepaymentMandate> findByMandateId(String mandateId);
    Optional<LoanRepaymentMandate> findByProviderReference(String providerReference);
    List<LoanRepaymentMandate> findByLoanAccountIdOrderByCreatedAtDesc(String loanAccountId);
    Optional<LoanRepaymentMandate> findFirstByLoanAccountIdAndStatusOrderByCreatedAtDesc(String loanAccountId, MandateStatus status);
    boolean existsByRepaymentAccountIdAndStatusIn(String repaymentAccountId, Collection<MandateStatus> statuses);
}
