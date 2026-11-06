package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LedgerBalanceSnapshotRepository extends JpaRepository<LedgerBalanceSnapshot, UUID> {

    Optional<LedgerBalanceSnapshot> findByLedgerAccount(LedgerAccount ledgerAccount);

    Optional<LedgerBalanceSnapshot> findByLedgerAccount_Id(UUID ledgerAccountId);

    Optional<LedgerBalanceSnapshot> findByLedgerAccount_LedgerAccountId(String ledgerAccountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LedgerBalanceSnapshot s WHERE s.ledgerAccount.id = :ledgerAccountId")
    Optional<LedgerBalanceSnapshot> findWithLockByLedgerAccountId(@Param("ledgerAccountId") UUID ledgerAccountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LedgerBalanceSnapshot s WHERE s.ledgerAccount.ledgerAccountId = :publicLedgerAccountId")
    Optional<LedgerBalanceSnapshot> findWithLockByPublicLedgerAccountId(@Param("publicLedgerAccountId") String publicLedgerAccountId);
}
