package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    Optional<LedgerEntry> findByEntryId(String entryId);

    List<LedgerEntry> findByTransaction_Id(UUID transactionId);

    List<LedgerEntry> findByTransaction_TransactionId(String transactionId);

    List<LedgerEntry> findByAccountId(String accountId);

    Page<LedgerEntry> findByAccountId(String accountId, Pageable pageable);

    @Query(value = "SELECT e FROM LedgerEntry e JOIN FETCH e.transaction t WHERE e.accountId = :accountId " +
                   "AND (:fromDate IS NULL OR e.valueDate >= :fromDate) " +
                   "AND (:toDate IS NULL OR e.valueDate <= :toDate) " +
                   "ORDER BY e.createdAt DESC, e.id DESC",
           countQuery = "SELECT COUNT(e) FROM LedgerEntry e WHERE e.accountId = :accountId " +
                        "AND (:fromDate IS NULL OR e.valueDate >= :fromDate) " +
                        "AND (:toDate IS NULL OR e.valueDate <= :toDate)")
    Page<LedgerEntry> findByAccountIdAndDates(
            @Param("accountId") String accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.accountId = :accountId AND e.entryType = com.fintech.ledger.enums.EntryType.DEBIT")
    BigDecimal sumDebitsByAccountId(@Param("accountId") String accountId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.accountId = :accountId AND e.entryType = com.fintech.ledger.enums.EntryType.CREDIT")
    BigDecimal sumCreditsByAccountId(@Param("accountId") String accountId);

    @Query("SELECT COALESCE(SUM(CASE WHEN e.entryType = com.fintech.ledger.enums.EntryType.DEBIT THEN e.amount ELSE 0 END), 0) " +
           "FROM LedgerEntry e WHERE e.accountId = :accountId AND e.createdAt <= :createdAt")
    BigDecimal sumDebitsUpTo(@Param("accountId") String accountId,
                            @Param("createdAt") Instant createdAt);

    @Query("SELECT COALESCE(SUM(CASE WHEN e.entryType = com.fintech.ledger.enums.EntryType.CREDIT THEN e.amount ELSE 0 END), 0) " +
           "FROM LedgerEntry e WHERE e.accountId = :accountId AND e.createdAt <= :createdAt")
    BigDecimal sumCreditsUpTo(@Param("accountId") String accountId,
                             @Param("createdAt") Instant createdAt);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.entryType = com.fintech.ledger.enums.EntryType.DEBIT")
    BigDecimal sumTotalSystemDebits();

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.entryType = com.fintech.ledger.enums.EntryType.CREDIT")
    BigDecimal sumTotalSystemCredits();

    @Query("SELECT e FROM LedgerEntry e WHERE e.accountId = :accountId ORDER BY e.createdAt DESC")
    List<LedgerEntry> findLatestByAccountId(@Param("accountId") String accountId, Pageable pageable);

    @Query("SELECT DISTINCT e.accountId FROM LedgerEntry e")
    List<String> findDistinctAccountIds();
}
