package com.fintech.payment.enums;

public enum PaymentPurpose {
    ACCOUNT_DEPOSIT(true),
    LOAN_REPAYMENT(true),
    INVESTMENT_PAYMENT(true),
    INTERNAL_TRANSFER(false),
    OTHER_SUPPORTED_PAYMENT(true);

    private final boolean externalRazorpaySupported;

    PaymentPurpose(boolean externalRazorpaySupported) {
        this.externalRazorpaySupported = externalRazorpaySupported;
    }

    public boolean isExternalRazorpaySupported() {
        return externalRazorpaySupported;
    }
}
