package com.fintech.ledger.repository;

import com.fintech.ledger.entity.LedgerInboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerInboxEventRepository extends JpaRepository<LedgerInboxEvent, String> {
}
