
CREATE TABLE kyc_cases (
                           id UUID PRIMARY KEY,
                           kyc_case_id VARCHAR(32) NOT NULL UNIQUE,
                           customer_profile_id UUID NOT NULL
                               REFERENCES customer_profiles(id),

                           status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
                           risk_category VARCHAR(32) NOT NULL DEFAULT 'UNASSESSED',

                           gender VARCHAR(20),
                           occupation VARCHAR(40),
                           annual_income_range VARCHAR(40),
                           ckyc_number_encrypted TEXT,
                           aadhaar_consent BOOLEAN NOT NULL DEFAULT FALSE,
                           consent_recorded_at TIMESTAMPTZ,

                           assigned_to VARCHAR(100),
                           submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           decided_at TIMESTAMPTZ,
                           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_kyc_cases_customer
    ON kyc_cases(customer_profile_id, created_at DESC);

CREATE INDEX idx_kyc_cases_status
    ON kyc_cases(status, submitted_at);

CREATE UNIQUE INDEX uq_kyc_one_active_case_per_customer
    ON kyc_cases(customer_profile_id)
    WHERE status IN (
        'SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD', 'NEEDS_INFO'
    );

CREATE TABLE customer_addresses (
                                    id UUID PRIMARY KEY,
                                    customer_profile_id UUID NOT NULL
                                        REFERENCES customer_profiles(id),
                                    address_type VARCHAR(20) NOT NULL,
                                    address_line1 VARCHAR(200) NOT NULL,
                                    address_line2 VARCHAR(200),
                                    city VARCHAR(100) NOT NULL,
                                    state VARCHAR(100) NOT NULL,
                                    postal_code VARCHAR(12) NOT NULL,
                                    country VARCHAR(60) NOT NULL,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kyc_documents (
                               id UUID PRIMARY KEY,
                               document_reference_id VARCHAR(64) NOT NULL UNIQUE,
                               kyc_case_id UUID REFERENCES kyc_cases(id),
                               customer_profile_id UUID NOT NULL
                                   REFERENCES customer_profiles(id),
                               document_type VARCHAR(40) NOT NULL,
                               file_name VARCHAR(255) NOT NULL,
                               content_type VARCHAR(100) NOT NULL,
                               content_size_bytes BIGINT NOT NULL,
                               storage_key TEXT,
                               status VARCHAR(30) NOT NULL DEFAULT 'PENDING_UPLOAD',
                               file_hash VARCHAR(128),
                               uploaded_at TIMESTAMPTZ,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kyc_documents_case
    ON kyc_documents(kyc_case_id);

CREATE TABLE kyc_verification_results (
                                          id UUID PRIMARY KEY,
                                          kyc_case_id UUID NOT NULL REFERENCES kyc_cases(id),
                                          verification_type VARCHAR(40) NOT NULL,
                                          result VARCHAR(30) NOT NULL,
                                          provider_reference VARCHAR(200),
                                          details_code VARCHAR(100),
                                          checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kyc_decision_history (
                                      id UUID PRIMARY KEY,
                                      kyc_case_id UUID NOT NULL REFERENCES kyc_cases(id),
                                      previous_status VARCHAR(32),
                                      new_status VARCHAR(32) NOT NULL,
                                      actor_id VARCHAR(150) NOT NULL,
                                      reason VARCHAR(1000),
                                      occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_audit_events (
                                       id UUID PRIMARY KEY,
                                       customer_profile_id UUID NOT NULL
                                           REFERENCES customer_profiles(id),
                                       actor_id VARCHAR(150) NOT NULL,
                                       action VARCHAR(100) NOT NULL,
                                       correlation_id VARCHAR(100),
                                       occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);