package com.fintech.identity.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_profiles")
public class AdminProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "admin_code", nullable = false, unique = true, length = 50)
    private String adminCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AdminProfile() {}

    public AdminProfile(UUID userId, String adminCode) {
        this.userId = userId;
        this.adminCode = adminCode;
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
    public String getAdminCode() { return adminCode; }
    public void setAdminCode(String adminCode) { this.adminCode = adminCode; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
