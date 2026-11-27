package com.fintech.payment.repository;

import com.fintech.payment.entity.Payment;
import com.fintech.payment.enums.PaymentTransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByPaymentId(String paymentId);

    Optional<Payment> findByPaymentIdAndIdentitySubject(String paymentId, String identitySubject);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Page<Payment> findByIdentitySubjectOrderByCreatedAtDesc(String identitySubject, Pageable pageable);

    List<Payment> findByStatusInAndUpdatedAtBefore(Collection<PaymentTransactionStatus> statuses, Instant threshold);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.identitySubject = :identitySubject
              AND p.status IN :activeStatuses
              AND p.createdAt >= :since
            """)
    BigDecimal sumUserAmountSince(
            @Param("identitySubject") String identitySubject,
            @Param("activeStatuses") Collection<PaymentTransactionStatus> activeStatuses,
            @Param("since") Instant since);
}
