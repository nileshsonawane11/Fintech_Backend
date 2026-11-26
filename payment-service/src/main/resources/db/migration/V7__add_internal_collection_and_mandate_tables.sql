-- ====================================================================
-- V7: INTERNAL COLLECTION ORDERS & EXTERNAL RECURRING MANDATES
-- ====================================================================

CREATE TABLE IF NOT EXISTS payment_collection_orders (
    id UUID PRIMARY KEY,
    collection_reference VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    source_service VARCHAR(50) NOT NULL,
    business_reference VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    mandate_reference VARCHAR(100),
    provider_name VARCHAR(50) NOT NULL,
    provider_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    failure_code VARCHAR(80),
    failure_reason VARCHAR(500),
    refund_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pay_col_business ON payment_collection_orders(business_reference);
CREATE INDEX IF NOT EXISTS idx_pay_col_provider ON payment_collection_orders(provider_reference);

CREATE TABLE IF NOT EXISTS payment_mandate_registrations (
    id UUID PRIMARY KEY,
    mandate_reference VARCHAR(100) NOT NULL UNIQUE,
    provider_reference VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    source_service VARCHAR(50) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    mandate_type VARCHAR(30) NOT NULL,
    provider_name VARCHAR(50) NOT NULL,
    max_amount NUMERIC(19,2) NOT NULL,
    frequency VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(30) NOT NULL,
    failure_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pay_mandate_cust ON payment_mandate_registrations(customer_id);
