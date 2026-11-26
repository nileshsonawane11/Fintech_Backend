package com.fintech.loan.entity;

import com.fintech.loan.enums.CollectionAttemptStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_repayment_attempts")
public class LoanRepaymentAttempt {

    @Id
    private UUID id;

    @Column(name = "attempt_id", nullable = false, unique = true, length = 64)
    private String attemptId;

    @Column(name = "repayment_id", nullable = false, length = 64)
    private String repaymentId;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Column(name = "provider_reference", length = 100)
    private String providerReference;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private CollectionAttemptStatus status = CollectionAttemptStatus.INITIATED;

    @Column(name = "failure_code", length = 80)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "attempt_timestamp", nullable = false)
    private Instant attemptTimestamp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (attemptTimestamp == null) attemptTimestamp = now;
        if (createdAt == null) createdAt = now;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAttemptId() { return attemptId; }
    public void setAttemptId(String attemptId) { this.attemptId = attemptId; }
    public String getRepaymentId() { return repaymentId; }
    public void setRepaymentId(String repaymentId) { this.repaymentId = repaymentId; }
    public Integer getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }
    public String getProviderReference() { return providerReference; }
    public void setProviderReference(String providerReference) { this.providerReference = providerReference; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public CollectionAttemptStatus getStatus() { return status; }
    public void setStatus(CollectionAttemptStatus status) { this.status = status; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getAttemptTimestamp() { return attemptTimestamp; }
    public void setAttemptTimestamp(Instant attemptTimestamp) { this.attemptTimestamp = attemptTimestamp; }
    public Instant getCreatedAt() { return createdAt; }
}
