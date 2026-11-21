-- =========================================================
-- V6: ADD FULL_NAME TO CUSTOMERS TABLE
-- =========================================================

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);

UPDATE customers
    SET full_name = 'Customer'
    WHERE full_name IS NULL;
