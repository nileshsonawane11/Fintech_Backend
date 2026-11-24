package com.fintech.ledger.repository;

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

    Optional<LedgerBalanceSnapshot> findByAccountId(String accountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LedgerBalanceSnapshot s WHERE s.accountId = :accountId")
    Optional<LedgerBalanceSnapshot> findWithLockByAccountId(@Param("accountId") String accountId);

    void deleteByAccountId(String accountId);
}
