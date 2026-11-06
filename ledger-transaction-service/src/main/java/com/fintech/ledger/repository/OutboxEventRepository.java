package com.fintech.ledger.repository;

import com.fintech.ledger.entity.OutboxEvent;
import com.fintech.ledger.enums.PublishingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    List<OutboxEvent> findTop50ByPublishingStatusOrderByCreatedAtAsc(PublishingStatus publishingStatus);
}
