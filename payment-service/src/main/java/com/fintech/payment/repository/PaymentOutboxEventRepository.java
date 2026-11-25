package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentOutboxEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PaymentOutboxEventRepository extends JpaRepository<PaymentOutboxEvent, String> {

    @Query("SELECT o FROM PaymentOutboxEvent o " +
           "WHERE o.publishingStatus = 'PENDING' AND o.nextAttemptAt <= :now " +
           "AND o.retryCount < :maxRetries ORDER BY o.createdAt ASC")
    List<PaymentOutboxEvent> findDuePendingEvents(
            @Param("now") Instant now,
            @Param("maxRetries") int maxRetries,
            Pageable pageable);
}
