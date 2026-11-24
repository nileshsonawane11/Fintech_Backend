package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountHoldRepository extends JpaRepository<AccountHold, UUID>,
        JpaSpecificationExecutor<AccountHold>,
        AccountHoldRepositoryCustom {

    Optional<AccountHold> findByHoldId(String holdId);

    long countByAccountIdAndHoldStatus(String accountId, HoldStatus holdStatus);

    @Query("SELECT h FROM AccountHold h WHERE " +
           "h.accountId = :accountId AND " +
           "(:status IS NULL OR h.holdStatus = :status) AND " +
           "(:cursor IS NULL OR h.holdId < :cursor) " +
           "ORDER BY h.holdId DESC")
    Slice<AccountHold> findAccountHoldsWithCursor(
            @Param("accountId") String accountId,
            @Param("status") HoldStatus status,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}
