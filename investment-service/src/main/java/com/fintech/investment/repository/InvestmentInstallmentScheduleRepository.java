package com.fintech.investment.repository;

import com.fintech.investment.entity.InvestmentEnums.InstallmentStatus;
import com.fintech.investment.entity.InvestmentInstallmentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentInstallmentScheduleRepository extends JpaRepository<InvestmentInstallmentSchedule, UUID> {
    List<InvestmentInstallmentSchedule> findByInvestmentIdOrderByInstallmentNumberAsc(String investmentId);
    Optional<InvestmentInstallmentSchedule> findByScheduleId(String scheduleId);
    List<InvestmentInstallmentSchedule> findByStatusInAndDueDateLessThanEqual(List<InstallmentStatus> statuses, LocalDate dueDate);
    List<InvestmentInstallmentSchedule> findByStatusOrderByDueDateDesc(InstallmentStatus status);
}
