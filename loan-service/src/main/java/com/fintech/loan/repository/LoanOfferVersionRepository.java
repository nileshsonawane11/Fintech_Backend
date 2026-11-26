package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanOfferVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanOfferVersionRepository extends JpaRepository<LoanOfferVersion, UUID> {

    List<LoanOfferVersion> findByOfferIdOrderByVersionNumberDesc(UUID offerId);

    Optional<LoanOfferVersion> findByOfferIdAndVersionNumber(UUID offerId, Integer versionNumber);
}
