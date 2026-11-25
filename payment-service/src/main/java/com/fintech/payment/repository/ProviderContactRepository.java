package com.fintech.payment.repository;

import com.fintech.payment.entity.ProviderContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderContactRepository extends JpaRepository<ProviderContact, String> {

    Optional<ProviderContact> findByProviderNameAndOwnerTypeAndOwnerRef(
            String providerName, String ownerType, String ownerRef);

    Optional<ProviderContact> findByProviderContactId(String providerContactId);
}
