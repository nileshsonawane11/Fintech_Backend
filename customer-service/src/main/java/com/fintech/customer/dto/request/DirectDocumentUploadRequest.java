package com.fintech.customer.dto.request;

import com.fintech.customer.model.document.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class DirectDocumentUploadRequest{
        @NotNull
        DocumentType documentType;

        @NotBlank
        @Size(max = 255)
        String fileName;

        @NotBlank
        String contentType;


        @NotNull
        @Positive
        Long contentSizeBytes;

    public DocumentType getDocumentType() {
        return documentType;
    }

    public void setDocumentType(DocumentType documentType) {
        this.documentType = documentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getContentSizeBytes() {
        return contentSizeBytes;
    }

    public void setContentSizeBytes(Long contentSizeBytes) {
        this.contentSizeBytes = contentSizeBytes;
    }
}