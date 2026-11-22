package com.fintech.account.repository;

import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.HoldStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.time.Instant;

public interface AccountHoldRepositoryCustom {

    Slice<AccountHold> findOpsHoldsWithCursor(
            String accountId,
            HoldStatus status,
            String reasonCode,
            Instant fromDate,
            Instant toDate,
            String cursor,
            Pageable pageable
    );

    default Slice<AccountHold> findOpsHoldsWithCursor(
            String accountId,
            String customerId,
            HoldStatus status,
            String reasonCode,
            Instant fromDate,
            Instant toDate,
            String cursor,
            Pageable pageable
    ) {
        return findOpsHoldsWithCursor(accountId, status, reasonCode, fromDate, toDate, cursor, pageable);
    }
}
