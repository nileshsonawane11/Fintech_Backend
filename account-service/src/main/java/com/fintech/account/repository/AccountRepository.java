package com.fintech.account.repository;

import com.fintech.account.entity.Account;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByAccountId(String accountId);

    Optional<Account> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    boolean existsByAccountId(String accountId);

    @Query("SELECT a FROM Account a WHERE " +
           "a.identitySubject = :identitySubject AND " +
           "(:status IS NULL OR a.accountStatus = :status) AND " +
           "(:accountType IS NULL OR a.accountType = :accountType) AND " +
           "(:cursor IS NULL OR a.accountId > :cursor) " +
           "ORDER BY a.accountId ASC")
    Slice<Account> findMyAccountsWithCursor(
            @Param("identitySubject") String identitySubject,
            @Param("status") AccountStatus status,
            @Param("accountType") AccountType accountType,
            @Param("cursor") String cursor,
            Pageable pageable
    );

    @Query("SELECT a FROM Account a WHERE " +
           "(:customerId IS NULL OR a.customerId = :customerId) AND " +
           "(:status IS NULL OR a.accountStatus = :status) AND " +
           "(:accountType IS NULL OR a.accountType = :accountType) AND " +
           "(:cursor IS NULL OR a.accountId > :cursor) " +
           "ORDER BY a.accountId ASC")
    Slice<Account> findOpsAccountsWithCursor(
            @Param("customerId") String customerId,
            @Param("status") AccountStatus status,
            @Param("accountType") AccountType accountType,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}
