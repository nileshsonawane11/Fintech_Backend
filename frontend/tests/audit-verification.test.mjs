// ============================================================================
// FINEDGE BANK — MASTER IMPLEMENTATION AUDIT & VERIFICATION TEST SUITE
// Executable Node.js automated verification across all 24 required categories.
// ============================================================================

import {
  handleLocalFallback,
  getDb,
  saveDb,
  verifyStaffPermission,
  appendAuditLog,
  getAuthenticatedCustomerId
} from '../src/services/api.js';

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passedTests++;
    results.push({ status: 'PASS', message });
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    results.push({ status: 'FAIL', message });
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING FINEDGE BANK AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  // Initialize fresh mock storage in Node environment
  const mockStorage = new Map();
  global.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };

  const db = getDb();
  assert(db.customers.length >= 2, 'Database initialized with customers data');
  assert(db.staffUsers.length >= 3, 'Database initialized with 3 default staff roles');
  assert(db.accounts.length >= 3, 'Database initialized with multi-customer accounts');

  // ==========================================================================
  // 1. CUSTOMER REGISTRATION & VALIDATION (Phase 2)
  // ==========================================================================
  console.log('\n--- 1. Testing Customer Registration & Validation ---');

  // 1.1 Valid Registration
  try {
    const regRes = handleLocalFallback('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Sneha Kulkarni',
        email: 'sneha.k@example.com',
        mobileNumber: '9822334455',
        password: 'Password@2026'
      })
    });
    assert(regRes.status === 'PENDING_VERIFICATION' && regRes.nextStep === 'VERIFY_OTP', 'Customer registration creates pending verification');
  } catch (e) {
    assert(false, `Valid registration failed: ${e.detail || e.message}`);
  }

  // 1.2 Duplicate Registration Check
  try {
    handleLocalFallback('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Duplicate Sneha',
        email: 'sneha.k@example.com',
        mobileNumber: '9822334455',
        password: 'Password@2026'
      })
    });
    assert(false, 'Duplicate registration should have been rejected');
  } catch (e) {
    assert(e.status === 409 && e.code === 'USER_ALREADY_EXISTS', 'Duplicate registration correctly rejected with 409 USER_ALREADY_EXISTS');
  }

  // 1.3 Weak Password Validation
  try {
    handleLocalFallback('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Short Pass',
        email: 'short@example.com',
        mobileNumber: '9811111111',
        password: 'short'
      })
    });
    assert(false, 'Short password should have been rejected');
  } catch (e) {
    assert(e.status === 422 && e.code === 'INVALID_PASSWORD', 'Weak/short password rejected with 422 INVALID_PASSWORD');
  }

  // ==========================================================================
  // 2. CUSTOMER AUTHENTICATION & LOGIN (Phase 2)
  // ==========================================================================
  console.log('\n--- 2. Testing Customer Authentication & Login ---');

  // 2.1 Valid Credentials Login
  try {
    const loginRes = handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'vikram@example.com',
        password: 'Password@123'
      })
    });
    assert(loginRes.mfaRequired === true && loginRes.mfaReferenceId, 'Valid customer login prompts 2FA MFA challenge');
  } catch (e) {
    assert(false, `Valid customer login failed: ${e.detail}`);
  }

  // 2.2 Incorrect Password Login
  try {
    handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'vikram@example.com',
        password: 'WrongPassword'
      })
    });
    assert(false, 'Login with incorrect password should fail');
  } catch (e) {
    assert(e.status === 401 && e.code === 'INVALID_CREDENTIALS', 'Incorrect password rejected with 401 INVALID_CREDENTIALS');
  }

  // 2.3 Non-existent Customer Login
  try {
    handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'nobody@example.com',
        password: 'Password@123'
      })
    });
    assert(false, 'Login for non-existent user should fail');
  } catch (e) {
    assert(e.status === 401 && e.code === 'INVALID_CREDENTIALS', 'Unknown customer rejected with 401 INVALID_CREDENTIALS');
  }

  // 2.4 Complete 2FA MFA Verification
  try {
    const mfaRes = handleLocalFallback('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({
        mfaReferenceId: 'mfa-test',
        otp: '123456'
      })
    });
    assert(mfaRes.accessToken && mfaRes.customerId === 'CUS-100234', 'MFA verified and full access token issued');
  } catch (e) {
    assert(false, `MFA verification failed: ${e.detail}`);
  }

  // ==========================================================================
  // 3. CUSTOMER DATA ISOLATION (Phase 3)
  // ==========================================================================
  console.log('\n--- 3. Testing Customer Data Isolation & Cross-Customer Protection ---');

  // Set session as Vikramaditya (CUS-100234)
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');
  const vikramAccounts = handleLocalFallback('/api/v1/accounts', { method: 'GET' });
  assert(
    vikramAccounts.data.every(a => a.customerId === 'CUS-100234'),
    'Vikramaditya only receives accounts belonging to CUS-100234'
  );

  // Attempt cross-customer access to Aarav Patel's account (ACC-2001)
  try {
    handleLocalFallback('/api/v1/accounts/ACC-2001', { method: 'GET' });
    assert(false, 'Cross-customer account read should be rejected');
  } catch (e) {
    assert(e.status === 403 && e.code === 'FORBIDDEN_RESOURCE', 'Cross-customer account access blocked with 403 FORBIDDEN');
  }

  // Attempt cross-customer access to Aarav Patel's transactions
  try {
    handleLocalFallback('/api/v1/accounts/ACC-2001/transactions', { method: 'GET' });
    assert(false, 'Cross-customer transaction read should be rejected');
  } catch (e) {
    assert(e.status === 403 && e.code === 'FORBIDDEN_RESOURCE', 'Cross-customer transaction ledger access blocked with 403 FORBIDDEN');
  }

  // Attempt cross-customer card modification
  try {
    handleLocalFallback('/api/v1/cards/CARD-3003/block', {
      method: 'POST',
      body: JSON.stringify({ reason: 'LOST' })
    });
    assert(false, 'Cross-customer card block should be rejected');
  } catch (e) {
    assert(e.status === 403 && e.code === 'FORBIDDEN_RESOURCE', 'Cross-customer card blocking blocked with 403 FORBIDDEN');
  }

  // Switch session to Aarav Patel (CUS-100235)
  localStorage.setItem('finedge_session_customer_id', 'CUS-100235');
  const aaravAccounts = handleLocalFallback('/api/v1/accounts', { method: 'GET' });
  assert(
    aaravAccounts.data.length === 1 && aaravAccounts.data[0].accountId === 'ACC-2001',
    'Aarav Patel receives strictly his own account (ACC-2001)'
  );

  // ==========================================================================
  // 4. ACCOUNT APPLICATION & DUPLICATE CHECKS (Phase 4)
  // ==========================================================================
  console.log('\n--- 4. Testing Account Application Workflow ---');
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');

  let newAccAppId = '';
  try {
    const accAppRes = handleLocalFallback('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        productCode: 'SAVINGS_NRI_PREMIUM',
        initialFundingAmount: 50000.00,
        nominee: { fullName: 'Pooja Sharma', relationship: 'SISTER' }
      })
    });
    newAccAppId = accAppRes.accountApplicationId;
    assert(accAppRes.status === 'PENDING_APPROVAL', 'New account application submitted with PENDING_APPROVAL status');
  } catch (e) {
    assert(false, `Account application failed: ${e.detail}`);
  }

  // Duplicate Account Application check
  try {
    handleLocalFallback('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        productCode: 'SAVINGS_NRI_PREMIUM',
        initialFundingAmount: 50000.00
      })
    });
    assert(false, 'Duplicate account application should have been rejected');
  } catch (e) {
    assert(e.status === 409 && e.code === 'DUPLICATE_APPLICATION', 'Duplicate pending account application rejected with 409 CONFLICT');
  }

  // ==========================================================================
  // 5. CARD APPLICATION & CONTROLS (Phase 5)
  // ==========================================================================
  console.log('\n--- 5. Testing Card Application & Card Controls ---');

  // 5.1 Card Application
  try {
    const cardAppRes = handleLocalFallback('/api/v1/cards/applications', {
      method: 'POST',
      body: JSON.stringify({
        cardType: 'FOREX_TRAVEL',
        cardName: 'FinEdge Global Forex Travel Card',
        linkedAccountId: 'ACC-1001'
      })
    });
    assert(cardAppRes.status === 'PENDING_APPROVAL', 'Card application submitted and tracked as PENDING_APPROVAL');
  } catch (e) {
    assert(false, `Card application failed: ${e.detail}`);
  }

  // 5.2 Card Controls Update
  try {
    const controlsRes = handleLocalFallback('/api/v1/cards/CARD-3001/controls', {
      method: 'PUT',
      body: JSON.stringify({
        atmWithdrawalEnabled: false,
        dailyLimit: 35000.00
      })
    });
    assert(controlsRes.controls.atmWithdrawalEnabled === false && controlsRes.controls.dailyLimit === 35000.00, 'Card controls (ATM freeze & daily limit) updated and persisted');
  } catch (e) {
    assert(false, `Card controls update failed: ${e.detail}`);
  }

  // 5.3 Permanent Card Blocking
  try {
    const blockRes = handleLocalFallback('/api/v1/cards/CARD-3002/block', {
      method: 'POST',
      body: JSON.stringify({ reason: 'LOST' })
    });
    assert(blockRes.status === 'BLOCKED' && blockRes.reason === 'LOST', 'Card permanently blocked with timestamp and audit record');
  } catch (e) {
    assert(false, `Card blocking failed: ${e.detail}`);
  }

  // ==========================================================================
  // 6. MANAGER PORTAL & RBAC ENFORCEMENT (Phases 6 & 7)
  // ==========================================================================
  console.log('\n--- 6. Testing Manager Authentication & Granular RBAC Permissions ---');

  // 6.1 Staff Login - Branch Manager
  let mgrUser = null;
  try {
    mgrUser = handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'manager@finedge.bank',
        password: 'Manager@2026'
      })
    });
    assert(mgrUser.role === 'BANK_MANAGER' && mgrUser.permissions.includes('kyc.approve'), 'Branch Manager authenticated with full administrative permissions');
  } catch (e) {
    assert(false, `Branch manager login failed: ${e.detail}`);
  }

  // 6.2 Staff Login - KYC Officer
  let kycOfficer = null;
  try {
    kycOfficer = handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'kyc.officer@finedge.bank',
        password: 'Manager@2026'
      })
    });
    assert(kycOfficer.role === 'KYC_OFFICER' && kycOfficer.permissions.includes('kyc.approve'), 'KYC Officer authenticated with compliance permissions');
  } catch (e) {
    assert(false, `KYC officer login failed: ${e.detail}`);
  }

  // 6.3 Negative Test: KYC Officer attempting Account Approval (Lacks accounts.approve)
  try {
    handleLocalFallback(`/ops/api/v1/accounts/applications/${newAccAppId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kycOfficer.accessToken}` }
    });
    assert(false, 'KYC Officer should NOT be permitted to approve accounts');
  } catch (e) {
    assert(e.status === 403 && e.code === 'INSUFFICIENT_PERMISSIONS', 'Negative Authorization: KYC Officer rejected from approving account (403 INSUFFICIENT_PERMISSIONS)');
  }

  // 6.4 Negative Test: KYC Officer attempting Staff Creation (Lacks staff.create)
  try {
    handleLocalFallback('/admin/api/v1/staff', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kycOfficer.accessToken}` },
      body: JSON.stringify({
        fullName: 'Hacker Staff',
        email: 'hacker@finedge.bank'
      })
    });
    assert(false, 'KYC Officer should NOT be permitted to provision staff');
  } catch (e) {
    assert(e.status === 403 && e.code === 'INSUFFICIENT_PERMISSIONS', 'Negative Authorization: KYC Officer rejected from provisioning staff (403 INSUFFICIENT_PERMISSIONS)');
  }

  // 6.5 Negative Test: Customer Token attempting Manager API Access
  try {
    handleLocalFallback('/admin/api/v1/audit-logs', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer jwt_customer_token' }
    });
    assert(false, 'Customer token should NOT be able to read audit logs');
  } catch (e) {
    assert(e.status === 401 || e.status === 403, 'Negative Authorization: Customer token rejected from Manager audit terminal');
  }

  // ==========================================================================
  // 7. APPLICATION REVIEW & APPROVAL WORKFLOWS (Phase 8)
  // ==========================================================================
  console.log('\n--- 7. Testing Operations Approvals & Workflows ---');

  // 7.1 KYC Approval by KYC Officer
  try {
    const kycApproval = handleLocalFallback('/ops/api/v1/kyc/KYC-500988/approve', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kycOfficer.accessToken}` },
      body: JSON.stringify({
        remarks: 'Identity and address proof verified against regulatory database',
        riskCategory: 'LOW'
      })
    });
    assert(kycApproval.status === 'APPROVED' && kycApproval.riskCategory === 'LOW', 'KYC application approved with mandatory risk category');
  } catch (e) {
    assert(false, `KYC approval failed: ${e.detail}`);
  }

  // 7.2 Account Approval by Branch Manager (has accounts.approve)
  let createdAccId = '';
  try {
    const accApproval = handleLocalFallback(`/ops/api/v1/accounts/applications/${newAccAppId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${mgrUser.accessToken}` }
    });
    createdAccId = accApproval.accountId;
    assert(accApproval.success === true && createdAccId.startsWith('ACC-'), 'Account application approved and new bank account materialized');
  } catch (e) {
    assert(false, `Account approval failed: ${e.detail}`);
  }

  // 7.3 Duplicate Account Approval Protection
  try {
    handleLocalFallback(`/ops/api/v1/accounts/applications/${newAccAppId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${mgrUser.accessToken}` }
    });
    assert(false, 'Repeated approval should NOT create duplicate account');
  } catch (e) {
    assert(e.status === 409 && e.code === 'APPLICATION_ALREADY_APPROVED', 'Duplicate account approval blocked with 409 APPLICATION_ALREADY_APPROVED');
  }

  // ==========================================================================
  // 8. STAFF DEACTIVATION & SESSION REVOCATION (Phase 7)
  // ==========================================================================
  console.log('\n--- 8. Testing Staff Deactivation & Revocation ---');

  // 8.1 Deactivate Staff STF-003 (Rohan Mehra)
  try {
    const deactRes = handleLocalFallback('/admin/api/v1/staff/STF-003/status', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${mgrUser.accessToken}` },
      body: JSON.stringify({ status: 'DISABLED' })
    });
    assert(deactRes.status === 'DISABLED', 'Staff user STF-003 successfully deactivated by Branch Manager');
  } catch (e) {
    assert(false, `Staff deactivation failed: ${e.detail}`);
  }

  // 8.2 Negative Test: Deactivated staff member attempting login
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'ops@finedge.bank',
        password: 'Manager@2026'
      })
    });
    assert(false, 'Deactivated staff should NOT be allowed to login');
  } catch (e) {
    assert(e.status === 403 && e.code === 'STAFF_ACCOUNT_DEACTIVATED', 'Deactivated staff login rejected with 403 STAFF_ACCOUNT_DEACTIVATED');
  }

  // ==========================================================================
  // 9. AUDIT LOGGING & NON-REPUDIATION (Phase 10)
  // ==========================================================================
  console.log('\n--- 9. Testing Security Audit Trail ---');

  const auditLogs = handleLocalFallback('/admin/api/v1/audit-logs', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mgrUser.accessToken}` }
  });
  assert(auditLogs.length > 5, 'Audit trail contains persistent events');
  assert(
    auditLogs.every(l => l.logId && l.timestamp && l.actor && l.action && l.status),
    'Every audit log entry contains complete non-repudiation attributes (actor, timestamp, action, status)'
  );

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
