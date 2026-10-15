package com.fintech.identity.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OtpDeliveryService {

    private static final Logger log =
            LoggerFactory.getLogger(OtpDeliveryService.class);

    @Value("${identity.otp.development-log-code:false}")
    private boolean developmentLogCode;

    public void deliver(
            String destination,
            String referenceId,
            String otp,
            String purpose
    ) {
        if (developmentLogCode) {
            log.warn(
                    "DEVELOPMENT OTP: purpose={}, referenceId={}, destination={}, code={}",
                    purpose, referenceId, mask(destination), otp
            );
            return;
        }

        throw new IllegalStateException(
                "OTP delivery provider is not configured."
        );
    }

    private String mask(String destination) {
        if (destination == null || destination.length() < 4) {
            return "****";
        }

        return "****" + destination.substring(destination.length() - 4);
    }
}