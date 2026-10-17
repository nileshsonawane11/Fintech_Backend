package com.fintech.customer.repository;

import com.fintech.customer.model.KycDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KycDocumentRepository
        extends JpaRepository<KycDocument, UUID> {

    Optional<KycDocument>
    findByDocumentReferenceIdAndCustomerProfile_IdentitySubject(
            String documentReferenceId,
            String identitySubject
    );

    List<KycDocument>
    findAllByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(
            String identitySubject
    );
}