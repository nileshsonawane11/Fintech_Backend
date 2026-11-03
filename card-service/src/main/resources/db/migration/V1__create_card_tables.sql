-- Card Service DB Schema
-- V1: Create core tables

CREATE TABLE card_applications (
    id                      VARCHAR(36)     PRIMARY KEY,
    card_application_id     VARCHAR(20)     NOT NULL UNIQUE,
    customer_id             VARCHAR(100)    NOT NULL,
    card_type               VARCHAR(20)     NOT NULL,
    linked_account_id       VARCHAR(50)     NOT NULL,
    delivery_address_id     VARCHAR(50)     NOT NULL,
    status                  VARCHAR(30)     NOT NULL DEFAULT 'PENDING_APPROVAL',
    estimated_delivery_date DATE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_applications_customer_id ON card_applications(customer_id);

CREATE TABLE cards (
    id                  VARCHAR(36)     PRIMARY KEY,
    card_id             VARCHAR(20)     NOT NULL UNIQUE,
    customer_id         VARCHAR(100)    NOT NULL,
    card_type           VARCHAR(20)     NOT NULL,
    card_number         VARCHAR(16)     NOT NULL UNIQUE,
    masked_card_number  VARCHAR(20)     NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    linked_account_id   VARCHAR(50)     NOT NULL,
    expiry_month        INTEGER         NOT NULL,
    expiry_year         INTEGER         NOT NULL,
    blocked_at          TIMESTAMP,
    block_reason        VARCHAR(50),
    block_remarks       VARCHAR(500),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_customer_id ON cards(customer_id);
CREATE INDEX idx_cards_card_id     ON cards(card_id);

CREATE TABLE card_controls (
    id                      VARCHAR(36)     PRIMARY KEY,
    card_id                 VARCHAR(36)     NOT NULL UNIQUE REFERENCES cards(id),
    online_enabled          BOOLEAN         NOT NULL DEFAULT TRUE,
    international_enabled   BOOLEAN         NOT NULL DEFAULT FALSE,
    contactless_enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    atm_withdrawal_enabled  BOOLEAN         NOT NULL DEFAULT TRUE,
    daily_limit             NUMERIC(15,2)   NOT NULL DEFAULT 50000.00
);

CREATE TABLE card_tokens (
    id              VARCHAR(36)     PRIMARY KEY,
    card_token_id   VARCHAR(20)     NOT NULL UNIQUE,
    card_id         VARCHAR(20)     NOT NULL,
    token_requestor VARCHAR(100)    NOT NULL,
    consent_id      VARCHAR(100)    NOT NULL,
    token_reference VARCHAR(50)     NOT NULL UNIQUE,
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_tokens_card_id ON card_tokens(card_id);

CREATE TABLE card_application_idempotency_keys (
    id                  VARCHAR(36)     PRIMARY KEY,
    idempotency_key     VARCHAR(100)    NOT NULL UNIQUE,
    card_application_id VARCHAR(20)     NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);
