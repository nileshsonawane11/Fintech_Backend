package com.fintech.payment.service;

import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.internal.InternalPaymentDtos.*;
import com.fintech.payment.dto.request.RefundPaymentRequest;
import com.fintech.payment.dto.response.RefundResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.RazorpayOrdersProvider;
import com.fintech.payment.provider.model.ProviderModels.CreateOrderCommand;
import com.fintech.payment.provider.model.ProviderModels.RazorpayOrderResult;
import com.fintech.payment.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class InternalPaymentCollectionService {

    private final PaymentRepository paymentRepository;
    private final RazorpayOrdersProvider razorpayOrdersProvider;
    private final RazorpayProperties razorpayProperties;
    private final PaymentService paymentService;

    public InternalPaymentCollectionService(
            PaymentRepository paymentRepository,
            RazorpayOrdersProvider razorpayOrdersProvider,
            RazorpayProperties razorpayProperties,
            PaymentService paymentService) {
        this.paymentRepository = paymentRepository;
        this.razorpayOrdersProvider = razorpayOrdersProvider;
        this.razorpayProperties = razorpayProperties;
        this.paymentService = paymentService;
    }

    @Transactional
    public CollectionOrderResponse initiateCollection(String idempotencyKey, InitiateCollectionRequest request) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toCollectionResponse(existing.get());
            }
        }

        PaymentPurpose purpose = resolvePurpose(request.sourceService());
        String currency = request.currency().trim().toUpperCase();
        String paymentId = "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        Payment payment = new Payment();
        payment.setPaymentId(paymentId);
        payment.setIdentitySubject(
                request.identitySubject() != null && !request.identitySubject().isBlank()
                        ? request.identitySubject()
                        : request.customerId());
        payment.setCustomerId(request.customerId());
        payment.setDestinationAccountId(request.destinationAccountId());
        payment.setPurpose(purpose);
        payment.setSourceService(request.sourceService());
        payment.setBusinessReference(request.businessReference());
        payment.setAmount(request.amount().setScale(4, RoundingMode.HALF_UP));
        payment.setCurrency(currency);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setStatus(PaymentTransactionStatus.INITIATED);
        payment.setReceipt(paymentId);
        payment.setIdempotencyKey(idempotencyKey);
        payment = paymentRepository.save(payment);

        RazorpayOrderResult rzpOrder = razorpayOrdersProvider.createOrder(new CreateOrderCommand(
                payment.getAmount(),
                currency,
                paymentId,
                razorpayProperties.isAutoCapture(),
                Map.of(
                        "paymentId", paymentId,
                        "sourceService", request.sourceService(),
                        "businessReference", request.businessReference(),
                        "purpose", purpose.name()
                )
        ));

        payment.setRazorpayOrderId(rzpOrder.orderId());
        payment.setStatus(PaymentTransactionStatus.ORDER_CREATED);
        payment = paymentRepository.save(payment);

        return toCollectionResponse(payment);
    }

    @Transactional(readOnly = true)
    public CollectionOrderResponse getCollectionStatus(String collectionReference) {
        Payment payment = paymentRepository.findByPaymentId(collectionReference)
                .or(() -> paymentRepository.findByRazorpayOrderId(collectionReference))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND",
                        "Collection order not found: " + collectionReference));
        return toCollectionResponse(payment);
    }

    @Transactional
    public CollectionOrderResponse refundCollection(String collectionReference, RefundCollectionRequest request) {
        Payment payment = paymentRepository.findByPaymentId(collectionReference)
                .or(() -> paymentRepository.findByRazorpayOrderId(collectionReference))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND",
                        "Collection order not found: " + collectionReference));

        RefundResponse refund = paymentService.initiateRefund(
                payment.getIdentitySubject(),
                "INT-REF-" + collectionReference,
                payment.getPaymentId(),
                new RefundPaymentRequest(request.amount(), request.reason()),
                true
        );

        Payment updated = paymentRepository.findByPaymentId(payment.getPaymentId()).orElse(payment);
        return toCollectionResponse(updated);
    }

    private PaymentPurpose resolvePurpose(String sourceService) {
        if ("LOAN-SERVICE".equalsIgnoreCase(sourceService)) {
            return PaymentPurpose.LOAN_REPAYMENT;
        }
        if ("INVESTMENT-SERVICE".equalsIgnoreCase(sourceService)) {
            return PaymentPurpose.INVESTMENT_PAYMENT;
        }
        return PaymentPurpose.OTHER_SUPPORTED_PAYMENT;
    }

    private CollectionOrderResponse toCollectionResponse(Payment p) {
        String mappedStatus = switch (p.getStatus()) {
            case CAPTURED, PROCESSING, COMPLETED -> "CAPTURED";
            case FAILED, CANCELLED -> "FAILED";
            case REFUNDED, PARTIALLY_REFUNDED -> "REFUNDED";
            default -> "PENDING";
        };
        return new CollectionOrderResponse(
                p.getPaymentId(),
                p.getSourceService(),
                p.getBusinessReference(),
                p.getCustomerId(),
                p.getPaymentMethod(),
                p.getAmount(),
                p.getCurrency(),
                PaymentConstants.PROVIDER_RAZORPAY,
                p.getRazorpayOrderId(),
                p.getRazorpayOrderId(),
                razorpayProperties.getKeyId(),
                mappedStatus,
                p.getFailureCode(),
                p.getFailureReason()
        );
    }
}
