-- Card Service Migration
-- V4: Add card application workflow enhancements, idempotency metadata, and transactional outbox

-- 1. Extend card_applications table
ALTER TABLE card_applications
    ADD COLUMN IF NOT EXISTS card_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS product_slug VARCHAR(100),
    ADD COLUMN IF NOT EXISTS requested_limit NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS approved_limit NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_card_applications_customer_status
    ON card_applications(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_card_applications_account_status
    ON card_applications(linked_account_id, status);

-- 2. Extend card_application_idempotency_keys table
ALTER TABLE card_application_idempotency_keys
    ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS response_payload TEXT;

CREATE INDEX IF NOT EXISTS idx_card_app_idem_customer
    ON card_application_idempotency_keys(customer_id);

-- 3. Create card_outbox_events table for Transactional Outbox Pattern
CREATE TABLE IF NOT EXISTS card_outbox_events (
    event_id            UUID            PRIMARY KEY,
    aggregate_id        VARCHAR(100)    NOT NULL,
    aggregate_type      VARCHAR(100)    NOT NULL,
    event_type          VARCHAR(100)    NOT NULL,
    payload             TEXT            NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMP,
    publishing_status   VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    retry_count         INT             NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_outbox_status_retries
    ON card_outbox_events(publishing_status, retry_count, created_at);
