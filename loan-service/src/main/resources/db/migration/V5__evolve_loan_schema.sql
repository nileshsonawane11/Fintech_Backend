-- V5: Evolve Loan Service schema for full product catalog, fees, dynamic offers,
-- application lifecycle history, documents, repayment schedules, outbox and inbox.

-- 1. Evolve loan_products
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS id UUID;
UPDATE loan_products SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE loan_products ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_loan_products_id ON loan_products (id);

ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS short_description VARCHAR(500);
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS detailed_description TEXT;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS loan_category VARCHAR(50);
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS eligible_loan_purposes JSONB;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS employment_types JSONB;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS maximum_interest_rate NUMERIC(5,2);
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS maximum_ltv_percentage NUMERIC(5,2);
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS minimum_monthly_income NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS max_foir_percentage NUMERIC(5,2) NOT NULL DEFAULT 55.00;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS balance_transfer_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS top_up_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS step_up_emi_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS step_up_emi_duration_months INTEGER DEFAULT 0;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS required_documents JSONB;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS eligibility_rules JSONB;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS applicable_offers JSONB;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE loan_products
SET loan_category = CASE
        WHEN UPPER(loan_type) = 'HOME' THEN 'HOME'
        WHEN UPPER(loan_type) = 'BUSINESS' THEN 'BUSINESS'
        WHEN UPPER(loan_type) = 'AGRICULTURE' THEN 'AGRICULTURE'
        WHEN UPPER(loan_type) = 'VEHICLE' THEN 'VEHICLE'
        WHEN UPPER(loan_type) = 'GOLD' THEN 'GOLD'
        WHEN UPPER(loan_type) = 'LAP' THEN 'LAP'
        WHEN UPPER(loan_type) = 'EDUCATION' THEN 'EDUCATION'
        ELSE 'PERSONAL'
    END,
    maximum_interest_rate = COALESCE(maximum_interest_rate, interest_rate_from + 3.00),
    interest_type = CASE
        WHEN UPPER(interest_type) = 'REDUCING' THEN 'REDUCING_BALANCE'
        WHEN UPPER(interest_type) IN ('REDUCING_BALANCE', 'FLAT') THEN UPPER(interest_type)
        ELSE 'REDUCING_BALANCE'
    END,
    status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END
WHERE loan_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_loan_products_status_deleted ON loan_products (status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_loan_products_category ON loan_products (loan_category, status, is_deleted);

-- 2. Create loan_product_fees
CREATE TABLE IF NOT EXISTS loan_product_fees (
    id                                  UUID PRIMARY KEY,
    product_id                          UUID NOT NULL UNIQUE,
    processing_fee_type                 VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE',
    processing_fee_value                NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    minimum_processing_fee              NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    maximum_processing_fee              NUMERIC(15,2),
    prepayment_charge_percentage        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    prepayment_charges                  VARCHAR(255),
    foreclosure_charge_percentage       NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    foreclosure_charges                 VARCHAR(255),
    late_payment_penalty                NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    late_payment_penalty_description    VARCHAR(255),
    cheque_bounce_charges               NUMERIC(15,2) NOT NULL DEFAULT 400.00,
    additional_charges                  JSONB,
    created_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                             BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_loan_product_fees_product FOREIGN KEY (product_id) REFERENCES loan_products(id) ON DELETE CASCADE
);

-- 3. Evolve loan_applications
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS kyc_case_id VARCHAR(50);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS existing_monthly_emis NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursement_account_id VARCHAR(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursement_account_number VARCHAR(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS indicative_emi NUMERIC(15,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS calculated_foir NUMERIC(5,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS base_interest_rate NUMERIC(5,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS effective_interest_rate NUMERIC(5,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS processing_fee_amount NUMERIC(15,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS collateral_value NUMERIC(15,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ltv_percentage NUMERIC(5,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS additional_details JSONB;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS assigned_officer_id VARCHAR(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS assigned_officer_name VARCHAR(200);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(15,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_tenure_months INTEGER;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approved_interest_rate NUMERIC(5,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE loan_applications SET identity_subject = customer_id WHERE identity_subject IS NULL;

CREATE INDEX IF NOT EXISTS idx_loan_applications_identity_subject ON loan_applications (identity_subject);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications (status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_officer ON loan_applications (assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_product ON loan_applications (product_code);

-- 4. Create loan_application_history
CREATE TABLE IF NOT EXISTS loan_application_history (
    id                      UUID PRIMARY KEY,
    loan_application_id     VARCHAR(50) NOT NULL,
    previous_status         VARCHAR(50),
    new_status              VARCHAR(50) NOT NULL,
    changed_by              VARCHAR(100) NOT NULL,
    changed_by_role         VARCHAR(50) NOT NULL,
    changed_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remarks                 TEXT,
    reason                  VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_loan_app_history_app_id ON loan_application_history (loan_application_id, changed_at DESC);

-- 5. Create loan_documents
CREATE TABLE IF NOT EXISTS loan_documents (
    id                      UUID PRIMARY KEY,
    loan_application_id     VARCHAR(50) NOT NULL,
    document_type           VARCHAR(100) NOT NULL,
    document_reference_id   VARCHAR(100) NOT NULL,
    file_name               VARCHAR(255),
    source                  VARCHAR(50) NOT NULL DEFAULT 'KYC_VERIFIED',
    verification_status     VARCHAR(30) NOT NULL DEFAULT 'VERIFIED',
    verified_by             VARCHAR(100),
    verified_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_documents_app_id ON loan_documents (loan_application_id);

-- 6. Dynamic Promotional Offers Management
CREATE TABLE IF NOT EXISTS loan_promotional_offers (
    id                                  UUID PRIMARY KEY,
    offer_code                          VARCHAR(50) NOT NULL UNIQUE,
    offer_name                          VARCHAR(200) NOT NULL,
    description                         TEXT,
    status                              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    current_version                     INTEGER NOT NULL DEFAULT 1,
    valid_from                          TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to                            TIMESTAMP WITH TIME ZONE NOT NULL,
    activated_at                        TIMESTAMP WITH TIME ZONE,
    applicable_product_codes            JSONB,
    eligibility_conditions              JSONB,
    discount_type                       VARCHAR(40) NOT NULL,
    interest_rate_discount              NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_discount_percentage  NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_waiver_amount        NUMERIC(15,2) DEFAULT 0.00,
    cashback_amount                     NUMERIC(15,2) DEFAULT 0.00,
    cashback_percentage                 NUMERIC(5,2) DEFAULT 0.00,
    max_cashback_amount                 NUMERIC(15,2),
    priority                            INTEGER NOT NULL DEFAULT 100,
    created_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    updated_by                          VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_loan_promo_offers_status_dates
    ON loan_promotional_offers (status, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS loan_offer_versions (
    id                                  UUID PRIMARY KEY,
    offer_id                            UUID NOT NULL,
    offer_code                          VARCHAR(50) NOT NULL,
    version_number                      INTEGER NOT NULL,
    status                              VARCHAR(20) NOT NULL,
    valid_from                          TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to                            TIMESTAMP WITH TIME ZONE NOT NULL,
    applicable_product_codes            JSONB,
    eligibility_conditions              JSONB,
    discount_type                       VARCHAR(40) NOT NULL,
    interest_rate_discount              NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_discount_percentage  NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_waiver_amount        NUMERIC(15,2) DEFAULT 0.00,
    cashback_amount                     NUMERIC(15,2) DEFAULT 0.00,
    cashback_percentage                 NUMERIC(5,2) DEFAULT 0.00,
    max_cashback_amount                 NUMERIC(15,2),
    snapshot_json                       JSONB,
    created_by                          VARCHAR(100) NOT NULL,
    created_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_loan_offer_version UNIQUE (offer_id, version_number),
    CONSTRAINT fk_loan_offer_versions_offer FOREIGN KEY (offer_id) REFERENCES loan_promotional_offers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_application_offer_snapshots (
    id                                  UUID PRIMARY KEY,
    loan_application_id                 VARCHAR(50) NOT NULL UNIQUE,
    offer_id                            UUID NOT NULL,
    offer_code                          VARCHAR(50) NOT NULL,
    offer_name                          VARCHAR(200) NOT NULL,
    offer_version                       INTEGER NOT NULL,
    discount_type                       VARCHAR(40) NOT NULL,
    interest_rate_discount              NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_discount_percentage  NUMERIC(5,2) DEFAULT 0.00,
    processing_fee_waiver_amount        NUMERIC(15,2) DEFAULT 0.00,
    cashback_amount                     NUMERIC(15,2) DEFAULT 0.00,
    effective_interest_rate             NUMERIC(5,2) NOT NULL,
    original_processing_fee             NUMERIC(15,2) NOT NULL,
    discounted_processing_fee           NUMERIC(15,2) NOT NULL,
    benefit_details                     JSONB,
    applied_at                          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_app_offer_snap_offer ON loan_application_offer_snapshots (offer_id, offer_version);

-- 7. Evolve loan_accounts & create loan_repayment_schedules
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS disbursement_account_id VARCHAR(100);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE loan_accounts SET identity_subject = customer_id WHERE identity_subject IS NULL;

CREATE TABLE IF NOT EXISTS loan_repayment_schedules (
    id                          UUID PRIMARY KEY,
    loan_account_id             VARCHAR(50) NOT NULL,
    installment_number          INTEGER NOT NULL,
    due_date                    DATE NOT NULL,
    principal_amount            NUMERIC(15,2) NOT NULL,
    interest_amount             NUMERIC(15,2) NOT NULL,
    total_amount                NUMERIC(15,2) NOT NULL,
    paid_amount                 NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    outstanding_balance_after   NUMERIC(15,2) NOT NULL,
    status                      VARCHAR(30) NOT NULL DEFAULT 'DUE',
    paid_at                     TIMESTAMP WITH TIME ZONE,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_loan_repayment_installment UNIQUE (loan_account_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_loan_repayment_account ON loan_repayment_schedules (loan_account_id, installment_number);

-- 8. Evolve loan_idempotency_keys
ALTER TABLE loan_idempotency_keys ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);
ALTER TABLE loan_idempotency_keys ADD COLUMN IF NOT EXISTS request_hash VARCHAR(128);
ALTER TABLE loan_idempotency_keys ADD COLUMN IF NOT EXISTS response_payload TEXT;
ALTER TABLE loan_idempotency_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 9. Transactional Outbox & Idempotent Consumer Inbox
CREATE TABLE IF NOT EXISTS loan_outbox_events (
    id                  UUID PRIMARY KEY,
    event_id            VARCHAR(100) NOT NULL UNIQUE,
    topic               VARCHAR(150) NOT NULL,
    aggregate_id        VARCHAR(100) NOT NULL,
    aggregate_type      VARCHAR(50) NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    payload             TEXT NOT NULL,
    correlation_id      VARCHAR(100),
    publishing_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count         INTEGER NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMP WITH TIME ZONE,
    last_error          VARCHAR(500),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_outbox_pending
    ON loan_outbox_events (publishing_status, next_attempt_at, retry_count);

CREATE TABLE IF NOT EXISTS loan_inbox_events (
    event_id        VARCHAR(100) PRIMARY KEY,
    topic           VARCHAR(150) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    consumer_group  VARCHAR(100) NOT NULL,
    payload         TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    error_message   VARCHAR(500),
    received_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMP WITH TIME ZONE
);
