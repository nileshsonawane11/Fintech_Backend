package com.fintech.loan.repository;

import com.fintech.loan.entity.LoanCharge;
import com.fintech.loan.enums.LoanChargeStatus;
import com.fintech.loan.enums.LoanChargeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanChargeRepository extends JpaRepository<LoanCharge, UUID> {
    Optional<LoanCharge> findByChargeId(String chargeId);
    List<LoanCharge> findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(String loanAccountId, Collection<LoanChargeStatus> statuses);
    List<LoanCharge> findByInstallmentIdAndStatusInOrderByAssessedDateAsc(String installmentId, Collection<LoanChargeStatus> statuses);
    boolean existsByInstallmentIdAndChargeType(String installmentId, LoanChargeType chargeType);
}
