package com.fintech.ledger.repository;

import com.fintech.ledger.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, UUID> {

    Optional<IdempotencyRecord> findByIdempotencyKey(String idempotencyKey);

    Optional<IdempotencyRecord> findByIdempotencyKeyAndOperation(String idempotencyKey, String operation);
}
