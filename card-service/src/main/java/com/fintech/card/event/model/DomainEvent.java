package com.fintech.card.event.model;

import java.time.Instant;
import java.util.UUID;

public record DomainEvent<T>(
        UUID eventId,
        String eventType,
        String aggregateId,
        String aggregateType,
        Instant occurredAt,
        String correlationId,
        int eventVersion,
        T payload
) {
    public static <T> DomainEvent<T> of(String eventType, String aggregateId, String aggregateType, String correlationId, T payload) {
        return new DomainEvent<>(
                UUID.randomUUID(),
                eventType,
                aggregateId,
                aggregateType,
                Instant.now(),
                correlationId,
                1,
                payload
        );
    }
}
