-- Card Service Migration
-- V6: Create card_products table and seed initial card products

CREATE TABLE IF NOT EXISTS card_products (
    id                                      UUID PRIMARY KEY,
    product_code                            VARCHAR(50) NOT NULL UNIQUE,
    product_name                            VARCHAR(100) NOT NULL,
    card_type                               VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    network                                 VARCHAR(30) NOT NULL, -- RUPAY, VISA, MASTERCARD
    short_description                       VARCHAR(255),
    description                             TEXT,
    joining_fee                             NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    annual_fee                              NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    forex_markup_percentage                 NUMERIC(5, 2) NOT NULL DEFAULT 3.50,
    eligibility_min_age                     INT NOT NULL DEFAULT 18,
    eligibility_max_age                     INT,
    eligibility_min_monthly_income          NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    eligibility_min_credit_score            INT NOT NULL DEFAULT 0,
    eligibility_employment_types            JSONB,
    eligibility_min_income_history_months   INT NOT NULL DEFAULT 0,
    is_active                               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted                              BOOLEAN NOT NULL DEFAULT FALSE,
    credit_card_config                      JSONB,
    debit_card_config                       JSONB,
    benefits                                JSONB,
    features                                JSONB,
    fees_and_charges                        JSONB,
    application_instructions                JSONB,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    updated_by                              VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_products_type_active ON card_products (card_type, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_card_products_code_active ON card_products (product_code, is_active, is_deleted);

-- Seed Initial Card Products:
-- 1. EDGE_CASHBACK_CARD (CREDIT)
INSERT INTO card_products (
    id,
    product_code,
    product_name,
    card_type,
    network,
    short_description,
    description,
    joining_fee,
    annual_fee,
    forex_markup_percentage,
    eligibility_min_age,
    eligibility_max_age,
    eligibility_min_monthly_income,
    eligibility_min_credit_score,
    eligibility_employment_types,
    eligibility_min_income_history_months,
    is_active,
    is_deleted,
    credit_card_config,
    debit_card_config,
    benefits,
    features,
    fees_and_charges,
    application_instructions,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'EDGE_CASHBACK_CARD',
    'FinEdge Edge Cashback Credit Card',
    'CREDIT',
    'RUPAY',
    'FinEdge Edge Cashback Credit Card with up to 5% online cashback and generous fee waiver',
    'FinEdge Edge Cashback Credit Card offers unmatched rewards on online shopping and everyday spends with generous fee waiver conditions, up to 45 days interest-free period, and seamless RuPay UPI payments.',
    499.00,
    499.00,
    3.50,
    21,
    65,
    25000.00,
    720,
    '["SALARIED", "SELF_EMPLOYED"]'::jsonb,
    6,
    TRUE,
    FALSE,
    '{
        "credit_limit_min": 30000.00,
        "credit_limit_max": 300000.00,
        "interest_free_period_days": 45,
        "finance_charge_monthly_percentage": 3.30,
        "finance_charge_apr": 39.60,
        "atm_daily_limit": 25000.00,
        "pos_daily_limit": 200000.00,
        "online_daily_limit": 200000.00,
        "cashback_online_percentage": 5.00,
        "cashback_online_monthly_cap": 500.00,
        "cashback_other_percentage": 1.00,
        "cashback_credit_method": "STATEMENT_CREDIT",
        "annual_fee_waiver_spend_threshold": 200000.00,
        "late_payment_charge_slabs": [
            {"from_amount": 0.00, "to_amount": 500.00, "charge": 0.00},
            {"from_amount": 501.00, "to_amount": 5000.00, "charge": 400.00},
            {"from_amount": 5001.00, "to_amount": 10000.00, "charge": 750.00},
            {"from_amount": 10001.00, "to_amount": null, "charge": 1200.00}
        ],
        "cash_advance_fee_percentage": 2.50,
        "cash_advance_minimum_fee": 500.00,
        "over_limit_charge": 500.00,
        "replacement_fee": 100.00
    }'::jsonb,
    NULL,
    '[
        {"title": "5% Online Cashback", "description": "5% cashback on online spending, capped at ₹500 per month."},
        {"title": "1% Across Other Spends", "description": "1% flat unlimited cashback on all other eligible retail purchases."},
        {"title": "Annual Fee Waiver", "description": "Annual fee waived on spending ₹2,00,000 or more in the previous anniversary year."},
        {"title": "Interest-Free Period", "description": "Enjoy up to 45 days of interest-free credit on retail purchases."}
    ]'::jsonb,
    '[
        "Up to 45 days interest-free period",
        "Credit limit ranging from ₹30,000 to ₹3,00,000",
        "ATM daily withdrawal limit up to ₹25,000",
        "RuPay UPI credit card linkage support",
        "Zero lost card liability upon reporting"
    ]'::jsonb,
    '[
        {"label": "Joining Fee", "value": "₹499 + GST"},
        {"label": "Annual Fee", "value": "₹499 + GST (waived on ₹2,00,000 annual spend)"},
        {"label": "APR / Finance Charge", "value": "39.6% per annum (3.3% per month)"},
        {"label": "Forex Markup", "value": "3.5%"},
        {"label": "Cash Advance Fee", "value": "2.5% (minimum ₹500)"},
        {"label": "Over Limit Charge", "value": "₹500"},
        {"label": "Replacement Fee", "value": "₹100"}
    ]'::jsonb,
    '[
        "Must be an Indian resident aged between 21 and 65 years",
        "Minimum monthly income of ₹25,000 with at least 6 months employment history",
        "Minimum credit score of 720 required",
        "Have Aadhaar and PAN handy for instant digital KYC completion"
    ]'::jsonb,
    NOW(),
    NOW(),
    'SYSTEM',
    'SYSTEM',
    0
) ON CONFLICT (product_code) DO NOTHING;

-- 2. CLASSIC_DEBIT_CARD (DEBIT)
INSERT INTO card_products (
    id,
    product_code,
    product_name,
    card_type,
    network,
    short_description,
    description,
    joining_fee,
    annual_fee,
    forex_markup_percentage,
    eligibility_min_age,
    eligibility_max_age,
    eligibility_min_monthly_income,
    eligibility_min_credit_score,
    eligibility_employment_types,
    eligibility_min_income_history_months,
    is_active,
    is_deleted,
    credit_card_config,
    debit_card_config,
    benefits,
    features,
    fees_and_charges,
    application_instructions,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
) VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'CLASSIC_DEBIT_CARD',
    'FinEdge Classic Debit Card',
    'DEBIT',
    'VISA',
    'Everyday debit card with zero joining fee, contactless payments, and fee exemptions for qualified accounts',
    'FinEdge Classic Debit Card provides seamless daily transactions, robust ATM and POS spending limits, contactless tap-and-pay security, free FinEdge ATM withdrawals, and extensive fee exemptions.',
    0.00,
    199.00,
    3.50,
    18,
    75,
    0.00,
    0,
    '["SALARIED", "SELF_EMPLOYED", "STUDENT", "RETIRED", "HOMEMAKER"]'::jsonb,
    0,
    TRUE,
    FALSE,
    NULL,
    '{
        "atm_daily_limit": 40000.00,
        "pos_daily_limit": 100000.00,
        "online_daily_limit": 100000.00,
        "contactless_transaction_limit": 5000.00,
        "free_own_bank_atm_withdrawals": -1,
        "free_other_bank_atm_transactions": 5,
        "free_other_bank_atm_location_type": "METRO",
        "additional_atm_withdrawal_fee": 21.00,
        "fee_waiver_customer_categories": [
            "Payroll Salary",
            "Campus Student",
            "Sprout Minor",
            "Everyday Savings First-Year"
        ]
    }'::jsonb,
    '[
        {"title": "Nil Joining Fee", "description": "Zero joining charges for all active account holders."},
        {"title": "Free ATM Withdrawals", "description": "Unlimited free ATM withdrawals at all FinEdge ATMs."},
        {"title": "Other Bank ATM Quota", "description": "Five free other-bank ATM transactions per month (metro locations)."},
        {"title": "Extensive Fee Exemptions", "description": "Annual fee waived for Payroll Salary, Campus Student, Sprout Minor, and first-year Everyday Savings customers."}
    ]'::jsonb,
    '[
        "Daily ATM cash withdrawal limit up to ₹40,000",
        "Daily POS spending limit up to ₹1,00,000",
        "Daily online transaction limit up to ₹1,00,000",
        "Contactless tap-and-pay transactions up to ₹5,000 without PIN",
        "Instant card control management via mobile app"
    ]'::jsonb,
    '[
        {"label": "Joining Fee", "value": "Nil"},
        {"label": "Annual Fee", "value": "₹199 + GST (waived for eligible account categories)"},
        {"label": "FinEdge ATM Transactions", "value": "Free & Unlimited"},
        {"label": "Other Bank ATM Transactions", "value": "5 free/month (metro), ₹21 + taxes per transaction thereafter"},
        {"label": "Forex Markup", "value": "3.5%"},
        {"label": "Card Replacement Fee", "value": "₹150"}
    ]'::jsonb,
    '[
        "Must hold an active FinEdge Savings or Current account",
        "Aged 18 years or older (or guardian consent for minor accounts)",
        "Select Classic Debit Card during account onboarding or request via card management portal",
        "Delivered to registered communication address within 3-5 business days"
    ]'::jsonb,
    NOW(),
    NOW(),
    'SYSTEM',
    'SYSTEM',
    0
) ON CONFLICT (product_code) DO NOTHING;
