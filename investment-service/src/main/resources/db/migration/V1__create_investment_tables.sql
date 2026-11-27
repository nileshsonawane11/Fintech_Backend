-- FinEdge Investment Service Initial Schema (V1)

CREATE TABLE investment_products (
    id UUID PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    product_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    active_version INTEGER NOT NULL DEFAULT 1,
    short_description VARCHAR(500),
    detailed_description TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    min_amount NUMERIC(19, 2) NOT NULL,
    max_amount NUMERIC(19, 2) NOT NULL,
    denomination_step NUMERIC(19, 2) NOT NULL DEFAULT 1.00,
    min_tenure_months INTEGER NOT NULL,
    max_tenure_months INTEGER NOT NULL,
    base_rate NUMERIC(7, 4) NOT NULL,
    max_rate NUMERIC(7, 4) NOT NULL,
    compounding_frequency VARCHAR(20) NOT NULL,
    payout_options VARCHAR(150) NOT NULL,
    premature_withdrawal_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    premature_penalty_pct NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    lock_in_months INTEGER NOT NULL DEFAULT 0,
    loan_against_fd_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    max_ltv_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    auto_renewal_supported BOOLEAN NOT NULL DEFAULT FALSE,
    returns_guaranteed BOOLEAN NOT NULL DEFAULT TRUE,
    market_linked BOOLEAN NOT NULL DEFAULT FALSE,
    government_scheme BOOLEAN NOT NULL DEFAULT FALSE,
    fund_category VARCHAR(60),
    benchmark_index VARCHAR(100),
    risk_level VARCHAR(30),
    eligibility_criteria TEXT,
    required_documents TEXT,
    benefits TEXT,
    regulatory_disclosures TEXT,
    fee_rules TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inv_products_type_status ON investment_products (product_type, status, is_deleted);

CREATE TABLE investment_product_versions (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    version_number INTEGER NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    base_rate NUMERIC(7, 4) NOT NULL,
    max_rate NUMERIC(7, 4) NOT NULL,
    config_snapshot TEXT NOT NULL,
    change_summary VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, version_number)
);

CREATE INDEX idx_inv_prod_versions_eff ON investment_product_versions (product_id, effective_from, effective_to);

CREATE TABLE investment_rate_slabs (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    min_tenure_days INTEGER NOT NULL,
    max_tenure_days INTEGER NOT NULL,
    min_amount NUMERIC(19, 2) NOT NULL,
    max_amount NUMERIC(19, 2) NOT NULL,
    interest_rate NUMERIC(7, 4) NOT NULL,
    senior_citizen_bonus_rate NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
    payout_frequency VARCHAR(20) NOT NULL DEFAULT 'MATURITY',
    effective_from DATE NOT NULL,
    effective_to DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_rate_slabs_lookup ON investment_rate_slabs (product_id, active, effective_from, min_tenure_days, max_tenure_days);

CREATE TABLE investment_product_audit_logs (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    changed_by VARCHAR(100) NOT NULL,
    changed_by_role VARCHAR(50),
    remarks VARCHAR(500),
    correlation_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_prod_audit_product ON investment_product_audit_logs (product_id, created_at DESC);

CREATE TABLE investment_applications (
    id UUID PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL UNIQUE,
    identity_subject VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50),
    product_id UUID NOT NULL REFERENCES investment_products(id),
    product_code VARCHAR(50) NOT NULL,
    product_type VARCHAR(20) NOT NULL,
    product_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    requested_amount NUMERIC(19, 2) NOT NULL,
    monthly_amount NUMERIC(19, 2),
    tenure_months INTEGER NOT NULL,
    tenure_days INTEGER NOT NULL,
    applied_rate NUMERIC(7, 4) NOT NULL,
    projected_maturity_amount NUMERIC(19, 2) NOT NULL,
    projected_interest NUMERIC(19, 2) NOT NULL,
    compounding_frequency VARCHAR(20) NOT NULL,
    payout_frequency VARCHAR(20) NOT NULL,
    auto_renewal BOOLEAN NOT NULL DEFAULT FALSE,
    funding_account_id VARCHAR(80) NOT NULL,
    funding_account_masked VARCHAR(40),
    nominee_name VARCHAR(150),
    nominee_relationship VARCHAR(50),
    nominee_dob DATE,
    sip_fund_category VARCHAR(60),
    sip_debit_day INTEGER,
    ssy_girl_child_name VARCHAR(150),
    ssy_girl_child_dob DATE,
    ssy_guardian_name VARCHAR(150),
    ssy_guardian_relationship VARCHAR(50),
    ssy_family_exception BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_status_at_apply VARCHAR(30),
    eligibility_summary TEXT,
    remarks VARCHAR(500),
    rejection_reason VARCHAR(500),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inv_apps_subject ON investment_applications (identity_subject, created_at DESC);
CREATE INDEX idx_inv_apps_status ON investment_applications (status, created_at DESC);

CREATE TABLE investment_consents (
    id UUID PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    consent_type VARCHAR(60) NOT NULL,
    disclosure_version VARCHAR(30) NOT NULL,
    accepted BOOLEAN NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_device_id VARCHAR(100)
);

CREATE INDEX idx_inv_consents_app ON investment_consents (application_id);

CREATE TABLE investment_documents (
    id UUID PRIMARY KEY,
    document_id VARCHAR(60) NOT NULL UNIQUE,
    application_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    document_type VARCHAR(60) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_ref VARCHAR(300) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verified_by VARCHAR(100),
    verified_at TIMESTAMP WITH TIME ZONE,
    remarks VARCHAR(400),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_docs_app ON investment_documents (application_id);

CREATE TABLE investments (
    id UUID PRIMARY KEY,
    investment_id VARCHAR(50) NOT NULL UNIQUE,
    application_id VARCHAR(50) NOT NULL UNIQUE,
    identity_subject VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50),
    product_id UUID NOT NULL REFERENCES investment_products(id),
    product_code VARCHAR(50) NOT NULL,
    product_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    principal_amount NUMERIC(19, 2) NOT NULL,
    monthly_amount NUMERIC(19, 2),
    total_invested NUMERIC(19, 2) NOT NULL,
    interest_rate NUMERIC(7, 4) NOT NULL,
    rate_locked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    compounding_frequency VARCHAR(20) NOT NULL,
    payout_frequency VARCHAR(20) NOT NULL,
    tenure_months INTEGER NOT NULL,
    tenure_days INTEGER NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount NUMERIC(19, 2) NOT NULL,
    accrued_interest NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    projected_gain NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    funding_account_id VARCHAR(80) NOT NULL,
    funding_account_masked VARCHAR(40),
    auto_renewal BOOLEAN NOT NULL DEFAULT FALSE,
    maturity_instruction VARCHAR(40) NOT NULL DEFAULT 'CREDIT_TO_ACCOUNT',
    loan_against_fd_active BOOLEAN NOT NULL DEFAULT FALSE,
    lien_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    sip_fund_category VARCHAR(60),
    sip_debit_day INTEGER,
    sip_mandate_ref VARCHAR(80),
    ssy_girl_child_name VARCHAR(150),
    ssy_girl_child_dob DATE,
    ssy_guardian_name VARCHAR(150),
    ssy_guardian_relationship VARCHAR(50),
    ssy_deposit_end_date DATE,
    certificate_number VARCHAR(60) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_investments_subject_status ON investments (identity_subject, status, created_at DESC);
CREATE INDEX idx_investments_maturity ON investments (status, maturity_date);
CREATE INDEX idx_investments_type_status ON investments (product_type, status);

CREATE TABLE investment_installment_schedules (
    id UUID PRIMARY KEY,
    schedule_id VARCHAR(60) NOT NULL UNIQUE,
    investment_id VARCHAR(50) NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    paid_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    penalty_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_ref VARCHAR(80),
    retry_count INTEGER NOT NULL DEFAULT 0,
    failure_reason VARCHAR(300),
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (investment_id, installment_number)
);

CREATE INDEX idx_inv_sched_due ON investment_installment_schedules (status, due_date);
CREATE INDEX idx_inv_sched_inv ON investment_installment_schedules (investment_id, installment_number);

CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY,
    transaction_id VARCHAR(60) NOT NULL UNIQUE,
    investment_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(40) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(25) NOT NULL,
    account_id VARCHAR(80) NOT NULL,
    ledger_transaction_id VARCHAR(80),
    payment_reference VARCHAR(80),
    idempotency_key VARCHAR(100),
    correlation_id VARCHAR(100),
    remarks VARCHAR(400),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_inv_tx_inv ON investment_transactions (investment_id, created_at DESC);
CREATE INDEX idx_inv_tx_status ON investment_transactions (status, created_at DESC);

CREATE TABLE investment_interest_accruals (
    id UUID PRIMARY KEY,
    investment_id VARCHAR(50) NOT NULL,
    accrual_date DATE NOT NULL,
    principal_base NUMERIC(19, 2) NOT NULL,
    rate_applied NUMERIC(7, 4) NOT NULL,
    interest_amount NUMERIC(19, 2) NOT NULL,
    cumulative_interest NUMERIC(19, 2) NOT NULL,
    is_illustrative BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_accruals_inv ON investment_interest_accruals (investment_id, accrual_date DESC);

CREATE TABLE investment_withdrawal_requests (
    id UUID PRIMARY KEY,
    request_id VARCHAR(60) NOT NULL UNIQUE,
    investment_id VARCHAR(50) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    requested_amount NUMERIC(19, 2) NOT NULL,
    penalty_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    net_payout_amount NUMERIC(19, 2) NOT NULL,
    payout_account_id VARCHAR(80) NOT NULL,
    reason VARCHAR(400),
    eligibility_note VARCHAR(400),
    status VARCHAR(30) NOT NULL,
    processed_by VARCHAR(100),
    processed_at TIMESTAMP WITH TIME ZONE,
    transaction_ref VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inv_withdrawals_status ON investment_withdrawal_requests (status, created_at DESC);

CREATE TABLE investment_idempotency_keys (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL,
    operation VARCHAR(60) NOT NULL,
    identity_subject VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_payload TEXT,
    http_status INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key, operation)
);

CREATE TABLE investment_outbox_events (
    id UUID PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    aggregate_id VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    topic VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    event_version VARCHAR(16) NOT NULL DEFAULT '1.0',
    correlation_id VARCHAR(100),
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_error VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_inv_outbox_poll ON investment_outbox_events (status, next_retry_at);

CREATE TABLE investment_inbox_events (
    event_id VARCHAR(80) PRIMARY KEY,
    topic VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE investment_reconciliations (
    id UUID PRIMARY KEY,
    reconciliation_id VARCHAR(60) NOT NULL UNIQUE,
    investment_id VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(60) NOT NULL,
    expected_amount NUMERIC(19, 2) NOT NULL,
    actual_amount NUMERIC(19, 2),
    status VARCHAR(30) NOT NULL,
    mismatch_reason VARCHAR(400),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE investment_ops_alerts (
    id UUID PRIMARY KEY,
    alert_id VARCHAR(60) NOT NULL UNIQUE,
    investment_id VARCHAR(50),
    identity_subject VARCHAR(100),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description VARCHAR(500) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'OPEN',
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
