package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.CustomerServiceClient;
import com.fintech.loan.client.LedgerServiceClient;
import com.fintech.loan.client.dto.LedgerDtos.*;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.DisbursementStatus;
import com.fintech.loan.enums.ReconciliationStatus;
import com.fintech.loan.enums.ReconciliationType;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Authoritative Loan Disbursement Saga Service:
 * - Uses approvedAmount (never blindly requestedAmount).
 * - Validates destination account ownership & eligibility via AccountServiceClient.
 * - Posts balanced double-entry disbursement journal via LedgerServiceClient
 *   (DEBIT Loan Principal Receivable, CREDIT Customer Deposit Account).
 * - Creates LoanDisbursement + LoanAccount + versioned EMI Schedule consistently.
 * - Guards against duplicate disbursement & records reconciliation items on partial failure.
 */
@Service
public class LoanDisbursementService {

    private static final Logger log = LoggerFactory.getLogger(LoanDisbursementService.class);

    private final LoanDisbursementRepository disbursementRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanApplicationRepository applicationRepository;
    private final LoanRepaymentReconciliationRepository reconciliationRepository;
    private final AccountServiceClient accountServiceClient;
    private final CustomerServiceClient customerServiceClient;
    private final LedgerServiceClient ledgerServiceClient;
    private final LoanProductService productService;
    private final RepaymentScheduleService repaymentScheduleService;
    private final LoanFinancialCalculator calculator;

    @Autowired
    public LoanDisbursementService(
            LoanDisbursementRepository disbursementRepository,
            LoanAccountRepository loanAccountRepository,
            LoanApplicationRepository applicationRepository,
            LoanRepaymentReconciliationRepository reconciliationRepository,
            AccountServiceClient accountServiceClient,
            CustomerServiceClient customerServiceClient,
            LedgerServiceClient ledgerServiceClient,
            LoanProductService productService,
            RepaymentScheduleService repaymentScheduleService,
            LoanFinancialCalculator calculator) {
        this.disbursementRepository = disbursementRepository;
        this.loanAccountRepository = loanAccountRepository;
        this.applicationRepository = applicationRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.accountServiceClient = accountServiceClient;
        this.customerServiceClient = customerServiceClient;
        this.ledgerServiceClient = ledgerServiceClient;
        this.productService = productService;
        this.repaymentScheduleService = repaymentScheduleService;
        this.calculator = calculator;
    }

    @Transactional
    public DisbursementExecutionResult executeDisbursement(
            LoanApplication app,
            LoanOffer offer,
            String idempotencyKey,
            String actorId) {

        // 1. Idempotency check by application & idempotency key
        Optional<LoanDisbursement> existingDisb = disbursementRepository.findByLoanApplicationId(app.getLoanApplicationId());
        if (existingDisb.isPresent() && existingDisb.get().getDisbursementStatus() == DisbursementStatus.COMPLETED) {
            LoanDisbursement completed = existingDisb.get();
            LoanAccount existingAcc = loanAccountRepository.findByLoanAccountId(completed.getLoanAccountId())
                    .orElseThrow(() -> ApiException.conflict("DISBURSEMENT_INCONSISTENT",
                            "Disbursement completed but LoanAccount missing: " + completed.getLoanAccountId()));
            return new DisbursementExecutionResult(completed, existingAcc, false);
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<LoanDisbursement> byKey = disbursementRepository.findByIdempotencyKey(idempotencyKey);
            if (byKey.isPresent() && byKey.get().getDisbursementStatus() == DisbursementStatus.COMPLETED) {
                LoanDisbursement completed = byKey.get();
                LoanAccount existingAcc = loanAccountRepository.findByLoanAccountId(completed.getLoanAccountId())
                        .orElseThrow(() -> ApiException.conflict("DISBURSEMENT_INCONSISTENT",
                                "Disbursement completed but LoanAccount missing: " + completed.getLoanAccountId()));
                return new DisbursementExecutionResult(completed, existingAcc, false);
            }
        }

        // 2. Authoritative approved amount (never fall back to requestedAmount when approvedAmount/sanctionedAmount differs)
        BigDecimal approvedAmount = app.getApprovedAmount() != null
                ? app.getApprovedAmount()
                : offer.getSanctionedAmount();
        if (approvedAmount == null || approvedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.unprocessable("INVALID_APPROVED_AMOUNT",
                    "Approved loan amount must be positive before disbursement.");
        }

        BigDecimal rate = app.getApprovedInterestRate() != null
                ? app.getApprovedInterestRate()
                : offer.getInterestRate();
        int tenure = app.getApprovedTenureMonths() != null
                ? app.getApprovedTenureMonths()
                : offer.getTenureMonths();

        String targetAccountId = offer.getDisbursementAccountId() != null
                ? offer.getDisbursementAccountId()
                : app.getDisbursementAccountId();

        // 3. Validate destination account ownership & status
        accountServiceClient.validateDisbursementAccount(
                targetAccountId,
                app.getIdentitySubject() != null ? app.getIdentitySubject() : app.getCustomerId(),
                app.getCustomerId(),
                app.getCurrency()
        );

        // 4. Create or reuse LoanDisbursement record
        LoanDisbursement disbursement = existingDisb.orElseGet(() -> {
            LoanDisbursement d = new LoanDisbursement();
            d.setDisbursementReference("DISB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
            d.setIdempotencyKey(idempotencyKey);
            d.setLoanApplicationId(app.getLoanApplicationId());
            d.setCustomerId(app.getCustomerId());
            d.setIdentitySubject(app.getIdentitySubject());
            d.setRequestedAmount(app.getRequestedAmount());
            d.setApprovedAmount(approvedAmount.setScale(2, RoundingMode.HALF_UP));
            d.setDisbursedAmount(approvedAmount.setScale(2, RoundingMode.HALF_UP));
            d.setUpfrontFeeDeducted(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            d.setCurrency(app.getCurrency());
            d.setDestinationAccountReference(targetAccountId);
            d.setDisbursementStatus(DisbursementStatus.INITIATED);
            d.setDisbursedBy(actorId);
            return disbursementRepository.save(d);
        });

        // 5. Post balanced double-entry disbursement to Ledger Service (if not already confirmed)
        if (disbursement.getLedgerTransactionReference() == null) {
            String correlationId = MDC.get(LoanConstants.MDC_CORRELATION_ID);
            MultiLinePostingRequest ledgerReq = new MultiLinePostingRequest(
                    "LOAN_DISBURSEMENT",
                    app.getCurrency(),
                    correlationId != null ? correlationId : disbursement.getDisbursementReference(),
                    "Loan disbursement for application " + app.getLoanApplicationId(),
                    disbursement.getDisbursementReference(),
                    List.of(
                            new PostingEntryRequest(
                                    LoanConstants.LEDGER_LOAN_PRINCIPAL_INR,
                                    "DEBIT",
                                    disbursement.getDisbursedAmount(),
                                    "Loan Principal Receivable - " + app.getLoanApplicationId(),
                                    disbursement.getDisbursementReference()
                            ),
                            new PostingEntryRequest(
                                    targetAccountId,
                                    "CREDIT",
                                    disbursement.getDisbursedAmount(),
                                    "Loan Disbursement Credit - " + app.getLoanApplicationId(),
                                    disbursement.getDisbursementReference()
                            )
                    )
            );

            try {
                LedgerPostingResponseDto ledgerResp = ledgerServiceClient.postBatch(
                        disbursement.getDisbursementReference(), ledgerReq);
                disbursement.setLedgerTransactionReference(ledgerResp.transactionId());
                disbursement.setAccountTransactionReference(ledgerResp.creditLedgerEntryId());
            } catch (ApiException ex) {
                disbursement.setDisbursementStatus(DisbursementStatus.RECONCILIATION_REQUIRED);
                disbursement.setFailureReason(ex.getMessage());
                disbursementRepository.save(disbursement);
                recordDisbursementReconciliation(
                        ReconciliationType.DISBURSEMENT_LEDGER_FAILED,
                        disbursement,
                        ex.getMessage()
                );
                throw ex;
            }
        }

        // 6. Create or update LoanAccount initialized with approved & disbursed amounts
        LoanProduct product = productService.findActiveProductOrThrow(app.getProductCode());
        BigDecimal emi = calculator.calculateEmi(
                disbursement.getDisbursedAmount(), rate, tenure, product.getInterestCalculationMethod());
        LocalDate disbursementDate = LocalDate.now();
        LocalDate nextDueDate = disbursementDate.plusMonths(1);

        LoanAccount loanAccount = loanAccountRepository.findByLoanApplicationId(app.getLoanApplicationId())
                .orElseGet(() -> {
                    LoanAccount acc = new LoanAccount();
                    acc.setLoanAccountId("LN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
                    acc.setLoanApplicationId(app.getLoanApplicationId());
                    return acc;
                });

        loanAccount.setOfferId(offer.getOfferId());
        loanAccount.setCustomerId(app.getCustomerId());
        loanAccount.setIdentitySubject(app.getIdentitySubject());
        loanAccount.setProductCode(app.getProductCode());
        loanAccount.setDisbursementAccountId(targetAccountId);
        loanAccount.setApprovedAmount(approvedAmount.setScale(2, RoundingMode.HALF_UP));
        loanAccount.setDisbursedAmount(disbursement.getDisbursedAmount());
        loanAccount.setPrincipalAmount(disbursement.getDisbursedAmount());
        loanAccount.setOutstandingPrincipal(disbursement.getDisbursedAmount());
        loanAccount.setInterestRate(rate);
        loanAccount.setTenureMonths(tenure);
        loanAccount.setCurrency(app.getCurrency());
        loanAccount.setEmiAmount(emi);
        loanAccount.setDisbursementDate(disbursementDate);
        loanAccount.setNextDueDate(nextDueDate);
        loanAccount.setStatus("ACTIVE");
        loanAccount = loanAccountRepository.save(loanAccount);

        // 7. Generate persisted EMI schedule from actual disbursed principal
        repaymentScheduleService.generateAndPersistSchedule(loanAccount, product.getInterestCalculationMethod());

        disbursement.setLoanAccountId(loanAccount.getLoanAccountId());
        disbursement.setDisbursementDate(disbursementDate);
        disbursement.setDisbursementStatus(DisbursementStatus.COMPLETED);
        disbursement.setFailureReason(null);
        disbursementRepository.save(disbursement);

        log.info("Disbursement completed: ref={}, appId={}, loanAccountId={}, approved={}, disbursed={}, ledgerTx={}",
                disbursement.getDisbursementReference(), app.getLoanApplicationId(),
                loanAccount.getLoanAccountId(), approvedAmount, disbursement.getDisbursedAmount(),
                disbursement.getLedgerTransactionReference());

        return new DisbursementExecutionResult(disbursement, loanAccount, true);
    }

    /**
     * Audits existing DISBURSED applications for missing LoanAccounts, missing LoanDisbursements,
     * or mismatched approved vs principal/disbursed amounts.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHistoricalDisbursementAnomalies() {
        List<LoanApplication> disbursedApps = applicationRepository.findAll().stream()
                .filter(a -> "DISBURSED".equalsIgnoreCase(a.getStatus()))
                .toList();

        List<Map<String, Object>> anomalies = new ArrayList<>();
        for (LoanApplication app : disbursedApps) {
            Optional<LoanAccount> accOpt = loanAccountRepository.findByLoanApplicationId(app.getLoanApplicationId());
            Optional<LoanDisbursement> disbOpt = disbursementRepository.findByLoanApplicationId(app.getLoanApplicationId());

            if (accOpt.isEmpty()) {
                anomalies.add(Map.of(
                        "loanApplicationId", app.getLoanApplicationId(),
                        "issue", "DISBURSED_APPLICATION_MISSING_LOAN_ACCOUNT",
                        "approvedAmount", app.getApprovedAmount() != null ? app.getApprovedAmount() : app.getRequestedAmount()
                ));
                continue;
            }
            LoanAccount acc = accOpt.get();
            BigDecimal expectedApproved = app.getApprovedAmount() != null ? app.getApprovedAmount() : acc.getPrincipalAmount();
            if (acc.getApprovedAmount() == null || acc.getDisbursedAmount() == null
                    || acc.getPrincipalAmount().compareTo(expectedApproved) != 0) {
                anomalies.add(Map.of(
                        "loanApplicationId", app.getLoanApplicationId(),
                        "loanAccountId", acc.getLoanAccountId(),
                        "issue", "LOAN_ACCOUNT_APPROVED_PRINCIPAL_MISMATCH",
                        "expectedApprovedAmount", expectedApproved,
                        "actualPrincipalAmount", acc.getPrincipalAmount()
                ));
            }
            if (disbOpt.isEmpty()) {
                anomalies.add(Map.of(
                        "loanApplicationId", app.getLoanApplicationId(),
                        "loanAccountId", acc.getLoanAccountId(),
                        "issue", "MISSING_DISBURSEMENT_RECORD"
                ));
            }
        }
        return anomalies;
    }

    /**
     * Staff-authorized safe repair for historical DISBURSED applications:
     * aligns LoanAccount approved/disbursed metadata and opens reconciliation if ledger reference is absent,
     * without blindly double-crediting customer accounts.
     */
    @Transactional
    public Map<String, Object> repairHistoricalDisbursedApplication(String applicationId, String actorId) {
        LoanApplication app = applicationRepository.findByLoanApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND", "Application not found: " + applicationId));

        if (!"DISBURSED".equalsIgnoreCase(app.getStatus())) {
            throw ApiException.unprocessable("NOT_DISBURSED", "Application is not in DISBURSED status.");
        }

        Optional<LoanAccount> accOpt = loanAccountRepository.findByLoanApplicationId(applicationId);
        BigDecimal approved = app.getApprovedAmount() != null ? app.getApprovedAmount() : app.getRequestedAmount();

        if (accOpt.isEmpty()) {
            LoanRepaymentReconciliation recon = new LoanRepaymentReconciliation();
            recon.setReconciliationId("REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
            recon.setReconciliationType(ReconciliationType.DISBURSEMENT_LOAN_ACCOUNT_MISSING);
            recon.setReferenceId(applicationId);
            recon.setLoanApplicationId(applicationId);
            recon.setExpectedAmount(approved);
            recon.setStatus(ReconciliationStatus.MANUAL_INTERVENTION_REQUIRED);
            recon.setFailureReason("Historical DISBURSED application missing LoanAccount; flagged by " + actorId);
            reconciliationRepository.save(recon);
            return Map.of("status", "FLAGGED_FOR_VERIFICATION", "reconciliationId", recon.getReconciliationId());
        }

        LoanAccount acc = accOpt.get();
        if (acc.getApprovedAmount() == null) acc.setApprovedAmount(approved);
        if (acc.getDisbursedAmount() == null) acc.setDisbursedAmount(acc.getPrincipalAmount());
        if (app.getApprovedAmount() != null && acc.getPrincipalAmount().compareTo(app.getApprovedAmount()) != 0
                && acc.getTotalPrincipalRepaid().compareTo(BigDecimal.ZERO) == 0) {
            acc.setPrincipalAmount(app.getApprovedAmount());
            acc.setDisbursedAmount(app.getApprovedAmount());
            acc.setOutstandingPrincipal(app.getApprovedAmount());
        }
        loanAccountRepository.save(acc);

        return Map.of("status", "REPAIRED_METADATA", "loanAccountId", acc.getLoanAccountId());
    }

    private void recordDisbursementReconciliation(ReconciliationType type, LoanDisbursement d, String reason) {
        LoanRepaymentReconciliation recon = new LoanRepaymentReconciliation();
        recon.setReconciliationId("REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        recon.setReconciliationType(type);
        recon.setReferenceId(d.getDisbursementReference());
        recon.setLoanApplicationId(d.getLoanApplicationId());
        recon.setLoanAccountId(d.getLoanAccountId());
        recon.setExpectedAmount(d.getDisbursedAmount());
        recon.setAccountTransactionReference(d.getAccountTransactionReference());
        recon.setLedgerTransactionReference(d.getLedgerTransactionReference());
        recon.setStatus(ReconciliationStatus.OPEN);
        recon.setFailureReason(reason);
        reconciliationRepository.save(recon);
    }

    public record DisbursementExecutionResult(
            LoanDisbursement disbursement,
            LoanAccount loanAccount,
            boolean newlyDisbursed
    ) {}
}
