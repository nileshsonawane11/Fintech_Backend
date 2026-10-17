package com.fintech.customer.service;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.model.document.DocumentType;
import com.fintech.customer.model.KycDocument;
import com.fintech.customer.repository.KycDocumentRepository;
import com.fintech.customer.dto.request.DocumentUploadRequest;
import com.fintech.customer.dto.response.DocumentResponse;
import com.fintech.customer.dto.response.DocumentUploadResponse;
import com.fintech.customer.exception.ApiException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class KycDocumentService {

    private final CustomerProfileRepository profileRepository;
    private final KycDocumentRepository documentRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final int uploadUrlMinutes;
    private final long maxFileSizeBytes;

    public KycDocumentService(
            CustomerProfileRepository profileRepository,
            KycDocumentRepository documentRepository,
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${storage.s3.bucket}") String bucket,
            @Value("${storage.s3.upload-url-minutes:5}") int uploadUrlMinutes,
            @Value("${storage.s3.max-file-size-bytes:10485760}")
            long maxFileSizeBytes
    ) {
        this.profileRepository = profileRepository;
        this.documentRepository = documentRepository;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.uploadUrlMinutes = uploadUrlMinutes;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Transactional
    public DocumentUploadResponse createUpload(
            String identitySubject,
            DocumentUploadRequest request
    ) {
        validateMetadata(request);

        CustomerProfile profile = getOrCreateProfile(identitySubject);

        String reference = "DOC-" +
                UUID.randomUUID().toString()
                        .replace("-", "")
                        .toUpperCase(Locale.ROOT);

        // Never use the submitted filename as the storage key.
        String storageKey = "quarantine/"
                + profile.getId() + "/"
                + UUID.randomUUID();

        KycDocument document = KycDocument.pendingUpload(
                reference,
                profile,
                request.documentType(),
                sanitizeFileName(request.fileName()),
                request.contentType().toLowerCase(Locale.ROOT),
                request.contentSizeBytes(),
                storageKey
        );

        documentRepository.save(document);

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(storageKey)
                .contentType(request.contentType().toLowerCase(Locale.ROOT))
                .build();

        var presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(uploadUrlMinutes))
                .putObjectRequest(putRequest)
                .build();

        String url = s3Presigner.presignPutObject(presignRequest)
                .url().toExternalForm();

        return new DocumentUploadResponse(
                reference,
                url,
                Instant.now().plusSeconds(uploadUrlMinutes * 60L),
                "PUT",
                request.contentType().toLowerCase(Locale.ROOT),
                document.getStatus()
        );
    }

    @Transactional
    public DocumentResponse completeUpload(
            String identitySubject,
            String documentReferenceId
    ) {
        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject
        );

        if (!"PENDING_UPLOAD".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "INVALID_DOCUMENT_STATE",
                    "This document is not awaiting an upload."
            );
        }

        HeadObjectResponse head;
        try {
            head = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(document.getStorageKey())
                    .build());
        } catch (SdkException exception) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "DOCUMENT_UPLOAD_NOT_FOUND",
                    "The uploaded document could not be found."
            );
        }

        boolean sizeMatches =
                head.contentLength() == document.getContentSizeBytes();

        boolean typeMatches =
                head.contentType() != null
                        && head.contentType().equalsIgnoreCase(
                        document.getContentType()
                );

        if (!sizeMatches || !typeMatches) {
            document.markRejected();
            documentRepository.save(document);

            return toResponse(document);
        }

        // Existence and metadata checks are not malware/content validation.
        // Keep the file quarantined until a trusted scanner validates it.
        document.markPendingScan();
        documentRepository.save(document);

        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(String identitySubject) {
        return documentRepository
                .findAllByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(
                        identitySubject
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(
            String identitySubject,
            String documentReferenceId
    ) {
        return toResponse(
                getOwnedDocument(documentReferenceId, identitySubject)
        );
    }

    @Transactional(readOnly = true)
    public String createDownloadUrl(
            String identitySubject,
            String documentReferenceId
    ) {
        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject
        );

        if (!"VALIDATED".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "DOCUMENT_NOT_VALIDATED",
                    "Only validated documents can be downloaded."
            );
        }

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(document.getStorageKey())
                .build();

        var presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(2))
                .getObjectRequest(getRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest)
                .url().toExternalForm();
    }

    @Transactional
    public void deleteDocument(
            String identitySubject,
            String documentReferenceId
    ) {
        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject
        );

        // Preserve uploaded documents linked to a case for auditability.
        if (!"PENDING_UPLOAD".equals(document.getStatus())
                && !"REJECTED".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DOCUMENT_CANNOT_BE_DELETED",
                    "This document cannot be deleted in its current state."
            );
        }

        if (document.getStorageKey() != null) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(document.getStorageKey())
                        .build());
            } catch (SdkException exception) {
                throw new ApiException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "DOCUMENT_STORAGE_UNAVAILABLE",
                        "Document storage is temporarily unavailable."
                );
            }
        }

        documentRepository.delete(document);
    }

    private void validateMetadata(DocumentUploadRequest request) {
        if (request.contentSizeBytes() > maxFileSizeBytes) {
            throw new ApiException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "DOCUMENT_TOO_LARGE",
                    "The document exceeds the permitted file size."
            );
        }

        String contentType = request.contentType()
                .toLowerCase(Locale.ROOT);

        if (!List.of(
                "application/pdf",
                "image/jpeg",
                "image/png"
        ).contains(contentType)) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "UNSUPPORTED_DOCUMENT_TYPE",
                    "Only PDF, JPEG, and PNG files are accepted."
            );
        }

        if (request.fileName().contains("/")
                || request.fileName().contains("\\")
                || request.fileName().contains("..")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_NAME",
                    "The supplied file name is invalid."
            );
        }

        if (request.documentType() == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_DOCUMENT_TYPE",
                    "A document type is required."
            );
        }
    }

    private CustomerProfile getOrCreateProfile(String subject) {
        if (subject == null || subject.isBlank()) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_AUTHENTICATION",
                    "A valid authenticated identity is required."
            );
        }

        return profileRepository.findByIdentitySubject(subject)
                .orElseGet(() -> {
                    String customerId = "CUS-" +
                            UUID.randomUUID().toString()
                                    .replace("-", "")
                                    .substring(0, 12)
                                    .toUpperCase(Locale.ROOT);

                    return profileRepository.save(
                            CustomerProfile.create(customerId, subject)
                    );
                });
    }

    private KycDocument getOwnedDocument(
            String reference,
            String subject
    ) {
        return documentRepository
                .findByDocumentReferenceIdAndCustomerProfile_IdentitySubject(
                        reference, subject
                )
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "DOCUMENT_NOT_FOUND",
                        "The requested document was not found."
                ));
    }

    private String sanitizeFileName(String fileName) {
        return fileName.trim();
    }

    private DocumentResponse toResponse(KycDocument document) {
        return new DocumentResponse(
                document.getDocumentReferenceId(),
                document.getDocumentType().name(),
                document.getFileName(),
                document.getContentType(),
                document.getContentSizeBytes(),
                document.getStatus(),
                document.getCreatedAt(),
                document.getUploadedAt()
        );
    }
}