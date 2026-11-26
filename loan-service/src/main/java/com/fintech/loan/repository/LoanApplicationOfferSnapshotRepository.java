package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanApplicationOfferSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanApplicationOfferSnapshotRepository extends JpaRepository<LoanApplicationOfferSnapshot, UUID> {

    Optional<LoanApplicationOfferSnapshot> findByLoanApplicationId(String loanApplicationId);
}
