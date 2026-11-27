package com.fintech.investment.entity;

import com.fintech.investment.entity.InvestmentEnums.WithdrawalRequestType;
import com.fintech.investment.entity.InvestmentEnums.WithdrawalStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "investment_withdrawal_requests")
public class InvestmentWithdrawalRequest {

    @Id
    private UUID id;

    @Column(name = "request_id", nullable = false, unique = true, length = 60)
    private String requestId;

    @Column(name = "investment_id", nullable = false, length = 50)
    private String investmentId;

    @Column(name = "identity_subject", nullable = false, length = 100)
    private String identitySubject;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private WithdrawalRequestType requestType;

    @Column(name = "requested_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "penalty_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Column(name = "net_payout_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal netPayoutAmount;

    @Column(name = "payout_account_id", nullable = false, length = 80)
    private String payoutAccountId;

    @Column(name = "reason", length = 400)
    private String reason;

    @Column(name = "eligibility_note", length = 400)
    private String eligibilityNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private WithdrawalStatus status = WithdrawalStatus.REQUESTED;

    @Column(name = "processed_by", length = 100)
    private String processedBy;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "transaction_ref", length = 80)
    private String transactionRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public String getInvestmentId() { return investmentId; }
    public void setInvestmentId(String investmentId) { this.investmentId = investmentId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public WithdrawalRequestType getRequestType() { return requestType; }
    public void setRequestType(WithdrawalRequestType requestType) { this.requestType = requestType; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public BigDecimal getPenaltyAmount() { return penaltyAmount; }
    public void setPenaltyAmount(BigDecimal penaltyAmount) { this.penaltyAmount = penaltyAmount; }
    public BigDecimal getNetPayoutAmount() { return netPayoutAmount; }
    public void setNetPayoutAmount(BigDecimal netPayoutAmount) { this.netPayoutAmount = netPayoutAmount; }
    public String getPayoutAccountId() { return payoutAccountId; }
    public void setPayoutAccountId(String payoutAccountId) { this.payoutAccountId = payoutAccountId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getEligibilityNote() { return eligibilityNote; }
    public void setEligibilityNote(String eligibilityNote) { this.eligibilityNote = eligibilityNote; }
    public WithdrawalStatus getStatus() { return status; }
    public void setStatus(WithdrawalStatus status) { this.status = status; }
    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getVersion() { return version; }
}
