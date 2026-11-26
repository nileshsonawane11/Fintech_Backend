package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.WaiveChargeRequest;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanCharge;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.entity.LoanRepaymentSchedule;
import com.fintech.loan.enums.InstallmentStatus;
import com.fintech.loan.enums.LoanChargeStatus;
import com.fintech.loan.enums.LoanChargeType;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanChargeRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class OverdueAndChargeService {

    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanChargeRepository chargeRepository;
    private final LoanProductService productService;
    private final LoanProductFeeRepository feeRepository;
    private final LoanAccountAccessHelper accessHelper;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;

    public OverdueAndChargeService(
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanAccountRepository loanAccountRepository,
            LoanChargeRepository chargeRepository,
            LoanProductService productService,
            LoanProductFeeRepository feeRepository,
            LoanAccountAccessHelper accessHelper,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService) {
        this.scheduleRepository = scheduleRepository;
        this.loanAccountRepository = loanAccountRepository;
        this.chargeRepository = chargeRepository;
        this.productService = productService;
        this.feeRepository = feeRepository;
        this.accessHelper = accessHelper;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
    }

    @Transactional
    public int evaluateOverdueInstallments(LocalDate asOfDate) {
        LocalDate evalDate = asOfDate != null ? asOfDate : LocalDate.now();
        List<LoanRepaymentSchedule> candidates = scheduleRepository.findByDueDateLessThanEqualAndStatusInOrderByDueDateAsc(
                evalDate, List.of(InstallmentStatus.UPCOMING, InstallmentStatus.DUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.OVERDUE)
        );

        int overdueCount = 0;
        for (LoanRepaymentSchedule inst : candidates) {
            LocalDate graceEnd = inst.getGracePeriodEndDate() != null
                    ? inst.getGracePeriodEndDate()
                    : inst.getDueDate().plusDays(5);

            if (inst.getStatus() == InstallmentStatus.UPCOMING && !inst.getDueDate().isAfter(evalDate.plusDays(7))) {
                inst.setStatus(InstallmentStatus.DUE);
                scheduleRepository.save(inst);
            }

            if (evalDate.isAfter(graceEnd) && inst.getStatus() != InstallmentStatus.PAID && inst.getStatus() != InstallmentStatus.WAIVED) {
                boolean newlyOverdue = inst.getStatus() != InstallmentStatus.OVERDUE;
                inst.setStatus(InstallmentStatus.OVERDUE);
                scheduleRepository.save(inst);
                overdueCount++;

                LoanAccount loan = loanAccountRepository.findByLoanAccountId(inst.getLoanAccountId()).orElse(null);
                if (loan != null && "ACTIVE".equalsIgnoreCase(loan.getStatus())) {
                    int dpd = (int) Math.max(0, ChronoUnit.DAYS.between(inst.getDueDate(), evalDate));
                    if (loan.getDpd() == null || dpd > loan.getDpd()) {
                        loan.setDpd(dpd);
                        loanAccountRepository.save(loan);
                    }

                    if (!chargeRepository.existsByInstallmentIdAndChargeType(inst.getInstallmentId(), LoanChargeType.LATE_PAYMENT_PENALTY)) {
                        assessContractualLatePenalty(loan, inst, evalDate);
                    }

                    if (newlyOverdue) {
                        BigDecimal remaining = inst.getRemainingAmount() != null
                                ? inst.getRemainingAmount()
                                : inst.getTotalAmount().subtract(inst.getPaidAmount() != null ? inst.getPaidAmount() : BigDecimal.ZERO);
                        outboxService.enqueueEvent(
                                LoanConstants.TOPIC_INSTALLMENT_OVERDUE,
                                inst.getInstallmentId(),
                                "LOAN_INSTALLMENT",
                                "LoanInstallmentOverdue",
                                new LoanEvents.InstallmentReminderPayload(
                                        inst.getInstallmentId(), loan.getLoanAccountId(), loan.getCustomerId(),
                                        inst.getInstallmentNumber(), remaining, dpd, Instant.now()
                                )
                        );
                        notificationService.notifyCustomer(
                                accessHelper.customerRecipient(loan),
                                "LOAN_INSTALLMENT_OVERDUE",
                                "Overdue EMI Alert: " + loan.getLoanAccountId(),
                                "Installment #" + inst.getInstallmentNumber() + " (" + loan.getCurrency() + " " + remaining
                                        + ") is overdue by " + dpd + " day(s). Please pay immediately to avoid additional penal charges.",
                                inst.getInstallmentId()
                        );
                    }
                }
            }
        }
        return overdueCount;
    }

    private void assessContractualLatePenalty(LoanAccount loan, LoanRepaymentSchedule inst, LocalDate evalDate) {
        if (loan.getProductCode() == null) return;
        LoanProduct product = productService.findActiveProductOrThrow(loan.getProductCode());
        LoanProductFee fee = feeRepository.findByProductId(product.getId()).orElse(null);
        if (fee == null || fee.getLatePaymentPenalty() == null || fee.getLatePaymentPenalty().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal overdueBase = inst.getRemainingAmount() != null
                ? inst.getRemainingAmount()
                : inst.getTotalAmount().subtract(inst.getPaidAmount() != null ? inst.getPaidAmount() : BigDecimal.ZERO);
        if (overdueBase.compareTo(BigDecimal.ZERO) <= 0) return;

        BigDecimal penalty = overdueBase.multiply(fee.getLatePaymentPenalty())
                .divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
        if (penalty.compareTo(BigDecimal.ZERO) <= 0) return;

        LoanCharge charge = new LoanCharge();
        charge.setChargeId("CHG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        charge.setLoanAccountId(loan.getLoanAccountId());
        charge.setInstallmentId(inst.getInstallmentId());
        charge.setChargeType(LoanChargeType.LATE_PAYMENT_PENALTY);
        charge.setAmount(penalty);
        charge.setStatus(LoanChargeStatus.PENDING);
        charge.setReason("Contractual late payment penalty (" + fee.getLatePaymentPenalty() + "% on overdue EMI)");
        charge.setAssessedDate(evalDate);
        chargeRepository.save(charge);

        inst.setChargesAmount((inst.getChargesAmount() != null ? inst.getChargesAmount() : BigDecimal.ZERO).add(penalty));
        inst.setRemainingAmount((inst.getRemainingAmount() != null ? inst.getRemainingAmount() : BigDecimal.ZERO).add(penalty));
        scheduleRepository.save(inst);

        loan.setChargesOutstanding((loan.getChargesOutstanding() != null ? loan.getChargesOutstanding() : BigDecimal.ZERO).add(penalty));
        loanAccountRepository.save(loan);
    }

    @Transactional
    public void waiveInstallmentCharges(String installmentId, WaiveChargeRequest request, String actorId) {
        LoanRepaymentSchedule inst = scheduleRepository.findByInstallmentId(installmentId)
                .orElseThrow(() -> ApiException.notFound("INSTALLMENT_NOT_FOUND", "Installment not found: " + installmentId));
        List<LoanCharge> charges = chargeRepository.findByInstallmentIdAndStatusInOrderByAssessedDateAsc(
                installmentId, List.of(LoanChargeStatus.PENDING, LoanChargeStatus.PARTIALLY_PAID));
        if (charges.isEmpty()) {
            throw ApiException.unprocessable("NO_PENDING_CHARGES", "No pending charges found on installment: " + installmentId);
        }

        BigDecimal remainingToWaive = request.waiveAmount() != null ? request.waiveAmount() : BigDecimal.valueOf(Long.MAX_VALUE);
        BigDecimal totalWaived = BigDecimal.ZERO;
        Instant now = Instant.now();

        for (LoanCharge c : charges) {
            if (remainingToWaive.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal due = c.getRemainingAmount();
            BigDecimal waive = due.min(remainingToWaive);
            c.setWaivedAmount(c.getWaivedAmount().add(waive));
            c.setWaivedBy(actorId);
            c.setWaivedAt(now);
            c.setReason(request.reason());
            c.setStatus(c.getRemainingAmount().compareTo(BigDecimal.ZERO) == 0
                    ? LoanChargeStatus.WAIVED : LoanChargeStatus.PARTIALLY_PAID);
            chargeRepository.save(c);
            totalWaived = totalWaived.add(waive);
            remainingToWaive = remainingToWaive.subtract(waive);
        }

        inst.setChargesAmount((inst.getChargesAmount() != null ? inst.getChargesAmount() : BigDecimal.ZERO).subtract(totalWaived).max(BigDecimal.ZERO));
        inst.setRemainingAmount((inst.getRemainingAmount() != null ? inst.getRemainingAmount() : BigDecimal.ZERO).subtract(totalWaived).max(BigDecimal.ZERO));
        scheduleRepository.save(inst);

        final BigDecimal waivedSum = totalWaived;
        loanAccountRepository.findByLoanAccountId(inst.getLoanAccountId()).ifPresent(loan -> {
            loan.setChargesOutstanding((loan.getChargesOutstanding() != null ? loan.getChargesOutstanding() : BigDecimal.ZERO)
                    .subtract(waivedSum).max(BigDecimal.ZERO));
            loanAccountRepository.save(loan);
        });
    }
}
