package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentApplication;
import com.fintech.investment.entity.InvestmentEnums.ApplicationStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentApplicationRepository extends JpaRepository<InvestmentApplication, UUID> {
    Optional<InvestmentApplication> findByApplicationId(String applicationId);
    List<InvestmentApplication> findByIdentitySubjectOrderByCreatedAtDesc(String identitySubject);
    List<InvestmentApplication> findByStatusInOrderByCreatedAtDesc(List<ApplicationStatus> statuses);
    List<InvestmentApplication> findAllByOrderByCreatedAtDesc();
    long countByIdentitySubjectAndProductTypeAndStatusIn(
            String identitySubject, ProductType productType, List<ApplicationStatus> statuses);
}
