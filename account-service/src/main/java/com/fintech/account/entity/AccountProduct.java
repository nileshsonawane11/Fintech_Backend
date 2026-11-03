package com.fintech.account.entity;

import com.fintech.account.enums.AccountType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account_products")
public class AccountProduct {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_code", nullable = false, unique = true, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 30)
    private AccountType accountType;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "minimum_balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal minimumBalance;

    @Column(name = "minimum_initial_funding", nullable = false, precision = 18, scale = 2)
    private BigDecimal minimumInitialFunding;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(name = "daily_transfer_limit", nullable = false, precision = 18, scale = 2)
    private BigDecimal dailyTransferLimit;

    @Column(name = "monthly_transfer_limit", nullable = false, precision = 18, scale = 2)
    private BigDecimal monthlyTransferLimit;

    @Column(name = "minimum_age", nullable = false)
    private Integer minimumAge;

    @Column(name = "maximum_age")
    private Integer maximumAge;

    @Column(name = "requires_kyc", nullable = false)
    private boolean requiresKyc = true;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public AccountProduct() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
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

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public AccountType getAccountType() {
        return accountType;
    }

    public void setAccountType(AccountType accountType) {
        this.accountType = accountType;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getMinimumBalance() {
        return minimumBalance;
    }

    public void setMinimumBalance(BigDecimal minimumBalance) {
        this.minimumBalance = minimumBalance;
    }

    public BigDecimal getMinimumInitialFunding() {
        return minimumInitialFunding;
    }

    public void setMinimumInitialFunding(BigDecimal minimumInitialFunding) {
        this.minimumInitialFunding = minimumInitialFunding;
    }

    public BigDecimal getInterestRate() {
        return interestRate;
    }

    public void setInterestRate(BigDecimal interestRate) {
        this.interestRate = interestRate;
    }

    public BigDecimal getDailyTransferLimit() {
        return dailyTransferLimit;
    }

    public void setDailyTransferLimit(BigDecimal dailyTransferLimit) {
        this.dailyTransferLimit = dailyTransferLimit;
    }

    public BigDecimal getMonthlyTransferLimit() {
        return monthlyTransferLimit;
    }

    public void setMonthlyTransferLimit(BigDecimal monthlyTransferLimit) {
        this.monthlyTransferLimit = monthlyTransferLimit;
    }

    public Integer getMinimumAge() {
        return minimumAge;
    }

    public void setMinimumAge(Integer minimumAge) {
        this.minimumAge = minimumAge;
    }

    public Integer getMaximumAge() {
        return maximumAge;
    }

    public void setMaximumAge(Integer maximumAge) {
        this.maximumAge = maximumAge;
    }

    public boolean isRequiresKyc() {
        return requiresKyc;
    }

    public void setRequiresKyc(boolean requiresKyc) {
        this.requiresKyc = requiresKyc;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
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

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
