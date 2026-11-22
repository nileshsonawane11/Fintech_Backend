package com.fintech.card.repository;

import com.fintech.card.entity.CardOutboxEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CardOutboxEventRepository extends JpaRepository<CardOutboxEvent, UUID> {

    List<CardOutboxEvent> findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
            String publishingStatus, int maxRetries, Pageable pageable);
}
