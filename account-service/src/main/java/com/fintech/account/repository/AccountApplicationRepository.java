package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountApplicationRepository extends JpaRepository<AccountApplication, UUID> {

    Optional<AccountApplication> findByApplicationNumber(String applicationNumber);

    boolean existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(
            String identitySubject,
            String productCode,
            Collection<ApplicationStatus> statuses
    );

    @Query("SELECT a FROM AccountApplication a WHERE " +
           "a.identitySubject = :identitySubject AND " +
           "(:status IS NULL OR a.applicationStatus = :status) AND " +
           "(:cursor IS NULL OR a.applicationNumber < :cursor) " +
           "ORDER BY a.applicationNumber DESC")
    Slice<AccountApplication> findMyApplicationsWithCursor(
            @Param("identitySubject") String identitySubject,
            @Param("status") ApplicationStatus status,
            @Param("cursor") String cursor,
            Pageable pageable
    );

    @Query("SELECT a FROM AccountApplication a WHERE " +
           "(:status IS NULL OR a.applicationStatus = :status) AND " +
           "(:customerId IS NULL OR a.customerId = :customerId) AND " +
           "(:productCode IS NULL OR a.productCode = :productCode) AND " +
           "(:fromDate IS NULL OR a.submittedAt >= :fromDate) AND " +
           "(:toDate IS NULL OR a.submittedAt <= :toDate) AND " +
           "(:cursor IS NULL OR a.applicationNumber < :cursor) " +
           "ORDER BY a.applicationNumber DESC")
    Slice<AccountApplication> findOpsApplicationsWithCursor(
            @Param("status") ApplicationStatus status,
            @Param("customerId") String customerId,
            @Param("productCode") String productCode,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}
