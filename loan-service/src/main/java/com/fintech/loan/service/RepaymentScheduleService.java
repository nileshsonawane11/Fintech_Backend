package com.fintech.loan.service;

import com.fintech.loan.dto.response.InstallmentDto;
import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanRepaymentSchedule;
import com.fintech.loan.enums.InstallmentStatus;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RepaymentScheduleService {

    private final LoanAccountRepository loanAccountRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanFinancialCalculator calculator;

    public RepaymentScheduleService(
            LoanAccountRepository loanAccountRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanFinancialCalculator calculator) {
        this.loanAccountRepository = loanAccountRepository;
        this.scheduleRepository = scheduleRepository;
        this.calculator = calculator;
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
                : persisted.stream().map(s -> new InstallmentDto(
                        "INST-" + account.getLoanAccountId() + "-" + s.getInstallmentNumber(),
                        s.getInstallmentNumber(),
                        s.getDueDate(),
                        s.getPrincipalAmount(),
                        s.getInterestAmount(),
                        s.getTotalAmount(),
                        s.getPaidAmount(),
                        s.getStatus().name()
                )).toList();

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
        List<LoanRepaymentSchedule> entities = buildScheduleEntities(account, method);
        scheduleRepository.saveAll(entities);
    }

    private List<InstallmentDto> computeInstallmentDtos(LoanAccount account, InterestCalculationMethod method) {
        return buildScheduleEntities(account, method).stream()
                .map(s -> new InstallmentDto(
                        "INST-" + account.getLoanAccountId() + "-" + s.getInstallmentNumber(),
                        s.getInstallmentNumber(),
                        s.getDueDate(),
                        s.getPrincipalAmount(),
                        s.getInterestAmount(),
                        s.getTotalAmount(),
                        s.getPaidAmount(),
                        s.getStatus().name()
                ))
                .toList();
    }

    private List<LoanRepaymentSchedule> buildScheduleEntities(LoanAccount account, InterestCalculationMethod method) {
        List<LoanRepaymentSchedule> list = new ArrayList<>();
        BigDecimal principal = account.getPrincipalAmount();
        BigDecimal annualRate = account.getInterestRate();
        int n = account.getTenureMonths();

        BigDecimal emi = calculator.calculateEmi(principal, annualRate, n, method);
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);
        LocalDate disbursementDate = account.getDisbursementDate() != null ? account.getDisbursementDate() : LocalDate.now();

        BigDecimal balance = principal;
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= n; i++) {
            LocalDate dueDate = disbursementDate.plusMonths(i);
            BigDecimal interestAmount = method == InterestCalculationMethod.FLAT
                    ? principal.multiply(monthlyRate).setScale(2, RoundingMode.HALF_UP)
                    : balance.multiply(monthlyRate).setScale(2, RoundingMode.HALF_UP);

            BigDecimal principalAmount;
            if (i == n) {
                principalAmount = balance;
            } else {
                principalAmount = emi.subtract(interestAmount);
                if (principalAmount.compareTo(BigDecimal.ZERO) < 0) {
                    principalAmount = BigDecimal.ZERO;
                }
                if (principalAmount.compareTo(balance) > 0) {
                    principalAmount = balance;
                }
            }
            BigDecimal totalAmount = principalAmount.add(interestAmount).setScale(2, RoundingMode.HALF_UP);
            balance = balance.subtract(principalAmount);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                balance = BigDecimal.ZERO;
            }

            InstallmentStatus status = dueDate.isBefore(today) ? InstallmentStatus.OVERDUE : InstallmentStatus.DUE;

            LoanRepaymentSchedule item = new LoanRepaymentSchedule();
            item.setId(UUID.randomUUID());
            item.setLoanAccountId(account.getLoanAccountId());
            item.setInstallmentNumber(i);
            item.setDueDate(dueDate);
            item.setPrincipalAmount(principalAmount.setScale(2, RoundingMode.HALF_UP));
            item.setInterestAmount(interestAmount);
            item.setTotalAmount(totalAmount);
            item.setPaidAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            item.setOutstandingBalanceAfter(balance.setScale(2, RoundingMode.HALF_UP));
            item.setStatus(status);
            list.add(item);
        }
        return list;
    }
}
