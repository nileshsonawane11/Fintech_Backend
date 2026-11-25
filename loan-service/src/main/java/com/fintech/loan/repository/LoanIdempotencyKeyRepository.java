package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoanIdempotencyKeyRepository extends JpaRepository<LoanIdempotencyKey, String> {

    Optional<LoanIdempotencyKey> findByIdempotencyKeyAndOperation(String idempotencyKey, String operation);
}
