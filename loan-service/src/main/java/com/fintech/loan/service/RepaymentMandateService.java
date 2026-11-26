package com.fintech.loan.service;

import com.fintech.loan.client.PaymentServiceClient;
import com.fintech.loan.client.dto.PaymentDtos.*;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.CreateMandateRequest;
import com.fintech.loan.dto.response.RepaymentResponses.MandateResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanRepaymentAccount;
import com.fintech.loan.entity.LoanRepaymentMandate;
import com.fintech.loan.enums.MandateStatus;
import com.fintech.loan.enums.MandateType;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.mapper.RepaymentMapper;
import com.fintech.loan.repository.LoanRepaymentMandateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class RepaymentMandateService {

    private final LoanAccountAccessHelper accessHelper;
    private final RepaymentAccountService repaymentAccountService;
    private final PaymentServiceClient paymentServiceClient;
    private final LoanRepaymentMandateRepository mandateRepository;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final RepaymentMapper mapper;

    public RepaymentMandateService(
            LoanAccountAccessHelper accessHelper,
            RepaymentAccountService repaymentAccountService,
            PaymentServiceClient paymentServiceClient,
            LoanRepaymentMandateRepository mandateRepository,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            RepaymentMapper mapper) {
        this.accessHelper = accessHelper;
        this.repaymentAccountService = repaymentAccountService;
        this.paymentServiceClient = paymentServiceClient;
        this.mandateRepository = mandateRepository;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional
    public MandateResponse createMandate(
            String loanAccountId, CreateMandateRequest request, String idempotencyKey, String actorSubject) {
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        if (!"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            throw ApiException.unprocessable("LOAN_NOT_ACTIVE",
                    "Mandates can only be created for ACTIVE loans.");
        }
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw ApiException.badRequest("INVALID_MANDATE_DATES", "Mandate endDate cannot be before startDate.");
        }

        String mandateId = "MND-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        LoanRepaymentMandate mandate = new LoanRepaymentMandate();
        mandate.setMandateId(mandateId);
        mandate.setLoanAccountId(loanAccountId);
        mandate.setCustomerId(loan.getCustomerId());
        mandate.setIdentitySubject(loan.getIdentitySubject());
        mandate.setMandateType(request.mandateType());
        mandate.setMaxAuthorizedAmount(request.maxAuthorizedAmount());
        mandate.setFrequency(request.frequency());
        mandate.setStartDate(request.startDate());
        mandate.setEndDate(request.endDate());

        if (request.mandateType() == MandateType.INTERNAL_AUTODEBIT) {
            LoanRepaymentAccount repAcc = repaymentAccountService.resolveActiveRepaymentAccount(
                    loanAccountId, request.repaymentAccountId());
            mandate.setRepaymentAccountId(repAcc.getRepaymentAccountId());
            mandate.setStatus(MandateStatus.ACTIVE);
            mandate.setActivatedAt(Instant.now());
            mandate = mandateRepository.save(mandate);
            onMandateActivated(loan, mandate);
        } else {
            // External mandate (UPI_AUTOPAY / ENACH): stays PENDING until provider confirms via webhook/status
            MandateRegistrationResponse reg = paymentServiceClient.registerMandate(
                    idempotencyKey != null ? idempotencyKey : mandateId,
                    new RegisterMandateRequest(
                            "LOAN-SERVICE",
                            mandateId,
                            loan.getCustomerId(),
                            request.mandateType().name(),
                            request.maxAuthorizedAmount(),
                            request.frequency().name(),
                            request.startDate(),
                            request.endDate()
                    )
            );
            mandate.setProviderReference(reg.providerReference());
            mandate.setStatus(MandateStatus.PENDING);
            mandate = mandateRepository.save(mandate);
        }

        return mapper.toMandateResponse(mandate);
    }

    @Transactional(readOnly = true)
    public List<MandateResponse> listMandates(String loanAccountId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        return mandateRepository.findByLoanAccountIdOrderByCreatedAtDesc(loanAccountId)
                .stream()
                .map(mapper::toMandateResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MandateResponse getMandate(String loanAccountId, String mandateId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        return mapper.toMandateResponse(findMandateForLoan(loanAccountId, mandateId));
    }

    @Transactional
    public MandateResponse pauseMandate(String loanAccountId, String mandateId, String actorSubject) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        LoanRepaymentMandate mandate = findMandateForLoan(loanAccountId, mandateId);
        if (mandate.getStatus() != MandateStatus.ACTIVE) {
            throw ApiException.unprocessable("MANDATE_INVALID_STATE",
                    "Only ACTIVE mandates can be paused. Current status: " + mandate.getStatus());
        }
        if (mandate.getMandateType() != MandateType.INTERNAL_AUTODEBIT && mandate.getProviderReference() != null) {
            paymentServiceClient.performMandateAction(mandate.getProviderReference(), "pause");
        }
        mandate.setStatus(MandateStatus.PAUSED);
        mandate.setPausedAt(Instant.now());
        return mapper.toMandateResponse(mandateRepository.save(mandate));
    }

    @Transactional
    public MandateResponse resumeMandate(String loanAccountId, String mandateId, String actorSubject) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        LoanRepaymentMandate mandate = findMandateForLoan(loanAccountId, mandateId);
        if (mandate.getStatus() != MandateStatus.PAUSED) {
            throw ApiException.unprocessable("MANDATE_INVALID_STATE",
                    "Only PAUSED mandates can be resumed. Current status: " + mandate.getStatus());
        }
        if (mandate.getEndDate() != null && mandate.getEndDate().isBefore(LocalDate.now())) {
            mandate.setStatus(MandateStatus.EXPIRED);
            mandateRepository.save(mandate);
            throw ApiException.unprocessable("MANDATE_EXPIRED", "Mandate has already expired.");
        }
        if (mandate.getMandateType() != MandateType.INTERNAL_AUTODEBIT && mandate.getProviderReference() != null) {
            paymentServiceClient.performMandateAction(mandate.getProviderReference(), "resume");
        }
        mandate.setStatus(MandateStatus.ACTIVE);
        return mapper.toMandateResponse(mandateRepository.save(mandate));
    }

    @Transactional
    public MandateResponse revokeMandate(String loanAccountId, String mandateId, String actorSubject) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        LoanRepaymentMandate mandate = findMandateForLoan(loanAccountId, mandateId);
        if (mandate.getStatus() == MandateStatus.REVOKED) {
            return mapper.toMandateResponse(mandate);
        }
        if (mandate.getMandateType() != MandateType.INTERNAL_AUTODEBIT && mandate.getProviderReference() != null) {
            paymentServiceClient.performMandateAction(mandate.getProviderReference(), "revoke");
        }
        mandate.setStatus(MandateStatus.REVOKED);
        mandate.setRevokedAt(Instant.now());
        return mapper.toMandateResponse(mandateRepository.save(mandate));
    }

    @Transactional
    public void handleExternalMandateStatusUpdate(String providerReference, String newStatus, String failureReason) {
        LoanRepaymentMandate mandate = mandateRepository.findByProviderReference(providerReference)
                .orElseThrow(() -> ApiException.notFound("MANDATE_NOT_FOUND",
                        "Mandate not found for providerReference: " + providerReference));
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(mandate.getLoanAccountId(), null, true);

        MandateStatus target = MandateStatus.valueOf(newStatus.trim().toUpperCase());
        mandate.setStatus(target);
        if (target == MandateStatus.ACTIVE && mandate.getActivatedAt() == null) {
            mandate.setActivatedAt(Instant.now());
            mandateRepository.save(mandate);
            onMandateActivated(loan, mandate);
            return;
        }
        if (target == MandateStatus.FAILED) {
            mandate.setFailureReason(failureReason);
            mandateRepository.save(mandate);
            notificationService.notifyCustomer(
                    accessHelper.customerRecipient(loan),
                    "LOAN_MANDATE_FAILED",
                    "Auto-Repayment Mandate Failed: " + loan.getLoanAccountId(),
                    "Mandate " + mandate.getMandateId() + " could not be activated. Reason: " + failureReason,
                    mandate.getMandateId()
            );
            return;
        }
        mandateRepository.save(mandate);
    }

    private void onMandateActivated(LoanAccount loan, LoanRepaymentMandate mandate) {
        outboxService.enqueueEvent(
                LoanConstants.TOPIC_MANDATE_ACTIVATED,
                mandate.getMandateId(),
                "LOAN_MANDATE",
                "LoanMandateActivated",
                new LoanEvents.LoanMandateEventPayload(
                        mandate.getMandateId(),
                        mandate.getLoanAccountId(),
                        mandate.getCustomerId(),
                        mandate.getMandateType().name(),
                        mandate.getStatus().name(),
                        Instant.now()
                )
        );
        notificationService.notifyCustomer(
                accessHelper.customerRecipient(loan),
                "LOAN_MANDATE_ACTIVATED",
                "Auto-Repayment Mandate Activated: " + loan.getLoanAccountId(),
                "Your " + mandate.getMandateType() + " mandate " + mandate.getMandateId()
                        + " is now ACTIVE up to " + loan.getCurrency() + " " + mandate.getMaxAuthorizedAmount() + ".",
                mandate.getMandateId()
        );
    }

    private LoanRepaymentMandate findMandateForLoan(String loanAccountId, String mandateId) {
        LoanRepaymentMandate m = mandateRepository.findByMandateId(mandateId)
                .orElseThrow(() -> ApiException.notFound("MANDATE_NOT_FOUND", "Mandate not found: " + mandateId));
        if (!m.getLoanAccountId().equals(loanAccountId)) {
            throw ApiException.forbidden("MANDATE_MISMATCH", "Mandate does not belong to loan " + loanAccountId);
        }
        return m;
    }
}
