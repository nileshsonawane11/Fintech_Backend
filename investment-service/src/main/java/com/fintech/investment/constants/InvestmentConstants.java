package com.fintech.investment.constants;

public final class InvestmentConstants {

    private InvestmentConstants() {}

    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
    public static final String HEADER_INTERNAL_SECRET = "X-Internal-Service-Secret";
    public static final String HEADER_EVENT_ID = "X-Event-Id";
    public static final String HEADER_EVENT_TYPE = "X-Event-Type";
    public static final String MDC_CORRELATION_ID = "correlationId";

    public static final String SERVICE_CUSTOMER = "CUSTOMER-SERVICE";
    public static final String SERVICE_ACCOUNT = "ACCOUNT-SERVICE";
    public static final String SERVICE_LEDGER = "LEDGER-TRANSACTION-SERVICE";
    public static final String SERVICE_PAYMENT = "PAYMENT-SERVICE";
    public static final String SERVICE_NOTIFICATION = "NOTIFICATION-SERVICE";

    public static final String TOPIC_NOTIFICATION_EVENTS = "notification.events.v1";
    public static final String TOPIC_INVESTMENT_LIFECYCLE = "investment.lifecycle-events.v1";
    public static final String TOPIC_ACCOUNT_LIFECYCLE = "account.lifecycle-events.v1";

    public static final String PATH_INTERNAL_ACCOUNT = "/internal/api/v1/accounts/{accountId}";
    public static final String PATH_INTERNAL_LEDGER_BALANCE = "/internal/api/v1/ledger/accounts/{accountId}/balance";
    public static final String PATH_INTERNAL_LEDGER_POSTINGS_BATCH = "/internal/api/v1/ledger/postings/batch";
    public static final String PATH_INTERNAL_LEDGER_REVERSAL = "/internal/api/v1/ledger/transactions/{transactionId}/reverse";
    public static final String PATH_INTERNAL_PAYMENT_COLLECTIONS = "/internal/api/v1/payments/collections";
    public static final String PATH_INTERNAL_PAYMENT_MANDATES = "/internal/api/v1/payments/mandates";

    public static final String CURRENCY_INR = "INR";
    public static final String EVENT_VERSION_1 = "1.0";
    public static final String SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT = "SYSTEM-SETTLEMENT-INVESTMENT";
}
