package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentEnums.OutboxStatus;
import com.fintech.investment.entity.InvestmentOutboxEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface InvestmentOutboxEventRepository extends JpaRepository<InvestmentOutboxEvent, UUID> {
    @Query("SELECT o FROM InvestmentOutboxEvent o WHERE o.status = 'PENDING' AND o.nextRetryAt <= :now ORDER BY o.createdAt ASC")
    List<InvestmentOutboxEvent> findDueEvents(@Param("now") Instant now, Pageable pageable);

    List<InvestmentOutboxEvent> findByStatusOrderByCreatedAtDesc(OutboxStatus status);
}
