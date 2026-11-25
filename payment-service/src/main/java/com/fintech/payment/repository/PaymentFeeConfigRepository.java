package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentFeeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentFeeConfigRepository extends JpaRepository<PaymentFeeConfig, String> {

    Optional<PaymentFeeConfig> findByTransferModeAndActiveTrue(String transferMode);
}
