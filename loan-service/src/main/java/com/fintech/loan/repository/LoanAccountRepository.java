package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, String> {

    Optional<LoanAccount> findByLoanAccountIdAndCustomerId(String loanAccountId, String customerId);

    Optional<LoanAccount> findByLoanAccountId(String loanAccountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM LoanAccount l WHERE l.loanAccountId = :loanAccountId")
    Optional<LoanAccount> findWithLockByLoanAccountId(@Param("loanAccountId") String loanAccountId);

    Optional<LoanAccount> findByLoanApplicationId(String loanApplicationId);

    List<LoanAccount> findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(String identitySubject, String customerId);

    List<LoanAccount> findByStatus(String status);
}
