package com.fintech.card.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "card_controls")
public class CardControl {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", referencedColumnName = "id", nullable = false)
    private Card card;

    @Column(name = "online_enabled", nullable = false)
    private Boolean onlineEnabled = true;

    @Column(name = "international_enabled", nullable = false)
    private Boolean internationalEnabled = false;

    @Column(name = "contactless_enabled", nullable = false)
    private Boolean contactlessEnabled = true;

    @Column(name = "atm_withdrawal_enabled", nullable = false)
    private Boolean atmWithdrawalEnabled = true;

    @Column(name = "daily_limit", nullable = false, precision = 15, scale = 2)
    private BigDecimal dailyLimit = new BigDecimal("50000.00");

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }

    public Boolean getOnlineEnabled() { return onlineEnabled; }
    public void setOnlineEnabled(Boolean onlineEnabled) { this.onlineEnabled = onlineEnabled; }

    public Boolean getInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(Boolean internationalEnabled) { this.internationalEnabled = internationalEnabled; }

    public Boolean getContactlessEnabled() { return contactlessEnabled; }
    public void setContactlessEnabled(Boolean contactlessEnabled) { this.contactlessEnabled = contactlessEnabled; }

    public Boolean getAtmWithdrawalEnabled() { return atmWithdrawalEnabled; }
    public void setAtmWithdrawalEnabled(Boolean atmWithdrawalEnabled) { this.atmWithdrawalEnabled = atmWithdrawalEnabled; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }
}
