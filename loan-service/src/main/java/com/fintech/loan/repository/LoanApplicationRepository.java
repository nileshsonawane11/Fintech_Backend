package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, String> {

    Optional<LoanApplication> findByLoanApplicationId(String loanApplicationId);

    List<LoanApplication> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
