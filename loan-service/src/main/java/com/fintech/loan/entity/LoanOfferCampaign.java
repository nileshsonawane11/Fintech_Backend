package com.fintech.loan.entity;

import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.OfferStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "loan_promotional_offers")
public class LoanOfferCampaign {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "offer_code", nullable = false, unique = true, length = 50)
    private String offerCode;

    @Column(name = "offer_name", nullable = false, length = 200)
    private String offerName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OfferStatus status = OfferStatus.DRAFT;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion = 1;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_to", nullable = false)
    private Instant validTo;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_product_codes", columnDefinition = "jsonb")
    private List<String> applicableProductCodes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligibility_conditions", columnDefinition = "jsonb")
    private Map<String, Object> eligibilityConditions = new LinkedHashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 40)
    private DiscountType discountType;

    @Column(name = "interest_rate_discount", precision = 5, scale = 2)
    private BigDecimal interestRateDiscount = BigDecimal.ZERO;

    @Column(name = "processing_fee_discount_percentage", precision = 5, scale = 2)
    private BigDecimal processingFeeDiscountPercentage = BigDecimal.ZERO;

    @Column(name = "processing_fee_waiver_amount", precision = 15, scale = 2)
    private BigDecimal processingFeeWaiverAmount = BigDecimal.ZERO;

    @Column(name = "cashback_amount", precision = 15, scale = 2)
    private BigDecimal cashbackAmount = BigDecimal.ZERO;

    @Column(name = "cashback_percentage", precision = 5, scale = 2)
    private BigDecimal cashbackPercentage = BigDecimal.ZERO;

    @Column(name = "max_cashback_amount", precision = 15, scale = 2)
    private BigDecimal maxCashbackAmount;

    @Column(name = "priority", nullable = false)
    private Integer priority = 100;

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

    public LoanOfferCampaign() {
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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getOfferCode() { return offerCode; }
    public void setOfferCode(String offerCode) { this.offerCode = offerCode; }

    public String getOfferName() { return offerName; }
    public void setOfferName(String offerName) { this.offerName = offerName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OfferStatus getStatus() { return status; }
    public void setStatus(OfferStatus status) { this.status = status; }

    public Integer getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(Integer currentVersion) { this.currentVersion = currentVersion; }

    public Instant getValidFrom() { return validFrom; }
    public void setValidFrom(Instant validFrom) { this.validFrom = validFrom; }

    public Instant getValidTo() { return validTo; }
    public void setValidTo(Instant validTo) { this.validTo = validTo; }

    public Instant getActivatedAt() { return activatedAt; }
    public void setActivatedAt(Instant activatedAt) { this.activatedAt = activatedAt; }

    public List<String> getApplicableProductCodes() { return applicableProductCodes; }
    public void setApplicableProductCodes(List<String> applicableProductCodes) {
        this.applicableProductCodes = applicableProductCodes != null ? new ArrayList<>(applicableProductCodes) : new ArrayList<>();
    }

    public Map<String, Object> getEligibilityConditions() { return eligibilityConditions; }
    public void setEligibilityConditions(Map<String, Object> eligibilityConditions) {
        this.eligibilityConditions = eligibilityConditions != null ? new LinkedHashMap<>(eligibilityConditions) : new LinkedHashMap<>();
    }

    public DiscountType getDiscountType() { return discountType; }
    public void setDiscountType(DiscountType discountType) { this.discountType = discountType; }

    public BigDecimal getInterestRateDiscount() { return interestRateDiscount; }
    public void setInterestRateDiscount(BigDecimal interestRateDiscount) { this.interestRateDiscount = interestRateDiscount; }

    public BigDecimal getProcessingFeeDiscountPercentage() { return processingFeeDiscountPercentage; }
    public void setProcessingFeeDiscountPercentage(BigDecimal processingFeeDiscountPercentage) {
        this.processingFeeDiscountPercentage = processingFeeDiscountPercentage;
    }

    public BigDecimal getProcessingFeeWaiverAmount() { return processingFeeWaiverAmount; }
    public void setProcessingFeeWaiverAmount(BigDecimal processingFeeWaiverAmount) {
        this.processingFeeWaiverAmount = processingFeeWaiverAmount;
    }

    public BigDecimal getCashbackAmount() { return cashbackAmount; }
    public void setCashbackAmount(BigDecimal cashbackAmount) { this.cashbackAmount = cashbackAmount; }

    public BigDecimal getCashbackPercentage() { return cashbackPercentage; }
    public void setCashbackPercentage(BigDecimal cashbackPercentage) { this.cashbackPercentage = cashbackPercentage; }

    public BigDecimal getMaxCashbackAmount() { return maxCashbackAmount; }
    public void setMaxCashbackAmount(BigDecimal maxCashbackAmount) { this.maxCashbackAmount = maxCashbackAmount; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
