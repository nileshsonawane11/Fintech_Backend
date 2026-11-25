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
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.CreateIncomingReceiverRequest;
import com.fintech.payment.dto.request.RefundIncomingPaymentRequest;
import com.fintech.payment.dto.response.IncomingPaymentResponse;
import com.fintech.payment.dto.response.IncomingReceiverResponse;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.entity.IncomingPayment;
import com.fintech.payment.entity.IncomingPaymentReceiver;
import com.fintech.payment.entity.PaymentCustomer;
import com.fintech.payment.enums.IncomingPaymentStatus;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.IncomingCollectionProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.repository.IncomingPaymentReceiverRepository;
import com.fintech.payment.repository.IncomingPaymentRepository;
import com.fintech.payment.repository.PaymentCustomerRepository;
import com.fintech.payment.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class IncomingPaymentService {

    private static final Logger log = LoggerFactory.getLogger(IncomingPaymentService.class);

    private final PaymentCustomerRepository paymentCustomerRepository;
    private final IncomingPaymentReceiverRepository receiverRepository;
    private final IncomingPaymentRepository incomingPaymentRepository;
    private final CustomerServiceClient customerServiceClient;
    private final AccountServiceClient accountServiceClient;
    private final LedgerServiceClient ledgerServiceClient;
    private final IncomingCollectionProvider collectionProvider;
    private final PaymentFeeAndLimitService feeAndLimitService;
    private final RazorpayProperties razorpayProperties;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;

    public IncomingPaymentService(
            PaymentCustomerRepository paymentCustomerRepository,
            IncomingPaymentReceiverRepository receiverRepository,
            IncomingPaymentRepository incomingPaymentRepository,
            CustomerServiceClient customerServiceClient,
            AccountServiceClient accountServiceClient,
            LedgerServiceClient ledgerServiceClient,
            IncomingCollectionProvider collectionProvider,
            PaymentFeeAndLimitService feeAndLimitService,
            RazorpayProperties razorpayProperties,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService) {
        this.paymentCustomerRepository = paymentCustomerRepository;
        this.receiverRepository = receiverRepository;
        this.incomingPaymentRepository = incomingPaymentRepository;
        this.customerServiceClient = customerServiceClient;
        this.accountServiceClient = accountServiceClient;
        this.ledgerServiceClient = ledgerServiceClient;
        this.collectionProvider = collectionProvider;
        this.feeAndLimitService = feeAndLimitService;
        this.razorpayProperties = razorpayProperties;
        this.outboxService = outboxService;
        this.auditService = auditService;
    }

    @Transactional
    public IncomingReceiverResponse createOrRetrieveReceiver(String userId, CreateIncomingReceiverRequest request) {
        CustomerProfileDto customer = customerServiceClient.verifyKycApproved(userId);
        InternalAccountDto account = accountServiceClient.validateCustomerAccountEligible(
                request.finbankAccountId(), userId, PaymentConstants.DEFAULT_CURRENCY);

        IncomingPaymentReceiver existing = receiverRepository
                .findByFinbankAccountIdAndVaStatus(account.accountId(), "ACTIVE")
                .orElse(null);
        if (existing != null) {
            if (!userId.equals(existing.getUserId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_OWNERSHIP_MISMATCH",
                        "Receiver belongs to another customer");
            }
            return toReceiverResponse(existing);
        }

        if (!collectionProvider.isAvailable()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMART_COLLECT_UNAVAILABLE",
                    "Razorpay Smart Collect 2.0 is not configured or enabled");
        }

        PaymentCustomer paymentCustomer = ensureSmartCollectCustomer(userId, customer);
        String receiverId = "RCV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String description = request.description() != null && !request.description().isBlank()
                ? request.description()
                : "FinBank Collection Receiver for " + account.accountId();

        VirtualAccountResult va = collectionProvider.createVirtualAccount(new CreateVirtualAccountCommand(
                paymentCustomer.getRazorpayCustomerId(),
                request.receiverTypes(),
                description,
                request.closeBy(),
                Map.of(
                        "finbank_account_id", account.accountId(),
                        "finbank_customer_id", customer.customerId(),
                        "receiver_id", receiverId
                )
        ));

        IncomingPaymentReceiver receiver = new IncomingPaymentReceiver();
        receiver.setReceiverId(receiverId);
        receiver.setUserId(userId);
        receiver.setCustomerId(customer.customerId());
        receiver.setFinbankAccountId(account.accountId());
        receiver.setProviderName(collectionProvider.providerName());
        receiver.setProviderCustomerId(paymentCustomer.getRazorpayCustomerId());
        receiver.setProviderVaId(va.providerVaId());
        receiver.setVaStatus(va.status() != null ? va.status() : "ACTIVE");
        receiver.setVirtualAccountNumber(va.bankAccountNumber());
        receiver.setVirtualIfsc(va.bankIfsc());
        receiver.setVirtualBankName(va.bankName());
        receiver.setVirtualAccountName(va.name());
        receiver.setVirtualVpa(va.vpaAddress());
        receiver.setDescription(description);
        receiver.setCloseBy(va.closeBy());
        receiverRepository.save(receiver);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                receiverId,
                "IncomingPaymentReceiver",
                PaymentConstants.EVT_INCOMING_PAYMENT_INITIATED,
                customer.customerId(),
                va.providerVaId(),
                new IncomingPaymentInitiatedPayload(receiverId, account.accountId(), va.providerVaId(), Instant.now())
        );
        auditService.record(userId, "CUSTOMER", "INCOMING_RECEIVER_CREATED", "IncomingPaymentReceiver", receiverId,
                "Smart Collect VA created for account " + account.accountId());

        return toReceiverResponse(receiver);
    }

    @Transactional(readOnly = true)
    public PagedResponse<IncomingReceiverResponse> listReceivers(String userId, int page, int size) {
        int clampedSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<IncomingPaymentReceiver> result = receiverRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(page, 0), clampedSize));
        return new PagedResponse<>(
                result.getContent().stream().map(this::toReceiverResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public IncomingReceiverResponse getReceiver(String userId, String receiverId) {
        IncomingPaymentReceiver receiver = receiverRepository.findByReceiverIdAndUserId(receiverId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECEIVER_NOT_FOUND",
                        "Incoming receiver not found: " + receiverId));
        return toReceiverResponse(receiver);
    }

    @Transactional
    public IncomingReceiverResponse closeReceiver(String userId, String receiverId) {
        IncomingPaymentReceiver receiver = receiverRepository.findByReceiverIdAndUserId(receiverId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECEIVER_NOT_FOUND",
                        "Incoming receiver not found: " + receiverId));

        if ("CLOSED".equalsIgnoreCase(receiver.getVaStatus())) {
            return toReceiverResponse(receiver);
        }

        if (collectionProvider.isAvailable()) {
            collectionProvider.closeVirtualAccount(receiver.getProviderVaId());
        }
        receiver.setVaStatus("CLOSED");
        receiver.setClosedAt(Instant.now());
        receiverRepository.save(receiver);

        auditService.record(userId, "CUSTOMER", "INCOMING_RECEIVER_CLOSED", "IncomingPaymentReceiver", receiverId,
                "Smart Collect virtual account closed");
        return toReceiverResponse(receiver);
    }

    @Transactional
    public void suspendReceiversForAccount(String finbankAccountId, String reason) {
        List<IncomingPaymentReceiver> receivers = receiverRepository.findByFinbankAccountId(finbankAccountId);
        for (IncomingPaymentReceiver receiver : receivers) {
            if ("ACTIVE".equalsIgnoreCase(receiver.getVaStatus())) {
                if (collectionProvider.isAvailable()) {
                    try {
                        collectionProvider.closeVirtualAccount(receiver.getProviderVaId());
                    } catch (Exception ex) {
                        log.warn("Failed to close Razorpay VA {} during account lifecycle event: {}",
                                receiver.getProviderVaId(), ex.getMessage());
                    }
                }
                receiver.setVaStatus("CLOSED");
                receiver.setClosedAt(Instant.now());
                receiverRepository.save(receiver);
                auditService.record("SYSTEM", "SYSTEM", "INCOMING_RECEIVER_AUTO_CLOSED",
                        "IncomingPaymentReceiver", receiver.getReceiverId(),
                        "Closed due to account lifecycle change: " + reason);
            }
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<IncomingPaymentResponse> listIncomingPayments(String userId, int page, int size) {
        int clampedSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<IncomingPayment> result = incomingPaymentRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(page, 0), clampedSize));
        return new PagedResponse<>(
                result.getContent().stream().map(this::toPaymentResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public IncomingPaymentResponse getIncomingPayment(String userId, String incomingPaymentId) {
        IncomingPayment payment = incomingPaymentRepository.findByIncomingPaymentIdAndUserId(incomingPaymentId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INCOMING_PAYMENT_NOT_FOUND",
                        "Incoming payment not found: " + incomingPaymentId));
        return toPaymentResponse(payment);
    }

    @Transactional
    public List<IncomingPaymentResponse> syncReceiverPayments(String userId, String receiverId) {
        IncomingPaymentReceiver receiver = receiverRepository.findByReceiverIdAndUserId(receiverId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECEIVER_NOT_FOUND",
                        "Incoming receiver not found: " + receiverId));
        if (!collectionProvider.isAvailable()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMART_COLLECT_UNAVAILABLE",
                    "Razorpay Smart Collect is not configured");
        }
        List<ProviderPaymentResult> providerPayments = collectionProvider.fetchVirtualAccountPayments(receiver.getProviderVaId());
        return providerPayments.stream()
                .map(p -> recordAndProcessIncomingPayment(receiver.getProviderVaId(), p, "sync"))
                .map(this::toPaymentResponse)
                .toList();
    }

    @Transactional
    public IncomingPayment recordAndProcessIncomingPayment(
            String providerVaId, ProviderPaymentResult providerPayment, String eventName) {

        IncomingPayment existing = incomingPaymentRepository.findByProviderPaymentId(providerPayment.providerPaymentId())
                .orElse(null);
        if (existing != null) {
            if (IncomingPaymentStatus.CREDITED.name().equals(existing.getStatus())
                    || IncomingPaymentStatus.REFUNDED.name().equals(existing.getStatus())) {
                return existing;
            }
            if (PaymentConstants.RZP_EVENT_PAYMENT_FAILED.equals(eventName)
                    || "failed".equalsIgnoreCase(providerPayment.status())) {
                markIncomingFailed(existing, providerPayment.errorDescription());
                return existing;
            }
            return verifyAndPotentiallyCredit(existing, providerPayment);
        }

        IncomingPaymentReceiver receiver = receiverRepository.findByProviderVaId(providerVaId).orElse(null);
        String incomingId = "INP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        IncomingPayment payment = new IncomingPayment();
        payment.setIncomingPaymentId(incomingId);
        payment.setProviderName(PaymentConstants.PROVIDER_RAZORPAY_SMART_COLLECT);
        payment.setProviderPaymentId(providerPayment.providerPaymentId());
        payment.setProviderVaId(providerVaId != null ? providerVaId : "UNKNOWN");
        payment.setChannel(normalizeChannel(providerPayment.method()));
        payment.setAmount(providerPayment.amount() != null ? providerPayment.amount() : BigDecimal.ZERO);
        payment.setFeeAmount(BigDecimal.ZERO);
        payment.setNetCreditAmount(payment.getAmount());
        payment.setCurrency(providerPayment.currency() != null ? providerPayment.currency() : PaymentConstants.DEFAULT_CURRENCY);
        payment.setPayerName(providerPayment.payerName());
        payment.setPayerVpaMasked(SecurityUtils.maskVpa(providerPayment.payerVpa()));
        payment.setPayerBank(providerPayment.payerBank());
        payment.setUtr(providerPayment.utr());
        payment.setReceivedAt(providerPayment.createdAt() != null ? providerPayment.createdAt() : Instant.now());

        if (receiver == null) {
            payment.setUserId("UNKNOWN");
            payment.setFinbankAccountId("UNKNOWN");
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Unknown virtual account receiver: " + providerVaId);
            incomingPaymentRepository.save(payment);
            return payment;
        }

        payment.setReceiverId(receiver.getReceiverId());
        payment.setUserId(receiver.getUserId());
        payment.setCustomerId(receiver.getCustomerId());
        payment.setFinbankAccountId(receiver.getFinbankAccountId());

        if ("failed".equalsIgnoreCase(providerPayment.status())
                || PaymentConstants.RZP_EVENT_PAYMENT_FAILED.equals(eventName)) {
            payment.setStatus(IncomingPaymentStatus.FAILED.name());
            payment.setFailureReason(providerPayment.errorDescription() != null
                    ? providerPayment.errorDescription() : "Incoming payment failed at provider");
            incomingPaymentRepository.save(payment);
            enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_FAILED,
                    new IncomingPaymentFailedPayload(incomingId, payment.getFinbankAccountId(),
                            payment.getFailureReason(), Instant.now()));
            return payment;
        }

        if ("CLOSED".equalsIgnoreCase(receiver.getVaStatus())) {
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Incoming payment received on closed virtual account " + receiver.getReceiverId());
            incomingPaymentRepository.save(payment);
            return payment;
        }

        payment.setStatus(IncomingPaymentStatus.RECEIVED.name());
        incomingPaymentRepository.save(payment);
        enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_RECEIVED,
                new IncomingPaymentReceivedPayload(incomingId, payment.getFinbankAccountId(),
                        payment.getAmount(), payment.getCurrency(), payment.getChannel(),
                        payment.getUtr(), payment.getReceivedAt()));

        return verifyAndPotentiallyCredit(payment, providerPayment);
    }

    @Transactional
    public IncomingPaymentResponse creditVerifiedIncomingPayment(String incomingPaymentId, String actorId) {
        IncomingPayment payment = incomingPaymentRepository.findByIncomingPaymentId(incomingPaymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INCOMING_PAYMENT_NOT_FOUND",
                        "Incoming payment not found: " + incomingPaymentId));
        if (IncomingPaymentStatus.CREDITED.name().equals(payment.getStatus())) {
            return toPaymentResponse(payment);
        }
        if (!IncomingPaymentStatus.VERIFIED.name().equals(payment.getStatus())
                && !IncomingPaymentStatus.DISCREPANCY.name().equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_INCOMING_PAYMENT_STATE",
                    "Incoming payment must be VERIFIED before credit; current status: " + payment.getStatus());
        }
        payment.setSettlementEligible(true);
        postLedgerCredit(payment, actorId);
        return toPaymentResponse(payment);
    }

    @Transactional
    public IncomingPaymentResponse refundIncomingPayment(
            String incomingPaymentId, RefundIncomingPaymentRequest request, String actorId) {
        IncomingPayment payment = incomingPaymentRepository.findByIncomingPaymentId(incomingPaymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INCOMING_PAYMENT_NOT_FOUND",
                        "Incoming payment not found: " + incomingPaymentId));

        if (!IncomingPaymentStatus.CREDITED.name().equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_NOT_ALLOWED",
                    "Only CREDITED incoming payments can be refunded. Current status: " + payment.getStatus());
        }
        if (!collectionProvider.isAvailable()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMART_COLLECT_UNAVAILABLE",
                    "Razorpay Smart Collect is not configured for refunds");
        }

        BigDecimal refundAmount = request.amount() != null ? request.amount() : payment.getNetCreditAmount();
        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0
                || refundAmount.compareTo(payment.getNetCreditAmount()) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REFUND_AMOUNT",
                    "Refund amount must be between 0.01 and " + payment.getNetCreditAmount());
        }

        LedgerBalanceDto balance = ledgerServiceClient.getAccountBalance(payment.getFinbankAccountId());
        if (balance.availableBalance() == null || balance.availableBalance().compareTo(refundAmount) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_BALANCE_FOR_REFUND",
                    "Customer account lacks sufficient available balance to process refund");
        }

        String ledgerIdempKey = "refund-" + payment.getIncomingPaymentId();
        LedgerPostingResponseDto debitResult = ledgerServiceClient.postBatch(
                ledgerIdempKey,
                new MultiLinePostingRequest(
                        "REFUND",
                        payment.getCurrency(),
                        MDC.get(PaymentConstants.MDC_CORRELATION_ID),
                        "Incoming payment refund: " + request.reason(),
                        payment.getIncomingPaymentId(),
                        List.of(
                                new PostingEntryRequest(payment.getFinbankAccountId(), "DEBIT", refundAmount,
                                        "Refund debit for " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId()),
                                new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_SETTLEMENT_INR, "CREDIT", refundAmount,
                                        "Refund settlement for " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId())
                        )
                )
        );

        RefundPaymentResult providerRefund;
        try {
            providerRefund = collectionProvider.refundPayment(new RefundPaymentCommand(
                    payment.getProviderPaymentId(),
                    refundAmount,
                    payment.getIncomingPaymentId(),
                    Map.of("reason", request.reason(), "incoming_payment_id", payment.getIncomingPaymentId())
            ));
        } catch (RuntimeException ex) {
            ledgerServiceClient.reverseTransaction(
                    debitResult.transactionId(),
                    "rev-" + ledgerIdempKey,
                    "PROVIDER_REFUND_FAILED",
                    "Compensating reversal because Razorpay refund failed"
            );
            throw ex;
        }

        payment.setRefundId(providerRefund.refundId());
        payment.setRefundAmount(refundAmount);
        payment.setLedgerRefundTxId(debitResult.transactionId());
        payment.setStatus(IncomingPaymentStatus.REFUNDED.name());
        payment.setRefundedAt(Instant.now());
        incomingPaymentRepository.save(payment);

        enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_REFUNDED,
                new IncomingPaymentRefundedPayload(payment.getIncomingPaymentId(), providerRefund.refundId(),
                        debitResult.transactionId(), refundAmount, payment.getCurrency(), payment.getRefundedAt()));
        auditService.record(actorId, "OPERATIONS", "INCOMING_PAYMENT_REFUNDED",
                "IncomingPayment", payment.getIncomingPaymentId(),
                "Refunded " + refundAmount + " " + payment.getCurrency() + " refundId=" + providerRefund.refundId());

        return toPaymentResponse(payment);
    }

    @Transactional
    public void handleRefundWebhook(String providerPaymentId, String refundId, BigDecimal amount, String status) {
        if (providerPaymentId == null) {
            return;
        }
        incomingPaymentRepository.findByProviderPaymentId(providerPaymentId).ifPresent(payment -> {
            if ("processed".equalsIgnoreCase(status)
                    && !IncomingPaymentStatus.REFUNDED.name().equals(payment.getStatus())) {
                payment.setRefundId(refundId);
                payment.setRefundAmount(amount);
                payment.setStatus(IncomingPaymentStatus.REFUNDED.name());
                payment.setRefundedAt(Instant.now());
                incomingPaymentRepository.save(payment);
            }
        });
    }

    private IncomingPayment verifyAndPotentiallyCredit(IncomingPayment payment, ProviderPaymentResult snapshot) {
        ProviderPaymentResult authoritative = snapshot;
        if (collectionProvider.isAvailable()) {
            try {
                authoritative = collectionProvider.fetchPayment(payment.getProviderPaymentId());
            } catch (Exception ex) {
                log.warn("Could not re-fetch Razorpay payment {}, proceeding with verified webhook payload: {}",
                        payment.getProviderPaymentId(), ex.getMessage());
            }
        }

        if (authoritative.amount() == null || authoritative.amount().compareTo(BigDecimal.ZERO) <= 0
                || !PaymentConstants.DEFAULT_CURRENCY.equalsIgnoreCase(authoritative.currency())) {
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Unexpected amount or unsupported currency: " + authoritative.currency());
            return incomingPaymentRepository.save(payment);
        }

        if (payment.getAmount().compareTo(authoritative.amount()) != 0) {
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Amount mismatch between webhook and provider API");
            return incomingPaymentRepository.save(payment);
        }

        if (!"captured".equalsIgnoreCase(authoritative.status())) {
            return incomingPaymentRepository.save(payment);
        }

        var feeCalc = feeAndLimitService.calculateFee("INCOMING", authoritative.amount());
        BigDecimal netCredit = authoritative.amount().subtract(feeCalc.totalFee());
        if (netCredit.compareTo(BigDecimal.ZERO) <= 0) {
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Fee exceeds incoming payment amount");
            return incomingPaymentRepository.save(payment);
        }

        payment.setFeeAmount(feeCalc.totalFee());
        payment.setNetCreditAmount(netCredit);
        payment.setStatus(IncomingPaymentStatus.VERIFIED.name());
        payment.setVerifiedAt(Instant.now());

        boolean eligibleForImmediateCredit = razorpayProperties.getSmartCollect().isAutoCreditEligiblePayments()
                && !razorpayProperties.getSmartCollect().isRequireSettlementConfirmation();
        payment.setSettlementEligible(eligibleForImmediateCredit);
        incomingPaymentRepository.save(payment);

        enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_VERIFIED,
                new IncomingPaymentVerifiedPayload(payment.getIncomingPaymentId(), payment.getFinbankAccountId(),
                        payment.getAmount(), payment.getCurrency(), payment.getVerifiedAt()));

        if (eligibleForImmediateCredit) {
            postLedgerCredit(payment, "SYSTEM_WEBHOOK");
        }
        return payment;
    }

    private void postLedgerCredit(IncomingPayment payment, String actorId) {
        if (payment.getLedgerTransactionId() != null) {
            return;
        }
        InternalAccountDto account = accountServiceClient.getAccount(payment.getFinbankAccountId());
        if (!PaymentConstants.ACCOUNT_STATUS_ACTIVE.equalsIgnoreCase(account.status())) {
            payment.setStatus(IncomingPaymentStatus.DISCREPANCY.name());
            payment.setFailureReason("Destination FinBank account is not ACTIVE: " + account.status());
            incomingPaymentRepository.save(payment);
            return;
        }

        List<PostingEntryRequest> entries = payment.getFeeAmount().compareTo(BigDecimal.ZERO) > 0
                ? List.of(
                        new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_SETTLEMENT_INR, "DEBIT", payment.getAmount(),
                                "Incoming collection " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId()),
                        new PostingEntryRequest(payment.getFinbankAccountId(), "CREDIT", payment.getNetCreditAmount(),
                                "Incoming payment credit " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId()),
                        new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_FEE_INR, "CREDIT", payment.getFeeAmount(),
                                "Incoming collection fee " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId())
                )
                : List.of(
                        new PostingEntryRequest(PaymentConstants.LEDGER_SYSTEM_SETTLEMENT_INR, "DEBIT", payment.getAmount(),
                                "Incoming collection " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId()),
                        new PostingEntryRequest(payment.getFinbankAccountId(), "CREDIT", payment.getNetCreditAmount(),
                                "Incoming payment credit " + payment.getIncomingPaymentId(), payment.getIncomingPaymentId())
                );

        LedgerPostingResponseDto posted = ledgerServiceClient.postBatch(
                "in-" + payment.getIncomingPaymentId(),
                new MultiLinePostingRequest(
                        "DEPOSIT",
                        payment.getCurrency(),
                        MDC.get(PaymentConstants.MDC_CORRELATION_ID),
                        "Smart Collect incoming " + payment.getChannel() + " payment",
                        payment.getIncomingPaymentId(),
                        entries
                )
        );

        payment.setLedgerTransactionId(posted.transactionId());
        payment.setStatus(IncomingPaymentStatus.CREDITED.name());
        payment.setCreditedAt(Instant.now());
        incomingPaymentRepository.save(payment);

        enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_CREDITED,
                new IncomingPaymentCreditedPayload(payment.getIncomingPaymentId(), payment.getFinbankAccountId(),
                        posted.transactionId(), payment.getNetCreditAmount(), payment.getCurrency(), payment.getCreditedAt()));
        auditService.record(actorId, "SYSTEM", "INCOMING_PAYMENT_CREDITED",
                "IncomingPayment", payment.getIncomingPaymentId(),
                "Credited " + payment.getNetCreditAmount() + " " + payment.getCurrency()
                        + " ledgerTx=" + posted.transactionId());
    }

    private void markIncomingFailed(IncomingPayment payment, String reason) {
        payment.setStatus(IncomingPaymentStatus.FAILED.name());
        payment.setFailureReason(reason != null ? reason : "Incoming payment failed");
        incomingPaymentRepository.save(payment);
        enqueueIncomingEvent(payment, PaymentConstants.EVT_INCOMING_PAYMENT_FAILED,
                new IncomingPaymentFailedPayload(payment.getIncomingPaymentId(), payment.getFinbankAccountId(),
                        payment.getFailureReason(), Instant.now()));
    }

    private PaymentCustomer ensureSmartCollectCustomer(String userId, CustomerProfileDto customer) {
        return paymentCustomerRepository.findByUserId(userId).orElseGet(() -> {
            System.out.println(customer);
            ProviderCustomerResult created = collectionProvider.createOrGetCustomer(new ProviderCustomerRequest(
                    customer.fullName(),
                    customer.email(),
                    customer.mobileNumber(),
                    customer.customerId(),
                    Map.of("finbank_user_id", userId, "finbank_customer_id", customer.customerId())
            ));
            PaymentCustomer pc = new PaymentCustomer();
            pc.setUserId(userId);
            pc.setCustomerId(customer.customerId());
            pc.setFullName(customer.fullName());
            pc.setEmail(customer.email());
            pc.setPhoneMasked(SecurityUtils.maskAccountNumber(customer.mobileNumber()));
            pc.setRazorpayCustomerId(created.providerCustomerId());
            pc.setKycStatus(customer.kycStatus());
            try {
                return paymentCustomerRepository.saveAndFlush(pc);
            } catch (DataIntegrityViolationException ex) {
                return paymentCustomerRepository.findByUserId(userId)
                        .orElseThrow(() -> ex);
            }
        });
    }

    private <T> void enqueueIncomingEvent(IncomingPayment p, String eventType, T payload) {
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                p.getIncomingPaymentId(),
                "IncomingPayment",
                eventType,
                p.getCustomerId(),
                p.getProviderPaymentId(),
                payload
        );
    }

    private String normalizeChannel(String method) {
        if (method == null || method.isBlank()) return "BANK_TRANSFER";
        return switch (method.toLowerCase()) {
            case "upi" -> "UPI";
            case "bank_transfer", "neft", "rtgs", "imps" -> method.toUpperCase();
            default -> method.toUpperCase();
        };
    }

    private IncomingReceiverResponse toReceiverResponse(IncomingPaymentReceiver r) {
        return new IncomingReceiverResponse(
                r.getReceiverId(),
                r.getFinbankAccountId(),
                r.getVaStatus(),
                r.getVirtualAccountNumber(),
                r.getVirtualIfsc(),
                r.getVirtualBankName(),
                r.getVirtualAccountName(),
                r.getVirtualVpa(),
                r.getDescription(),
                r.getCloseBy(),
                r.getCreatedAt()
        );
    }

    private IncomingPaymentResponse toPaymentResponse(IncomingPayment p) {
        return new IncomingPaymentResponse(
                p.getIncomingPaymentId(),
                p.getReceiverId(),
                p.getFinbankAccountId(),
                p.getChannel(),
                p.getAmount(),
                p.getFeeAmount(),
                p.getNetCreditAmount(),
                p.getCurrency(),
                p.getStatus(),
                p.getPayerName(),
                p.getPayerVpaMasked(),
                p.getPayerBank(),
                p.getUtr(),
                p.getLedgerTransactionId(),
                p.getRefundId(),
                p.getRefundAmount(),
                p.getReceivedAt(),
                p.getCreditedAt()
        );
    }
}
