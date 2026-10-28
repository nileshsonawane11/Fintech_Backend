package com.fintech.payment.repository;

import com.fintech.payment.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, String> {

    Optional<Beneficiary> findByBeneficiaryId(String beneficiaryId);

    Optional<Beneficiary> findByBeneficiaryIdAndUserId(String beneficiaryId, String userId);

    boolean existsByUserIdAndAccountNumberAndIfscCode(String userId, String accountNumber, String ifscCode);
}
