package com.fintech.customer.controller;

import com.fintech.customer.dto.request.DirectDocumentUploadRequest;
import com.fintech.customer.model.document.DocumentType;
import com.fintech.customer.service.KycDocumentService;
import com.fintech.customer.dto.request.DocumentUploadRequest;
import com.fintech.customer.dto.response.DocumentResponse;
import com.fintech.customer.dto.response.DocumentUploadResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers/me/kyc/documents")
@Tag(name = "KYC Documents", description = "Endpoints for customer KYC identity document uploads and downloads")
@SecurityRequirement(name = "BearerAuth")
public class KycDocumentController {

    private final KycDocumentService documentService;

    public KycDocumentController(KycDocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    @Operation(summary = "Initiate Document Upload", description = "Create metadata session for uploading a new KYC identity document")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Document upload initiated"),
            @ApiResponse(responseCode = "400", description = "Invalid document metadata")
    })
    public ResponseEntity<DocumentUploadResponse> createUpload(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DocumentUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.createUpload(
                        jwt.getSubject(), request
                ));
    }

    @PostMapping("/{documentReferenceId}/complete")
    @Operation(summary = "Complete Document Upload", description = "Mark document upload as complete and trigger anti-virus/integrity scanning")
    public DocumentResponse completeUpload(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return documentService.completeUpload(
                jwt.getSubject(), documentReferenceId
        );
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Direct Document Upload", description = "Upload document payload directly in a single multipart-compatible request")
    public DocumentResponse processDirectUpload(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("documentType") DocumentType documentType,
            @RequestParam("documentName") String documentName,
            @RequestPart("file") MultipartFile file
    ) throws IOException {

        DirectDocumentUploadRequest request = new DirectDocumentUploadRequest();

        request.setDocumentType(documentType);
        request.setFileName(documentName);
        request.setContentType(file.getContentType());
        request.setContentSizeBytes(file.getSize());

        DocumentUploadRequest command = new DocumentUploadRequest(
                request.getDocumentType(),
                request.getFileName(),
                request.getContentType(),
                request.getContentSizeBytes()
        );

        return documentService.processDirectUpload(
                jwt.getSubject(),
                command,
                file.getBytes()
        );
    }

    @GetMapping
    @Operation(summary = "List Uploaded Documents", description = "List all identity documents uploaded by the authenticated customer")
    public List<DocumentResponse> listDocuments(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.listDocuments(jwt.getSubject());
    }

    @GetMapping("/{documentReferenceId}")
    @Operation(summary = "Get Document Metadata", description = "Retrieve metadata and validation status of a specific document")
    public DocumentResponse getDocument(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return documentService.getDocument(
                jwt.getSubject(), documentReferenceId
        );
    }

    @PostMapping("/{documentReferenceId}/download-url")
    @Operation(summary = "Generate Secure Download URL", description = "Generate a presigned time-limited download URL for a document")
    public Map<String, String> createDownloadUrl(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        return Map.of(
                "downloadUrl",
                documentService.createDownloadUrl(
                        jwt.getSubject(), documentReferenceId
                )
        );
    }

    @DeleteMapping("/{documentReferenceId}")
    @Operation(summary = "Delete Document", description = "Delete an uploaded document prior to KYC finalization")
    public ResponseEntity<Void> deleteDocument(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId
    ) {
        documentService.deleteDocument(
                jwt.getSubject(), documentReferenceId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{documentReferenceId}/content")
    @Operation(summary = "Upload Document Binary Content", description = "Stream document file bytes into the storage backend")
    public ResponseEntity<Void> uploadContent(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId,
            @RequestHeader(HttpHeaders.CONTENT_TYPE) String contentType,
            @RequestBody byte[] content
    ) {

        documentService.uploadContent(
                jwt.getSubject(),
                documentReferenceId,
                contentType,
                content
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentReferenceId}/content")
    @Operation(summary = "Download Document Binary Content", description = "Download raw file bytes of the verified identity document")
    public ResponseEntity<Resource> downloadContent(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Document reference UUID") @PathVariable("documentReferenceId") String documentReferenceId) {

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
