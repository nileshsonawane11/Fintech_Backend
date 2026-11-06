-- ====================================================================
-- V2: SEED SYSTEM LEDGER ACCOUNTS & INITIAL SNAPSHOTS
-- ====================================================================

-- 1. SEED SYSTEM LEDGER ACCOUNTS
INSERT INTO ledger_accounts (
    id, ledger_account_id, bank_account_id, account_reference, customer_id,
    account_name, account_type, account_subtype, normal_balance, currency,
    status, created_at, updated_at, version
)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'LA-BANK-CASH-INR',
        NULL,
        'SYSTEM-CASH-INR',
        NULL,
        'Bank Vault Cash Account (INR)',
        'ASSET',
        'BANK_CASH',
        'DEBIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'LA-BANK-SETTLEMENT-INR',
        NULL,
        'SYSTEM-SETTLEMENT-INR',
        NULL,
        'Central Settlement Account (INR)',
        'ASSET',
        'BANK_SETTLEMENT',
        'DEBIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'LA-BANK-CLEARING-INR',
        NULL,
        'SYSTEM-CLEARING-INR',
        NULL,
        'Interbank Clearing Account (INR)',
        'ASSET',
        'BANK_SETTLEMENT',
        'DEBIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'LA-INTEREST-EXPENSE-INR',
        NULL,
        'SYSTEM-INTEREST-INR',
        NULL,
        'Interest Expense Account (INR)',
        'EXPENSE',
        'INTEREST_EXPENSE',
        'DEBIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'LA-FEE-REVENUE-INR',
        NULL,
        'SYSTEM-FEE-INR',
        NULL,
        'Fee & Service Charge Revenue Account (INR)',
        'REVENUE',
        'FEE_REVENUE',
        'CREDIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    ),
    (
        '10000000-0000-0000-0000-000000000006',
        'LA-SUSPENSE-INR',
        NULL,
        'SYSTEM-SUSPENSE-INR',
        NULL,
        'Operational Suspense Account (INR)',
        'LIABILITY',
        'SUSPENSE',
        'CREDIT',
        'INR',
        'ACTIVE',
        NOW(),
        NOW(),
        0
    )
ON CONFLICT (ledger_account_id) DO NOTHING;

-- 2. SEED INITIAL BALANCE SNAPSHOTS FOR SYSTEM ACCOUNTS
INSERT INTO ledger_balance_snapshots (
    id, ledger_account_id, debit_total, credit_total, ledger_balance,
    currency, last_entry_id, last_posted_at, updated_at, version
)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0),
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 0.0000, 0.0000, 0.0000, 'INR', NULL, NULL, NOW(), 0)
ON CONFLICT (ledger_account_id) DO NOTHING;
