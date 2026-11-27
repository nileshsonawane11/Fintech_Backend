package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentDocumentRepository extends JpaRepository<InvestmentDocument, UUID> {
    Optional<InvestmentDocument> findByDocumentId(String documentId);
    List<InvestmentDocument> findByApplicationIdOrderByCreatedAtAsc(String applicationId);
    List<InvestmentDocument> findByVerificationStatusOrderByCreatedAtAsc(String verificationStatus);
}
