package com.fintech.identity.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "manager_profiles")
public class ManagerProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "manager_code", nullable = false, unique = true, length = 50)
    private String managerCode;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ManagerProfile() {}

    public ManagerProfile(UUID userId, String managerCode, String department) {
        this.userId = userId;
        this.managerCode = managerCode;
        this.department = department;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getManagerCode() { return managerCode; }
    public void setManagerCode(String managerCode) { this.managerCode = managerCode; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
