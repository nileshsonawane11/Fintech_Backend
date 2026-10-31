package com.fintech.identity.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_roles")
public class UserRole {

    @EmbeddedId
    private UserRoleId id;

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    protected UserRole() {}

    public UserRole(UUID userId, UUID roleId, UUID assignedBy) {
        this.id = new UserRoleId(userId, roleId);
        this.assignedBy = assignedBy;
        this.assignedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (assignedAt == null) {
            assignedAt = Instant.now();
        }
    }

    public UserRoleId getId() { return id; }
    public UUID getUserId() { return id != null ? id.getUserId() : null; }
    public UUID getRoleId() { return id != null ? id.getRoleId() : null; }
    public UUID getAssignedBy() { return assignedBy; }
    public void setAssignedBy(UUID assignedBy) { this.assignedBy = assignedBy; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
}
