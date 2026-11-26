package com.fintech.loan.scheduler;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanRepaymentMandate;
import com.fintech.loan.entity.LoanRepaymentSchedule;
import com.fintech.loan.enums.*;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.repository.LoanRepaymentMandateRepository;
import com.fintech.loan.repository.LoanRepaymentRepository;
import com.fintech.loan.repository.LoanRepaymentScheduleRepository;
import com.fintech.loan.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class AutoCollectionScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoCollectionScheduler.class);

    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanRepaymentMandateRepository mandateRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final LoanRepaymentService repaymentService;
    private final OverdueAndChargeService overdueAndChargeService;
    private final LoanReconciliationService reconciliationService;
    private final LoanAccountAccessHelper accessHelper;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;

    public AutoCollectionScheduler(
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanAccountRepository loanAccountRepository,
            LoanRepaymentMandateRepository mandateRepository,
            LoanRepaymentRepository repaymentRepository,
            LoanRepaymentService repaymentService,
            OverdueAndChargeService overdueAndChargeService,
            LoanReconciliationService reconciliationService,
            LoanAccountAccessHelper accessHelper,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService) {
        this.scheduleRepository = scheduleRepository;
        this.loanAccountRepository = loanAccountRepository;
        this.mandateRepository = mandateRepository;
        this.repaymentRepository = repaymentRepository;
        this.repaymentService = repaymentService;
        this.overdueAndChargeService = overdueAndChargeService;
        this.reconciliationService = reconciliationService;
        this.accessHelper = accessHelper;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "${app.repayment.reminder-cron:0 0 8 * * *}")
    @Transactional
    public void sendUpcomingDueReminders() {
        LocalDate today = LocalDate.now();
        List<LoanRepaymentSchedule> upcoming = scheduleRepository.findByDueDateBetweenAndStatusIn(
                today, today.plusDays(3), List.of(InstallmentStatus.UPCOMING, InstallmentStatus.DUE));

        for (LoanRepaymentSchedule inst : upcoming) {
            if (inst.getStatus() == InstallmentStatus.UPCOMING) {
                inst.setStatus(InstallmentStatus.DUE);
                scheduleRepository.save(inst);
            }
            LoanAccount loan = loanAccountRepository.findByLoanAccountId(inst.getLoanAccountId()).orElse(null);
            if (loan == null || !"ACTIVE".equalsIgnoreCase(loan.getStatus())) continue;

            BigDecimal dueAmt = inst.getRemainingAmount() != null ? inst.getRemainingAmount() : inst.getTotalAmount();
            outboxService.enqueueEvent(
                    LoanConstants.TOPIC_INSTALLMENT_DUE,
                    inst.getInstallmentId(),
                    "LOAN_INSTALLMENT",
                    "LoanInstallmentDue",
                    new LoanEvents.InstallmentReminderPayload(
                            inst.getInstallmentId(), loan.getLoanAccountId(), loan.getCustomerId(),
                            inst.getInstallmentNumber(), dueAmt, 0, Instant.now()
                    )
            );
            notificationService.notifyCustomer(
                    accessHelper.customerRecipient(loan),
                    "LOAN_EMI_REMINDER",
                    "Upcoming EMI Reminder: " + loan.getLoanAccountId(),
                    "EMI #" + inst.getInstallmentNumber() + " of " + loan.getCurrency() + " " + dueAmt
                            + " is due on " + inst.getDueDate() + ".",
                    inst.getInstallmentId()
            );
        }
    }

    @Scheduled(cron = "${app.repayment.auto-collect-cron:0 30 9 * * *}")
    @Transactional
    public void processDueAutoCollections() {
        LocalDate today = LocalDate.now();
        List<LoanRepaymentSchedule> dueInstallments = scheduleRepository.findByDueDateLessThanEqualAndStatusInOrderByDueDateAsc(
                today, List.of(InstallmentStatus.DUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.OVERDUE));

        for (LoanRepaymentSchedule inst : dueInstallments) {
            try {
                collectInstallmentIfEligible(inst, today);
            } catch (Exception ex) {
                log.warn("Auto-collection skipped/failed for installment={}: {}", inst.getInstallmentId(), ex.getMessage());
            }
        }
    }

    @Transactional
    public boolean collectInstallmentIfEligible(LoanRepaymentSchedule inst, LocalDate collectionDate) {
        // Prevent duplicate collection if already initiated/pending/processing/settled for this installment
        boolean alreadyInFlightOrPaid = repaymentRepository.existsByInstallmentIdAndRepaymentStatusIn(
                inst.getInstallmentId(),
                List.of(RepaymentStatus.INITIATED, RepaymentStatus.PENDING, RepaymentStatus.PROCESSING, RepaymentStatus.SUCCESS)
        );
        if (alreadyInFlightOrPaid) {
            return false;
        }

        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(inst.getLoanAccountId()).orElse(null);
        if (loan == null || !"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            return false;
        }

        Optional<LoanRepaymentMandate> mandateOpt = mandateRepository
                .findFirstByLoanAccountIdAndStatusOrderByCreatedAtDesc(loan.getLoanAccountId(), MandateStatus.ACTIVE);
        if (mandateOpt.isEmpty()) {
            return false;
        }
        LoanRepaymentMandate mandate = mandateOpt.get();

        if (mandate.getStartDate().isAfter(collectionDate)
                || (mandate.getEndDate() != null && mandate.getEndDate().isBefore(collectionDate))) {
            return false;
        }

        BigDecimal dueAmount = inst.getRemainingAmount() != null
                ? inst.getRemainingAmount()
                : inst.getTotalAmount().subtract(inst.getPaidAmount() != null ? inst.getPaidAmount() : BigDecimal.ZERO);
        if (dueAmount.compareTo(BigDecimal.ZERO) <= 0 || dueAmount.compareTo(mandate.getMaxAuthorizedAmount()) > 0) {
            return false;
        }

        RepaymentMethod method = switch (mandate.getMandateType()) {
            case INTERNAL_AUTODEBIT -> RepaymentMethod.INTERNAL_ACCOUNT;
            case UPI_AUTOPAY -> RepaymentMethod.UPI_AUTOPAY;
            case ENACH -> RepaymentMethod.ENACH;
        };

        String idempotencyKey = "AUTO-" + inst.getInstallmentId() + "-" + collectionDate;
        repaymentService.executeRepayment(
                loan,
                inst.getInstallmentId(),
                mandate.getRepaymentAccountId(),
                mandate.getMandateId(),
                method,
                dueAmount,
                RepaymentType.EMI,
                idempotencyKey,
                true,
                null
        );
        return true;
    }

    @Scheduled(cron = "${app.repayment.overdue-cron:0 0 1 * * *}")
    public void evaluateOverdueAndCharges() {
        overdueAndChargeService.evaluateOverdueInstallments(LocalDate.now());
    }

    @Scheduled(fixedDelayString = "${app.repayment.reconciliation-interval-ms:60000}")
    public void reconcilePendingTransactions() {
        reconciliationService.runPendingReconciliationCheck();
    }
}
