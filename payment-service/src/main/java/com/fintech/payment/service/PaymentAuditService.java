package com.fintech.payment.service;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentAuditLog;
import com.fintech.payment.repository.PaymentAuditLogRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentAuditService {

    private final PaymentAuditLogRepository auditLogRepository;

    public PaymentAuditService(PaymentAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void record(String actorId, String actorRole, String action,
                       String resourceType, String resourceId, String details) {
        PaymentAuditLog entry = new PaymentAuditLog();
        entry.setActorId(actorId != null ? actorId : "SYSTEM");
        entry.setActorRole(actorRole != null ? actorRole : "SYSTEM");
        entry.setAction(action);
        entry.setResourceType(resourceType);
        entry.setResourceId(resourceId);
        entry.setCorrelationId(MDC.get(PaymentConstants.MDC_CORRELATION_ID));
        entry.setDetails(details != null && details.length() > 990 ? details.substring(0, 990) : details);
        auditLogRepository.save(entry);
    }
}
