// verify_module50.mjs
// Updated for Module 51 Mode Contract:
// - Server unreachable (network error) -> Demo engages and fallback answers
// - Reachable server (even erroring) -> Never engages demo
// - Authoritative cross-login refusal with generic copy

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
import { applyLoan, bookFd, bookRd, startSip, openSsy } from '../src/services/portalBridge.js';

console.log('================================================================');
console.log('STARTING MODULE 50/51 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
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
// Scenario 1: Cross-login bug verification (Part A / Part E)
// -------------------------------------------------------------
console.log('--- Scenario 1: Cross-Login Bug Diagnosis & Authoritative Refusal ---');

try {
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
    assert.equal(err.detail, 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.');
    assert.doesNotMatch(err.detail, /customer/i, 'Must not reveal directory searched');
  }
  assert.ok(threw, 'Manager login must refuse customer credentials');
  assert.equal(localStorage.getItem('finedge_manager_token'), null, 'Zero manager tokens in storage on refusal');
  assert.equal(localStorage.getItem('finedge_manager_user'), null, 'Zero manager sessions in storage on refusal');
  pass('Customer credentials on manager login refused with generic 401 INVALID_CREDENTIALS and zero sessions');
} catch (e) {
  fail('Customer credentials on manager login refused', e);
}

try {
  storage.clear();
  let threw = false;
  try {
    await handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'manager@finedge.bank', password: 'Manager@2026' })
    });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 401, 'Status must be 401');
    assert.equal(err.code, 'INVALID_CREDENTIALS', 'Code must be INVALID_CREDENTIALS');
    assert.equal(err.detail, 'No account found for these credentials on this sign-in. Check the details, or use the other sign-in if you have the other account type.');
  }
  assert.ok(threw, 'Customer login must refuse staff credentials');
  assert.equal(localStorage.getItem('finedge_access_token'), null, 'Zero tokens in storage on refusal');
  assert.equal(localStorage.getItem('finedge_session_customer_id'), null, 'Zero customer sessions on refusal');
  pass('Staff credentials on customer login refused with generic 401 INVALID_CREDENTIALS and zero sessions');
} catch (e) {
  fail('Staff credentials on customer login refused', e);
}

try {
  storage.clear();
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
    await authService.managerLogin({ identifier: 'cust@domain.com', password: 'Pass123!' });
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
// Scenario 2: Server Reachability Mode Contract (Module 51 Part 0)
// -------------------------------------------------------------
console.log('\n--- Scenario 2: Reachability Mode Contract (Server vs Demo) ---');

try {
  // Test reachable server (even error status 500) sets mode 'server' and NEVER engages demo
  _resetModeForTests('unknown');
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    headers: { get: () => 'application/json' },
    json: async () => ({ code: 'INTERNAL_ERROR', detail: 'Server error' })
  });

  let threw = false;
  try {
    await apiRequest('/api/v1/test-server-reachability');
  } catch (e) {
    threw = true;
    assert.equal(e.status, 500);
  } finally {
    global.fetch = originalFetch;
  }
  assert.ok(threw, 'Reachable server with 500 error must throw HTTP error');
  assert.equal(getMode(), 'server', 'Server answering with error must set mode "server"');
  pass('Reachable server answering with error sets mode "server" and never falls back to demo mode');
} catch (e) {
  fail('Reachable server answering with error sets mode "server"', e);
}

try {
  // Test unreachable server (network failure) sets mode 'demo' and engages fallback
  _resetModeForTests('unknown');
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new TypeError('fetch failed');
  };

  const res = await apiRequest('/api/v1/accounts');
  assert.equal(getMode(), 'demo', 'Network error must set mode "demo"');
  assert.ok(res, 'Demo mode must route call to local fallback and return result');
  pass('Unreachable server (network error) locks mode to "demo" and routes to local fallback');
  global.fetch = originalFetch;
} catch (e) {
  fail('Unreachable server locks mode to "demo"', e);
}

try {
  // In demo mode, seeded demo accounts and staff accounts are available for the UI panels
  const demoCustomers = getDemoAccounts();
  const demoStaff = getDemoStaffAccounts();
  assert.ok(demoCustomers.length >= 4, 'Demo customers list populated from seed');
  assert.ok(demoStaff.length >= 6, 'Demo staff list populated from seed');
  pass('getDemoAccounts() and getDemoStaffAccounts() return single-source seeded rosters for demo panels');
} catch (e) {
  fail('getDemoAccounts() and getDemoStaffAccounts() populated from seed', e);
}

try {
  // Verify UI login pages contain Demo access panels and reset modal when mode is demo
  const portalLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/portal/PortalLoginPage.jsx'), 'utf8');
  const managerLoginCode = fs.readFileSync(resolveFrontendPath('src/pages/manager/ManagerLoginPage.jsx'), 'utf8');

  assert.match(portalLoginCode, /useServerMode/i, 'PortalLoginPage imports useServerMode');
  assert.match(portalLoginCode, /isDemo &&/i, 'PortalLoginPage gates demo panels with isDemo');
  assert.match(portalLoginCode, /Demo access/i, 'PortalLoginPage contains Demo access heading');
  assert.match(managerLoginCode, /isDemo &&/i, 'ManagerLoginPage gates demo panels with isDemo');
  assert.match(managerLoginCode, /Demo access/i, 'ManagerLoginPage contains Demo access heading');
  assert.doesNotMatch(portalLoginCode, /bypassed for now/i, 'No bypassed for now in portal login');
  assert.doesNotMatch(managerLoginCode, /bypassed for now/i, 'No bypassed for now in manager login');
  pass('PortalLoginPage and ManagerLoginPage render amber demo notices and demo access panels in demo mode');
} catch (e) {
  fail('PortalLoginPage and ManagerLoginPage demo UI verification', e);
}

// -------------------------------------------------------------
// Scenario 3: Domain Service Execution in Demo Mode (Part A & D)
// -------------------------------------------------------------
console.log('\n--- Scenario 3: Restored Local Service Execution in Demo Mode ---');

try {
  _resetModeForTests('demo');
  const loanApp = await applyLoan(null, {
    fullName: 'Aniket Deshmukh',
    applicantName: 'Aniket Deshmukh',
    productName: 'FinEdge Business Growth Loan',
    productSlug: 'business-growth-loan',
    amount: 1500000,
    tenureMonths: 36
  });
  assert.ok(loanApp.applicationId.startsWith('LAPP-'), 'applyLoan generates real LAPP- reference');
  assert.equal(loanApp.status, 'UNDER_REVIEW', 'Application enters queue as UNDER_REVIEW');
  pass('applyLoan executes end-to-end in demo mode, returning LAPP- reference into review queue');
} catch (e) {
  fail('applyLoan executes in demo mode', e);
}

try {
  _resetModeForTests('demo');
  const fdApp = await bookFd(null, {
    fullName: 'Pooja Nair',
    depositAmount: 50000,
    tenureMonths: 12
  });
  assert.ok(fdApp.applicationId.startsWith('INV-FD-'), 'bookFd generates real INV- reference');
  pass('bookFd executes end-to-end in demo mode, returning INV- reference into review queue');
} catch (e) {
  fail('bookFd executes in demo mode', e);
}

// -------------------------------------------------------------
// Scenario 4: Console Tracing Utility & Credential Sanitization
// -------------------------------------------------------------
console.log('\n--- Scenario 4: Console Tracing Utility & Credential Sanitization ---');

try {
  assert.equal(typeof traceForm, 'function');
  assert.equal(typeof traceRequest, 'function');
  assert.equal(typeof traceResponse, 'function');
  assert.equal(typeof traceFailure, 'function');
  assert.equal(typeof traceData, 'function');
  assert.equal(typeof traceDataScope, 'function');
  assert.equal(typeof sanitizePayload, 'function');
  pass('trace.js exports all required tracing functions');
} catch (e) {
  fail('trace.js exports required tracing functions', e);
}

try {
  const sensitiveObj = {
    username: 'rahul.verma',
    password: 'SuperSecretPassword123!',
    otp: '849201',
    pin: '1234',
    secretKey: 'key_live_998877',
    cvv: '987',
    token: 'jwt_mock_token_sample',
    nested: {
      accountPin: '5678',
      normalField: 'visibleData'
    }
  };
  const sanitized = sanitizePayload(sensitiveObj);
  assert.equal(sanitized.password, '•••••••••••••••••••••••');
  assert.equal(sanitized.otp, '••••••');
  assert.equal(sanitized.pin, '••••');
  assert.equal(sanitized.cvv, '••••');
  assert.equal(sanitized.token, '•••••••••••••••••••••');
  assert.equal(sanitized.nested.accountPin, '••••');
  assert.equal(sanitized.nested.normalField, 'visibleData');
  pass('sanitizePayload recursively masks credentials (password, otp, pin, secret, cvv, token) with exact bullet counts');
} catch (e) {
  fail('sanitizePayload masking verification', e);
}

// -------------------------------------------------------------
// Scenario 5: Silent Console Switch Verification (DEBUG_TRACE = false)
// -------------------------------------------------------------
console.log('\n--- Scenario 5: Silent Console Switch Verification (DEBUG_TRACE = false) ---');

try {
  let loggedMessages = 0;
  const originalInfo = console.info;
  console.info = () => { loggedMessages++; };

  setDebugTrace(false);
  assert.equal(getDebugTrace(), false);
  traceForm('TestForm', { password: 'secret' });
  traceRequest('GET', '/api/v1/test');
  traceResponse('/api/v1/test', 200, { data: 'test' });
  traceFailure('/api/v1/test', 'error');
  traceData('TestScreen');

  setDebugTrace(true);
  console.info = originalInfo;
  assert.equal(loggedMessages, 0, 'No console.info calls permitted when DEBUG_TRACE is false');
  pass('When DEBUG_TRACE = false, console output is 100% silent across all tracing hooks');
} catch (e) {
  fail('DEBUG_TRACE = false silent console verification', e);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 50/51 ACCEPTANCE VERIFICATION SUMMARY: ${passedCount} passed, ${failedCount} failed`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
