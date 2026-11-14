package com.fintech.customer.repository;

import com.fintech.customer.model.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CustomerAddressRepository
        extends JpaRepository<CustomerAddress, UUID> {

    interface AddressDetails {
        UUID getCustomerProfileId();
        String getAddressType();
        String getAddressLine1();
        String getAddressLine2();
        String getCity();
        String getState();
        String getPostalCode();
        String getCountry();
    }

    @Query("""
        SELECT
            a.customerProfile.id AS customerProfileId,
            a.addressType AS addressType,
            a.addressLine1 AS addressLine1,
            a.addressLine2 AS addressLine2,
            a.city AS city,
            a.state AS state,
            a.postalCode AS postalCode,
            a.country AS country
        FROM CustomerAddress a
        WHERE a.customerProfile.id IN :customerIds
        ORDER BY a.createdAt DESC
        """)
    List<AddressDetails> findAddressDetailsByCustomerIds(
            @Param("customerIds") List<UUID> customerIds
    );
}