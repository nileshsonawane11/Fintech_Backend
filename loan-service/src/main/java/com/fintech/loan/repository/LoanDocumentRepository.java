package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanDocumentRepository extends JpaRepository<LoanDocument, UUID> {

    List<LoanDocument> findByLoanApplicationIdOrderByCreatedAtAsc(String loanApplicationId);
}
