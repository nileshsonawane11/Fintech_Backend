package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.response.*;
import com.fintech.account.entity.Account;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.SecurityUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final LedgerServiceClient ledgerServiceClient;

    public AccountService(AccountRepository accountRepository, LedgerServiceClient ledgerServiceClient) {
        this.accountRepository = accountRepository;
        this.ledgerServiceClient = ledgerServiceClient;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountResponse> listMyAccounts(
            String identitySubject, AccountStatus status, AccountType accountType, String cursor, int limit) {
        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<Account> slice = accountRepository.findMyAccountsWithCursor(
                identitySubject, status, accountType, cursor, PageRequest.of(0, pageSize));

        List<AccountResponse> items = slice.getContent().stream()
                .map(this::toResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !items.isEmpty()) {
            nextCursor = items.get(items.size() - 1).accountId();
        }

        return CursorPagedResponse.of(items, nextCursor, slice.hasNext(), pageSize);
    }

    @Transactional(readOnly = true)
    public AccountDetailResponse getAccountDetails(String identitySubject, String accountId, boolean isOps) {
        Account account = accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));

        if (!isOps && !account.getIdentitySubject().equals(identitySubject)) {
            // Ownership-safe: resource not found or forbidden
            throw AccountException.forbidden("ACCESS_DENIED", "You do not own this account.");
        }

        BalanceResponse balance = ledgerServiceClient.getAccountBalance(account.getAccountId());

        return new AccountDetailResponse(
                account.getAccountId(),
                SecurityUtils.maskAccountNumber(account.getAccountNumber()),
                account.getAccountType(),
                account.getProductCode(),
                account.getAccountStatus(),
                account.getCurrency(),
                account.getOpenedAt(),
                balance
        );
    }

    @Transactional(readOnly = true)
    public AccountStatusResponse getAccountStatus(String identitySubject, String accountId, boolean isOps) {
        Account account = accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));

        if (!isOps && !account.getIdentitySubject().equals(identitySubject)) {
            throw AccountException.forbidden("ACCESS_DENIED", "You do not own this account.");
        }

        return new AccountStatusResponse(
                account.getAccountId(),
                account.getAccountStatus(),
                account.getUpdatedAt()
        );
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getAccountId(),
                SecurityUtils.maskAccountNumber(account.getAccountNumber()),
                account.getAccountType(),
                account.getProductCode(),
                account.getAccountStatus(),
                account.getCurrency(),
                account.getOpenedAt()
        );
    }
}
