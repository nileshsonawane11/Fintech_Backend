package com.fintech.ledger.client;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountServiceClient {

    AccountDetailsDto getAccount(String accountId);

    Optional<AccountDetailsDto> findAccount(String accountId);

    AccountDetailsDto validateAccountEligible(String accountId, String expectedCurrency);

    void validateCustomerOwnership(String accountId, String identitySubject);

    boolean verifyAccountOwnership(String accountId, String identitySubject);

    boolean isAccountEligibleForTransfers(String accountId);

    List<AccountHoldDto> getAccountHolds(String accountId, String status);

    BigDecimal getActiveHoldAmount(String accountId);
}
