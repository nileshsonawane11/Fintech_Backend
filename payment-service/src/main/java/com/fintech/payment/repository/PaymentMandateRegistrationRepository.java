package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentMandateRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentMandateRegistrationRepository extends JpaRepository<PaymentMandateRegistration, UUID> {
    Optional<PaymentMandateRegistration> findByProviderReference(String providerReference);
    Optional<PaymentMandateRegistration> findByMandateReference(String mandateReference);
    Optional<PaymentMandateRegistration> findByIdempotencyKey(String idempotencyKey);
}
