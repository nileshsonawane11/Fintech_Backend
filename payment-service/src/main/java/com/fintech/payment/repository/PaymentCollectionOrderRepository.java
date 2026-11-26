package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentCollectionOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentCollectionOrderRepository extends JpaRepository<PaymentCollectionOrder, UUID> {
    Optional<PaymentCollectionOrder> findByCollectionReference(String collectionReference);
    Optional<PaymentCollectionOrder> findByIdempotencyKey(String idempotencyKey);
    Optional<PaymentCollectionOrder> findByProviderReference(String providerReference);
}
