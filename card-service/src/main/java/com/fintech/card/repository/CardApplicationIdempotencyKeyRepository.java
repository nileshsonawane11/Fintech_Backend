package com.fintech.card.repository;

import com.fintech.card.entity.CardApplicationIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CardApplicationIdempotencyKeyRepository extends JpaRepository<CardApplicationIdempotencyKey, String> {

    Optional<CardApplicationIdempotencyKey> findByIdempotencyKey(String idempotencyKey);
}
