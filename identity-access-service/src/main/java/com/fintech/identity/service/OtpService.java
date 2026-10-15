
package com.fintech.identity.service;

import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.Customer;
import com.fintech.identity.model.OtpChallenge;
import com.fintech.identity.model.enums.OtpPurpose;
import com.fintech.identity.repository.OtpChallengeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
public class OtpService {

    private final OtpChallengeRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final OtpDeliveryService deliveryService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${identity.otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${identity.otp.max-attempts:5}")
    private int maxAttempts;

    public OtpService(
            OtpChallengeRepository repository,
            PasswordEncoder passwordEncoder,
            OtpDeliveryService deliveryService
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.deliveryService = deliveryService;
    }

    public OtpChallenge create(
            Customer customer,
            OtpPurpose purpose,
            String destination
    ) {
        String otp = String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        String referenceId = "otp-ref-" + UUID.randomUUID();

        OtpChallenge challenge = new OtpChallenge(
                referenceId,
                customer,
                purpose,
                passwordEncoder.encode(otp),
                Instant.now().plusSeconds(expiryMinutes * 60),
                maxAttempts
        );

        OtpChallenge saved = repository.save(challenge);

        deliveryService.deliver(
                destination,
                referenceId,
                otp,
                purpose.name()
        );

        return saved;
    }

    public OtpChallenge verifyAndConsume(
            String referenceId,
            String submittedOtp,
            OtpPurpose expectedPurpose
    ) {
        OtpChallenge challenge = repository
                .findByReferenceId(referenceId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_OTP",
                        "OTP reference is invalid."
                ));

        if (challenge.getPurpose() != expectedPurpose) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OTP",
                    "OTP purpose does not match."
            );
        }

        if (challenge.isConsumed() || challenge.isVerified()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OTP",
                    "OTP has already been used."
            );
        }

        if (challenge.isExpired()) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "OTP_EXPIRED",
                    "OTP has expired."
            );
        }

        if (challenge.hasExceededAttempts()) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "OTP_ATTEMPT_LIMIT_EXCEEDED",
                    "OTP attempt limit has been exceeded."
            );
        }

        if (!passwordEncoder.matches(
                submittedOtp,
                challenge.getCodeHash()
        )) {
            challenge.recordFailedAttempt();
            repository.saveAndFlush(challenge);

            if (challenge.hasExceededAttempts()) {
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "OTP_ATTEMPT_LIMIT_EXCEEDED",
                        "OTP attempt limit has been exceeded."
                );
            }

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OTP",
                    "OTP is invalid."
            );
        }

        challenge.markVerified();
        challenge.consume();

        return repository.save(challenge);
    }
}
