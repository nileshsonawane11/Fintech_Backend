package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoanOfferRepository extends JpaRepository<LoanOffer, String> {

    Optional<LoanOffer> findByOfferIdAndStatus(String offerId, String status);

    Optional<LoanOffer> findFirstByLoanApplicationIdOrderByCreatedAtDesc(String loanApplicationId);

    Optional<LoanOffer> findByOfferId(String offerId);
}
