-- ====================================================================
-- V8: SEED LOAN SERVICE PERMISSIONS AND ROLE MAPPINGS
-- ====================================================================

INSERT INTO permissions (id, code, description, module, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'LOAN_PRODUCT_READ', 'Browse active loan products, rates, fees, and offers', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_APPLY', 'Submit new loan applications', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_VIEW_OWN', 'View own loan applications, offers, and repayment schedules', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_OFFER_ACCEPT', 'Accept sanctioned loan offers', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_CANCEL_OWN', 'Cancel own pending loan applications', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_REVIEW', 'Review assigned loan applications and verify documents', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_APPROVE', 'Approve or reject loan applications within authority', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_DISBURSE', 'Initiate and complete loan disbursement', 'LOAN_MANAGEMENT', NOW(), NOW()),
    (gen_random_uuid(), 'LOAN_ADMIN', 'Manage loan products, fees, and dynamic promotional offers', 'LOAN_MANAGEMENT', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- CUSTOMER
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.code IN ('LOAN_PRODUCT_READ', 'LOAN_APPLY', 'LOAN_VIEW_OWN', 'LOAN_OFFER_ACCEPT', 'LOAN_CANCEL_OWN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- OPERATIONS (Loan Officer capability)
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'OPERATIONS'
  AND p.code IN ('LOAN_PRODUCT_READ', 'LOAN_REVIEW')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER (Loan Manager capability)
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'MANAGER'
  AND p.code IN ('LOAN_PRODUCT_READ', 'LOAN_REVIEW', 'LOAN_APPROVE', 'LOAN_DISBURSE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN
INSERT INTO role_permissions (role_id, permission_id, assigned_by, assigned_at)
SELECT r.id, p.id, NULL, NOW()
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;
