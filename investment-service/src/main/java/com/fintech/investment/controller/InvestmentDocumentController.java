package com.fintech.investment.controller;

import com.fintech.investment.dto.InvestmentDtos.DocumentResponse;
import com.fintech.investment.dto.InvestmentDtos.DocumentUploadRequest;
import com.fintech.investment.entity.InvestmentEnums.InvestmentDocumentType;
import com.fintech.investment.service.InvestmentApplicationService;
import com.fintech.investment.service.InvestmentDocumentService;
import com.fintech.investment.service.InvestmentDocumentService.DocumentContent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/investments/applications/{applicationId}/documents")
@Tag(name = "Investment Documents", description = "Upload, list, inspect status, and download supporting documents for investment applications")
public class InvestmentDocumentController {

    private final InvestmentDocumentService documentService;
    private final InvestmentApplicationService applicationService;

    public InvestmentDocumentController(
            InvestmentDocumentService documentService,
            InvestmentApplicationService applicationService) {
        this.documentService = documentService;
        this.applicationService = applicationService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Direct Investment Document Upload",
            description = "Upload supporting document binary payload (PDF, PNG, JPEG up to 10 MB) for an investment application in a single multipart request"
    )
    public DocumentResponse uploadDocument(
            @Parameter(description = "Investment application ID (e.g. INVAPP-XXXXXXXX)")
            @PathVariable String applicationId,
            @Parameter(description = "Document type required for the investment product", required = true)
            @RequestParam("documentType") InvestmentDocumentType documentType,
            @Parameter(description = "Logical document name", required = true)
            @RequestParam("documentName") String documentName,
            @RequestPart("file") MultipartFile file) {
        return documentService.uploadDocument(applicationId, documentType, documentName, file);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Attach Document Metadata",
            description = "Attach pre-uploaded document metadata to an investment application"
    )
    public DocumentResponse attachMetadata(
            @PathVariable String applicationId,
            @Valid @RequestBody DocumentUploadRequest request) {
        return applicationService.attachDocument(applicationId, request);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "List Application Documents",
            description = "List all uploaded documents and their verification statuses for the given investment application"
    )
    public List<DocumentResponse> listDocuments(@PathVariable String applicationId) {
        return documentService.listDocuments(applicationId);
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get Document Metadata & Verification Status",
            description = "Retrieve metadata and verification status for a specific investment application document"
    )
    public DocumentResponse getDocument(
            @PathVariable String applicationId,
            @PathVariable String documentId) {
        return documentService.getDocument(applicationId, documentId);
    }

    @GetMapping("/{documentId}/content")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Download Document Binary Content",
            description = "Download the binary payload of an uploaded investment application document"
    )
    public ResponseEntity<byte[]> downloadContent(
            @PathVariable String applicationId,
            @PathVariable String documentId) {
        DocumentContent content = documentService.downloadContent(applicationId, documentId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(content.contentType()));
        headers.setContentDisposition(ContentDisposition.attachment().filename(content.fileName()).build());
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(content.bytes(), headers, HttpStatus.OK);
    }

    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Delete Pending/Rejected Document",
            description = "Delete an unverified or rejected document from an investment application"
    )
    public void deleteDocument(
            @PathVariable String applicationId,
            @PathVariable String documentId) {
        documentService.deleteDocument(applicationId, documentId);
    }
}
