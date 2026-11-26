package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.response.InstallmentDto;
import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanRepaymentSchedule;
import com.fintech.loan.entity.LoanScheduleVersion;
import com.fintech.loan.enums.InstallmentStatus;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.RepaymentFrequency;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import com.fintech.loan.repository.LoanScheduleVersionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RepaymentScheduleService {

    private final LoanAccountRepository loanAccountRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanScheduleVersionRepository scheduleVersionRepository;
    private final LoanFinancialCalculator calculator;
    private final LoanOutboxService outboxService;

    @Autowired
    public RepaymentScheduleService(
            LoanAccountRepository loanAccountRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanScheduleVersionRepository scheduleVersionRepository,
            LoanFinancialCalculator calculator,
            LoanOutboxService outboxService) {
        this.loanAccountRepository = loanAccountRepository;
        this.scheduleRepository = scheduleRepository;
        this.scheduleVersionRepository = scheduleVersionRepository;
        this.calculator = calculator;
        this.outboxService = outboxService;
    }

    public RepaymentScheduleService(
            LoanAccountRepository loanAccountRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanFinancialCalculator calculator) {
        this(loanAccountRepository, scheduleRepository, null, calculator, null);
    }

    @Transactional(readOnly = true)
    public RepaymentScheduleResponse getSchedule(String actorSubject, String loanAccountId, boolean isStaff) {
        LoanAccount account = loanAccountRepository.findByLoanAccountId(loanAccountId)
                .orElseThrow(() -> new ApiException("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + loanAccountId, HttpStatus.NOT_FOUND));

        if (!isStaff) {
            boolean owns = (account.getIdentitySubject() != null && account.getIdentitySubject().equalsIgnoreCase(actorSubject))
                    || (account.getCustomerId() != null && account.getCustomerId().equalsIgnoreCase(actorSubject));
            if (!owns) {
                throw ApiException.forbidden("ACCESS_DENIED",
                        "You do not have access to loan account: " + loanAccountId);
            }
        }

        List<LoanRepaymentSchedule> persisted = scheduleRepository.findByLoanAccountIdOrderByInstallmentNumberAsc(loanAccountId);
        List<InstallmentDto> installments = persisted.isEmpty()
                ? computeInstallmentDtos(account, InterestCalculationMethod.REDUCING_BALANCE)
                : persisted.stream().map(this::toInstallmentDto).toList();

        return new RepaymentScheduleResponse(
                account.getLoanAccountId(),
                account.getCurrency(),
                account.getOutstandingPrincipal(),
                account.getNextDueDate(),
                installments
        );
    }

    @Transactional
    public void generateAndPersistSchedule(LoanAccount account, InterestCalculationMethod method) {
        List<LoanRepaymentSchedule> existing = scheduleRepository.findByLoanAccountIdOrderByInstallmentNumberAsc(account.getLoanAccountId());
        if (!existing.isEmpty()) {
            return;
        }
        BigDecimal principalBasis = account.getDisbursedAmount() != null
                ? account.getDisbursedAmount()
                : account.getPrincipalAmount();
        int version = account.getCurrentScheduleVersion() != null ? account.getCurrentScheduleVersion() : 1;
        LocalDate startDate = account.getDisbursementDate() != null ? account.getDisbursementDate() : LocalDate.now();
        RepaymentFrequency frequency = parseFrequency(account.getRepaymentFrequency());

        List<LoanRepaymentSchedule> entities = buildScheduleEntities(
                account.getLoanAccountId(),
                principalBasis,
                account.getInterestRate(),
                account.getTenureMonths(),
                method,
                frequency,
                startDate,
                1,
                version
        );
        scheduleRepository.saveAll(entities);
        saveVersionRecord(account, version, principalBasis, account.getTenureMonths(), account.getEmiAmount(),
                "INITIAL_DISBURSEMENT", "SYSTEM");
        publishScheduleEvent(account, version, entities.size(), principalBasis, account.getEmiAmount(), "INITIAL_DISBURSEMENT");
    }

    /**
     * Explicitly authorized schedule regeneration (e.g., after part-prepayment or staff restructuring).
     * Preserves settled/partially-paid historical installments and replaces unpaid future installments.
     */
    @Transactional
    public List<LoanRepaymentSchedule> regenerateSchedule(
            LoanAccount account,
            InterestCalculationMethod method,
            BigDecimal newPrincipalBasis,
            int remainingMonths,
            LocalDate anchorDate,
            String reason,
            String actor) {

        List<LoanRepaymentSchedule> existing = scheduleRepository
                .findByLoanAccountIdOrderByInstallmentNumberAsc(account.getLoanAccountId());

        int maxSettledNumber = 0;
        List<LoanRepaymentSchedule> toRemove = new ArrayList<>();
        for (LoanRepaymentSchedule item : existing) {
            if (item.getStatus() == InstallmentStatus.PAID
                    || item.getStatus() == InstallmentStatus.PARTIALLY_PAID
                    || item.getStatus() == InstallmentStatus.OVERDUE) {
                maxSettledNumber = Math.max(maxSettledNumber, item.getInstallmentNumber());
            } else {
                toRemove.add(item);
            }
        }
        if (!toRemove.isEmpty()) {
            scheduleRepository.deleteAll(toRemove);
        }

        int nextVersion = (account.getCurrentScheduleVersion() != null ? account.getCurrentScheduleVersion() : 1) + 1;
        account.setCurrentScheduleVersion(nextVersion);

        if (newPrincipalBasis.compareTo(BigDecimal.ZERO) <= 0 || remainingMonths <= 0) {
            saveVersionRecord(account, nextVersion, BigDecimal.ZERO, 0, BigDecimal.ZERO, reason, actor);
            return List.of();
        }

        RepaymentFrequency frequency = parseFrequency(account.getRepaymentFrequency());
        List<LoanRepaymentSchedule> regenerated = buildScheduleEntities(
                account.getLoanAccountId(),
                newPrincipalBasis,
                account.getInterestRate(),
                remainingMonths,
                method,
                frequency,
                anchorDate != null ? anchorDate : LocalDate.now(),
                maxSettledNumber + 1,
                nextVersion
        );
        scheduleRepository.saveAll(regenerated);

        if (!regenerated.isEmpty()) {
            account.setEmiAmount(regenerated.get(0).getTotalAmount());
            account.setNextDueDate(regenerated.get(0).getDueDate());
        }
        saveVersionRecord(account, nextVersion, newPrincipalBasis, remainingMonths,
                account.getEmiAmount(), reason, actor);
        publishScheduleEvent(account, nextVersion, regenerated.size(), newPrincipalBasis,
                account.getEmiAmount(), reason);
        return regenerated;
    }

    public List<LoanRepaymentSchedule> buildScheduleEntities(
            String loanAccountId,
            BigDecimal principal,
            BigDecimal annualRate,
            int tenureMonths,
            InterestCalculationMethod method,
            RepaymentFrequency frequency,
            LocalDate startDate,
            int startingInstallmentNumber,
            int scheduleVersion) {

        int periodMonths = periodMonths(frequency);
        int periods = Math.max(1, (int) Math.ceil((double) tenureMonths / periodMonths));
        BigDecimal periodRate = annualRate.multiply(BigDecimal.valueOf(periodMonths))
                .divide(LoanConstants.TWELVE_HUNDRED, 12, RoundingMode.HALF_UP);

        BigDecimal emi = calculatePeriodInstallment(principal, periodRate, periods, method);

        List<LoanRepaymentSchedule> list = new ArrayList<>(periods);
        BigDecimal balance = principal.setScale(2, RoundingMode.HALF_UP);
        LocalDate today = LocalDate.now();

        for (int idx = 0; idx < periods; idx++) {
            int installmentNumber = startingInstallmentNumber + idx;
            LocalDate dueDate = startDate.plusMonths((long) (idx + 1) * periodMonths);
            BigDecimal openingPrincipal = balance;

            BigDecimal interestAmount = method == InterestCalculationMethod.FLAT
                    ? principal.multiply(periodRate).setScale(2, RoundingMode.HALF_UP)
                    : openingPrincipal.multiply(periodRate).setScale(2, RoundingMode.HALF_UP);

            BigDecimal principalAmount;
            if (idx == periods - 1) {
                principalAmount = openingPrincipal;
            } else {
                principalAmount = emi.subtract(interestAmount).setScale(2, RoundingMode.HALF_UP);
                if (principalAmount.compareTo(BigDecimal.ZERO) < 0) {
                    principalAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
                if (principalAmount.compareTo(openingPrincipal) > 0) {
                    principalAmount = openingPrincipal;
                }
            }

            BigDecimal totalAmount = principalAmount.add(interestAmount).setScale(2, RoundingMode.HALF_UP);
            BigDecimal closingPrincipal = openingPrincipal.subtract(principalAmount).setScale(2, RoundingMode.HALF_UP);
            if (closingPrincipal.compareTo(BigDecimal.ZERO) < 0) {
                closingPrincipal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }
            balance = closingPrincipal;

            InstallmentStatus status;
            if (dueDate.isBefore(today)) {
                status = InstallmentStatus.OVERDUE;
            } else if (!dueDate.isAfter(today.plusDays(7))) {
                status = InstallmentStatus.DUE;
            } else {
                status = InstallmentStatus.UPCOMING;
            }

            LoanRepaymentSchedule item = new LoanRepaymentSchedule();
            item.setId(UUID.randomUUID());
            item.setInstallmentId("INST-" + loanAccountId + "-" + installmentNumber);
            item.setLoanAccountId(loanAccountId);
            item.setScheduleVersion(scheduleVersion);
            item.setInstallmentNumber(installmentNumber);
            item.setDueDate(dueDate);
            item.setGracePeriodEndDate(dueDate.plusDays(5));
            item.setOpeningPrincipal(openingPrincipal);
            item.setClosingPrincipal(closingPrincipal);
            item.setPrincipalAmount(principalAmount);
            item.setInterestAmount(interestAmount);
            item.setChargesAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setTotalAmount(totalAmount);
            item.setPaidAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setPrincipalPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setInterestPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setChargesPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setRemainingAmount(totalAmount);
            item.setOutstandingBalanceAfter(closingPrincipal);
            item.setStatus(status);
            list.add(item);
        }
        return list;
    }

    private BigDecimal calculatePeriodInstallment(
            BigDecimal principal, BigDecimal periodRate, int periods, InterestCalculationMethod method) {
        if (periods <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (periodRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(periods), 2, RoundingMode.HALF_UP);
        }
        if (method == InterestCalculationMethod.FLAT) {
            BigDecimal totalInterest = principal.multiply(periodRate).multiply(BigDecimal.valueOf(periods));
            return principal.add(totalInterest).divide(BigDecimal.valueOf(periods), 2, RoundingMode.HALF_UP);
        }
        BigDecimal onePlusR = BigDecimal.ONE.add(periodRate);
        BigDecimal factor = onePlusR.pow(periods);
        BigDecimal numerator = principal.multiply(periodRate).multiply(factor);
        BigDecimal denominator = factor.subtract(BigDecimal.ONE);
        if (denominator.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(periods), 2, RoundingMode.HALF_UP);
        }
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private int periodMonths(RepaymentFrequency frequency) {
        if (frequency == null) return 1;
        return switch (frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case HALF_YEARLY -> 6;
            case YEARLY -> 12;
        };
    }

    private RepaymentFrequency parseFrequency(String raw) {
        if (raw == null || raw.isBlank()) return RepaymentFrequency.MONTHLY;
        try {
            return RepaymentFrequency.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return RepaymentFrequency.MONTHLY;
        }
    }

    private List<InstallmentDto> computeInstallmentDtos(LoanAccount account, InterestCalculationMethod method) {
        BigDecimal basis = account.getDisbursedAmount() != null ? account.getDisbursedAmount() : account.getPrincipalAmount();
        LocalDate start = account.getDisbursementDate() != null ? account.getDisbursementDate() : LocalDate.now();
        return buildScheduleEntities(account.getLoanAccountId(), basis, account.getInterestRate(),
                account.getTenureMonths(), method, parseFrequency(account.getRepaymentFrequency()), start, 1, 1)
                .stream()
                .map(this::toInstallmentDto)
                .toList();
    }

    private InstallmentDto toInstallmentDto(LoanRepaymentSchedule s) {
        String id = s.getInstallmentId() != null
                ? s.getInstallmentId()
                : "INST-" + s.getLoanAccountId() + "-" + s.getInstallmentNumber();
        return new InstallmentDto(
                id,
                s.getInstallmentNumber(),
                s.getDueDate(),
                s.getPrincipalAmount(),
                s.getInterestAmount(),
                s.getTotalAmount(),
                s.getPaidAmount(),
                s.getStatus().name()
        );
    }

    private void saveVersionRecord(LoanAccount account, int version, BigDecimal principalBasis,
                                   int remainingMonths, BigDecimal emi, String reason, String actor) {
        if (scheduleVersionRepository == null) return;
        LoanScheduleVersion ver = new LoanScheduleVersion();
        ver.setLoanAccountId(account.getLoanAccountId());
        ver.setVersionNumber(version);
        ver.setPrincipalBasis(principalBasis);
        ver.setAnnualInterestRate(account.getInterestRate());
        ver.setRemainingTenureMonths(remainingMonths);
        ver.setEmiAmount(emi);
        ver.setReason(reason);
        ver.setCreatedBy(actor != null ? actor : "SYSTEM");
        scheduleVersionRepository.save(ver);
    }

    private void publishScheduleEvent(LoanAccount account, int version, int count,
                                      BigDecimal principalBasis, BigDecimal emi, String reason) {
        if (outboxService == null) return;
        outboxService.enqueueEvent(
                LoanConstants.TOPIC_REPAYMENT_SCHEDULE_GENERATED,
                account.getLoanAccountId(),
                "LOAN_ACCOUNT",
                "LoanRepaymentScheduleGenerated",
                new LoanEvents.RepaymentScheduleGeneratedPayload(
                        account.getLoanAccountId(),
                        account.getCustomerId(),
                        version,
                        count,
                        principalBasis,
                        emi,
                        reason,
                        Instant.now()
                )
        );
    }
}
