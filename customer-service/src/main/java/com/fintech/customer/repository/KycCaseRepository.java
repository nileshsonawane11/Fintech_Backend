package com.fintech.customer.repository;

import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycCaseRepository extends JpaRepository<KycCase, UUID> {

    // 1. Changed 'String kycCaseId' to 'UUID id' to match the JpaRepository<KycCase, UUID> signature.
    // If your entity field is literally named 'kycCaseId' instead of 'id', change this to findByKycCaseIdAnd...
    Optional<KycCase> findByIdAndCustomerProfile_IdentitySubject(
            UUID id,
            String identitySubject
    );

    // 2. Traverses KycCase -> CustomerProfile -> identitySubject
    List<KycCase> findAllByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(
            String identitySubject
    );

    // 3. Traverses KycCase -> CustomerProfile -> identitySubject
    Optional<KycCase> findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(
            String identitySubject
    );

    // 4. Cleaned up inline fully qualified package names using imports
    boolean existsByCustomerProfile_IdAndStatusIn(
            UUID customerProfileId,
            Collection<KycStatus> statuses
    );
}