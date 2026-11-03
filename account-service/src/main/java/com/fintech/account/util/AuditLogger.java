package com.fintech.account.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class AuditLogger {

    private static final Logger log = LoggerFactory.getLogger("FINBANK_AUDIT");

    public void logAudit(String action, String aggregateType, String aggregateId, String actor, String details) {
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        log.info("AUDIT_EVENT: action={}, aggregateType={}, aggregateId={}, actor={}, correlationId={}, timestamp={}, details={}",
                action, aggregateType, aggregateId, actor, correlationId, Instant.now(), details);
    }
}
