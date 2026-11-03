package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountHoldRepository extends JpaRepository<AccountHold, UUID> {

    Optional<AccountHold> findByHoldId(String holdId);

    long countByAccountIdAndHoldStatus(String accountId, HoldStatus holdStatus);

    @Query("SELECT h FROM AccountHold h WHERE " +
           "h.accountId = :accountId AND " +
           "(:status IS NULL OR h.holdStatus = :status) AND " +
           "(:cursor IS NULL OR h.holdId < :cursor) " +
           "ORDER BY h.holdId DESC")
    Slice<AccountHold> findAccountHoldsWithCursor(
            @Param("accountId") String accountId,
            @Param("status") HoldStatus status,
            @Param("cursor") String cursor,
            Pageable pageable
    );

    @Query("SELECT h FROM AccountHold h WHERE " +
           "(:accountId IS NULL OR h.accountId = :accountId) AND " +
           "(:status IS NULL OR h.holdStatus = :status) AND " +
           "(:reasonCode IS NULL OR h.reasonCode = :reasonCode) AND " +
           "(:fromDate IS NULL OR h.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR h.createdAt <= :toDate) AND " +
           "(:cursor IS NULL OR h.holdId < :cursor) " +
           "ORDER BY h.holdId DESC")
    Slice<AccountHold> findOpsHoldsWithCursor(
            @Param("accountId") String accountId,
            @Param("status") HoldStatus status,
            @Param("reasonCode") String reasonCode,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}
