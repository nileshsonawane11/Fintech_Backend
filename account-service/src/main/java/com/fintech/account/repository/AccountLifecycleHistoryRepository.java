package com.fintech.account.repository;

import com.fintech.account.entity.AccountLifecycleHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AccountLifecycleHistoryRepository extends JpaRepository<AccountLifecycleHistory, UUID> {

    List<AccountLifecycleHistory> findByAccountIdOrderByChangedAtDesc(String accountId);
}
