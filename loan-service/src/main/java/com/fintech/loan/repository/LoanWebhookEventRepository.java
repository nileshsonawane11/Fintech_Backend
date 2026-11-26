package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LoanWebhookEventRepository extends JpaRepository<LoanWebhookEvent, UUID> {
    boolean existsByProviderAndEventId(String provider, String eventId);
}
