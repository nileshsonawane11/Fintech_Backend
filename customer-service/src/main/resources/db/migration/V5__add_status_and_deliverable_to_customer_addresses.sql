-- ====================================================================
-- V5: ADD STATUS AND DELIVERABLE TO CUSTOMER ADDRESSES
-- ====================================================================

ALTER TABLE customer_addresses
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS deliverable BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_customer_addresses_profile_id
    ON customer_addresses(customer_profile_id);
