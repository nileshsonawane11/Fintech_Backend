// tests/verify_module43.mjs
// Automated Acceptance Verification Suite for Module 43 — Frontend complete security & integrity (FinEdge Bank)

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Mock localStorage for Node environment
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
  handleLocalFallback,
  getDemoStaffAccounts,
  generateUUID
} = await import('../src/services/api.js');

const {
  decideLoanApplication,
  revealCustomerPan,
  listCustomers
} = await import('../src/services/managerBridge.js');

const {
  portalBridge
} = await import('../src/services/portalBridge.js');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.detail || err.message || JSON.stringify(err)}`);
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
    console.error(`    ${err.detail || err.message || JSON.stringify(err)}`);
    failed++;
  }
}

console.log('================================================================');
console.log('STARTING MODULE 43 ACCEPTANCE VERIFICATION');
console.log('================================================================');

// Initialize fresh database
resetDemoDb();
storageMap.clear();

// ============================================================================
// 1. Impersonation & Session Expiry
// ============================================================================
console.log('\n--- 1. Impersonation & Issued Sessions ---');

it('Stored session id by hand with non-existent session throws 401 UNAUTHENTICATED', () => {
  storageMap.clear();
  storageMap.set('finedge_access_token', 'fake-uuid-not-in-db-sessions');
  
  let rejected = false;
  try {
    handleLocalFallback('/api/v1/accounts', { method: 'GET' });
  } catch (err) {
    if (err.status === 401 && err.code === 'UNAUTHENTICATED') {
      rejected = true;
    }
  }
  assert.equal(rejected, true, 'Non-existent session id must be rejected with 401 UNAUTHENTICATED');
});

it('Valid session id succeeds and resolves correct customer', () => {
  storageMap.clear();
  const db = getDb();
  const validSessionId = 'ses_cust_' + generateUUID();
  db.sessions = [{
    sessionId: validSessionId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString()
  }];
  saveDb(db);

  storageMap.set('finedge_access_token', validSessionId);
  const res = handleLocalFallback('/api/v1/accounts', { method: 'GET' });
  assert(Array.isArray(res.data) && res.data.length > 0, 'Accounts list returned');
  assert(res.data.every(a => a.customerId === 'CUS-100234'), 'All accounts belong to CUS-100234');
});

it('Expired session throws 401 UNAUTHENTICATED or SESSION_EXPIRED', () => {
  storageMap.clear();
  const db = getDb();
  const expiredSessionId = 'ses_cust_expired_' + generateUUID();
  db.sessions.push({
    sessionId: expiredSessionId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastActiveAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  });
  saveDb(db);

  storageMap.set('finedge_access_token', expiredSessionId);
  let rejected = false;
  try {
    handleLocalFallback('/api/v1/accounts', { method: 'GET' });
  } catch (err) {
    if (err.status === 401 && (err.code === 'UNAUTHENTICATED' || err.code === 'SESSION_EXPIRED')) {
      rejected = true;
    }
  }
  assert.equal(rejected, true, 'Expired session must throw 401 UNAUTHENTICATED or SESSION_EXPIRED');
});

// ============================================================================
// 2. Skip-MFA & Pending Challenges
// ============================================================================
console.log('\n--- 2. Skip-MFA & Pending Challenge Protection ---');

it('Password step issues short-lived challengeId, not a session', () => {
  storageMap.clear();
  const loginRes = handleLocalFallback('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'vikram.sharma@finedge.customer',
      password: 'Password@123'
    })
  });

  assert(loginRes.mfaRequired === true, 'MFA is required');
  assert(Boolean(loginRes.challengeId || loginRes.mfaReferenceId), 'Challenge ID issued');
  assert(!loginRes.token && !loginRes.sessionId, 'NO session token issued on password step');

  // Verify challenge is in db.pendingChallenges, not in db.sessions
  const db = getDb();
  const challengeId = loginRes.challengeId || loginRes.mfaReferenceId;
  const sessionFound = (db.sessions || []).find(s => s.sessionId === challengeId);
  assert.equal(sessionFound, undefined, 'Challenge ID must NOT exist in db.sessions');

  const pendingFound = (db.pendingChallenges || []).find(c => c.challengeId === challengeId);
  assert(Boolean(pendingFound), 'Pending challenge recorded');
});

it('Calling data handlers with pending challengeId throws 401 UNAUTHENTICATED', () => {
  const db = getDb();
  const challenge = (db.pendingChallenges || [])[0];
  assert(Boolean(challenge), 'Challenge exists from previous test');

  storageMap.set('finedge_access_token', challenge.challengeId);
  let rejected = false;
  try {
    handleLocalFallback('/api/v1/customers/me', { method: 'GET' });
  } catch (err) {
    if (err.status === 401 && err.code === 'UNAUTHENTICATED') {
      rejected = true;
    }
  }
  assert.equal(rejected, true, 'Pending challenge must be rejected by data handlers with 401');
});

// ============================================================================
// 3. MFA Guessing & Lockout
// ============================================================================
console.log('\n--- 3. MFA Guessing & Challenge Invalidation ---');

it('3 wrong OTP attempts invalidates challenge; subsequent correct OTP fails', () => {
  storageMap.clear();
  // Start fresh login
  const loginRes = handleLocalFallback('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'vikram.sharma@finedge.customer',
      password: 'Password@123'
    })
  });
  const cId = loginRes.challengeId || loginRes.mfaReferenceId;

  // 1st wrong attempt
  try {
    handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: cId, otp: '000000' })
    });
  } catch (e) {
    assert.equal(e.code, 'INVALID_MFA_OTP');
  }

  // 2nd wrong attempt
  try {
    handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: cId, otp: '111111' })
    });
  } catch (e) {
    assert.equal(e.code, 'INVALID_MFA_OTP');
  }

  // 3rd wrong attempt -> locks/invalidates challenge
  try {
    handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: cId, otp: '222222' })
    });
  } catch (e) {
    assert.equal(e.code, 'MFA_MAX_ATTEMPTS_EXCEEDED');
  }

  // 4th attempt now fails
  let blocked = false;
  try {
    handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: cId, otp: '849201' })
    });
  } catch (e) {
    if (e.code === 'INVALID_MFA_CHALLENGE' || e.code === 'CHALLENGE_INVALID' || e.code === 'MFA_MAX_ATTEMPTS_EXCEEDED') {
      blocked = true;
    }
  }
  assert.equal(blocked, true, 'Submitting correct code to invalidated challenge is refused');

  // Fresh login + correct code establishes session
  const freshLogin = handleLocalFallback('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'vikram.sharma@finedge.customer',
      password: 'Password@123'
    })
  });
  const freshVerify = handleLocalFallback('/api/v1/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId: freshLogin.challengeId, otp: '849201' })
  });
  assert(Boolean(freshVerify.accessToken || freshVerify.token || freshVerify.sessionId), 'Session issued after fresh MFA');
});

// ============================================================================
// 4. Role Forgery & Granular Permissions
// ============================================================================
console.log('\n--- 4. Role Forgery & Permission Enforcement ---');

// Seed loan application LN-APP-101 for role testing
{
  const db = getDb();
  db.loanApplications = [{
    loanApplicationId: 'LN-APP-101',
    id: 'LN-APP-101',
    customerId: 'CUS-100234',
    customerName: 'Vikramaditya Sharma',
    loanType: 'HOME',
    amount: 5000000,
    requestedAmount: 5000000,
    tenureMonths: 180,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString()
  }];
  saveDb(db);
}

await itAsync('Invoking loan decision with no staff session throws explicit error "no staff session"', async () => {
  storageMap.clear();
  const db = getDb();
  db.sessions = [];
  saveDb(db);

  let errThrown = null;
  try {
    await decideLoanApplication('LN-APP-101', { decision: 'APPROVED' });
  } catch (err) {
    errThrown = err;
  }
  assert(Boolean(errThrown), 'Error must be thrown');
  assert(
    (errThrown.message && errThrown.message.includes('no staff session')) ||
    (errThrown.detail && errThrown.detail.includes('no staff session')) ||
    errThrown.code === 'NO_STAFF_SESSION',
    'Explicit error "no staff session" or NO_STAFF_SESSION thrown'
  );
});

await itAsync('Invoking loan decision with KYC Officer session is refused (403 INSUFFICIENT_PERMISSIONS)', async () => {
  storageMap.clear();
  const db = getDb();
  const kycSessId = 'ses_stf_kyc_' + generateUUID();
  db.sessions = [{
    sessionId: kycSessId,
    staffId: 'STF-002',
    email: 'kyc.officer@finedge.bank',
    type: 'STAFF',
    role: 'KYC_OFFICER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }];
  saveDb(db);

  storageMap.set('finedge_manager_token', kycSessId);
  storageMap.set('finedge_manager_user', JSON.stringify({
    staffId: 'STF-002',
    email: 'kyc.officer@finedge.bank',
    role: 'KYC_OFFICER',
    fullName: 'Ananya Deshmukh'
  }));

  let refused = false;
  try {
    await decideLoanApplication('LN-APP-101', { decision: 'APPROVED' });
  } catch (err) {
    if (err.status === 403) {
      refused = true;
    }
  }
  assert.equal(refused, true, 'KYC Officer must be refused loan decision with 403');
});

await itAsync('Invoking loan decision with Manager session succeeds and records manager in audit log', async () => {
  storageMap.clear();
  const db = getDb();
  const mgrSessId = 'ses_stf_mgr_' + generateUUID();
  db.sessions = [{
    sessionId: mgrSessId,
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    type: 'STAFF',
    role: 'BANK_MANAGER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }];
  db.loanApplications = [{
    loanApplicationId: 'LN-APP-101',
    id: 'LN-APP-101',
    customerId: 'CUS-100234',
    customerName: 'Vikramaditya Sharma',
    loanType: 'HOME',
    amount: 5000000,
    requestedAmount: 5000000,
    tenureMonths: 180,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString()
  }];
  saveDb(db);

  storageMap.set('finedge_manager_token', mgrSessId);
  storageMap.set('finedge_manager_user', JSON.stringify({
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    role: 'BANK_MANAGER',
    fullName: 'Rajesh Varma'
  }));

  const res = await decideLoanApplication('LN-APP-101', { decision: 'APPROVED', sanctionedAmount: 4500000 });
  assert(res.status === 'APPROVED', 'Loan approved by manager');

  const freshDb = getDb();
  const audit = (freshDb.auditLogs || []).find(a => a.entityId === 'LN-APP-101' && a.action.includes('LOAN_'));
  assert(Boolean(audit), 'Audit log entry written');
  assert.equal(audit.actor, 'manager@finedge.bank', 'Audit actor is manager@finedge.bank');
});

// ============================================================================
// 5. Staff Passwords & Login Integrity
// ============================================================================
console.log('\n--- 5. Staff Passwords & Login Integrity ---');

it('Wrong password (>= 6 chars) is refused with 401 INVALID_CREDENTIALS without minting fake session', () => {
  let failed = false;
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@finedge.bank',
        password: 'WrongPassword123'
      })
    });
  } catch (err) {
    if (err.status === 401 && err.code === 'INVALID_CREDENTIALS') {
      failed = true;
    }
  }
  assert.equal(failed, true, 'Wrong password rejected with 401 INVALID_CREDENTIALS');
});

it('Each seeded staff member authenticates strictly with their own unique password', () => {
  const staffAccounts = getDemoStaffAccounts();
  assert(staffAccounts.length >= 5, 'At least 5 staff accounts seeded');

  // Verify each staff member logs in with their own password
  for (const s of staffAccounts) {
    const res = handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: s.email,
        password: s.password
      })
    });
    assert(Boolean(res.token || res.accessToken), `Staff ${s.email} authenticated successfully with own password`);
  }

  // Cross-staff password rejection: KYC Officer password fails on Manager account
  let rejectedCross = false;
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@finedge.bank',
        password: 'KycOfficer@2026#Sec'
      })
    });
  } catch (err) {
    if (err.status === 401) rejectedCross = true;
  }
  assert.equal(rejectedCross, true, 'Cross-staff password rejected');
});

// ============================================================================
// 6. Response Inspection & PAN Masking Boundary
// ============================================================================
console.log('\n--- 6. Boundary Protection & PAN Masking ---');

await itAsync('Customer responses from /admin/api/v1/customers and /api/v1/customers/me never contain "password" or unmasked "pan"', async () => {
  storageMap.clear();
  const db = getDb();
  const mgrSessId = 'ses_stf_mgr_test';
  const custSessId = 'ses_cust_test';
  db.sessions.push({
    sessionId: mgrSessId,
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    type: 'STAFF',
    role: 'BANK_MANAGER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  db.sessions.push({
    sessionId: custSessId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });
  saveDb(db);

  // 1. /admin/api/v1/customers response inspection
  storageMap.set('finedge_manager_token', mgrSessId);
  const adminCustRes = handleLocalFallback('/admin/api/v1/customers', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mgrSessId}` }
  });
  assert(adminCustRes.length > 0, 'Admin customer list returned');
  for (const c of adminCustRes) {
    assert.equal(c.password, undefined, `Customer ${c.customerId} has no password property`);
    assert.equal(c.pan, undefined, `Customer ${c.customerId} has no unmasked pan property`);
    assert(Boolean(c.panMasked), `Customer ${c.customerId} has panMasked`);
    assert(c.panMasked.includes('••'), `Customer ${c.customerId} pan is properly masked`);
  }

  // 2. /api/v1/customers/me response inspection
  storageMap.set('finedge_access_token', custSessId);
  const meRes = handleLocalFallback('/api/v1/customers/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custSessId}` }
  });
  assert(Boolean(meRes), 'me response returned');
  assert.equal(meRes.password, undefined, 'me has no password');
  assert.equal(meRes.pan, undefined, 'me has no unmasked pan');
  assert(Boolean(meRes.panMasked), 'me has panMasked');
  assert(meRes.panMasked.includes('••'), 'me pan is properly masked');
});

await itAsync('PAN Reveal endpoint returns full PAN and writes non-repudiation audit entry', async () => {
  const db = getDb();
  const mgrSessId = 'ses_stf_mgr_reveal';
  db.sessions.push({
    sessionId: mgrSessId,
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    type: 'STAFF',
    role: 'BANK_MANAGER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  saveDb(db);
  storageMap.set('finedge_manager_token', mgrSessId);

  const revealRes = await revealCustomerPan('CUS-100234');
  assert.equal(revealRes.pan, 'FNEGS1023K', 'Full PAN revealed');

  const freshDb = getDb();
  const audit = (freshDb.auditLogs || []).find(a => a.action === 'CUSTOMER_PAN_REVEALED' && a.entityId === 'CUS-100234');
  assert(Boolean(audit), 'CUSTOMER_PAN_REVEALED audit event recorded');
  assert.equal(audit.actor, 'manager@finedge.bank', 'Audit records real manager email');
});

// ============================================================================
// 7. Money & Records Integrity & Idempotency
// ============================================================================
console.log('\n--- 7. Money & Records Integrity ---');

await itAsync('portalBridge.bookFd enforces positive finite amount, min ₹5000, and balance checks', async () => {
  storageMap.clear();
  const db = getDb();
  const custSessId = 'ses_cust_fd_' + generateUUID();
  db.sessions.push({
    sessionId: custSessId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });
  saveDb(db);
  storageMap.set('finedge_access_token', custSessId);

  // Test negative amount
  let threwNeg = false;
  try {
    await portalBridge.bookFd({ depositAmount: -1000, tenureMonths: 12, interestPayout: 'ON_MATURITY', sourceAccountId: 'ACC-1001' });
  } catch (e) { threwNeg = true; }
  assert.equal(threwNeg, true, 'Negative FD amount rejected');

  // Test below ₹5,000 min
  let threwMin = false;
  try {
    await portalBridge.bookFd({ depositAmount: 2000, tenureMonths: 12, interestPayout: 'ON_MATURITY', sourceAccountId: 'ACC-1001' });
  } catch (e) { threwMin = true; }
  assert.equal(threwMin, true, 'FD amount under ₹5,000 rejected');

  // Valid FD computes interest and maturity amount from product grid
  const validFd = await portalBridge.bookFd({ depositAmount: 50000, tenureMonths: 12, interestPayout: 'ON_MATURITY', sourceAccountId: 'ACC-1001' });
  assert(validFd.rate >= 6.5, `Dynamic rate applied: ${validFd.rate}%`);
  assert(validFd.maturityAmount > 50000, `Maturity amount computed: ₹${validFd.maturityAmount}`);
});

await itAsync('portalBridge.applyLoan validates limits, operative account ownership, and consents', async () => {
  storageMap.clear();
  const db = getDb();
  const custSessId = 'ses_cust_loan_' + generateUUID();
  db.sessions.push({
    sessionId: custSessId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });
  saveDb(db);
  storageMap.set('finedge_access_token', custSessId);

  // Test out-of-bounds amount
  let threwOver = false;
  try {
    await portalBridge.applyLoan({
      loanType: 'PERSONAL',
      loanAmount: 100000000, // ₹10 Cr exceeds limit
      tenureMonths: 36,
      disbursementAccountId: 'ACC-1001',
      monthlyIncome: 100000,
      employmentType: 'SALARIED',
      cicConsent: true,
      mitcConsent: true
    });
  } catch (e) { threwOver = true; }
  assert.equal(threwOver, true, 'Excessive loan amount rejected');

  // Valid loan records submitted consents
  const validLoan = await portalBridge.applyLoan({
    loanType: 'PERSONAL',
    loanAmount: 300000,
    tenureMonths: 24,
    disbursementAccountId: 'ACC-1001',
    monthlyIncome: 150000,
    employmentType: 'SALARIED',
    cicConsent: true,
    mitcConsent: true
  });
  assert.equal(validLoan.cicConsent, true, 'Submitted cicConsent persisted');
  assert.equal(validLoan.mitcConsent, true, 'Submitted mitcConsent persisted');
});

it('Idempotency keys prevent double debits on transfer retries', () => {
  storageMap.clear();
  const db = getDb();
  const custSessId = 'ses_cust_transfer_' + generateUUID();
  db.sessions = [{
    sessionId: custSessId,
    customerId: 'CUS-100234',
    type: 'CUSTOMER',
    role: 'CUSTOMER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  }];
  saveDb(db);
  storageMap.set('finedge_access_token', custSessId);

  const acc = db.accounts.find(a => a.accountId === 'ACC-1001' || a.accountNumber === 'ACC-1001');
  const initialBal = acc.balance.availableBalance;
  const idemKey = 'idem-test-' + generateUUID();

  // 1st Transfer
  const res1 = handleLocalFallback('/api/v1/payments/transfers', {
    method: 'POST',
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify({
      fromAccountId: 'ACC-1001',
      toAccountNumber: 'ACC-1002',
      toName: 'Priya Nair',
      toIfsc: 'FEDG0001021',
      amount: 1000,
      rail: 'INTERNAL',
      remarks: 'Rent'
    })
  });
  assert.equal(res1.status, 'SUCCESS');

  const balAfter1 = getDb().accounts.find(a => a.accountId === 'ACC-1001' || a.accountNumber === 'ACC-1001').balance.availableBalance;
  assert.equal(balAfter1, initialBal - 1000, 'Initial transfer debited ₹1000');

  // 2nd Transfer with identical Idempotency-Key
  const res2 = handleLocalFallback('/api/v1/payments/transfers', {
    method: 'POST',
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify({
      fromAccountId: 'ACC-1001',
      toAccountNumber: 'ACC-1002',
      toName: 'Priya Nair',
      toIfsc: 'FEDG0001021',
      amount: 1000,
      rail: 'INTERNAL',
      remarks: 'Rent'
    })
  });

  const balAfter2 = getDb().accounts.find(a => a.accountId === 'ACC-1001' || a.accountNumber === 'ACC-1001').balance.availableBalance;
  assert.equal(balAfter2, balAfter1, 'Duplicate request returned cached result without second debit');
  assert.equal(res1.paymentId, res2.paymentId, 'Duplicate request returns identical paymentId');
});

// ============================================================================
// 8. One Font System Platform-wide Census
// ============================================================================
console.log('\n--- 8. One Font System & Typography Census ---');

it('Banned OS font stacks return 0 hits across src/', () => {
  const bannedFonts = ['Segoe UI', 'Helvetica Neue', 'Courier New', '-apple-system'];
  const srcPath = path.resolve(rootDir, 'src');

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath);
      } else if (ent.isFile() && (ent.name.endsWith('.js') || ent.name.endsWith('.jsx') || ent.name.endsWith('.css') || ent.name.endsWith('.svg'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const font of bannedFonts) {
          assert(!content.includes(font), `Banned font "${font}" found in ${ent.name}`);
        }
      }
    }
  }
  scanDir(srcPath);
});

it('fontFamily or font-family attributes across src/ exist ONLY in src/index.css', () => {
  const srcPath = path.resolve(rootDir, 'src');
  const matches = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath);
      } else if (ent.isFile() && (ent.name.endsWith('.js') || ent.name.endsWith('.jsx') || ent.name.endsWith('.css') || ent.name.endsWith('.svg'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/fontFamily|font-family/i.test(content)) {
          matches.push(fullPath);
        }
      }
    }
  }
  scanDir(srcPath);

  assert.equal(matches.length, 1, `Expected exactly 1 file with font-family, got: ${matches.map(m => path.basename(m)).join(', ')}`);
  assert(matches[0].endsWith('index.css'), 'The single allowed font-family file must be src/index.css');
});

// ============================================================================
// 9. Root Security Headers Census
// ============================================================================
console.log('\n--- 9. Root Security Headers (vercel.json) ---');

it('vercel.json contains all 5 required security headers on "/(.*)"', () => {
  const vercelPath = path.resolve(rootDir, '..', 'vercel.json');
  assert(fs.existsSync(vercelPath), 'vercel.json exists in repo root');

  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const headerRules = config.headers || [];
  const rootRule = headerRules.find(h => h.source === '/(.*)');
  assert(Boolean(rootRule), 'Wildcard header rule "/(.*)" exists in vercel.json');

  const headersMap = {};
  for (const h of rootRule.headers) {
    headersMap[h.key.toLowerCase()] = h.value;
  }

  assert.equal(headersMap['x-frame-options'], 'DENY');
  assert.equal(headersMap['content-security-policy'], "frame-ancestors 'none'");
  assert.equal(headersMap['x-content-type-options'], 'nosniff');
  assert.equal(headersMap['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(headersMap['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
});

console.log('================================================================');
console.log(`MODULE 43 ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
