
-- =========================================================
-- V3: SEED PERMISSIONS AND ROLE-PERMISSION MAPPINGS
-- =========================================================
-- Insert missing roles explicitly
INSERT INTO roles (
    id,
    name,
    description,
    created_at
)
VALUES
    (
        gen_random_uuid(),
        'CUSTOMER',
        'Bank customer',
        NOW()
    ),
    (
        gen_random_uuid(),
        'OPERATIONS',
        'Internal bank employee',
        NOW()
    ),
    (
        gen_random_uuid(),
        'MANAGER',
        'Bank manager',
        NOW()
    ),
    (
        gen_random_uuid(),
        'ADMIN',
        'System administrator',
        NOW()
    )
    ON CONFLICT (name) DO NOTHING;
-- =========================================================
-- 1. ENSURE REQUIRED DEFAULTS
-- =========================================================

ALTER TABLE permissions
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

-- =========================================================
-- 2. SEED PERMISSIONS
-- Explicitly provide EVERY column.
-- =========================================================

INSERT INTO permissions (
    id,
    code,
    description,
    module,
    created_at,
    updated_at
)
VALUES
    (
        gen_random_uuid(),
        'USER_VIEW',
        'View internal user accounts',
        'USER_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'USER_CREATE',
        'Create internal user accounts',
        'USER_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'USER_MANAGE',
        'Manage internal user accounts',
        'USER_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'ROLE_VIEW',
        'View available roles',
        'ROLE_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'ROLE_MANAGE',
        'Create and manage roles',
        'ROLE_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'PERMISSION_VIEW',
        'View available permissions',
        'PERMISSION_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'PERMISSION_CREATE',
        'Create permissions',
        'PERMISSION_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'PERMISSION_UPDATE',
        'Update permissions',
        'PERMISSION_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'PERMISSION_ASSIGN',
        'Assign permissions to roles and users',
        'PERMISSION_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'CUSTOMER_VIEW',
        'View customer information',
        'CUSTOMER_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'CUSTOMER_MANAGE',
        'Manage customer information',
        'CUSTOMER_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'KYC_REVIEW',
        'Review customer KYC applications',
        'KYC_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'KYC_APPROVE',
        'Approve or reject customer KYC applications',
        'KYC_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'ACCOUNT_VIEW',
        'View customer bank accounts',
        'ACCOUNT_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'ACCOUNT_FREEZE',
        'Freeze or unfreeze customer bank accounts',
        'ACCOUNT_MANAGEMENT',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'REPORT_VIEW',
        'View system and operational reports',
        'REPORT_MANAGEMENT',
        NOW(),
        NOW()
    )
    ON CONFLICT (code) DO NOTHING;


-- =========================================================
-- 3. VALIDATE REQUIRED ROLES
-- Roles are inserted in V2.
-- =========================================================

DO $$
DECLARE
required_role_count INTEGER;
BEGIN
SELECT COUNT(*)
INTO required_role_count
FROM roles
WHERE name IN (
               'CUSTOMER',
               'OPERATIONS',
               'MANAGER',
               'ADMIN'
    );

IF required_role_count <> 4 THEN
        RAISE EXCEPTION
            'Required roles are missing. Expected 4 roles, found %',
            required_role_count;
END IF;
END;
$$;


-- =========================================================
-- 4. CUSTOMER ROLE PERMISSIONS
-- ACCOUNT_VIEW
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id,
    assigned_by,
    assigned_at
)
SELECT
    r.id,
    p.id,
    NULL,
    NOW()
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.code IN (
    'ACCOUNT_VIEW'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;


-- =========================================================
-- 5. OPERATIONS ROLE PERMISSIONS
-- CUSTOMER_VIEW, KYC_REVIEW, ACCOUNT_VIEW
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id,
    assigned_by,
    assigned_at
)
SELECT
    r.id,
    p.id,
    NULL,
    NOW()
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'OPERATIONS'
  AND p.code IN (
                 'CUSTOMER_VIEW',
                 'KYC_REVIEW',
                 'ACCOUNT_VIEW'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;


-- =========================================================
-- 6. MANAGER ROLE PERMISSIONS
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id,
    assigned_by,
    assigned_at
)
SELECT
    r.id,
    p.id,
    NULL,
    NOW()
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'MANAGER'
  AND p.code IN (
                 'USER_VIEW',
                 'USER_CREATE',
                 'ROLE_VIEW',
                 'PERMISSION_VIEW',
                 'CUSTOMER_VIEW',
                 'CUSTOMER_MANAGE',
                 'KYC_REVIEW',
                 'KYC_APPROVE',
                 'ACCOUNT_VIEW',
                 'ACCOUNT_FREEZE',
                 'REPORT_VIEW',
                 'PERMISSION_ASSIGN',
                 'ROLE_MANAGE'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;


-- =========================================================
-- 7. ADMIN ROLE PERMISSIONS
-- ADMIN GETS ALL PERMISSIONS
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id,
    assigned_by,
    assigned_at
)
SELECT
    r.id,
    p.id,
    NULL,
    NOW()
FROM roles r
         CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
    ON CONFLICT (role_id, permission_id) DO NOTHING;


-- =========================================================
-- 8. VALIDATION
-- =========================================================

DO $$
DECLARE
permission_count INTEGER;
    role_permission_count INTEGER;
BEGIN
SELECT COUNT(*)
INTO permission_count
FROM permissions;

SELECT COUNT(*)
INTO role_permission_count
FROM role_permissions;

RAISE NOTICE 'Total permissions: %', permission_count;
    RAISE NOTICE 'Total role-permission mappings: %',
        role_permission_count;

    IF permission_count < 16 THEN
        RAISE EXCEPTION
            'Permission seeding incomplete. Expected at least 16, found %',
            permission_count;
END IF;
END;
$$;


-- =========================================================
-- END OF V3
-- =========================================================