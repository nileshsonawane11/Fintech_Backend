package com.fintech.investment.service;

import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.dto.InvestmentDtos.DocumentResponse;
import com.fintech.investment.entity.InvestmentApplication;
import com.fintech.investment.entity.InvestmentDocument;
import com.fintech.investment.entity.InvestmentEnums.ApplicationStatus;
import com.fintech.investment.entity.InvestmentEnums.InvestmentDocumentType;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.InvestmentApplicationRepository;
import com.fintech.investment.repository.InvestmentDocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class InvestmentDocumentService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg"
    );

    public record DocumentContent(byte[] bytes, String contentType, String fileName) {}

    private final InvestmentApplicationRepository applicationRepository;
    private final InvestmentDocumentRepository documentRepository;
    private final InvestmentApplicationService applicationService;
    private final Path storageRoot;

    public InvestmentDocumentService(
            InvestmentApplicationRepository applicationRepository,
            InvestmentDocumentRepository documentRepository,
            InvestmentApplicationService applicationService,
            @Value("${app.investment.document-storage-path:./data/investment-documents}") String storagePath) {
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
        this.applicationService = applicationService;
        this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    }

    @Transactional
    public DocumentResponse uploadDocument(
            String applicationId,
            InvestmentDocumentType documentType,
            String documentName,
            MultipartFile file) {

        InvestmentApplication app = loadAuthorizedApplication(applicationId);
        if (app.getStatus() == ApplicationStatus.REJECTED || app.getStatus() == ApplicationStatus.CANCELLED) {
            throw ApiException.conflict("INVALID_APPLICATION_STATE",
                    "Cannot upload documents for a " + app.getStatus() + " application.");
        }
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "Document file must not be empty.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "Maximum allowed document size is 10 MB.");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE",
                    "Only PDF, PNG, and JPEG files are supported.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Unable to read uploaded document.");
        }
        validateMagicBytes(contentType, bytes);

        String rawName = (documentName != null && !documentName.isBlank())
                ? documentName
                : (file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");
        String sanitizedFileName = rawName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String docId = "INVDOC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String checksum = sha256Hex(bytes);

        Path appDir = storageRoot.resolve(applicationId).normalize();
        if (!appDir.startsWith(storageRoot)) {
            throw ApiException.badRequest("INVALID_PATH", "Invalid application path.");
        }
        Path targetFile = appDir.resolve(docId + "_" + sanitizedFileName).normalize();
        if (!targetFile.startsWith(appDir)) {
            throw ApiException.badRequest("INVALID_FILE_NAME", "Invalid document file name.");
        }

        try {
            Files.createDirectories(appDir);
            Files.write(targetFile, bytes);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to persist document content", ex);
        }

        InvestmentDocument doc = new InvestmentDocument();
        doc.setDocumentId(docId);
        doc.setApplicationId(applicationId);
        doc.setIdentitySubject(app.getIdentitySubject());
        doc.setDocumentType(documentType.name());
        doc.setFileName(sanitizedFileName);
        doc.setContentType(contentType);
        doc.setFileSizeBytes((long) bytes.length);
        doc.setStorageRef(targetFile.toString());
        doc.setChecksumSha256(checksum);
        doc.setVerificationStatus("PENDING");
        doc = documentRepository.save(doc);

        if (app.getStatus() == ApplicationStatus.SUBMITTED) {
            app.setStatus(ApplicationStatus.DOCUMENT_VERIFICATION);
            applicationRepository.save(app);
        }

        return applicationService.toDocumentResponse(doc);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(String applicationId) {
        loadAuthorizedApplication(applicationId);
        return documentRepository.findByApplicationIdOrderByCreatedAtAsc(applicationId).stream()
                .map(applicationService::toDocumentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(String applicationId, String documentId) {
        loadAuthorizedApplication(applicationId);
        InvestmentDocument doc = loadDocumentForApplication(applicationId, documentId);
        return applicationService.toDocumentResponse(doc);
    }

    @Transactional(readOnly = true)
    public DocumentContent downloadContent(String applicationId, String documentId) {
        loadAuthorizedApplication(applicationId);
        InvestmentDocument doc = loadDocumentForApplication(applicationId, documentId);
        Path filePath = Path.of(doc.getStorageRef()).toAbsolutePath().normalize();
        if (!filePath.startsWith(storageRoot) || !Files.exists(filePath)) {
            throw ApiException.notFound("DOCUMENT_CONTENT_NOT_FOUND",
                    "Binary content not available for document: " + documentId);
        }
        try {
            byte[] bytes = Files.readAllBytes(filePath);
            return new DocumentContent(bytes, doc.getContentType(), doc.getFileName());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read document binary content", ex);
        }
    }

    @Transactional
    public void deleteDocument(String applicationId, String documentId) {
        loadAuthorizedApplication(applicationId);
        InvestmentDocument doc = loadDocumentForApplication(applicationId, documentId);
        if ("VERIFIED".equalsIgnoreCase(doc.getVerificationStatus())) {
            throw ApiException.conflict("DOCUMENT_ALREADY_VERIFIED",
                    "Verified documents cannot be deleted.");
        }
        Path filePath = Path.of(doc.getStorageRef()).toAbsolutePath().normalize();
        if (filePath.startsWith(storageRoot)) {
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException ignored) {
            }
        }
        documentRepository.delete(doc);
    }

    private InvestmentApplication loadAuthorizedApplication(String applicationId) {
        InvestmentApplication app = applicationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND",
                        "Investment application not found: " + applicationId));
        String subject = SecurityUtils.getAuthenticatedSubject();
        if (!app.getIdentitySubject().equals(subject) && !SecurityUtils.isStaffRole()) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have access to this application's documents.");
        }
        return app;
    }

    private InvestmentDocument loadDocumentForApplication(String applicationId, String documentId) {
        InvestmentDocument doc = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> ApiException.notFound("DOCUMENT_NOT_FOUND",
                        "Investment document not found: " + documentId));
        if (!doc.getApplicationId().equals(applicationId)) {
            throw ApiException.notFound("DOCUMENT_NOT_FOUND",
                    "Document " + documentId + " does not belong to application " + applicationId);
        }
        return doc;
    }

    private void validateMagicBytes(String contentType, byte[] bytes) {
        if (bytes.length < 4) {
            throw ApiException.badRequest("INVALID_FILE_CONTENT", "Uploaded file is corrupted or too small.");
        }
        boolean valid = switch (contentType) {
            case "application/pdf" -> bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
            case "image/png" -> (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G';
            case "image/jpeg" -> (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
            default -> false;
        };
        if (!valid) {
            throw ApiException.badRequest("FILE_SIGNATURE_MISMATCH",
                    "Uploaded file binary signature does not match declared Content-Type: " + contentType);
        }
    }

    private String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
