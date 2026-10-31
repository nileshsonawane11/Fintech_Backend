package com.fintech.identity.repository;

import com.fintech.identity.model.AuthorizationAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuthorizationAuditLogRepository extends JpaRepository<AuthorizationAuditLog, UUID> {
    List<AuthorizationAuditLog> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);
    List<AuthorizationAuditLog> findByActorUserIdOrderByCreatedAtDesc(UUID actorUserId);
}
