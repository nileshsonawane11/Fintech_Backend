package com.fintech.identity.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_permissions")
public class UserPermission {

    @EmbeddedId
    private UserPermissionId id;

    @Column(nullable = false, length = 10)
    private String effect; // ALLOW or DENY

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    protected UserPermission() {}

    public UserPermission(UUID userId, UUID permissionId, String effect, UUID assignedBy) {
        this.id = new UserPermissionId(userId, permissionId);
        this.effect = effect;
        this.assignedBy = assignedBy;
        this.assignedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (assignedAt == null) {
            assignedAt = Instant.now();
        }
    }

    public UserPermissionId getId() { return id; }
    public UUID getUserId() { return id != null ? id.getUserId() : null; }
    public UUID getPermissionId() { return id != null ? id.getPermissionId() : null; }
    public String getEffect() { return effect; }
    public void setEffect(String effect) { this.effect = effect; }
    public UUID getAssignedBy() { return assignedBy; }
    public void setAssignedBy(UUID assignedBy) { this.assignedBy = assignedBy; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
}
