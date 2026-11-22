-- Card Service Migration
-- V5: Add identity_subject to card_applications, cards, and card_application_idempotency_keys

ALTER TABLE card_applications
    ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_card_applications_identity_subject
    ON card_applications(identity_subject);

ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_cards_identity_subject
    ON cards(identity_subject);

ALTER TABLE card_application_idempotency_keys
    ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_card_app_idem_identity_subject
    ON card_application_idempotency_keys(identity_subject);
