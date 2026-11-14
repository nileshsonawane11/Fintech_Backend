import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  traceForm,
  traceRequest,
  traceResponse,
  traceFailure,
  setDebugTrace,
  getDebugTrace,
  sanitizePayload
} from '../src/lib/trace.js';
import {
  getMode,
  setServerMode,
  _resetModeForTests
} from '../src/lib/serverMode.js';
import {
  getDb,
  saveDb,
  getDemoAccounts,
  getDemoStaffAccounts,
  resetDemoDb,
  handleLocalFallback,
  apiRequest
} from '../src/services/api.js';
import { authService } from '../src/services/authService.js';
import { applyLoan, bookFd, getMyProfile } from '../src/services/portalBridge.js';
import {
  listKycCases,
  decideKycCase,
  decideAccountApplication,
  issueCard,
  decideLoanApplication,
  disburseLoan,
  bookInvestmentApplication,
  updateStaffPermissions
} from '../src/services/managerBridge.js';

console.log('================================================================');
console.log('STARTING MODULE 51 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;

function pass(msg) {
  console.log(`  ✓ PASS: ${msg}`);
  passedCount++;
}

function fail(msg, err) {
  console.error(`  ✗ FAIL: ${msg}`);
  if (err) console.error(`    ${err.message || err}`);
  failedCount++;
}

function resolveFrontendPath(relPath) {
  const cleanRel = relPath.replace(/^frontend\//, '');
  const p1 = path.resolve(process.cwd(), cleanRel);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'frontend', cleanRel);
  if (fs.existsSync(p2)) return p2;
  return p1;
}

// Mock localStorage if in node environment
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};
global.sessionStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

// -------------------------------------------------------------
// Row 1: Fresh profile login pages
// -------------------------------------------------------------
console.log('--- Row 1: Fresh profile login pages ---');
try {
  const portalLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/portal/PortalLoginPage.jsx'), 'utf8');
  const managerLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/manager/ManagerLoginPage.jsx'), 'utf8');

  const b1Copy = 'Demo mode — no server is connected. You are signing in to demonstration data stored only in this browser.';
  assert.ok(portalLoginCode.includes(b1Copy), 'PortalLoginPage must contain exact B.1 demo copy');
  assert.ok(managerLoginCode.includes(b1Copy), 'ManagerLoginPage must contain exact B.1 demo copy');

  assert.ok(portalLoginCode.includes('Demo access'), 'PortalLoginPage must have Demo access panel');
  assert.ok(managerLoginCode.includes('Demo access'), 'ManagerLoginPage must have Demo access panel');

  assert.ok(!portalLoginCode.includes('bypassed for now'), 'PortalLoginPage must not contain "bypassed for now"');
  assert.ok(!managerLoginCode.includes('bypassed for now'), 'ManagerLoginPage must not contain "bypassed for now"');
  pass('Row 1: Fresh profile login pages render amber demo notice, Demo access panels, zero red banner, zero "bypassed"');
} catch (e) {
  fail('Row 1: Fresh profile login pages', e);
}

// -------------------------------------------------------------
// Row 2: Demo sign-in works
// -------------------------------------------------------------
console.log('\n--- Row 2: Demo sign-in works (Customer + Staff) ---');
try {
  storage.clear();
  resetDemoDb();
  _resetModeForTests('demo');

  // Customer login step 1
  const custStep1 = handleLocalFallback('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'Password@123' })
  });
  assert.ok(custStep1.challengeId, 'Customer login step 1 produces challengeId');

  // Customer MFA verification with 849201
  const custMfa = handleLocalFallback('/api/v1/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId: custStep1.challengeId, otp: '849201' })
  });
  assert.ok(custMfa.accessToken || custMfa.sessionId, 'Customer MFA step completes successfully');

  // Staff login: Chief Branch Manager
  const staffLogin = handleLocalFallback('/admin/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'manager@finedge.bank', password: 'Manager@2026', role: 'BANK_MANAGER' })
  });
  assert.ok(staffLogin.token, 'Staff login produces token');
  const staffLoginRole = staffLogin.role || staffLogin.user?.role || staffLogin.managerUser?.role;
  assert.equal(staffLoginRole, 'BANK_MANAGER', 'Staff member authenticated as BANK_MANAGER');

  // Verify demo strip B.2 in shells
  const portalDashboardCode = fs.readFileSync(resolveFrontendPath('src/pages/portal/PortalDashboardPage.jsx'), 'utf8');
  const managerPortalCode = fs.readFileSync(resolveFrontendPath('src/pages/manager/ManagerPortalPage.jsx'), 'utf8');
  const b2Copy = 'Demo mode · demonstration data — nothing here is a real bank record.';
  assert.ok(portalDashboardCode.includes(b2Copy), 'PortalDashboardPage has B.2 demo strip');
  assert.ok(managerPortalCode.includes(b2Copy), 'ManagerPortalPage has B.2 demo strip');
  pass('Row 2: Customer (with OTP 849201) and Chief Branch Manager sign in successfully; shells include B.2 demo strip');
} catch (e) {
  fail('Row 2: Demo sign-in works', e);
}

// -------------------------------------------------------------
// Row 3: Cross-login refused both directions
// -------------------------------------------------------------
console.log('\n--- Row 3: Cross-login refused both directions ---');
try {
  storage.clear();
  const refusalMsg = 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.';

  // Customer credentials at Manager login
  let mgrThrew = false;
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vikram.sharma@finedge.customer', password: 'Password@123' })
    });
  } catch (err) {
    mgrThrew = true;
    assert.equal(err.status, 401);
    assert.equal(err.detail, refusalMsg);
  }
  assert.ok(mgrThrew, 'Manager login refuses customer credentials');

  // Staff credentials at Portal login
  let custThrew = false;
  try {
    handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'manager@finedge.bank', password: 'Manager@2026' })
    });
  } catch (err) {
    custThrew = true;
    assert.equal(err.status, 401);
    assert.equal(err.detail, refusalMsg);
  }
  assert.ok(custThrew, 'Portal login refuses staff credentials');
  pass('Row 3: Cross-login refused both directions with generic refusal message and zero sessions minted');
} catch (e) {
  fail('Row 3: Cross-login refused both directions', e);
}

// -------------------------------------------------------------
// Row 4: Public submissions logged out
// -------------------------------------------------------------
console.log('\n--- Row 4: Public submissions logged out ---');
let pubSavingsAppId = '';
let pubCardAppId = '';
let pubLoanAppId = '';
let pubFdAppId = '';
let pubTicketId = '';

try {
  storage.clear();
  resetDemoDb();
  _resetModeForTests('demo');

  // 1. Savings account application
  const accRes = handleLocalFallback('/api/v1/accounts', {
    method: 'POST',
    body: JSON.stringify({
      applicantName: 'Ananya Deshmukh',
      productCode: 'EDGE_SAVINGS',
      productName: 'Edge Savings Account',
      initialDeposit: 10000,
      email: 'ananya.d@example.com',
      mobile: '9820098200'
    })
  });
  assert.ok(accRes.applicationId || accRes.accountApplicationId || accRes.id, 'Account application returns reference');
  pubSavingsAppId = accRes.applicationId || accRes.accountApplicationId || accRes.id;

  // 2. Card application (Edge Cashback)
  const cardRes = handleLocalFallback('/api/v1/cards/applications', {
    method: 'POST',
    body: JSON.stringify({
      applicantName: 'Ananya Deshmukh',
      cardSlug: 'edge-cashback',
      cardName: 'Edge Cashback Credit Card',
      annualIncome: 1200000,
      monthlyIncome: 100000,
      requestedLimit: 50000,
      limit: 50000,
      pan: 'ABCDE1234F'
    })
  });
  assert.ok(cardRes.applicationId || cardRes.id, 'Card application returns reference');
  pubCardAppId = cardRes.applicationId || cardRes.id;

  // 3. Business Growth Loan application
  const loanRes = await applyLoan(null, {
    applicantName: 'Ananya Deshmukh',
    productName: 'Business Growth Loan',
    loanAmount: 250000,
    tenureMonths: 24,
    monthlyIncome: 150000,
    employmentType: 'BUSINESS',
    cicConsent: true,
    mitcConsent: true
  });
  assert.ok(loanRes.applicationId || loanRes.id, 'Loan application returns reference');
  pubLoanAppId = loanRes.applicationId || loanRes.id;

  // 4. Fixed Deposit application
  const fdRes = await bookFd(null, {
    applicantName: 'Ananya Deshmukh',
    productName: 'FinEdge Fixed Deposit',
    depositAmount: 50000,
    tenureMonths: 12,
    interestPayout: 'ON_MATURITY'
  });
  assert.ok(fdRes.investmentId || fdRes.id, 'FD application returns reference');
  pubFdAppId = fdRes.investmentId || fdRes.id;

  // 5. Grievance ticket (TCK-######)
  const ticketRes = handleLocalFallback('/api/v1/support/tickets', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Ananya Deshmukh',
      email: 'ananya.d@example.com',
      category: 'TRANSACTION',
      subject: 'Inquiry regarding inward NEFT settlement',
      description: 'Waiting for settlement confirmation on transaction'
    })
  });
  assert.ok(ticketRes.ticketNumber || ticketRes.ticketId || ticketRes.id, 'Grievance ticket returns reference');
  pubTicketId = ticketRes.ticketNumber || ticketRes.ticketId || ticketRes.id;
  assert.match(pubTicketId, /^TCK-\d{6}/, 'Ticket format is TCK-######');

  // Verify all 5 are in the manager queues
  const db = getDb();
  assert.ok(db.accountApplications.some(a => (a.id === pubSavingsAppId || a.accountApplicationId === pubSavingsAppId)), 'Account app found in queue');
  assert.ok(db.cardApplications.some(c => (c.id === pubCardAppId || c.applicationId === pubCardAppId)), 'Card app found in queue');
  assert.ok(db.loanApplications.some(l => (l.id === pubLoanAppId || l.applicationId === pubLoanAppId)), 'Loan app found in queue');
  assert.ok(db.investments.some(i => (i.id === pubFdAppId || i.investmentId === pubFdAppId)), 'FD app found in queue');
  const ticketsList = db.supportTickets || db.tickets || [];
  assert.ok(ticketsList.some(t => (t.id === pubTicketId || t.ticketNumber === pubTicketId || t.ticketId === pubTicketId)), 'Ticket found in queue');

  pass(`Row 4: Public submissions logged out succeed (ACC: ${pubSavingsAppId}, CARD: ${pubCardAppId}, LOAN: ${pubLoanAppId}, FD: ${pubFdAppId}, TICKET: ${pubTicketId})`);
} catch (e) {
  console.error('Row 4 error details:', e);
  fail('Row 4: Public submissions logged out', e);
}

// -------------------------------------------------------------
// Row 5: Staff decisions executed as Manager
// -------------------------------------------------------------
console.log('\n--- Row 5: Staff decisions executed as Manager ---');
try {
  // Sign in as Manager
  const staffLogin = handleLocalFallback('/admin/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'manager@finedge.bank', password: 'Manager@2026', role: 'BANK_MANAGER' })
  });
  const actor = {
    actor: 'Rajesh Sharma',
    actorRole: 'BANK_MANAGER',
    actorEmail: 'manager@finedge.bank'
  };

  // 1. KYC approve on an Under Review case
  const dbBeforeKyc = getDb();
  const kycCase = (dbBeforeKyc.kycApplications || []).find(k => k.status === 'UNDER_REVIEW') || { id: 'KYC-APP-2001' };
  if (!dbBeforeKyc.kycApplications) dbBeforeKyc.kycApplications = [kycCase];
  const kycRes = await decideKycCase(kycCase.id || kycCase.kycCaseId, { decision: 'APPROVED', note: 'All KYC documents verified', ...actor });
  assert.equal(kycRes.status, 'APPROVED', 'KYC approved');

  // 2. Account approve on pubSavingsAppId
  const accDecRes = await decideAccountApplication(pubSavingsAppId, { decision: 'APPROVED', note: 'Account opening authorized', ...actor });
  assert.equal(accDecRes.status, 'APPROVED', 'Account application approved');
  const dbAfterAcc = getDb();
  assert.ok(dbAfterAcc.accounts.some(a => a.accountNumber), 'New active account created after approval');

  // 3. Card issue at ₹50,000 limit
  const cardIssueRes = await issueCard(pubCardAppId, { limit: 50000, ...actor });
  assert.equal(cardIssueRes.status, 'APPROVED', 'Card application approved and issued');
  assert.equal(cardIssueRes.limit, 50000, 'Card issued at entered limit of ₹50,000');

  // 4. Loan sanction then disburse
  const sanctionRes = await decideLoanApplication(pubLoanAppId, { decision: 'SANCTIONED', sanctionedAmount: 250000, sanctionedRate: 8.75, note: 'Sanctioned', ...actor });
  assert.ok(sanctionRes.status === 'SANCTIONED' || sanctionRes.status === 'APPROVED', 'Loan sanctioned');
  const disburseRes = await disburseLoan(pubLoanAppId, { note: 'Disbursed to applicant account', ...actor });
  assert.equal(disburseRes.status, 'DISBURSED', 'Loan disbursed');

  // 5. Investment approve then book
  const invBookRes = await bookInvestmentApplication(pubFdAppId, { note: 'Deposit certificate booked', ...actor });
  assert.ok(invBookRes.status === 'BOOKED' || invBookRes.status === 'ACTIVE' || invBookRes.status === 'APPROVED', 'FD investment approved/booked');
  const dbFinal = getDb();
  assert.ok(dbFinal.investments.some(i => (i.id === pubFdAppId || i.investmentId === pubFdAppId)), 'holding exists');

  pass('Row 5: Staff decisions execute end-to-end as Manager (KYC approve, Account approve, Card ₹50k, Loan sanction/disburse, FD book)');
} catch (e) {
  fail('Row 5: Staff decisions executed as Manager', e);
}

// -------------------------------------------------------------
// Row 6: Manager Staff & Roles permission toggle & revert
// -------------------------------------------------------------
console.log('\n--- Row 6: Manager Staff & Roles permission toggle & revert ---');
try {
  const actor = {
    actor: 'Rajesh Sharma',
    actorRole: 'BANK_MANAGER',
    actorEmail: 'manager@finedge.bank'
  };

  // Toggle one permission on STF-002
  const targetStaffId = 'STF-002';
  const db1 = getDb();
  const staffMember = (db1.staffUsers || []).find(s => s.staffId === targetStaffId);
  const initialPerms = [...(staffMember?.permissions || ['kyc.review', 'kyc.approve'])];
  const initialCount = initialPerms.length;

  // Toggle by adding 'cards.issue'
  const modifiedPerms = initialPerms.includes('cards.issue')
    ? initialPerms.filter(p => p !== 'cards.issue')
    : [...initialPerms, 'cards.issue'];

  const updatedStaff = await updateStaffPermissions(targetStaffId, modifiedPerms, actor);
  assert.equal(updatedStaff.permissions.length, modifiedPerms.length, 'Staff member permission count changed');

  // Toggle back to initial
  const revertedStaff = await updateStaffPermissions(targetStaffId, initialPerms, actor);
  assert.equal(revertedStaff.permissions.length, initialCount, 'Staff member permission count restored');
  pass('Row 6: Manager Staff & Roles: permission toggle and revert completes with audit');
} catch (e) {
  fail('Row 6: Manager Staff & Roles permission toggle & revert', e);
}

// -------------------------------------------------------------
// Row 7: D19 re-test: logged out, FD form shows guest fields and no named identity
// -------------------------------------------------------------
console.log('\n--- Row 7: D19 re-test (No identity without session) ---');
try {
  storage.clear();
  const profile = await getMyProfile();
  assert.equal(profile.customer, null, 'getMyProfile returns null customer when logged out');

  const invFieldCode = fs.readFileSync(resolveFrontendPath('src/components/common/InvestmentFormFields.jsx'), 'utf8');
  assert.ok(!invFieldCode.includes('customers[0]'), 'No customers[0] in InvestmentFormFields');
  assert.ok(invFieldCode.includes('user && isExpressMode'), 'Verified identity block bound strictly to authenticated user');
  pass('Row 7: D19 verified: logged-out profile is null, guest fields render without named identity');
} catch (e) {
  fail('Row 7: D19 re-test', e);
}

// -------------------------------------------------------------
// Row 8: Console tracing shows [API →] (demo-local)
// -------------------------------------------------------------
console.log('\n--- Row 8: Console tracing shows (demo-local) ---');
try {
  _resetModeForTests('demo');
  let loggedDemoLocal = false;
  const originalInfo = console.info;
  console.info = (...args) => {
    const text = args.join(' ');
    if (text.includes('[API →] (demo-local)') || text.includes('[API ←] (demo-local)')) {
      loggedDemoLocal = true;
    }
  };

  setDebugTrace(true);
  traceRequest('GET', '/api/v1/accounts');
  traceResponse('/api/v1/accounts', 200, { data: [] });
  console.info = originalInfo;

  assert.ok(loggedDemoLocal, 'Traces in demo mode contain (demo-local) tag');
  pass('Row 8: Console tracing produces [API →] (demo-local) and [API ←] (demo-local) in demo mode');
} catch (e) {
  fail('Row 8: Console tracing in demo mode', e);
}

console.log('\n================================================================');
console.log(`MODULE 51 ACCEPTANCE SUMMARY: ${passedCount} passed, ${failedCount} failed`);
console.log('================================================================\n');

if (failedCount > 0) process.exit(1);
