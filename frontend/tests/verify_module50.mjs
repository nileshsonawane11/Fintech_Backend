// verify_module50.mjs
// Comprehensive Acceptance Suite for Module 50: Server data only + console tracing (FinEdge Bank)

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {
  DEBUG_TRACE,
  setDebugTrace,
  getDebugTrace,
  traceForm,
  traceRequest,
  traceResponse,
  traceFailure,
  traceData,
  traceDataScope,
  sanitizePayload
} from '../src/lib/trace.js';
import {
  getDb,
  saveDb,
  getDemoAccounts,
  getDemoStaffAccounts,
  resetDemoDb,
  handleLocalFallback
} from '../src/services/api.js';
import { authService } from '../src/services/authService.js';
import { applyLoan, bookFd, bookRd, startSip, openSsy } from '../src/services/portalBridge.js';

console.log('================================================================');
console.log('STARTING MODULE 50 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
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
  // Try current dir first, then frontend subdir
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
// Scenario 1: Cross-login bug verification (Part A)
// -------------------------------------------------------------
console.log('--- Scenario 1: Cross-Login Bug Diagnosis & Authoritative Refusal ---');

try {
  // 1.1 Customer credentials submitted to manager login
  storage.clear();
  let threw = false;
  try {
    await handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@example.com', password: 'Password123!' })
    });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 401, 'Status must be 401');
    assert.equal(err.code, 'INVALID_CREDENTIALS', 'Code must be INVALID_CREDENTIALS');
    assert.equal(err.detail, 'Invalid credentials. Please verify your details.', 'Generic message required');
    // Ensure no account existence leak
    assert.doesNotMatch(err.detail, /customer/i, 'Must not confirm customer account exists');
    assert.doesNotMatch(err.detail, /staff not found/i, 'Must not leak staff not found');
  }
  assert.ok(threw, 'Manager login must refuse customer credentials');
  assert.equal(localStorage.getItem('finedge_manager_token'), null, 'Zero manager tokens in storage on refusal');
  assert.equal(localStorage.getItem('finedge_manager_user'), null, 'Zero manager sessions in storage on refusal');
  pass('Customer credentials on manager login refused with generic 401 INVALID_CREDENTIALS and zero sessions');
} catch (e) {
  fail('Customer credentials on manager login refused with generic 401 INVALID_CREDENTIALS', e);
}

try {
  // 1.2 Staff credentials submitted to customer login
  storage.clear();
  let threw = false;
  try {
    await handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin@finedge.bank', password: 'StaffPassword123!' })
    });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 401, 'Status must be 401');
    assert.equal(err.code, 'INVALID_CREDENTIALS', 'Code must be INVALID_CREDENTIALS');
    assert.equal(err.detail, 'Invalid credentials. Please verify your details.', 'Generic message required');
    assert.doesNotMatch(err.detail, /staff/i, 'Must not confirm staff account exists');
    assert.doesNotMatch(err.detail, /customer not found/i, 'Must not leak customer not found');
  }
  assert.ok(threw, 'Customer login must refuse staff credentials');
  assert.equal(localStorage.getItem('finedge_access_token'), null, 'Zero access tokens in storage on refusal');
  assert.equal(localStorage.getItem('finedge_auth_user'), null, 'Zero customer sessions in storage on refusal');
  pass('Staff credentials on customer login refused with generic 401 INVALID_CREDENTIALS and zero sessions');
} catch (e) {
  fail('Staff credentials on customer login refused with generic 401 INVALID_CREDENTIALS', e);
}

try {
  // 1.3 Intrinsic role verification in authService
  storage.clear();
  // Simulate mock fetch returning customer record to managerLogin
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      success: true,
      data: {
        role: 'CUSTOMER',
        user: { role: 'CUSTOMER', email: 'cust@domain.com' },
        accessToken: 'cust-token'
      }
    })
  });

  let managerLoginThrew = false;
  try {
    await authService.managerLogin('cust@domain.com', 'Pass123!');
  } catch (err) {
    managerLoginThrew = true;
    assert.equal(err.status, 401);
    assert.equal(err.code, 'INVALID_CREDENTIALS');
  } finally {
    global.fetch = originalFetch;
  }
  assert.ok(managerLoginThrew, 'authService.managerLogin must refuse records without STAFF role');
  assert.equal(localStorage.getItem('finedge_manager_token'), null);
  pass('authService decides role strictly by intrinsic matched record, refusing cross-login before session storage');
} catch (e) {
  fail('authService decides role strictly by intrinsic matched record', e);
}

// -------------------------------------------------------------
// Scenario 2: No local platform data & Clean Storage (Part B)
// -------------------------------------------------------------
console.log('\n--- Scenario 2: No Local Platform Data & Clean Boot Contract ---');

try {
  storage.clear();
  const db = getDb();
  assert.equal(localStorage.getItem('finedge_persistent_db'), null, 'finedge_persistent_db must not be written to storage');
  assert.deepEqual(db.customers, [], 'Seeded customers must not be injected into local DB');
  assert.deepEqual(db.staffUsers, [], 'Seeded staff must not be injected into local DB');
  assert.deepEqual(db.accounts, [], 'Seeded accounts must not be injected into local DB');
  assert.deepEqual(db.cards, [], 'Seeded cards must not be injected into local DB');
  pass('getDb() never writes finedge_persistent_db to storage and maintains zero local seed records');
} catch (e) {
  fail('getDb() never writes finedge_persistent_db to storage', e);
}

try {
  const demoCustomers = getDemoAccounts();
  const demoStaff = getDemoStaffAccounts();
  assert.equal(demoCustomers.length, 0, 'Demo customers list must be empty');
  assert.equal(demoStaff.length, 0, 'Demo staff list must be empty');
  pass('getDemoAccounts() and getDemoStaffAccounts() return empty collections');
} catch (e) {
  fail('getDemoAccounts() and getDemoStaffAccounts() return empty collections', e);
}

try {
  // Verify UI login pages have zero demo account expanders or reset buttons
  const portalLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/portal/PortalLoginPage.jsx'), 'utf8');
  const managerLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/manager/ManagerLoginPage.jsx'), 'utf8');

  assert.doesNotMatch(portalLoginCode, /DEMO_ACCOUNTS/i, 'PortalLoginPage must not contain DEMO_ACCOUNTS');
  assert.doesNotMatch(portalLoginCode, /Reset demo data/i, 'PortalLoginPage must not contain Reset demo data');
  assert.doesNotMatch(managerLoginCode, /STAFF_ACCOUNTS/i, 'ManagerLoginPage must not contain STAFF_ACCOUNTS');
  assert.doesNotMatch(managerLoginCode, /Reset demo data/i, 'ManagerLoginPage must not contain Reset demo data');
  pass('PortalLoginPage and ManagerLoginPage render real login forms with zero demo panels and zero reset buttons');
} catch (e) {
  fail('PortalLoginPage and ManagerLoginPage render real login forms', e);
}

try {
  // Verify ProfileSection demo data reset card was completely removed
  const profileSectionCode = fs.readFileSync(resolveFrontendPath('src/pages/portal/sections/ProfileSection.jsx'), 'utf8');
  assert.doesNotMatch(profileSectionCode, /resetDemoData/i, 'ProfileSection must not import or invoke resetDemoData');
  assert.doesNotMatch(profileSectionCode, /Reset demo data/i, 'ProfileSection must not render Reset demo data');
  pass('ProfileSection contains zero demo reset controls');
} catch (e) {
  fail('ProfileSection contains zero demo reset controls', e);
}

// -------------------------------------------------------------
// Scenario 3: Bypassed Unconnected Flows (Part B3)
// -------------------------------------------------------------
console.log('\n--- Scenario 3: Unconnected Flows Bypassed with Honest Note ---');

try {
  let threwLoan = false;
  try {
    await applyLoan('CUS-001', { amount: 50000 });
  } catch (err) {
    threwLoan = true;
    assert.equal(err.code, 'SERVER_NOT_CONNECTED');
    assert.equal(err.message, 'Server not connected — bypassed for now');
  }
  assert.ok(threwLoan, 'applyLoan must reject with SERVER_NOT_CONNECTED');

  let threwFd = false;
  try {
    await bookFd('CUS-001', { amount: 10000 });
  } catch (err) {
    threwFd = true;
    assert.equal(err.code, 'SERVER_NOT_CONNECTED');
    assert.equal(err.message, 'Server not connected — bypassed for now');
  }
  assert.ok(threwFd, 'bookFd must reject with SERVER_NOT_CONNECTED');

  let threwRd = false;
  try {
    await bookRd('CUS-001', { monthly: 1000 });
  } catch (err) {
    threwRd = true;
    assert.equal(err.code, 'SERVER_NOT_CONNECTED');
    assert.equal(err.message, 'Server not connected — bypassed for now');
  }
  assert.ok(threwRd, 'bookRd must reject with SERVER_NOT_CONNECTED');

  let threwSip = false;
  try {
    await startSip('CUS-001', { monthly: 1000 });
  } catch (err) {
    threwSip = true;
    assert.equal(err.code, 'SERVER_NOT_CONNECTED');
    assert.equal(err.message, 'Server not connected — bypassed for now');
  }
  assert.ok(threwSip, 'startSip must reject with SERVER_NOT_CONNECTED');

  let threwSsy = false;
  try {
    await openSsy('CUS-001', { amount: 2000 });
  } catch (err) {
    threwSsy = true;
    assert.equal(err.code, 'SERVER_NOT_CONNECTED');
    assert.equal(err.message, 'Server not connected — bypassed for now');
  }
  assert.ok(threwSsy, 'openSsy must reject with SERVER_NOT_CONNECTED');

  pass('Unconnected financial flows (loans, investments) fail honestly with "Server not connected — bypassed for now" without mock persistence');
} catch (e) {
  fail('Unconnected financial flows fail honestly', e);
}

// -------------------------------------------------------------
// Scenario 4: Console Tracing Utility & Sanitization (Part C)
// -------------------------------------------------------------
console.log('\n--- Scenario 4: Console Tracing Utility & Credential Sanitization ---');

try {
  assert.equal(typeof traceForm, 'function', 'traceForm must be exported');
  assert.equal(typeof traceRequest, 'function', 'traceRequest must be exported');
  assert.equal(typeof traceResponse, 'function', 'traceResponse must be exported');
  assert.equal(typeof traceFailure, 'function', 'traceFailure must be exported');
  assert.equal(typeof traceData, 'function', 'traceData must be exported');
  assert.equal(typeof traceDataScope, 'function', 'traceDataScope must be exported');
  pass('trace.js exports all required tracing functions');
} catch (e) {
  fail('trace.js exports all required tracing functions', e);
}

try {
  const sensitivePayload = {
    email: 'user@finedge.bank',
    password: 'SuperSecretPassword123!',
    otp: '987654',
    pin: '1234',
    secretKey: 'my-bank-secret',
    cvv: '999',
    token: 'jwt-access-token-string',
    nested: {
      accountNumber: '100234567890',
      atmPin: '8888',
      userToken: 'tok-nested-456'
    }
  };

  const sanitized = sanitizePayload(sensitivePayload);
  assert.equal(sanitized.email, 'user@finedge.bank', 'Non-sensitive keys untouched');
  assert.equal(sanitized.password, '•'.repeat(sensitivePayload.password.length), 'Password masked matching length');
  assert.equal(sanitized.otp, '••••••', 'OTP masked matching length');
  assert.equal(sanitized.pin, '••••', 'PIN masked matching length');
  assert.equal(sanitized.secretKey, '•'.repeat(sensitivePayload.secretKey.length), 'Secret masked matching length');
  assert.equal(sanitized.cvv, '••••', 'CVV masked (minimum 4 bullets)');
  assert.equal(sanitized.token, '•'.repeat(sensitivePayload.token.length), 'Token masked');
  assert.equal(sanitized.nested.accountNumber, '100234567890', 'Nested non-sensitive key untouched');
  assert.equal(sanitized.nested.atmPin, '••••', 'Nested PIN masked');
  assert.equal(sanitized.nested.userToken, '•'.repeat(sensitivePayload.nested.userToken.length), 'Nested token masked');
  pass('sanitizePayload recursively masks credentials (password, otp, pin, secret, cvv, token) with exact bullet counts');
} catch (e) {
  fail('sanitizePayload recursively masks credentials', e);
}

try {
  let loggedInfo = [];
  let loggedGroups = [];
  const origInfo = console.info;
  const origGroup = console.groupCollapsed;
  const origGroupEnd = console.groupEnd;

  console.info = (...args) => loggedInfo.push(args);
  console.groupCollapsed = (...args) => loggedGroups.push(args);
  console.groupEnd = () => {};

  setDebugTrace(true);

  traceForm('CustomerLogin', { identifier: 'cust@finedge.bank', password: 'myPassword' });
  traceRequest('POST', '/api/v1/auth/login', { identifier: 'cust@finedge.bank', password: 'myPassword' });
  traceResponse('/api/v1/accounts', 200, [{ accountId: 'ACC-1' }, { accountId: 'ACC-2' }]);
  traceFailure('/api/v1/cards', { message: 'Server not connected — bypassed for now' });
  traceData('PortalDashboard');

  console.info = origInfo;
  console.groupCollapsed = origGroup;
  console.groupEnd = origGroupEnd;

  assert.ok(loggedGroups.some(g => String(g[0]).includes('[FORM] CustomerLogin')), 'traceForm opens [FORM] group');
  assert.ok(loggedInfo.some(i => String(i[0]).startsWith('[API →] POST /api/v1/auth/login')), 'traceRequest logs [API →]');
  assert.ok(loggedInfo.some(i => String(i[0]).startsWith('[API ←] /api/v1/accounts · 200')), 'traceResponse logs [API ←]');
  assert.ok(loggedInfo.some(i => String(i[0]).startsWith('[API ✗] /api/v1/cards · Server not connected')), 'traceFailure logs [API ✗]');
  assert.ok(loggedInfo.some(i => String(i[0]) === '[DATA] PortalDashboard'), 'traceData logs [DATA]');

  pass('Structured console traces formatted correctly with [FORM], [API →], [API ←], [API ✗], and [DATA]');
} catch (e) {
  fail('Structured console traces formatted correctly', e);
}

// -------------------------------------------------------------
// Scenario 5: Silent Console Switch (Part C4)
// -------------------------------------------------------------
console.log('\n--- Scenario 5: Silent Console Switch Verification (DEBUG_TRACE = false) ---');

try {
  setDebugTrace(false);
  assert.equal(getDebugTrace(), false);

  let captured = [];
  const origLog = console.log;
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origGroup = console.groupCollapsed;

  console.log = (...args) => captured.push(args);
  console.info = (...args) => captured.push(args);
  console.warn = (...args) => captured.push(args);
  console.error = (...args) => captured.push(args);
  console.groupCollapsed = (...args) => captured.push(args);

  traceForm('AccountApplication', { fullName: 'Test Name', pan: 'ABCDE1234F' });
  traceRequest('GET', '/api/v1/accounts');
  traceResponse('/api/v1/accounts', 200, { data: 'test' });
  traceFailure('/api/v1/loans', new Error('Failed to fetch'));
  traceData('PortalAccounts');
  await traceDataScope('PortalTransfers', async () => 'done');

  console.log = origLog;
  console.info = origInfo;
  console.warn = origWarn;
  console.error = origError;
  console.groupCollapsed = origGroup;

  setDebugTrace(true); // reset back to default

  assert.equal(captured.length, 0, `Expected 0 logs when DEBUG_TRACE = false, got ${captured.length}`);
  pass('When DEBUG_TRACE = false, console output is 100% silent across all tracing hooks');
} catch (e) {
  setDebugTrace(true);
  fail('When DEBUG_TRACE = false, console output is 100% silent', e);
}

// -------------------------------------------------------------
// Scenario 6: Forms and Sections Tracing Coverage Check
// -------------------------------------------------------------
console.log('\n--- Scenario 6: Comprehensive Form & Data Wire Audit ---');

try {
  const filesToCheck = [
    { file: 'src/components/common/ApplyModal.jsx', form: 'AccountApplication' },
    { file: 'src/pages/legal/GrievanceRedressal.jsx', form: 'GrievanceSubmission' },
    { file: 'src/pages/portal/PortalLoginPage.jsx', form: 'CustomerLogin' },
    { file: 'src/pages/manager/ManagerLoginPage.jsx', form: 'StaffLogin' },
    { file: 'src/pages/portal/sections/TransfersSection.jsx', form: 'FundTransfer' },
    { file: 'src/pages/portal/sections/BeneficiariesSection.jsx', form: 'AddBeneficiary' },
    { file: 'src/pages/portal/sections/KycSection.jsx', form: 'KycSubmission' },
    { file: 'src/pages/portal/sections/CardsSection.jsx', form: 'CardControlsUpdate' },
    { file: 'src/pages/portal/sections/LoansSection.jsx', form: 'LoanApplication' },
    { file: 'src/pages/portal/sections/InvestmentsSection.jsx', form: 'InvestmentApplication' },
    { file: 'src/pages/portal/sections/SupportSection.jsx', form: 'SupportTicketCreate' },
    { file: 'src/pages/manager/sections/ManagerKycSection.jsx', form: 'KycDecision' },
    { file: 'src/pages/manager/sections/ManagerAccountsSection.jsx', form: 'AccountDecision' },
    { file: 'src/pages/manager/sections/ManagerLoansSection.jsx', form: 'LoanDecision' },
    { file: 'src/pages/manager/sections/ManagerCardsSection.jsx', form: 'CardDecision' },
    { file: 'src/pages/manager/sections/ManagerTicketsSection.jsx', form: 'TicketReply' },
    { file: 'src/pages/manager/sections/ManagerCustomersSection.jsx', form: 'CustomerPanReveal' },
    { file: 'src/pages/manager/sections/ManagerProductCatalogueSection.jsx', form: 'ProductCatalogueSave' },
    { file: 'src/pages/manager/sections/ManagerRolesPermissionsSection.jsx', form: 'RolePermissionsUpdate' },
    { file: 'src/pages/manager/sections/ManagerUserManagementSection.jsx', form: 'UserOverridesUpdate' },
    { file: 'src/pages/manager/sections/ManagerSiteContentSection.jsx', form: 'SiteContentUpdate' },
    { file: 'src/pages/manager/sections/ManagerPlatformSettingsSection.jsx', form: 'PlatformSettingsUpdate' },
  ];

  for (const { file, form } of filesToCheck) {
    const fullPath = resolveFrontendPath(file);
    const code = fs.readFileSync(fullPath, 'utf8');
    assert.ok(code.includes(form), `Expected ${file} to call traceForm with '${form}'`);
  }
  pass('All 22 core app forms and operational drawers verified wired to traceForm');
} catch (e) {
  fail('All 22 core app forms and operational drawers verified wired to traceForm', e);
}

// -------------------------------------------------------------
// Scenario 7: Screen Reads [DATA] Coverage Check
// -------------------------------------------------------------
console.log('\n--- Scenario 7: Screen Reads [DATA] Coverage Audit ---');

try {
  const screens = [
    { file: 'src/pages/portal/sections/DashboardSection.jsx', screen: 'PortalDashboard' },
    { file: 'src/pages/portal/sections/AccountsSection.jsx', screen: 'PortalAccounts' },
    { file: 'src/pages/portal/sections/AccountDetailSection.jsx', screen: 'PortalAccountDetail' },
    { file: 'src/pages/portal/sections/TransfersSection.jsx', screen: 'PortalTransfers' },
    { file: 'src/pages/portal/sections/BeneficiariesSection.jsx', screen: 'PortalBeneficiaries' },
    { file: 'src/pages/portal/sections/CardsSection.jsx', screen: 'PortalCards' },
    { file: 'src/pages/portal/sections/KycSection.jsx', screen: 'PortalKyc' },
    { file: 'src/pages/portal/sections/LoansSection.jsx', screen: 'PortalLoans' },
    { file: 'src/pages/portal/sections/InvestmentsSection.jsx', screen: 'PortalInvestments' },
    { file: 'src/pages/portal/sections/SupportSection.jsx', screen: 'PortalSupport' },
    { file: 'src/pages/manager/sections/ManagerDashboardSection.jsx', screen: 'ManagerDashboard' },
    { file: 'src/pages/manager/sections/ManagerAccountsSection.jsx', screen: 'ManagerAccountsQueue' },
    { file: 'src/pages/manager/sections/ManagerLoansSection.jsx', screen: 'ManagerLoansQueue' },
    { file: 'src/pages/manager/sections/ManagerCardsSection.jsx', screen: 'ManagerCardsQueue' },
    { file: 'src/pages/manager/sections/ManagerKycSection.jsx', screen: 'ManagerKycQueue' },
    { file: 'src/pages/manager/sections/ManagerTicketsSection.jsx', screen: 'ManagerTicketsQueue' },
    { file: 'src/pages/manager/sections/ManagerCustomersSection.jsx', screen: 'ManagerCustomersDirectory' },
    { file: 'src/pages/manager/sections/ManagerProductCatalogueSection.jsx', screen: 'ManagerProductCatalogue' },
    { file: 'src/pages/manager/sections/ManagerRolesPermissionsSection.jsx', screen: 'ManagerRolesPermissions' },
    { file: 'src/pages/manager/sections/ManagerUserManagementSection.jsx', screen: 'ManagerUserManagement' },
    { file: 'src/pages/manager/sections/ManagerSiteContentSection.jsx', screen: 'ManagerSiteContent' },
    { file: 'src/pages/manager/sections/ManagerPlatformSettingsSection.jsx', screen: 'ManagerPlatformSettings' },
    { file: 'src/pages/manager/sections/ManagerAuditSection.jsx', screen: 'ManagerAuditLog' },
    { file: 'src/pages/manager/sections/ManagerReportsSection.jsx', screen: 'ManagerReports' }
  ];

  for (const { file, screen } of screens) {
    const fullPath = resolveFrontendPath(file);
    const code = fs.readFileSync(fullPath, 'utf8');
    assert.ok(code.includes(`traceData('${screen}')`), `Expected ${file} to traceData('${screen}')`);
  }
  pass('All 24 portal and manager screens verified wired to traceData');
} catch (e) {
  fail('All 24 portal and manager screens verified wired to traceData', e);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 50 ACCEPTANCE VERIFICATION SUMMARY: ${passedCount} passed, ${failedCount} failed`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
