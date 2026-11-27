package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentRateSlab;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface InvestmentRateSlabRepository extends JpaRepository<InvestmentRateSlab, UUID> {

    List<InvestmentRateSlab> findByProductIdAndActiveTrueOrderByMinTenureDaysAscMinAmountAsc(UUID productId);

    @Query("""
            SELECT s FROM InvestmentRateSlab s
            WHERE s.productId = :productId
              AND s.active = true
              AND s.effectiveFrom <= :asOf
              AND (s.effectiveTo IS NULL OR s.effectiveTo >= :asOf)
              AND s.minTenureDays <= :tenureDays
              AND s.maxTenureDays >= :tenureDays
              AND s.minAmount <= :amount
              AND s.maxAmount >= :amount
            ORDER BY s.effectiveFrom DESC, s.interestRate DESC
            """)
    List<InvestmentRateSlab> findMatchingSlabs(
            @Param("productId") UUID productId,
            @Param("asOf") LocalDate asOf,
            @Param("tenureDays") int tenureDays,
            @Param("amount") BigDecimal amount
    );
}
