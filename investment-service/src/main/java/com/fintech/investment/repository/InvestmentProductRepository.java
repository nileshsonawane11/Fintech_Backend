package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentEnums.ProductStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import com.fintech.investment.entity.InvestmentProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentProductRepository extends JpaRepository<InvestmentProduct, UUID> {
    Optional<InvestmentProduct> findByProductCodeAndDeletedFalse(String productCode);
    List<InvestmentProduct> findByStatusAndDeletedFalseOrderByProductTypeAscProductNameAsc(ProductStatus status);
    List<InvestmentProduct> findByProductTypeAndStatusAndDeletedFalseOrderByProductNameAsc(ProductType productType, ProductStatus status);
    List<InvestmentProduct> findByDeletedFalseOrderByCreatedAtDesc();
    boolean existsByProductCodeAndDeletedFalse(String productCode);
}
