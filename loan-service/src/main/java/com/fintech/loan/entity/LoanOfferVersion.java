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
@Table(
        name = "loan_offer_versions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"offer_id", "version_number"})
)
public class LoanOfferVersion {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "offer_id", nullable = false, updatable = false)
    private UUID offerId;

    @Column(name = "offer_code", nullable = false, length = 50, updatable = false)
    private String offerCode;

    @Column(name = "version_number", nullable = false, updatable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20, updatable = false)
    private OfferStatus status;

    @Column(name = "valid_from", nullable = false, updatable = false)
    private Instant validFrom;

    @Column(name = "valid_to", nullable = false, updatable = false)
    private Instant validTo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_product_codes", columnDefinition = "jsonb", updatable = false)
    private List<String> applicableProductCodes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligibility_conditions", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> eligibilityConditions = new LinkedHashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 40, updatable = false)
    private DiscountType discountType;

    @Column(name = "interest_rate_discount", precision = 5, scale = 2, updatable = false)
    private BigDecimal interestRateDiscount = BigDecimal.ZERO;

    @Column(name = "processing_fee_discount_percentage", precision = 5, scale = 2, updatable = false)
    private BigDecimal processingFeeDiscountPercentage = BigDecimal.ZERO;

    @Column(name = "processing_fee_waiver_amount", precision = 15, scale = 2, updatable = false)
    private BigDecimal processingFeeWaiverAmount = BigDecimal.ZERO;

    @Column(name = "cashback_amount", precision = 15, scale = 2, updatable = false)
    private BigDecimal cashbackAmount = BigDecimal.ZERO;

    @Column(name = "cashback_percentage", precision = 5, scale = 2, updatable = false)
    private BigDecimal cashbackPercentage = BigDecimal.ZERO;

    @Column(name = "max_cashback_amount", precision = 15, scale = 2, updatable = false)
    private BigDecimal maxCashbackAmount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_json", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> snapshotJson = new LinkedHashMap<>();

    @Column(name = "created_by", nullable = false, length = 100, updatable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public LoanOfferVersion() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOfferId() { return offerId; }
    public void setOfferId(UUID offerId) { this.offerId = offerId; }

    public String getOfferCode() { return offerCode; }
    public void setOfferCode(String offerCode) { this.offerCode = offerCode; }

    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }

    public OfferStatus getStatus() { return status; }
    public void setStatus(OfferStatus status) { this.status = status; }

    public Instant getValidFrom() { return validFrom; }
    public void setValidFrom(Instant validFrom) { this.validFrom = validFrom; }

    public Instant getValidTo() { return validTo; }
    public void setValidTo(Instant validTo) { this.validTo = validTo; }

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

    public Map<String, Object> getSnapshotJson() { return snapshotJson; }
    public void setSnapshotJson(Map<String, Object> snapshotJson) {
        this.snapshotJson = snapshotJson != null ? new LinkedHashMap<>(snapshotJson) : new LinkedHashMap<>();
    }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
