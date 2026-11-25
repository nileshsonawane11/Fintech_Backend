package com.fintech.payment.repository;

import com.fintech.payment.entity.IncomingPaymentReceiver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncomingPaymentReceiverRepository extends JpaRepository<IncomingPaymentReceiver, String> {

    Optional<IncomingPaymentReceiver> findByReceiverId(String receiverId);

    Optional<IncomingPaymentReceiver> findByReceiverIdAndUserId(String receiverId, String userId);

    Optional<IncomingPaymentReceiver> findByProviderVaId(String providerVaId);

    Optional<IncomingPaymentReceiver> findByFinbankAccountIdAndVaStatus(String finbankAccountId, String vaStatus);

    List<IncomingPaymentReceiver> findByFinbankAccountId(String finbankAccountId);

    Page<IncomingPaymentReceiver> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
