-- ====================================================================
-- FINBANK ACCOUNT SERVICE SCHEMA MIGRATION V1
-- ====================================================================

-- 1. ACCOUNT PRODUCTS
CREATE TABLE IF NOT EXISTS account_products (
    id UUID PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    account_type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    minimum_balance NUMERIC(18, 2) NOT NULL,
    minimum_initial_funding NUMERIC(18, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL,
    daily_transfer_limit NUMERIC(18, 2) NOT NULL,
    monthly_transfer_limit NUMERIC(18, 2) NOT NULL,
    minimum_age INT NOT NULL,
    maximum_age INT,
    requires_kyc BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_products_type_active ON account_products (account_type, active);

-- 2. ACCOUNT APPLICATIONS
CREATE TABLE IF NOT EXISTS account_applications (
    id UUID PRIMARY KEY,
    application_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    product_id UUID NOT NULL REFERENCES account_products(id),
    product_code VARCHAR(50) NOT NULL,
    initial_funding_amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    application_status VARCHAR(30) NOT NULL,
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(100),
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_apps_customer ON account_applications (customer_id, application_status);
CREATE INDEX idx_account_apps_subject ON account_applications (identity_subject);
CREATE INDEX idx_account_apps_submitted ON account_applications (submitted_at);

-- 3. ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL UNIQUE,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    application_id UUID REFERENCES account_applications(id),
    product_id UUID NOT NULL REFERENCES account_products(id),
    product_code VARCHAR(50) NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    account_status VARCHAR(30) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    closure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_accounts_customer ON accounts (customer_id, account_status);
CREATE INDEX idx_accounts_subject ON accounts (identity_subject);
CREATE INDEX idx_accounts_status ON accounts (account_status);

-- 4. ACCOUNT HOLDS
CREATE TABLE IF NOT EXISTS account_holds (
    id UUID PRIMARY KEY,
    hold_id VARCHAR(50) NOT NULL UNIQUE,
    account_id VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    remarks TEXT,
    hold_status VARCHAR(30) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    released_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    release_reason TEXT,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_holds_account ON account_holds (account_id, hold_status);
CREATE INDEX idx_account_holds_created ON account_holds (created_at);

-- 5. ACCOUNT NOMINEES
CREATE TABLE IF NOT EXISTS account_nominees (
    id UUID PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    mobile_number_encrypted VARCHAR(255) NOT NULL,
    allocation_percentage INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_nominees_account ON account_nominees (account_id);

-- 6. IDEMPOTENCY RECORDS
CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    operation VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT,
    response_body TEXT,
    processing_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_records (expires_at);

-- 7. OUTBOX EVENTS
CREATE TABLE IF NOT EXISTS outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    publishing_status VARCHAR(30) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_outbox_publishing ON outbox_events (publishing_status, created_at);

-- 8. ACCOUNT LIFECYCLE HISTORY
CREATE TABLE IF NOT EXISTS account_lifecycle_history (
    id UUID PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    remarks TEXT,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_account_lifecycle_account ON account_lifecycle_history (account_id, changed_at);
