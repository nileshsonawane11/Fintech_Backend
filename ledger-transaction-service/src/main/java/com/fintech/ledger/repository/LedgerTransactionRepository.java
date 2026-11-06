package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
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
public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {

    Optional<LedgerTransaction> findByTransactionId(String transactionId);

    Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);

    Optional<LedgerTransaction> findByReferenceNumber(String referenceNumber);

    @Query("SELECT DISTINCT t FROM LedgerTransaction t " +
           "JOIN LedgerEntry e ON e.transaction = t " +
           "WHERE e.ledgerAccount.id = :ledgerAccountId " +
           "AND (:fromDate IS NULL OR t.valueDate >= :fromDate) " +
           "AND (:toDate IS NULL OR t.valueDate <= :toDate) " +
           "AND (:txType IS NULL OR t.transactionType = :txType) " +
           "AND (:status IS NULL OR t.transactionStatus = :status) " +
           "AND (:minAmount IS NULL OR t.totalDebit >= :minAmount) " +
           "AND (:maxAmount IS NULL OR t.totalDebit <= :maxAmount) " +
           "ORDER BY t.createdAt DESC")
    Page<LedgerTransaction> findByAccountAndFilters(
            @Param("ledgerAccountId") UUID ledgerAccountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("txType") TransactionType txType,
            @Param("status") TransactionStatus status,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            Pageable pageable
    );

    @Query("SELECT DISTINCT t FROM LedgerTransaction t " +
           "JOIN LedgerEntry e ON e.transaction = t " +
           "WHERE e.ledgerAccount.customerId = :customerId " +
           "AND (:accountId IS NULL OR e.ledgerAccount.accountReference = :accountId) " +
           "AND (:fromDate IS NULL OR t.valueDate >= :fromDate) " +
           "AND (:toDate IS NULL OR t.valueDate <= :toDate) " +
           "AND (:txType IS NULL OR t.transactionType = :txType) " +
           "AND (:status IS NULL OR t.transactionStatus = :status) " +
           "ORDER BY t.createdAt DESC")
    Page<LedgerTransaction> findByCustomerAndFilters(
            @Param("customerId") UUID customerId,
            @Param("accountId") String accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("txType") TransactionType txType,
            @Param("status") TransactionStatus status,
            Pageable pageable
    );

    @Query("SELECT t FROM LedgerTransaction t WHERE " +
           "(:transactionId IS NULL OR t.transactionId = :transactionId) AND " +
           "(:referenceNumber IS NULL OR t.referenceNumber = :referenceNumber) AND " +
           "(:txType IS NULL OR t.transactionType = :txType) AND " +
           "(:status IS NULL OR t.transactionStatus = :status) AND " +
           "(:fromDate IS NULL OR t.valueDate >= :fromDate) AND " +
           "(:toDate IS NULL OR t.valueDate <= :toDate) AND " +
           "(:minAmount IS NULL OR t.totalDebit >= :minAmount) AND " +
           "(:maxAmount IS NULL OR t.totalDebit <= :maxAmount) " +
           "ORDER BY t.createdAt DESC")
    Page<LedgerTransaction> searchOperations(
            @Param("transactionId") String transactionId,
            @Param("referenceNumber") String referenceNumber,
            @Param("txType") TransactionType txType,
            @Param("status") TransactionStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            Pageable pageable
    );

    @Query("SELECT t FROM LedgerTransaction t WHERE t.transactionType = 'TRANSFER' " +
           "ORDER BY t.createdAt DESC")
    Page<LedgerTransaction> findTransfers(Pageable pageable);
}
