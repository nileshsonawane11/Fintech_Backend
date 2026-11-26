package com.fintech.loan.entity;

import com.fintech.loan.enums.DiscountType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "loan_application_offer_snapshots")
public class LoanApplicationOfferSnapshot {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "loan_application_id", nullable = false, unique = true, length = 50, updatable = false)
    private String loanApplicationId;

    @Column(name = "offer_id", nullable = false, updatable = false)
    private UUID offerId;

    @Column(name = "offer_code", nullable = false, length = 50, updatable = false)
    private String offerCode;

    @Column(name = "offer_name", nullable = false, length = 200, updatable = false)
    private String offerName;

    @Column(name = "offer_version", nullable = false, updatable = false)
    private Integer offerVersion;

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

    @Column(name = "effective_interest_rate", nullable = false, precision = 5, scale = 2, updatable = false)
    private BigDecimal effectiveInterestRate;

    @Column(name = "original_processing_fee", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal originalProcessingFee;

    @Column(name = "discounted_processing_fee", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal discountedProcessingFee;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "benefit_details", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> benefitDetails = new LinkedHashMap<>();

    @Column(name = "applied_at", nullable = false, updatable = false)
    private Instant appliedAt;

    public LoanApplicationOfferSnapshot() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (appliedAt == null) {
            appliedAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public UUID getOfferId() { return offerId; }
    public void setOfferId(UUID offerId) { this.offerId = offerId; }

    public String getOfferCode() { return offerCode; }
    public void setOfferCode(String offerCode) { this.offerCode = offerCode; }

    public String getOfferName() { return offerName; }
    public void setOfferName(String offerName) { this.offerName = offerName; }

    public Integer getOfferVersion() { return offerVersion; }
    public void setOfferVersion(Integer offerVersion) { this.offerVersion = offerVersion; }

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

    public BigDecimal getEffectiveInterestRate() { return effectiveInterestRate; }
    public void setEffectiveInterestRate(BigDecimal effectiveInterestRate) { this.effectiveInterestRate = effectiveInterestRate; }

    public BigDecimal getOriginalProcessingFee() { return originalProcessingFee; }
    public void setOriginalProcessingFee(BigDecimal originalProcessingFee) { this.originalProcessingFee = originalProcessingFee; }

    public BigDecimal getDiscountedProcessingFee() { return discountedProcessingFee; }
    public void setDiscountedProcessingFee(BigDecimal discountedProcessingFee) { this.discountedProcessingFee = discountedProcessingFee; }

    public Map<String, Object> getBenefitDetails() { return benefitDetails; }
    public void setBenefitDetails(Map<String, Object> benefitDetails) {
        this.benefitDetails = benefitDetails != null ? new LinkedHashMap<>(benefitDetails) : new LinkedHashMap<>();
    }

    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant appliedAt) { this.appliedAt = appliedAt; }
}
