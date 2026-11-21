-- =========================================================
-- V4: ADD GENDER TO CUSTOMER PROFILES TABLE
-- =========================================================

ALTER TABLE customer_profiles
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
