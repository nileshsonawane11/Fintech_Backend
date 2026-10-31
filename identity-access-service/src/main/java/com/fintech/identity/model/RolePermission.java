package com.fintech.identity.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "role_permissions")
public class RolePermission {

    @EmbeddedId
    private RolePermissionId id;

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    protected RolePermission() {}

    public RolePermission(UUID roleId, UUID permissionId, UUID assignedBy) {
        this.id = new RolePermissionId(roleId, permissionId);
        this.assignedBy = assignedBy;
        this.assignedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (assignedAt == null) {
            assignedAt = Instant.now();
        }
    }

    public RolePermissionId getId() { return id; }
    public UUID getRoleId() { return id != null ? id.getRoleId() : null; }
    public UUID getPermissionId() { return id != null ? id.getPermissionId() : null; }
    public UUID getAssignedBy() { return assignedBy; }
    public void setAssignedBy(UUID assignedBy) { this.assignedBy = assignedBy; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
}
