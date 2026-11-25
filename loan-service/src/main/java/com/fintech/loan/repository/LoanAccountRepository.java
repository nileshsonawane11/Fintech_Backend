package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, String> {

    java.util.Optional<LoanAccount> findByLoanAccountIdAndCustomerId(
            String loanAccountId, String customerId);
}
