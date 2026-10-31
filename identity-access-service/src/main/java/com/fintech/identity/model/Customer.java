package com.fintech.identity.model;

import com.fintech.identity.model.enums.CustomerStatus;
import com.fintech.identity.model.enums.Role;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "customers",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_customer_mobile",
                        columnNames = "mobile_number"
                ),
                @UniqueConstraint(
                        name = "uk_customer_email",
                        columnNames = "email"
                )
        }
)
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "mobile_number", nullable = false, length = 10)
    private String mobileNumber;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CustomerStatus status = CustomerStatus.PENDING_VERIFICATION;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role = Role.CUSTOMER;

    @Column(name = "accepted_terms_version", nullable = false)
    private String acceptedTermsVersion;

    @Column(name = "marketing_consent", nullable = false)
    private boolean marketingConsent;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Customer() {
    }

    public Customer(
            String mobileNumber,
            String email,
            String passwordHash,
            String acceptedTermsVersion,
            boolean marketingConsent
    ) {
        this.mobileNumber = mobileNumber;
        this.email = email;
        this.passwordHash = passwordHash;
        this.acceptedTermsVersion = acceptedTermsVersion;
        this.marketingConsent = marketingConsent;
        this.status = CustomerStatus.PENDING_VERIFICATION;
        this.role = Role.CUSTOMER;
    }

    public Customer(
            String mobileNumber,
            String email,
            String passwordHash,
            String acceptedTermsVersion,
            boolean marketingConsent,
            Role role
    ) {
        this(mobileNumber, email, passwordHash, acceptedTermsVersion, marketingConsent);
        this.role = role != null ? role : Role.CUSTOMER;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void activate() {
        this.status = CustomerStatus.ACTIVE;
    }

    public void recordFailedLogin() {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= 5) {
            this.lockedUntil = Instant.now().plusSeconds(900);
        }
    }

    public void resetFailedLogins() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }

    public boolean isLockedNow() {
        return lockedUntil != null
                && lockedUntil.isAfter(Instant.now());
    }

    public UUID getId() { return id; }
    public String getMobileNumber() { return mobileNumber; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public CustomerStatus getStatus() { return status; }
    public Role getRole() { return role; }
    public String getAcceptedTermsVersion() { return acceptedTermsVersion; }
    public boolean isMarketingConsent() { return marketingConsent; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public Instant getLockedUntil() { return lockedUntil; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}