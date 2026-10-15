package com.fintech.identity.repository;

import com.fintech.identity.model.OtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OtpChallengeRepository
        extends JpaRepository<OtpChallenge, UUID> {

    Optional<OtpChallenge> findByReferenceId(String referenceId);
}