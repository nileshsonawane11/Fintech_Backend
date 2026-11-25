package com.fintech.payment.repository;

import com.fintech.payment.entity.BeneficiaryValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryValidationRepository extends JpaRepository<BeneficiaryValidation, String> {

    Optional<BeneficiaryValidation> findByValidationId(String validationId);

    Optional<BeneficiaryValidation> findByProviderValidationId(String providerValidationId);

    Optional<BeneficiaryValidation> findTopByBeneficiaryIdOrderByCreatedAtDesc(String beneficiaryId);

    List<BeneficiaryValidation> findByBeneficiaryIdOrderByCreatedAtDesc(String beneficiaryId);
}
