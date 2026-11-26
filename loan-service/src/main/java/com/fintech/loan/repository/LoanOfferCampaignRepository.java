package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanOfferCampaign;
import com.fintech.loan.enums.OfferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanOfferCampaignRepository extends JpaRepository<LoanOfferCampaign, UUID> {

    Optional<LoanOfferCampaign> findByOfferCodeIgnoreCase(String offerCode);

    boolean existsByOfferCodeIgnoreCase(String offerCode);

    @Query("""
            SELECT o FROM LoanOfferCampaign o
            WHERE o.status = :status
              AND o.validFrom <= :now
              AND o.validTo >= :now
            ORDER BY o.priority ASC, o.createdAt DESC
            """)
    List<LoanOfferCampaign> findCurrentlyActiveOffers(@Param("status") OfferStatus status, @Param("now") Instant now);

    @Query("""
            SELECT o FROM LoanOfferCampaign o
            WHERE (:status IS NULL OR o.status = :status)
              AND (:search IS NULL OR LOWER(o.offerCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(o.offerName) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<LoanOfferCampaign> findAdminOffers(
            @Param("status") OfferStatus status,
            @Param("search") String search,
            Pageable pageable);
}
