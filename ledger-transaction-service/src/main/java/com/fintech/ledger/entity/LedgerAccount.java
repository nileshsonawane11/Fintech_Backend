package com.fintech.ledger.entity;

import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.NormalBalance;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_accounts")
public class LedgerAccount {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ledger_account_id", nullable = false, unique = true, length = 100)
    private String ledgerAccountId;

    @Column(name = "bank_account_id")
    private UUID bankAccountId;

    @Column(name = "account_reference", length = 100)
    private String accountReference;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "account_name", nullable = false, length = 150)
    private String accountName;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 50)
    private AccountType accountType;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_subtype", nullable = false, length = 50)
    private AccountSubtype accountSubtype;

    @Enumerated(EnumType.STRING)
    @Column(name = "normal_balance", nullable = false, length = 10)
    private NormalBalance normalBalance;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AccountStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public LedgerAccount() {
    }

    public LedgerAccount(UUID id, String ledgerAccountId, UUID bankAccountId, String accountReference,
                         UUID customerId, String accountName, AccountType accountType,
                         AccountSubtype accountSubtype, NormalBalance normalBalance,
                         String currency, AccountStatus status) {
        this.id = id != null ? id : UUID.randomUUID();
        this.ledgerAccountId = ledgerAccountId;
        this.bankAccountId = bankAccountId;
        this.accountReference = accountReference;
        this.customerId = customerId;
        this.accountName = accountName;
        this.accountType = accountType;
        this.accountSubtype = accountSubtype;
        this.normalBalance = normalBalance;
        this.currency = currency;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.version = 0L;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (version == null) {
            version = 0L;
        }
        if (status == null) {
            status = AccountStatus.ACTIVE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getLedgerAccountId() {
        return ledgerAccountId;
    }

    public void setLedgerAccountId(String ledgerAccountId) {
        this.ledgerAccountId = ledgerAccountId;
    }

    public UUID getBankAccountId() {
        return bankAccountId;
    }

    public void setBankAccountId(UUID bankAccountId) {
        this.bankAccountId = bankAccountId;
    }

    public String getAccountReference() {
        return accountReference;
    }

    public void setAccountReference(String accountReference) {
        this.accountReference = accountReference;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public AccountType getAccountType() {
        return accountType;
    }

    public void setAccountType(AccountType accountType) {
        this.accountType = accountType;
    }

    public AccountSubtype getAccountSubtype() {
        return accountSubtype;
    }

    public void setAccountSubtype(AccountSubtype accountSubtype) {
        this.accountSubtype = accountSubtype;
    }

    public NormalBalance getNormalBalance() {
        return normalBalance;
    }

    public void setNormalBalance(NormalBalance normalBalance) {
        this.normalBalance = normalBalance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
