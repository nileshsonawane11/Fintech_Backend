ALTER TABLE card_tokens
    ADD COLUMN idempotency_key VARCHAR(100);

UPDATE card_tokens
SET idempotency_key = 'legacy-' || card_token_id
WHERE idempotency_key IS NULL;

ALTER TABLE card_tokens
    ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX uq_card_tokens_idempotency_key
    ON card_tokens(idempotency_key);
