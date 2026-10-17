package com.fintech.customer.model.kyc.state;

public enum KycStatus {
    SUBMITTED,
    UNDER_REVIEW,
    ON_HOLD,
    NEEDS_INFO,
    APPROVED,
    REJECTED,
    CANCELLED
}