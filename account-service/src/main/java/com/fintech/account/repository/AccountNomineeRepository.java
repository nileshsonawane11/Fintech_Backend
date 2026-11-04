package com.fintech.account.repository;

import com.fintech.account.entity.AccountNominee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountNomineeRepository extends JpaRepository<AccountNominee, UUID> {

    List<AccountNominee> findByAccountId(String accountId);

    Optional<AccountNominee> findByIdAndAccountId(UUID id, String accountId);

    @Query("SELECT COALESCE(SUM(n.allocationPercentage), 0) FROM AccountNominee n WHERE n.accountId = :accountId")
    Integer getTotalAllocationPercentage(@Param("accountId") String accountId);

    @Query("SELECT COALESCE(SUM(n.allocationPercentage), 0) FROM AccountNominee n WHERE n.accountId = :accountId AND n.id <> :excludeId")
    Integer getTotalAllocationPercentageExcluding(@Param("accountId") String accountId, @Param("excludeId") UUID excludeId);
}
