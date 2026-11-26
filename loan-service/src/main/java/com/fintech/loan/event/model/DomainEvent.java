package com.fintech.loan.event.model;

import com.fintech.loan.constants.LoanConstants;

import java.time.Instant;
import java.util.UUID;

public record DomainEvent<T>(
        String eventId,
        String eventType,
        String schemaVersion,
        Instant occurredAt,
        String correlationId,
        String aggregateId,
        String aggregateType,
        T payload
) {
    public static <T> DomainEvent<T> of(String eventType, String aggregateId, String aggregateType,
                                        String correlationId, T payload) {
        return new DomainEvent<>(
                UUID.randomUUID().toString(),
                eventType,
                LoanConstants.EVENT_SCHEMA_VERSION,
                Instant.now(),
                correlationId,
                aggregateId,
                aggregateType,
                payload
        );
    }
}
