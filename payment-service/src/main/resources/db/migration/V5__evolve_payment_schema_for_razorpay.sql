-- ====================================================================
-- V5: Evolve Payment Service Schema for Razorpay Smart Collect 2.0 & RazorpayX Payouts
-- ====================================================================

-- 1. Evolve beneficiaries table for Bank + UPI, deterministic duplicate hashes,
--    RazorpayX contact/fund_account/validation references, and lifecycle tracking
ALTER TABLE beneficiaries ALTER COLUMN account_number DROP NOT NULL;
ALTER TABLE beneficiaries ALTER COLUMN ifsc_code DROP NOT NULL;
ALTER TABLE beneficiaries ALTER COLUMN bank_name DROP NOT NULL;

ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS beneficiary_type VARCHAR(20) NOT NULL DEFAULT 'BANK_ACCOUNT';
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS account_number_hash VARCHAR(64);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS vpa_encrypted VARCHAR(256);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS vpa_masked VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS vpa_hash VARCHAR(64);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS account_type VARCHAR(30);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS relationship VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS validated_account_name VARCHAR(200);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS name_match_score NUMERIC(5,4);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS validation_provider_ref VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS validation_reason VARCHAR(255);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS provider_contact_id VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS provider_fund_account_id VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_status ON beneficiaries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_acct_hash ON beneficiaries(user_id, account_number_hash, ifsc_code);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_vpa_hash ON beneficiaries(user_id, vpa_hash);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_fund_acct ON beneficiaries(provider_fund_account_id);

-- 2. Evolve payments table (outgoing transfers) for fees, ledger linkage, RazorpayX payout tracking & reconciliation
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(30) NOT NULL DEFAULT 'BANK_ACCOUNT';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_name VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payout_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_fund_account_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_utr VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_debit_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ledger_transaction_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ledger_settlement_tx_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ledger_reversal_tx_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE payments ALTER COLUMN rail_reference TYPE VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_payments_provider_payout ON payments(provider_payout_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_idemp ON payments(idempotency_key);

-- 3. Evolve payment_idempotency_keys for payload hash & cached response replay across operations
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS operation VARCHAR(50) NOT NULL DEFAULT 'OUTGOING_TRANSFER';
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS response_status INTEGER;
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS response_body TEXT;
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE payment_idempotency_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payment_idemp_status ON payment_idempotency_keys(idempotency_key, processing_status);

-- 4. Evolve webhook_events for multi-event Razorpay lifecycle tracking (allow multiple events per payout/payment)
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_rail_reference_key;
ALTER TABLE webhook_events ALTER COLUMN rail_reference DROP NOT NULL;
ALTER TABLE webhook_events ALTER COLUMN rail_reference TYPE VARCHAR(100);
ALTER TABLE webhook_events ALTER COLUMN payment_reference TYPE VARCHAR(100);

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_id VARCHAR(120);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_json TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED';
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error_message VARCHAR(500);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_entity ON webhook_events(entity_id, event_type);

-- 5. Payment Customers (maps FinBank customer/user to Razorpay customer & RazorpayX contact)
CREATE TABLE IF NOT EXISTS payment_customers (
    id                      VARCHAR(36)  PRIMARY KEY,
    user_id                 VARCHAR(100) NOT NULL UNIQUE,
    customer_id             VARCHAR(100) NOT NULL UNIQUE,
    full_name               VARCHAR(200) NOT NULL,
    email                   VARCHAR(200),
    phone_masked            VARCHAR(40),
    razorpay_customer_id    VARCHAR(100) UNIQUE,
    razorpayx_contact_id    VARCHAR(100) UNIQUE,
    kyc_status              VARCHAR(30)  NOT NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version                 BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_customers_rzp ON payment_customers(razorpay_customer_id);

-- 6. Incoming Payment Receivers (Razorpay Smart Collect 2.0 Virtual Accounts & VPAs)
CREATE TABLE IF NOT EXISTS incoming_payment_receivers (
    id                      VARCHAR(36)  PRIMARY KEY,
    receiver_id             VARCHAR(50)  NOT NULL UNIQUE,
    user_id                 VARCHAR(100) NOT NULL,
    customer_id             VARCHAR(100) NOT NULL,
    finbank_account_id      VARCHAR(50)  NOT NULL,
    provider_name           VARCHAR(50)  NOT NULL,
    provider_customer_id    VARCHAR(100),
    provider_va_id          VARCHAR(100) NOT NULL UNIQUE,
    va_status               VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    virtual_account_number  VARCHAR(100),
    virtual_ifsc            VARCHAR(30),
    virtual_bank_name       VARCHAR(200),
    virtual_account_name    VARCHAR(200),
    virtual_vpa             VARCHAR(150),
    description             VARCHAR(255),
    close_by                TIMESTAMPTZ,
    closed_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version                 BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_incoming_receivers_user ON incoming_payment_receivers(user_id, va_status);
CREATE INDEX IF NOT EXISTS idx_incoming_receivers_account ON incoming_payment_receivers(finbank_account_id, va_status);

-- 7. Incoming Payments (Collections received via Smart Collect virtual bank/UPI channels)
CREATE TABLE IF NOT EXISTS incoming_payments (
    id                      VARCHAR(36)    PRIMARY KEY,
    incoming_payment_id     VARCHAR(50)    NOT NULL UNIQUE,
    receiver_id             VARCHAR(50),
    user_id                 VARCHAR(100)   NOT NULL,
    customer_id             VARCHAR(100),
    finbank_account_id      VARCHAR(50)    NOT NULL,
    provider_name           VARCHAR(50)    NOT NULL,
    provider_payment_id     VARCHAR(100)   NOT NULL UNIQUE,
    provider_va_id          VARCHAR(100)   NOT NULL,
    channel                 VARCHAR(30)    NOT NULL,
    amount                  NUMERIC(19,4)  NOT NULL,
    fee_amount              NUMERIC(19,4)  NOT NULL DEFAULT 0.0000,
    net_credit_amount       NUMERIC(19,4)  NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'INR',
    payer_name              VARCHAR(200),
    payer_vpa_masked        VARCHAR(150),
    payer_bank              VARCHAR(100),
    utr                     VARCHAR(100),
    status                  VARCHAR(30)    NOT NULL,
    settlement_eligible     BOOLEAN        NOT NULL DEFAULT FALSE,
    ledger_transaction_id   VARCHAR(100),
    refund_id               VARCHAR(100),
    refund_amount           NUMERIC(19,4),
    ledger_refund_tx_id     VARCHAR(100),
    failure_reason          VARCHAR(500),
    received_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    verified_at             TIMESTAMPTZ,
    credited_at             TIMESTAMPTZ,
    refunded_at             TIMESTAMPTZ,
    reconciled_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version                 BIGINT         NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_incoming_payments_user ON incoming_payments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_incoming_payments_va ON incoming_payments(provider_va_id);
CREATE INDEX IF NOT EXISTS idx_incoming_payments_status ON incoming_payments(status);

-- 8. Beneficiary Validations (RazorpayX Fund Account Validation audit & status)
CREATE TABLE IF NOT EXISTS beneficiary_validations (
    id                          VARCHAR(36)   PRIMARY KEY,
    validation_id               VARCHAR(50)   NOT NULL UNIQUE,
    beneficiary_id              VARCHAR(50)   NOT NULL,
    user_id                     VARCHAR(100)  NOT NULL,
    provider_name               VARCHAR(50)   NOT NULL,
    provider_contact_id         VARCHAR(100),
    provider_fund_account_id    VARCHAR(100),
    provider_validation_id      VARCHAR(100)  UNIQUE,
    validation_mode             VARCHAR(30)   NOT NULL,
    amount                      NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    currency                    VARCHAR(3)    NOT NULL DEFAULT 'INR',
    status                      VARCHAR(30)   NOT NULL,
    provider_account_status     VARCHAR(50),
    registered_name             VARCHAR(200),
    name_match_score            NUMERIC(5,4),
    utr                         VARCHAR(100),
    failure_source              VARCHAR(50),
    failure_reason              VARCHAR(100),
    failure_description         VARCHAR(500),
    initiated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ben_validations_ben ON beneficiary_validations(beneficiary_id, created_at);

-- 9. Provider Contacts & Fund Accounts
CREATE TABLE IF NOT EXISTS provider_contacts (
    id                      VARCHAR(36)  PRIMARY KEY,
    provider_name           VARCHAR(50)  NOT NULL,
    owner_type              VARCHAR(30)  NOT NULL,
    owner_ref               VARCHAR(100) NOT NULL,
    provider_contact_id     VARCHAR(100) NOT NULL UNIQUE,
    contact_type            VARCHAR(30)  NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    email                   VARCHAR(200),
    phone_masked            VARCHAR(40),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_contacts_owner ON provider_contacts(provider_name, owner_type, owner_ref);

CREATE TABLE IF NOT EXISTS provider_fund_accounts (
    id                          VARCHAR(36)  PRIMARY KEY,
    provider_name               VARCHAR(50)  NOT NULL,
    beneficiary_id              VARCHAR(50)  NOT NULL,
    provider_contact_id         VARCHAR(100) NOT NULL,
    provider_fund_account_id    VARCHAR(100) NOT NULL UNIQUE,
    account_type                VARCHAR(30)  NOT NULL,
    active                      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_fund_accts_ben ON provider_fund_accounts(provider_name, beneficiary_id);

-- 10. Payment Fees & Limits Configurations
CREATE TABLE IF NOT EXISTS payment_fee_configs (
    id              VARCHAR(36)    PRIMARY KEY,
    transfer_mode   VARCHAR(30)    NOT NULL UNIQUE,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'INR',
    flat_fee        NUMERIC(19,4)  NOT NULL DEFAULT 0.0000,
    percent_fee     NUMERIC(7,4)   NOT NULL DEFAULT 0.0000,
    tax_percent     NUMERIC(7,4)   NOT NULL DEFAULT 18.0000,
    min_fee         NUMERIC(19,4)  NOT NULL DEFAULT 0.0000,
    max_fee         NUMERIC(19,4)  NOT NULL DEFAULT 0.0000,
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_limit_configs (
    id              VARCHAR(36)    PRIMARY KEY,
    transfer_mode   VARCHAR(30)    NOT NULL UNIQUE,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'INR',
    min_amount      NUMERIC(19,4)  NOT NULL,
    max_per_txn     NUMERIC(19,4)  NOT NULL,
    daily_limit     NUMERIC(19,4)  NOT NULL,
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 11. Reconciliation Records
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id                  VARCHAR(36)    PRIMARY KEY,
    reconciliation_id   VARCHAR(50)    NOT NULL UNIQUE,
    run_id              VARCHAR(50)    NOT NULL,
    target_type         VARCHAR(30)    NOT NULL,
    target_id           VARCHAR(100)   NOT NULL,
    provider_ref        VARCHAR(100),
    internal_status     VARCHAR(50)    NOT NULL,
    provider_status     VARCHAR(50),
    expected_amount     NUMERIC(19,4)  NOT NULL,
    provider_amount     NUMERIC(19,4),
    discrepancy_type    VARCHAR(50)    NOT NULL,
    resolution_status   VARCHAR(30)    NOT NULL DEFAULT 'OPEN',
    notes               VARCHAR(500),
    resolved_by         VARCHAR(100),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_run ON reconciliation_records(run_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON reconciliation_records(resolution_status, created_at);

-- 12. Payment Audit Logs
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id              VARCHAR(36)  PRIMARY KEY,
    actor_id        VARCHAR(100) NOT NULL,
    actor_role      VARCHAR(50)  NOT NULL,
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50)  NOT NULL,
    resource_id     VARCHAR(100) NOT NULL,
    correlation_id  VARCHAR(100),
    details         VARCHAR(1000),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_resource ON payment_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON payment_audit_logs(created_at);

-- 13. Transactional Outbox & Idempotent Inbox Events
CREATE TABLE IF NOT EXISTS payment_outbox_events (
    event_id            VARCHAR(36)  PRIMARY KEY,
    aggregate_id        VARCHAR(100) NOT NULL,
    aggregate_type      VARCHAR(100) NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    topic               VARCHAR(150) NOT NULL,
    payload             TEXT         NOT NULL,
    correlation_id      VARCHAR(100),
    publishing_status   VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    retry_count         INTEGER      NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_error          VARCHAR(500),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_outbox_pending ON payment_outbox_events(publishing_status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS payment_inbox_events (
    event_id        VARCHAR(100) PRIMARY KEY,
    topic           VARCHAR(150) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    consumer_group  VARCHAR(100) NOT NULL,
    payload         TEXT         NOT NULL,
    status          VARCHAR(30)  NOT NULL,
    error_message   VARCHAR(500),
    received_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);
