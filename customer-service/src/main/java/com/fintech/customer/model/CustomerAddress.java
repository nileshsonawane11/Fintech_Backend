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

    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "deliverable", nullable = false)
    private boolean deliverable = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public CustomerAddress() {}

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
        address.status = "ACTIVE";
        address.deliverable = true;
        address.createdAt = Instant.now();
        return address;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public CustomerProfile getCustomerProfile() { return customerProfile; }
    public void setCustomerProfile(CustomerProfile customerProfile) { this.customerProfile = customerProfile; }

    public String getAddressType() { return addressType; }
    public void setAddressType(String addressType) { this.addressType = addressType; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDeliverable() { return deliverable; }
    public void setDeliverable(boolean deliverable) { this.deliverable = deliverable; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
