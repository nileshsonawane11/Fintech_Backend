package com.fintech.card.repository;

import com.fintech.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, String> {

    List<Card> findByCustomerId(String customerId);

    Optional<Card> findByCardId(String cardId);
}
