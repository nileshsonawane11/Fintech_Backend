package com.fintech.customer.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "customer_addresses")
public class CustomerAddress {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_profile_id", nullable = false)
    private CustomerProfile customerProfile;

    @Column(name = "address_type", nullable = false)
    private String addressType;

    @Column(name = "address_line1", nullable = false)
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(name = "postal_code", nullable = false)
    private String postalCode;

    @Column(nullable = false)
    private String country;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CustomerAddress() {}

    public static CustomerAddress create(
            CustomerProfile profile,
            String type,
            String line1,
            String line2,
            String city,
            String state,
            String postalCode,
            String country) {

        CustomerAddress address = new CustomerAddress();
        address.id = UUID.randomUUID();
        address.customerProfile = profile;
        address.addressType = type;
        address.addressLine1 = line1;
        address.addressLine2 = line2;
        address.city = city;
        address.state = state;
        address.postalCode = postalCode;
        address.country = country;
        address.createdAt = Instant.now();
        return address;
    }
}