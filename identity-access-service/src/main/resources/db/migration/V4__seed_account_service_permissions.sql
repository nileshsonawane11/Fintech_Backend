-- ====================================================================
-- V4: SEED ACCOUNT SERVICE PERMISSIONS AND ROLE MAPPINGS
-- ====================================================================

-- 1. SEED ACCOUNT SERVICE PERMISSIONS
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
    (gen_random_uuid(), 'ACCOUNT_PRODUCT_READ', 'Browse active account products', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLY', 'Apply for a new bank account', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_READ_OWN', 'View own bank accounts and balances', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLICATION_READ_OWN', 'View own account applications', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLICATION_CANCEL_OWN', 'Cancel own account application', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_NOMINEE_CREATE_OWN', 'Add nominee to own account', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_NOMINEE_READ_OWN', 'View nominees of own account', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_NOMINEE_UPDATE_OWN', 'Update nominee on own account', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_NOMINEE_DELETE_OWN', 'Remove nominee from own account', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),

    -- Operations Permissions
    (gen_random_uuid(), 'ACCOUNT_READ_ALL', 'View all customer accounts across bank', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLICATION_READ_ALL', 'View all account applications', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLICATION_APPROVE', 'Approve customer account applications', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_APPLICATION_REJECT', 'Reject customer account applications', 'ACCOUNT_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_HOLD_CREATE', 'Place holds on customer accounts', 'ACCOUNT_HOLD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_HOLD_RELEASE', 'Release holds on customer accounts', 'ACCOUNT_HOLD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_HOLD_READ', 'View holds on customer accounts', 'ACCOUNT_HOLD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_FREEZE', 'Freeze bank accounts', 'ACCOUNT_LIFECYCLE_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_UNFREEZE', 'Unfreeze bank accounts', 'ACCOUNT_LIFECYCLE_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_BLOCK', 'Block bank accounts for fraud or risk', 'ACCOUNT_LIFECYCLE_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_CLOSE', 'Close customer bank accounts', 'ACCOUNT_LIFECYCLE_MANAGEMENT', NOW(), NOW()),

    -- Admin Permissions
    (gen_random_uuid(), 'ACCOUNT_PRODUCT_CREATE', 'Create account catalog products', 'ACCOUNT_CATALOG_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_PRODUCT_UPDATE', 'Update account catalog products', 'ACCOUNT_CATALOG_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_PRODUCT_STATUS_UPDATE', 'Activate or deactivate account catalog products', 'ACCOUNT_CATALOG_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'ACCOUNT_CONFIGURATION_MANAGE', 'Manage account service system configurations', 'ACCOUNT_MANAGEMENT', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. MAP CUSTOMER ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.code IN (
    'ACCOUNT_PRODUCT_READ',
    'ACCOUNT_APPLY',
    'ACCOUNT_READ_OWN',
    'ACCOUNT_APPLICATION_READ_OWN',
    'ACCOUNT_APPLICATION_CANCEL_OWN',
    'ACCOUNT_NOMINEE_CREATE_OWN',
    'ACCOUNT_NOMINEE_READ_OWN',
    'ACCOUNT_NOMINEE_UPDATE_OWN',
    'ACCOUNT_NOMINEE_DELETE_OWN'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. MAP OPERATIONS ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'OPERATIONS'
  AND p.code IN (
    'ACCOUNT_PRODUCT_READ',
    'ACCOUNT_READ_ALL',
    'ACCOUNT_APPLICATION_READ_ALL',
    'ACCOUNT_APPLICATION_APPROVE',
    'ACCOUNT_APPLICATION_REJECT',
    'ACCOUNT_HOLD_CREATE',
    'ACCOUNT_HOLD_RELEASE',
    'ACCOUNT_HOLD_READ',
    'ACCOUNT_FREEZE',
    'ACCOUNT_UNFREEZE',
    'ACCOUNT_BLOCK',
    'ACCOUNT_CLOSE'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. MAP MANAGER ROLE PERMISSIONS (Manager gets ops + read)
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'MANAGER'
  AND p.code IN (
    'ACCOUNT_PRODUCT_READ',
    'ACCOUNT_READ_ALL',
    'ACCOUNT_APPLICATION_READ_ALL',
    'ACCOUNT_APPLICATION_APPROVE',
    'ACCOUNT_APPLICATION_REJECT',
    'ACCOUNT_HOLD_CREATE',
    'ACCOUNT_HOLD_RELEASE',
    'ACCOUNT_HOLD_READ',
    'ACCOUNT_FREEZE',
    'ACCOUNT_UNFREEZE',
    'ACCOUNT_BLOCK',
    'ACCOUNT_CLOSE'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. MAP ADMIN ROLE PERMISSIONS (Admin gets all permissions)
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;
