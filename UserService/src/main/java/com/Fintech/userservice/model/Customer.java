package com.Fintech.userservice.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Data
@Getter
@Setter
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

    public enum Status {
        PENDING_VERIFICATION,
        ACTIVE,
        LOCKED,
        DISABLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID userId;

    @Column(name = "mobile_number", nullable = false, length = 10)
    private String mobileNumber;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "accepted_terms_version", nullable = false, length = 50)
    private String acceptedTermsVersion;

    @Column(name = "marketing_consent", nullable = false)
    private boolean marketingConsent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Status status = Status.PENDING_VERIFICATION;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Customer() {
        // Required by JPA.
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
        this.status = Status.PENDING_VERIFICATION;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

}