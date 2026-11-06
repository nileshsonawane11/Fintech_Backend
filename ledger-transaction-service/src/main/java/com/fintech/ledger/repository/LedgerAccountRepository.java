package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LedgerAccountRepository extends JpaRepository<LedgerAccount, UUID> {

    Optional<LedgerAccount> findByLedgerAccountId(String ledgerAccountId);

    Optional<LedgerAccount> findByAccountReference(String accountReference);

    Optional<LedgerAccount> findByBankAccountId(UUID bankAccountId);

    List<LedgerAccount> findByCustomerId(UUID customerId);

    boolean existsByLedgerAccountId(String ledgerAccountId);

    boolean existsByAccountReference(String accountReference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM LedgerAccount a WHERE a.id = :id")
    Optional<LedgerAccount> findWithLockById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM LedgerAccount a WHERE a.ledgerAccountId = :ledgerAccountId")
    Optional<LedgerAccount> findWithLockByLedgerAccountId(@Param("ledgerAccountId") String ledgerAccountId);

    @Query("SELECT a FROM LedgerAccount a WHERE " +
           "(:accountType IS NULL OR a.accountType = :accountType) AND " +
           "(:accountSubtype IS NULL OR a.accountSubtype = :accountSubtype) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:currency IS NULL OR a.currency = :currency) AND " +
           "(:customerId IS NULL OR a.customerId = :customerId)")
    Page<LedgerAccount> searchAccounts(
            @Param("accountType") AccountType accountType,
            @Param("accountSubtype") AccountSubtype accountSubtype,
            @Param("status") AccountStatus status,
            @Param("currency") String currency,
            @Param("customerId") UUID customerId,
            Pageable pageable
    );
}
