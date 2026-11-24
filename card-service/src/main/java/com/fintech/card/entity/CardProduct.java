package com.fintech.card.entity;

import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "card_products")
public class CardProduct {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_code", nullable = false, unique = true, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 20)
    private CardType cardType;

    @Column(name = "network", nullable = false, length = 30)
    private String network;

    @Column(name = "short_description", length = 255)
    private String shortDescription;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "joining_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal joiningFee = BigDecimal.ZERO;

    @Column(name = "annual_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal annualFee = BigDecimal.ZERO;

    @Column(name = "forex_markup_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal forexMarkupPercentage = new BigDecimal("3.50");

    @Column(name = "eligibility_min_age", nullable = false)
    private Integer eligibilityMinAge = 18;

    @Column(name = "eligibility_max_age")
    private Integer eligibilityMaxAge;

    @Column(name = "eligibility_min_monthly_income", nullable = false, precision = 15, scale = 2)
    private BigDecimal eligibilityMinMonthlyIncome = BigDecimal.ZERO;

    @Column(name = "eligibility_min_credit_score", nullable = false)
    private Integer eligibilityMinCreditScore = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligibility_employment_types", columnDefinition = "jsonb")
    private List<String> eligibilityEmploymentTypes = new ArrayList<>();

    @Column(name = "eligibility_min_income_history_months", nullable = false)
    private Integer eligibilityMinIncomeHistoryMonths = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "credit_card_config", columnDefinition = "jsonb")
    private CreditCardConfig creditCardConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "debit_card_config", columnDefinition = "jsonb")
    private DebitCardConfig debitCardConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "benefits", columnDefinition = "jsonb")
    private List<Map<String, Object>> benefits = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "features", columnDefinition = "jsonb")
    private List<String> features = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fees_and_charges", columnDefinition = "jsonb")
    private List<Map<String, Object>> feesAndCharges = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "application_instructions", columnDefinition = "jsonb")
    private List<String> applicationInstructions = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy = "SYSTEM";

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy = "SYSTEM";

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public CardProduct() {
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

    // Getters and Setters

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

    public CardType getCardType() {
        return cardType;
    }

    public void setCardType(CardType cardType) {
        this.cardType = cardType;
    }

    public String getNetwork() {
        return network;
    }

    public void setNetwork(String network) {
        this.network = network;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getJoiningFee() {
        return joiningFee;
    }

    public void setJoiningFee(BigDecimal joiningFee) {
        this.joiningFee = joiningFee;
    }

    public BigDecimal getAnnualFee() {
        return annualFee;
    }

    public void setAnnualFee(BigDecimal annualFee) {
        this.annualFee = annualFee;
    }

    public BigDecimal getForexMarkupPercentage() {
        return forexMarkupPercentage;
    }

    public void setForexMarkupPercentage(BigDecimal forexMarkupPercentage) {
        this.forexMarkupPercentage = forexMarkupPercentage;
    }

    public Integer getEligibilityMinAge() {
        return eligibilityMinAge;
    }

    public void setEligibilityMinAge(Integer eligibilityMinAge) {
        this.eligibilityMinAge = eligibilityMinAge;
    }

    public Integer getEligibilityMaxAge() {
        return eligibilityMaxAge;
    }

    public void setEligibilityMaxAge(Integer eligibilityMaxAge) {
        this.eligibilityMaxAge = eligibilityMaxAge;
    }

    public BigDecimal getEligibilityMinMonthlyIncome() {
        return eligibilityMinMonthlyIncome;
    }

    public void setEligibilityMinMonthlyIncome(BigDecimal eligibilityMinMonthlyIncome) {
        this.eligibilityMinMonthlyIncome = eligibilityMinMonthlyIncome;
    }

    public Integer getEligibilityMinCreditScore() {
        return eligibilityMinCreditScore;
    }

    public void setEligibilityMinCreditScore(Integer eligibilityMinCreditScore) {
        this.eligibilityMinCreditScore = eligibilityMinCreditScore;
    }

    public List<String> getEligibilityEmploymentTypes() {
        return eligibilityEmploymentTypes;
    }

    public void setEligibilityEmploymentTypes(List<String> eligibilityEmploymentTypes) {
        this.eligibilityEmploymentTypes = eligibilityEmploymentTypes != null ? eligibilityEmploymentTypes : new ArrayList<>();
    }

    public Integer getEligibilityMinIncomeHistoryMonths() {
        return eligibilityMinIncomeHistoryMonths;
    }

    public void setEligibilityMinIncomeHistoryMonths(Integer eligibilityMinIncomeHistoryMonths) {
        this.eligibilityMinIncomeHistoryMonths = eligibilityMinIncomeHistoryMonths;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public boolean isDeleted() {
        return isDeleted;
    }

    public void setDeleted(boolean deleted) {
        isDeleted = deleted;
    }

    public CreditCardConfig getCreditCardConfig() {
        return creditCardConfig;
    }

    public void setCreditCardConfig(CreditCardConfig creditCardConfig) {
        this.creditCardConfig = creditCardConfig;
    }

    public DebitCardConfig getDebitCardConfig() {
        return debitCardConfig;
    }

    public void setDebitCardConfig(DebitCardConfig debitCardConfig) {
        this.debitCardConfig = debitCardConfig;
    }

    public List<Map<String, Object>> getBenefits() {
        return benefits;
    }

    public void setBenefits(List<Map<String, Object>> benefits) {
        this.benefits = benefits != null ? benefits : new ArrayList<>();
    }

    public List<String> getFeatures() {
        return features;
    }

    public void setFeatures(List<String> features) {
        this.features = features != null ? features : new ArrayList<>();
    }

    public List<Map<String, Object>> getFeesAndCharges() {
        return feesAndCharges;
    }

    public void setFeesAndCharges(List<Map<String, Object>> feesAndCharges) {
        this.feesAndCharges = feesAndCharges != null ? feesAndCharges : new ArrayList<>();
    }

    public List<String> getApplicationInstructions() {
        return applicationInstructions;
    }

    public void setApplicationInstructions(List<String> applicationInstructions) {
        this.applicationInstructions = applicationInstructions != null ? applicationInstructions : new ArrayList<>();
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
