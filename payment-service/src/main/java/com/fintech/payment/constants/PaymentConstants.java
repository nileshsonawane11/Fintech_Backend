package com.fintech.payment.constants;

/**
 * Centralized constants for FinBank Payment Service:
 * service IDs, internal paths, Razorpay API paths, Kafka topics/events, headers, statuses, and defaults.
 */
public final class PaymentConstants {

    private PaymentConstants() {
    }

    // =====================================================================
    // Service Discovery IDs
    // =====================================================================
    public static final String SERVICE_IDENTITY = "IDENTITY-SERVICE";
    public static final String SERVICE_CUSTOMER = "CUSTOMER-SERVICE";
    public static final String SERVICE_ACCOUNT = "ACCOUNT-SERVICE";
    public static final String SERVICE_LEDGER = "LEDGER-TRANSACTION-SERVICE";
    public static final String SERVICE_PAYMENT = "PAYMENT-SERVICE";

    // =====================================================================
    // Internal Microservice API Paths
    // =====================================================================
    public static final String PATH_CUSTOMER_ME = "/api/v1/customers/me";
    public static final String PATH_CUSTOMER_BY_IDENTITY = "/api/v1/customers/by-identity/{identitySubject}";
    public static final String PATH_INTERNAL_ACCOUNT_BY_ID = "/internal/api/v1/accounts/{accountId}";
    public static final String PATH_INTERNAL_ACCOUNT_HOLDS = "/internal/api/v1/accounts/{accountId}/holds";
    public static final String PATH_INTERNAL_LEDGER_BALANCE = "/internal/api/v1/ledger/accounts/{accountId}/balance";
    public static final String PATH_INTERNAL_LEDGER_POSTINGS = "/internal/api/v1/ledger/postings";
    public static final String PATH_INTERNAL_LEDGER_POSTINGS_BATCH = "/internal/api/v1/ledger/postings/batch";
    public static final String PATH_INTERNAL_LEDGER_TX = "/internal/api/v1/ledger/transactions/{transactionId}";
    public static final String PATH_INTERNAL_LEDGER_REVERSE = "/internal/api/v1/ledger/transactions/{transactionId}/reverse";

    // =====================================================================
    // Ledger System Accounts (INR)
    // =====================================================================
    public static final String LEDGER_SYSTEM_SETTLEMENT_INR = "SYSTEM-SETTLEMENT-INR";
    public static final String LEDGER_SYSTEM_CLEARING_INR = "SYSTEM-CLEARING-INR";
    public static final String LEDGER_SYSTEM_FEE_INR = "SYSTEM-FEE-INR";
    public static final String LEDGER_SYSTEM_SUSPENSE_INR = "SYSTEM-SUSPENSE-INR";

    // =====================================================================
    // Razorpay API Paths
    // =====================================================================
    public static final String RZP_CUSTOMERS = "/customers";
    public static final String RZP_VIRTUAL_ACCOUNTS = "/virtual_accounts";
    public static final String RZP_VIRTUAL_ACCOUNT_BY_ID = "/virtual_accounts/{id}";
    public static final String RZP_VIRTUAL_ACCOUNT_PAYMENTS = "/virtual_accounts/{id}/payments";
    public static final String RZP_VIRTUAL_ACCOUNT_CLOSE = "/virtual_accounts/{id}/close";
    public static final String RZP_PAYMENT_BY_ID = "/payments/{id}";
    public static final String RZP_PAYMENT_REFUND = "/payments/{id}/refund";

    public static final String RZP_CONTACTS = "/contacts";
    public static final String RZP_FUND_ACCOUNTS = "/fund_accounts";
    public static final String RZP_FUND_ACCOUNT_VALIDATIONS = "/fund_accounts/validations";
    public static final String RZP_FUND_ACCOUNT_VALIDATION_BY_ID = "/fund_accounts/validations/{id}";
    public static final String RZP_PAYOUTS = "/payouts";
    public static final String RZP_PAYOUT_BY_ID = "/payouts/{id}";
    public static final String RZP_PAYOUT_CANCEL = "/payouts/{id}/cancel";

    // =====================================================================
    // Provider Identifiers
    // =====================================================================
    public static final String PROVIDER_RAZORPAY_SMART_COLLECT = "RAZORPAY_SMART_COLLECT";
    public static final String PROVIDER_RAZORPAYX = "RAZORPAYX";

    // =====================================================================
    // HTTP Headers & MDC Keys
    // =====================================================================
    public static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_INTERNAL_SERVICE_SECRET = "X-Internal-Service-Secret";
    public static final String HEADER_RAZORPAY_SIGNATURE = "X-Razorpay-Signature";
    public static final String HEADER_RAZORPAY_EVENT_ID = "X-Razorpay-Event-Id";
    public static final String HEADER_PAYOUT_IDEMPOTENCY = "X-Payout-Idempotency";
    public static final String HEADER_LEGACY_SIGNATURE = "X-Signature";
    public static final String HEADER_LEGACY_TIMESTAMP = "X-Timestamp";
    public static final String MDC_CORRELATION_ID = "correlationId";

    // =====================================================================
    // Razorpay Webhook Event Names
    // =====================================================================
    public static final String RZP_EVENT_VA_CREATED = "virtual_account.created";
    public static final String RZP_EVENT_VA_CREDITED = "virtual_account.credited";
    public static final String RZP_EVENT_VA_CLOSED = "virtual_account.closed";
    public static final String RZP_EVENT_PAYMENT_CAPTURED = "payment.captured";
    public static final String RZP_EVENT_PAYMENT_FAILED = "payment.failed";
    public static final String RZP_EVENT_REFUND_PROCESSED = "refund.processed";
    public static final String RZP_EVENT_REFUND_FAILED = "refund.failed";
    public static final String RZP_EVENT_PAYOUT_QUEUED = "payout.queued";
    public static final String RZP_EVENT_PAYOUT_PENDING = "payout.pending";
    public static final String RZP_EVENT_PAYOUT_INITIATED = "payout.initiated";
    public static final String RZP_EVENT_PAYOUT_PROCESSED = "payout.processed";
    public static final String RZP_EVENT_PAYOUT_UPDATED = "payout.updated";
    public static final String RZP_EVENT_PAYOUT_FAILED = "payout.failed";
    public static final String RZP_EVENT_PAYOUT_REVERSED = "payout.reversed";
    public static final String RZP_EVENT_PAYOUT_REJECTED = "payout.rejected";
    public static final String RZP_EVENT_VALIDATION_COMPLETED = "fund_account.validation.completed";
    public static final String RZP_EVENT_VALIDATION_FAILED = "fund_account.validation.failed";

    // =====================================================================
    // Kafka Topics, Consumer Groups & Event Types
    // =====================================================================
    public static final String TOPIC_INCOMING_EVENTS = "payment.incoming-events.v1";
    public static final String TOPIC_TRANSFER_EVENTS = "payment.transfer-events.v1";
    public static final String TOPIC_BENEFICIARY_EVENTS = "payment.beneficiary-events.v1";
    public static final String TOPIC_RECONCILIATION_EVENTS = "payment.reconciliation-events.v1";
    public static final String TOPIC_ACCOUNT_LIFECYCLE = "account.lifecycle-events.v1";
    public static final String CONSUMER_GROUP_PAYMENT = "payment-service-group";
    public static final String EVENT_SCHEMA_VERSION = "1.0";

    // Incoming Payment Events
    public static final String EVT_INCOMING_PAYMENT_INITIATED = "IncomingPaymentInitiated";
    public static final String EVT_INCOMING_PAYMENT_RECEIVED = "IncomingPaymentReceived";
    public static final String EVT_INCOMING_PAYMENT_VERIFIED = "IncomingPaymentVerified";
    public static final String EVT_INCOMING_PAYMENT_CREDITED = "IncomingPaymentCredited";
    public static final String EVT_INCOMING_PAYMENT_FAILED = "IncomingPaymentFailed";
    public static final String EVT_INCOMING_PAYMENT_REFUNDED = "IncomingPaymentRefunded";

    // Outgoing Transfer Events
    public static final String EVT_TRANSFER_INITIATED = "TransferInitiated";
    public static final String EVT_TRANSFER_SUBMITTED = "TransferSubmitted";
    public static final String EVT_TRANSFER_PROCESSING = "TransferProcessing";
    public static final String EVT_TRANSFER_COMPLETED = "TransferCompleted";
    public static final String EVT_TRANSFER_FAILED = "TransferFailed";
    public static final String EVT_TRANSFER_REVERSED = "TransferReversed";

    // Beneficiary Events
    public static final String EVT_BENEFICIARY_CREATED = "BeneficiaryCreated";
    public static final String EVT_BENEFICIARY_VALIDATION_INITIATED = "BeneficiaryValidationInitiated";
    public static final String EVT_BENEFICIARY_VERIFIED = "BeneficiaryVerified";
    public static final String EVT_BENEFICIARY_VALIDATION_FAILED = "BeneficiaryValidationFailed";
    public static final String EVT_BENEFICIARY_DEACTIVATED = "BeneficiaryDeactivated";

    // Reconciliation Events
    public static final String EVT_RECONCILIATION_STARTED = "ReconciliationStarted";
    public static final String EVT_RECONCILIATION_COMPLETED = "ReconciliationCompleted";
    public static final String EVT_RECONCILIATION_MISMATCH_DETECTED = "ReconciliationMismatchDetected";

    // =====================================================================
    // Currency, KYC, Account & Operational Defaults
    // =====================================================================
    public static final String DEFAULT_CURRENCY = "INR";
    public static final String KYC_STATUS_APPROVED = "APPROVED";
    public static final String ACCOUNT_STATUS_ACTIVE = "ACTIVE";

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_OUTBOX_BATCH_SIZE = 50;
    public static final int DEFAULT_OUTBOX_MAX_RETRIES = 5;
    public static final long DEFAULT_IDEMPOTENCY_TTL_HOURS = 24L;
    public static final long MAX_WEBHOOK_PAYLOAD_BYTES = 256 * 1024L;

    // =====================================================================
    // Configuration Property Prefix Keys
    // =====================================================================
    public static final String PROP_PREFIX_RAZORPAY = "razorpay";
    public static final String PROP_PREFIX_PAYMENT = "payment";
    public static final String PROP_PREFIX_APP_SERVICES = "app.services";
}
