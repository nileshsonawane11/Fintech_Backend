package com.fintech.payment.repository;

import com.fintech.payment.entity.Beneficiary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, String> {

    Optional<Beneficiary> findByBeneficiaryId(String beneficiaryId);

    Optional<Beneficiary> findByBeneficiaryIdAndUserId(String beneficiaryId, String userId);

    Page<Beneficiary> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<Beneficiary> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status);

    Optional<Beneficiary> findByProviderFundAccountId(String providerFundAccountId);

    boolean existsByUserIdAndAccountNumberAndIfscCode(String userId, String accountNumber, String ifscCode);

    boolean existsByUserIdAndAccountNumberHashAndIfscCodeAndStatusNot(
            String userId, String accountNumberHash, String ifscCode, String status);

    boolean existsByUserIdAndVpaHashAndStatusNot(String userId, String vpaHash, String status);
}
