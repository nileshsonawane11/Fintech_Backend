package com.fintech.card.repository;

import com.fintech.card.entity.CardApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardApplicationRepository extends JpaRepository<CardApplication, String> {

    Optional<CardApplication> findByCardApplicationId(String cardApplicationId);

    Optional<CardApplication> findByIdOrCardApplicationId(String id, String cardApplicationId);

    List<CardApplication> findByCustomerId(String customerId);

    List<CardApplication> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<CardApplication> findByIdentitySubjectOrderByCreatedAtDesc(String identitySubject);

    List<CardApplication> findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(String identitySubject, String customerId);

    List<CardApplication> findAllByOrderByCreatedAtDesc();

    boolean existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(
            String customerId, String linkedAccountId, String cardType, Collection<String> statuses);

    boolean existsByProductSlugIgnoreCase(String productSlug);
}