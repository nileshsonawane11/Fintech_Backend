package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentRefund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {

    Optional<PaymentRefund> findByRefundId(String refundId);

    Optional<PaymentRefund> findByRazorpayRefundId(String razorpayRefundId);

    Optional<PaymentRefund> findByIdempotencyKey(String idempotencyKey);

    List<PaymentRefund> findByPaymentIdOrderByCreatedAtDesc(String paymentId);
}
