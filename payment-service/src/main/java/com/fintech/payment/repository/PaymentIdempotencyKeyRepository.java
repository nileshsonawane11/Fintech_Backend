package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentIdempotencyKeyRepository extends JpaRepository<PaymentIdempotencyKey, String> {

    Optional<PaymentIdempotencyKey> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);
}
