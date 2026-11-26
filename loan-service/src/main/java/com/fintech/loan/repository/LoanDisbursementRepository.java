package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanDisbursement;
import com.fintech.loan.enums.DisbursementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanDisbursementRepository extends JpaRepository<LoanDisbursement, UUID> {
    Optional<LoanDisbursement> findByLoanApplicationId(String loanApplicationId);
    Optional<LoanDisbursement> findByDisbursementReference(String disbursementReference);
    Optional<LoanDisbursement> findByIdempotencyKey(String idempotencyKey);
    List<LoanDisbursement> findByDisbursementStatus(DisbursementStatus status);
}
