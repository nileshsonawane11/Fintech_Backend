package com.fintech.payment.service;

import com.fintech.payment.client.AccountServiceClient;
import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.LedgerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.client.dto.LedgerBalanceDto;
import com.fintech.payment.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.payment.client.dto.LedgerDtos.MultiLinePostingRequest;
import com.fintech.payment.client.dto.LedgerDtos.PostingEntryRequest;
import com.fintech.payment.client.dto.LedgerDtos.ReversalResponseDto;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.request.InitiateUpiTransferRequest;
import com.fintech.payment.dto.response.ChargeDto;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.dto.response.PaymentStatusResponse;
import com.fintech.payment.entity.Beneficiary;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.enums.BeneficiaryType;
import com.fintech.payment.enums.OutgoingTransferStatus;
import com.fintech.payment.enums.TransferMode;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.CreatePayoutCommand;
import com.fintech.payment.provider.model.ProviderModels.PayoutResult;
import com.fintech.payment.repository.PaymentIdempotencyKeyRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.service.PaymentFeeAndLimitService.FeeCalculation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentIdempotencyKeyRepository idempotencyKeyRepository;
    private final BeneficiaryService beneficiaryService;
    private final CustomerServiceClient customerServiceClient;
    private final AccountServiceClient accountServiceClient;
    private final LedgerServiceClient ledgerServiceClient;
    private final PayoutProvider payoutProvider;
    private final PaymentIdempotencyService idempotencyService;
    private final PaymentFeeAndLimitService feeAndLimitService;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentIdempotencyKeyRepository idempotencyKeyRepository,
                          BeneficiaryService beneficiaryService) {
        this(paymentRepository, idempotencyKeyRepository, beneficiaryService,
                null, null, null, null,
                new PaymentIdempotencyService(idempotencyKeyRepository, new com.fasterxml.jackson.databind.ObjectMapper(), 24L),
                null, null, null);
    }

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentIdempotencyKeyRepository idempotencyKeyRepository,
            BeneficiaryService beneficiaryService,
            CustomerServiceClient customerServiceClient,
            AccountServiceClient accountServiceClient,
            LedgerServiceClient ledgerServiceClient,
            PayoutProvider payoutProvider,
            PaymentIdempotencyService idempotencyService,
            PaymentFeeAndLimitService feeAndLimitService,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.beneficiaryService = beneficiaryService;
        this.customerServiceClient = customerServiceClient;
        this.accountServiceClient = accountServiceClient;
        this.ledgerServiceClient = ledgerServiceClient;
        this.payoutProvider = payoutProvider;
        this.idempotencyService = idempotencyService;
        this.feeAndLimitService = feeAndLimitService;
        this.outboxService = outboxService;
        this.auditService = auditService;
    }

    @Transactional
    public PaymentResponse initiateUpiTransfer(
            String userId, String idempotencyKey, InitiateUpiTransferRequest upiRequest) {
        InitiateTransferRequest req = new InitiateTransferRequest();
        req.setDebitAccountId(upiRequest.debitAccountId());
        req.setBeneficiaryId(upiRequest.beneficiaryId());
        req.setAmount(upiRequest.amount());
        req.setCurrency(upiRequest.currency());
        req.setRemarks(upiRequest.remarks());
        req.setTransferMode(TransferMode.UPI.name());
        return initiateTransfer(userId, idempotencyKey, req);
    }

    @Transactional
    public PaymentResponse initiateTransfer(String userId, String idempotencyKey, InitiateTransferRequest request) {
        String pendingId = "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        Optional<PaymentResponse> cached = idempotencyService.checkOrLock(
                idempotencyKey, "OUTGOING_TRANSFER", userId, pendingId, request, PaymentResponse.class);
        if (cached.isPresent()) {
            return cached.get();
        }

        boolean debitCommitted = false;
        try {
            // 1. Validate customer KYC
            CustomerProfileDto customer = customerServiceClient.verifyKycApproved(userId);

            // 2. Validate debit account ownership, active state, and currency
            String currency = request.getCurrency() != null ? request.getCurrency() : PaymentConstants.DEFAULT_CURRENCY;
            InternalAccountDto debitAccount = accountServiceClient.validateCustomerAccountEligible(
                    request.getDebitAccountId(), userId, currency);

            // 3. Validate beneficiary ownership, verification status, and mode compatibility
            Beneficiary beneficiary = beneficiaryService.findEligibleBeneficiaryForTransfer(
                    userId, request.getBeneficiaryId());
            validateModeCompatibility(request.getTransferMode(), beneficiary);

            // 4. Validate limits & compute fees
            feeAndLimitService.validateTransferLimits(userId, request.getTransferMode(), request.getAmount());
            FeeCalculation fees = feeAndLimitService.calculateFee(request.getTransferMode(), request.getAmount());

            // 5. Check live available balance (accounting for active holds)
            LedgerBalanceDto balance = ledgerServiceClient.getAccountBalance(debitAccount.accountId());
            if (balance.availableBalance() == null || balance.availableBalance().compareTo(fees.totalDebit()) < 0) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_BALANCE",
                        "Insufficient available balance (including holds) to cover transfer and fees");
            }

            // 6. Ensure RazorpayX payout capability & fund account ID
            if (!payoutProvider.isPayoutAvailable()) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYOUT_PROVIDER_UNAVAILABLE",
                        "RazorpayX Payouts is not configured or enabled");
            }
            String fundAccountId = beneficiaryService.ensureFundAccountForTransfer(beneficiary, customer);

            // 7. Create Payment record
            String transactionId = "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
            Payment payment = new Payment();
            payment.setPaymentId(pendingId);
            payment.setTransactionId(transactionId);
            payment.setUserId(userId);
            payment.setCustomerId(customer.customerId());
            payment.setDebitAccountId(debitAccount.accountId());
            payment.setBeneficiaryId(beneficiary.getBeneficiaryId());
            payment.setAmount(request.getAmount());
            payment.setFeeAmount(fees.baseFee());
            payment.setTaxAmount(fees.taxAmount());
            payment.setTotalDebitAmount(fees.totalDebit());
            payment.setCurrency(currency);
            payment.setRemarks(request.getRemarks());
            payment.setTransferMode(request.getTransferMode());
            payment.setTransferType(beneficiary.getBeneficiaryType());
            payment.setProviderName(payoutProvider.providerName());
            payment.setProviderFundAccountId(fundAccountId);
            payment.setStatus(OutgoingTransferStatus.INITIATED.name());
            payment.setIdempotencyKey(idempotencyKey);
            payment.setCorrelationId(MDC.get(PaymentConstants.MDC_CORRELATION_ID));
            paymentRepository.save(payment);

            enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_INITIATED,
                    new TransferInitiatedPayload(
                            pendingId, transactionId, debitAccount.accountId(), beneficiary.getBeneficiaryId(),
                            request.getAmount(), fees.baseFee(), fees.taxAmount(), currency,
                            request.getTransferMode(), Instant.now()));

            enqueuePaymentNotification(payment, "PAYMENT_INITIATED", "Payment Initiated",
                    "Your transfer of " + request.getAmount() + " " + currency + " (Ref: " + pendingId + ") has been initiated.",
                    "NORMAL");

            // 8. Atomic ledger reservation/debit: DEBIT customer (amount + fees), CREDIT CLEARING + FEE_REVENUE
            LedgerPostingResponseDto debitPosting = ledgerServiceClient.postBatch(
                    "debit-" + pendingId,
                    buildDebitJournal(payment, fees)
            );
            debitCommitted = true;

            payment.setLedgerTransactionId(debitPosting.transactionId());
            payment.setStatus(OutgoingTransferStatus.DEBITED_PENDING_SUBMISSION.name());
            paymentRepository.save(payment);

            // 9. Submit payout to RazorpayX with X-Payout-Idempotency
            PayoutResult payoutResult;
            try {
                payoutResult = payoutProvider.createPayout(new CreatePayoutCommand(
                        idempotencyKey,
                        fundAccountId,
                        request.getAmount(),
                        currency,
                        request.getTransferMode(),
                        null,
                        pendingId,
                        request.getRemarks() != null && !request.getRemarks().isBlank()
                                ? request.getRemarks() : "FinBank Transfer " + pendingId,
                        Map.of(
                                "payment_id", pendingId,
                                "finbank_customer_id", customer.customerId(),
                                "ledger_tx_id", debitPosting.transactionId()
                        )
                ));
            } catch (ApiException providerRejected) {
                reverseDebitedTransfer(payment, "PROVIDER_SUBMISSION_REJECTED", providerRejected.getMessage());
                throw providerRejected;
            }

            if (payoutResult.timedOut()) {
                // CRITICAL: Do NOT blindly retry or reverse on timeout; enter reconciliation state.
                payment.setStatus(OutgoingTransferStatus.UNKNOWN_PENDING_RECONCILIATION.name());
                payment.setSubmittedAt(Instant.now());
                payment.setFailureCode("PROVIDER_TIMEOUT");
                payment.setFailureReason("Provider payout request timed out; awaiting reconciliation");
                paymentRepository.save(payment);
                auditService.record(userId, "CUSTOMER", "TRANSFER_TIMEOUT_PENDING_RECON",
                        "Payment", pendingId, "RazorpayX payout timed out; awaiting reconciliation");
            } else {
                payment.setProviderPayoutId(payoutResult.providerPayoutId());
                payment.setRailReference(payoutResult.providerPayoutId());
                payment.setProviderUtr(payoutResult.utr());
                payment.setSubmittedAt(Instant.now());
                applyProviderPayoutResult(payment, payoutResult);
                enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_SUBMITTED,
                        new TransferSubmittedPayload(pendingId, payoutResult.providerPayoutId(),
                                debitPosting.transactionId(), payment.getSubmittedAt()));
                auditService.record(userId, "CUSTOMER", "TRANSFER_SUBMITTED",
                        "Payment", pendingId,
                        "Submitted payout=" + payoutResult.providerPayoutId() + " mode=" + request.getTransferMode());
            }

            PaymentResponse response = toPaymentResponse(payment, fees);
            idempotencyService.markCompleted(idempotencyKey, pendingId, HttpStatus.ACCEPTED.value(), response);
            return response;
        } catch (RuntimeException ex) {
            if (!debitCommitted) {
                idempotencyService.releaseOnFailure(idempotencyKey);
            }
            throw ex;
        }
    }

    @Transactional
    public void handlePayoutWebhookUpdate(
            String providerPayoutId, String providerStatus, String utr, String failureCode, String failureReason) {
        if (providerPayoutId == null || providerPayoutId.isBlank()) {
            return;
        }
        Payment payment = paymentRepository.findByProviderPayoutId(providerPayoutId)
                .or(() -> paymentRepository.findByRailReference(providerPayoutId))
                .orElse(null);
        if (payment == null) {
            log.warn("Received payout webhook for unknown providerPayoutId={}", providerPayoutId);
            return;
        }
        PayoutResult result = new PayoutResult(
                providerPayoutId,
                payment.getProviderFundAccountId(),
                providerStatus,
                payment.getAmount(),
                payment.getCurrency(),
                payment.getTransferMode(),
                utr,
                null,
                null,
                null,
                failureCode,
                failureReason,
                false
        );
        applyProviderPayoutResult(payment, result);
    }

    @Transactional
    public PaymentStatusResponse syncTransferStatus(String userId, String paymentId, boolean opsOverride) {
        Payment payment = opsOverride
                ? paymentRepository.findByPaymentId(paymentId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                                "Payment not found: " + paymentId))
                : paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                                "Payment not found: " + paymentId));

        if (payment.getProviderPayoutId() != null && !isTerminal(payment.getStatus())
                && payoutProvider != null && payoutProvider.isPayoutAvailable()) {
            PayoutResult refreshed = payoutProvider.fetchPayout(payment.getProviderPayoutId());
            applyProviderPayoutResult(payment, refreshed);
        }
        return toStatusResponse(payment);
    }

    @Transactional
    public PaymentStatusResponse cancelQueuedTransfer(String userId, String paymentId) {
        Payment payment = paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment not found: " + paymentId));

        if (!OutgoingTransferStatus.QUEUED.name().equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "TRANSFER_CANNOT_BE_CANCELLED",
                    "Only QUEUED transfers can be cancelled. Current status: " + payment.getStatus());
        }
        if (payment.getProviderPayoutId() != null && payoutProvider.isPayoutAvailable()) {
            PayoutResult cancelled = payoutProvider.cancelPayout(payment.getProviderPayoutId());
            applyProviderPayoutResult(payment, cancelled);
        }
        return toStatusResponse(payment);
    }

    @Transactional
    public PaymentStatusResponse reverseTransferByOps(
            String paymentId, String reasonCode, String remarks, String opsActorId) {
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment not found: " + paymentId));

        if (payment.getLedgerReversalTxId() != null) {
            return toStatusResponse(payment);
        }
        if (OutgoingTransferStatus.COMPLETED.name().equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "COMPLETED_PAYOUT_REQUIRES_BANK_REVERSAL",
                    "Completed RazorpayX payouts cannot be arbitrarily reversed unless reversed by bank/rail");
        }
        reverseDebitedTransfer(payment, reasonCode, remarks);
        auditService.record(opsActorId, "OPERATIONS", "OPS_TRANSFER_REVERSED", "Payment", paymentId,
                "Ops reversal executed: " + reasonCode);
        return toStatusResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(String userId, String paymentId) {
        Payment payment = paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment not found: " + paymentId));
        return toStatusResponse(payment);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PaymentStatusResponse> listTransfers(String userId, int page, int size) {
        int clampedSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<Payment> result = paymentRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(page, 0), clampedSize));
        return new PagedResponse<>(
                result.getContent().stream().map(this::toStatusResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    public void applyProviderPayoutResult(Payment payment, PayoutResult result) {
        if (result == null || result.status() == null) {
            return;
        }
        if (result.utr() != null && !result.utr().isBlank()) {
            payment.setProviderUtr(result.utr());
        }
        String normalized = result.status().trim().toLowerCase();

        if (isTerminal(payment.getStatus()) && !"reversed".equals(normalized)) {
            return;
        }

        switch (normalized) {
            case "queued" -> {
                payment.setStatus(OutgoingTransferStatus.QUEUED.name());
                paymentRepository.save(payment);
                enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_PROCESSING,
                        new TransferProcessingPayload(payment.getPaymentId(), payment.getProviderPayoutId(),
                                normalized, payment.getProviderUtr(), Instant.now()));
            }
            case "pending", "initiated", "processing" -> {
                payment.setStatus(OutgoingTransferStatus.PROCESSING.name());
                paymentRepository.save(payment);
                enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_PROCESSING,
                        new TransferProcessingPayload(payment.getPaymentId(), payment.getProviderPayoutId(),
                                normalized, payment.getProviderUtr(), Instant.now()));
            }
            case "processed" -> {
                if (payment.getLedgerSettlementTxId() == null && ledgerServiceClient != null) {
                    LedgerPostingResponseDto settleTx = ledgerServiceClient.postBatch(
                            "settle-" + payment.getPaymentId(),
                            new MultiLinePostingRequest(
                                    "BANK_TRANSFER",
                                    payment.getCurrency(),
                                    MDC.get(PaymentConstants.MDC_CORRELATION_ID),
                                    "Payout settled for " + payment.getPaymentId(),
                                    payment.getPaymentId(),
                                    List.of(
                                            new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_CLEARING_INR, "DEBIT",
                                                    payment.getAmount(), "Clear outgoing payout " + payment.getPaymentId(),
                                                    payment.getPaymentId()),
                                            new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_SETTLEMENT_INR, "CREDIT",
                                                    payment.getAmount(), "Settle outgoing payout " + payment.getPaymentId(),
                                                    payment.getPaymentId())
                                    )
                            )
                    );
                    payment.setLedgerSettlementTxId(settleTx.transactionId());
                }
                payment.setStatus(OutgoingTransferStatus.COMPLETED.name());
                payment.setCompletedAt(Instant.now());
                paymentRepository.save(payment);
                enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_COMPLETED,
                        new TransferCompletedPayload(payment.getPaymentId(), payment.getProviderPayoutId(),
                                payment.getProviderUtr(), payment.getLedgerSettlementTxId(),
                                payment.getAmount(), payment.getCurrency(), payment.getCompletedAt()));
                enqueuePaymentNotification(payment, "PAYMENT_SUCCESSFUL", "Payment Successful",
                        "Your transfer of " + payment.getAmount() + " " + payment.getCurrency() + " (Ref: " + payment.getPaymentId() + ") was completed successfully.",
                        "HIGH");
            }
            case "failed", "rejected", "cancelled", "reversed" -> {
                String reason = result.failureDescription() != null
                        ? result.failureDescription()
                        : "Provider reported status: " + normalized;
                String code = result.failureReason() != null
                        ? result.failureReason() : "PAYOUT_" + normalized.toUpperCase();
                payment.setFailureCode(code);
                payment.setFailureReason(reason);
                if (payment.getLedgerTransactionId() != null && payment.getLedgerReversalTxId() == null) {
                    reverseDebitedTransfer(payment, code, reason);
                } else {
                    payment.setStatus(OutgoingTransferStatus.FAILED.name());
                    payment.setCompletedAt(Instant.now());
                    paymentRepository.save(payment);
                    enqueuePaymentNotification(payment, "PAYMENT_FAILED", "Payment Failed",
                            "Your transfer of " + payment.getAmount() + " " + payment.getCurrency() + " (Ref: " + payment.getPaymentId() + ") failed.",
                            "HIGH");
                }
            }
            default -> log.warn("Unhandled RazorpayX payout status={} for paymentId={}",
                    normalized, payment.getPaymentId());
        }
    }

    private void reverseDebitedTransfer(Payment payment, String reasonCode, String remarks) {
        if (payment.getLedgerTransactionId() != null && payment.getLedgerReversalTxId() == null
                && ledgerServiceClient != null) {
            ReversalResponseDto rev = ledgerServiceClient.reverseTransaction(
                    payment.getLedgerTransactionId(),
                    "rev-" + payment.getPaymentId(),
                    reasonCode,
                    remarks
            );
            payment.setLedgerReversalTxId(rev.reversalTransactionId());
        }
        payment.setFailureCode(reasonCode);
        payment.setFailureReason(remarks);
        payment.setStatus(OutgoingTransferStatus.REVERSED.name());
        payment.setCompletedAt(Instant.now());
        paymentRepository.save(payment);

        enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_FAILED,
                new TransferFailedPayload(payment.getPaymentId(), payment.getProviderPayoutId(),
                        reasonCode, remarks, payment.getCompletedAt()));
        enqueueTransferEvent(payment, PaymentConstants.EVT_TRANSFER_REVERSED,
                new TransferReversedPayload(payment.getPaymentId(), payment.getProviderPayoutId(),
                        payment.getLedgerReversalTxId(), payment.getTotalDebitAmount(),
                        payment.getCurrency(), reasonCode, payment.getCompletedAt()));
        enqueuePaymentNotification(payment, "PAYMENT_REVERSED", "Payment Failed & Reversed",
                "Your transfer of " + payment.getAmount() + " " + payment.getCurrency() + " (Ref: " + payment.getPaymentId() + ") could not be completed and funds have been reversed.",
                "HIGH");
    }

    private MultiLinePostingRequest buildDebitJournal(Payment payment, FeeCalculation fees) {
        List<PostingEntryRequest> entries = new ArrayList<>();
        entries.add(new PostingEntryRequest(
                payment.getDebitAccountId(), "DEBIT", fees.totalDebit(),
                "Outgoing " + payment.getTransferMode() + " transfer " + payment.getPaymentId(),
                payment.getPaymentId()));
        entries.add(new PostingEntryRequest(
                PaymentConstants.LEDGER_SYSTEM_CLEARING_INR, "CREDIT", payment.getAmount(),
                "Clearing reserve for " + payment.getPaymentId(),
                payment.getPaymentId()));
        if (fees.totalFee().compareTo(BigDecimal.ZERO) > 0) {
            entries.add(new PostingEntryRequest(
                    PaymentConstants.LEDGER_SYSTEM_FEE_INR, "CREDIT", fees.totalFee(),
                    "Transfer fee + GST for " + payment.getPaymentId(),
                    payment.getPaymentId()));
        }
        return new MultiLinePostingRequest(
                "BANK_TRANSFER",
                payment.getCurrency(),
                payment.getCorrelationId(),
                "Outgoing transfer " + payment.getPaymentId(),
                payment.getPaymentId(),
                entries
        );
    }

    private void validateModeCompatibility(String transferMode, Beneficiary beneficiary) {
        boolean isUpiBeneficiary = BeneficiaryType.UPI.name().equalsIgnoreCase(beneficiary.getBeneficiaryType());
        if (TransferMode.UPI.name().equalsIgnoreCase(transferMode) && !isUpiBeneficiary) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TRANSFER_MODE_MISMATCH",
                    "UPI transfer mode requires a UPI beneficiary");
        }
        if (!TransferMode.UPI.name().equalsIgnoreCase(transferMode) && isUpiBeneficiary) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TRANSFER_MODE_MISMATCH",
                    "Bank transfer modes (NEFT/IMPS/RTGS) require a bank account beneficiary");
        }
    }

    private boolean isTerminal(String status) {
        return OutgoingTransferStatus.COMPLETED.name().equals(status)
                || OutgoingTransferStatus.FAILED.name().equals(status)
                || OutgoingTransferStatus.REVERSED.name().equals(status);
    }

    private <T> void enqueueTransferEvent(Payment p, String eventType, T payload) {
        if (outboxService == null) {
            return;
        }
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_TRANSFER_EVENTS,
                p.getPaymentId(),
                "OutgoingTransfer",
                eventType,
                p.getCustomerId(),
                p.getProviderPayoutId(),
                payload
        );
    }

    private void enqueuePaymentNotification(Payment p, String eventType, String title, String message, String priority) {
        if (outboxService == null || p.getUserId() == null || p.getUserId().isBlank()) {
            return;
        }
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_NOTIFICATION_EVENTS,
                p.getUserId(),
                "NOTIFICATION",
                "NOTIFICATION_REQUESTED",
                p.getCustomerId(),
                p.getPaymentId(),
                com.fintech.payment.event.model.NotificationEvent.of(
                        eventType,
                        p.getUserId(),
                        p.getPaymentId(),
                        "PAYMENT",
                        title,
                        message,
                        "PAYMENT",
                        priority,
                        java.util.Map.of("paymentId", p.getPaymentId(),
                                "amount", p.getAmount() != null ? p.getAmount().toPlainString() : "0",
                                "currency", p.getCurrency() != null ? p.getCurrency() : "INR",
                                "status", p.getStatus() != null ? p.getStatus() : "")
                )
        );
    }

    private PaymentResponse toPaymentResponse(Payment p, FeeCalculation fees) {
        List<ChargeDto> charges = new ArrayList<>();
        charges.add(new ChargeDto("TRANSFER_FEE", fees.baseFee(), p.getCurrency()));
        if (fees.taxAmount().compareTo(BigDecimal.ZERO) > 0) {
            charges.add(new ChargeDto("GST", fees.taxAmount(), p.getCurrency()));
        }
        PaymentResponse response = new PaymentResponse();
        response.setPaymentId(p.getPaymentId());
        response.setTransactionId(p.getTransactionId());
        response.setLedgerTransactionId(p.getLedgerTransactionId());
        response.setStatus(p.getStatus());
        response.setAmount(p.getAmount());
        response.setFeeAmount(p.getFeeAmount());
        response.setTaxAmount(p.getTaxAmount());
        response.setTotalDebitAmount(p.getTotalDebitAmount());
        response.setCurrency(p.getCurrency());
        response.setTransferMode(p.getTransferMode());
        response.setTransferType(p.getTransferType());
        response.setProviderPayoutId(p.getProviderPayoutId());
        response.setCharges(charges);
        response.setEstimatedCompletionTime(Instant.now().plus(3, ChronoUnit.MINUTES));
        return response;
    }

    private PaymentStatusResponse toStatusResponse(Payment p) {
        PaymentStatusResponse response = new PaymentStatusResponse();
        response.setPaymentId(p.getPaymentId());
        response.setTransactionId(p.getTransactionId());
        response.setStatus(p.getStatus());
        response.setAmount(p.getAmount());
        response.setFeeAmount(p.getFeeAmount());
        response.setTaxAmount(p.getTaxAmount());
        response.setTotalDebitAmount(p.getTotalDebitAmount());
        response.setCurrency(p.getCurrency());
        response.setTransferMode(p.getTransferMode());
        response.setTransferType(p.getTransferType());
        response.setDebitAccountId(p.getDebitAccountId());
        response.setBeneficiaryId(p.getBeneficiaryId());
        response.setRailReference(p.getRailReference());
        response.setProviderUtr(p.getProviderUtr());
        response.setLedgerTransactionId(p.getLedgerTransactionId());
        response.setLedgerReversalTxId(p.getLedgerReversalTxId());
        response.setFailureCode(p.getFailureCode());
        response.setFailureReason(p.getFailureReason());
        response.setCreatedAt(p.getCreatedAt());
        response.setCompletedAt(p.getCompletedAt());
        return response;
    }
}
