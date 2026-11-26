package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, String> {

    Optional<LoanAccount> findByLoanAccountIdAndCustomerId(String loanAccountId, String customerId);

    Optional<LoanAccount> findByLoanAccountId(String loanAccountId);

    Optional<LoanAccount> findByLoanApplicationId(String loanApplicationId);

    List<LoanAccount> findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(String identitySubject, String customerId);
}
