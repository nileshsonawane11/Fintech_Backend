package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanRepaymentAccount;
import com.fintech.loan.enums.RepaymentAccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanRepaymentAccountRepository extends JpaRepository<LoanRepaymentAccount, UUID> {
    Optional<LoanRepaymentAccount> findByRepaymentAccountId(String repaymentAccountId);
    List<LoanRepaymentAccount> findByLoanAccountIdOrderByCreatedAtDesc(String loanAccountId);
    List<LoanRepaymentAccount> findByLoanAccountIdAndStatus(String loanAccountId, RepaymentAccountStatus status);
    Optional<LoanRepaymentAccount> findByLoanAccountIdAndPrimaryTrueAndStatus(String loanAccountId, RepaymentAccountStatus status);
    Optional<LoanRepaymentAccount> findByLoanAccountIdAndExternalAccountIdAndStatus(String loanAccountId, String externalAccountId, RepaymentAccountStatus status);
}
