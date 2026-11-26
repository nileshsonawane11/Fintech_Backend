package com.fintech.loan.entity;

import com.fintech.loan.enums.ProcessingFeeType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "loan_product_fees")
public class LoanProductFee {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false, unique = true)
    private UUID productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_fee_type", nullable = false, length = 30)
    private ProcessingFeeType processingFeeType = ProcessingFeeType.PERCENTAGE;

    @Column(name = "processing_fee_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal processingFeeValue = BigDecimal.ZERO;

    @Column(name = "minimum_processing_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal minimumProcessingFee = BigDecimal.ZERO;

    @Column(name = "maximum_processing_fee", precision = 15, scale = 2)
    private BigDecimal maximumProcessingFee;

    @Column(name = "prepayment_charge_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal prepaymentChargePercentage = BigDecimal.ZERO;

    @Column(name = "prepayment_charges", length = 255)
    private String prepaymentCharges;

    @Column(name = "foreclosure_charge_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal foreclosureChargePercentage = BigDecimal.ZERO;

    @Column(name = "foreclosure_charges", length = 255)
    private String foreclosureCharges;

    @Column(name = "late_payment_penalty", nullable = false, precision = 5, scale = 2)
    private BigDecimal latePaymentPenalty = new BigDecimal("2.00");

    @Column(name = "late_payment_penalty_description", length = 255)
    private String latePaymentPenaltyDescription;

    @Column(name = "cheque_bounce_charges", nullable = false, precision = 15, scale = 2)
    private BigDecimal chequeBounceCharges = new BigDecimal("400.00");

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "additional_charges", columnDefinition = "jsonb")
    private Map<String, Object> additionalCharges = new LinkedHashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public LoanProductFee() {
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

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public ProcessingFeeType getProcessingFeeType() { return processingFeeType; }
    public void setProcessingFeeType(ProcessingFeeType processingFeeType) { this.processingFeeType = processingFeeType; }

    public BigDecimal getProcessingFeeValue() { return processingFeeValue; }
    public void setProcessingFeeValue(BigDecimal processingFeeValue) { this.processingFeeValue = processingFeeValue; }

    public BigDecimal getMinimumProcessingFee() { return minimumProcessingFee; }
    public void setMinimumProcessingFee(BigDecimal minimumProcessingFee) { this.minimumProcessingFee = minimumProcessingFee; }

    public BigDecimal getMaximumProcessingFee() { return maximumProcessingFee; }
    public void setMaximumProcessingFee(BigDecimal maximumProcessingFee) { this.maximumProcessingFee = maximumProcessingFee; }

    public BigDecimal getPrepaymentChargePercentage() { return prepaymentChargePercentage; }
    public void setPrepaymentChargePercentage(BigDecimal prepaymentChargePercentage) { this.prepaymentChargePercentage = prepaymentChargePercentage; }

    public String getPrepaymentCharges() { return prepaymentCharges; }
    public void setPrepaymentCharges(String prepaymentCharges) { this.prepaymentCharges = prepaymentCharges; }

    public BigDecimal getForeclosureChargePercentage() { return foreclosureChargePercentage; }
    public void setForeclosureChargePercentage(BigDecimal foreclosureChargePercentage) { this.foreclosureChargePercentage = foreclosureChargePercentage; }

    public String getForeclosureCharges() { return foreclosureCharges; }
    public void setForeclosureCharges(String foreclosureCharges) { this.foreclosureCharges = foreclosureCharges; }

    public BigDecimal getLatePaymentPenalty() { return latePaymentPenalty; }
    public void setLatePaymentPenalty(BigDecimal latePaymentPenalty) { this.latePaymentPenalty = latePaymentPenalty; }

    public String getLatePaymentPenaltyDescription() { return latePaymentPenaltyDescription; }
    public void setLatePaymentPenaltyDescription(String latePaymentPenaltyDescription) { this.latePaymentPenaltyDescription = latePaymentPenaltyDescription; }

    public BigDecimal getChequeBounceCharges() { return chequeBounceCharges; }
    public void setChequeBounceCharges(BigDecimal chequeBounceCharges) { this.chequeBounceCharges = chequeBounceCharges; }

    public Map<String, Object> getAdditionalCharges() { return additionalCharges; }
    public void setAdditionalCharges(Map<String, Object> additionalCharges) {
        this.additionalCharges = additionalCharges != null ? new LinkedHashMap<>(additionalCharges) : new LinkedHashMap<>();
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
