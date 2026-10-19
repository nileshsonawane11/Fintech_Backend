ALTER TABLE beneficiaries
    ALTER COLUMN beneficiary_id TYPE VARCHAR(50);

ALTER TABLE payments
    ALTER COLUMN payment_id TYPE VARCHAR(50),
    ALTER COLUMN transaction_id TYPE VARCHAR(50),
    ALTER COLUMN beneficiary_id TYPE VARCHAR(50);

ALTER TABLE payment_idempotency_keys
    ALTER COLUMN payment_id TYPE VARCHAR(50);

ALTER TABLE webhook_events
    ALTER COLUMN payment_reference TYPE VARCHAR(50);
