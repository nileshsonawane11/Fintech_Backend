-- Match the currency column to the Payment entity's VARCHAR(3) mapping.
-- CHAR(3) pads values; trim that padding while preserving the currency code.
ALTER TABLE payments
    ALTER COLUMN currency TYPE VARCHAR(3) USING BTRIM(currency)::VARCHAR(3);
