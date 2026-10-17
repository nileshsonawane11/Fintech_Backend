package com.fintech.events;

import java.time.Instant;
import java.util.UUID;

public record CustomerRegisteredEvent(
        UUID identityId,
        Instant occurredAt
) {
}