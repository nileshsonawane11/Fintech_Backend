package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, String> {

    Optional<LoanApplication> findByLoanApplicationId(String loanApplicationId);

    List<LoanApplication> findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(String identitySubject, String customerId);

    List<LoanApplication> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    boolean existsByProductCodeIgnoreCase(String productCode);

    @Query("""
        SELECT a FROM LoanApplication a
        WHERE (:status IS NULL OR a.status = :status)
          AND (:productCode IS NULL OR UPPER(a.productCode) = :productCode)
          AND (:assignedOfficerId IS NULL OR a.assignedOfficerId = :assignedOfficerId)
        """)
    Page<LoanApplication> findOpsApplications(
            @Param("status") String status,
            @Param("productCode") String productCode,
            @Param("assignedOfficerId") String assignedOfficerId,
            Pageable pageable
    );

    List<LoanApplication> findAllByDisbursementAccountIdAndStatusIn(String disbursementAccountId, List<String> statuses);
}
