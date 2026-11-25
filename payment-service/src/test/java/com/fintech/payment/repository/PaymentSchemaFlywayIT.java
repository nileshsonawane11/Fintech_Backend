package com.fintech.payment.repository;

import com.fintech.payment.entity.PaymentFeeConfig;
import com.fintech.payment.entity.PaymentLimitConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:payment_flyway_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.service-registry.auto-registration.enabled=false",
        "spring.kafka.admin.auto-create=false",
        "spring.kafka.listener.auto-startup=false",
        "payment.reconciliation.enabled=false"
})
@ActiveProfiles("test")
class PaymentSchemaFlywayIT {

    @Autowired private PaymentFeeConfigRepository feeConfigRepository;
    @Autowired private PaymentLimitConfigRepository limitConfigRepository;

    @Test
    void runsAllFlywayMigrationsAndValidatesJpaSchema() {
        Optional<PaymentFeeConfig> impsFee = feeConfigRepository.findByTransferModeAndActiveTrue("IMPS");
        Optional<PaymentLimitConfig> rtgsLimit = limitConfigRepository.findByTransferModeAndActiveTrue("RTGS");

        assertTrue(impsFee.isPresent());
        assertEquals("INR", impsFee.get().getCurrency());
        assertTrue(rtgsLimit.isPresent());
    }
}
