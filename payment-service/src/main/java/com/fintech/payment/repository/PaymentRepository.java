package com.fintech.payment.repository;

import com.fintech.payment.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByPaymentId(String paymentId);

    Optional<Payment> findByPaymentIdAndUserId(String paymentId, String userId);

    Optional<Payment> findByRailReference(String railReference);

    Optional<Payment> findByProviderPayoutId(String providerPayoutId);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Page<Payment> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Payment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<Payment> findByStatusInAndUpdatedAtBefore(Collection<String> statuses, Instant threshold);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.userId = :userId AND p.transferMode = :mode " +
           "AND p.status NOT IN ('FAILED', 'REVERSED') AND p.createdAt >= :since")
    BigDecimal sumUserTransferAmountSince(
            @Param("userId") String userId,
            @Param("mode") String mode,
            @Param("since") Instant since);
}
