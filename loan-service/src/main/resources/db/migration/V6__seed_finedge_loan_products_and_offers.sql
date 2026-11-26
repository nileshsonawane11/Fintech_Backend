-- V6: Seed the 7 FinEdge loan products, fee configurations, and initial dynamic offer

-- Ensure legacy seeded products have fee rows so every product has a fee configuration
INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    gen_random_uuid(), lp.id, 'PERCENTAGE', 1.0000, 1000.00, 25000.00,
    2.00, '2% on principal prepaid after 12 EMIs', 3.00, '3% on outstanding principal',
    2.00, '2% per month on overdue EMI amount', 400.00,
    '{"documentation_charges": 500, "gst_applicable": true}'::jsonb
FROM loan_products lp
WHERE NOT EXISTS (SELECT 1 FROM loan_product_fees lpf WHERE lpf.product_id = lp.id);

-- 1. HOME_LOAN - FinEdge Home Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000001',
    'HOME_LOAN',
    'FinEdge Home Loan',
    'HOME',
    'HOME',
    'Flexible home financing up to ₹5 Cr with balance transfer, top-up, and step-up EMI support.',
    'FinEdge Home Loan empowers you to purchase ready-to-move or under-construction homes, construct on your own plot, renovate existing residences, or transfer high-cost home loans with zero prepayment/foreclosure fees for floating-rate individual borrowers.',
    'INR',
    500000.00,
    50000000.00,
    60,
    360,
    8.35,
    10.15,
    'REDUCING_BALANCE',
    85.00,
    40000.00,
    60.00,
    TRUE,
    TRUE,
    'ACTIVE',
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    60,
    '["Purchase of ready-to-move property", "Under-construction residential unit", "Self-construction on own plot", "Home improvement or major renovation", "Balance transfer of existing home loan"]'::jsonb,
    '["SALARIED", "SELF_EMPLOYED_PROFESSIONAL", "SELF_EMPLOYED_BUSINESS", "RETIRED"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "SALARY_SLIPS_3_MONTHS", "BANK_STATEMENTS_6_MONTHS", "PROPERTY_TITLE_DEED", "APPROVED_BUILDING_PLAN"]'::jsonb,
    '{"min_age": 21, "max_age": 65, "min_credit_score": 700, "max_foir_percentage": 60, "step_up_emi_years": 5, "floating_rate_individual_foreclosure": "NIL"}'::jsonb,
    '["HOME_FESTIVE_2026"]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000001', lp.id,
    'PERCENTAGE', 0.4000, 5000.00, 25000.00,
    0.00, 'NIL for floating-rate individual borrowers',
    0.00, 'NIL for floating-rate individual borrowers',
    2.00, '2% per month on overdue EMI amount',
    400.00,
    '{"legal_and_technical_valuation": "As per actuals", "cersai_charges": 100, "statement_of_account_fee": 0, "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'HOME_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 2. BUSINESS_LOAN - FinEdge Business Growth Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000002',
    'BUSINESS_LOAN',
    'FinEdge Business Growth Loan',
    'BUSINESS',
    'BUSINESS',
    'Collateral-free working capital and expansion financing for MSMEs and professionals.',
    'FinEdge Business Growth Loan provides rapid, unsecured working capital, equipment financing, and expansion credit for established businesses and self-employed professionals with flexible tenures up to 60 months.',
    'INR',
    200000.00,
    7500000.00,
    12,
    60,
    10.90,
    15.50,
    'REDUCING_BALANCE',
    NULL,
    50000.00,
    55.00,
    FALSE,
    TRUE,
    'ACTIVE',
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    0,
    '["Working capital and operating expenses", "Raw material and inventory bulk purchase", "Machinery, tools, and plant equipment", "Retail outlet or office branch expansion", "Receivables financing & gap funding"]'::jsonb,
    '["SELF_EMPLOYED_BUSINESS", "SELF_EMPLOYED_PROFESSIONAL"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "GST_RETURNS_12_MONTHS", "ITR_LAST_2_YEARS", "BUSINESS_BANK_STATEMENTS_6_MONTHS", "BUSINESS_REGISTRATION_PROOF"]'::jsonb,
    '{"min_age": 23, "max_age": 65, "min_business_vintage_months": 24, "min_credit_score": 700, "max_foir_percentage": 55}'::jsonb,
    '["MSME_GROWTH_PF_OFF"]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000002', lp.id,
    'PERCENTAGE', 1.5000, 3000.00, 50000.00,
    2.00, '2% on part-prepayment after 6 months lock-in',
    3.00, '3% on outstanding principal after 6 months lock-in',
    2.50, '2.5% per month on overdue EMI amount',
    500.00,
    '{"stamp_duty": "As per state law", "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'BUSINESS_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 3. AGRICULTURE_LOAN - FinEdge Krishi Agriculture Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000003',
    'AGRICULTURE_LOAN',
    'FinEdge Krishi Agriculture Loan',
    'AGRICULTURE',
    'AGRICULTURE',
    'Low-interest crop, tractor, irrigation, and allied agro-activity credit for farmers.',
    'FinEdge Krishi Agriculture Loan supports seasonal cultivation, farm mechanization, micro-irrigation, and dairy/livestock projects with preferential interest rates and seasonal repayment flexibility.',
    'INR',
    50000.00,
    5000000.00,
    12,
    84,
    6.85,
    9.25,
    'REDUCING_BALANCE',
    80.00,
    15000.00,
    65.00,
    TRUE,
    TRUE,
    'ACTIVE',
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    0,
    '["Kharif / Rabi seasonal crop cultivation", "Farm mechanization & tractor purchase", "Drip irrigation & borewell installation", "Dairy, livestock & cattle farming", "Horticulture, poultry & allied agro-projects"]'::jsonb,
    '["SELF_EMPLOYED_BUSINESS", "OTHER"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "LAND_HOLDING_RECORD_7_12", "BANK_STATEMENTS_6_MONTHS", "EQUIPMENT_QUOTATION_IF_APPLICABLE"]'::jsonb,
    '{"min_age": 21, "max_age": 70, "min_credit_score": 650, "max_foir_percentage": 65, "priority_sector_lending": true}'::jsonb,
    '[]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000003', lp.id,
    'PERCENTAGE', 0.2500, 500.00, 5000.00,
    0.00, 'NIL',
    0.00, 'NIL',
    1.50, '1.5% per month on overdue amount beyond harvest grace period',
    250.00,
    '{"crop_insurance_optional": true, "gst_applicable": false}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'AGRICULTURE_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 4. VEHICLE_LOAN - FinEdge Vehicle Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000004',
    'VEHICLE_LOAN',
    'FinEdge Vehicle Loan',
    'VEHICLE',
    'VEHICLE',
    'Up to 90% on-road financing for new cars, certified pre-owned vehicles, and two-wheelers.',
    'FinEdge Vehicle Loan offers fast sanction for new and used personal cars, two-wheelers, and EVs with competitive fixed/reducing rates and up to 90% on-road financing.',
    'INR',
    100000.00,
    10000000.00,
    12,
    84,
    8.90,
    11.75,
    'REDUCING_BALANCE',
    90.00,
    25000.00,
    55.00,
    TRUE,
    TRUE,
    'ACTIVE',
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    0,
    '["New personal 4-wheeler purchase", "Pre-owned / certified used car purchase", "Two-wheeler purchase (scooter/motorcycle)", "Commercial light vehicle purchase"]'::jsonb,
    '["SALARIED", "SELF_EMPLOYED_PROFESSIONAL", "SELF_EMPLOYED_BUSINESS", "RETIRED"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "DRIVING_LICENSE", "SALARY_SLIPS_3_MONTHS", "PROFORMA_INVOICE_OR_RC"]'::jsonb,
    '{"min_age": 21, "max_age": 65, "min_credit_score": 680, "max_foir_percentage": 55, "ev_green_discount_eligible": true}'::jsonb,
    '[]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000004', lp.id,
    'PERCENTAGE', 0.5000, 2000.00, 10000.00,
    2.00, '2% on prepaid principal after 12 months',
    2.00, '2% on outstanding principal after 12 months',
    2.00, '2% per month on overdue EMI amount',
    450.00,
    '{"hypothecation_rc_endorsement_fee": 500, "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'VEHICLE_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 5. GOLD_LOAN - FinEdge Gold Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000005',
    'GOLD_LOAN',
    'FinEdge Gold Loan',
    'GOLD',
    'GOLD',
    'Instant liquidity against hallmarked gold ornaments up to 75% LTV with zero foreclosure penalty.',
    'FinEdge Gold Loan unlocks instant funds against 18K-24K gold jewellery stored in bank-grade insured vaults, featuring minimal documentation and zero prepayment or foreclosure charges.',
    'INR',
    25000.00,
    5000000.00,
    3,
    36,
    8.60,
    11.00,
    'REDUCING_BALANCE',
    75.00,
    15000.00,
    60.00,
    TRUE,
    TRUE,
    'ACTIVE',
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    0,
    '["Immediate personal liquidity need", "Agricultural working capital", "Small business funding requirement", "Emergency medical expenses", "Education fee payment"]'::jsonb,
    '["SALARIED", "SELF_EMPLOYED_PROFESSIONAL", "SELF_EMPLOYED_BUSINESS", "RETIRED", "OTHER"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "GOLD_ASSAY_VALUATION_CERTIFICATE"]'::jsonb,
    '{"min_age": 18, "max_age": 75, "min_gold_purity_karat": 18, "max_ltv_rbi_cap": 75}'::jsonb,
    '[]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000005', lp.id,
    'PERCENTAGE', 0.3000, 500.00, 5000.00,
    0.00, 'NIL',
    0.00, 'NIL',
    2.00, '2% per month on overdue amount',
    300.00,
    '{"gold_valuation_assay_fee": 250, "vault_insurance": "Included", "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'GOLD_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 6. LAP_LOAN - FinEdge Loan Against Property
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000006',
    'LAP_LOAN',
    'FinEdge Loan Against Property',
    'LAP',
    'LAP',
    'High-value secured financing up to ₹3 Cr against residential or commercial property.',
    'FinEdge Loan Against Property enables homeowners and businesses to unlock equity from residential or commercial real estate up to 70% LTV with tenures up to 15 years and balance transfer support.',
    'INR',
    1000000.00,
    30000000.00,
    36,
    180,
    9.15,
    12.40,
    'REDUCING_BALANCE',
    70.00,
    60000.00,
    55.00,
    TRUE,
    TRUE,
    'ACTIVE',
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    0,
    '["Business expansion and capital infusion", "Debt consolidation & high-cost loan closure", "Higher education for family members", "Major medical treatments and procedures", "Lawful personal financial requirement"]'::jsonb,
    '["SALARIED", "SELF_EMPLOYED_PROFESSIONAL", "SELF_EMPLOYED_BUSINESS"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "ITR_LAST_2_YEARS", "BANK_STATEMENTS_6_MONTHS", "PROPERTY_TITLE_DEED", "ENCUMBRANCE_CERTIFICATE"]'::jsonb,
    '{"min_age": 23, "max_age": 65, "min_credit_score": 700, "max_foir_percentage": 55, "max_ltv_percentage": 70}'::jsonb,
    '[]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000006', lp.id,
    'PERCENTAGE', 0.7500, 10000.00, 50000.00,
    0.00, 'NIL for individual floating-rate non-business borrowers; 2% otherwise',
    2.00, '2% for business/fixed-rate borrowers; NIL for individual floating-rate',
    2.00, '2% per month on overdue EMI amount',
    500.00,
    '{"legal_and_technical_valuation": 3500, "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'LAP_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- 7. EDUCATION_LOAN - FinEdge Education Loan
INSERT INTO loan_products (
    id, product_code, product_name, loan_type, loan_category, short_description, detailed_description,
    currency, min_amount, max_amount, min_tenure_months, max_tenure_months,
    interest_rate_from, maximum_interest_rate, interest_type,
    maximum_ltv_percentage, minimum_monthly_income, max_foir_percentage,
    secured, active, status, is_deleted,
    balance_transfer_allowed, top_up_allowed, step_up_emi_allowed, step_up_emi_duration_months,
    eligible_loan_purposes, employment_types, required_documents, eligibility_rules, applicable_offers,
    created_by, updated_by
) VALUES (
    '11111111-1111-4111-8111-000000000007',
    'EDUCATION_LOAN',
    'FinEdge Education Loan',
    'EDUCATION',
    'EDUCATION',
    'Comprehensive domestic and overseas higher-education funding with step-up EMI flexibility.',
    'FinEdge Education Loan covers tuition, accommodation, travel, and study equipment for accredited Indian and international universities with moratorium/step-up EMI options and zero prepayment charges.',
    'INR',
    100000.00,
    15000000.00,
    12,
    180,
    9.40,
    12.85,
    'REDUCING_BALANCE',
    85.00,
    25000.00,
    55.00,
    FALSE,
    TRUE,
    'ACTIVE',
    FALSE,
    TRUE,
    FALSE,
    TRUE,
    24,
    '["Undergraduate degree program", "Postgraduate / Master degree program", "Professional diploma / certification", "Doctoral / Research fellowship program", "Overseas university education"]'::jsonb,
    '["SALARIED", "SELF_EMPLOYED_PROFESSIONAL", "SELF_EMPLOYED_BUSINESS", "RETIRED", "OTHER"]'::jsonb,
    '["PAN_CARD", "AADHAAR_CARD", "UNIVERSITY_ADMISSION_LETTER", "FEE_STRUCTURE", "CO_APPLICANT_INCOME_PROOF"]'::jsonb,
    '{"min_age": 18, "max_age": 45, "co_applicant_required": true, "collateral_required_above": 750000, "moratorium_supported": true}'::jsonb,
    '[]'::jsonb,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (product_code) DO NOTHING;

INSERT INTO loan_product_fees (
    id, product_id, processing_fee_type, processing_fee_value, minimum_processing_fee, maximum_processing_fee,
    prepayment_charge_percentage, prepayment_charges, foreclosure_charge_percentage, foreclosure_charges,
    late_payment_penalty, late_payment_penalty_description, cheque_bounce_charges, additional_charges
)
SELECT
    '22222222-2222-4222-8222-000000000007', lp.id,
    'PERCENTAGE', 0.5000, 2500.00, 15000.00,
    0.00, 'NIL',
    0.00, 'NIL',
    1.50, '1.5% per month on overdue EMI amount',
    300.00,
    '{"forex_remittance_charges": "At actuals", "gst_applicable": true}'::jsonb
FROM loan_products lp WHERE lp.product_code = 'EDUCATION_LOAN'
ON CONFLICT (product_id) DO NOTHING;

-- Seed initial active dynamic promotional offer (applies only to applications submitted after activation)
INSERT INTO loan_promotional_offers (
    id, offer_code, offer_name, description, status, current_version,
    valid_from, valid_to, activated_at,
    applicable_product_codes, eligibility_conditions, discount_type,
    interest_rate_discount, processing_fee_discount_percentage, processing_fee_waiver_amount,
    cashback_amount, cashback_percentage, max_cashback_amount, priority,
    created_by, updated_by
) VALUES (
    '33333333-3333-4333-8333-000000000001',
    'HOME_FESTIVE_2026',
    'FinEdge Home Loan Festive Rate Advantage',
    '0.15% p.a. interest rate concession and 50% processing fee waiver on eligible FinEdge Home Loan applications.',
    'ACTIVE',
    1,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '180 days',
    NOW() - INTERVAL '1 day',
    '["HOME_LOAN"]'::jsonb,
    '{"minLoanAmount": 1500000, "minMonthlyIncome": 50000}'::jsonb,
    'COMBINED',
    0.15,
    50.00,
    0.00,
    0.00,
    0.00,
    0.00,
    10,
    'SYSTEM',
    'SYSTEM'
) ON CONFLICT (offer_code) DO NOTHING;

INSERT INTO loan_offer_versions (
    id, offer_id, offer_code, version_number, status,
    valid_from, valid_to, applicable_product_codes, eligibility_conditions,
    discount_type, interest_rate_discount, processing_fee_discount_percentage,
    processing_fee_waiver_amount, cashback_amount, cashback_percentage, max_cashback_amount,
    snapshot_json, created_by
)
SELECT
    '44444444-4444-4444-8444-000000000001',
    o.id, o.offer_code, 1, o.status,
    o.valid_from, o.valid_to, o.applicable_product_codes, o.eligibility_conditions,
    o.discount_type, o.interest_rate_discount, o.processing_fee_discount_percentage,
    o.processing_fee_waiver_amount, o.cashback_amount, o.cashback_percentage, o.max_cashback_amount,
    '{"offerCode": "HOME_FESTIVE_2026", "version": 1, "interestRateDiscount": 0.15, "processingFeeDiscountPercentage": 50.00}'::jsonb,
    'SYSTEM'
FROM loan_promotional_offers o WHERE o.offer_code = 'HOME_FESTIVE_2026'
ON CONFLICT (offer_id, version_number) DO NOTHING;
