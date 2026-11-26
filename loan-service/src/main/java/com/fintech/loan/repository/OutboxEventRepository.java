package com.fintech.loan.repository;

import com.fintech.loan.entity.OutboxEvent;
import com.fintech.loan.enums.PublishingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("""
            SELECT o FROM OutboxEvent o
            WHERE o.publishingStatus = :status
              AND o.nextAttemptAt <= :now
              AND o.retryCount < :maxRetries
            ORDER BY o.createdAt ASC
            """)
    List<OutboxEvent> findDueEvents(
            @Param("status") PublishingStatus status,
            @Param("now") Instant now,
            @Param("maxRetries") int maxRetries,
            Pageable pageable);
}
