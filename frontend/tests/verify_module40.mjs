// tests/verify_module40.mjs
// Automated verification suite for Module 40 — Demo login identity drift (FinEdge Bank)

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// Node environment localStorage mock
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const {
  SEED_VERSION,
  SEED_CUSTOMER_ALIASES,
  getDefaultDb,
  getDb,
  saveDb,
  resetDemoDb,
  getDemoAccounts,
  DEMO_ACCOUNTS,
  handleLocalFallback
} = await import('../src/services/api.js');

const { listCustomers } = await import('../src/services/managerBridge.js');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('STARTING MODULE 40 ACCEPTANCE VERIFICATION');
  console.log('================================================================');

  // -----------------------------------------------------------------------------
  // Fix 1.1: Single Source for Demo Identities Derived From Seed Defaults
  // -----------------------------------------------------------------------------
  console.log('\n--- Fix 1.1: Single Source for Demo Identities ---');

  it('getDemoAccounts returns demo accounts derived directly from seed defaults', () => {
    const accounts = getDemoAccounts();
    assert.equal(accounts.length, 2, 'Must have exactly 2 demo accounts');
    
    const defaults = getDefaultDb();
    const vikramSeed = defaults.customers.find(c => c.customerId === 'CUS-100234');
    const aaravSeed = defaults.customers.find(c => c.customerId === 'CUS-100235');

    const vikramDemo = accounts.find(a => a.customerId === 'CUS-100234');
    assert.ok(vikramDemo, 'Vikram demo account must exist');
    assert.equal(vikramDemo.name, vikramSeed.fullName, 'Demo name must equal seed fullName');
    assert.equal(vikramDemo.email, vikramSeed.email, 'Demo email must equal seed email');
    assert.equal(vikramDemo.password, vikramSeed.password, 'Demo password must equal seed password');
    assert.equal(vikramDemo.note, vikramSeed.note, 'Demo note must equal seed note');

    const aaravDemo = accounts.find(a => a.customerId === 'CUS-100235');
    assert.ok(aaravDemo, 'Aarav demo account must exist');
    assert.equal(aaravDemo.name, aaravSeed.fullName, 'Demo name must equal seed fullName');
    assert.equal(aaravDemo.email, aaravSeed.email, 'Demo email must equal seed email');
    assert.equal(aaravDemo.password, aaravSeed.password, 'Demo password must equal seed password');
    assert.equal(aaravDemo.note, aaravSeed.note, 'Demo note must equal seed note');
  });

  it('DEMO_ACCOUNTS constant matches getDemoAccounts()', () => {
    assert.deepEqual(DEMO_ACCOUNTS, getDemoAccounts());
  });

  it('PortalLoginPage imports and derives DEMO_ACCOUNTS from seed defaults', () => {
    const portalLoginCode = fs.readFileSync(path.resolve('src/pages/portal/PortalLoginPage.jsx'), 'utf8');
    assert.ok(portalLoginCode.includes('getDemoAccounts'), 'PortalLoginPage must import getDemoAccounts');
    assert.ok(portalLoginCode.includes('const DEMO_ACCOUNTS = getDemoAccounts();'), 'DEMO_ACCOUNTS must be derived from getDemoAccounts()');
  });

  // -----------------------------------------------------------------------------
  // Fix 1.2: Alias Map & Backward Compatibility
  // -----------------------------------------------------------------------------
  console.log('\n--- Fix 1.2: Alias Map for Seeded Customers ---');

  it('SEED_CUSTOMER_ALIASES contains required historical and current identifiers', () => {
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100234'], 'Vikram alias list must exist');
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100234'].includes('vikram.sharma@finedge.customer'));
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100234'].includes('vikram@example.com'));
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100234'].includes('vikram@finedge-mail.in'));
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100234'].includes('9820110023'));

    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100235'], 'Aarav alias list must exist');
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100235'].includes('aarav.patel@finedge-mail.in'));
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100235'].includes('aarav.patel@example.com'));
    assert.ok(SEED_CUSTOMER_ALIASES['CUS-100235'].includes('9844001122'));
  });

  // -----------------------------------------------------------------------------
  // Acceptance: Stale-db reproduction & Resolution
  // -----------------------------------------------------------------------------
  console.log('\n--- Acceptance: Stale-DB Reproduction & Version Re-sync ---');

  it('Seeding browser with old-shape db succeeds via Fix 1 aliases', () => {
    // Construct stale DB
    const staleDb = getDefaultDb();
    staleDb.seedVersion = 0; // old version
    const vikram = staleDb.customers.find(c => c.customerId === 'CUS-100234');
    vikram.email = 'vikram@example.com'; // legacy email
    const aarav = staleDb.customers.find(c => c.customerId === 'CUS-100235');
    aarav.email = 'aarav.patel@example.com'; // legacy email

    storageMap.set('finedge_persistent_db', JSON.stringify(staleDb));

    // 1. "Use account" for Vikram submits seed email (vikram.sharma@finedge.customer)
    const vikramRes = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'Password@123' })
    });
    assert.equal(vikramRes.mfaRequired, true);
    assert.equal(vikramRes.customerId, 'CUS-100234');

    // Verify OTP succeeds
    const vikramOtpRes = handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaReferenceId: vikramRes.mfaReferenceId, otp: '849201' })
    });
    assert.equal(vikramOtpRes.customerId, 'CUS-100234');

    // 2. "Use account" for Aarav submits seed email (aarav.patel@finedge-mail.in)
    const aaravRes = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aarav.patel@finedge-mail.in', password: 'Password@123' })
    });
    assert.equal(aaravRes.mfaRequired, true);
    assert.equal(aaravRes.customerId, 'CUS-100235');

    // 3. Historical email direct logins also succeed
    const histVikram = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram@example.com', password: 'Password@123' })
    });
    assert.equal(histVikram.customerId, 'CUS-100234');

    const histAarav = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aarav.patel@example.com', password: 'Password@123' })
    });
    assert.equal(histAarav.customerId, 'CUS-100235');
  });

  await itAsync('After Fix 2 version bump, getDb re-syncs stored records and manager Customers view shows seed emails', async () => {
    // Trigger getDb() re-sync
    const db = getDb();
    assert.equal(db.seedVersion, SEED_VERSION, 'Database seedVersion must be updated');

    const syncedVikram = db.customers.find(c => c.customerId === 'CUS-100234');
    assert.equal(syncedVikram.email, 'vikram.sharma@finedge.customer', 'Vikram email must re-sync to current seed');

    const syncedAarav = db.customers.find(c => c.customerId === 'CUS-100235');
    assert.equal(syncedAarav.email, 'aarav.patel@finedge-mail.in', 'Aarav email must re-sync to current seed');

    // Check Manager Customers view
    const customers = await listCustomers();
    const mgrVikram = customers.find(c => c.customerId === 'CUS-100234');
    assert.equal(mgrVikram.email, 'vikram.sharma@finedge.customer');
    const mgrAarav = customers.find(c => c.customerId === 'CUS-100235');
    assert.equal(mgrAarav.email, 'aarav.patel@finedge-mail.in');
  });

  // -----------------------------------------------------------------------------
  // Acceptance: Password Preservation
  // -----------------------------------------------------------------------------
  console.log('\n--- Acceptance: Password Preservation Across Re-sync ---');

  it('Vikram password change survives version bump and re-sync', () => {
    // Vikram changes password via API
    storageMap.set('finedge_session_customer_id', 'CUS-100234');
    storageMap.set('finedge_access_token', 'mock_token_for_vikram');
    handleLocalFallback('/api/v1/customers/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'Password@123', newPassword: 'NewSecur3P@ss!2026' })
    });

    // Verify stored password changed
    const dbBefore = getDb();
    const vBefore = dbBefore.customers.find(c => c.customerId === 'CUS-100234');
    assert.equal(vBefore.password, 'NewSecur3P@ss!2026');

    // Simulate sign out and reload with an older stored seedVersion to force re-sync
    dbBefore.seedVersion = 0;
    saveDb(dbBefore);

    // Trigger getDb (re-sync runs)
    const dbAfter = getDb();
    assert.equal(dbAfter.seedVersion, SEED_VERSION);
    const vAfter = dbAfter.customers.find(c => c.customerId === 'CUS-100234');
    assert.equal(vAfter.password, 'NewSecur3P@ss!2026', 'Password must NEVER be overwritten by re-sync');

    // Old password fails
    assert.throws(() => {
      handleLocalFallback('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'Password@123' })
      });
    }, (err) => err.code === 'INVALID_CREDENTIALS');

    // New password succeeds
    const loginRes = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'NewSecur3P@ss!2026' })
    });
    assert.equal(loginRes.customerId, 'CUS-100234');
  });

  // -----------------------------------------------------------------------------
  // Acceptance: Registered Customers Untouched
  // -----------------------------------------------------------------------------
  console.log('\n--- Acceptance: Registered Customers Untouched ---');

  it('Registered customer record is byte-identical across version bump and re-sync', () => {
    // Register new customer
    const regRes = handleLocalFallback('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Ananya Deshmukh',
        mobileNumber: '9811998877',
        email: 'ananya.deshmukh@test.customer',
        password: 'StrongP@ssw0rd!1',
        pan: 'ANANY1234K'
      })
    });
    assert.ok(regRes.userId);

    // Read stored customer object snapshot
    const db1 = getDb();
    const registeredCust = db1.customers.find(c => c.email === 'ananya.deshmukh@test.customer');
    assert.ok(registeredCust);
    const snapshotBefore = JSON.stringify(registeredCust);

    // Trigger version bump re-sync
    db1.seedVersion = 0;
    saveDb(db1);
    const db2 = getDb();

    const registeredCustAfter = db2.customers.find(c => c.email === 'ananya.deshmukh@test.customer');
    assert.ok(registeredCustAfter);
    const snapshotAfter = JSON.stringify(registeredCustAfter);

    assert.equal(snapshotAfter, snapshotBefore, 'Registered customer record must be byte-identical');

    // Registered customer signs in with their credentials
    const regLogin = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'ananya.deshmukh@test.customer',
        password: 'StrongP@ssw0rd!1'
      })
    });
    assert.equal(regLogin.customerId, registeredCust.customerId);
  });

  // -----------------------------------------------------------------------------
  // Acceptance: Login Page Reset
  // -----------------------------------------------------------------------------
  console.log('\n--- Acceptance: Login Page Reset ---');

  it('resetDemoDb restores fresh seed and wipes custom data', () => {
    // Add junk data to storage
    const db = getDb();
    db.customJunkField = 'to-be-deleted';
    db.customers.push({ customerId: 'CUS-JUNK', email: 'junk@junk.com' });
    saveDb(db);
    storageMap.set('finedge_user_prefs', JSON.stringify({ theme: 'dark' }));

    // Call resetDemoDb()
    const fresh = resetDemoDb();
    assert.equal(fresh.seedVersion, SEED_VERSION);

    const reloadedDb = getDb();
    assert.equal(reloadedDb.customJunkField, undefined);
    assert.ok(!reloadedDb.customers.some(c => c.customerId === 'CUS-JUNK'));
    assert.equal(localStorage.getItem('finedge_user_prefs'), null);

    // Both demo logins work with original seed credentials
    const vLogin = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'Password@123' })
    });
    assert.equal(vLogin.customerId, 'CUS-100234');

    const aLogin = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aarav.patel@finedge-mail.in', password: 'Password@123' })
    });
    assert.equal(aLogin.customerId, 'CUS-100235');
  });

  // -----------------------------------------------------------------------------
  // Acceptance: UI & Rule Verifications
  // -----------------------------------------------------------------------------
  console.log('\n--- Acceptance: UI & Code Rule Checks ---');

  it('SEED_VERSION comment contains mandatory rule', () => {
    const apiCode = fs.readFileSync(path.resolve('src/services/api.js'), 'utf8');
    assert.ok(
      /bump it whenever a seed identity\/contact field changes/i.test(apiCode),
      'Comment at SEED_VERSION must state the rule: bump it whenever a seed identity/contact field changes'
    );
  });

  it('PortalLoginPage renders Reset demo data button and Modal', () => {
    const portalCode = fs.readFileSync(path.resolve('src/pages/portal/PortalLoginPage.jsx'), 'utf8');
    assert.ok(portalCode.includes('Reset demo data'), 'Portal login must have Reset demo data button');
    assert.ok(portalCode.includes('<Modal'), 'Portal login must render Modal');
    assert.ok(portalCode.includes('title="Reset demo data?"'), 'Modal title must be Reset demo data?');
    assert.ok(portalCode.includes('resetDemoDb()'), 'Modal confirm must call resetDemoDb()');
  });

  it('ManagerLoginPage renders Reset demo data button and Modal', () => {
    const mgrCode = fs.readFileSync(path.resolve('src/pages/manager/ManagerLoginPage.jsx'), 'utf8');
    assert.ok(mgrCode.includes('Reset demo data'), 'Manager login must have Reset demo data button');
    assert.ok(mgrCode.includes('<Modal'), 'Manager login must render Modal');
    assert.ok(mgrCode.includes('title="Reset demo data?"'), 'Modal title must be Reset demo data?');
    assert.ok(mgrCode.includes('resetDemoDb()'), 'Modal confirm must call resetDemoDb()');
  });

  console.log('================================================================');
  console.log(`MODULE 40 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
