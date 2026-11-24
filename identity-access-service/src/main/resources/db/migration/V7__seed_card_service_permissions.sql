-- ====================================================================
-- V7: SEED CARD SERVICE PERMISSIONS AND ROLE MAPPINGS
-- ====================================================================

-- 1. SEED CARD SERVICE PERMISSIONS
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
    (gen_random_uuid(), 'CARD_APPLY', 'Apply for a new credit or debit card', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_VIEW', 'View own payment and credit cards and card applications', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_MANAGE_OWN', 'Manage controls and settings of own cards', 'CARD_MANAGEMENT', NOW(), NOW()),

    -- Operations & Management Permissions
    (gen_random_uuid(), 'CARD_APPLICATION_READ_ALL', 'View all card applications across bank', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_APPLICATION_APPROVE', 'Approve card applications and issue cards', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_APPLICATION_REJECT', 'Reject card applications', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_BLOCK', 'Block cards for security or risk', 'CARD_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'CARD_ADMIN', 'Full administrative management of cards and card applications', 'CARD_MANAGEMENT', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. MAP CUSTOMER ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.code IN (
    'CARD_APPLY',
    'CARD_VIEW',
    'CARD_MANAGE_OWN'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. MAP OPERATIONS ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'OPERATIONS'
  AND p.code IN (
    'CARD_VIEW',
    'CARD_APPLICATION_READ_ALL',
    'CARD_APPLICATION_APPROVE',
    'CARD_APPLICATION_REJECT',
    'CARD_BLOCK'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. MAP MANAGER ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'MANAGER'
  AND p.code IN (
    'CARD_VIEW',
    'CARD_APPLICATION_READ_ALL',
    'CARD_APPLICATION_APPROVE',
    'CARD_APPLICATION_REJECT',
    'CARD_BLOCK',
    'CARD_ADMIN'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. MAP ADMIN ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
  AND p.code IN (
    'CARD_APPLY',
    'CARD_VIEW',
    'CARD_MANAGE_OWN',
    'CARD_APPLICATION_READ_ALL',
    'CARD_APPLICATION_APPROVE',
    'CARD_APPLICATION_REJECT',
    'CARD_BLOCK',
    'CARD_ADMIN'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
