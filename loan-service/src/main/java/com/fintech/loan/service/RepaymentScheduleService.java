package com.fintech.loan.service;

import com.fintech.loan.dto.response.InstallmentDto;
import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class RepaymentScheduleService {

    private final LoanAccountRepository loanAccountRepository;

    public RepaymentScheduleService(LoanAccountRepository loanAccountRepository) {
        this.loanAccountRepository = loanAccountRepository;
    }

    public RepaymentScheduleResponse getSchedule(String customerId, String loanAccountId) {
        LoanAccount account = loanAccountRepository.findByLoanAccountIdAndCustomerId(
                        loanAccountId, customerId)
                .orElseThrow(() -> new ApiException("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + loanAccountId,
                        HttpStatus.NOT_FOUND));

        List<InstallmentDto> installments = generateInstallments(account);

        return new RepaymentScheduleResponse(
                account.getLoanAccountId(),
                account.getCurrency(),
                account.getOutstandingPrincipal(),
                account.getNextDueDate(),
                installments
        );
    }

    /**
     * Generate full amortization schedule using reducing balance method.
     * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
     */
    private List<InstallmentDto> generateInstallments(LoanAccount account) {
        List<InstallmentDto> installments = new ArrayList<>();

        BigDecimal principal = account.getPrincipalAmount();
        BigDecimal annualRate = account.getInterestRate();
        int n = account.getTenureMonths();

        BigDecimal r = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);

        BigDecimal emi;
        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = principal.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
        } else {
            BigDecimal onePlusR = BigDecimal.ONE.add(r);
            BigDecimal onePlusRPowN = onePlusR.pow(n, new MathContext(15, RoundingMode.HALF_UP));
            BigDecimal numerator = principal.multiply(r).multiply(onePlusRPowN);
            BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);
            emi = numerator.divide(denominator, 2, RoundingMode.HALF_UP);
        }

        LocalDate disbursementDate = account.getDisbursementDate() != null
                ? account.getDisbursementDate()
                : LocalDate.now();

        BigDecimal balance = principal;
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= n; i++) {
            LocalDate dueDate = disbursementDate.plusMonths(i);

            BigDecimal interestAmount = balance.multiply(r).setScale(2, RoundingMode.HALF_UP);
            BigDecimal principalAmount;
            if (i == n) {
                principalAmount = balance; // last installment clears remaining balance
            } else {
                principalAmount = emi.subtract(interestAmount);
                if (principalAmount.compareTo(balance) > 0) {
                    principalAmount = balance;
                }
            }
            BigDecimal totalAmount = principalAmount.add(interestAmount);

            String status;
            BigDecimal paidAmount;
            if (dueDate.isBefore(today)) {
                status = "OVERDUE";
                paidAmount = BigDecimal.ZERO;
            } else if (dueDate.isEqual(today)) {
                status = "DUE";
                paidAmount = BigDecimal.ZERO;
            } else {
                status = "DUE";
                paidAmount = BigDecimal.ZERO;
            }

            installments.add(new InstallmentDto(
                    "INST-" + account.getLoanAccountId() + "-" + i,
                    i,
                    dueDate,
                    principalAmount.setScale(2, RoundingMode.HALF_UP),
                    interestAmount,
                    totalAmount.setScale(2, RoundingMode.HALF_UP),
                    paidAmount,
                    status
            ));

            balance = balance.subtract(principalAmount);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                balance = BigDecimal.ZERO;
            }
        }

        return installments;
    }
}
