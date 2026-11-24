package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountApplicationRepository extends JpaRepository<AccountApplication, UUID>,
        JpaSpecificationExecutor<AccountApplication>,
        AccountApplicationRepositoryCustom {

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
}
