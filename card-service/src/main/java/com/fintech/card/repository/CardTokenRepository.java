package com.fintech.card.repository;

import com.fintech.card.entity.CardToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CardTokenRepository extends JpaRepository<CardToken, String> {

    Optional<CardToken> findByCardTokenId(String cardTokenId);

    Optional<CardToken> findByIdempotencyKey(String idempotencyKey);
}
