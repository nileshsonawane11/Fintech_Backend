package com.fintech.account.service;

import com.fintech.account.dto.request.NomineeRequest;
import com.fintech.account.dto.response.AccountNomineeResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountNominee;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.event.model.AccountEvents.*;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountNomineeRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.EncryptionUtil;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.util.AuditLogger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class NomineeService {

    private final AccountNomineeRepository nomineeRepository;
    private final AccountRepository accountRepository;
    private final EncryptionUtil encryptionUtil;
    private final OutboxEventService outboxEventService;
    private final AuditLogger auditLogger;

    public NomineeService(
            AccountNomineeRepository nomineeRepository,
            AccountRepository accountRepository,
            EncryptionUtil encryptionUtil,
            OutboxEventService outboxEventService,
            AuditLogger auditLogger) {
        this.nomineeRepository = nomineeRepository;
        this.accountRepository = accountRepository;
        this.encryptionUtil = encryptionUtil;
        this.outboxEventService = outboxEventService;
        this.auditLogger = auditLogger;
    }

    @Transactional
    public AccountNomineeResponse addNominee(
            String identitySubject, String accountId, NomineeRequest request, String actor) {
        Account account = getAccountAndValidateOwnership(identitySubject, accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("ACCOUNT_CLOSED", "Cannot add nominees to a CLOSED account.");
        }

        validateNomineeDateOfBirth(request.dateOfBirth());

        int currentAllocation = nomineeRepository.getTotalAllocationPercentage(accountId);
        int newAllocation = request.allocationPercentage() != null ? request.allocationPercentage() : 100;
        if (currentAllocation + newAllocation > 100) {
            throw AccountException.unprocessable("ALLOCATION_EXCEEDED",
                    "Total nominee allocation percentage would exceed 100%. Current allocation: " + currentAllocation + "%.");
        }

        AccountNominee nominee = new AccountNominee();
        nominee.setAccountId(accountId);
        nominee.setFullName(request.fullName());
        nominee.setRelationship(request.relationship());
        nominee.setDateOfBirth(request.dateOfBirth());
        nominee.setMobileNumberEncrypted(encryptionUtil.encrypt(request.mobileNumber()));
        nominee.setAllocationPercentage(newAllocation);
        nominee.setCreatedBy(actor);
        nominee.setUpdatedBy(actor);

        AccountNominee saved = nomineeRepository.save(nominee);

        outboxEventService.enqueueEvent(
                saved.getId().toString(),
                "AccountNominee",
                "AccountNomineeAddedEvent",
                new AccountNomineeAddedPayload(
                        saved.getId(),
                        saved.getAccountId(),
                        saved.getFullName(),
                        saved.getRelationship(),
                        saved.getAllocationPercentage(),
                        saved.getCreatedAt()
                )
        );

        auditLogger.logAudit("ADD_NOMINEE", "AccountNominee", saved.getId().toString(), actor,
                "Added nominee " + saved.getFullName() + " to account " + accountId);

        return toResponse(saved, request.mobileNumber());
    }

    @Transactional(readOnly = true)
    public List<AccountNomineeResponse> listNominees(String identitySubject, String accountId, boolean isOps) {
        if (!isOps) {
            getAccountAndValidateOwnership(identitySubject, accountId);
        } else {
            getAccountOrThrow(accountId);
        }

        return nomineeRepository.findByAccountId(accountId).stream()
                .map(this::toResponseWithDecryptedMobile)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountNomineeResponse getNominee(String identitySubject, String accountId, UUID nomineeId, boolean isOps) {
        if (!isOps) {
            getAccountAndValidateOwnership(identitySubject, accountId);
        } else {
            getAccountOrThrow(accountId);
        }

        AccountNominee nominee = nomineeRepository.findByIdAndAccountId(nomineeId, accountId)
                .orElseThrow(() -> AccountException.notFound("Nominee not found with id: " + nomineeId));

        return toResponseWithDecryptedMobile(nominee);
    }

    @Transactional
    public AccountNomineeResponse updateNominee(
            String identitySubject, String accountId, UUID nomineeId, NomineeRequest request, String actor) {
        Account account = getAccountAndValidateOwnership(identitySubject, accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("ACCOUNT_CLOSED", "Cannot update nominees on a CLOSED account.");
        }

        validateNomineeDateOfBirth(request.dateOfBirth());

        AccountNominee nominee = nomineeRepository.findByIdAndAccountId(nomineeId, accountId)
                .orElseThrow(() -> AccountException.notFound("Nominee not found with id: " + nomineeId));

        int otherAllocation = nomineeRepository.getTotalAllocationPercentageExcluding(accountId, nomineeId);
        int newAllocation = request.allocationPercentage() != null ? request.allocationPercentage() : nominee.getAllocationPercentage();
        if (otherAllocation + newAllocation > 100) {
            throw AccountException.unprocessable("ALLOCATION_EXCEEDED",
                    "Total nominee allocation percentage would exceed 100%. Allocation from other nominees: " + otherAllocation + "%.");
        }

        nominee.setFullName(request.fullName());
        nominee.setRelationship(request.relationship());
        nominee.setDateOfBirth(request.dateOfBirth());
        nominee.setMobileNumberEncrypted(encryptionUtil.encrypt(request.mobileNumber()));
        nominee.setAllocationPercentage(newAllocation);
        nominee.setUpdatedBy(actor);

        AccountNominee saved = nomineeRepository.save(nominee);

        outboxEventService.enqueueEvent(
                saved.getId().toString(),
                "AccountNominee",
                "AccountNomineeUpdatedEvent",
                new AccountNomineeUpdatedPayload(
                        saved.getId(),
                        saved.getAccountId(),
                        saved.getFullName(),
                        saved.getRelationship(),
                        saved.getAllocationPercentage(),
                        saved.getUpdatedAt()
                )
        );

        auditLogger.logAudit("UPDATE_NOMINEE", "AccountNominee", saved.getId().toString(), actor,
                "Updated nominee " + saved.getId() + " on account " + accountId);

        return toResponse(saved, request.mobileNumber());
    }

    @Transactional
    public void deleteNominee(String identitySubject, String accountId, UUID nomineeId, String actor) {
        Account account = getAccountAndValidateOwnership(identitySubject, accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("ACCOUNT_CLOSED", "Cannot delete nominees from a CLOSED account.");
        }

        AccountNominee nominee = nomineeRepository.findByIdAndAccountId(nomineeId, accountId)
                .orElseThrow(() -> AccountException.notFound("Nominee not found with id: " + nomineeId));

        nomineeRepository.delete(nominee);

        outboxEventService.enqueueEvent(
                nomineeId.toString(),
                "AccountNominee",
                "AccountNomineeDeletedEvent",
                new AccountNomineeDeletedPayload(nomineeId, accountId, java.time.Instant.now())
        );

        auditLogger.logAudit("DELETE_NOMINEE", "AccountNominee", nomineeId.toString(), actor,
                "Deleted nominee from account " + accountId);
    }

    private Account getAccountAndValidateOwnership(String identitySubject, String accountId) {
        Account account = getAccountOrThrow(accountId);
        if (!account.getIdentitySubject().equals(identitySubject)) {
            throw AccountException.forbidden("ACCESS_DENIED", "You do not own this account.");
        }
        return account;
    }

    private Account getAccountOrThrow(String accountId) {
        return accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));
    }

    private void validateNomineeDateOfBirth(LocalDate dob) {
        if (dob != null && dob.isAfter(LocalDate.now())) {
            throw AccountException.unprocessable("INVALID_NOMINEE", "Nominee date of birth cannot be in the future.");
        }
    }

    private AccountNomineeResponse toResponse(AccountNominee nominee, String plainMobile) {
        return new AccountNomineeResponse(
                nominee.getId(),
                nominee.getAccountId(),
                nominee.getFullName(),
                nominee.getRelationship(),
                nominee.getDateOfBirth(),
                SecurityUtils.maskMobileNumber(plainMobile),
                nominee.getAllocationPercentage(),
                nominee.getCreatedAt()
        );
    }

    private AccountNomineeResponse toResponseWithDecryptedMobile(AccountNominee nominee) {
        String decryptedMobile = null;
        try {
            decryptedMobile = encryptionUtil.decrypt(nominee.getMobileNumberEncrypted());
        } catch (Exception ignored) {}

        return toResponse(nominee, decryptedMobile);
    }
}
