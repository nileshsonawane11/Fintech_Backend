package com.fintech.card.repository;

import com.fintech.card.entity.CardProduct;
import com.fintech.card.enums.CardType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CardProductRepository extends JpaRepository<CardProduct, UUID> {

    Optional<CardProduct> findByProductCode(String productCode);

    Optional<CardProduct> findByProductCodeAndIsDeletedFalse(String productCode);

    Optional<CardProduct> findByProductCodeAndIsActiveTrueAndIsDeletedFalse(String productCode);

    Optional<CardProduct> findByIdAndIsDeletedFalse(UUID id);

    boolean existsByProductCode(String productCode);

    boolean existsByProductCodeAndIdNot(String productCode, UUID id);

    List<CardProduct> findAllByIsActiveTrueAndIsDeletedFalseOrderByProductNameAsc();

    List<CardProduct> findByCardTypeAndIsActiveTrueAndIsDeletedFalseOrderByProductNameAsc(CardType cardType);

    @Query("SELECT p FROM CardProduct p WHERE " +
           "(:includeDeleted = TRUE OR p.isDeleted = FALSE) AND " +
           "(:cardType IS NULL OR p.cardType = :cardType) AND " +
           "(:active IS NULL OR p.isActive = :active) AND " +
           "(:search IS NULL OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<CardProduct> findAdminProducts(
            @Param("cardType") CardType cardType,
            @Param("active") Boolean active,
            @Param("includeDeleted") boolean includeDeleted,
            @Param("search") String search,
            Pageable pageable
    );
}
