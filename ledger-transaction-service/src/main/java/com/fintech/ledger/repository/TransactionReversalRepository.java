package com.fintech.ledger.repository;

import com.fintech.ledger.entity.TransactionReversal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionReversalRepository extends JpaRepository<TransactionReversal, UUID> {

    Optional<TransactionReversal> findByOriginalTransaction_Id(UUID originalTransactionId);

    Optional<TransactionReversal> findByOriginalTransaction_TransactionId(String transactionId);

    Optional<TransactionReversal> findByReversalTransaction_TransactionId(String reversalTransactionId);

    boolean existsByOriginalTransaction_Id(UUID originalTransactionId);

    boolean existsByOriginalTransaction_TransactionId(String transactionId);

    Page<TransactionReversal> findAllByOrderByReversedAtDesc(Pageable pageable);
}
