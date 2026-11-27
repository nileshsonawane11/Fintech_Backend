package com.fintech.investment.repository;

import com.fintech.investment.entity.Investment;
import com.fintech.investment.entity.InvestmentEnums.InvestmentStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentRepository extends JpaRepository<Investment, UUID> {
    Optional<Investment> findByInvestmentId(String investmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Investment i WHERE i.investmentId = :investmentId")
    Optional<Investment> findWithLockByInvestmentId(@Param("investmentId") String investmentId);

    List<Investment> findByIdentitySubjectOrderByCreatedAtDesc(String identitySubject);
    List<Investment> findByStatusAndMaturityDateLessThanEqual(InvestmentStatus status, LocalDate date);
    List<Investment> findByStatusAndMaturityDateBetween(InvestmentStatus status, LocalDate from, LocalDate to);
    List<Investment> findByFundingAccountIdAndStatusIn(String fundingAccountId, List<InvestmentStatus> statuses);

    long countByIdentitySubjectAndProductTypeAndStatusIn(
            String identitySubject, ProductType productType, List<InvestmentStatus> statuses);

    boolean existsByIdentitySubjectAndProductTypeAndSsyGirlChildNameIgnoreCaseAndSsyGirlChildDobAndStatusIn(
            String identitySubject, ProductType productType, String girlChildName, LocalDate dob, List<InvestmentStatus> statuses);

    @Query("SELECT COALESCE(SUM(i.totalInvested), 0) FROM Investment i WHERE i.productCode = :productCode AND i.status = 'ACTIVE'")
    BigDecimal sumActiveInvestedByProductCode(@Param("productCode") String productCode);

    long countByProductCodeAndStatus(String productCode, InvestmentStatus status);
}
