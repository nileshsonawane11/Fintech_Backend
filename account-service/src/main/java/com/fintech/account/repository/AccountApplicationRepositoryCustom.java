package com.fintech.account.repository;

import com.fintech.account.entity.AccountApplication;
import com.fintech.account.enums.ApplicationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.time.Instant;

public interface AccountApplicationRepositoryCustom {

    Slice<AccountApplication> findOpsApplicationsWithCursor(
            ApplicationStatus status,
            String customerId,
            String productCode,
            Instant fromDate,
            Instant toDate,
            String cursor,
            Pageable pageable
    );
}
