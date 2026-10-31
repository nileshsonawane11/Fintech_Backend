
-- =========================================================
-- V2: IDENTITY ROLES, PERMISSIONS, PROFILES AND AUTHORIZATION
-- =========================================================

-- =========================================================
-- 1. ROLES
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_roles_name CHECK (
        name IN ('CUSTOMER', 'OPERATIONS', 'MANAGER', 'ADMIN')
    )
    );

-- =========================================================
-- 2. PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    module VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 3. USER ROLES
-- =========================================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, role_id)
    );


-- =========================================================
-- 4. ROLE PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (role_id, permission_id)
    );


-- =========================================================
-- 5. USER PERMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect VARCHAR(10) NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    assigned_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, permission_id)
    );


-- =========================================================
-- 6. CUSTOMER PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
                                                 user_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 7. OPERATIONS PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS operations_profiles (
                                                   user_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    manager_id UUID NOT NULL REFERENCES customers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 8. MANAGER PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS manager_profiles (
                                                user_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    manager_code VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 9. ADMIN PROFILES
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_profiles (
                                              user_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    admin_code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 10. AUTHORIZATION AUDIT LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS authorization_audit_logs (
                                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


-- =========================================================
-- 11. FIX DEFAULT VALUES
-- Also supports tables that existed before this migration.
-- =========================================================

-- ROLES
ALTER TABLE roles
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN created_at SET DEFAULT NOW();

-- PERMISSIONS
ALTER TABLE permissions
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

-- USER ROLES
ALTER TABLE user_roles
    ALTER COLUMN assigned_at SET DEFAULT NOW();

-- ROLE PERMISSIONS
ALTER TABLE role_permissions
    ALTER COLUMN assigned_at SET DEFAULT NOW();

-- USER PERMISSIONS
ALTER TABLE user_permissions
    ALTER COLUMN assigned_at SET DEFAULT NOW();

-- CUSTOMER PROFILES
ALTER TABLE customer_profiles
    ALTER COLUMN created_at SET DEFAULT NOW();

-- OPERATIONS PROFILES
ALTER TABLE operations_profiles
    ALTER COLUMN created_at SET DEFAULT NOW();

-- MANAGER PROFILES
ALTER TABLE manager_profiles
    ALTER COLUMN created_at SET DEFAULT NOW();

-- ADMIN PROFILES
ALTER TABLE admin_profiles
    ALTER COLUMN created_at SET DEFAULT NOW();

-- AUTHORIZATION AUDIT LOGS
ALTER TABLE authorization_audit_logs
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN created_at SET DEFAULT NOW();


-- =========================================================
-- 12. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user
    ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
    ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
    ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
    ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user
    ON user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_operations_manager
    ON operations_profiles(manager_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_actor
    ON authorization_audit_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_target
    ON authorization_audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_action
    ON authorization_audit_logs(action);


-- =========================================================
-- 13. MIGRATE EXISTING CUSTOMERS
-- =========================================================

INSERT INTO user_roles (user_id, role_id)
SELECT c.id, r.id
FROM customers c
         JOIN roles r ON r.name = c.role
    ON CONFLICT DO NOTHING;

INSERT INTO customer_profiles (user_id)
SELECT c.id
FROM customers c
WHERE c.role = 'CUSTOMER'
    ON CONFLICT DO NOTHING;


-- =========================================================
-- END OF V2
-- =========================================================