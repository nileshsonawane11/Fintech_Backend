-- Refactor payments schema for Razorpay Orders + Checkout workflow and remove obsolete Smart Collect, Virtual Accounts, RazorpayX Payouts, and Beneficiary/Fund Account tables.

DROP TABLE IF EXISTS beneficiary_validations CASCADE;
DROP TABLE IF EXISTS provider_fund_accounts CASCADE;
DROP TABLE IF EXISTS provider_contacts CASCADE;
DROP TABLE IF EXISTS incoming_payments CASCADE;
DROP TABLE IF EXISTS incoming_payment_receivers CASCADE;
DROP TABLE IF EXISTS payment_customers CASCADE;
DROP TABLE IF EXISTS payment_mandate_registrations CASCADE;
DROP TABLE IF EXISTS payment_collection_orders CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;

ALTER TABLE payments DROP COLUMN IF EXISTS transaction_id;
ALTER TABLE payments DROP COLUMN IF EXISTS debit_account_id;
ALTER TABLE payments DROP COLUMN IF EXISTS beneficiary_id;
ALTER TABLE payments DROP COLUMN IF EXISTS fee_amount;
ALTER TABLE payments DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE payments DROP COLUMN IF EXISTS total_debit_amount;
ALTER TABLE payments DROP COLUMN IF EXISTS remarks;
ALTER TABLE payments DROP COLUMN IF EXISTS transfer_mode;
ALTER TABLE payments DROP COLUMN IF EXISTS transfer_type;
ALTER TABLE payments DROP COLUMN IF EXISTS rail_reference;
ALTER TABLE payments DROP COLUMN IF EXISTS provider_name;
ALTER TABLE payments DROP COLUMN IF EXISTS provider_payout_id;
ALTER TABLE payments DROP COLUMN IF EXISTS provider_fund_account_id;
ALTER TABLE payments DROP COLUMN IF EXISTS provider_utr;
ALTER TABLE payments DROP COLUMN IF EXISTS ledger_settlement_tx_id;
ALTER TABLE payments DROP COLUMN IF EXISTS submitted_at;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_account_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS destination_account_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose VARCHAR(40) NOT NULL DEFAULT 'ACCOUNT_DEPOSIT';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_service VARCHAR(50) NOT NULL DEFAULT 'PAYMENT-SERVICE';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS business_reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt VARCHAR(80);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(19, 4) NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata_json TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_razorpay_order_id
    ON payments (razorpay_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_razorpay_payment_id
    ON payments (razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_created
    ON payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_updated
    ON payments (status, updated_at);

CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY,
    refund_id VARCHAR(50) NOT NULL UNIQUE,
    payment_id VARCHAR(50) NOT NULL,
    razorpay_payment_id VARCHAR(100) NOT NULL,
    razorpay_refund_id VARCHAR(100) UNIQUE,
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL,
    reason VARCHAR(500),
    idempotency_key VARCHAR(100) UNIQUE,
    ledger_reversal_tx_id VARCHAR(100),
    failure_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id
    ON payment_refunds (payment_id, created_at DESC);
