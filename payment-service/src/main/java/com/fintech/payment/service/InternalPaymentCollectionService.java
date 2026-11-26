package com.fintech.payment.service;

import com.fintech.payment.dto.internal.InternalPaymentDtos.*;
import com.fintech.payment.entity.PaymentCollectionOrder;
import com.fintech.payment.entity.PaymentMandateRegistration;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentCollectionOrderRepository;
import com.fintech.payment.repository.PaymentMandateRegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class InternalPaymentCollectionService {

    private static final Set<String> SUPPORTED_METHODS = Set.of(
            "UPI", "NET_BANKING", "CARD", "UPI_AUTOPAY", "ENACH"
    );
    private static final Set<String> SUPPORTED_MANDATE_TYPES = Set.of(
            "UPI_AUTOPAY", "ENACH"
    );

    private final PaymentCollectionOrderRepository collectionRepository;
    private final PaymentMandateRegistrationRepository mandateRepository;

    public InternalPaymentCollectionService(
            PaymentCollectionOrderRepository collectionRepository,
            PaymentMandateRegistrationRepository mandateRepository) {
        this.collectionRepository = collectionRepository;
        this.mandateRepository = mandateRepository;
    }

    @Transactional
    public CollectionOrderResponse initiateCollection(String idempotencyKey, InitiateCollectionRequest request) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PaymentCollectionOrder> existing = collectionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toCollectionResponse(existing.get());
            }
        }

        String method = request.paymentMethod().trim().toUpperCase();
        if (!SUPPORTED_METHODS.contains(method)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_PAYMENT_METHOD",
                    "Unsupported external payment method: " + method);
        }

        if (("UPI_AUTOPAY".equals(method) || "ENACH".equals(method))
                && (request.mandateReference() == null || request.mandateReference().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MANDATE_REFERENCE_REQUIRED",
                    "Mandate reference is required for recurring method " + method);
        }

        String collectionRef = "COL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String providerRef = "RZP-COL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        PaymentCollectionOrder order = new PaymentCollectionOrder();
        order.setCollectionReference(collectionRef);
        order.setIdempotencyKey(idempotencyKey);
        order.setSourceService(request.sourceService());
        order.setBusinessReference(request.businessReference());
        order.setCustomerId(request.customerId());
        order.setPaymentMethod(method);
        order.setAmount(request.amount());
        order.setCurrency(request.currency().trim().toUpperCase());
        order.setMandateReference(request.mandateReference());
        order.setProviderName("RAZORPAY");
        order.setProviderReference(providerRef);
        // Never mark SUCCESS synchronously; wait for webhook or verification
        order.setStatus("PENDING");

        return toCollectionResponse(collectionRepository.save(order));
    }

    @Transactional(readOnly = true)
    public CollectionOrderResponse getCollectionStatus(String collectionReference) {
        PaymentCollectionOrder order = collectionRepository.findByCollectionReference(collectionReference)
                .or(() -> collectionRepository.findByProviderReference(collectionReference))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND",
                        "Collection order not found: " + collectionReference));
        return toCollectionResponse(order);
    }

    @Transactional
    public CollectionOrderResponse refundCollection(String collectionReference, RefundCollectionRequest request) {
        PaymentCollectionOrder order = collectionRepository.findByCollectionReference(collectionReference)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND",
                        "Collection order not found: " + collectionReference));

        if (!"SUCCESS".equalsIgnoreCase(order.getStatus()) && !"CAPTURED".equalsIgnoreCase(order.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_NOT_ALLOWED",
                    "Only settled collections can be refunded. Current status: " + order.getStatus());
        }

        if (order.getRefundReference() == null) {
            order.setRefundReference("RFND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        }
        order.setStatus("REFUNDED");
        order.setFailureReason(request.reason());
        return toCollectionResponse(collectionRepository.save(order));
    }

    @Transactional
    public MandateRegistrationResponse registerMandate(String idempotencyKey, RegisterMandateRequest request) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<PaymentMandateRegistration> existing = mandateRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toMandateResponse(existing.get());
            }
        }

        String mandateType = request.mandateType().trim().toUpperCase();
        if (!SUPPORTED_MANDATE_TYPES.contains(mandateType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_MANDATE_TYPE",
                    "Unsupported external mandate type: " + mandateType);
        }

        String providerRef = "RZP-MND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        PaymentMandateRegistration reg = new PaymentMandateRegistration();
        reg.setMandateReference(request.mandateReference());
        reg.setProviderReference(providerRef);
        reg.setIdempotencyKey(idempotencyKey);
        reg.setSourceService(request.sourceService());
        reg.setCustomerId(request.customerId());
        reg.setMandateType(mandateType);
        reg.setProviderName("RAZORPAY");
        reg.setMaxAmount(request.maxAmount());
        reg.setFrequency(request.frequency().trim().toUpperCase());
        reg.setStartDate(request.startDate());
        reg.setEndDate(request.endDate());
        // External mandates always start PENDING until confirmed by provider callback
        reg.setStatus("PENDING");

        return toMandateResponse(mandateRepository.save(reg));
    }

    @Transactional(readOnly = true)
    public MandateRegistrationResponse getMandateStatus(String providerReference) {
        PaymentMandateRegistration reg = findMandate(providerReference);
        return toMandateResponse(reg);
    }

    @Transactional
    public MandateRegistrationResponse pauseMandate(String providerReference) {
        PaymentMandateRegistration reg = findMandate(providerReference);
        if (!"ACTIVE".equalsIgnoreCase(reg.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MANDATE_INVALID_STATE",
                    "Only ACTIVE mandates can be paused. Current status: " + reg.getStatus());
        }
        reg.setStatus("PAUSED");
        return toMandateResponse(mandateRepository.save(reg));
    }

    @Transactional
    public MandateRegistrationResponse resumeMandate(String providerReference) {
        PaymentMandateRegistration reg = findMandate(providerReference);
        if (!"PAUSED".equalsIgnoreCase(reg.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MANDATE_INVALID_STATE",
                    "Only PAUSED mandates can be resumed. Current status: " + reg.getStatus());
        }
        reg.setStatus("ACTIVE");
        return toMandateResponse(mandateRepository.save(reg));
    }

    @Transactional
    public MandateRegistrationResponse revokeMandate(String providerReference) {
        PaymentMandateRegistration reg = findMandate(providerReference);
        if ("REVOKED".equalsIgnoreCase(reg.getStatus())) {
            return toMandateResponse(reg);
        }
        reg.setStatus("REVOKED");
        return toMandateResponse(mandateRepository.save(reg));
    }

    private PaymentMandateRegistration findMandate(String providerReference) {
        return mandateRepository.findByProviderReference(providerReference)
                .or(() -> mandateRepository.findByMandateReference(providerReference))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MANDATE_NOT_FOUND",
                        "Mandate not found: " + providerReference));
    }

    private CollectionOrderResponse toCollectionResponse(PaymentCollectionOrder o) {
        return new CollectionOrderResponse(
                o.getCollectionReference(), o.getBusinessReference(), o.getProviderName(),
                o.getProviderReference(), o.getPaymentMethod(), o.getAmount(), o.getCurrency(),
                o.getStatus(), o.getFailureCode(), o.getFailureReason(), o.getRefundReference(),
                o.getCreatedAt(), o.getUpdatedAt()
        );
    }

    private MandateRegistrationResponse toMandateResponse(PaymentMandateRegistration m) {
        return new MandateRegistrationResponse(
                m.getMandateReference(), m.getProviderReference(), m.getMandateType(), m.getProviderName(),
                m.getMaxAmount(), m.getFrequency(), m.getStartDate(), m.getEndDate(),
                m.getStatus(), m.getFailureReason(), m.getCreatedAt(), m.getUpdatedAt()
        );
    }
}
