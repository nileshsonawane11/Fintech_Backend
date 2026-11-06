package com.fintech.ledger.service;

import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerAccountResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.AccountHoldRepository;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LedgerAccountAdminService {

    private static final Logger log = LoggerFactory.getLogger(LedgerAccountAdminService.class);

    private final LedgerAccountRepository accountRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final AccountHoldRepository holdRepository;

    public LedgerAccountAdminService(LedgerAccountRepository accountRepository,
                                     LedgerBalanceSnapshotRepository snapshotRepository,
                                     AccountHoldRepository holdRepository) {
        this.accountRepository = accountRepository;
        this.snapshotRepository = snapshotRepository;
        this.holdRepository = holdRepository;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<LedgerAccountResponse> listLedgerAccounts(
            AccountType accountType, AccountSubtype accountSubtype, AccountStatus status,
            String currency, UUID customerId, int limit, String cursor) {

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerAccount> accountsPage = accountRepository.searchAccounts(
                accountType, accountSubtype, status, currency, customerId, PageRequest.of(page, limit));

        List<LedgerAccountResponse> responses = new ArrayList<>();
        for (LedgerAccount acc : accountsPage.getContent()) {
            LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(acc).orElse(null);
            BigDecimal ledgerBal = snapshot != null ? snapshot.getLedgerBalance() : BigDecimal.ZERO;
            BigDecimal holds = holdRepository.sumActiveHoldsByLedgerAccountId(acc.getId());
            BigDecimal avail = (acc.getAccountType() == AccountType.LIABILITY) ? ledgerBal.subtract(holds) : ledgerBal;

            responses.add(new LedgerAccountResponse(
                    acc.getLedgerAccountId(),
                    acc.getAccountReference(),
                    acc.getBankAccountId(),
                    acc.getCustomerId(),
                    acc.getAccountName(),
                    acc.getAccountType(),
                    acc.getAccountSubtype(),
                    acc.getNormalBalance(),
                    acc.getCurrency(),
                    acc.getStatus(),
                    ledgerBal,
                    avail,
                    acc.getCreatedAt(),
                    acc.getUpdatedAt()
            ));
        }

        String nextCursor = accountsPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(responses, nextCursor, accountsPage.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public LedgerAccountResponse getLedgerAccountDetails(String ledgerAccountId) {
        LedgerAccount acc = accountRepository.findByLedgerAccountId(ledgerAccountId)
                .or(() -> accountRepository.findByAccountReference(ledgerAccountId))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("Ledger account not found: " + ledgerAccountId));

        LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(acc).orElse(null);
        BigDecimal ledgerBal = snapshot != null ? snapshot.getLedgerBalance() : BigDecimal.ZERO;
        BigDecimal holds = holdRepository.sumActiveHoldsByLedgerAccountId(acc.getId());
        BigDecimal avail = (acc.getAccountType() == AccountType.LIABILITY) ? ledgerBal.subtract(holds) : ledgerBal;

        return new LedgerAccountResponse(
                acc.getLedgerAccountId(),
                acc.getAccountReference(),
                acc.getBankAccountId(),
                acc.getCustomerId(),
                acc.getAccountName(),
                acc.getAccountType(),
                acc.getAccountSubtype(),
                acc.getNormalBalance(),
                acc.getCurrency(),
                acc.getStatus(),
                ledgerBal,
                avail,
                acc.getCreatedAt(),
                acc.getUpdatedAt()
        );
    }

    @Transactional
    public LedgerAccountResponse freezeLedgerAccount(String ledgerAccountId, String opsUser) {
        LedgerAccount acc = accountRepository.findByLedgerAccountId(ledgerAccountId)
                .or(() -> accountRepository.findByAccountReference(ledgerAccountId))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("Ledger account not found: " + ledgerAccountId));

        log.info("Freezing ledger account {} by ops user {}", acc.getLedgerAccountId(), opsUser);
        acc.setStatus(AccountStatus.FROZEN);
        acc = accountRepository.save(acc);
        return getLedgerAccountDetails(acc.getLedgerAccountId());
    }

    @Transactional
    public LedgerAccountResponse unfreezeLedgerAccount(String ledgerAccountId, String opsUser) {
        LedgerAccount acc = accountRepository.findByLedgerAccountId(ledgerAccountId)
                .or(() -> accountRepository.findByAccountReference(ledgerAccountId))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("Ledger account not found: " + ledgerAccountId));

        log.info("Unfreezing ledger account {} by ops user {}", acc.getLedgerAccountId(), opsUser);
        acc.setStatus(AccountStatus.ACTIVE);
        acc = accountRepository.save(acc);
        return getLedgerAccountDetails(acc.getLedgerAccountId());
    }

    @Transactional
    public LedgerAccountResponse closeLedgerAccount(String ledgerAccountId, String opsUser) {
        LedgerAccount acc = accountRepository.findByLedgerAccountId(ledgerAccountId)
                .or(() -> accountRepository.findByAccountReference(ledgerAccountId))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("Ledger account not found: " + ledgerAccountId));

        LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(acc).orElse(null);
        BigDecimal balance = snapshot != null ? snapshot.getLedgerBalance() : BigDecimal.ZERO;
        BigDecimal holds = holdRepository.sumActiveHoldsByLedgerAccountId(acc.getId());

        if (balance.compareTo(BigDecimal.ZERO) != 0) {
            throw LedgerException.badRequest("ACCOUNT_HAS_OUTSTANDING_BALANCE",
                    "Cannot close ledger account with non-zero financial balance: " + balance);
        }

        if (holds.compareTo(BigDecimal.ZERO) > 0) {
            throw LedgerException.badRequest("ACCOUNT_HAS_ACTIVE_HOLDS",
                    "Cannot close ledger account with active financial holds: " + holds);
        }

        log.info("Closing ledger account {} by ops user {}", acc.getLedgerAccountId(), opsUser);
        acc.setStatus(AccountStatus.CLOSED);
        acc = accountRepository.save(acc);
        return getLedgerAccountDetails(acc.getLedgerAccountId());
    }
}
