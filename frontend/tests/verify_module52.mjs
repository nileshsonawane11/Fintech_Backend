// ============================================================================
// FINEDGE BANK - MODULE 52 AUTOMATED ACCEPTANCE VERIFICATION SUITE
// Complete Defect Fix (D5–D18) Verification
// ============================================================================

import assert from 'assert';
import fs from 'fs';

// Mock localStorage for Node environment BEFORE service imports
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

const {
  getDb,
  saveDb,
  resetDemoDb,
  getContent,
  getSettings,
  getSetting,
  getProducts,
  getProduct,
  handleLocalFallback,
  SEED_VERSION,
  computeEffectivePermissions
} = await import('../src/services/api.js');

const {
  ROLE_ALLOWED_SECTIONS,
  hasSectionAccess,
  adminCreateProduct,
  adminUpdateProduct,
  adminSetProductStatus,
  adminDeleteProduct,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  createInternalUser,
  updateUserRoles,
  updateUserOverrides,
  getUserDetail,
  adminGetSiteContent,
  adminUpdateSiteContent,
  adminGetSettings,
  adminUpdateSettings,
  replyTicket,
  setTicketStatus,
  listAudit
} = await import('../src/services/managerBridge.js');

const {
  getLiveRails,
  transfer,
  listAccounts,
  listBeneficiaries
} = await import('../src/services/portalBridge.js');

const { calculateFD } = await import('../src/lib/finance.js');

const ADMIN_ACTOR = {
  staffId: 'STF-006',
  email: 'admin@finedge.bank',
  role: 'ADMIN',
  name: 'Ishita Rao'
};

const MANAGER_ACTOR = {
  staffId: 'STF-001',
  email: 'manager@finedge.bank',
  role: 'BANK_MANAGER',
  name: 'Devendra Singhania'
};

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error('   ', err.message || err);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error('   ', err.message || err);
    failed++;
  }
}

console.log('================================================================');
console.log('STARTING MODULE 52 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
console.log('================================================================');

// Ensure fresh demo DB
resetDemoDb();

// ----------------------------------------------------------------------------
// PART A: D17 (S1) - Admin Panel Write Layer Actually Writes
// ----------------------------------------------------------------------------
console.log('\n--- Part A: Admin Panel Write Layer (D17) ---');

await itAsync('A.1 Add Product creates product and propagates to getProducts()', async () => {
  const newProd = {
    category: 'account',
    name: 'FinEdge Green Horizon Savings',
    slug: 'green-horizon-savings',
    tagline: 'Eco-conscious banking with tree plantation rewards',
    rate: 6.25,
    minBalance: 5000,
    features: ['1 tree planted per ₹50k balance', 'Zero paper statements', 'Digital RuPay Platinum card'],
    status: 'ACTIVE'
  };

  await adminCreateProduct(newProd, ADMIN_ACTOR);

  const allProds = getProducts();
  const created = allProds.find(p => p.slug === 'green-horizon-savings');
  assert.ok(created, 'Product should exist in live catalogue');
  assert.strictEqual(created.name, 'FinEdge Green Horizon Savings');
  assert.strictEqual(created.rate, 6.25);
});

await itAsync('A.2 Edit Product persists rate change across reloads and accessors', async () => {
  await adminUpdateProduct('green-horizon-savings', { rate: 6.75 }, 'Promotional rate increase', ADMIN_ACTOR);

  const updated = getProduct('green-horizon-savings');
  assert.strictEqual(updated.rate, 6.75, 'Product rate should update to 6.75%');

  // Verify persistence in stored DB
  const rawDb = JSON.parse(localStorage.getItem('finedge_persistent_db'));
  const storedProd = rawDb.products.find(p => p.slug === 'green-horizon-savings');
  assert.strictEqual(storedProd.rate, 6.75, 'Rate must persist in localStorage');
});

await itAsync('A.3 Deactivate / Delete lifecycle and reference guard', async () => {
  // Deactivate
  await adminSetProductStatus('green-horizon-savings', 'DEACTIVATED', 'Temporarily pausing eco savings', ADMIN_ACTOR);
  const activeProds = getProducts();
  assert.ok(!activeProds.some(p => p.slug === 'green-horizon-savings'), 'Deactivated product should not be in public active list');

  const withInactive = getProducts({ includeInactive: true });
  const deact = withInactive.find(p => p.slug === 'green-horizon-savings');
  assert.strictEqual(deact.status, 'DEACTIVATED');

  // Delete unreferenced product
  await adminDeleteProduct('green-horizon-savings', ADMIN_ACTOR);
  const allAfterDelete = getProducts({ includeInactive: true });
  assert.ok(!allAfterDelete.some(p => p.slug === 'green-horizon-savings'), 'Product should be deleted');

  // Attempt delete of referenced product (edge-cashback-credit referenced by card applications)
  let threw = false;
  try {
    await adminDeleteProduct('edge-cashback-credit', ADMIN_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 409);
    assert.ok(e.detail.includes('Cannot delete') || e.message.includes('Cannot delete'), 'Error must explain reference');
  }
  assert.strictEqual(threw, true, 'Referenced product deletion must be refused');
});

await itAsync('A.4 Create Internal User persists and can authenticate', async () => {
  const newUser = {
    role: 'ACCOUNT_OPS',
    fullName: 'Ravi Teja Varma',
    email: 'ravi.varma@finedge.bank',
    password: 'Password@2026#Ops',
    employeeCode: 'EMP-9921',
    department: 'Clearing Operations',
    reportingManager: 'Devendra Singhania'
  };

  const created = await createInternalUser(newUser, ADMIN_ACTOR);
  assert.strictEqual(created.email, 'ravi.varma@finedge.bank');
  assert.strictEqual(created.role, 'ACCOUNT_OPS');

  // Verify staff login succeeds with created credentials
  const loginRes = handleLocalFallback('/admin/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'ravi.varma@finedge.bank', password: 'Password@2026#Ops' })
  });
  assert.strictEqual(loginRes.role, 'ACCOUNT_OPS');
  assert.strictEqual(loginRes.user.email, 'ravi.varma@finedge.bank');

  // Verify Part C guards: MANAGER cannot create MANAGER or ADMIN
  let threwMgr = false;
  try {
    await createInternalUser({
      role: 'BANK_MANAGER',
      fullName: 'Sneha Patel',
      email: 'sneha.patel@finedge.bank',
      password: 'Password@2026#Mgr'
    }, MANAGER_ACTOR);
  } catch (e) {
    threwMgr = true;
    assert.strictEqual(e.status, 403);
  }
  assert.strictEqual(threwMgr, true, 'Manager cannot create Manager');
});

await itAsync('A.5 Create Custom Role persists and appears in listRoles', async () => {
  const rolePayload = {
    name: 'Wealth Relationship Lead',
    description: 'Specialist for high net worth investments and portfolio reviews',
    permissions: ['investments.read', 'investments.book', 'customers.read']
  };

  const createdRole = await createRole(rolePayload, ADMIN_ACTOR);
  assert.ok(createdRole.id.startsWith('ROLE_'));

  const roles = await listRoles(ADMIN_ACTOR);
  const foundRole = roles.find(r => r.id === createdRole.id);
  assert.ok(foundRole, 'Custom role must appear in listRoles');
  assert.strictEqual(foundRole.name, 'Wealth Relationship Lead');
});

await itAsync('A.6 Roles & Perms Review & Apply persists system role overrides across reload', async () => {
  // Update AUDIT_COMPLIANCE permissions (system role)
  const newPerms = ['customers.read', 'audit.read', 'kyc.read', 'accounts.read', 'cards.read'];
  await updateRole('AUDIT_COMPLIANCE', { permissions: newPerms }, 'Granted cards.read to Auditor for PCI compliance reviews', ADMIN_ACTOR);

  // Stored in db.systemRoleOverrides
  const roles = await listRoles(ADMIN_ACTOR);
  const auditorRole = roles.find(r => r.id === 'AUDIT_COMPLIANCE');
  assert.ok(auditorRole.permissions.includes('cards.read'), 'Auditor role must include newly granted permission');

  // Verify persistence in raw DB
  const rawDb = JSON.parse(localStorage.getItem('finedge_persistent_db'));
  assert.ok(rawDb.systemRoleOverrides?.AUDIT_COMPLIANCE?.includes('cards.read'), 'systemRoleOverrides must be persisted');
});

await itAsync('A.7 Site Content saves independently with validation and audit', async () => {
  const currentHero = await adminGetSiteContent('hero', ADMIN_ACTOR);
  const updatedHero = {
    ...currentHero,
    headline: 'India’s Next-Generation Institutional Digital Bank'
  };

  await adminUpdateSiteContent('hero', updatedHero, 'Updated headline for national corporate launch', ADMIN_ACTOR);
  const freshHero = getContent('hero');
  assert.strictEqual(freshHero.headline, 'India’s Next-Generation Institutional Digital Bank');

  // Verify validation refuses empty headline
  let threwEmpty = false;
  try {
    await adminUpdateSiteContent('hero', { ...updatedHero, headline: '   ' }, 'Empty test', ADMIN_ACTOR);
  } catch (e) {
    threwEmpty = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwEmpty, true, 'Empty headline must be rejected');
});

await itAsync('A.8 Platform Settings independent saves: rails, lock 1-60, SLA red > amber', async () => {
  // Save lock minutes = 20
  await adminUpdateSettings({ inactivityLockMinutes: 20 }, 'Updated session lock to 20 mins', ADMIN_ACTOR);
  assert.strictEqual(getSetting('inactivityLockMinutes'), 20);

  // Validate lock 1-60
  let threwLock0 = false;
  try {
    await adminUpdateSettings({ inactivityLockMinutes: 0 }, 'Invalid lock < 1', ADMIN_ACTOR);
  } catch (e) {
    threwLock0 = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwLock0, true, 'Lock < 1 min must fail');

  // Valid lock = 1 min
  await adminUpdateSettings({ inactivityLockMinutes: 1 }, 'Valid 1 min lock', ADMIN_ACTOR);
  assert.strictEqual(getSetting('inactivityLockMinutes'), 1);

  // Validate SLA red > amber
  let threwSla = false;
  try {
    await adminUpdateSettings({ slaThresholds: { amberHours: 24, redHours: 20 } }, 'Red <= Amber invalid', ADMIN_ACTOR);
  } catch (e) {
    threwSla = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwSla, true, 'SLA red <= amber must fail');
});

await itAsync('A.9 User drawer controls: role assignment and ALLOW/DENY overrides persist', async () => {
  // Assign role to customer CUS-100234
  await updateUserRoles('CUS-100234', 'CUSTOMER', 'Re-affirmed customer role', ADMIN_ACTOR);

  // Update overrides on customer
  await updateUserOverrides('CUS-100234', { 'cards.issue': 'ALLOW', 'transfers.execute': 'DENY' }, 'Special privilege override', ADMIN_ACTOR);

  const detail = await getUserDetail('CUS-100234', 'customer', ADMIN_ACTOR);
  assert.strictEqual(detail.user.permissionOverrides['cards.issue'], 'ALLOW');
  assert.strictEqual(detail.user.permissionOverrides['transfers.execute'], 'DENY');

  // Effective permissions: transfers.execute must be denied, cards.issue allowed
  const effective = computeEffectivePermissions(detail.user, getDb());
  assert.ok(effective.includes('cards.issue'), 'cards.issue must be effective via ALLOW');
  assert.ok(!effective.includes('transfers.execute'), 'transfers.execute must be removed via DENY');
});

// ----------------------------------------------------------------------------
// PART B: Staff Operations Defects (D5, D6)
// ----------------------------------------------------------------------------
console.log('\n--- Part B: Staff Operations Defects (D5, D6) ---');

await itAsync('B.1 D5: Ticket reply/status mutation awaited, 1 reply = 1 audit entry', async () => {
  const db = getDb();
  const tickets = db.supportTickets || [];
  assert.ok(tickets.length > 0, 'Must have seeded tickets');
  const ticketId = tickets[0].ticketId || tickets[0].id;
  const initialThreadLen = tickets[0].messages?.length || 0;

  const replyRes = await replyTicket(ticketId, {
    body: 'Your debit card dispatch has been expedited via courier.',
    staffId: ADMIN_ACTOR.staffId,
    name: ADMIN_ACTOR.name,
    email: ADMIN_ACTOR.email,
    role: ADMIN_ACTOR.role
  });
  assert.ok(replyRes.messages.length > initialThreadLen);

  const statusRes = await setTicketStatus(ticketId, 'RESOLVED', {
    staffId: ADMIN_ACTOR.staffId,
    name: ADMIN_ACTOR.name,
    email: ADMIN_ACTOR.email,
    role: ADMIN_ACTOR.role
  });
  assert.strictEqual(statusRes.status, 'RESOLVED');

  const audits = (await listAudit(ADMIN_ACTOR)).filter(a => a.target === ticketId);
  assert.ok(audits.some(a => a.action === 'SUPPORT_TICKET_REPLIED'));
  assert.ok(audits.some(a => a.action === 'SUPPORT_TICKET_STATUS_UPDATED'));
});

await itAsync('B.2 D6: Card applications reference catalogue (CARD-APP-400124 & 400126 have valid slugs and limits)', async () => {
  const db = getDb();
  const cards = db.cardApplications || [];
  const app124 = cards.find(c => c.cardApplicationId === 'CARD-APP-400124');
  const app126 = cards.find(c => c.cardApplicationId === 'CARD-APP-400126');

  assert.ok(app124, 'CARD-APP-400124 must exist');
  assert.ok(app126, 'CARD-APP-400126 must exist');

  assert.strictEqual(app124.productSlug, 'edge-cashback-credit');
  assert.strictEqual(app124.cardName, 'FinEdge Edge Cashback Card');
  assert.strictEqual(app124.requestedLimit, 150000);

  assert.strictEqual(app126.productSlug, 'edge-voyage-credit');
  assert.strictEqual(app126.cardName, 'Edge Voyage Travel Credit Card');
  assert.strictEqual(app126.requestedLimit, 250000);

  // Both slugs resolve to valid catalogue products
  const p124 = getProduct(app124.productSlug);
  const p126 = getProduct(app126.productSlug);
  assert.ok(p124, 'Product 124 must exist in catalogue');
  assert.ok(p126, 'Product 126 must exist in catalogue');
});

// ----------------------------------------------------------------------------
// PART C: Surface Defects (D7–D16)
// ----------------------------------------------------------------------------
console.log('\n--- Part C: Surface Defects (D7–D16) ---');

it('C.1 D7: Drawer close affordance verified in components', () => {
  const kycSrc = fs.readFileSync('src/pages/manager/sections/ManagerKycSection.jsx', 'utf8');
  assert.ok(kycSrc.includes('closeDrawer'), 'KYC drawer must have closeDrawer function');
  assert.ok(kycSrc.includes('variant="secondary"') && kycSrc.includes('Close'), 'KYC drawer must have footer Close button');

  const accSrc = fs.readFileSync('src/pages/manager/sections/ManagerAccountsSection.jsx', 'utf8');
  assert.ok(accSrc.includes('variant="secondary"') && accSrc.includes('Close'), 'Accounts drawer must have footer Close button');
  assert.ok(accSrc.includes(`e.key === 'Escape'`), 'Accounts drawer must support Esc key');

  const tckSrc = fs.readFileSync('src/pages/manager/sections/ManagerTicketsSection.jsx', 'utf8');
  assert.ok(tckSrc.includes('variant="secondary"') && tckSrc.includes('Close'), 'Tickets drawer must have footer Close button');
});

it('C.2 D8: Mojibake repair: zero mojibake literals in seed and SEED_VERSION = 2', () => {
  assert.strictEqual(SEED_VERSION, 2, 'SEED_VERSION must be 2');
  const apiSrc = fs.readFileSync('src/services/api.js', 'utf8');
  const seedLines = apiSrc.split('\n').slice(150, 1110);
  const mojibakeInSeed = seedLines.filter(line => line.includes('â‚') || line.includes('â€'));
  assert.strictEqual(mojibakeInSeed.length, 0, 'No mojibake in seed literals');
});

it('C.3 D9: One unread count: portal header badge, sidebar, and "More" read synchronously', () => {
  const dashSrc = fs.readFileSync('src/pages/portal/PortalDashboardPage.jsx', 'utf8');
  assert.ok(dashSrc.includes('unreadN = useMemo'), 'unreadN must be memoized/derived synchronously');
  assert.ok(dashSrc.includes('unreadN > 0 &&'), 'Unread count conditionally displays badge in header and navigation');
});

it('C.4 D10: Calculator -> apply hand-off integrity: ₹1,00,000, 12 months, general -> ₹1,07,027.98', () => {
  // Rate for 12 months (1-2 years band) is 6.85%
  const calcResult = calculateFD({
    principal: 100000,
    annualRatePct: 6.85,
    tenureMonths: 12
  });
  assert.strictEqual(calcResult.maturityValue, 107027.98, 'FD maturity amount must match ₹1,07,027.98 to the paisa');
});

it('C.5 D11: Receipts name products, not inventions: "Trade Current" instead of invented names', () => {
  const xferSrc = fs.readFileSync('src/pages/portal/sections/TransfersSection.jsx', 'utf8');
  assert.ok(xferSrc.includes('accountLabel(ownAccount)'), 'Receipt derives from genuine account label');
  assert.ok(xferSrc.includes('Trade Current'), 'Trade Current name is preserved');
});

it('C.6 D12: Set PIN modal starts empty with password type and validation', () => {
  const cardsSrc = fs.readFileSync('src/pages/portal/sections/CardsSection.jsx', 'utf8');
  assert.ok(cardsSrc.includes(`type="password"`), 'PIN inputs must have type="password"');
  assert.ok(cardsSrc.includes(`autoComplete="new-password"`), 'PIN inputs must have autoComplete="new-password"');
  assert.ok(cardsSrc.includes(`pin.length !== 4`), 'Submit must require exactly 4 digits');
});

it('C.7 D13: Seed timestamps do not age: computed as relative offsets', () => {
  const db = getDb();
  const kycCases = db.kycApplications || [];
  assert.ok(kycCases.length > 0);
  const now = Date.now();
  for (const c of kycCases) {
    const t = new Date(c.submittedAt).getTime();
    const ageHours = (now - t) / 3600000;
    assert.ok(ageHours < 72, `KYC case ${c.kycCaseId} age ${ageHours}h should be fresh relative offset (< 72h)`);
  }
});

it('C.8 D14: Accounts page: count and grid derived synchronously from ONE filtered array', () => {
  const accSrc = fs.readFileSync('src/pages/AccountsPage.jsx', 'utf8');
  assert.ok(accSrc.includes('filtered.length'), 'Count must be derived from filtered array length');
  assert.ok(accSrc.includes(`CATEGORY_CHIPS = [`), 'Category chips row must exist');
});

it('C.9 D15: Grievance quick-links wrap with flex-wrap without horizontal scroll', () => {
  const layoutSrc = fs.readFileSync('src/pages/legal/LegalLayout.jsx', 'utf8');
  assert.ok(layoutSrc.includes('flex flex-wrap gap-2'), 'Quick links must use flex-wrap');
  // Check that the mobile quick links nav does not have overflow-x-auto
  const mobileNav = layoutSrc.match(/<nav\s+aria-label="On this page quick links"[^>]+>/);
  assert.ok(mobileNav, 'Mobile quick links nav exists');
  assert.ok(!mobileNav[0].includes('overflow-x-auto'), 'Horizontal scroll must not be present on quick links nav');
});

it('C.10 D16: Homepage CTA lands on portal login in registration mode', () => {
  const homeSrc = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  assert.ok(homeSrc.includes(`to="/portal/login?mode=register"`), 'Homepage CTA must link to ?mode=register');
  assert.ok(homeSrc.includes(`mode: 'register'`), 'Homepage CTA must pass state: { mode: "register" }');

  const loginSrc = fs.readFileSync('src/pages/portal/PortalLoginPage.jsx', 'utf8');
  assert.ok(loginSrc.includes(`searchParams.get('mode') === 'register'`), 'PortalLoginPage must initialize mode to register');
});

// ----------------------------------------------------------------------------
// PART D: D18 - IMPS Exercisable in Demo Seed
// ----------------------------------------------------------------------------
console.log('\n--- Part D: IMPS Exercisable in Demo Seed (D18) ---');

await itAsync('D.1 D18: External beneficiary Suresh Menon exists and ₹100 IMPS transfer quotes fee', async () => {
  const db = getDb();
  const beneficiaries = db.beneficiaries || [];
  const suresh = beneficiaries.find(b => b.beneficiaryName === 'Suresh Menon' && b.bankName === 'HDFC Bank Ltd');
  assert.ok(suresh, 'Beneficiary Suresh Menon must exist in seed');
  assert.strictEqual(suresh.ifscCode, 'HDFC0000128');
  assert.strictEqual(suresh.accountNumber, '50100234567890');
  assert.strictEqual(suresh.customerId, 'CUS-100234');

  // Verify IMPS transfer
  const rails = getLiveRails();
  const impsRail = rails.find(r => r.id === 'IMPS');
  assert.ok(impsRail);
  const quotedFee = impsRail.fee;

  // Execute transfer
  storageMap.set('finedge_session_customer_id', 'CUS-100234');
  storageMap.set('finedge_token', 'mock_token_vikram');

  const custAcc = db.accounts.find(a => a.customerId === 'CUS-100234');
  const transferRes = handleLocalFallback('/api/v1/payments/transfers', {
    method: 'POST',
    body: JSON.stringify({
      debitAccountId: custAcc.accountId,
      beneficiaryId: suresh.beneficiaryId,
      amount: 100,
      railId: 'IMPS',
      remarks: 'Test IMPS external transfer'
    }),
    headers: {}
  });

  assert.strictEqual(transferRes.charges, quotedFee, 'Charged fee must match quoted fee in Platform Settings');
  assert.strictEqual(transferRes.totalDebit, 100 + quotedFee, 'Total debit must be amount + fee');
  assert.strictEqual(transferRes.status, 'SUCCESS');
});

console.log('\n================================================================');
console.log(`MODULE 52 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
