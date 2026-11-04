package com.fintech.account.repository;

import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountProductRepository extends JpaRepository<AccountProduct, UUID> {

    Optional<AccountProduct> findByProductCode(String productCode);

    boolean existsByProductCode(String productCode);

    @Query("SELECT p FROM AccountProduct p WHERE " +
           "(:type IS NULL OR p.accountType = :type) AND " +
           "(:active IS NULL OR p.active = :active) AND " +
           "(:cursor IS NULL OR p.productCode > :cursor) " +
           "ORDER BY p.productCode ASC")
    Slice<AccountProduct> findProductsWithCursor(
            @Param("type") AccountType type,
            @Param("active") Boolean active,
            @Param("cursor") String cursor,
            Pageable pageable
    );
}
