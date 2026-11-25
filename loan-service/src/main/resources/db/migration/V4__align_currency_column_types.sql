-- Align currency columns with the VARCHAR(3) entity mapping.
-- CHAR(3) values are padded, so trim them before changing the type.
ALTER TABLE loan_products
    ALTER COLUMN currency TYPE VARCHAR(3) USING BTRIM(currency)::VARCHAR(3);

ALTER TABLE loan_offers
    ALTER COLUMN currency TYPE VARCHAR(3) USING BTRIM(currency)::VARCHAR(3);

ALTER TABLE loan_accounts
    ALTER COLUMN currency TYPE VARCHAR(3) USING BTRIM(currency)::VARCHAR(3);
