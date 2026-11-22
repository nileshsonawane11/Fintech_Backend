package com.fintech.card.domain;

import com.fintech.card.client.dto.AccountVerificationDto;
import com.fintech.card.client.dto.AddressVerificationDto;
import com.fintech.card.client.dto.CustomerProfileDto;
import com.fintech.card.exception.*;
import com.fintech.card.repository.CardApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class CardEligibilityValidator {

    private static final Logger log = LoggerFactory.getLogger(CardEligibilityValidator.class);
    private static final Set<String> ACTIVE_ACCOUNT_STATUSES = Set.of("ACTIVE");
    private static final List<String> PENDING_APPLICATION_STATUSES = List.of("PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED");

    private final CardApplicationRepository cardApplicationRepository;
    private final CardProductCatalog productCatalog;

    public CardEligibilityValidator(CardApplicationRepository cardApplicationRepository,
                                  CardProductCatalog productCatalog) {
        this.cardApplicationRepository = cardApplicationRepository;
        this.productCatalog = productCatalog;
    }

    public void validateEligibility(
            String authenticatedCustomerId,
            String identitySubject,
            CanonicalCardApplication application,
            AccountVerificationDto account,
            AddressVerificationDto address,
            CustomerProfileDto customerProfile) {

        log.debug("Validating card application eligibility for authenticated customer: {}", authenticatedCustomerId);

        // 1. Cross-Service Customer Ownership Validation (Conditions A, B, C, D)
        validateOwnership(authenticatedCustomerId, identitySubject, account, address);

        // 2. Validate Account Status
        validateAccountStatus(account);

        // 3. Validate Account Product Eligibility for Card Type
        validateAccountTypeEligibility(application, account);

        // 4. Validate Delivery Address Status & Physical Delivery
        validateAddressDelivery(address);

        // 5. Validate Customer KYC if profile is available
        if (customerProfile != null && customerProfile.kycStatus() != null) {
            String kyc = customerProfile.kycStatus().toUpperCase();
            if (!"APPROVED".equals(kyc)) {
                log.warn("Customer KYC is not APPROVED (status={}) for customer {}", kyc, authenticatedCustomerId);
                throw new AccountNotEligibleException("Customer KYC must be APPROVED before applying for a card. Current status: " + kyc);
            }
        }

        // 6. Duplicate Application Check
        validateNoDuplicatePendingApplication(authenticatedCustomerId, application.linkedAccountId(), application.cardType());
    }

    private void validateOwnership(
            String authenticatedCustomerId,
            String identitySubject,
            AccountVerificationDto account,
            AddressVerificationDto address) {

        String accountCustId = account.customerId();
        String addressCustId = address.customerId();

        // Condition D: Authenticated Customer Ownership
        // Always compare identitySubject (from jwt.getSubject()) with account and address identitySubject
        boolean accountMatchesAuth = (account.identitySubject() != null && identitySubject != null && account.identitySubject().equalsIgnoreCase(identitySubject))
                || (accountCustId != null && (accountCustId.equalsIgnoreCase(identitySubject) || accountCustId.equalsIgnoreCase(authenticatedCustomerId)));
        if (!accountMatchesAuth) {
            log.warn("Account ownership violation: identitySubject={}, accountIdentitySubject={}, accountOwner={}",
                    identitySubject, account.identitySubject(), accountCustId);
            throw new AccountOwnershipMismatchException("The selected account does not belong to the authenticated customer.");
        }

        boolean addressMatchesAuth = (address.identitySubject() != null && identitySubject != null && address.identitySubject().equalsIgnoreCase(identitySubject))
                || (addressCustId != null && (addressCustId.equalsIgnoreCase(identitySubject) || addressCustId.equalsIgnoreCase(authenticatedCustomerId)));
        if (!addressMatchesAuth) {
            log.warn("Address ownership violation: identitySubject={}, addressIdentitySubject={}, addressOwner={}",
                    identitySubject, address.identitySubject(), addressCustId);
            throw new AddressOwnershipMismatchException("The selected delivery address does not belong to the authenticated customer.");
        }

        // Condition C: Account and Address ownership match each other
        boolean accountMatchesAddress = accountCustId.equalsIgnoreCase(addressCustId) ||
                (account.identitySubject() != null && account.identitySubject().equalsIgnoreCase(address.identitySubject()));
        if (!accountMatchesAddress) {
            log.warn("Cross-service ownership mismatch: accountOwner={}, addressOwner={}",
                    accountCustId, addressCustId);
            throw new AccountOwnershipMismatchException("The linked account and delivery address belong to different customer records.");
        }
    }

    private void validateAccountStatus(AccountVerificationDto account) {
        String status = account.status();
        if (status == null || !ACTIVE_ACCOUNT_STATUSES.contains(status.toUpperCase())) {
            log.warn("Linked account {} is in ineligible status: {}", account.accountId(), status);
            throw new AccountNotEligibleException(
                    "Linked account " + account.accountId() + " is in status '" + status +
                            "'. Cards can only be linked to ACTIVE accounts.");
        }
    }

    private void validateAccountTypeEligibility(CanonicalCardApplication application, AccountVerificationDto account) {
        CardProduct product = productCatalog.resolveProduct(
                application.productSlug(),
                null,
                application.cardName(),
                null,
                application.cardType()
        );

        String accountType = account.accountType();
        if (!product.isAccountTypeEligible(accountType)) {
            log.warn("Account type {} is ineligible for card product {}", accountType, product.productSlug());
            throw new AccountNotEligibleException(
                    "Account type '" + accountType + "' is not eligible for " + application.cardName() +
                            " (" + application.cardType() + "). Eligible types: " + product.eligibleAccountTypes());
        }
    }

    private void validateAddressDelivery(AddressVerificationDto address) {
        if (address.status() != null && !"ACTIVE".equalsIgnoreCase(address.status())) {
            log.warn("Delivery address {} is not ACTIVE (status={})", address.id(), address.status());
            throw new AddressNotDeliverableException("Delivery address " + address.id() + " is inactive or unavailable.");
        }

        if (!address.deliverable()) {
            log.warn("Delivery address {} is marked as non-deliverable for cards", address.id());
            throw new AddressNotDeliverableException("Delivery address " + address.id() + " cannot be used for physical card delivery.");
        }
    }

    private void validateNoDuplicatePendingApplication(String customerId, String linkedAccountId, String cardType) {
        boolean duplicateExists = cardApplicationRepository.existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(
                customerId, linkedAccountId, cardType, PENDING_APPLICATION_STATUSES);

        if (duplicateExists) {
            log.warn("Duplicate application rejected for customer={}, account={}, cardType={}",
                    customerId, linkedAccountId, cardType);
            throw new CardApplicationAlreadyExistsException(
                    "A pending card application already exists for account " + linkedAccountId + " and card type " + cardType);
        }
    }
}
