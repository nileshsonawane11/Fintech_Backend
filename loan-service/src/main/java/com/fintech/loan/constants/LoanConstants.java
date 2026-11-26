package com.fintech.loan.constants;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Centralized constants for FinBank Loan Service:
 * Eureka service IDs, inter-service API paths, Kafka topics, headers, statuses, roles, and financial defaults.
 */
public final class LoanConstants {

    private LoanConstants() {
    }

    // =====================================================================
    // Service Discovery IDs
    // =====================================================================
    public static final String SERVICE_CUSTOMER = "CUSTOMER-SERVICE";
    public static final String SERVICE_ACCOUNT = "ACCOUNT-SERVICE";
    public static final String SERVICE_IDENTITY = "IDENTITY-SERVICE";
    public static final String SERVICE_NOTIFICATION = "NOTIFICATION-SERVICE";
    public static final String SERVICE_LEDGER = "LEDGER-TRANSACTION-SERVICE";
    public static final String SERVICE_PAYMENT = "PAYMENT-SERVICE";

    // =====================================================================
    // Internal & Inter-Service API Paths
    // =====================================================================
    public static final String PATH_CUSTOMER_ME = "/api/v1/customers/me";
    public static final String PATH_CUSTOMER_BY_IDENTITY = "/api/v1/customers/by-identity/{identitySubject}";
    public static final String PATH_CUSTOMER_ME_KYC = "/api/v1/customers/me/kyc";
    public static final String PATH_CUSTOMER_ME_KYC_DOCUMENTS = "/api/v1/customers/me/kyc/documents";
    public static final String PATH_INTERNAL_ACCOUNT_BY_ID = "/internal/api/v1/accounts/{accountId}";
    public static final String PATH_INTERNAL_ACCOUNT_HOLDS = "/internal/api/v1/accounts/{accountId}/holds";
    public static final String PATH_INTERNAL_CUSTOMER_ACCOUNTS = "/internal/api/v1/accounts/customer/{identitySubject}";
    public static final String PATH_INTERNAL_NOTIFICATIONS = "/internal/api/v1/notifications";
    public static final String PATH_INTERNAL_LEDGER_BALANCE = "/internal/api/v1/ledger/accounts/{accountId}/balance";
    public static final String PATH_INTERNAL_LEDGER_POSTINGS_BATCH = "/internal/api/v1/ledger/postings/batch";
    public static final String PATH_INTERNAL_LEDGER_TX = "/internal/api/v1/ledger/transactions/{transactionId}";
    public static final String PATH_INTERNAL_LEDGER_REVERSE = "/internal/api/v1/ledger/transactions/{transactionId}/reverse";
    public static final String PATH_INTERNAL_PAYMENT_COLLECTIONS = "/internal/api/v1/payments/collections";
    public static final String PATH_INTERNAL_PAYMENT_COLLECTION_STATUS = "/internal/api/v1/payments/collections/{collectionReference}/status";
    public static final String PATH_INTERNAL_PAYMENT_COLLECTION_REFUND = "/internal/api/v1/payments/collections/{collectionReference}/refund";
    public static final String PATH_INTERNAL_PAYMENT_MANDATES = "/internal/api/v1/payments/mandates";
    public static final String PATH_INTERNAL_PAYMENT_MANDATE_ACTION = "/internal/api/v1/payments/mandates/{providerReference}/{action}";
    public static final String PATH_INTERNAL_PAYMENT_MANDATE_STATUS = "/internal/api/v1/payments/mandates/{providerReference}/status";

    // =====================================================================
    // Loan General Ledger System Accounts (INR)
    // =====================================================================
    public static final String LEDGER_LOAN_PRINCIPAL_INR = "SYSTEM-LOAN-PRINCIPAL-INR";
    public static final String LEDGER_LOAN_INTEREST_INR = "SYSTEM-LOAN-INTEREST-INR";
    public static final String LEDGER_LOAN_PENALTY_INR = "SYSTEM-LOAN-PENALTY-INR";
    public static final String LEDGER_SYSTEM_SETTLEMENT_INR = "SYSTEM-SETTLEMENT-INR";

    // =====================================================================
    // HTTP Headers & MDC Keys
    // =====================================================================
    public static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_INTERNAL_SERVICE_SECRET = "X-Internal-Service-Secret";
    public static final String MDC_CORRELATION_ID = "correlationId";

    // =====================================================================
    // Security Claims, Roles & Token Types
    // =====================================================================
    public static final String CLAIM_TOKEN_USE = "token_use";
    public static final String TOKEN_USE_ACCESS = "ACCESS";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_PERMISSIONS = "permissions";
    public static final String ROLE_PREFIX = "ROLE_";

    public static final String ROLE_CUSTOMER = "CUSTOMER";
    public static final String ROLE_LOAN_OFFICER = "LOAN_OFFICER";
    public static final String ROLE_LOAN_MANAGER = "LOAN_MANAGER";
    public static final String ROLE_OPERATIONS = "OPERATIONS";
    public static final String ROLE_MANAGER = "MANAGER";
    public static final String ROLE_ADMIN = "ADMIN";

    // =====================================================================
    // Kafka Topics, Consumer Groups & Event Names
    // =====================================================================
    public static final String TOPIC_APPLICATION_SUBMITTED = "loan.application.submitted.v1";
    public static final String TOPIC_APPLICATION_STATUS_CHANGED = "loan.application.status-changed.v1";
    public static final String TOPIC_APPLICATION_APPROVED = "loan.application.approved.v1";
    public static final String TOPIC_APPLICATION_REJECTED = "loan.application.rejected.v1";
    public static final String TOPIC_APPLICATION_DISBURSED = "loan.application.disbursed.v1";
    public static final String TOPIC_OFFER_CREATED = "loan.offer.created.v1";
    public static final String TOPIC_OFFER_UPDATED = "loan.offer.updated.v1";
    public static final String TOPIC_OFFER_ACTIVATED = "loan.offer.activated.v1";
    public static final String TOPIC_OFFER_DEACTIVATED = "loan.offer.deactivated.v1";
    public static final String TOPIC_PRODUCT_CREATED = "loan.product.created.v1";
    public static final String TOPIC_PRODUCT_UPDATED = "loan.product.updated.v1";
    public static final String TOPIC_NOTIFICATION_EVENTS = "loan.notification.events.v1";
    public static final String TOPIC_ACCOUNT_LIFECYCLE = "account.lifecycle-events.v1";
    public static final String TOPIC_LOAN_DISBURSED = "loan.disbursed.v1";
    public static final String TOPIC_REPAYMENT_SCHEDULE_GENERATED = "loan.repayment-schedule-generated.v1";
    public static final String TOPIC_INSTALLMENT_DUE = "loan.installment-due.v1";
    public static final String TOPIC_REPAYMENT_INITIATED = "loan.repayment-initiated.v1";
    public static final String TOPIC_REPAYMENT_COMPLETED = "loan.repayment-completed.v1";
    public static final String TOPIC_REPAYMENT_FAILED = "loan.repayment-failed.v1";
    public static final String TOPIC_REPAYMENT_ALLOCATED = "loan.repayment-allocated.v1";
    public static final String TOPIC_MANDATE_ACTIVATED = "loan.mandate-activated.v1";
    public static final String TOPIC_INSTALLMENT_OVERDUE = "loan.installment-overdue.v1";
    public static final String TOPIC_PREPAYMENT_COMPLETED = "loan.prepayment-completed.v1";
    public static final String TOPIC_LOAN_CLOSED = "loan.closed.v1";

    public static final String CONSUMER_GROUP_LOAN = "loan-service-group";
    public static final String EVENT_SCHEMA_VERSION = "1.0";

    public static final String EVT_APPLICATION_SUBMITTED = "LoanApplicationSubmitted";
    public static final String EVT_APPLICATION_STATUS_CHANGED = "LoanApplicationStatusChanged";
    public static final String EVT_APPLICATION_APPROVED = "LoanApplicationApproved";
    public static final String EVT_APPLICATION_REJECTED = "LoanApplicationRejected";
    public static final String EVT_APPLICATION_DISBURSED = "LoanApplicationDisbursed";
    public static final String EVT_OFFER_CREATED = "LoanOfferCreated";
    public static final String EVT_OFFER_UPDATED = "LoanOfferUpdated";
    public static final String EVT_OFFER_ACTIVATED = "LoanOfferActivated";
    public static final String EVT_OFFER_DEACTIVATED = "LoanOfferDeactivated";
    public static final String EVT_PRODUCT_CREATED = "LoanProductCreated";
    public static final String EVT_PRODUCT_UPDATED = "LoanProductUpdated";
    public static final String EVT_NOTIFICATION_REQUESTED = "LoanNotificationRequested";

    // =====================================================================
    // Cross-Service Verification Constants
    // =====================================================================
    public static final Set<String> VERIFIED_KYC_STATUSES = Set.of("APPROVED", "VERIFIED");
    public static final Set<String> DISBURSEMENT_ELIGIBLE_ACCOUNT_TYPES = Set.of("SAVINGS", "CURRENT", "SALARY");
    public static final String ACCOUNT_STATUS_ACTIVE = "ACTIVE";
    public static final String DEFAULT_CURRENCY = "INR";

    // =====================================================================
    // Financial Calculation & Operational Defaults
    // =====================================================================
    public static final BigDecimal HUNDRED = new BigDecimal("100");
    public static final BigDecimal TWELVE_HUNDRED = new BigDecimal("1200");
    public static final BigDecimal DEFAULT_MAX_FOIR_PERCENTAGE = new BigDecimal("55.00");
    public static final BigDecimal DEFAULT_MANAGER_APPROVAL_LIMIT = new BigDecimal("10000000.00");
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_OUTBOX_BATCH_SIZE = 50;
    public static final int DEFAULT_OUTBOX_MAX_RETRIES = 5;
    public static final int DEFAULT_OFFER_EXPIRY_DAYS = 15;
}
