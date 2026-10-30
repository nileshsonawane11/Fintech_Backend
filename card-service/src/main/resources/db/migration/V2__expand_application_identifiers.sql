ALTER TABLE card_applications
    ALTER COLUMN card_application_id TYPE VARCHAR(50);

ALTER TABLE card_tokens
    ALTER COLUMN card_token_id TYPE VARCHAR(50);

ALTER TABLE card_application_idempotency_keys
    ALTER COLUMN card_application_id TYPE VARCHAR(50);
