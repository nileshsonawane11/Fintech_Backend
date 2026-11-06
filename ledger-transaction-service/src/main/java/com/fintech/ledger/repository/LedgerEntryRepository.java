package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.enums.EntryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    Optional<LedgerEntry> findByEntryId(String entryId);

    List<LedgerEntry> findByTransaction_Id(UUID transactionId);

    List<LedgerEntry> findByTransaction_TransactionId(String transactionId);

    List<LedgerEntry> findByLedgerAccount_Id(UUID ledgerAccountId);

    Page<LedgerEntry> findByLedgerAccount_LedgerAccountId(String ledgerAccountId, Pageable pageable);

    @Query("SELECT e FROM LedgerEntry e WHERE e.ledgerAccount.ledgerAccountId = :ledgerAccountId " +
           "AND (:fromDate IS NULL OR e.valueDate >= :fromDate) " +
           "AND (:toDate IS NULL OR e.valueDate <= :toDate) " +
           "ORDER BY e.createdAt DESC")
    Page<LedgerEntry> findByLedgerAccountIdAndDates(
            @Param("ledgerAccountId") String ledgerAccountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.ledgerAccount.id = :accountId AND e.entryType = com.fintech.ledger.enums.EntryType.DEBIT")
    BigDecimal sumDebitsByAccountId(@Param("accountId") UUID accountId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.ledgerAccount.id = :accountId AND e.entryType = com.fintech.ledger.enums.EntryType.CREDIT")
    BigDecimal sumCreditsByAccountId(@Param("accountId") UUID accountId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.entryType = com.fintech.ledger.enums.EntryType.DEBIT")
    BigDecimal sumTotalSystemDebits();

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.entryType = com.fintech.ledger.enums.EntryType.CREDIT")
    BigDecimal sumTotalSystemCredits();

    @Query("SELECT e FROM LedgerEntry e WHERE e.ledgerAccount.id = :accountId ORDER BY e.createdAt DESC")
    List<LedgerEntry> findLatestByAccountId(@Param("accountId") UUID accountId, Pageable pageable);
}
