-- Loan Service Seed Data
-- V2: Seed loan products, a sample application, offer, and account

-- Loan Products
INSERT INTO loan_products (product_code, product_name, loan_type, currency, min_amount, max_amount,
    min_tenure_months, max_tenure_months, interest_rate_from, interest_type, secured)
VALUES
    ('PL_SALARIED_001', 'Personal Loan - Salaried', 'PERSONAL', 'INR',
     50000.00, 2000000.00, 12, 60, 11.50, 'REDUCING', FALSE),
    ('HL_001', 'Home Loan', 'HOME', 'INR',
     500000.00, 10000000.00, 60, 240, 8.50, 'REDUCING', TRUE);

-- Sample loan application for testing
INSERT INTO loan_applications (id, loan_application_id, customer_id, product_code,
    requested_amount, tenure_months, purpose, credit_bureau_consent, status,
    credit_assessment_status, estimated_decision_time, employment_type, monthly_income, employer_name)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'LN-APP-700123',
    'CUST-TEST001',
    'PL_SALARIED_001',
    500000.00,
    36,
    'HOME_RENOVATION',
    TRUE,
    'SUBMITTED',
    'INITIATED',
    NOW() + INTERVAL '1 hour',
    'SALARIED',
    95000.00,
    'ABC Technologies'
);

-- Sample loan offer for testing (linked to LN-APP-700123)
INSERT INTO loan_offers (offer_id, loan_application_id, sanctioned_amount, interest_rate,
    tenure_months, currency, status, expires_at)
VALUES (
    'OFFER-500987',
    'LN-APP-700123',
    500000.00,
    12.25,
    36,
    'INR',
    'PENDING',
    NOW() + INTERVAL '7 days'
);

-- Sample loan account for repayment schedule testing
INSERT INTO loan_accounts (loan_account_id, customer_id, loan_application_id, offer_id, principal_amount,
    outstanding_principal, interest_rate, tenure_months, currency, emi_amount, status, next_due_date, disbursement_date)
VALUES (
    'LN-778899',
    'CUST-TEST001',
    'LN-APP-700123',
    'OFFER-500987',
    500000.00,
    485000.00,
    12.25,
    36,
    'INR',
    16700.00,
    'ACTIVE',
    CURRENT_DATE + INTERVAL '25 days',
    CURRENT_DATE - INTERVAL '35 days'
);
