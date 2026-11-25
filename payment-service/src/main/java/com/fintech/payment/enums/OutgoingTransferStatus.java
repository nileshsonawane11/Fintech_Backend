package com.fintech.payment.enums;

public enum OutgoingTransferStatus {
    INITIATED,
    DEBITED_PENDING_SUBMISSION,
    SUBMITTED,
    QUEUED,
    PROCESSING,
    COMPLETED,
    FAILED,
    REVERSED,
    UNKNOWN_PENDING_RECONCILIATION
}
