package com.fintech.loan.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "loan_idempotency_keys",
    uniqueConstraints = @UniqueConstraint(columnNames = {"idempotency_key", "operation"})
)
public class LoanIdempotencyKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, length = 36)
    private String id;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "operation", nullable = false, length = 50)
    private String operation;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "request_hash", length = 128)
    private String requestHash;

    @Column(name = "response_reference", length = 100)
    private String responseReference;

    @Column(name = "response_payload", columnDefinition = "TEXT")
    private String responsePayload;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public LoanIdempotencyKey() {}

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }

    public String getRequestHash() { return requestHash; }
    public void setRequestHash(String requestHash) { this.requestHash = requestHash; }

    public String getResponseReference() { return responseReference; }
    public void setResponseReference(String responseReference) { this.responseReference = responseReference; }

    public String getResponsePayload() { return responsePayload; }
    public void setResponsePayload(String responsePayload) { this.responsePayload = responsePayload; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
