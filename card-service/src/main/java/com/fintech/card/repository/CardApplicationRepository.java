package com.fintech.card.repository;

import com.fintech.card.entity.CardApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CardApplicationRepository extends JpaRepository<CardApplication, String> {

    Optional<CardApplication> findByCardApplicationId(String cardApplicationId);
}
