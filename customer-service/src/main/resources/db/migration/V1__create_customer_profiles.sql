
CREATE TABLE customer_profiles (
                                   id UUID PRIMARY KEY,
                                   customer_id VARCHAR(32) NOT NULL UNIQUE,
                                   identity_subject VARCHAR(255) NOT NULL UNIQUE,

                                   full_name VARCHAR(150),
                                   date_of_birth DATE,

                                   mobile_number_encrypted TEXT,
                                   email_encrypted TEXT,
                                   pan_encrypted TEXT,

                                   kyc_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
                                   risk_category VARCHAR(32) NOT NULL DEFAULT 'UNASSESSED',

                                   created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_profiles_kyc_status
    ON customer_profiles (kyc_status);