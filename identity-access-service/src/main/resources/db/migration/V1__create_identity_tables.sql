
-- V1__initial_schema.sql
-- PostgreSQL schema for the Identity & Access Service

-- =====================================================
-- 1. CUSTOMERS
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
                                         id UUID PRIMARY KEY,
                                         mobile_number VARCHAR(10) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    role VARCHAR(30) NOT NULL,
    accepted_terms_version VARCHAR(100) NOT NULL,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT uk_customer_mobile UNIQUE (mobile_number),
    CONSTRAINT uk_customer_email UNIQUE (email)
    );

-- =====================================================
-- 2. OTP CHALLENGES
-- =====================================================

CREATE TABLE IF NOT EXISTS otp_challenges (
                                              id UUID PRIMARY KEY,
                                              reference_id VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    purpose VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL,
    verified_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_otp_reference
    ON otp_challenges(reference_id);

-- =====================================================
-- 3. REFRESH TOKENS
-- =====================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id UUID PRIMARY KEY,
                                              customer_id UUID NOT NULL REFERENCES customers(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
    );

-- Rotation and token-family tracking.
-- These statements also support an existing refresh_tokens table.

ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS family_id UUID,
    ADD COLUMN IF NOT EXISTS replaced_by_hash VARCHAR(64);

-- Assign a family ID to pre-existing tokens.
UPDATE refresh_tokens
SET family_id = gen_random_uuid()
WHERE family_id IS NULL;

ALTER TABLE refresh_tokens
    ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id
    ON refresh_tokens(family_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_customer_id
    ON refresh_tokens(customer_id);

-- =====================================================
-- 4. CUSTOMER CONSENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_consents (
                                                 id UUID PRIMARY KEY,
                                                 customer_id UUID NOT NULL REFERENCES customers(id),
    purpose VARCHAR(40) NOT NULL,
    consent_text_version VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL
    );

-- Track the current consent state while retaining the
-- original grant record.

ALTER TABLE customer_consents
    ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    NOT NULL DEFAULT 'GRANTED',
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_consent_customer
    ON customer_consents(customer_id);

-- =====================================================
-- 5. APPEND-ONLY CONSENT AUDIT EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_audit_events (
                                                    id UUID PRIMARY KEY,
                                                    customer_id UUID NOT NULL REFERENCES customers(id),
    consent_id UUID NOT NULL REFERENCES customer_consents(id),
    action VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    consent_text_version VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    actor_customer_id UUID REFERENCES customers(id)
    );

CREATE INDEX IF NOT EXISTS idx_consent_audit_customer_time
    ON consent_audit_events(customer_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_audit_consent_time
    ON consent_audit_events(consent_id, occurred_at DESC);