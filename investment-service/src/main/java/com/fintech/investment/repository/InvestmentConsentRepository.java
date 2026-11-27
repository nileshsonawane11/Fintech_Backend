package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentConsent;
import com.fintech.investment.entity.InvestmentDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvestmentConsentRepository extends JpaRepository<InvestmentConsent, UUID> {
    List<InvestmentConsent> findByApplicationId(String applicationId);
}
