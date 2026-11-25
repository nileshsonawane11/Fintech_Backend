package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentAuditLogRepository extends JpaRepository<PaymentAuditLog, String> {

    Page<PaymentAuditLog> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
            String resourceType, String resourceId, Pageable pageable);

    Page<PaymentAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
