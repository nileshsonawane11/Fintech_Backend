package com.fintech.card.repository;

import com.fintech.card.entity.CardApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardApplicationRepository extends JpaRepository<CardApplication, String> {

    Optional<CardApplication> findByCardApplicationId(String cardApplicationId);

    Optional<CardApplication> findByIdOrCardApplicationId(String id, String cardApplicationId);

    List<CardApplication> findByCustomerId(String customerId);

    List<CardApplication> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<CardApplication> findAllByOrderByCreatedAtDesc();
}
