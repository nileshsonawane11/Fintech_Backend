package com.fintech.loan.service;

import com.fintech.loan.entity.*;
import com.fintech.loan.enums.InstallmentStatus;
import com.fintech.loan.enums.LoanChargeStatus;
import com.fintech.loan.enums.LoanChargeType;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanChargeRepository;
import com.fintech.loan.repository.LoanRepaymentAllocationRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

/**
 * Contractual Payment Allocation Engine:
 * Waterfall order (configurable per product, default standard banking waterfall):
 * 1. Pending Bounce / Late / Penal Charges (LoanCharge rows)
 * 2. Overdue Interest / Accrued Interest on due/overdue installments
 * 3. Installment Principal on due/overdue installments (oldest first)
 * 4. Excess / Advance Principal reduction (if permitted)
 *
 * Never marks an installment PAID unless remainingAmount == 0.00; partial payments become PARTIALLY_PAID.
 * Supports full reversal & restoration of installment/loan balances.
 */
@Service
public class PaymentAllocationService {

    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanChargeRepository chargeRepository;
    private final LoanRepaymentAllocationRepository allocationRepository;
    private final LoanAccountRepository loanAccountRepository;

    public PaymentAllocationService(
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanChargeRepository chargeRepository,
            LoanRepaymentAllocationRepository allocationRepository,
            LoanAccountRepository loanAccountRepository) {
        this.scheduleRepository = scheduleRepository;
        this.chargeRepository = chargeRepository;
        this.allocationRepository = allocationRepository;
        this.loanAccountRepository = loanAccountRepository;
    }

    public AllocationBreakdown previewEmiAllocation(LoanAccount account, String targetInstallmentId, BigDecimal paymentAmount) {
        BigDecimal remainingToAllocate = paymentAmount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCharges = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPrincipal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        // 1. Pending charges
        List<LoanCharge> pendingCharges = chargeRepository.findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(
                account.getLoanAccountId(), List.of(LoanChargeStatus.PENDING, LoanChargeStatus.PARTIALLY_PAID));
        for (LoanCharge c : pendingCharges) {
            if (remainingToAllocate.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal due = c.getRemainingAmount();
            BigDecimal pay = due.min(remainingToAllocate);
            totalCharges = totalCharges.add(pay);
            remainingToAllocate = remainingToAllocate.subtract(pay);
        }

        // 2. Eligible installments (target first if specified, otherwise oldest unpaid)
        List<LoanRepaymentSchedule> installments = selectTargetInstallments(account.getLoanAccountId(), targetInstallmentId);
        for (LoanRepaymentSchedule inst : installments) {
            if (remainingToAllocate.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal interestDue = inst.getInterestAmount().subtract(nonNull(inst.getInterestPaid())).max(BigDecimal.ZERO);
            BigDecimal interestPay = interestDue.min(remainingToAllocate);
            totalInterest = totalInterest.add(interestPay);
            remainingToAllocate = remainingToAllocate.subtract(interestPay);

            if (remainingToAllocate.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal principalDue = inst.getPrincipalAmount().subtract(nonNull(inst.getPrincipalPaid())).max(BigDecimal.ZERO);
                BigDecimal principalPay = principalDue.min(remainingToAllocate);
                totalPrincipal = totalPrincipal.add(principalPay);
                remainingToAllocate = remainingToAllocate.subtract(principalPay);
            }
        }

        // 3. Any remaining excess goes toward advance principal (capped at remaining outstanding principal)
        BigDecimal excessPrincipal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (remainingToAllocate.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal remainingLoanPrincipal = account.getOutstandingPrincipal().subtract(totalPrincipal).max(BigDecimal.ZERO);
            excessPrincipal = remainingToAllocate.min(remainingLoanPrincipal);
            totalPrincipal = totalPrincipal.add(excessPrincipal);
            remainingToAllocate = remainingToAllocate.subtract(excessPrincipal);
        }

        return new AllocationBreakdown(totalPrincipal, totalInterest, totalCharges, remainingToAllocate);
    }

    @Transactional
    public AllocationBreakdown applyEmiAllocation(LoanAccount account, LoanRepayment repayment) {
        BigDecimal remaining = repayment.getAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCharges = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPrincipal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        // 1. Settle pending charges first
        List<LoanCharge> pendingCharges = chargeRepository.findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(
                account.getLoanAccountId(), List.of(LoanChargeStatus.PENDING, LoanChargeStatus.PARTIALLY_PAID));
        for (LoanCharge charge : pendingCharges) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal due = charge.getRemainingAmount();
            BigDecimal pay = due.min(remaining);
            if (pay.compareTo(BigDecimal.ZERO) > 0) {
                charge.setPaidAmount(charge.getPaidAmount().add(pay));
                charge.setStatus(charge.getRemainingAmount().compareTo(BigDecimal.ZERO) == 0
                        ? LoanChargeStatus.PAID : LoanChargeStatus.PARTIALLY_PAID);
                chargeRepository.save(charge);

                LoanRepaymentAllocation alloc = new LoanRepaymentAllocation();
                alloc.setAllocationId("ALC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                alloc.setRepaymentId(repayment.getRepaymentId());
                alloc.setLoanAccountId(account.getLoanAccountId());
                alloc.setInstallmentId(charge.getInstallmentId());
                if (charge.getChargeType() == LoanChargeType.BOUNCE_CHARGE) {
                    alloc.setBounceChargeAllocated(pay);
                } else if (charge.getChargeType() == LoanChargeType.LATE_PAYMENT_PENALTY) {
                    alloc.setLateChargeAllocated(pay);
                } else if (charge.getChargeType() == LoanChargeType.OVERDUE_INTEREST) {
                    alloc.setOverdueInterestAllocated(pay);
                } else {
                    alloc.setOtherChargeAllocated(pay);
                }
                alloc.setTotalAllocated(pay);
                allocationRepository.save(alloc);

                totalCharges = totalCharges.add(pay);
                remaining = remaining.subtract(pay);
            }
        }

        // 2. Allocate across installments
        List<LoanRepaymentSchedule> installments = selectTargetInstallments(
                account.getLoanAccountId(), repayment.getInstallmentId());
        Instant now = Instant.now();

        for (LoanRepaymentSchedule inst : installments) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal intDue = inst.getInterestAmount().subtract(nonNull(inst.getInterestPaid())).max(BigDecimal.ZERO);
            BigDecimal intPay = intDue.min(remaining);
            remaining = remaining.subtract(intPay);

            BigDecimal prinDue = inst.getPrincipalAmount().subtract(nonNull(inst.getPrincipalPaid())).max(BigDecimal.ZERO);
            BigDecimal prinPay = prinDue.min(remaining);
            remaining = remaining.subtract(prinPay);

            BigDecimal instPaidNow = intPay.add(prinPay);
            if (instPaidNow.compareTo(BigDecimal.ZERO) > 0) {
                inst.setInterestPaid(nonNull(inst.getInterestPaid()).add(intPay));
                inst.setPrincipalPaid(nonNull(inst.getPrincipalPaid()).add(prinPay));
                inst.setPaidAmount(nonNull(inst.getPaidAmount()).add(instPaidNow));

                BigDecimal newRemaining = inst.getTotalAmount()
                        .add(nonNull(inst.getChargesAmount()))
                        .subtract(inst.getPaidAmount())
                        .max(BigDecimal.ZERO);
                inst.setRemainingAmount(newRemaining);

                if (newRemaining.compareTo(BigDecimal.ZERO) == 0) {
                    inst.setStatus(InstallmentStatus.PAID);
                    inst.setPaidAt(now);
                } else {
                    inst.setStatus(InstallmentStatus.PARTIALLY_PAID);
                }
                scheduleRepository.save(inst);

                LoanRepaymentAllocation alloc = new LoanRepaymentAllocation();
                alloc.setAllocationId("ALC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                alloc.setRepaymentId(repayment.getRepaymentId());
                alloc.setLoanAccountId(account.getLoanAccountId());
                alloc.setInstallmentId(inst.getInstallmentId());
                alloc.setInterestAllocated(intPay);
                alloc.setPrincipalAllocated(prinPay);
                alloc.setTotalAllocated(instPaidNow);
                allocationRepository.save(alloc);

                totalInterest = totalInterest.add(intPay);
                totalPrincipal = totalPrincipal.add(prinPay);
            }
        }

        // 3. Apply any remaining excess to principal outstanding
        BigDecimal excessAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal availablePrincipalToReduce = account.getOutstandingPrincipal().subtract(totalPrincipal).max(BigDecimal.ZERO);
            BigDecimal advancePrincipal = remaining.min(availablePrincipalToReduce);
            if (advancePrincipal.compareTo(BigDecimal.ZERO) > 0) {
                LoanRepaymentAllocation advAlloc = new LoanRepaymentAllocation();
                advAlloc.setAllocationId("ALC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                advAlloc.setRepaymentId(repayment.getRepaymentId());
                advAlloc.setLoanAccountId(account.getLoanAccountId());
                advAlloc.setPrincipalAllocated(advancePrincipal);
                advAlloc.setTotalAllocated(advancePrincipal);
                allocationRepository.save(advAlloc);

                totalPrincipal = totalPrincipal.add(advancePrincipal);
                remaining = remaining.subtract(advancePrincipal);
            }
            excessAmount = remaining;
        }

        // 4. Update LoanAccount balances & next due date
        account.setTotalPrincipalRepaid(nonNull(account.getTotalPrincipalRepaid()).add(totalPrincipal));
        account.setTotalInterestRepaid(nonNull(account.getTotalInterestRepaid()).add(totalInterest));
        account.setTotalChargesRepaid(nonNull(account.getTotalChargesRepaid()).add(totalCharges));
        account.setChargesOutstanding(nonNull(account.getChargesOutstanding()).subtract(totalCharges).max(BigDecimal.ZERO));
        account.setOutstandingPrincipal(account.getOutstandingPrincipal().subtract(totalPrincipal).max(BigDecimal.ZERO));

        if (account.getOutstandingPrincipal().compareTo(BigDecimal.ZERO) == 0
                && nonNull(account.getChargesOutstanding()).compareTo(BigDecimal.ZERO) == 0) {
            account.setStatus("CLOSED");
            account.setClosedAt(now);
            account.setNextDueDate(null);
            account.setDpd(0);
        } else {
            scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                    account.getLoanAccountId(),
                    List.of(InstallmentStatus.OVERDUE, InstallmentStatus.DUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.UPCOMING)
            ).stream().findFirst().ifPresent(next -> account.setNextDueDate(next.getDueDate()));
        }
        loanAccountRepository.save(account);

        repayment.setPrincipalAmount(totalPrincipal);
        repayment.setInterestAmount(totalInterest);
        repayment.setChargesAmount(totalCharges);
        repayment.setExcessAmount(excessAmount);

        return new AllocationBreakdown(totalPrincipal, totalInterest, totalCharges, excessAmount);
    }

    @Transactional
    public void reverseAllocations(LoanAccount account, LoanRepayment repayment) {
        List<LoanRepaymentAllocation> allocations = allocationRepository.findByRepaymentId(repayment.getRepaymentId());
        for (LoanRepaymentAllocation alloc : allocations) {
            if (alloc.isReversed()) continue;
            if (alloc.getInstallmentId() != null) {
                scheduleRepository.findByInstallmentId(alloc.getInstallmentId()).ifPresent(inst -> {
                    BigDecimal reversedPrincipal = alloc.getPrincipalAllocated();
                    BigDecimal reversedInterest = alloc.getInterestAllocated();
                    BigDecimal reversedTotal = reversedPrincipal.add(reversedInterest);

                    inst.setPrincipalPaid(nonNull(inst.getPrincipalPaid()).subtract(reversedPrincipal).max(BigDecimal.ZERO));
                    inst.setInterestPaid(nonNull(inst.getInterestPaid()).subtract(reversedInterest).max(BigDecimal.ZERO));
                    inst.setPaidAmount(nonNull(inst.getPaidAmount()).subtract(reversedTotal).max(BigDecimal.ZERO));
                    BigDecimal newRemaining = inst.getTotalAmount()
                            .add(nonNull(inst.getChargesAmount()))
                            .subtract(inst.getPaidAmount())
                            .max(BigDecimal.ZERO);
                    inst.setRemainingAmount(newRemaining);
                    if (inst.getPaidAmount().compareTo(BigDecimal.ZERO) == 0) {
                        inst.setStatus(inst.getDueDate().isBefore(java.time.LocalDate.now())
                                ? InstallmentStatus.OVERDUE : InstallmentStatus.DUE);
                        inst.setPaidAt(null);
                    } else {
                        inst.setStatus(InstallmentStatus.PARTIALLY_PAID);
                        inst.setPaidAt(null);
                    }
                    scheduleRepository.save(inst);
                });
            }
            alloc.setReversed(true);
            allocationRepository.save(alloc);
        }

        account.setOutstandingPrincipal(account.getOutstandingPrincipal().add(nonNull(repayment.getPrincipalAmount())));
        account.setTotalPrincipalRepaid(nonNull(account.getTotalPrincipalRepaid()).subtract(nonNull(repayment.getPrincipalAmount())).max(BigDecimal.ZERO));
        account.setTotalInterestRepaid(nonNull(account.getTotalInterestRepaid()).subtract(nonNull(repayment.getInterestAmount())).max(BigDecimal.ZERO));
        account.setTotalChargesRepaid(nonNull(account.getTotalChargesRepaid()).subtract(nonNull(repayment.getChargesAmount())).max(BigDecimal.ZERO));
        if ("CLOSED".equalsIgnoreCase(account.getStatus()) && account.getOutstandingPrincipal().compareTo(BigDecimal.ZERO) > 0) {
            account.setStatus("ACTIVE");
            account.setClosedAt(null);
        }
        loanAccountRepository.save(account);
    }

    private List<LoanRepaymentSchedule> selectTargetInstallments(String loanAccountId, String targetInstallmentId) {
        List<LoanRepaymentSchedule> unpaid = scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                loanAccountId,
                List.of(InstallmentStatus.OVERDUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.DUE, InstallmentStatus.UPCOMING)
        );
        if (targetInstallmentId == null || targetInstallmentId.isBlank()) {
            return unpaid;
        }
        List<LoanRepaymentSchedule> ordered = new ArrayList<>();
        unpaid.stream().filter(i -> targetInstallmentId.equals(i.getInstallmentId())).findFirst().ifPresent(ordered::add);
        unpaid.stream().filter(i -> !targetInstallmentId.equals(i.getInstallmentId())).forEach(ordered::add);
        return ordered;
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public record AllocationBreakdown(
            BigDecimal principalAmount,
            BigDecimal interestAmount,
            BigDecimal chargesAmount,
            BigDecimal excessAmount
    ) {}
}
