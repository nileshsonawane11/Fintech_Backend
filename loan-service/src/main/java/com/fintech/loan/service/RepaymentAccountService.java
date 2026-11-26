package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.dto.request.RepaymentRequests.RegisterRepaymentAccountRequest;
import com.fintech.loan.dto.response.RepaymentResponses.RepaymentAccountResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.entity.LoanRepaymentAccount;
import com.fintech.loan.enums.MandateStatus;
import com.fintech.loan.enums.RepaymentAccountStatus;
import com.fintech.loan.enums.RepaymentStatus;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.mapper.RepaymentMapper;
import com.fintech.loan.repository.LoanRepaymentAccountRepository;
import com.fintech.loan.repository.LoanRepaymentMandateRepository;
import com.fintech.loan.repository.LoanRepaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class RepaymentAccountService {

    private static final Set<MandateStatus> BLOCKING_MANDATE_STATUSES =
            Set.of(MandateStatus.PENDING, MandateStatus.ACTIVE, MandateStatus.PAUSED);
    private static final Set<RepaymentStatus> PENDING_REPAYMENT_STATUSES =
            Set.of(RepaymentStatus.INITIATED, RepaymentStatus.PENDING, RepaymentStatus.PROCESSING);

    private final LoanAccountAccessHelper accessHelper;
    private final AccountServiceClient accountServiceClient;
    private final LoanRepaymentAccountRepository repaymentAccountRepository;
    private final LoanRepaymentMandateRepository mandateRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final RepaymentMapper mapper;

    public RepaymentAccountService(
            LoanAccountAccessHelper accessHelper,
            AccountServiceClient accountServiceClient,
            LoanRepaymentAccountRepository repaymentAccountRepository,
            LoanRepaymentMandateRepository mandateRepository,
            LoanRepaymentRepository repaymentRepository,
            RepaymentMapper mapper) {
        this.accessHelper = accessHelper;
        this.accountServiceClient = accountServiceClient;
        this.repaymentAccountRepository = repaymentAccountRepository;
        this.mandateRepository = mandateRepository;
        this.repaymentRepository = repaymentRepository;
        this.mapper = mapper;
    }

    @Transactional
    public RepaymentAccountResponse addRepaymentAccount(
            String loanAccountId, RegisterRepaymentAccountRequest request, String actorSubject) {
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        if (!"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            throw ApiException.unprocessable("LOAN_NOT_ACTIVE",
                    "Cannot register repayment account for loan in status: " + loan.getStatus());
        }

        InternalAccountDto verified = accountServiceClient.validateRepaymentAccount(
                request.accountIdentifier(),
                actorSubject,
                loan.getCustomerId(),
                loan.getCurrency()
        );

        var existing = repaymentAccountRepository.findByLoanAccountIdAndExternalAccountIdAndStatus(
                loanAccountId, verified.accountId(), RepaymentAccountStatus.ACTIVE);
        if (existing.isPresent()) {
            return mapper.toRepaymentAccountResponse(existing.get());
        }

        List<LoanRepaymentAccount> currentActive = repaymentAccountRepository
                .findByLoanAccountIdAndStatus(loanAccountId, RepaymentAccountStatus.ACTIVE);

        boolean makePrimary = request.primary() || currentActive.isEmpty();
        if (makePrimary) {
            for (LoanRepaymentAccount acc : currentActive) {
                if (acc.isPrimary()) {
                    acc.setPrimary(false);
                    repaymentAccountRepository.save(acc);
                }
            }
        }

        LoanRepaymentAccount entity = new LoanRepaymentAccount();
        entity.setRepaymentAccountId("RPA-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        entity.setLoanAccountId(loanAccountId);
        entity.setCustomerId(loan.getCustomerId());
        entity.setIdentitySubject(loan.getIdentitySubject());
        entity.setExternalAccountId(verified.accountId());
        entity.setMaskedAccountNumber(verified.accountNumberMasked() != null
                ? verified.accountNumberMasked()
                : maskIdentifier(verified.accountId()));
        entity.setAccountType(verified.accountType() != null ? verified.accountType() : "SAVINGS");
        entity.setCurrency(verified.currency() != null ? verified.currency() : loan.getCurrency());
        entity.setPrimary(makePrimary);
        entity.setStatus(RepaymentAccountStatus.ACTIVE);

        return mapper.toRepaymentAccountResponse(repaymentAccountRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<RepaymentAccountResponse> listRepaymentAccounts(String loanAccountId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        return repaymentAccountRepository.findByLoanAccountIdOrderByCreatedAtDesc(loanAccountId)
                .stream()
                .map(mapper::toRepaymentAccountResponse)
                .toList();
    }

    @Transactional
    public RepaymentAccountResponse setPrimaryRepaymentAccount(
            String loanAccountId, String repaymentAccountId, String actorSubject) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        LoanRepaymentAccount target = findOwnedRepaymentAccount(loanAccountId, repaymentAccountId);
        if (target.getStatus() != RepaymentAccountStatus.ACTIVE) {
            throw ApiException.unprocessable("REPAYMENT_ACCOUNT_INACTIVE",
                    "Only ACTIVE repayment accounts can be marked primary.");
        }

        List<LoanRepaymentAccount> activeList = repaymentAccountRepository
                .findByLoanAccountIdAndStatus(loanAccountId, RepaymentAccountStatus.ACTIVE);
        for (LoanRepaymentAccount acc : activeList) {
            if (!acc.getRepaymentAccountId().equals(repaymentAccountId) && acc.isPrimary()) {
                acc.setPrimary(false);
                repaymentAccountRepository.save(acc);
            }
        }
        target.setPrimary(true);
        return mapper.toRepaymentAccountResponse(repaymentAccountRepository.save(target));
    }

    @Transactional
    public void deactivateRepaymentAccount(String loanAccountId, String repaymentAccountId, String actorSubject) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, false);
        LoanRepaymentAccount target = findOwnedRepaymentAccount(loanAccountId, repaymentAccountId);

        if (mandateRepository.existsByRepaymentAccountIdAndStatusIn(repaymentAccountId, BLOCKING_MANDATE_STATUSES)) {
            throw ApiException.conflict("ACTIVE_MANDATE_EXISTS",
                    "Cannot remove repayment account while an active, paused, or pending mandate is linked to it.");
        }
        if (repaymentRepository.existsByRepaymentAccountIdAndRepaymentStatusIn(repaymentAccountId, PENDING_REPAYMENT_STATUSES)) {
            throw ApiException.conflict("PENDING_COLLECTION_EXISTS",
                    "Cannot remove repayment account while a repayment collection is in progress.");
        }

        target.setPrimary(false);
        target.setStatus(RepaymentAccountStatus.INACTIVE);
        repaymentAccountRepository.save(target);
    }

    public LoanRepaymentAccount resolveActiveRepaymentAccount(String loanAccountId, String requestedRepaymentAccountId) {
        if (requestedRepaymentAccountId != null && !requestedRepaymentAccountId.isBlank()) {
            LoanRepaymentAccount acc = findOwnedRepaymentAccount(loanAccountId, requestedRepaymentAccountId);
            if (acc.getStatus() != RepaymentAccountStatus.ACTIVE) {
                throw ApiException.unprocessable("REPAYMENT_ACCOUNT_INACTIVE",
                        "Selected repayment account is not ACTIVE.");
            }
            return acc;
        }
        return repaymentAccountRepository.findByLoanAccountIdAndPrimaryTrueAndStatus(
                        loanAccountId, RepaymentAccountStatus.ACTIVE)
                .orElseThrow(() -> ApiException.unprocessable("PRIMARY_REPAYMENT_ACCOUNT_NOT_FOUND",
                        "No active primary repayment account is registered for loan " + loanAccountId));
    }

    private LoanRepaymentAccount findOwnedRepaymentAccount(String loanAccountId, String repaymentAccountId) {
        LoanRepaymentAccount acc = repaymentAccountRepository.findByRepaymentAccountId(repaymentAccountId)
                .orElseThrow(() -> ApiException.notFound("REPAYMENT_ACCOUNT_NOT_FOUND",
                        "Repayment account not found: " + repaymentAccountId));
        if (!acc.getLoanAccountId().equals(loanAccountId)) {
            throw ApiException.forbidden("REPAYMENT_ACCOUNT_MISMATCH",
                    "Repayment account does not belong to loan account " + loanAccountId);
        }
        return acc;
    }

    private String maskIdentifier(String id) {
        if (id == null || id.length() <= 4) return "****";
        return "****" + id.substring(id.length() - 4);
    }
}
