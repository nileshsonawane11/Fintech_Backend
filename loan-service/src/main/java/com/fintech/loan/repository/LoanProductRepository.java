package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanProductRepository extends JpaRepository<LoanProduct, String> {

    List<LoanProduct> findByLoanTypeAndActiveTrue(String loanType);

    List<LoanProduct> findByActiveTrue();
}
