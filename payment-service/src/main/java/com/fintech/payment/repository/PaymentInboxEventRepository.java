package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentInboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentInboxEventRepository extends JpaRepository<PaymentInboxEvent, String> {
}
