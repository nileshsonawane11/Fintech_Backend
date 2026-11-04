package com.fintech.account.repository;

import com.fintech.account.entity.OutboxEvent;
import com.fintech.account.enums.PublishingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    List<OutboxEvent> findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
            PublishingStatus publishingStatus,
            int maxRetries,
            Pageable pageable
    );
}
