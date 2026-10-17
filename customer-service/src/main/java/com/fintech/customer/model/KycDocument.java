
package com.fintech.customer.model;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.document.DocumentType;
import com.fintech.customer.model.KycCase;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "kyc_documents")
public class KycDocument {

    @Id
    private UUID id;

    @Column(name = "document_reference_id",
            nullable = false, unique = true, length = 64)
    private String documentReferenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kyc_case_id")
    private KycCase kycCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_profile_id", nullable = false)
    private CustomerProfile customerProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private DocumentType documentType;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "content_size_bytes", nullable = false)
    private long contentSizeBytes;

    @Column(name = "storage_key")
    private String storageKey;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "file_hash", length = 128)
    private String fileHash;

    @Column(name = "uploaded_at")
    private Instant uploadedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected KycDocument() {
    }

    public static KycDocument pendingUpload(
            String referenceId,
            CustomerProfile profile,
            DocumentType type,
            String fileName,
            String contentType,
            long size,
            String storageKey
    ) {
        KycDocument document = new KycDocument();
        document.id = UUID.randomUUID();
        document.documentReferenceId = referenceId;
        document.customerProfile = profile;
        document.documentType = type;
        document.fileName = fileName;
        document.contentType = contentType;
        document.contentSizeBytes = size;
        document.storageKey = storageKey;
        document.status = "PENDING_UPLOAD";
        document.createdAt = Instant.now();
        return document;
    }

    public void markPendingScan() {
        this.status = "PENDING_SCAN";
        this.uploadedAt = Instant.now();
    }

    public void markRejected() {
        this.status = "REJECTED";
    }

    public void attachToCase(KycCase kycCase) {
        this.kycCase = kycCase;
    }

    public UUID getId() { return id; }
    public String getDocumentReferenceId() { return documentReferenceId; }
    public KycCase getKycCase() { return kycCase; }
    public CustomerProfile getCustomerProfile() { return customerProfile; }
    public DocumentType getDocumentType() { return documentType; }
    public String getFileName() { return fileName; }
    public String getContentType() { return contentType; }
    public long getContentSizeBytes() { return contentSizeBytes; }
    public String getStorageKey() { return storageKey; }
    public String getStatus() { return status; }
    public String getFileHash() { return fileHash; }
    public Instant getUploadedAt() { return uploadedAt; }
    public Instant getCreatedAt() { return createdAt; }
}