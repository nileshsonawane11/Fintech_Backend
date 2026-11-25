-- ====================================================================
-- V6: Seed Default Payment Fees & Transaction Limits (INR)
-- ====================================================================

INSERT INTO payment_fee_configs (
    id, transfer_mode, currency, flat_fee, percent_fee, tax_percent, min_fee, max_fee, active, updated_at
) VALUES
    ('fee-imps-inr', 'IMPS', 'INR', 5.0000, 0.0000, 18.0000, 5.0000, 5.0000, TRUE, NOW()),
    ('fee-neft-inr', 'NEFT', 'INR', 2.5000, 0.0000, 18.0000, 2.5000, 2.5000, TRUE, NOW()),
    ('fee-rtgs-inr', 'RTGS', 'INR', 25.0000, 0.0000, 18.0000, 25.0000, 25.0000, TRUE, NOW()),
    ('fee-upi-inr', 'UPI', 'INR', 0.0000, 0.0000, 18.0000, 0.0000, 0.0000, TRUE, NOW()),
    ('fee-incoming-inr', 'INCOMING', 'INR', 0.0000, 0.0000, 18.0000, 0.0000, 0.0000, TRUE, NOW())
ON CONFLICT (transfer_mode) DO NOTHING;

INSERT INTO payment_limit_configs (
    id, transfer_mode, currency, min_amount, max_per_txn, daily_limit, active, updated_at
) VALUES
    ('lim-imps-inr', 'IMPS', 'INR', 1.0000, 500000.0000, 1000000.0000, TRUE, NOW()),
    ('lim-neft-inr', 'NEFT', 'INR', 1.0000, 1000000.0000, 2500000.0000, TRUE, NOW()),
    ('lim-rtgs-inr', 'RTGS', 'INR', 200000.0000, 5000000.0000, 10000000.0000, TRUE, NOW()),
    ('lim-upi-inr', 'UPI', 'INR', 1.0000, 100000.0000, 100000.0000, TRUE, NOW())
ON CONFLICT (transfer_mode) DO NOTHING;
