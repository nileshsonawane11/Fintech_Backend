package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InvestmentIdempotencyKeyRepository extends JpaRepository<InvestmentIdempotencyKey, UUID> {
    Optional<InvestmentIdempotencyKey> findByIdempotencyKeyAndOperation(String idempotencyKey, String operation);
}
