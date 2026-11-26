package com.fintech.loan.service;

import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanAccountRepository;
import org.springframework.stereotype.Component;

@Component
public class LoanAccountAccessHelper {

    private final LoanAccountRepository loanAccountRepository;

    public LoanAccountAccessHelper(LoanAccountRepository loanAccountRepository) {
        this.loanAccountRepository = loanAccountRepository;
    }

    public LoanAccount getOwnedOrStaffLoanAccount(String loanAccountId, String actorSubject, boolean isStaff) {
        LoanAccount account = loanAccountRepository.findByLoanAccountId(loanAccountId)
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + loanAccountId));
        if (!isStaff && !isOwner(account, actorSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED",
                    "You do not have access to loan account: " + loanAccountId);
        }
        return account;
    }

    public boolean isOwner(LoanAccount account, String actorSubject) {
        if (actorSubject == null || actorSubject.isBlank()) {
            return false;
        }
        return (account.getIdentitySubject() != null && account.getIdentitySubject().equalsIgnoreCase(actorSubject))
                || (account.getCustomerId() != null && account.getCustomerId().equalsIgnoreCase(actorSubject));
    }

    public String customerRecipient(LoanAccount account) {
        return (account.getIdentitySubject() != null && !account.getIdentitySubject().isBlank())
                ? account.getIdentitySubject()
                : account.getCustomerId();
    }
}
