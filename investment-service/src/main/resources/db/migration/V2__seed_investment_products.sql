-- Seed Initial FinEdge Investment Products (FD, RD, SIP, SSY) & Rate Slabs

INSERT INTO investment_products (
    id, product_code, product_name, product_type, status, active_version,
    short_description, detailed_description, currency,
    min_amount, max_amount, denomination_step, min_tenure_months, max_tenure_months,
    base_rate, max_rate, compounding_frequency, payout_options,
    premature_withdrawal_allowed, premature_penalty_pct, lock_in_months,
    loan_against_fd_allowed, max_ltv_pct, auto_renewal_supported,
    returns_guaranteed, market_linked, government_scheme,
    fund_category, benchmark_index, risk_level,
    eligibility_criteria, required_documents, benefits, regulatory_disclosures, fee_rules,
    is_deleted, created_by, updated_by, version
) VALUES
(
    '11111111-1111-1111-1111-111111111101',
    'FD_CLASSIC_001',
    'FinEdge Term Fixed Deposit',
    'FD',
    'ACTIVE',
    1,
    'Guaranteed-return term deposit with quarterly compounding and flexible payout options.',
    'Lock in guaranteed returns with FinEdge Term Fixed Deposit. Choose cumulative maturity payout or periodic monthly/quarterly/annual interest payouts. Eligible for overdraft/loan against FD up to 90% of principal.',
    'INR',
    5000.00, 50000000.00, 100.00, 3, 120,
    6.7500, 7.6000, 'QUARTERLY', 'MATURITY,MONTHLY,QUARTERLY,ANNUAL',
    TRUE, 1.00, 0,
    TRUE, 90.00, TRUE,
    TRUE, FALSE, FALSE,
    NULL, NULL, 'LOW',
    '{"minAge":18,"kycRequired":true,"residentOnly":false}',
    '["PAN Card","Aadhaar / OVD","Active FinEdge Savings or Current Account"]',
    '["Rate locked at booking","Loan/OD up to 90% against FD","Auto-renewal option","DICGC insured up to applicable limits"]',
    'Fixed Deposit returns are guaranteed by FinEdge Bank as per contracted rate at booking. Premature withdrawal attracts configured penalty.',
    '{"prematurePenaltyPct":1.00,"sweepMinimumDays":7}',
    FALSE, 'SYSTEM_SEED', 'SYSTEM_SEED', 0
),
(
    '11111111-1111-1111-1111-111111111102',
    'RD_FLEXI_001',
    'FinEdge Recurring Deposit',
    'RD',
    'ACTIVE',
    1,
    'Build disciplined savings with fixed monthly instalments and guaranteed quarterly-compounded returns.',
    'Start with as little as Rs. 500 per month in multiples of Rs. 100. First instalment is debited immediately upon booking and subsequent instalments are collected via standing instructions.',
    'INR',
    500.00, 500000.00, 100.00, 6, 120,
    6.5000, 7.2500, 'QUARTERLY', 'MATURITY',
    TRUE, 1.00, 3,
    FALSE, 0.00, FALSE,
    TRUE, FALSE, FALSE,
    NULL, NULL, 'LOW',
    '{"minAge":18,"kycRequired":true,"denominationStep":100}',
    '["PAN Card","Aadhaar / OVD","Active FinEdge Funding Account"]',
    '["Low monthly entry from Rs. 500","Standing instruction auto-debit","Guaranteed maturity value","No TDS deduction below statutory threshold"]',
    'Recurring Deposit returns are guaranteed at the contracted rate locked at booking. Missed instalments may attract configured late-payment charges.',
    '{"missedInstallmentPenalty":50.00,"prematurePenaltyPct":1.00}',
    FALSE, 'SYSTEM_SEED', 'SYSTEM_SEED', 0
),
(
    '11111111-1111-1111-1111-111111111103',
    'SIP_EQUITY_001',
    'FinEdge Systematic Investment Plan (SIP)',
    'SIP',
    'ACTIVE',
    1,
    'Goal-based systematic monthly investing across curated equity, hybrid, ELSS, and liquid fund categories.',
    'Invest a fixed amount every month on your chosen debit date. Pause, resume, modify, or cancel anytime. Note: SIP investments are market-linked and returns are not guaranteed.',
    'INR',
    500.00, 1000000.00, 100.00, 6, 360,
    12.0000, 12.0000, 'MONTHLY', 'GROWTH',
    TRUE, 0.00, 0,
    FALSE, 0.00, FALSE,
    FALSE, TRUE, FALSE,
    'LARGE_CAP_EQUITY', 'NIFTY 50 TRI', 'MODERATE_TO_HIGH',
    '{"minAge":18,"kycRequired":true,"suitabilityConsentRequired":true,"supportedCategories":["LARGE_CAP_EQUITY","FLEXI_CAP_EQUITY","HYBRID","ELSS","LIQUID_OVERNIGHT_DEBT"]}',
    '["PAN Card","KYC Verified Profile","Risk Suitability Acknowledgement"]',
    '["Flexible pause/resume/modify/cancel","Choice of Large-Cap, Flexi-Cap, Hybrid, ELSS, Liquid Debt","Automated monthly debit schedule"]',
    'MUTUAL FUND / MARKET-LINKED DISCLAIMER: Mutual fund investments are subject to market risks. Illustrative projections are hypothetical and NOT guaranteed returns. Execution runs behind a configurable integration boundary.',
    '{"exitLoadPct":1.00,"exitLoadMonths":12,"elssLockInMonths":36}',
    FALSE, 'SYSTEM_SEED', 'SYSTEM_SEED', 0
),
(
    '11111111-1111-1111-1111-111111111104',
    'SSY_GOV_001',
    'Sukanya Samriddhi Yojana (SSY)',
    'SSY',
    'ACTIVE',
    1,
    'Government of India small-savings scheme for the girl child with tax-exempt sovereign-notified returns.',
    'Designed for parents or legal guardians of a girl child below 10 years of age. 15-year deposit period and 21-year maturity period from account opening, governed by configurable Government of India scheme rules.',
    'INR',
    250.00, 150000.00, 50.00, 252, 252,
    8.2000, 8.2000, 'ANNUAL', 'MATURITY',
    TRUE, 0.00, 60,
    FALSE, 0.00, FALSE,
    FALSE, FALSE, TRUE,
    NULL, NULL, 'SOVEREIGN',
    '{"girlChildMaxAgeYears":10,"maxAccountsPerFamily":2,"annualMinDeposit":250.00,"annualMaxDeposit":150000.00,"depositYears":15,"maturityYears":21,"educationWithdrawalMaxPct":50.00}',
    '["Girl Child Birth Certificate","Guardian PAN & Aadhaar","Relationship / Legal Guardianship Proof"]',
    '["Annual deposit from Rs. 250 up to Rs. 1,50,000","EEE Tax Treatment under Section 80C (subject to prevailing tax laws)","Up to 50% partial withdrawal for higher education after age 18"]',
    'GOVERNMENT SCHEME NOTICE: SSY is a Government of India scheme. Interest rates are notified quarterly by the Ministry of Finance and applied on an effective-dated basis. FinEdge demonstration calculations do not constitute official government account opening without authorized agency integration.',
    '{"defaultRevivalFeePerYear":50.00,"prematureClosureMinYears":5}',
    FALSE, 'SYSTEM_SEED', 'SYSTEM_SEED', 0
);

-- Rate slabs for FD
INSERT INTO investment_rate_slabs (id, product_id, version_number, min_tenure_days, max_tenure_days, min_amount, max_amount, interest_rate, senior_citizen_bonus_rate, payout_frequency, effective_from, active) VALUES
('22222222-2222-2222-2222-222222222101', '11111111-1111-1111-1111-111111111101', 1, 90, 180, 5000.00, 50000000.00, 6.7500, 0.5000, 'MATURITY', '2026-01-01', TRUE),
('22222222-2222-2222-2222-222222222102', '11111111-1111-1111-1111-111111111101', 1, 181, 365, 5000.00, 50000000.00, 7.1000, 0.5000, 'MATURITY', '2026-01-01', TRUE),
('22222222-2222-2222-2222-222222222103', '11111111-1111-1111-1111-111111111101', 1, 366, 1095, 5000.00, 50000000.00, 7.5000, 0.5000, 'MATURITY', '2026-01-01', TRUE),
('22222222-2222-2222-2222-222222222104', '11111111-1111-1111-1111-111111111101', 1, 1096, 3653, 5000.00, 50000000.00, 7.6000, 0.5000, 'MATURITY', '2026-01-01', TRUE),
-- Rate slabs for RD
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 1, 180, 365, 500.00, 500000.00, 6.5000, 0.5000, 'MATURITY', '2026-01-01', TRUE),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 1, 366, 1095, 500.00, 500000.00, 7.0000, 0.5000, 'MATURITY', '2026-01-01', TRUE),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', 1, 1096, 3653, 500.00, 500000.00, 7.2500, 0.5000, 'MATURITY', '2026-01-01', TRUE),
-- Effective-dated rate for SSY
('22222222-2222-2222-2222-222222222401', '11111111-1111-1111-1111-111111111104', 1, 7665, 7665, 250.00, 150000.00, 8.2000, 0.0000, 'MATURITY', '2024-01-01', TRUE);

INSERT INTO investment_product_versions (
    id, product_id, product_code, version_number, effective_from, base_rate, max_rate, config_snapshot, change_summary, created_by
) VALUES
('33333333-3333-3333-3333-333333333101', '11111111-1111-1111-1111-111111111101', 'FD_CLASSIC_001', 1, '2026-01-01T00:00:00Z', 6.7500, 7.6000, '{"minAmount":5000,"maxAmount":50000000,"compounding":"QUARTERLY"}', 'Initial v1 seed', 'SYSTEM_SEED'),
('33333333-3333-3333-3333-333333333102', '11111111-1111-1111-1111-111111111102', 'RD_FLEXI_001', 1, '2026-01-01T00:00:00Z', 6.5000, 7.2500, '{"minMonthly":500,"denominationStep":100,"compounding":"QUARTERLY"}', 'Initial v1 seed', 'SYSTEM_SEED'),
('33333333-3333-3333-3333-333333333103', '11111111-1111-1111-1111-111111111103', 'SIP_EQUITY_001', 1, '2026-01-01T00:00:00Z', 12.0000, 12.0000, '{"marketLinked":true,"returnsGuaranteed":false}', 'Initial v1 seed', 'SYSTEM_SEED'),
('33333333-3333-3333-3333-333333333104', '11111111-1111-1111-1111-111111111104', 'SSY_GOV_001', 1, '2024-01-01T00:00:00Z', 8.2000, 8.2000, '{"depositYears":15,"maturityYears":21,"annualMin":250,"annualMax":150000}', 'Initial v1 seed', 'SYSTEM_SEED');
