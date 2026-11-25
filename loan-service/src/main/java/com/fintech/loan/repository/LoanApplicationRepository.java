package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, String> {

    List<LoanApplication> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
