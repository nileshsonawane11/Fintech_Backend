package com.fintech.customer.service;

import com.fintech.customer.dto.request.DocumentUploadRequest;
import com.fintech.customer.dto.response.DocumentResponse;
import com.fintech.customer.dto.response.DocumentUploadResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycDocument;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycDocumentRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class KycDocumentService {

    private static final String BASE_PATH =
            "/api/v1/customers/me/kyc/documents";

    private final CustomerProfileRepository profileRepository;
    private final KycDocumentRepository documentRepository;
    private final LocalDocumentStorageService storage;
    private final String bucket;
    private final int uploadUrlMinutes;
    private final long maxFileSizeBytes;

    public KycDocumentService(
            CustomerProfileRepository profileRepository,
            KycDocumentRepository documentRepository,
            LocalDocumentStorageService storage,
            @Value("${storage.s3.bucket:local-filesystem}") String bucket,
            @Value("${storage.s3.upload-url-minutes:5}")
            int uploadUrlMinutes,
            @Value("${storage.s3.max-file-size-bytes:10485760}")
            long maxFileSizeBytes) {

        this.profileRepository = profileRepository;
        this.documentRepository = documentRepository;
        this.storage = storage;
        this.bucket = bucket;
        this.uploadUrlMinutes = uploadUrlMinutes;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Transactional
    public DocumentUploadResponse createUpload(
            String identitySubject,
            DocumentUploadRequest request) {

        validateMetadata(request);

        CustomerProfile profile = getOrCreateProfile(identitySubject);

        String reference = "DOC-" +
                UUID.randomUUID().toString()
                        .replace("-", "")
                        .toUpperCase(Locale.ROOT);

        String storageKey = "quarantine/"
                + profile.getId() + "/"
                + UUID.randomUUID();

        KycDocument document = KycDocument.pendingUpload(
                reference,
                profile,
                request.documentType(),
                sanitizeFileName(request.fileName()),
                normalizeContentType(request.contentType()),
                request.contentSizeBytes(),
                storageKey
        );

        documentRepository.save(document);

        // This is a normal authenticated Spring Boot endpoint,
        // not an S3 pre-signed URL.
        String uploadUrl = BASE_PATH + "/" + reference + "/content";

        return new DocumentUploadResponse(
                reference,
                uploadUrl,
                Instant.now().plus(Duration.ofMinutes(uploadUrlMinutes)),
                "PUT",
                normalizeContentType(request.contentType()),
                document.getStatus()
        );
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void uploadContent(
            String identitySubject,
            String documentReferenceId,
            String suppliedContentType,
            byte[] content) {

        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject);

        if (!"PENDING_UPLOAD".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "INVALID_DOCUMENT_STATE",
                    "This document is not awaiting an upload."
            );
        }

        Instant expiry = document.getCreatedAt()
                .plus(Duration.ofMinutes(uploadUrlMinutes));

        if (Instant.now().isAfter(expiry)) {
            document.markRejected();
            documentRepository.save(document);

            throw new ApiException(
                    HttpStatus.GONE,
                    "UPLOAD_URL_EXPIRED",
                    "The upload window has expired. Create a new upload."
            );
        }

        if (content == null || content.length == 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "EMPTY_DOCUMENT",
                    "The uploaded document is empty."
            );
        }

        if (content.length > maxFileSizeBytes
                || content.length != document.getContentSizeBytes()) {
            document.markRejected();
            documentRepository.save(document);

            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "DOCUMENT_SIZE_MISMATCH",
                    "The uploaded document size is invalid."
            );
        }

        String actualContentType = normalizeContentType(
                suppliedContentType);

        if (!actualContentType.equals(document.getContentType())) {
            document.markRejected();
            documentRepository.save(document);

            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "DOCUMENT_TYPE_MISMATCH",
                    "The uploaded content type does not match the metadata."
            );
        }

        try {
            storage.store(document.getStorageKey(), content);
        } catch (IOException | IllegalArgumentException ex) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "DOCUMENT_STORAGE_UNAVAILABLE",
                    "The document could not be saved."
            );
        }
    }

    @Transactional(noRollbackFor = ApiException.class)
    public DocumentResponse completeUpload(
            String identitySubject,
            String documentReferenceId) {

        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject);

        if (!"PENDING_UPLOAD".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "INVALID_DOCUMENT_STATE",
                    "This document is not awaiting an upload."
            );
        }

        Instant expiry = document.getCreatedAt()
                .plus(Duration.ofMinutes(uploadUrlMinutes));

        if (Instant.now().isAfter(expiry)) {
            document.markRejected();
            documentRepository.save(document);

            throw new ApiException(
                    HttpStatus.GONE,
                    "UPLOAD_URL_EXPIRED",
                    "The upload window has expired."
            );
        }

        try {
            if (!storage.exists(document.getStorageKey())) {
                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "DOCUMENT_UPLOAD_NOT_FOUND",
                        "The uploaded document could not be found."
                );
            }

            if (storage.size(document.getStorageKey())
                    != document.getContentSizeBytes()) {

                document.markRejected();
                documentRepository.save(document);

                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "DOCUMENT_SIZE_MISMATCH",
                        "The uploaded document size is invalid."
                );
            }
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "DOCUMENT_STORAGE_UNAVAILABLE",
                    "Document storage is temporarily unavailable."
            );
        }

        // Do not mark a document VALIDATED merely because it exists.
        // A trusted scanner and KYC validation workflow must do that.
        document.markValidated();
        documentRepository.save(document);

        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(String identitySubject) {
        return documentRepository
                .findAllByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(
                        identitySubject)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(
            String identitySubject,
            String documentReferenceId) {

        return toResponse(
                getOwnedDocument(documentReferenceId, identitySubject));
    }

    @Transactional(readOnly = true)
    public String createDownloadUrl(
            String identitySubject,
            String documentReferenceId) {

        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject);

        requireValidated(document);

        return BASE_PATH + "/" + documentReferenceId + "/content";
    }

    @Transactional(readOnly = true)
    public Path getValidatedDocumentPath(
            String identitySubject,
            String documentReferenceId) {

        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject);

        requireValidated(document);

        try {
            if (!storage.exists(document.getStorageKey())) {
                throw new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "DOCUMENT_FILE_NOT_FOUND",
                        "The stored document is unavailable."
                );
            }

            return storage.getPath(document.getStorageKey());
        } catch (IOException ex) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "DOCUMENT_STORAGE_UNAVAILABLE",
                    "Document storage is temporarily unavailable."
            );
        }
    }

    @Transactional
    public void deleteDocument(
            String identitySubject,
            String documentReferenceId) {

        KycDocument document = getOwnedDocument(
                documentReferenceId, identitySubject);

//        if (!"PENDING_UPLOAD".equals(document.getStatus())
//                && !"REJECTED".equals(document.getStatus())) {
//            throw new ApiException(
//                    HttpStatus.CONFLICT,
//                    "DOCUMENT_CANNOT_BE_DELETED",
//                    "This document cannot be deleted in its current state."
//            );
//        }

        try {
            if (document.getStorageKey() != null) {
                storage.delete(document.getStorageKey());
            }
        } catch (IOException | IllegalArgumentException ex) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "DOCUMENT_STORAGE_UNAVAILABLE",
                    "The document could not be deleted from storage."
            );
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

        String contentType = normalizeContentType(request.contentType());

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
                            CustomerProfile.create(customerId, subject));
                });
    }

    private KycDocument getOwnedDocument(
            String reference,
            String subject) {

        return documentRepository
                .findByDocumentReferenceIdAndCustomerProfile_IdentitySubject(
                        reference, subject)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "DOCUMENT_NOT_FOUND",
                        "The requested document was not found."
                ));
    }

    private void requireValidated(KycDocument document) {
        if (!"VALIDATED".equals(document.getStatus())) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "DOCUMENT_NOT_VALIDATED",
                    "Only validated documents can be downloaded."
            );
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }

        int parameterIndex = contentType.indexOf(';');

        return (parameterIndex >= 0
                ? contentType.substring(0, parameterIndex)
                : contentType).trim().toLowerCase(Locale.ROOT);
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