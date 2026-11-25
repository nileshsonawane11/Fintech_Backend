-- Loan Service DB Schema
-- V1: Create core tables

CREATE TABLE loan_products (
    product_code        VARCHAR(50)     PRIMARY KEY,
    product_name        VARCHAR(200)    NOT NULL,
    loan_type           VARCHAR(50)     NOT NULL,
    currency            CHAR(3)         NOT NULL DEFAULT 'INR',
    min_amount          NUMERIC(15,2)   NOT NULL,
    max_amount          NUMERIC(15,2)   NOT NULL,
    min_tenure_months   INTEGER         NOT NULL,
    max_tenure_months   INTEGER         NOT NULL,
    interest_rate_from  NUMERIC(5,2)    NOT NULL,
    interest_type       VARCHAR(20)     NOT NULL DEFAULT 'REDUCING',
    secured             BOOLEAN         NOT NULL DEFAULT FALSE,
    active              BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE loan_applications (
    id                          VARCHAR(36)     PRIMARY KEY,
    loan_application_id         VARCHAR(20)     NOT NULL UNIQUE,
    customer_id                 VARCHAR(100)    NOT NULL,
    product_code                VARCHAR(50)     NOT NULL,
    requested_amount            NUMERIC(15,2)   NOT NULL,
    tenure_months               INTEGER         NOT NULL,
    purpose                     VARCHAR(100),
    credit_bureau_consent       BOOLEAN         NOT NULL DEFAULT FALSE,
    status                      VARCHAR(30)     NOT NULL DEFAULT 'SUBMITTED',
    credit_assessment_status    VARCHAR(30)     NOT NULL DEFAULT 'INITIATED',
    estimated_decision_time     TIMESTAMPTZ,
    employment_type             VARCHAR(50),
    monthly_income              NUMERIC(15,2),
    employer_name               VARCHAR(200),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_applications_customer_id ON loan_applications(customer_id);

CREATE TABLE loan_offers (
    offer_id                VARCHAR(50)     PRIMARY KEY,
    loan_application_id     VARCHAR(20)     NOT NULL,
    sanctioned_amount       NUMERIC(15,2)   NOT NULL,
    interest_rate           NUMERIC(5,2)    NOT NULL,
    tenure_months           INTEGER         NOT NULL,
    currency                CHAR(3)         NOT NULL DEFAULT 'INR',
    status                  VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    terms_version           VARCHAR(20),
    disbursement_account_id VARCHAR(100),
    expires_at              TIMESTAMPTZ,
    accepted_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_offers_application_id ON loan_offers(loan_application_id);

CREATE TABLE loan_accounts (
    loan_account_id     VARCHAR(20)     PRIMARY KEY,
    customer_id         VARCHAR(100)    NOT NULL,
    loan_application_id VARCHAR(20)     NOT NULL,
    offer_id            VARCHAR(50)     NOT NULL DEFAULT 'NONE',
    principal_amount    NUMERIC(15,2)   NOT NULL,
    outstanding_principal NUMERIC(15,2) NOT NULL,
    interest_rate       NUMERIC(5,2)    NOT NULL,
    tenure_months       INTEGER         NOT NULL,
    currency            CHAR(3)         NOT NULL DEFAULT 'INR',
    emi_amount          NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    status              VARCHAR(30)     NOT NULL DEFAULT 'ACTIVE',
    next_due_date       DATE,
    disbursement_date   DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE loan_idempotency_keys (
    id                  VARCHAR(36)     PRIMARY KEY,
    idempotency_key     VARCHAR(100)    NOT NULL,
    operation           VARCHAR(50)     NOT NULL,
    response_reference  VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key, operation)
);
