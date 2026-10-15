package com.fintech.identity.model;

import com.fintech.identity.model.enums.OtpPurpose;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "otp_challenges",
        indexes = {
                @Index(name = "idx_otp_reference", columnList = "reference_id")
        }
)
public class OtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "reference_id", nullable = false, unique = true)
    private String referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OtpPurpose purpose;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OtpChallenge() {
    }

    public OtpChallenge(
            String referenceId,
            Customer customer,
            OtpPurpose purpose,
            String codeHash,
            Instant expiresAt,
            int maxAttempts
    ) {
        this.referenceId = referenceId;
        this.customer = customer;
        this.purpose = purpose;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.maxAttempts = maxAttempts;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public void recordFailedAttempt() {
        attempts++;
    }

    public void markVerified() {
        verifiedAt = Instant.now();
    }

    public void consume() {
        consumedAt = Instant.now();
    }

    public boolean isExpired() {
        return !expiresAt.isAfter(Instant.now());
    }

    public boolean hasExceededAttempts() {
        return attempts >= maxAttempts;
    }

    public boolean isVerified() {
        return verifiedAt != null;
    }

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public UUID getId() { return id; }
    public String getReferenceId() { return referenceId; }
    public Customer getCustomer() { return customer; }
    public OtpPurpose getPurpose() { return purpose; }
    public String getCodeHash() { return codeHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getAttempts() { return attempts; }
    public int getMaxAttempts() { return maxAttempts; }
}