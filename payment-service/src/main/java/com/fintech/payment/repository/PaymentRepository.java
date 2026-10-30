package com.fintech.payment.repository;

import com.fintech.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByPaymentId(String paymentId);

    Optional<Payment> findByPaymentIdAndUserId(String paymentId, String userId);

    Optional<Payment> findByRailReference(String railReference);
}
