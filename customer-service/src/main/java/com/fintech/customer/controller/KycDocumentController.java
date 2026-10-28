package com.fintech.customer.controller;

import com.fintech.customer.service.KycDocumentService;
import com.fintech.customer.dto.request.DocumentUploadRequest;
import com.fintech.customer.dto.response.DocumentResponse;
import com.fintech.customer.dto.response.DocumentUploadResponse;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers/me/kyc/documents")
public class KycDocumentController {

    private final KycDocumentService documentService;

    public KycDocumentController(KycDocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<DocumentUploadResponse> createUpload(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DocumentUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.createUpload(
                        jwt.getSubject(), request
                ));
    }

    @PostMapping("/{documentReferenceId}/complete")
    public DocumentResponse completeUpload(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return documentService.completeUpload(
                jwt.getSubject(), documentReferenceId
        );
    }

    @GetMapping
    public List<DocumentResponse> listDocuments(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.listDocuments(jwt.getSubject());
    }

    @GetMapping("/{documentReferenceId}")
    public DocumentResponse getDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return documentService.getDocument(
                jwt.getSubject(), documentReferenceId
        );
    }

    @PostMapping("/{documentReferenceId}/download-url")
    public Map<String, String> createDownloadUrl(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return Map.of(
                "downloadUrl",
                documentService.createDownloadUrl(
                        jwt.getSubject(), documentReferenceId
                )
        );
    }

    @DeleteMapping("/{documentReferenceId}")
    public ResponseEntity<Void> deleteDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        documentService.deleteDocument(
                jwt.getSubject(), documentReferenceId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{documentReferenceId}/content")
    public ResponseEntity<Void> uploadContent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId,
            @RequestHeader(HttpHeaders.CONTENT_TYPE) String contentType,
            @RequestBody byte[] content) {

        documentService.uploadContent(
                jwt.getSubject(),
                documentReferenceId,
                contentType,
                content
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentReferenceId}/content")
    public ResponseEntity<Resource> downloadContent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("documentReferenceId") String documentReferenceId) {

        Path path = documentService.getValidatedDocumentPath(
                jwt.getSubject(),
                documentReferenceId
        );

        DocumentResponse document = documentService.getDocument(
                jwt.getSubject(),
                documentReferenceId
        );

        Resource resource = new FileSystemResource(path);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        document.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(
                                        document.fileName(),
                                        StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(resource);
    }
}