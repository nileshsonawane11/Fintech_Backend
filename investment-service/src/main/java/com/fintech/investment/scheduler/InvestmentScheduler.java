package com.fintech.investment.scheduler;

import com.fintech.investment.client.LedgerServiceClient;
import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.entity.Investment;
import com.fintech.investment.entity.InvestmentEnums.*;
import com.fintech.investment.entity.InvestmentInstallmentSchedule;
import com.fintech.investment.entity.InvestmentTransaction;
import com.fintech.investment.event.InvestmentOutboxService;
import com.fintech.investment.repository.InvestmentInstallmentScheduleRepository;
import com.fintech.investment.repository.InvestmentRepository;
import com.fintech.investment.repository.InvestmentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class InvestmentScheduler {

    private static final Logger log = LoggerFactory.getLogger(InvestmentScheduler.class);

    private final InvestmentRepository investmentRepository;
    private final InvestmentInstallmentScheduleRepository scheduleRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentOutboxService outboxService;
    private final LedgerServiceClient ledgerClient;
    private final TransactionTemplate transactionTemplate;

    public InvestmentScheduler(
            InvestmentRepository investmentRepository,
            InvestmentInstallmentScheduleRepository scheduleRepository,
            InvestmentTransactionRepository transactionRepository,
            InvestmentOutboxService outboxService,
            LedgerServiceClient ledgerClient,
            TransactionTemplate transactionTemplate) {
        this.investmentRepository = investmentRepository;
        this.scheduleRepository = scheduleRepository;
        this.transactionRepository = transactionRepository;
        this.outboxService = outboxService;
        this.ledgerClient = ledgerClient;
        this.transactionTemplate = transactionTemplate;
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void notifyApproachingMaturities() {
        LocalDate target = LocalDate.now().plusDays(7);
        List<Investment> maturing = investmentRepository
                .findByStatusAndMaturityDateBetween(InvestmentStatus.ACTIVE, LocalDate.now(), target);
        for (Investment inv : maturing) {
            transactionTemplate.executeWithoutResult(status -> outboxService.enqueueNotification(
                    inv.getIdentitySubject(),
                    "FD_MATURITY_APPROACHING",
                    inv.getInvestmentId(),
                    "Investment Maturing Soon",
                    "Your " + inv.getProductType() + " (" + inv.getInvestmentId() + ") matures on " + inv.getMaturityDate(),
                    "INVESTMENT",
                    "NORMAL",
                    "CUSTOMER",
                    Map.of("investmentId", inv.getInvestmentId(), "maturityDate", inv.getMaturityDate().toString())
            ));
        }
    }

    @Scheduled(cron = "0 30 9 * * *")
    public void processDueInstallments() {
        List<InvestmentInstallmentSchedule> due = scheduleRepository
                .findByStatusInAndDueDateLessThanEqual(
                        List.of(InstallmentStatus.PENDING, InstallmentStatus.RETRY_SCHEDULED),
                        LocalDate.now());
        for (InvestmentInstallmentSchedule sch : due) {
            try {
                processSingleInstallment(sch);
            } catch (Exception ex) {
                log.warn("Installment collection failed for {}: {}", sch.getScheduleId(), ex.getMessage());
            }
        }
    }

    private void processSingleInstallment(InvestmentInstallmentSchedule sch) {
        Investment inv = investmentRepository.findByInvestmentId(sch.getInvestmentId()).orElse(null);
        if (inv == null || inv.getStatus() != InvestmentStatus.ACTIVE) {
            return;
        }
        String txId = "INVTX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        try {
            LedgerPostingResponseDto res = ledgerClient.postBatch("INST-" + sch.getScheduleId(),
                    new MultiLinePostingRequest("TRANSFER", inv.getCurrency(), null,
                            "Installment #" + sch.getInstallmentNumber() + " for " + inv.getInvestmentId(), txId,
                            List.of(
                                    new PostingEntryRequest(inv.getFundingAccountId(), "DEBIT",
                                            sch.getAmount(), "Recurring investment instalment", txId),
                                    new PostingEntryRequest(com.fintech.investment.constants.InvestmentConstants.SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT,
                                            "CREDIT", sch.getAmount(), "Recurring investment pool credit", txId)
                            )));

            transactionTemplate.executeWithoutResult(status -> {
                sch.setStatus(InstallmentStatus.PAID);
                sch.setPaidAmount(sch.getAmount());
                sch.setPaidAt(Instant.now());
                sch.setTransactionRef(txId);
                scheduleRepository.save(sch);

                InvestmentTransaction tx = new InvestmentTransaction();
                tx.setTransactionId(txId);
                tx.setInvestmentId(inv.getInvestmentId());
                tx.setIdentitySubject(inv.getIdentitySubject());
                tx.setTransactionType(TransactionType.INSTALLMENT_DEBIT);
                tx.setDirection(TransactionDirection.DEBIT);
                tx.setAmount(sch.getAmount());
                tx.setCurrency(inv.getCurrency());
                tx.setStatus(TransactionStatus.COMPLETED);
                tx.setAccountId(inv.getFundingAccountId());
                tx.setLedgerTransactionId(res.transactionId());
                tx.setCompletedAt(Instant.now());
                transactionRepository.save(tx);

                inv.setTotalInvested(inv.getTotalInvested().add(sch.getAmount()));
                investmentRepository.save(inv);

                String eventType = inv.getProductType() == ProductType.SIP ? "SIP_DEBIT_SUCCESS" : "RD_INSTALMENT_COLLECTED";
                outboxService.enqueueNotification(inv.getIdentitySubject(), eventType, inv.getInvestmentId(),
                        inv.getProductType() + " Instalment Collected",
                        "Instalment #" + sch.getInstallmentNumber() + " of Rs. " + sch.getAmount() + " collected.",
                        "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
            });
        } catch (Exception ex) {
            transactionTemplate.executeWithoutResult(status -> {
                sch.setStatus(sch.getRetryCount() < 2 ? InstallmentStatus.RETRY_SCHEDULED : InstallmentStatus.FAILED);
                sch.setRetryCount(sch.getRetryCount() + 1);
                sch.setFailureReason(ex.getMessage());
                scheduleRepository.save(sch);

                String eventType = inv.getProductType() == ProductType.SIP ? "SIP_DEBIT_FAILED" : "RD_INSTALMENT_FAILED";
                outboxService.enqueueNotification(inv.getIdentitySubject(), eventType, inv.getInvestmentId(),
                        inv.getProductType() + " Instalment Failed",
                        "Instalment #" + sch.getInstallmentNumber() + " failed: " + ex.getMessage(),
                        "INVESTMENT", "HIGH", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
            });
        }
    }
}
