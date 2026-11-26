-- ====================================================================
-- V7: LOAN DISBURSEMENT, REPAYMENT FACILITY & RECONCILIATION SCHEMA
-- ====================================================================

-- 1. Evolve loan_accounts with approved vs disbursed principal & repayment tracking
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(19,2);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC(19,2);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS interest_outstanding NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS charges_outstanding NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS total_principal_repaid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS total_interest_repaid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS total_charges_repaid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS repayment_frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS current_schedule_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS dpd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE loan_accounts
SET approved_amount = COALESCE(approved_amount, principal_amount),
    disbursed_amount = COALESCE(disbursed_amount, principal_amount)
WHERE approved_amount IS NULL OR disbursed_amount IS NULL;

-- 2. Evolve loan_repayment_schedules with full EMI & partial payment columns
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS installment_id VARCHAR(64);
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS schedule_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS opening_principal NUMERIC(19,2);
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS closing_principal NUMERIC(19,2);
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(19,2);
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS principal_paid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS charges_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS charges_paid NUMERIC(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS grace_period_end_date DATE;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE loan_repayment_schedules
SET installment_id = COALESCE(installment_id, 'INST-' || loan_account_id || '-' || installment_number),
    closing_principal = COALESCE(closing_principal, outstanding_balance_after),
    opening_principal = COALESCE(opening_principal, outstanding_balance_after + principal_amount),
    remaining_amount = COALESCE(remaining_amount, GREATEST(0, total_amount - paid_amount)),
    grace_period_end_date = COALESCE(grace_period_end_date, due_date + 5),
    updated_at = COALESCE(updated_at, created_at)
WHERE installment_id IS NULL OR remaining_amount IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_loan_sched_inst_id ON loan_repayment_schedules(installment_id);
CREATE INDEX IF NOT EXISTS idx_loan_sched_due_status ON loan_repayment_schedules(due_date, status);
CREATE INDEX IF NOT EXISTS idx_loan_sched_ver ON loan_repayment_schedules(loan_account_id, schedule_version);

-- 3. loan_disbursements (Authoritative disbursement & ledger reconciliation record)
CREATE TABLE IF NOT EXISTS loan_disbursements (
    id UUID PRIMARY KEY,
    disbursement_reference VARCHAR(64) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    loan_application_id VARCHAR(50) NOT NULL UNIQUE,
    loan_account_id VARCHAR(50),
    customer_id VARCHAR(100) NOT NULL,
    identity_subject VARCHAR(100),
    requested_amount NUMERIC(19,2) NOT NULL,
    approved_amount NUMERIC(19,2) NOT NULL,
    disbursed_amount NUMERIC(19,2) NOT NULL,
    upfront_fee_deducted NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    destination_account_reference VARCHAR(100) NOT NULL,
    account_transaction_reference VARCHAR(100),
    ledger_transaction_reference VARCHAR(100),
    disbursement_status VARCHAR(40) NOT NULL,
    disbursement_date DATE,
    failure_reason VARCHAR(500),
    disbursed_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_loan_disb_app ON loan_disbursements(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_disb_acc ON loan_disbursements(loan_account_id);
CREATE INDEX IF NOT EXISTS idx_loan_disb_status ON loan_disbursements(disbursement_status);

-- 4. loan_schedule_versions (Preserves historical schedule regenerations)
CREATE TABLE IF NOT EXISTS loan_schedule_versions (
    id UUID PRIMARY KEY,
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    version_number INTEGER NOT NULL,
    principal_basis NUMERIC(19,2) NOT NULL,
    annual_interest_rate NUMERIC(5,2) NOT NULL,
    remaining_tenure_months INTEGER NOT NULL,
    emi_amount NUMERIC(19,2) NOT NULL,
    reason VARCHAR(200) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (loan_account_id, version_number)
);

-- 5. loan_repayment_accounts (Customer-registered FinBank repayment accounts)
CREATE TABLE IF NOT EXISTS loan_repayment_accounts (
    id UUID PRIMARY KEY,
    repayment_account_id VARCHAR(64) NOT NULL UNIQUE,
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    customer_id VARCHAR(100) NOT NULL,
    identity_subject VARCHAR(100),
    external_account_id VARCHAR(100) NOT NULL,
    masked_account_number VARCHAR(40) NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_repay_acc_loan ON loan_repayment_accounts(loan_account_id, status);

-- 6. loan_repayment_mandates
CREATE TABLE IF NOT EXISTS loan_repayment_mandates (
    id UUID PRIMARY KEY,
    mandate_id VARCHAR(64) NOT NULL UNIQUE,
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    customer_id VARCHAR(100) NOT NULL,
    identity_subject VARCHAR(100),
    repayment_account_id VARCHAR(64),
    provider_reference VARCHAR(100),
    mandate_type VARCHAR(30) NOT NULL,
    max_authorized_amount NUMERIC(19,2) NOT NULL CHECK (max_authorized_amount > 0),
    frequency VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    failure_reason VARCHAR(500),
    activated_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mandate_loan_status ON loan_repayment_mandates(loan_account_id, status);
CREATE INDEX IF NOT EXISTS idx_mandate_provider_ref ON loan_repayment_mandates(provider_reference);

-- 7. loan_repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY,
    repayment_id VARCHAR(64) NOT NULL UNIQUE,
    repayment_reference VARCHAR(64) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    customer_id VARCHAR(100) NOT NULL,
    identity_subject VARCHAR(100),
    installment_id VARCHAR(64),
    repayment_account_id VARCHAR(64),
    mandate_id VARCHAR(64),
    repayment_type VARCHAR(30) NOT NULL DEFAULT 'EMI',
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(19,2) NOT NULL CHECK (amount > 0),
    principal_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    interest_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    charges_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    excess_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    repayment_status VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(100),
    transaction_reference VARCHAR(100),
    ledger_transaction_reference VARCHAR(100),
    receipt_reference VARCHAR(64) UNIQUE,
    auto_collection BOOLEAN NOT NULL DEFAULT FALSE,
    initiated_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    failure_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_repay_loan_status ON loan_repayments(loan_account_id, repayment_status);
CREATE INDEX IF NOT EXISTS idx_repay_payment_ref ON loan_repayments(payment_reference);

-- 8. loan_repayment_attempts
CREATE TABLE IF NOT EXISTS loan_repayment_attempts (
    id UUID PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL UNIQUE,
    repayment_id VARCHAR(64) NOT NULL REFERENCES loan_repayments(repayment_id),
    attempt_number INTEGER NOT NULL,
    provider_reference VARCHAR(100),
    idempotency_key VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    failure_code VARCHAR(80),
    failure_reason VARCHAR(500),
    attempt_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (repayment_id, attempt_number)
);

-- 9. loan_repayment_allocations
CREATE TABLE IF NOT EXISTS loan_repayment_allocations (
    id UUID PRIMARY KEY,
    allocation_id VARCHAR(64) NOT NULL UNIQUE,
    repayment_id VARCHAR(64) NOT NULL REFERENCES loan_repayments(repayment_id),
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    installment_id VARCHAR(64),
    principal_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    interest_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    overdue_interest_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    late_charge_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    bounce_charge_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    other_charge_allocated NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    total_allocated NUMERIC(19,2) NOT NULL,
    reversed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alloc_repayment ON loan_repayment_allocations(repayment_id);
CREATE INDEX IF NOT EXISTS idx_alloc_installment ON loan_repayment_allocations(installment_id);

-- 10. loan_charges
CREATE TABLE IF NOT EXISTS loan_charges (
    id UUID PRIMARY KEY,
    charge_id VARCHAR(64) NOT NULL UNIQUE,
    loan_account_id VARCHAR(50) NOT NULL REFERENCES loan_accounts(loan_account_id),
    installment_id VARCHAR(64),
    charge_type VARCHAR(40) NOT NULL,
    amount NUMERIC(19,2) NOT NULL CHECK (amount >= 0),
    paid_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    waived_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(300),
    waived_by VARCHAR(100),
    waived_at TIMESTAMPTZ,
    assessed_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_charge_loan_status ON loan_charges(loan_account_id, status);

-- 11. loan_repayment_reconciliations
CREATE TABLE IF NOT EXISTS loan_repayment_reconciliations (
    id UUID PRIMARY KEY,
    reconciliation_id VARCHAR(64) NOT NULL UNIQUE,
    reconciliation_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    loan_account_id VARCHAR(50),
    loan_application_id VARCHAR(50),
    expected_amount NUMERIC(19,2),
    account_transaction_reference VARCHAR(100),
    ledger_transaction_reference VARCHAR(100),
    payment_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    failure_reason VARCHAR(500),
    resolution_notes VARCHAR(500),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recon_status ON loan_repayment_reconciliations(status);

-- 12. loan_webhook_events (Webhook signature & duplicate-delivery guard)
CREATE TABLE IF NOT EXISTS loan_webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(40) NOT NULL,
    event_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    reference_id VARCHAR(100),
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL,
    UNIQUE (provider, event_id)
);
