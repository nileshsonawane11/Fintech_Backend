package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanProductFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanProductFeeRepository extends JpaRepository<LoanProductFee, UUID> {

    Optional<LoanProductFee> findByProductId(UUID productId);

    List<LoanProductFee> findAllByProductIdIn(List<UUID> productIds);
}
