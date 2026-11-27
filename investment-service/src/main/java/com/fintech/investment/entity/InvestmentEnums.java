package com.fintech.investment.entity;

public final class InvestmentEnums {

    private InvestmentEnums() {}

    public enum ProductType {
        FD, RD, SIP, SSY
    }

    public enum ProductStatus {
        DRAFT, ACTIVE, INACTIVE, ARCHIVED
    }

    public enum ApplicationStatus {
        SUBMITTED,
        DOCUMENT_VERIFICATION,
        UNDER_REVIEW,
        APPROVED,
        BOOKED,
        REJECTED,
        CANCELLED
    }

    public enum InvestmentStatus {
        ACTIVE,
        PAUSED,
        MATURED,
        PREMATURE_CLOSED,
        CANCELLED,
        CLOSED
    }

    public enum InstallmentStatus {
        PENDING,
        PAID,
        FAILED,
        SKIPPED,
        RETRY_SCHEDULED
    }

    public enum TransactionType {
        BOOKING_DEBIT,
        INSTALLMENT_DEBIT,
        MATURITY_PAYOUT,
        PREMATURE_PAYOUT,
        PARTIAL_WITHDRAWAL,
        INTEREST_PAYOUT,
        PENALTY_CHARGE,
        REVERSAL
    }

    public enum TransactionDirection {
        DEBIT, CREDIT
    }

    public enum TransactionStatus {
        INITIATED, COMPLETED, FAILED, REVERSED
    }

    public enum WithdrawalRequestType {
        PREMATURE_CLOSURE,
        PARTIAL_WITHDRAWAL,
        MATURITY_PAYOUT
    }

    public enum WithdrawalStatus {
        REQUESTED,
        UNDER_REVIEW,
        PROCESSED,
        REJECTED,
        FAILED
    }

    public enum SipFundCategory {
        LARGE_CAP_EQUITY,
        FLEXI_CAP_EQUITY,
        HYBRID,
        ELSS,
        LIQUID_OVERNIGHT_DEBT
    }

    public enum OutboxStatus {
        PENDING, PUBLISHED, FAILED
    }

    public enum InvestmentDocumentType {
        PAN_CARD,
        AADHAAR_OVD,
        GIRL_CHILD_BIRTH_CERTIFICATE,
        GUARDIANSHIP_PROOF,
        RELATIONSHIP_PROOF,
        FUNDING_ACCOUNT_PROOF,
        NOMINEE_ID_PROOF,
        RISK_SUITABILITY_FORM,
        OTHER
    }
}
