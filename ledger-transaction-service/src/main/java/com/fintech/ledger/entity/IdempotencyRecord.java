package com.fintech.ledger.entity;

import com.fintech.ledger.enums.ProcessingStatus;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "idempotency_records")
public class IdempotencyRecord {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "operation", nullable = false, length = 100)
    private String operation;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 30)
    private ProcessingStatus processingStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public IdempotencyRecord() {
    }

    public IdempotencyRecord(UUID id, String idempotencyKey, String operation, String requestHash,
                             Instant expiresAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.idempotencyKey = idempotencyKey;
        this.operation = operation;
        this.requestHash = requestHash;
        this.processingStatus = ProcessingStatus.PROCESSING;
        this.createdAt = Instant.now();
        this.expiresAt = expiresAt != null ? expiresAt : Instant.now().plusSeconds(86400);
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (processingStatus == null) {
            processingStatus = ProcessingStatus.PROCESSING;
        }
        if (expiresAt == null) {
            expiresAt = Instant.now().plusSeconds(86400); // 24 hours default
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public void setRequestHash(String requestHash) {
        this.requestHash = requestHash;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public void setResourceId(UUID resourceId) {
        this.resourceId = resourceId;
    }

    public Integer getResponseStatus() {
        return responseStatus;
    }

    public void setResponseStatus(Integer responseStatus) {
        this.responseStatus = responseStatus;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public ProcessingStatus getProcessingStatus() {
        return processingStatus;
    }

    public void setProcessingStatus(ProcessingStatus processingStatus) {
        this.processingStatus = processingStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
