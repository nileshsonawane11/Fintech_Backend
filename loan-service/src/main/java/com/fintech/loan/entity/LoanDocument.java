package com.fintech.loan.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_documents")
public class LoanDocument {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "loan_application_id", nullable = false, length = 50)
    private String loanApplicationId;

    @Column(name = "document_type", nullable = false, length = 100)
    private String documentType;

    @Column(name = "document_reference_id", nullable = false, length = 100)
    private String documentReferenceId;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "source", nullable = false, length = 50)
    private String source = "KYC_VERIFIED";

    @Column(name = "verification_status", nullable = false, length = 30)
    private String verificationStatus = "VERIFIED";

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public LoanDocument() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getDocumentReferenceId() { return documentReferenceId; }
    public void setDocumentReferenceId(String documentReferenceId) { this.documentReferenceId = documentReferenceId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }

    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
