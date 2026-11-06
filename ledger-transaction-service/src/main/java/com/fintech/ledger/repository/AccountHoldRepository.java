package com.fintech.ledger.repository;

import com.fintech.ledger.entity.AccountHold;
import com.fintech.ledger.enums.HoldStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountHoldRepository extends JpaRepository<AccountHold, UUID> {

    Optional<AccountHold> findByHoldId(String holdId);

    Optional<AccountHold> findByReferenceNumber(String referenceNumber);

    List<AccountHold> findByLedgerAccount_IdAndHoldStatus(UUID ledgerAccountId, HoldStatus status);

    List<AccountHold> findByLedgerAccount_LedgerAccountIdAndHoldStatus(String ledgerAccountId, HoldStatus status);

    List<AccountHold> findByLedgerAccount_AccountReferenceAndHoldStatus(String accountReference, HoldStatus status);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM AccountHold h WHERE h.ledgerAccount.id = :ledgerAccountId AND h.holdStatus = com.fintech.ledger.enums.HoldStatus.ACTIVE")
    BigDecimal sumActiveHoldsByLedgerAccountId(@Param("ledgerAccountId") UUID ledgerAccountId);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM AccountHold h WHERE h.ledgerAccount.ledgerAccountId = :publicLedgerAccountId AND h.holdStatus = com.fintech.ledger.enums.HoldStatus.ACTIVE")
    BigDecimal sumActiveHoldsByPublicLedgerAccountId(@Param("publicLedgerAccountId") String publicLedgerAccountId);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM AccountHold h WHERE h.ledgerAccount.accountReference = :accountReference AND h.holdStatus = com.fintech.ledger.enums.HoldStatus.ACTIVE")
    BigDecimal sumActiveHoldsByAccountReference(@Param("accountReference") String accountReference);

    @Query("SELECT h FROM AccountHold h WHERE " +
           "(:accountId IS NULL OR h.ledgerAccount.accountReference = :accountId) AND " +
           "(:customerId IS NULL OR h.customerId = :customerId) AND " +
           "(:status IS NULL OR h.holdStatus = :status) AND " +
           "(:reasonCode IS NULL OR h.reasonCode = :reasonCode) AND " +
           "(:fromDate IS NULL OR h.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR h.createdAt <= :toDate) " +
           "ORDER BY h.createdAt DESC")
    Page<AccountHold> searchHolds(
            @Param("accountId") String accountId,
            @Param("customerId") UUID customerId,
            @Param("status") HoldStatus status,
            @Param("reasonCode") String reasonCode,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );
}
