-- ====================================================================
-- V1: FINBANK LEDGER & TRANSACTION SERVICE SCHEMA
-- ====================================================================

-- 1. LEDGER ACCOUNTS
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY,
    ledger_account_id VARCHAR(100) NOT NULL UNIQUE,
    bank_account_id UUID,
    account_reference VARCHAR(100),
    customer_id UUID,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_subtype VARCHAR(50) NOT NULL,
    normal_balance VARCHAR(10) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_ref ON ledger_accounts(account_reference);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_cust ON ledger_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_bank ON ledger_accounts(bank_account_id);

-- 2. LEDGER TRANSACTIONS
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_status VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    idempotency_key VARCHAR(100),
    request_hash VARCHAR(64),
    correlation_id VARCHAR(100),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    total_debit NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    total_credit NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    narrative VARCHAR(255),
    initiated_by VARCHAR(100),
    source_service VARCHAR(100),
    value_date DATE NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL,
    posted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx_idemp ON ledger_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_ref ON ledger_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_val_date ON ledger_transactions(value_date);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_created ON ledger_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_status ON ledger_transactions(transaction_status);

-- 3. LEDGER ENTRIES (Immutable double-entry debit/credit postings)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    entry_id VARCHAR(100) NOT NULL UNIQUE,
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
    ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    entry_type VARCHAR(10) NOT NULL,
    amount NUMERIC(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    value_date DATE NOT NULL,
    narrative VARCHAR(255),
    reference_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_acc ON ledger_entries(ledger_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(value_date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created ON ledger_entries(created_at);

-- 4. LEDGER BALANCE SNAPSHOTS
CREATE TABLE IF NOT EXISTS ledger_balance_snapshots (
    id UUID PRIMARY KEY,
    ledger_account_id UUID NOT NULL UNIQUE REFERENCES ledger_accounts(id),
    debit_total NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    credit_total NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    ledger_balance NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    last_entry_id UUID,
    last_posted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

-- 5. ACCOUNT HOLDS
CREATE TABLE IF NOT EXISTS account_holds (
    id UUID PRIMARY KEY,
    hold_id VARCHAR(100) NOT NULL UNIQUE,
    ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    bank_account_id UUID,
    customer_id UUID,
    amount NUMERIC(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    reason_code VARCHAR(100),
    remarks VARCHAR(255),
    hold_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    reference_number VARCHAR(100),
    created_by VARCHAR(100),
    released_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_account_holds_acc_status ON account_holds(ledger_account_id, hold_status);
CREATE INDEX IF NOT EXISTS idx_account_holds_bank ON account_holds(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_account_holds_cust ON account_holds(customer_id);

-- 6. IDEMPOTENCY RECORDS
CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    operation VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    resource_id UUID,
    response_status INTEGER,
    response_body TEXT,
    processing_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key_status ON idempotency_records(idempotency_key, processing_status);

-- 7. RECONCILIATION RUNS
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY,
    reconciliation_id VARCHAR(100) NOT NULL UNIQUE,
    reconciliation_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    total_accounts INTEGER NOT NULL DEFAULT 0,
    matched_accounts INTEGER NOT NULL DEFAULT 0,
    mismatched_accounts INTEGER NOT NULL DEFAULT 0,
    difference_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    initiated_by VARCHAR(100),
    summary TEXT
);

-- 8. RECONCILIATION DISCREPANCIES
CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
    id UUID PRIMARY KEY,
    reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(id),
    ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    discrepancy_type VARCHAR(50) NOT NULL,
    expected_amount NUMERIC(19,4) NOT NULL,
    actual_amount NUMERIC(19,4) NOT NULL,
    difference_amount NUMERIC(19,4) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'DETECTED',
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_rec_disc_run ON reconciliation_discrepancies(reconciliation_run_id);
CREATE INDEX IF NOT EXISTS idx_rec_disc_acc ON reconciliation_discrepancies(ledger_account_id);

-- 9. TRANSACTION REVERSALS
CREATE TABLE IF NOT EXISTS transaction_reversals (
    id UUID PRIMARY KEY,
    original_transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
    reversal_transaction_id UUID NOT NULL UNIQUE REFERENCES ledger_transactions(id),
    reason_code VARCHAR(100) NOT NULL,
    remarks VARCHAR(255),
    reversed_by VARCHAR(100),
    reversed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_reversal_orig ON transaction_reversals(original_transaction_id);

-- 10. OUTBOX EVENTS
CREATE TABLE IF NOT EXISTS outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    publishing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created ON outbox_events(publishing_status, created_at);
