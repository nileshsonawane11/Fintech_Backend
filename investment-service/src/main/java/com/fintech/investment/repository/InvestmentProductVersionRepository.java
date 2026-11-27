package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentProductVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvestmentProductVersionRepository extends JpaRepository<InvestmentProductVersion, UUID> {
    List<InvestmentProductVersion> findByProductIdOrderByVersionNumberDesc(UUID productId);
}
