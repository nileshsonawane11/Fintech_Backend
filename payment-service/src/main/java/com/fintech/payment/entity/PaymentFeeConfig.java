package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_fee_configs")
public class PaymentFeeConfig {

    @Id
    private String id;

    @Column(name = "transfer_mode", nullable = false, unique = true, length = 30)
    private String transferMode;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "flat_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal flatFee = BigDecimal.ZERO;

    @Column(name = "percent_fee", nullable = false, precision = 7, scale = 4)
    private BigDecimal percentFee = BigDecimal.ZERO;

    @Column(name = "tax_percent", nullable = false, precision = 7, scale = 4)
    private BigDecimal taxPercent = BigDecimal.ZERO;

    @Column(name = "min_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal minFee = BigDecimal.ZERO;

    @Column(name = "max_fee", nullable = false, precision = 19, scale = 4)
    private BigDecimal maxFee = BigDecimal.ZERO;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTransferMode() { return transferMode; }
    public void setTransferMode(String transferMode) { this.transferMode = transferMode; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getFlatFee() { return flatFee; }
    public void setFlatFee(BigDecimal flatFee) { this.flatFee = flatFee; }
    public BigDecimal getPercentFee() { return percentFee; }
    public void setPercentFee(BigDecimal percentFee) { this.percentFee = percentFee; }
    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
    public BigDecimal getMinFee() { return minFee; }
    public void setMinFee(BigDecimal minFee) { this.minFee = minFee; }
    public BigDecimal getMaxFee() { return maxFee; }
    public void setMaxFee(BigDecimal maxFee) { this.maxFee = maxFee; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
