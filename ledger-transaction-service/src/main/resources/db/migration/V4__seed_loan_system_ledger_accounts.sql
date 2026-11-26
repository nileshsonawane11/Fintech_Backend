-- ====================================================================
-- V4: SEED LOAN GENERAL LEDGER SYSTEM ACCOUNT SNAPSHOTS (INR)
-- ====================================================================

INSERT INTO ledger_balance_snapshots (
    id, account_id, debit_total, credit_total, ledger_balance, currency,
    last_entry_id, last_posted_at, updated_at, version
)
VALUES
    ('20000000-0000-0000-0000-000000000010', 'SYSTEM-LOAN-PRINCIPAL-INR', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000011', 'SYSTEM-LOAN-INTEREST-INR', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000012', 'SYSTEM-LOAN-PENALTY-INR', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0)
ON CONFLICT (account_id) DO NOTHING;