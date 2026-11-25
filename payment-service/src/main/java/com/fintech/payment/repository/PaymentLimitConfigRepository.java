package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentLimitConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentLimitConfigRepository extends JpaRepository<PaymentLimitConfig, String> {

    Optional<PaymentLimitConfig> findByTransferModeAndActiveTrue(String transferMode);
}
