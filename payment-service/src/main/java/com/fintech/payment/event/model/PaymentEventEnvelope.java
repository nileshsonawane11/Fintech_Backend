package com.fintech.payment.event.model;

import java.time.Instant;

public record PaymentEventEnvelope<T>(
        String eventId,
        String eventType,
        String eventVersion,
        Instant occurredAt,
        String correlationId,
        String aggregateId,
        String aggregateType,
        String customerReference,
        String providerReference,
        T payload
) {}
