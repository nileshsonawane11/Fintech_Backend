package com.fintech.payment.provider;

import com.fintech.payment.provider.model.ProviderModels.*;

public interface PayoutProvider {

    String providerName();

    boolean isPayoutAvailable();

    boolean isValidationAvailable();

    ContactResult createContact(CreateContactCommand command);

    FundAccountResult createBankFundAccount(CreateBankFundAccountCommand command);

    FundAccountResult createVpaFundAccount(CreateVpaFundAccountCommand command);

    ValidationResult validateFundAccount(ValidateFundAccountCommand command);

    ValidationResult fetchValidation(String providerValidationId);

    PayoutResult createPayout(CreatePayoutCommand command);

    PayoutResult fetchPayout(String providerPayoutId);

    PayoutResult cancelPayout(String providerPayoutId);
}
