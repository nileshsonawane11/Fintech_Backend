
CREATE TABLE customers (
                           id UUID PRIMARY KEY,
                           mobile_number VARCHAR(10) NOT NULL,
                           email VARCHAR(254) NOT NULL,
                           password_hash VARCHAR(255) NOT NULL,
                           status VARCHAR(30) NOT NULL,
                           role VARCHAR(30) NOT NULL,
                           accepted_terms_version VARCHAR(100) NOT NULL,
                           marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
                           failed_login_attempts INTEGER NOT NULL DEFAULT 0,
                           locked_until TIMESTAMPTZ,
                           created_at TIMESTAMPTZ NOT NULL,
                           updated_at TIMESTAMPTZ NOT NULL,

                           CONSTRAINT uk_customer_mobile UNIQUE (mobile_number),
                           CONSTRAINT uk_customer_email UNIQUE (email)
);

CREATE TABLE otp_challenges (
                                id UUID PRIMARY KEY,
                                reference_id VARCHAR(100) NOT NULL UNIQUE,
                                customer_id UUID REFERENCES customers(id),
                                purpose VARCHAR(30) NOT NULL,
                                code_hash VARCHAR(255) NOT NULL,
                                expires_at TIMESTAMPTZ NOT NULL,
                                attempts INTEGER NOT NULL DEFAULT 0,
                                max_attempts INTEGER NOT NULL,
                                verified_at TIMESTAMPTZ,
                                consumed_at TIMESTAMPTZ,
                                created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_otp_reference
    ON otp_challenges(reference_id);

CREATE TABLE refresh_tokens (
                                id UUID PRIMARY KEY,
                                customer_id UUID NOT NULL REFERENCES customers(id),
                                token_hash VARCHAR(255) NOT NULL UNIQUE,
                                expires_at TIMESTAMPTZ NOT NULL,
                                revoked_at TIMESTAMPTZ,
                                created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_refresh_customer
    ON refresh_tokens(customer_id);

CREATE TABLE customer_consents (
                                   id UUID PRIMARY KEY,
                                   customer_id UUID NOT NULL REFERENCES customers(id),
                                   purpose VARCHAR(40) NOT NULL,
                                   consent_text_version VARCHAR(100) NOT NULL,
                                   granted_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_consent_customer
    ON customer_consents(customer_id);
