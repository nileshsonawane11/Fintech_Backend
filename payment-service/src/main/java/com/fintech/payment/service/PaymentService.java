package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.client.AccountServiceClient;
import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.CreatePaymentOrderRequest;
import com.fintech.payment.dto.request.RefundPaymentRequest;
import com.fintech.payment.dto.request.VerifyPaymentRequest;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.PaymentOrderResponse;
import com.fintech.payment.dto.response.PaymentTransactionResponse;
import com.fintech.payment.dto.response.RefundResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.PaymentRefund;
import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.RazorpayOrdersProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.provider.razorpay.RazorpayCheckoutSignatureVerifier;
import com.fintech.payment.provider.razorpay.RazorpayMoneyUtils;
import com.fintech.payment.repository.PaymentRefundRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentRefundRepository refundRepository;
    private final RazorpayOrdersProvider razorpayOrdersProvider;
    private final RazorpayCheckoutSignatureVerifier checkoutSignatureVerifier;
    private final RazorpayProperties razorpayProperties;
    private final AccountServiceClient accountServiceClient;
    private final CustomerServiceClient customerServiceClient;
    private final PaymentFeeAndLimitService limitService;
    private final PaymentIdempotencyService idempotencyService;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;
    private final ObjectMapper objectMapper;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentRefundRepository refundRepository,
            RazorpayOrdersProvider razorpayOrdersProvider,
            RazorpayCheckoutSignatureVerifier checkoutSignatureVerifier,
            RazorpayProperties razorpayProperties,
            AccountServiceClient accountServiceClient,
            CustomerServiceClient customerServiceClient,
            PaymentFeeAndLimitService limitService,
            PaymentIdempotencyService idempotencyService,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService,
            ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.razorpayOrdersProvider = razorpayOrdersProvider;
        this.checkoutSignatureVerifier = checkoutSignatureVerifier;
        this.razorpayProperties = razorpayProperties;
        this.accountServiceClient = accountServiceClient;
        this.customerServiceClient = customerServiceClient;
        this.limitService = limitService;
        this.idempotencyService = idempotencyService;
        this.outboxService = outboxService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PaymentOrderResponse createOrder(
            String identitySubject,
            String idempotencyKey,
            CreatePaymentOrderRequest request) {
        if (request.purpose() == null || !request.purpose().isExternalRazorpaySupported()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INTERNAL_TRANSFER_NOT_RAZORPAY",
                    "Internal transfers must use FinBank internal transfer APIs, not Razorpay");
        }

        String currency = request.currency().trim().toUpperCase();
        BigDecimal scaledAmount = request.amount().setScale(4, RoundingMode.HALF_UP);

        Optional<PaymentOrderResponse> cached = idempotencyService.checkOrLock(
                idempotencyKey, "CREATE_PAYMENT_ORDER", identitySubject, "PENDING", request, PaymentOrderResponse.class);
        if (cached.isPresent()) {
            return cached.get();
        }

        try {
            limitService.validateOrderLimits(identitySubject, scaledAmount, currency);

            if (request.purpose() == PaymentPurpose.ACCOUNT_DEPOSIT) {
                if (request.destinationAccountId() == null || request.destinationAccountId().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "DESTINATION_ACCOUNT_REQUIRED",
                            "destinationAccountId is required for ACCOUNT_DEPOSIT");
                }
                accountServiceClient.validateCustomerAccountEligible(
                        request.destinationAccountId(), identitySubject, currency);
            } else if ((request.purpose() == PaymentPurpose.LOAN_REPAYMENT
                    || request.purpose() == PaymentPurpose.INVESTMENT_PAYMENT)
                    && (request.businessReference() == null || request.businessReference().isBlank())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BUSINESS_REFERENCE_REQUIRED",
                        "businessReference is required for " + request.purpose());
            }

            String customerId = resolveCustomerId(identitySubject);
            String paymentId = "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

            Payment payment = new Payment();
            payment.setPaymentId(paymentId);
            payment.setIdentitySubject(identitySubject);
            payment.setCustomerId(customerId);
            payment.setDestinationAccountId(request.destinationAccountId());
            payment.setPurpose(request.purpose());
            payment.setSourceService(PaymentConstants.SERVICE_PAYMENT);
            payment.setBusinessReference(
                    request.businessReference() != null ? request.businessReference() : request.destinationAccountId());
            payment.setAmount(scaledAmount);
            payment.setCurrency(currency);
            payment.setStatus(PaymentTransactionStatus.INITIATED);
            payment.setReceipt(paymentId);
            payment.setIdempotencyKey(idempotencyKey);
            payment.setCorrelationId(MDC.get(PaymentConstants.MDC_CORRELATION_ID));
            payment.setMetadataJson(serializeNotes(request.notes()));
            payment = paymentRepository.save(payment);

            Map<String, String> orderNotes = new LinkedHashMap<>();
            if (request.notes() != null) {
                orderNotes.putAll(request.notes());
            }
            orderNotes.put("paymentId", paymentId);
            orderNotes.put("purpose", request.purpose().name());
            if (request.destinationAccountId() != null) {
                orderNotes.put("destinationAccountId", request.destinationAccountId());
            }
            if (payment.getBusinessReference() != null) {
                orderNotes.put("businessReference", payment.getBusinessReference());
            }

            RazorpayOrderResult rzpOrder = razorpayOrdersProvider.createOrder(new CreateOrderCommand(
                    scaledAmount,
                    currency,
                    paymentId,
                    razorpayProperties.isAutoCapture(),
                    orderNotes
            ));

            transitionStatus(payment, PaymentTransactionStatus.ORDER_CREATED);
            payment.setRazorpayOrderId(rzpOrder.orderId());
            payment = paymentRepository.save(payment);

            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_INCOMING_EVENTS,
                    payment.getPaymentId(),
                    "Payment",
                    PaymentConstants.EVT_PAYMENT_ORDER_CREATED,
                    payment.getIdentitySubject(),
                    payment.getRazorpayOrderId(),
                    new PaymentOrderCreatedPayload(
                            payment.getPaymentId(),
                            payment.getIdentitySubject(),
                            payment.getDestinationAccountId(),
                            payment.getRazorpayOrderId(),
                            payment.getAmount(),
                            payment.getCurrency(),
                            payment.getPurpose(),
                            payment.getBusinessReference(),
                            Instant.now()
                    )
            );

            auditService.record(identitySubject, "CUSTOMER", "PAYMENT_ORDER_CREATED",
                    "Payment", payment.getPaymentId(),
                    "purpose=" + payment.getPurpose() + ", orderId=" + payment.getRazorpayOrderId());

            PaymentOrderResponse response = new PaymentOrderResponse(
                    payment.getPaymentId(),
                    payment.getRazorpayOrderId(),
                    razorpayProperties.getKeyId(),
                    payment.getAmount(),
                    RazorpayMoneyUtils.toPaise(payment.getAmount()),
                    payment.getCurrency(),
                    payment.getPurpose(),
                    payment.getDestinationAccountId(),
                    payment.getBusinessReference(),
                    payment.getStatus(),
                    payment.getReceipt(),
                    payment.getCreatedAt()
            );
            idempotencyService.markCompleted(idempotencyKey, payment.getPaymentId(), 201, response);
            return response;
        } catch (RuntimeException ex) {
            idempotencyService.releaseOnFailure(idempotencyKey);
            throw ex;
        }
    }

    @Transactional
    public PaymentTransactionResponse verifyCheckoutPayment(String identitySubject, VerifyPaymentRequest request) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.razorpayOrderId().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_ORDER_NOT_FOUND",
                        "Payment transaction not found for Razorpay order: " + request.razorpayOrderId()));

        if (!identitySubject.equals(payment.getIdentitySubject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PAYMENT_OWNERSHIP_MISMATCH",
                    "You do not own this payment order");
        }

        if (payment.isRazorpaySignatureVerified()
                && request.razorpayPaymentId().trim().equals(payment.getRazorpayPaymentId())
                && (payment.getStatus() == PaymentTransactionStatus.CAPTURED
                    || payment.getStatus() == PaymentTransactionStatus.PROCESSING
                    || payment.getStatus() == PaymentTransactionStatus.COMPLETED)) {
            return toResponse(payment);
        }

        boolean signatureValid = checkoutSignatureVerifier.verifyCheckoutSignature(
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature(),
                razorpayProperties.getKeySecret()
        );
        if (!signatureValid) {
            auditService.record(identitySubject, "CUSTOMER", "PAYMENT_SIGNATURE_FAILED",
                    "Payment", payment.getPaymentId(), "razorpayPaymentId=" + request.razorpayPaymentId());
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_SIGNATURE",
                    "Razorpay Checkout signature verification failed");
        }

        RazorpayPaymentResult rzpPayment = razorpayOrdersProvider.fetchPayment(request.razorpayPaymentId().trim());
        validateRazorpayPaymentMatchesOrder(payment, rzpPayment);

        payment.setRazorpayPaymentId(rzpPayment.paymentId());
        payment.setRazorpaySignatureVerified(true);
        payment.setPaymentMethod(rzpPayment.method());

        if ("failed".equalsIgnoreCase(rzpPayment.status())) {
            markFailed(payment, rzpPayment.errorCode(), rzpPayment.errorDescription());
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_FAILED",
                    rzpPayment.errorDescription() != null ? rzpPayment.errorDescription() : "Payment failed at Razorpay");
        }

        if ("authorized".equalsIgnoreCase(rzpPayment.status()) && !rzpPayment.captured()) {
            applyAuthorizedState(payment, rzpPayment);
            if (!razorpayProperties.isAutoCapture()) {
                rzpPayment = razorpayOrdersProvider.capturePayment(new CapturePaymentCommand(
                        rzpPayment.paymentId(), payment.getAmount(), payment.getCurrency()));
            }
        }

        if ("captured".equalsIgnoreCase(rzpPayment.status()) || rzpPayment.captured()) {
            payment = applyCapturedAndTriggerFulfillment(payment, rzpPayment);
        } else if (payment.getStatus() == PaymentTransactionStatus.ORDER_CREATED) {
            transitionStatus(payment, PaymentTransactionStatus.PAYMENT_PENDING);
            payment = paymentRepository.save(payment);
        }

        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentTransactionResponse getPayment(String identitySubject, String paymentId) {
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment transaction not found: " + paymentId));
        if (!identitySubject.equals(payment.getIdentitySubject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PAYMENT_OWNERSHIP_MISMATCH",
                    "You do not have access to this payment transaction");
        }
        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PaymentTransactionResponse> listPayments(String identitySubject, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<Payment> result = paymentRepository.findByIdentitySubjectOrderByCreatedAtDesc(
                identitySubject, PageRequest.of(Math.max(page, 0), safeSize));
        List<PaymentTransactionResponse> items = result.getContent().stream().map(this::toResponse).toList();
        return new PagedResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.hasNext());
    }

    @Transactional
    public PaymentTransactionResponse syncPaymentStatus(String identitySubject, String paymentId, boolean opsActor) {
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment transaction not found: " + paymentId));
        if (!opsActor && !identitySubject.equals(payment.getIdentitySubject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PAYMENT_OWNERSHIP_MISMATCH",
                    "You do not have access to this payment transaction");
        }
        if (payment.getStatus().isTerminal() || payment.getRazorpayOrderId() == null) {
            return toResponse(payment);
        }

        List<RazorpayPaymentResult> orderPayments = razorpayOrdersProvider.fetchOrderPayments(payment.getRazorpayOrderId());
        for (RazorpayPaymentResult rzpPayment : orderPayments) {
            if ("captured".equalsIgnoreCase(rzpPayment.status()) || rzpPayment.captured()) {
                validateRazorpayPaymentMatchesOrder(payment, rzpPayment);
                payment.setRazorpayPaymentId(rzpPayment.paymentId());
                payment.setPaymentMethod(rzpPayment.method());
                payment = applyCapturedAndTriggerFulfillment(payment, rzpPayment);
                payment.setReconciledAt(Instant.now());
                return toResponse(paymentRepository.save(payment));
            }
        }
        for (RazorpayPaymentResult rzpPayment : orderPayments) {
            if ("authorized".equalsIgnoreCase(rzpPayment.status())) {
                validateRazorpayPaymentMatchesOrder(payment, rzpPayment);
                payment.setRazorpayPaymentId(rzpPayment.paymentId());
                payment.setPaymentMethod(rzpPayment.method());
                payment = applyAuthorizedState(payment, rzpPayment);
                if (!razorpayProperties.isAutoCapture()) {
                    RazorpayPaymentResult captured = razorpayOrdersProvider.capturePayment(new CapturePaymentCommand(
                            rzpPayment.paymentId(), payment.getAmount(), payment.getCurrency()));
                    payment = applyCapturedAndTriggerFulfillment(payment, captured);
                }
                payment.setReconciledAt(Instant.now());
                return toResponse(paymentRepository.save(payment));
            }
        }
        if (!orderPayments.isEmpty()) {
            RazorpayPaymentResult latest = orderPayments.get(orderPayments.size() - 1);
            if ("failed".equalsIgnoreCase(latest.status())
                    && payment.getStatus() != PaymentTransactionStatus.FAILED) {
                payment.setRazorpayPaymentId(latest.paymentId());
                payment = markFailed(payment, latest.errorCode(), latest.errorDescription());
            }
        }
        return toResponse(payment);
    }

    @Transactional
    public RefundResponse initiateRefund(
            String identitySubject,
            String idempotencyKey,
            String paymentId,
            RefundPaymentRequest request,
            boolean opsActor) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PaymentRefund> existing = refundRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toRefundResponse(existing.get());
            }
        }

        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment transaction not found: " + paymentId));
        if (!opsActor && !identitySubject.equals(payment.getIdentitySubject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PAYMENT_OWNERSHIP_MISMATCH",
                    "You do not have access to refund this payment");
        }
        if (payment.getRazorpayPaymentId() == null || payment.getRazorpayPaymentId().isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_NOT_ALLOWED",
                    "Payment has no captured Razorpay payment ID to refund");
        }
        if (payment.getStatus() != PaymentTransactionStatus.CAPTURED
                && payment.getStatus() != PaymentTransactionStatus.COMPLETED
                && payment.getStatus() != PaymentTransactionStatus.PARTIALLY_REFUNDED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_NOT_ALLOWED",
                    "Payment in status " + payment.getStatus() + " cannot be refunded");
        }

        BigDecimal remaining = payment.getAmount().subtract(payment.getRefundedAmount());
        BigDecimal refundAmount = request.amount() != null
                ? request.amount().setScale(4, RoundingMode.HALF_UP)
                : remaining;
        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0 || refundAmount.compareTo(remaining) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REFUND_AMOUNT",
                    "Refund amount must be positive and not exceed remaining refundable amount: " + remaining);
        }

        String refundId = "RFND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        PaymentRefund refund = new PaymentRefund();
        refund.setRefundId(refundId);
        refund.setPaymentId(payment.getPaymentId());
        refund.setRazorpayPaymentId(payment.getRazorpayPaymentId());
        refund.setAmount(refundAmount);
        refund.setCurrency(payment.getCurrency());
        refund.setStatus("REFUND_PENDING");
        refund.setReason(request.reason());
        refund.setIdempotencyKey(idempotencyKey);
        refund = refundRepository.save(refund);

        transitionStatus(payment, PaymentTransactionStatus.REFUND_PENDING);
        paymentRepository.save(payment);

        RazorpayRefundResult rzpRefund = razorpayOrdersProvider.refundPayment(new RefundPaymentCommand(
                payment.getRazorpayPaymentId(),
                refundAmount,
                refundId,
                Map.of("paymentId", payment.getPaymentId(), "refundId", refundId, "reason", request.reason())
        ));

        refund.setRazorpayRefundId(rzpRefund.refundId());
        if ("processed".equalsIgnoreCase(rzpRefund.status())) {
            refund.setStatus("PROCESSED");
            refund = refundRepository.save(refund);
            applyRefundProcessed(payment, refund);
        } else {
            refund.setStatus(rzpRefund.status().toUpperCase());
            refund = refundRepository.save(refund);
        }
        return toRefundResponse(refund);
    }

    @Transactional
    public Payment applyAuthorizedWebhook(
            String razorpayOrderId, String razorpayPaymentId, String method, BigDecimal amount, String currency) {
        Payment payment = findByOrderOrPayment(razorpayOrderId, razorpayPaymentId);
        validateWebhookAmountCurrency(payment, amount, currency);
        payment.setRazorpayPaymentId(razorpayPaymentId);
        if (method != null) {
            payment.setPaymentMethod(method);
        }
        return applyAuthorizedState(payment, new RazorpayPaymentResult(
                razorpayPaymentId, razorpayOrderId, amount, currency, "authorized", method, false,
                null, null, null, null, Instant.now()));
    }

    @Transactional
    public Payment applyCapturedWebhook(
            String razorpayOrderId, String razorpayPaymentId, String method, BigDecimal amount, String currency) {
        Payment payment = findByOrderOrPayment(razorpayOrderId, razorpayPaymentId);
        validateWebhookAmountCurrency(payment, amount, currency);
        payment.setRazorpayPaymentId(razorpayPaymentId);
        if (method != null) {
            payment.setPaymentMethod(method);
        }
        return applyCapturedAndTriggerFulfillment(payment, new RazorpayPaymentResult(
                razorpayPaymentId, razorpayOrderId, amount, currency, "captured", method, true,
                null, null, null, null, Instant.now()));
    }

    @Transactional
    public Payment applyFailedWebhook(
            String razorpayOrderId, String razorpayPaymentId, String failureCode, String failureReason) {
        Payment payment = findByOrderOrPayment(razorpayOrderId, razorpayPaymentId);
        if (payment.getStatus() == PaymentTransactionStatus.CAPTURED
                || payment.getStatus() == PaymentTransactionStatus.PROCESSING
                || payment.getStatus() == PaymentTransactionStatus.COMPLETED
                || payment.getStatus() == PaymentTransactionStatus.REFUNDED) {
            log.info("Ignoring late payment.failed webhook for already settled paymentId={}", payment.getPaymentId());
            return payment;
        }
        payment.setRazorpayPaymentId(razorpayPaymentId);
        return markFailed(payment, failureCode, failureReason);
    }

    @Transactional
    public void applyRefundWebhook(
            String razorpayPaymentId, String razorpayRefundId, BigDecimal amount, String eventType) {
        Payment payment = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment not found for Razorpay paymentId: " + razorpayPaymentId));

        PaymentRefund refund = refundRepository.findByRazorpayRefundId(razorpayRefundId)
                .orElseGet(() -> {
                    PaymentRefund created = new PaymentRefund();
                    created.setRefundId("RFND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                    created.setPaymentId(payment.getPaymentId());
                    created.setRazorpayPaymentId(razorpayPaymentId);
                    created.setRazorpayRefundId(razorpayRefundId);
                    created.setAmount(amount != null ? amount.setScale(4, RoundingMode.HALF_UP) : payment.getAmount());
                    created.setCurrency(payment.getCurrency());
                    created.setStatus("REFUND_PENDING");
                    return refundRepository.save(created);
                });

        if ("PROCESSED".equalsIgnoreCase(refund.getStatus())) {
            return;
        }

        if (PaymentConstants.RZP_EVENT_REFUND_FAILED.equals(eventType)) {
            refund.setStatus("FAILED");
            refundRepository.save(refund);
            if (payment.getStatus() == PaymentTransactionStatus.REFUND_PENDING) {
                transitionStatus(payment, payment.getRefundedAmount().compareTo(BigDecimal.ZERO) > 0
                        ? PaymentTransactionStatus.PARTIALLY_REFUNDED
                        : PaymentTransactionStatus.COMPLETED);
                paymentRepository.save(payment);
            }
            return;
        }

        if (PaymentConstants.RZP_EVENT_REFUND_PROCESSED.equals(eventType)) {
            refund.setStatus("PROCESSED");
            refundRepository.save(refund);
            applyRefundProcessed(payment, refund);
        }
    }

    @Transactional
    public void markLedgerPosted(String paymentId, String ledgerTransactionId) {
        paymentRepository.findByPaymentId(paymentId).ifPresent(payment -> {
            if (payment.getStatus() == PaymentTransactionStatus.COMPLETED
                    && ledgerTransactionId != null
                    && ledgerTransactionId.equals(payment.getLedgerTransactionId())) {
                return;
            }
            if (payment.getStatus() == PaymentTransactionStatus.CAPTURED
                    || payment.getStatus() == PaymentTransactionStatus.PROCESSING) {
                transitionStatus(payment, PaymentTransactionStatus.COMPLETED);
                payment.setLedgerTransactionId(ledgerTransactionId);
                payment.setCompletedAt(Instant.now());
                paymentRepository.save(payment);
            }
        });
    }

    private Payment applyAuthorizedState(Payment payment, RazorpayPaymentResult rzpPayment) {
        if (payment.getStatus() == PaymentTransactionStatus.AUTHORIZED
                || payment.getStatus() == PaymentTransactionStatus.CAPTURED
                || payment.getStatus() == PaymentTransactionStatus.PROCESSING
                || payment.getStatus() == PaymentTransactionStatus.COMPLETED) {
            return payment;
        }
        transitionStatus(payment, PaymentTransactionStatus.AUTHORIZED);
        payment = paymentRepository.save(payment);
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                payment.getPaymentId(),
                "Payment",
                PaymentConstants.EVT_PAYMENT_AUTHORIZED,
                payment.getIdentitySubject(),
                payment.getRazorpayPaymentId(),
                new PaymentAuthorizedPayload(
                        payment.getPaymentId(),
                        payment.getIdentitySubject(),
                        payment.getDestinationAccountId(),
                        payment.getRazorpayOrderId(),
                        payment.getRazorpayPaymentId(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getPurpose(),
                        payment.getBusinessReference(),
                        Instant.now()
                )
        );
        return payment;
    }

    private Payment applyCapturedAndTriggerFulfillment(Payment payment, RazorpayPaymentResult rzpPayment) {
        if (payment.getStatus() == PaymentTransactionStatus.CAPTURED
                || payment.getStatus() == PaymentTransactionStatus.PROCESSING
                || payment.getStatus() == PaymentTransactionStatus.COMPLETED) {
            return payment;
        }

        transitionStatus(payment, PaymentTransactionStatus.CAPTURED);
        payment.setCapturedAt(Instant.now());
        payment = paymentRepository.save(payment);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                payment.getPaymentId(),
                "Payment",
                PaymentConstants.EVT_PAYMENT_CAPTURED,
                payment.getIdentitySubject(),
                payment.getRazorpayPaymentId(),
                new PaymentCapturedPayload(
                        payment.getPaymentId(),
                        payment.getIdentitySubject(),
                        payment.getDestinationAccountId(),
                        payment.getRazorpayOrderId(),
                        payment.getRazorpayPaymentId(),
                        payment.getPaymentMethod(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getPurpose(),
                        payment.getBusinessReference(),
                        Instant.now()
                )
        );

        transitionStatus(payment, PaymentTransactionStatus.PROCESSING);
        payment = paymentRepository.save(payment);

        if (payment.getPurpose() == PaymentPurpose.ACCOUNT_DEPOSIT) {
            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_INCOMING_EVENTS,
                    payment.getPaymentId(),
                    "Payment",
                    PaymentConstants.EVT_EXTERNAL_DEPOSIT_CONFIRMED,
                    payment.getIdentitySubject(),
                    payment.getRazorpayPaymentId(),
                    new ExternalAccountDepositConfirmedPayload(
                            payment.getPaymentId(),
                            payment.getIdentitySubject(),
                            payment.getDestinationAccountId(),
                            payment.getRazorpayOrderId(),
                            payment.getRazorpayPaymentId(),
                            payment.getPaymentMethod(),
                            payment.getAmount(),
                            payment.getCurrency(),
                            payment.getPurpose(),
                            Instant.now()
                    )
            );
        } else if (payment.getPurpose() == PaymentPurpose.LOAN_REPAYMENT) {
            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_INCOMING_EVENTS,
                    payment.getPaymentId(),
                    "Payment",
                    PaymentConstants.EVT_LOAN_REPAYMENT_CONFIRMED,
                    payment.getIdentitySubject(),
                    payment.getRazorpayPaymentId(),
                    new LoanRepaymentPaymentConfirmedPayload(
                            payment.getPaymentId(),
                            payment.getIdentitySubject(),
                            payment.getBusinessReference(),
                            payment.getRazorpayOrderId(),
                            payment.getRazorpayPaymentId(),
                            payment.getPaymentMethod(),
                            payment.getAmount(),
                            payment.getCurrency(),
                            payment.getPurpose(),
                            Instant.now()
                    )
            );
        } else if (payment.getPurpose() == PaymentPurpose.INVESTMENT_PAYMENT) {
            outboxService.enqueueEvent(
                    PaymentConstants.TOPIC_INCOMING_EVENTS,
                    payment.getPaymentId(),
                    "Payment",
                    PaymentConstants.EVT_INVESTMENT_PAYMENT_CONFIRMED,
                    payment.getIdentitySubject(),
                    payment.getRazorpayPaymentId(),
                    new InvestmentPaymentConfirmedPayload(
                            payment.getPaymentId(),
                            payment.getIdentitySubject(),
                            payment.getBusinessReference(),
                            payment.getRazorpayOrderId(),
                            payment.getRazorpayPaymentId(),
                            payment.getPaymentMethod(),
                            payment.getAmount(),
                            payment.getCurrency(),
                            payment.getPurpose(),
                            Instant.now()
                    )
            );
        } else {
            transitionStatus(payment, PaymentTransactionStatus.COMPLETED);
            payment.setCompletedAt(Instant.now());
            payment = paymentRepository.save(payment);
        }

        return payment;
    }

    private Payment markFailed(Payment payment, String failureCode, String failureReason) {
        if (payment.getStatus() == PaymentTransactionStatus.FAILED) {
            return payment;
        }
        transitionStatus(payment, PaymentTransactionStatus.FAILED);
        payment.setFailureCode(failureCode);
        payment.setFailureReason(failureReason);
        payment = paymentRepository.save(payment);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                payment.getPaymentId(),
                "Payment",
                PaymentConstants.EVT_PAYMENT_FAILED,
                payment.getIdentitySubject(),
                payment.getRazorpayPaymentId(),
                new PaymentFailedPayload(
                        payment.getPaymentId(),
                        payment.getIdentitySubject(),
                        payment.getDestinationAccountId(),
                        payment.getRazorpayOrderId(),
                        payment.getRazorpayPaymentId(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getPurpose(),
                        payment.getBusinessReference(),
                        failureCode,
                        failureReason,
                        Instant.now()
                )
        );
        return payment;
    }

    private void applyRefundProcessed(Payment payment, PaymentRefund refund) {
        BigDecimal totalRefunded = payment.getRefundedAmount().add(refund.getAmount());
        boolean fullRefund = totalRefunded.compareTo(payment.getAmount()) >= 0;
        payment.setRefundedAmount(fullRefund ? payment.getAmount() : totalRefunded);
        transitionStatus(payment, fullRefund
                ? PaymentTransactionStatus.REFUNDED
                : PaymentTransactionStatus.PARTIALLY_REFUNDED);
        paymentRepository.save(payment);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_INCOMING_EVENTS,
                payment.getPaymentId(),
                "Payment",
                PaymentConstants.EVT_PAYMENT_REFUNDED,
                payment.getIdentitySubject(),
                refund.getRazorpayRefundId(),
                new PaymentRefundedPayload(
                        payment.getPaymentId(),
                        refund.getRefundId(),
                        payment.getIdentitySubject(),
                        payment.getDestinationAccountId(),
                        payment.getRazorpayOrderId(),
                        payment.getRazorpayPaymentId(),
                        refund.getRazorpayRefundId(),
                        refund.getAmount(),
                        refund.getCurrency(),
                        payment.getPurpose(),
                        payment.getBusinessReference(),
                        fullRefund,
                        Instant.now()
                )
        );
    }

    private Payment findByOrderOrPayment(String razorpayOrderId, String razorpayPaymentId) {
        if (razorpayOrderId != null && !razorpayOrderId.isBlank()) {
            Optional<Payment> byOrder = paymentRepository.findByRazorpayOrderId(razorpayOrderId);
            if (byOrder.isPresent()) {
                return byOrder.get();
            }
        }
        if (razorpayPaymentId != null && !razorpayPaymentId.isBlank()) {
            Optional<Payment> byPayment = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId);
            if (byPayment.isPresent()) {
                return byPayment.get();
            }
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                "Payment transaction not found for Razorpay order/payment");
    }

    private void validateRazorpayPaymentMatchesOrder(Payment payment, RazorpayPaymentResult rzpPayment) {
        if (rzpPayment.orderId() != null && !rzpPayment.orderId().equals(payment.getRazorpayOrderId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ORDER_PAYMENT_MISMATCH",
                    "Razorpay payment does not belong to the expected Razorpay order");
        }
        validateWebhookAmountCurrency(payment, rzpPayment.amount(), rzpPayment.currency());
    }

    private void validateWebhookAmountCurrency(Payment payment, BigDecimal amount, String currency) {
        if (amount != null && payment.getAmount().compareTo(amount.setScale(4, RoundingMode.HALF_UP)) != 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_AMOUNT_MISMATCH",
                    "Razorpay payment amount does not match internal order amount");
        }
        if (currency != null && !payment.getCurrency().equalsIgnoreCase(currency)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_CURRENCY_MISMATCH",
                    "Razorpay payment currency does not match internal order currency");
        }
    }

    private void transitionStatus(Payment payment, PaymentTransactionStatus target) {
        if (!payment.getStatus().canTransitionTo(target)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_PAYMENT_STATE_TRANSITION",
                    "Cannot transition payment " + payment.getPaymentId()
                            + " from " + payment.getStatus() + " to " + target);
        }
        payment.setStatus(target);
    }

    private String resolveCustomerId(String identitySubject) {
        try {
            CustomerProfileDto profile = customerServiceClient.getCustomerProfile(identitySubject);
            return profile != null ? profile.customerId() : null;
        } catch (Exception ex) {
            log.debug("Customer profile lookup skipped/unavailable for subject={}: {}", identitySubject, ex.getMessage());
            return null;
        }
    }

    private String serializeNotes(Map<String, String> notes) {
        if (notes == null || notes.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(notes);
        } catch (Exception ex) {
            return null;
        }
    }

    public PaymentTransactionResponse toResponse(Payment p) {
        return new PaymentTransactionResponse(
                p.getPaymentId(),
                p.getIdentitySubject(),
                p.getCustomerId(),
                p.getDestinationAccountId(),
                p.getPurpose(),
                p.getBusinessReference(),
                p.getAmount(),
                p.getRefundedAmount(),
                p.getCurrency(),
                p.getStatus(),
                p.getRazorpayOrderId(),
                p.getRazorpayPaymentId(),
                p.isRazorpaySignatureVerified(),
                p.getPaymentMethod(),
                p.getLedgerTransactionId(),
                p.getLedgerReversalTxId(),
                p.getFailureCode(),
                p.getFailureReason(),
                p.getCapturedAt(),
                p.getCompletedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    public RefundResponse toRefundResponse(PaymentRefund r) {
        return new RefundResponse(
                r.getRefundId(),
                r.getPaymentId(),
                r.getRazorpayPaymentId(),
                r.getRazorpayRefundId(),
                r.getAmount(),
                r.getCurrency(),
                r.getStatus(),
                r.getReason(),
                r.getLedgerReversalTxId(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
