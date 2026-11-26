package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanProductRepository extends JpaRepository<LoanProduct, UUID>, JpaSpecificationExecutor<LoanProduct> {

    Optional<LoanProduct> findByProductCodeIgnoreCase(String productCode);

    Optional<LoanProduct> findByIdAndDeletedFalse(UUID id);

    Optional<LoanProduct> findByProductCodeIgnoreCaseAndDeletedFalse(String productCode);

    Optional<LoanProduct> findByProductCodeIgnoreCaseAndStatusAndDeletedFalse(String productCode, ProductStatus status);

    Optional<LoanProduct> findByIdAndStatusAndDeletedFalse(UUID id, ProductStatus status);

    boolean existsByProductCodeIgnoreCase(String productCode);

    boolean existsByProductCodeIgnoreCaseAndIdNot(String productCode, UUID id);

    List<LoanProduct> findAllByStatusAndDeletedFalseOrderByProductNameAsc(ProductStatus status);

    List<LoanProduct> findAllByLoanCategoryAndStatusAndDeletedFalseOrderByProductNameAsc(
            LoanCategory loanCategory, ProductStatus status);

    @Query("""
            SELECT p FROM LoanProduct p
            WHERE (:includeDeleted = true OR p.deleted = false)
              AND (:status IS NULL OR p.status = :status)
              AND (:loanCategory IS NULL OR p.loanCategory = :loanCategory)
              AND (:search IS NULL OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<LoanProduct> findAdminProducts(
            @Param("loanCategory") LoanCategory loanCategory,
            @Param("status") ProductStatus status,
            @Param("includeDeleted") boolean includeDeleted,
            @Param("search") String search,
            Pageable pageable);
}
