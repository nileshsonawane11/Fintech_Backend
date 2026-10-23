package com.fintech.payment.repository;

import com.fintech.payment.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {

    boolean existsByRailReference(String railReference);

    Optional<WebhookEvent> findByRailReference(String railReference);
}
