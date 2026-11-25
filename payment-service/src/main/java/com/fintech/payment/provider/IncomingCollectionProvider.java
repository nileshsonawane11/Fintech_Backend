package com.fintech.payment.provider;

import com.fintech.payment.provider.model.ProviderModels.*;

import java.util.List;

public interface IncomingCollectionProvider {

    String providerName();

    boolean isAvailable();

    ProviderCustomerResult createOrGetCustomer(ProviderCustomerRequest request);

    VirtualAccountResult createVirtualAccount(CreateVirtualAccountCommand command);

    VirtualAccountResult fetchVirtualAccount(String providerVaId);

    List<ProviderPaymentResult> fetchVirtualAccountPayments(String providerVaId);

    ProviderPaymentResult fetchPayment(String providerPaymentId);

    VirtualAccountResult closeVirtualAccount(String providerVaId);

    RefundPaymentResult refundPayment(RefundPaymentCommand command);
}
