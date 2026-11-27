package com.fintech.investment.service;

import com.fintech.investment.calculator.*;
import com.fintech.investment.calculator.CalculationDtos.*;
import com.fintech.investment.client.AccountServiceClient;
import com.fintech.investment.client.LedgerServiceClient;
import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.entity.*;
import com.fintech.investment.entity.InvestmentEnums.*;
import com.fintech.investment.event.InvestmentOutboxService;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.*;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvestmentLifecycleService {

    private final InvestmentRepository investmentRepository;
    private final InvestmentProductRepository productRepository;
    private final InvestmentInstallmentScheduleRepository scheduleRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentWithdrawalRequestRepository withdrawalRepository;
    private final InvestmentApplicationService applicationService;
    private final InvestmentProductService productService;
    private final InvestmentOutboxService outboxService;
    private final AccountServiceClient accountClient;
    private final LedgerServiceClient ledgerClient;
    private final FdCalculator fdCalculator;
    private final RdCalculator rdCalculator;
    private final SipCalculator sipCalculator;
    private final SsyCalculator ssyCalculator;
    private final TransactionTemplate transactionTemplate;
    private final BigDecimal ssyAnnualMaxDeposit;

    public InvestmentLifecycleService(
            InvestmentRepository investmentRepository,
            InvestmentProductRepository productRepository,
            InvestmentInstallmentScheduleRepository scheduleRepository,
            InvestmentTransactionRepository transactionRepository,
            InvestmentWithdrawalRequestRepository withdrawalRepository,
            InvestmentApplicationService applicationService,
            InvestmentProductService productService,
            InvestmentOutboxService outboxService,
            AccountServiceClient accountClient,
            LedgerServiceClient ledgerClient,
            FdCalculator fdCalculator,
            RdCalculator rdCalculator,
            SipCalculator sipCalculator,
            SsyCalculator ssyCalculator,
            TransactionTemplate transactionTemplate,
            @Value("${app.investment.ssy-annual-max-deposit:150000.00}") BigDecimal ssyAnnualMaxDeposit) {
        this.investmentRepository = investmentRepository;
        this.productRepository = productRepository;
        this.scheduleRepository = scheduleRepository;
        this.transactionRepository = transactionRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.applicationService = applicationService;
        this.productService = productService;
        this.outboxService = outboxService;
        this.accountClient = accountClient;
        this.ledgerClient = ledgerClient;
        this.fdCalculator = fdCalculator;
        this.rdCalculator = rdCalculator;
        this.sipCalculator = sipCalculator;
        this.ssyCalculator = ssyCalculator;
        this.transactionTemplate = transactionTemplate;
        this.ssyAnnualMaxDeposit = ssyAnnualMaxDeposit;
    }

    @Transactional(readOnly = true)
    public List<InvestmentResponse> getMyInvestments() {
        String subject = SecurityUtils.getAuthenticatedSubject();
        List<Investment> list = investmentRepository.findByIdentitySubjectOrderByCreatedAtDesc(subject);
        Map<UUID, InvestmentProduct> productMap = productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(InvestmentProduct::getId, p -> p, (a, b) -> a));
        return list.stream()
                .map(i -> applicationService.toInvestmentResponse(i, productMap.get(i.getProductId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public InvestmentResponse getInvestment(String investmentId) {
        Investment inv = findOwnedOrStaff(investmentId);
        InvestmentProduct product = productRepository.findById(inv.getProductId()).orElse(null);
        return applicationService.toInvestmentResponse(inv, product);
    }

    @Transactional(readOnly = true)
    public CertificateResponse getCertificate(String investmentId) {
        Investment inv = findOwnedOrStaff(investmentId);
        boolean guaranteed = inv.getProductType() == ProductType.FD || inv.getProductType() == ProductType.RD;
        String disclaimer = switch (inv.getProductType()) {
            case FD, RD -> "Contractual rate locked at booking. Subject to premature withdrawal penalty if closed early.";
            case SIP -> SipCalculator.SIP_DISCLAIMER;
            case SSY -> SsyCalculator.SSY_DISCLAIMER;
        };
        return new CertificateResponse(
                inv.getCertificateNumber(),
                inv.getInvestmentId(),
                inv.getProductCode(),
                inv.getProductType(),
                inv.getIdentitySubject(),
                inv.getMonthlyAmount() != null ? inv.getMonthlyAmount() : inv.getPrincipalAmount(),
                inv.getTotalInvested(),
                inv.getInterestRate(),
                inv.getStartDate(),
                inv.getMaturityDate(),
                inv.getMaturityAmount(),
                inv.getFundingAccountMasked(),
                guaranteed,
                disclaimer,
                Instant.now()
        );
    }

    @Transactional(readOnly = true)
    public List<InstallmentScheduleResponse> getSchedules(String investmentId) {
        findOwnedOrStaff(investmentId);
        return scheduleRepository.findByInvestmentIdOrderByInstallmentNumberAsc(investmentId).stream()
                .map(s -> new InstallmentScheduleResponse(
                        s.getScheduleId(), s.getInstallmentNumber(), s.getDueDate(), s.getAmount(),
                        s.getStatus(), s.getPaidAmount(), s.getPenaltyAmount(), s.getPaidAt(),
                        s.getTransactionRef(), s.getRetryCount(), s.getFailureReason()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactions(String investmentId) {
        findOwnedOrStaff(investmentId);
        return transactionRepository.findByInvestmentIdOrderByCreatedAtDesc(investmentId).stream()
                .map(t -> new TransactionResponse(
                        t.getTransactionId(), t.getInvestmentId(), t.getTransactionType(), t.getDirection(),
                        t.getAmount(), t.getCurrency(), t.getStatus(), t.getAccountId(),
                        t.getLedgerTransactionId(), t.getRemarks(), t.getCreatedAt(), t.getCompletedAt()))
                .toList();
    }

    @Transactional
    public InvestmentResponse updateAutoRenewal(String investmentId, AutoRenewalRequest req) {
        Investment inv = findOwnedOrStaff(investmentId);
        if (inv.getProductType() != ProductType.FD) {
            throw ApiException.badRequest("NOT_AN_FD", "Auto-renewal is only applicable to Fixed Deposits.");
        }
        inv.setAutoRenewal(req.autoRenewal());
        if (req.maturityInstruction() != null && !req.maturityInstruction().isBlank()) {
            inv.setMaturityInstruction(req.maturityInstruction());
        }
        inv = investmentRepository.save(inv);
        outboxService.enqueueNotification(inv.getIdentitySubject(), "INVESTMENT_UPDATED", inv.getInvestmentId(),
                "FD Maturity Instruction Updated",
                "Auto-renewal for FD " + inv.getInvestmentId() + " set to " + req.autoRenewal(),
                "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
        return applicationService.toInvestmentResponse(inv, productRepository.findById(inv.getProductId()).orElse(null));
    }

    @Transactional
    public InvestmentResponse pauseSip(String investmentId) {
        Investment inv = findOwnedOrStaff(investmentId);
        assertSip(inv);
        if (inv.getStatus() != InvestmentStatus.ACTIVE) {
            throw ApiException.conflict("INVALID_SIP_STATE", "Only ACTIVE SIP can be paused.");
        }
        inv.setStatus(InvestmentStatus.PAUSED);
        inv = investmentRepository.save(inv);
        outboxService.enqueueNotification(inv.getIdentitySubject(), "SIP_PAUSED", inv.getInvestmentId(),
                "SIP Paused", "Your SIP " + inv.getInvestmentId() + " has been paused.",
                "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
        return applicationService.toInvestmentResponse(inv, productRepository.findById(inv.getProductId()).orElse(null));
    }

    @Transactional
    public InvestmentResponse resumeSip(String investmentId) {
        Investment inv = findOwnedOrStaff(investmentId);
        assertSip(inv);
        if (inv.getStatus() != InvestmentStatus.PAUSED) {
            throw ApiException.conflict("INVALID_SIP_STATE", "Only PAUSED SIP can be resumed.");
        }
        inv.setStatus(InvestmentStatus.ACTIVE);
        inv = investmentRepository.save(inv);
        outboxService.enqueueNotification(inv.getIdentitySubject(), "SIP_RESUMED", inv.getInvestmentId(),
                "SIP Resumed", "Your SIP " + inv.getInvestmentId() + " has been resumed.",
                "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
        return applicationService.toInvestmentResponse(inv, productRepository.findById(inv.getProductId()).orElse(null));
    }

    @Transactional
    public InvestmentResponse modifySip(String investmentId, SipModifyRequest req) {
        Investment inv = findOwnedOrStaff(investmentId);
        assertSip(inv);
        if (inv.getStatus() == InvestmentStatus.CANCELLED || inv.getStatus() == InvestmentStatus.CLOSED) {
            throw ApiException.conflict("INVALID_SIP_STATE", "Cannot modify a closed or cancelled SIP.");
        }
        if (req.monthlyAmount() != null) {
            inv.setMonthlyAmount(req.monthlyAmount());
            inv.setPrincipalAmount(req.monthlyAmount());
            SipCalculationResult recalc = sipCalculator.calculateIllustrative(
                    req.monthlyAmount(), inv.getTenureMonths(), inv.getInterestRate());
            inv.setMaturityAmount(recalc.projectedValue());
            inv.setProjectedGain(recalc.projectedGain());
        }
        if (req.debitDay() != null) {
            inv.setSipDebitDay(req.debitDay());
        }
        if (req.fundCategory() != null) {
            inv.setSipFundCategory(req.fundCategory().name());
        }
        inv = investmentRepository.save(inv);
        outboxService.enqueueNotification(inv.getIdentitySubject(), "SIP_MODIFIED", inv.getInvestmentId(),
                "SIP Plan Modified", "Your SIP " + inv.getInvestmentId() + " configuration was updated.",
                "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
        return applicationService.toInvestmentResponse(inv, productRepository.findById(inv.getProductId()).orElse(null));
    }

    @Transactional
    public InvestmentResponse cancelSip(String investmentId) {
        Investment inv = findOwnedOrStaff(investmentId);
        assertSip(inv);
        inv.setStatus(InvestmentStatus.CANCELLED);
        inv.setClosedAt(Instant.now());
        inv = investmentRepository.save(inv);
        outboxService.enqueueNotification(inv.getIdentitySubject(), "SIP_CANCELLED", inv.getInvestmentId(),
                "SIP Cancelled", "Your SIP " + inv.getInvestmentId() + " has been cancelled.",
                "INVESTMENT", "HIGH", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
        return applicationService.toInvestmentResponse(inv, productRepository.findById(inv.getProductId()).orElse(null));
    }

    public TransactionResponse depositSsy(String investmentId, SsyDepositRequest req, String idempotencyKey) {
        Investment inv = findOwnedOrStaff(investmentId);
        if (inv.getProductType() != ProductType.SSY) {
            throw ApiException.badRequest("NOT_SSY", "Additional annual deposit is only for SSY accounts.");
        }
        if (inv.getStatus() != InvestmentStatus.ACTIVE) {
            throw ApiException.conflict("SSY_NOT_ACTIVE", "SSY account is not active.");
        }
        if (inv.getSsyDepositEndDate() != null && LocalDate.now().isAfter(inv.getSsyDepositEndDate())) {
            throw ApiException.unprocessable("SSY_DEPOSIT_PERIOD_ENDED", "15-year SSY deposit period has ended.");
        }
        String accountId = req.fundingAccountId() != null ? req.fundingAccountId() : inv.getFundingAccountId();
        accountClient.validateActiveOwnedAccount(accountId, inv.getIdentitySubject());
        LedgerBalanceDto bal = ledgerClient.getAccountBalance(accountId);
        if (bal.availableBalance().compareTo(req.amount()) < 0) {
            throw ApiException.unprocessable("INSUFFICIENT_BALANCE", "Insufficient balance for SSY deposit.");
        }
        return transactionTemplate.execute(status -> executeSsyDepositTx(inv, accountId, req.amount(), idempotencyKey));
    }

    protected TransactionResponse executeSsyDepositTx(Investment inv, String accountId, BigDecimal amount, String idempotencyKey) {
        BigDecimal currentYearDeposited = transactionRepository.findByInvestmentIdOrderByCreatedAtDesc(inv.getInvestmentId())
                .stream()
                .filter(t -> t.getStatus() == TransactionStatus.COMPLETED && t.getDirection() == TransactionDirection.DEBIT)
                .filter(t -> t.getCreatedAt().atZone(java.time.ZoneOffset.UTC).getYear() == LocalDate.now().getYear())
                .map(InvestmentTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (currentYearDeposited.add(amount).compareTo(ssyAnnualMaxDeposit) > 0) {
            outboxService.enqueueNotification(inv.getIdentitySubject(), "SSY_ANNUAL_LIMIT_WARNING", inv.getInvestmentId(),
                    "SSY Annual Deposit Limit Exceeded",
                    "Deposit exceeds annual statutory SSY limit of Rs. " + ssyAnnualMaxDeposit,
                    "INVESTMENT", "HIGH", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId()));
            throw ApiException.unprocessable("SSY_ANNUAL_LIMIT_EXCEEDED",
                    "Annual SSY deposit limit of " + ssyAnnualMaxDeposit + " would be exceeded.");
        }

        String txId = "INVTX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        LedgerPostingResponseDto ledgerRes = ledgerClient.postBatch("SSY-" + txId, new MultiLinePostingRequest(
                "TRANSFER", inv.getCurrency(), cid, "SSY deposit " + inv.getInvestmentId(), txId,
                List.of(
                        new PostingEntryRequest(accountId, "DEBIT", amount, "SSY contribution", txId),
                        new PostingEntryRequest(InvestmentConstants.SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT,
                                "CREDIT", amount, "SSY settlement pool credit " + inv.getInvestmentId(), txId)
                )
        ));

        InvestmentTransaction tx = new InvestmentTransaction();
        tx.setTransactionId(txId);
        tx.setInvestmentId(inv.getInvestmentId());
        tx.setIdentitySubject(inv.getIdentitySubject());
        tx.setTransactionType(TransactionType.INSTALLMENT_DEBIT);
        tx.setDirection(TransactionDirection.DEBIT);
        tx.setAmount(amount);
        tx.setCurrency(inv.getCurrency());
        tx.setStatus(TransactionStatus.COMPLETED);
        tx.setAccountId(accountId);
        tx.setLedgerTransactionId(ledgerRes.transactionId());
        tx.setIdempotencyKey(idempotencyKey);
        tx.setCorrelationId(cid);
        tx.setRemarks("SSY deposit");
        tx.setCompletedAt(Instant.now());
        transactionRepository.save(tx);

        inv.setTotalInvested(inv.getTotalInvested().add(amount));
        investmentRepository.save(inv);

        outboxService.enqueueNotification(inv.getIdentitySubject(), "SSY_DEPOSIT_COMPLETED", inv.getInvestmentId(),
                "SSY Deposit Completed",
                "Rs. " + amount + " deposited into SSY account " + inv.getInvestmentId(),
                "INVESTMENT", "NORMAL", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId(), "amount", amount));

        return new TransactionResponse(tx.getTransactionId(), tx.getInvestmentId(), tx.getTransactionType(),
                tx.getDirection(), tx.getAmount(), tx.getCurrency(), tx.getStatus(), tx.getAccountId(),
                tx.getLedgerTransactionId(), tx.getRemarks(), tx.getCreatedAt(), tx.getCompletedAt());
    }

    public WithdrawalResponse requestWithdrawalOrClosure(String investmentId, WithdrawalRequestDto req) {
        Investment inv = findOwnedOrStaff(investmentId);
        if (inv.getStatus() != InvestmentStatus.ACTIVE && inv.getStatus() != InvestmentStatus.PAUSED && inv.getStatus() != InvestmentStatus.MATURED) {
            throw ApiException.conflict("INVALID_INVESTMENT_STATE", "Investment cannot be withdrawn in state: " + inv.getStatus());
        }
        String payoutAccountId = req.payoutAccountId() != null && !req.payoutAccountId().isBlank()
                ? req.payoutAccountId() : inv.getFundingAccountId();
        accountClient.validateActiveOwnedAccount(payoutAccountId, inv.getIdentitySubject());

        InvestmentProduct product = productRepository.findById(inv.getProductId()).orElse(null);
        return transactionTemplate.execute(status -> processWithdrawalTx(inv, product, req, payoutAccountId));
    }

    protected WithdrawalResponse processWithdrawalTx(Investment inv, InvestmentProduct product,
                                                     WithdrawalRequestDto req, String payoutAccountId) {
        if (req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE) {
            if (inv.isLoanAgainstFdActive()) {
                throw ApiException.unprocessable("FD_UNDER_LIEN", "Cannot prematurely close FD with active loan/OD lien.");
            }
            if (product != null && !product.isPrematureWithdrawalAllowed()) {
                throw ApiException.unprocessable("PREMATURE_WITHDRAWAL_NOT_ALLOWED",
                        "Premature withdrawal is not permitted for " + inv.getProductCode() + ".");
            }
            if (product != null && product.getLockInMonths() != null && product.getLockInMonths() > 0) {
                long elapsedMonths = Period.between(inv.getStartDate(), LocalDate.now()).toTotalMonths();
                if (elapsedMonths < product.getLockInMonths()) {
                    throw ApiException.unprocessable("LOCK_IN_PERIOD_ACTIVE",
                            "Lock-in period of " + product.getLockInMonths() + " months is active.");
                }
            }
        }
        if (req.requestType() == WithdrawalRequestType.MATURITY_PAYOUT && LocalDate.now().isBefore(inv.getMaturityDate())) {
            throw ApiException.unprocessable("NOT_MATURED_YET",
                    "Investment has not reached maturity date (" + inv.getMaturityDate() + "). Use PREMATURE_CLOSURE.");
        }

        BigDecimal grossAmount;
        BigDecimal penalty = BigDecimal.ZERO;
        String eligibilityNote = "Eligible";

        if (inv.getProductType() == ProductType.FD && req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE) {
            BigDecimal penaltyPct = product != null ? product.getPrematurePenaltyPct() : BigDecimal.ONE;
            BigDecimal elapsedRate = product != null ? productService.resolveApplicableRate(
                    product, (int) java.time.temporal.ChronoUnit.DAYS.between(inv.getStartDate(), LocalDate.now()),
                    inv.getPrincipalAmount(), LocalDate.now()) : inv.getInterestRate();
            FdPrematureResult prem = fdCalculator.calculatePrematureWithdrawal(
                    inv.getPrincipalAmount(), inv.getInterestRate(), elapsedRate, penaltyPct,
                    inv.getStartDate(), LocalDate.now(), CompoundingFrequency.valueOf(inv.getCompoundingFrequency()));
            grossAmount = prem.netPayoutAmount().add(prem.penaltyAmount());
            penalty = prem.penaltyAmount();
            if (prem.elapsedDays() < 7) {
                eligibilityNote = "Premature FD closure within 7 days (" + prem.elapsedDays()
                        + " days elapsed): 0% interest payable per minimum 7-day rule; principal returned.";
            } else {
                eligibilityNote = "Premature FD closure after " + prem.elapsedDays() + " days at "
                        + prem.effectiveRatePct() + "% effective rate (" + penaltyPct + "% penalty applied on interest).";
            }
        } else if (inv.getProductType() == ProductType.RD && req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE) {
            BigDecimal penaltyPct = product != null ? product.getPrematurePenaltyPct() : BigDecimal.ONE;
            long paidMonths = scheduleRepository.findByInvestmentIdOrderByInstallmentNumberAsc(inv.getInvestmentId())
                    .stream().filter(s -> s.getStatus() == InstallmentStatus.PAID).count();
            BigDecimal unpenalizedPayout = rdCalculator.calculatePrematureClosurePayout(
                    inv.getTotalInvested(), (int) paidMonths, inv.getInterestRate(), BigDecimal.ZERO);
            BigDecimal penalizedPayout = rdCalculator.calculatePrematureClosurePayout(
                    inv.getTotalInvested(), (int) paidMonths, inv.getInterestRate(), penaltyPct);
            grossAmount = unpenalizedPayout;
            penalty = unpenalizedPayout.subtract(penalizedPayout).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            eligibilityNote = "Premature RD closure after " + paidMonths + " paid instalments with " + penaltyPct + "% penalty on interest.";
        } else if (inv.getProductType() == ProductType.SSY && req.requestType() == WithdrawalRequestType.PARTIAL_WITHDRAWAL) {
            if (inv.getSsyGirlChildDob() != null) {
                int childAge = Period.between(inv.getSsyGirlChildDob(), LocalDate.now()).getYears();
                if (childAge < 18) {
                    throw ApiException.unprocessable("SSY_AGE_BELOW_18",
                            "SSY partial withdrawal for higher education is permitted only after the girl child attains 18 years of age.");
                }
            }
            BigDecimal maxEdu = ssyCalculator.calculateMaxEducationWithdrawal(inv.getTotalInvested().add(inv.getAccruedInterest()));
            BigDecimal requested = req.requestedAmount() != null ? req.requestedAmount() : maxEdu;
            if (requested.compareTo(maxEdu) > 0) {
                throw ApiException.unprocessable("SSY_EXCEEDS_50_PCT",
                        "SSY education partial withdrawal cannot exceed 50% of balance (" + maxEdu + ").");
            }
            grossAmount = requested;
            eligibilityNote = "SSY higher education partial withdrawal (up to 50% limit).";
        } else {
            grossAmount = req.requestedAmount() != null ? req.requestedAmount() : inv.getTotalInvested().add(inv.getAccruedInterest());
        }

        BigDecimal netPayout = grossAmount.subtract(penalty).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        String reqId = "WDR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String txId = "INVTX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);

        Instant now = Instant.now();
        InvestmentWithdrawalRequest wr = new InvestmentWithdrawalRequest();
        wr.setRequestId(reqId);
        wr.setInvestmentId(inv.getInvestmentId());
        wr.setIdentitySubject(inv.getIdentitySubject());
        wr.setRequestType(req.requestType());
        wr.setRequestedAmount(grossAmount);
        wr.setPenaltyAmount(penalty);
        wr.setNetPayoutAmount(netPayout);
        wr.setPayoutAccountId(payoutAccountId);
        wr.setReason(req.reason());
        wr.setEligibilityNote(eligibilityNote);
        wr.setStatus(WithdrawalStatus.PROCESSED);
        wr.setProcessedBy(SecurityUtils.getAuthenticatedSubject());
        wr.setCreatedAt(now);
        wr.setProcessedAt(now);
        wr.setTransactionRef(txId);
        withdrawalRepository.save(wr);

        LedgerPostingResponseDto ledgerRes = ledgerClient.postBatch("PAYOUT-" + txId, new MultiLinePostingRequest(
                "TRANSFER", inv.getCurrency(), cid, "Investment payout " + reqId, txId,
                List.of(
                        new PostingEntryRequest(InvestmentConstants.SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT,
                                "DEBIT", netPayout, "Investment payout pool debit " + reqId, txId),
                        new PostingEntryRequest(payoutAccountId, "CREDIT", netPayout,
                                "Investment " + req.requestType().name() + " proceeds", txId)
                )
        ));

        InvestmentTransaction tx = new InvestmentTransaction();
        tx.setTransactionId(txId);
        tx.setInvestmentId(inv.getInvestmentId());
        tx.setIdentitySubject(inv.getIdentitySubject());
        tx.setTransactionType(req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE
                ? TransactionType.PREMATURE_PAYOUT : TransactionType.PARTIAL_WITHDRAWAL);
        tx.setDirection(TransactionDirection.CREDIT);
        tx.setAmount(netPayout);
        tx.setCurrency(inv.getCurrency());
        tx.setStatus(TransactionStatus.COMPLETED);
        tx.setAccountId(payoutAccountId);
        tx.setLedgerTransactionId(ledgerRes.transactionId());
        tx.setCorrelationId(cid);
        tx.setRemarks(eligibilityNote);
        tx.setCompletedAt(Instant.now());
        transactionRepository.save(tx);

        if (req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE || req.requestType() == WithdrawalRequestType.MATURITY_PAYOUT) {
            inv.setStatus(req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE
                    ? InvestmentStatus.PREMATURE_CLOSED : InvestmentStatus.CLOSED);
            inv.setClosedAt(Instant.now());
            investmentRepository.save(inv);
        }

        outboxService.enqueueNotification(inv.getIdentitySubject(),
                req.requestType() == WithdrawalRequestType.PREMATURE_CLOSURE ? "PREMATURE_CLOSURE_PROCESSED" : "INVESTMENT_WITHDRAWAL_COMPLETED",
                inv.getInvestmentId(),
                "Investment Payout Processed",
                "Net payout of Rs. " + netPayout + " credited for investment " + inv.getInvestmentId(),
                "INVESTMENT", "HIGH", "CUSTOMER", Map.of("investmentId", inv.getInvestmentId(), "netPayout", netPayout));

        return new WithdrawalResponse(wr.getRequestId(), wr.getInvestmentId(), wr.getRequestType(),
                wr.getRequestedAmount(), wr.getPenaltyAmount(), wr.getNetPayoutAmount(),
                wr.getPayoutAccountId(), wr.getStatus(), wr.getEligibilityNote(),
                wr.getTransactionRef(), wr.getCreatedAt(), wr.getProcessedAt());
    }

    private Investment findOwnedOrStaff(String investmentId) {
        Investment inv = investmentRepository.findByInvestmentId(investmentId)
                .orElseThrow(() -> ApiException.notFound("INVESTMENT_NOT_FOUND", "Investment not found: " + investmentId));
        String subject = SecurityUtils.getAuthenticatedSubject();
        if (!inv.getIdentitySubject().equals(subject) && !SecurityUtils.isStaffRole()) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have access to this investment.");
        }
        return inv;
    }

    private void assertSip(Investment inv) {
        if (inv.getProductType() != ProductType.SIP) {
            throw ApiException.badRequest("NOT_A_SIP", "This operation is only supported for SIP investments.");
        }
    }
}
