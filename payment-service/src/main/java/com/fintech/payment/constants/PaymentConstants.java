package com.fintech.payment.constants;

/**
 * Centralized constants for FinBank Payment Service:
 * service IDs, internal paths, Razorpay Orders API paths, Kafka topics/events, headers, and defaults.
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
    // Razorpay Orders & Payments API Paths
    // =====================================================================
    public static final String RZP_ORDERS = "/orders";
    public static final String RZP_ORDER_BY_ID = "/orders/{id}";
    public static final String RZP_ORDER_PAYMENTS = "/orders/{id}/payments";
    public static final String RZP_PAYMENT_BY_ID = "/payments/{id}";
    public static final String RZP_PAYMENT_CAPTURE = "/payments/{id}/capture";
    public static final String RZP_PAYMENT_REFUND = "/payments/{id}/refund";
    public static final String RZP_PAYMENT_REFUND_BY_ID = "/payments/{id}/refunds/{refundId}";

    public static final String PROVIDER_RAZORPAY = "RAZORPAY";

    // =====================================================================
    // HTTP Headers & MDC Keys
    // =====================================================================
    public static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_INTERNAL_SERVICE_SECRET = "X-Internal-Service-Secret";
    public static final String HEADER_RAZORPAY_SIGNATURE = "X-Razorpay-Signature";
    public static final String HEADER_RAZORPAY_EVENT_ID = "X-Razorpay-Event-Id";
    public static final String MDC_CORRELATION_ID = "correlationId";

    // =====================================================================
    // Razorpay Webhook Event Names
    // =====================================================================
    public static final String RZP_EVENT_PAYMENT_AUTHORIZED = "payment.authorized";
    public static final String RZP_EVENT_PAYMENT_CAPTURED = "payment.captured";
    public static final String RZP_EVENT_PAYMENT_FAILED = "payment.failed";
    public static final String RZP_EVENT_ORDER_PAID = "order.paid";
    public static final String RZP_EVENT_REFUND_CREATED = "refund.created";
    public static final String RZP_EVENT_REFUND_PROCESSED = "refund.processed";
    public static final String RZP_EVENT_REFUND_FAILED = "refund.failed";

    // =====================================================================
    // Kafka Topics, Consumer Groups & Event Types
    // =====================================================================
    public static final String TOPIC_INCOMING_EVENTS = "payment.incoming-events.v1";
    public static final String TOPIC_RECONCILIATION_EVENTS = "payment.reconciliation-events.v1";
    public static final String TOPIC_LEDGER_TRANSACTION_EVENTS = "ledger.transaction-events.v1";
    public static final String TOPIC_ACCOUNT_LIFECYCLE = "account.lifecycle-events.v1";
    public static final String TOPIC_NOTIFICATION_EVENTS = "notification.events.v1";
    public static final String CONSUMER_GROUP_PAYMENT = "payment-service-group";
    public static final String EVENT_SCHEMA_VERSION = "1.0";

    // Payment Order & Collection Domain Events
    public static final String EVT_PAYMENT_ORDER_CREATED = "PaymentOrderCreated";
    public static final String EVT_PAYMENT_AUTHORIZED = "PaymentAuthorized";
    public static final String EVT_PAYMENT_CAPTURED = "PaymentCaptured";
    public static final String EVT_PAYMENT_FAILED = "PaymentFailed";
    public static final String EVT_PAYMENT_REFUNDED = "PaymentRefunded";
    public static final String EVT_EXTERNAL_DEPOSIT_CONFIRMED = "ExternalAccountDepositConfirmed";
    public static final String EVT_LOAN_REPAYMENT_CONFIRMED = "LoanRepaymentPaymentConfirmed";
    public static final String EVT_INVESTMENT_PAYMENT_CONFIRMED = "InvestmentPaymentConfirmed";

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
    public static final String LIMIT_MODE_RAZORPAY_ORDER = "INCOMING";

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
