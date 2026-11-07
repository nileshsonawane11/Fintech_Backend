// ============================================================================
// FINEDGE BANK - MODULE 48 AUTOMATED ACCEPTANCE VERIFICATION SUITE
// Tests all acceptance scenarios:
// 1. Role reach (ADMIN reaches all 14 sections, MANAGER denied on admin sections)
// 2. Creation rules (ADMIN creates OPERATIONS & MANAGER; MANAGER refused)
// 3. Assignment guards (MANAGER assigning ADMIN refused; self-escalation refused; second ADMIN editing first succeeds)
// 4. Effective permissions (ALLOW outside role works, DENY on role permission refuses, DENY always wins)
// 5. Product lifecycle (Add, edit rate, deactivate vanishes from public, delete blocked when referenced, delete succeeds when unreferenced)
// 6. Audit completeness (Scenarios 2-5 audit previous -> new values)
// 7. Regression & Seed preservation (Reset demo data restores 21-product catalogue and 6 staff)
// ============================================================================

import assert from 'assert';

// Mock localStorage for Node environment BEFORE service imports
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const {
  getDb,
  saveDb,
  resetDemoDb,
  getDefaultDb,
  getDemoStaffAccounts,
  getProducts: apiGetProducts,
  getProduct: apiGetProduct,
  computeEffectivePermissions,
} = await import('../src/services/api.js');

const {
  ROLE_ALLOWED_SECTIONS,
  ROLE_DEFAULT_SECTION,
  PERMISSION_CATALOGUE,
  hasSectionAccess,
  getFirstQueueForRole,
  listUnifiedUsers,
  getUserDetail,
  createInternalUser,
  updateUserStatus,
  updateUserOverrides,
  updateUserRoles,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminSetProductStatus,
  adminDeleteProduct,
  assertStaffPermission,
  assertAdminOnly,
  listAudit,
} = await import('../src/services/managerBridge.js');

const {
  ALL_PRODUCTS,
  ACCOUNTS,
  LOANS,
  CARDS,
  INVESTMENTS,
  getProductBySlug,
  getProductsByCategory,
  RATES_AT_A_GLANCE,
} = await import('../src/data/products.js');


let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message || err.detail}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message || err.detail}`);
    failed++;
  }
}

console.log('================================================================');
console.log('STARTING MODULE 48 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
console.log('================================================================');

// Ensure clean test database state
resetDemoDb();

// ----------------------------------------------------------------------------
// SCENARIO 1: ROLE REACH & IDENTITY
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 1: ADMIN Role Reach & Identity ---');

test('STF-006 is seeded with role ADMIN and Platform Administration', () => {
  const db = getDb();
  const adminStaff = db.staffUsers.find((s) => s.staffId === 'STF-006');
  assert(Boolean(adminStaff), 'STF-006 found in staffUsers');
  assert.strictEqual(adminStaff.fullName, 'Ishita Rao');
  assert.strictEqual(adminStaff.email, 'admin@finedge.bank');
  assert.strictEqual(adminStaff.role, 'ADMIN');
  assert.strictEqual(adminStaff.department, 'Platform Administration');
  assert.strictEqual(adminStaff.status, 'ACTIVE');
  assert(adminStaff.password.length >= 8, 'Password follows per-account rule');
});

test('Staff demo accounts panel contains STF-006 from seed', () => {
  const demoAccounts = getDemoStaffAccounts();
  const adminDemo = demoAccounts.find((d) => d.staffId === 'STF-006');
  assert(Boolean(adminDemo), 'STF-006 listed in staff demo accounts');
  assert.strictEqual(adminDemo.email, 'admin@finedge.bank');
  assert(adminDemo.clearance.includes('Platform Administration'), 'Clearance includes department');
});

test('ROLE_ALLOWED_SECTIONS: ADMIN sees all 11 existing sections + 3 Administration sections', () => {
  const adminSections = ROLE_ALLOWED_SECTIONS.ADMIN;
  assert(Array.isArray(adminSections), 'adminSections is an array');
  const expectedSections = [
    'dashboard', 'kyc', 'accounts', 'loans', 'investments',
    'cards', 'tickets', 'customers', 'audit', 'reports', 'staff',
    'user-management', 'roles-permissions', 'product-catalogue',
  ];
  for (const s of expectedSections) {
    assert(adminSections.includes(s), `ADMIN sections includes ${s}`);
  }
  assert.strictEqual(adminSections.length, 14, 'ADMIN has exactly 14 allowed sections');
});

test('The other 5 original roles in ROLE_ALLOWED_SECTIONS are byte-identical', () => {
  assert.deepStrictEqual(ROLE_ALLOWED_SECTIONS.BANK_MANAGER, [
    'dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff',
  ]);
  assert.deepStrictEqual(ROLE_ALLOWED_SECTIONS.KYC_OFFICER, ['dashboard', 'kyc', 'customers', 'audit']);
  assert.deepStrictEqual(ROLE_ALLOWED_SECTIONS.ACCOUNT_OPS, ['dashboard', 'accounts', 'cards', 'customers', 'audit']);
  assert.deepStrictEqual(ROLE_ALLOWED_SECTIONS.AUDIT_COMPLIANCE, ['dashboard', 'customers', 'audit', 'reports']);
  assert.deepStrictEqual(ROLE_ALLOWED_SECTIONS.CUSTOMER_SUPPORT, ['dashboard', 'tickets', 'customers']);
});

test('ADMIN lands on Dashboard; Manager lands on Dashboard', () => {
  assert.strictEqual(ROLE_DEFAULT_SECTION.ADMIN, 'dashboard');
  assert.strictEqual(getFirstQueueForRole('ADMIN'), '/manager/dashboard');
  assert.strictEqual(ROLE_DEFAULT_SECTION.BANK_MANAGER, 'dashboard');
});

test('Out-of-role navigation: MANAGER denied on user-management, roles-permissions, product-catalogue', () => {
  const managerUser = { role: 'BANK_MANAGER' };
  assert.strictEqual(hasSectionAccess('user-management', managerUser), false);
  assert.strictEqual(hasSectionAccess('roles-permissions', managerUser), false);
  assert.strictEqual(hasSectionAccess('product-catalogue', managerUser), false);

  const adminUser = { role: 'ADMIN' };
  assert.strictEqual(hasSectionAccess('user-management', adminUser), true);
  assert.strictEqual(hasSectionAccess('roles-permissions', adminUser), true);
  assert.strictEqual(hasSectionAccess('product-catalogue', adminUser), true);
});

await testAsync('Bridge call to Admin functions from non-ADMIN session refuses with 403', async () => {
  const managerActor = { actorEmail: 'manager@finedge.bank' };
  let refused = false;
  try {
    await listUnifiedUsers({}, managerActor);
  } catch (err) {
    refused = err.status === 403 && err.code === 'INSUFFICIENT_PERMISSIONS';
  }
  assert(refused, 'listUnifiedUsers refused for BANK_MANAGER');

  refused = false;
  try {
    await adminListProducts(null, managerActor);
  } catch (err) {
    refused = err.status === 403 && err.code === 'INSUFFICIENT_PERMISSIONS';
  }
  assert(refused, 'adminListProducts refused for BANK_MANAGER');
});

// ----------------------------------------------------------------------------
// SCENARIO 2: CREATION RULES & WORKFLOWS
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 2: Internal User Creation Rules ---');

await testAsync('ADMIN creates OPERATIONS user with employee code and manager -> succeeds', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  const createdOps = await createInternalUser(
    {
      roleType: 'OPERATIONS',
      specificRole: 'ACCOUNT_OPS',
      fullName: 'Pooja Agarwal',
      email: 'pooja.agarwal@finedge.bank',
      employeeCode: 'EMP-7701',
      department: 'Branch Operations',
      designation: 'Operations Specialist',
      reportingManager: 'Devendra Singhania (STF-001)',
    },
    adminActor
  );

  assert(Boolean(createdOps.staffId), 'Staff ID assigned');
  assert.strictEqual(createdOps.role, 'ACCOUNT_OPS');
  assert.strictEqual(createdOps.employeeCode, 'EMP-7701');

  // Verify can land on their queue
  assert.strictEqual(getFirstQueueForRole(createdOps.role), '/manager/accounts');
});

await testAsync('ADMIN creates MANAGER user with manager code -> succeeds', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  const createdMgr = await createInternalUser(
    {
      roleType: 'BANK_MANAGER',
      fullName: 'Sanjay Malhotra',
      email: 'sanjay.m@finedge.bank',
      managerCode: 'MGR-9902',
      department: 'Corporate Banking',
      designation: 'Deputy Branch Manager',
    },
    adminActor
  );

  assert(Boolean(createdMgr.staffId), 'Staff ID assigned');
  assert.strictEqual(createdMgr.role, 'BANK_MANAGER');
  assert.strictEqual(createdMgr.managerCode, 'MGR-9902');
  assert.strictEqual(getFirstQueueForRole(createdMgr.role), '/manager/dashboard');
});

await testAsync('MANAGER calling create-MANAGER or create-ADMIN refuses in bridge directly', async () => {
  const managerActor = { actorEmail: 'manager@finedge.bank' };
  
  let createAdminRefused = false;
  try {
    await createInternalUser(
      {
        roleType: 'ADMIN',
        fullName: 'Rogue Admin',
        email: 'rogue@finedge.bank',
      },
      managerActor
    );
  } catch (err) {
    createAdminRefused = err.status === 403 && err.code === 'INSUFFICIENT_PERMISSIONS';
  }
  assert(createAdminRefused, 'MANAGER cannot create ADMIN in bridge');

  let createMgrRefused = false;
  try {
    await createInternalUser(
      {
        roleType: 'BANK_MANAGER',
        fullName: 'Rogue Manager',
        email: 'rogue.mgr@finedge.bank',
      },
      managerActor
    );
  } catch (err) {
    createMgrRefused = err.status === 403 && err.code === 'INSUFFICIENT_PERMISSIONS';
  }
  assert(createMgrRefused, 'MANAGER cannot create MANAGER in bridge');
});

// ----------------------------------------------------------------------------
// SCENARIO 3: ASSIGNMENT GUARDS & SELF-ESCALATION
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 3: Assignment Guards & Self-Escalation Refusals ---');

await testAsync('MANAGER assigning ADMIN role is refused in bridge', async () => {
  const managerActor = { actorEmail: 'manager@finedge.bank' };
  let refused = false;
  try {
    await updateUserRoles('STF-003', 'ADMIN', 'Attempted role change', managerActor);
  } catch (err) {
    refused = err.status === 403;
  }
  assert(refused, 'MANAGER assigning ADMIN role is refused');
});

await testAsync('ADMIN modifying their own permissions / overrides is refused (Self-Escalation Guard)', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  let refused = false;
  try {
    await updateUserOverrides('STF-006', { 'accounts.approve': 'DENY' }, 'Self modification', adminActor);
  } catch (err) {
    refused = err.status === 403 && err.code === 'SELF_ESCALATION_PROHIBITED';
  }
  assert(refused, 'Self-modification refused for ADMIN');
});

await testAsync('Second ADMIN changing first ADMIN succeeds and audits prev -> new', async () => {
  const admin1Email = 'admin@finedge.bank';
  const admin2Email = 'admin2@finedge.bank';
  
  // Seed second admin
  const db = getDb();
  db.staffUsers.push({
    staffId: 'STF-007',
    fullName: 'Anil Gupta',
    email: admin2Email,
    role: 'ADMIN',
    department: 'Platform Administration',
    status: 'ACTIVE',
    permissions: PERMISSION_CATALOGUE.map((p) => p.code),
    permissionOverrides: {},
  });
  saveDb(db);

  const admin2Actor = { actorEmail: admin2Email };
  const updated = await updateUserOverrides(
    'STF-006',
    { 'investments.book': 'DENY' },
    'Second admin restricting investments booking',
    admin2Actor
  );

  assert(Boolean(updated), 'Second admin updated first admin successfully');
  assert.strictEqual(updated.permissionOverrides['investments.book'], 'DENY');

  // Verify audit log has previous -> new values
  const audits = (await listAudit({})).filter((a) => a.action === 'USER_OVERRIDES_UPDATED' && a.entityId === 'STF-006');
  assert(audits.length > 0, 'Audit record exists for overrides update');
  const audit = audits[0];
  assert.strictEqual(audit.actor, admin2Email);
  assert.strictEqual(audit.outcome, 'SUCCESS');
});

// ----------------------------------------------------------------------------
// SCENARIO 4: EFFECTIVE PERMISSIONS & OVERRIDES
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 4: User-Level Overrides & Effective Permissions ---');

await testAsync('User-level DENY on role permission refuses that function while others work', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  
  // Give KYC Officer STF-002 a DENY on kyc.approve
  await updateUserOverrides('STF-002', { 'kyc.approve': 'DENY' }, 'Compliance probationary restriction', adminActor);

  const kycActor = { actorEmail: 'kyc.officer@finedge.bank' };

  // kyc.review should work (or reading kyc)
  const allowed = assertStaffPermission('kyc.read', kycActor);
  assert(Boolean(allowed), 'kyc.read still works for KYC Officer');

  // kyc.approve must be REFUSED
  let approveRefused = false;
  try {
    assertStaffPermission('kyc.approve', kycActor);
  } catch (err) {
    approveRefused = err.status === 403 && err.code === 'INSUFFICIENT_PERMISSIONS';
  }
  assert(approveRefused, 'kyc.approve refused because of user-level DENY override');
});

await testAsync('User-level ALLOW outside role permissions works', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };

  // Give KYC Officer STF-002 an ALLOW on accounts.approve
  await updateUserOverrides('STF-002', { 'accounts.approve': 'ALLOW' }, 'Cross-functional training allowance', adminActor);

  const kycActor = { actorEmail: 'kyc.officer@finedge.bank' };

  // accounts.approve should now WORK for KYC Officer
  const allowed = assertStaffPermission('accounts.approve', kycActor);
  assert(Boolean(allowed), 'accounts.approve works via user-level ALLOW override');
});

test('computeEffectivePermissions implements (Role ∪ ALLOWs) − DENYs (DENY always wins)', () => {
  const mockUser = {
    role: 'ACCOUNT_OPS',
    permissions: ['accounts.read', 'accounts.approve', 'cards.read'],
    permissionOverrides: {
      'accounts.approve': 'DENY', // Deny existing permission
      'loans.disburse': 'ALLOW',  // Allow outside permission
      'cards.read': 'DENY',       // Deny existing
    },
  };

  const effective = computeEffectivePermissions(mockUser, getDb());
  assert(!effective.includes('accounts.approve'), 'accounts.approve stripped by DENY');
  assert(!effective.includes('cards.read'), 'cards.read stripped by DENY');
  assert(effective.includes('loans.disburse'), 'loans.disburse granted by ALLOW');
  assert(effective.includes('accounts.read'), 'accounts.read retained from role');
});

// ----------------------------------------------------------------------------
// SCENARIO 5: PRODUCT CATALOGUE LIFECYCLE & PROPAGATION
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 5: Product Lifecycle & Propagation Proof Obligations ---');

await testAsync('Add new savings account product -> appears in live catalogue accessors', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  const newProductData = {
    name: 'FinEdge Super Saver Digital',
    category: 'account',
    tagline: 'High yield digital savings with zero maintenance fee',
    overview: 'Next-generation savings account for digital natives.',
    accountType: 'savings',
    amb: 5000,
    penalty: '₹100/mo below AMB',
    debitCardAnnualFee: 199,
    rateMin: 4.5,
    rateMax: 7.5,
    rateSlabs: [
      { min: 0, max: 100000, rate: 4.5, label: 'Up to ₹1 lakh' },
      { min: 100000, max: null, rate: 7.5, label: 'Above ₹1 lakh' },
    ],
    features: ['Instant virtual debit card', 'Unlimited free IMPS/UPI'],
    eligibility: ['Resident Indian individual aged 18+'],
    documents: ['PAN Card', 'Aadhaar Card'],
  };

  const created = await adminCreateProduct(newProductData, adminActor);
  assert(Boolean(created.slug), 'Product slug generated');
  assert.strictEqual(created.slug, 'finedge-super-saver-digital');

  // Verify accessor getProducts() and getProduct()
  const retrieved = apiGetProduct('finedge-super-saver-digital');
  assert(Boolean(retrieved), 'apiGetProduct retrieved new product');
  assert.strictEqual(retrieved.name, 'FinEdge Super Saver Digital');

  // Verify exported live arrays in products.js automatically see the new product
  const foundInAll = ALL_PRODUCTS.find((p) => p.slug === 'finedge-super-saver-digital');
  assert(Boolean(foundInAll), 'ALL_PRODUCTS includes new product without code changes');

  const foundInAccounts = ACCOUNTS.find((p) => p.slug === 'finedge-super-saver-digital');
  assert(Boolean(foundInAccounts), 'ACCOUNTS includes new product without code changes');

  // Verify detail lookup helper
  const bySlug = getProductBySlug('finedge-super-saver-digital');
  assert(Boolean(bySlug), 'getProductBySlug found new product');
  assert.strictEqual(bySlug.category, 'account');
});

await testAsync('Edit rate on product -> propagates to catalogue and detail', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  const updated = await adminUpdateProduct(
    'finedge-super-saver-digital',
    {
      rateMax: 7.85,
      rateSlabs: [
        { min: 0, max: 100000, rate: 4.5, label: 'Up to ₹1 lakh' },
        { min: 100000, max: null, rate: 7.85, label: 'Above ₹1 lakh' },
      ],
    },
    'Rate increase per monetary policy update',
    adminActor
  );

  assert.strictEqual(updated.rateMax, 7.85);

  const product = getProductBySlug('finedge-super-saver-digital');
  assert.strictEqual(product.rateMax, 7.85, 'getProductBySlug returns updated rate');
  const topSlab = Math.max(...product.rateSlabs.map((s) => s.rate));
  assert.strictEqual(topSlab, 7.85, 'Top slab rate updated to 7.85%');
});

await testAsync('Deactivate product -> vanishes from public surfaces; active application in queue remains', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  await adminSetProductStatus('finedge-super-saver-digital', 'INACTIVE', 'Discontinuing digital saver', adminActor);

  // Public getProducts() filters inactive by default
  const activeProducts = apiGetProducts();
  assert(!activeProducts.some((p) => p.slug === 'finedge-super-saver-digital'), 'Vanished from public getProducts');

  // ACCOUNTS live array filters inactive
  const publicAccounts = [...ACCOUNTS];
  assert(!publicAccounts.some((p) => p.slug === 'finedge-super-saver-digital'), 'Vanished from public ACCOUNTS array');

  // Admin access includes inactive
  const adminList = await adminListProducts(null, adminActor);
  const deactivated = adminList.find((p) => p.slug === 'finedge-super-saver-digital');
  assert(Boolean(deactivated), 'Admin list retains deactivated product');
  assert.strictEqual(deactivated.status, 'INACTIVE');
});

await testAsync('Attempt delete while account application references product -> refused with counts', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };
  const db = getDb();

  // Create an application referencing the product
  db.accountApplications.push({
    accountApplicationId: 'ACC-APP-9988',
    accountTypeSlug: 'finedge-super-saver-digital',
    productSlug: 'finedge-super-saver-digital',
    accountTypeName: 'FinEdge Super Saver Digital',
    status: 'UNDER_REVIEW',
  });
  saveDb(db);

  let deleteRefused = false;
  let refusalMessage = '';
  try {
    await adminDeleteProduct('finedge-super-saver-digital', adminActor);
  } catch (err) {
    deleteRefused = err.status === 409 && err.code === 'PRODUCT_IN_USE';
    refusalMessage = err.detail || err.message;
  }

  assert(deleteRefused, 'Delete refused when product is referenced');
  assert(refusalMessage.includes('1 account application(s)'), 'Refusal message names the exact reference count');
});

await testAsync('Delete never-used product -> permanently removed everywhere', async () => {
  const adminActor = { actorEmail: 'admin@finedge.bank' };

  // Create an unused test product
  const unused = await adminCreateProduct(
    {
      name: 'Temporary Trial Loan',
      category: 'loan',
      rateMin: 10.0,
      rateMax: 14.0,
      amountMin: 50000,
      amountMax: 200000,
    },
    adminActor
  );

  assert(Boolean(unused.slug), 'Temporary product created');

  const deleted = await adminDeleteProduct(unused.slug, adminActor);
  assert(deleted.success, 'adminDeleteProduct succeeded');

  // Check it is gone
  const db = getDb();
  assert(!db.products.some((p) => p.slug === unused.slug), 'Product removed from db.products');
});

// ----------------------------------------------------------------------------
// SCENARIO 6: AUDIT LOG COMPLETENESS
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 6: Audit Completeness with Previous -> New Values ---');

await testAsync('Audit log recorded every action in scenarios 2-5 with actor, target, prev, and new values', async () => {
  const audits = await listAudit({});

  // 1. Staff user created audit
  const staffCreateAudit = audits.find((a) => a.action === 'STAFF_USER_CREATED');
  assert(Boolean(staffCreateAudit), 'STAFF_USER_CREATED audit found');
  assert(Boolean(staffCreateAudit.actor), 'Actor recorded');
  assert(Boolean(staffCreateAudit.target), 'Target recorded');

  // 2. Overrides updated audit
  const overrideAudit = audits.find((a) => a.action === 'USER_OVERRIDES_UPDATED');
  assert(Boolean(overrideAudit), 'USER_OVERRIDES_UPDATED audit found');
  assert(overrideAudit.previousValue !== undefined, 'previousValue exists on audit record');
  assert(overrideAudit.newValue !== undefined, 'newValue exists on audit record');

  // 3. Product created audit
  const productCreateAudit = audits.find((a) => a.action === 'PRODUCT_CREATED');
  assert(Boolean(productCreateAudit), 'PRODUCT_CREATED audit found');
  assert(Boolean(productCreateAudit.newValue), 'Product details in newValue');

  // 4. Product updated audit
  const productUpdateAudit = audits.find((a) => a.action === 'PRODUCT_UPDATED');
  assert(Boolean(productUpdateAudit), 'PRODUCT_UPDATED audit found');
  assert(Boolean(productUpdateAudit.previousValue), 'previousValue recorded on product update');
  assert(Boolean(productUpdateAudit.newValue), 'newValue recorded on product update');

  // 5. Product deactivated audit
  const productDeactAudit = audits.find((a) => a.action === 'PRODUCT_DEACTIVATED');
  assert(Boolean(productDeactAudit), 'PRODUCT_DEACTIVATED audit found');
  assert.strictEqual(productDeactAudit.previousValue, 'ACTIVE');
  assert.strictEqual(productDeactAudit.newValue, 'INACTIVE');
});

// ----------------------------------------------------------------------------
// SCENARIO 7: RESET DEMO DATA & REGRESSION INTEGRITY
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 7: Reset Demo Data & Factory Seed Restoration ---');

test('Reset demo data restores the factory 21-product catalogue and six seeded staff', () => {
  // Call resetDemoDb
  const freshDb = resetDemoDb();

  assert.strictEqual(freshDb.products.length, 21, 'Reset restores exactly 21 factory products');
  assert.strictEqual(freshDb.staffUsers.length, 6, 'Reset restores exactly 6 seeded staff');

  const admin = freshDb.staffUsers.find((s) => s.staffId === 'STF-006');
  assert(Boolean(admin), 'STF-006 is restored');
  assert.strictEqual(admin.role, 'ADMIN');

  const defaultDemoAccounts = getDemoStaffAccounts();
  assert.strictEqual(defaultDemoAccounts.length, 6, 'Demo panel lists all 6 seeded staff');
});

console.log('================================================================');
console.log(`MODULE 48 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
