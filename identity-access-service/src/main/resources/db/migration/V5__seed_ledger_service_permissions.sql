-- ====================================================================
-- V5: SEED LEDGER & TRANSACTION SERVICE PERMISSIONS AND ROLE MAPPINGS
-- ====================================================================

-- 1. SEED LEDGER PERMISSIONS
INSERT INTO permissions (
    id,
    code,
    description,
    module,
    created_at,
    updated_at
)
VALUES
    -- Customer Permissions
    (gen_random_uuid(), 'ACCOUNT_BALANCE_READ_OWN', 'View own account ledger and available balances', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_TRANSACTION_READ_OWN', 'View own account transaction history', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_TRANSFER_CREATE_OWN', 'Initiate fund transfers between accounts', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_DEPOSIT_CREATE_OWN', 'Initiate deposits to own account', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_WITHDRAWAL_CREATE_OWN', 'Initiate withdrawals from own account', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'TRANSACTION_RECEIPT_READ_OWN', 'Download and view transaction receipts', 'LEDGER_TRANSACTION', NOW(), NOW()),

    -- Operations Permissions
    (gen_random_uuid(), 'TRANSACTION_READ_ALL', 'View all transactions across all accounts', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'TRANSACTION_SEARCH', 'Search across transaction audit logs', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'TRANSACTION_REVERSE', 'Initiate transaction reversal and compensating postings', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'DEPOSIT_VERIFY', 'Verify and post pending deposits', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'DEPOSIT_REJECT', 'Reject unverified deposits', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'WITHDRAWAL_APPROVE', 'Approve and post pending withdrawals', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'WITHDRAWAL_REJECT', 'Reject unapproved withdrawals', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'HOLD_READ_ALL', 'Inspect all active and released financial holds', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'HOLD_MANAGE', 'Place and manage account holds', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_ACCOUNT_READ', 'Inspect ledger account balances and charts of accounts', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_ACCOUNT_FREEZE', 'Freeze ledger accounts for operations', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_ACCOUNT_MANAGE', 'Manage ledger account status and lifecycle', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'RECONCILIATION_RUN', 'Trigger financial ledger reconciliation runs', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'RECONCILIATION_READ', 'Inspect reconciliation reports and discrepancies', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'RECONCILIATION_RESOLVE', 'Resolve detected reconciliation discrepancies', 'LEDGER_TRANSACTION', NOW(), NOW()),
    (gen_random_uuid(), 'BALANCE_PROJECTION_REBUILD', 'Rebuild account balance projection from immutable entries', 'LEDGER_TRANSACTION', NOW(), NOW()),

    -- Internal Service Permissions
    (gen_random_uuid(), 'LEDGER_POSTING_CREATE', 'Create internal double-entry ledger postings', 'LEDGER_INTERNAL', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_ACCOUNT_READ_INTERNAL', 'Read internal ledger account records', 'LEDGER_INTERNAL', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_BALANCE_READ_INTERNAL', 'Read internal ledger balances', 'LEDGER_INTERNAL', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_HOLD_CREATE_INTERNAL', 'Create internal account financial reservations', 'LEDGER_INTERNAL', NOW(), NOW()),
    (gen_random_uuid(), 'LEDGER_HOLD_RELEASE_INTERNAL', 'Release internal account financial reservations', 'LEDGER_INTERNAL', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. MAP CUSTOMER ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.code IN (
    'ACCOUNT_BALANCE_READ_OWN',
    'ACCOUNT_TRANSACTION_READ_OWN',
    'ACCOUNT_TRANSFER_CREATE_OWN',
    'ACCOUNT_DEPOSIT_CREATE_OWN',
    'ACCOUNT_WITHDRAWAL_CREATE_OWN',
    'TRANSACTION_RECEIPT_READ_OWN'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. MAP OPERATIONS ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'OPERATIONS'
  AND p.code IN (
    'TRANSACTION_READ_ALL',
    'TRANSACTION_SEARCH',
    'TRANSACTION_REVERSE',
    'DEPOSIT_VERIFY',
    'DEPOSIT_REJECT',
    'WITHDRAWAL_APPROVE',
    'WITHDRAWAL_REJECT',
    'HOLD_READ_ALL',
    'HOLD_MANAGE',
    'LEDGER_ACCOUNT_READ',
    'LEDGER_ACCOUNT_FREEZE',
    'LEDGER_ACCOUNT_MANAGE',
    'RECONCILIATION_RUN',
    'RECONCILIATION_READ',
    'RECONCILIATION_RESOLVE'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. MAP MANAGER ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'MANAGER'
  AND p.code IN (
    'TRANSACTION_READ_ALL',
    'TRANSACTION_SEARCH',
    'TRANSACTION_REVERSE',
    'DEPOSIT_VERIFY',
    'DEPOSIT_REJECT',
    'WITHDRAWAL_APPROVE',
    'WITHDRAWAL_REJECT',
    'HOLD_READ_ALL',
    'HOLD_MANAGE',
    'LEDGER_ACCOUNT_READ',
    'LEDGER_ACCOUNT_FREEZE',
    'LEDGER_ACCOUNT_MANAGE',
    'RECONCILIATION_RUN',
    'RECONCILIATION_READ',
    'RECONCILIATION_RESOLVE',
    'BALANCE_PROJECTION_REBUILD'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. MAP ADMIN ROLE PERMISSIONS (Admin gets all permissions)
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;
