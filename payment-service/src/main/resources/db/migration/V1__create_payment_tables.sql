-- Payment Service DB Schema
-- V1: Create core tables

CREATE TABLE beneficiaries (
    id              VARCHAR(36)     PRIMARY KEY,
    beneficiary_id  VARCHAR(20)     NOT NULL UNIQUE,
    user_id         VARCHAR(100)    NOT NULL,
    nickname        VARCHAR(100)    NOT NULL,
    beneficiary_name VARCHAR(200)   NOT NULL,
    account_number  VARCHAR(30)     NOT NULL,
    ifsc_code       VARCHAR(20)     NOT NULL,
    bank_name       VARCHAR(200)    NOT NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_beneficiary_id ON beneficiaries(beneficiary_id);

CREATE TABLE payments (
    id              VARCHAR(36)     PRIMARY KEY,
    payment_id      VARCHAR(20)     NOT NULL UNIQUE,
    transaction_id  VARCHAR(20)     NOT NULL UNIQUE,
    user_id         VARCHAR(100)    NOT NULL,
    debit_account_id VARCHAR(50)    NOT NULL,
    beneficiary_id  VARCHAR(20)     NOT NULL,
    amount          NUMERIC(19,4)   NOT NULL,
    currency        CHAR(3)         NOT NULL DEFAULT 'INR',
    remarks         VARCHAR(500),
    transfer_mode   VARCHAR(20)     NOT NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    rail_reference  VARCHAR(50),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_payment_id   ON payments(payment_id);
CREATE INDEX idx_payments_user_id      ON payments(user_id);
CREATE INDEX idx_payments_rail_reference ON payments(rail_reference);

CREATE TABLE payment_idempotency_keys (
    id              VARCHAR(36)     PRIMARY KEY,
    idempotency_key VARCHAR(100)    NOT NULL UNIQUE,
    payment_id      VARCHAR(20)     NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_events (
    id              VARCHAR(36)     PRIMARY KEY,
    rail_reference  VARCHAR(50)     NOT NULL UNIQUE,
    payment_reference VARCHAR(20),
    status          VARCHAR(30),
    status_reason   VARCHAR(100),
    completed_at    TIMESTAMPTZ,
    received_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_rail_reference ON webhook_events(rail_reference);
