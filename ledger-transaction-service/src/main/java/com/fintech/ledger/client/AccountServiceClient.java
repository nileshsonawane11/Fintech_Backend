package com.fintech.ledger.client;

import java.util.Optional;

public interface AccountServiceClient {

    Optional<AccountDetailsDto> getAccountDetails(String accountId);

    boolean verifyAccountOwnership(String accountId, String customerSubject);

    boolean isAccountEligibleForTransfers(String accountId);
}
