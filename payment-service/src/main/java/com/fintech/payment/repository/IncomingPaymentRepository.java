package com.fintech.payment.repository;

import com.fintech.payment.entity.IncomingPayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IncomingPaymentRepository extends JpaRepository<IncomingPayment, String> {

    Optional<IncomingPayment> findByIncomingPaymentId(String incomingPaymentId);

    Optional<IncomingPayment> findByIncomingPaymentIdAndUserId(String incomingPaymentId, String userId);

    Optional<IncomingPayment> findByProviderPaymentId(String providerPaymentId);

    Page<IncomingPayment> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<IncomingPayment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<IncomingPayment> findByStatusInAndUpdatedAtBefore(Collection<String> statuses, Instant threshold);
}
