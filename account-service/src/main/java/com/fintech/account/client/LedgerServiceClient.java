package com.fintech.account.client;

import com.fintech.account.dto.response.BalanceResponse;

import java.math.BigDecimal;

public interface LedgerServiceClient {

    /**
     * Retrieves current balance from Ledger / Transaction Service.
     * Returns BalanceResponse or null / documented temporary strategy when service is not yet available.
     */
    BalanceResponse getAccountBalance(String accountId);

    /**
     * Coordinates with Ledger Service to reserve funds for a hold.
     * Returns true if reservation succeeded.
     */
    boolean reserveHoldFunds(String accountId, String holdId, BigDecimal amount, String currency, String idempotencyKey);

    /**
     * Coordinates with Ledger Service to release previously reserved hold funds.
     */
    boolean releaseHoldFunds(String accountId, String holdId, BigDecimal amount, String currency);

    /**
     * Verifies that the account has zero outstanding balance and no pending transactions before closure.
     */
    boolean verifyZeroObligationsForClosure(String accountId);
}
