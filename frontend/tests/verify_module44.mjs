// tests/verify_module44.mjs
// Automated Acceptance Verification Suite for Module 44 — Whole-platform functional verification & smoothness gate (FinEdge Bank)

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
console.log('STARTING MODULE 44 ACCEPTANCE VERIFICATION');
console.log('================================================================');

// -----------------------------------------------------------------------------
// PART 0: PHASE 0 — ROUTE & INTERACTION INVENTORY INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- Part 0: Route & Interaction Inventory Integrity ---');

const appJsxPath = path.join(rootDir, 'src/App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

it('App.jsx configures all required public catalogue routes', () => {
  assert(appJsxContent.includes('path="/" element={<HomePage />}'), 'HomePage route missing');
  assert(appJsxContent.includes('path="/accounts" element={<AccountsPage />}'), 'AccountsPage route missing');
  assert(appJsxContent.includes('path="/accounts/:slug"'), 'Accounts detail route missing');
  assert(appJsxContent.includes('path="/loans" element={<LoansPage />}'), 'LoansPage route missing');
  assert(appJsxContent.includes('path="/loans/:slug"'), 'Loans detail route missing');
  assert(appJsxContent.includes('path="/cards" element={<CardsPage />}'), 'CardsPage route missing');
  assert(appJsxContent.includes('path="/cards/:slug"'), 'Cards detail route missing');
  assert(appJsxContent.includes('path="/investments" element={<InvestmentsPage />}'), 'InvestmentsPage route missing');
  assert(appJsxContent.includes('path="/investments/:slug"'), 'Investments detail route missing');
  assert(appJsxContent.includes('path="/calculators" element={<CalculatorsPage />}'), 'CalculatorsPage route missing');
});

it('App.jsx configures all required legal and regulatory trust routes', () => {
  assert(appJsxContent.includes('path="/privacy-policy"'), 'Privacy policy route missing');
  assert(appJsxContent.includes('path="/terms-and-conditions"'), 'Terms and conditions route missing');
  assert(appJsxContent.includes('path="/disclosures"'), 'Disclosures route missing');
  assert(appJsxContent.includes('path="/grievance-redressal"'), 'Grievance redressal route missing');
  assert(appJsxContent.includes('path="/fair-practice-code"'), 'Fair practice code route missing');
  assert(appJsxContent.includes('path="/schedule-of-charges"'), 'Schedule of charges route missing');
});

it('App.jsx configures Customer NetBanking and Manager Operations routes with 404 fallback', () => {
  assert(appJsxContent.includes('path="/portal/login"'), 'Portal login route missing');
  assert(appJsxContent.includes('path="/portal"'), 'Portal dashboard route missing');
  assert(appJsxContent.includes('path="/portal/*"'), 'Portal wildcard route missing');
  assert(appJsxContent.includes('path="/manager/login"'), 'Manager login route missing');
  assert(appJsxContent.includes('path="/manager"'), 'Manager dashboard redirect route missing');
  assert(appJsxContent.includes('path="/manager/*"'), 'Manager wildcard route missing');
  assert(appJsxContent.includes('path="*"'), 'Catch-all 404 fallback route missing');
});

// -----------------------------------------------------------------------------
// PART 1: PHASE 2.1 & 2.2 — ZERO DEAD OR PLACEHOLDER CONTROLS
// -----------------------------------------------------------------------------
console.log('\n--- Part 1: Zero Dead or Placeholder Controls ---');

function scanSourceFiles(dir, exts = ['.jsx', '.js']) {
  const files = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (exts.includes(path.extname(ent.name))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

const srcFiles = scanSourceFiles(path.join(rootDir, 'src'));

it('Zero occurrences of href="#" across all frontend source files', () => {
  for (const f of srcFiles) {
    const code = fs.readFileSync(f, 'utf8');
    assert(!code.includes('href="#"'), `File ${path.basename(f)} contains forbidden href="#"`);
    assert(!code.includes("href='#'"), `File ${path.basename(f)} contains forbidden href='#'`);
  }
});

it('Zero occurrences of javascript: links across all frontend source files', () => {
  for (const f of srcFiles) {
    const code = fs.readFileSync(f, 'utf8');
    assert(!code.toLowerCase().includes('href="javascript:'), `File ${path.basename(f)} contains javascript: href`);
    assert(!code.toLowerCase().includes("href='javascript:"), `File ${path.basename(f)} contains javascript: href`);
  }
});

it('Zero empty onClick handlers (onClick={() => {}}) across all frontend source files', () => {
  for (const f of srcFiles) {
    const code = fs.readFileSync(f, 'utf8');
    assert(!code.includes('onClick={() => {}}'), `File ${path.basename(f)} contains empty onClick`);
  }
});

// -----------------------------------------------------------------------------
// PART 2: PHASE 2.3 — REDIRECT TRUTH & DEEP LINK PRESERVATION
// -----------------------------------------------------------------------------
console.log('\n--- Part 2: Redirect Truth & Deep Link Preservation ---');

const portalLoginPath = path.join(rootDir, 'src/pages/portal/PortalLoginPage.jsx');
const portalLoginContent = fs.readFileSync(portalLoginPath, 'utf8');
const mgrLoginPath = path.join(rootDir, 'src/pages/manager/ManagerLoginPage.jsx');
const mgrLoginContent = fs.readFileSync(mgrLoginPath, 'utf8');

it('ProtectedRoute passes location.state.from on unauthenticated access', () => {
  assert(appJsxContent.includes('state={{ from: location }}'), 'ProtectedRoute must pass state.from');
});

it('PortalLoginPage consumes return target and navigates to requested deep link', () => {
  assert(portalLoginContent.includes('location.state?.from?.pathname || location.state?.from || \'/portal\''),
    'PortalLoginPage must redirect to requested deep link upon successful sign-in');
});

it('ManagerLoginPage consumes return target and validates role access', () => {
  assert(mgrLoginContent.includes('location.state?.from?.pathname'),
    'ManagerLoginPage must inspect return target from location.state.from');
  assert(mgrLoginContent.includes('hasSectionAccess'),
    'ManagerLoginPage must verify staff section access before deep link return');
});

// -----------------------------------------------------------------------------
// PART 3: PHASE 2.4 — IDEMPOTENCY & FINANCIAL SUBMIT INERTNESS
// -----------------------------------------------------------------------------
console.log('\n--- Part 3: Financial Submit Inertness & Idempotency ---');

const applyModalPath = path.join(rootDir, 'src/components/common/ApplyModal.jsx');
const applyModalContent = fs.readFileSync(applyModalPath, 'utf8');
const transfersSecPath = path.join(rootDir, 'src/pages/portal/sections/TransfersSection.jsx');
const transfersSecContent = fs.readFileSync(transfersSecPath, 'utf8');
const uiJsxPath = path.join(rootDir, 'src/components/ui.jsx');
const uiJsxContent = fs.readFileSync(uiJsxPath, 'utf8');

it('ApplyModal disables submit button during in-flight request (loading)', () => {
  assert(applyModalContent.includes('disabled={loading || !isRequiredConsentMet}'),
    'ApplyModal submit button must be disabled when loading is true');
});

it('Button component in ui.jsx sets disabled and pointer-events-none when loading is true', () => {
  assert(uiJsxContent.includes('disabled={Component === \'button\' ? (disabled || loading) : undefined}'),
    'Button must set HTML disabled attribute when loading');
  assert(uiJsxContent.includes('disabled:pointer-events-none'),
    'Button must apply disabled:pointer-events-none to prevent double clicks');
});

it('TransfersSection sets loading={submitting} on transfer confirmation button', () => {
  assert(transfersSecContent.includes('loading={submitting}'),
    'TransfersSection must bind loading={submitting} to prevent duplicate debit');
});

// -----------------------------------------------------------------------------
// PART 4: PHASE 2.5 — MODAL & DRAWER ESCAPE & SCROLL CONTAINMENT
// -----------------------------------------------------------------------------
console.log('\n--- Part 4: Modal & Drawer Escape & Scroll Containment ---');

const managerSections = [
  'ManagerKycSection.jsx',
  'ManagerAccountsSection.jsx',
  'ManagerCardsSection.jsx',
  'ManagerLoansSection.jsx',
  'ManagerTicketsSection.jsx',
  'ManagerCustomersSection.jsx'
];

for (const sec of managerSections) {
  const p = path.join(rootDir, 'src/pages/manager/sections', sec);
  const code = fs.readFileSync(p, 'utf8');

  it(`${sec} handles Escape key press to close drawer`, () => {
    assert(code.includes("if (e.key === 'Escape'"), `${sec} must listen for Escape key`);
  });

  it(`${sec} manages body overflow style to prevent background page scroll while drawer is open`, () => {
    assert(code.includes("document.body.style.overflow = 'hidden'"), `${sec} must set body overflow hidden`);
    assert(code.includes("document.body.style.overflow = prevOverflow"), `${sec} must restore body overflow on unmount/close`);
  });
}

// -----------------------------------------------------------------------------
// PART 5: PHASE 1 — RBAC MATRIX FOR ALL 5 MANAGER ROLES
// -----------------------------------------------------------------------------
console.log('\n--- Part 5: Staff Role Matrix (Module 39 Enforcement) ---');

await itAsync('All five staff roles have accurate section access according to the Module 39 matrix', async () => {
  const { hasSectionAccess } = await import('../src/services/managerBridge.js');

  const roles = [
    { role: 'BANK_MANAGER', allowed: ['dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff'], denied: [] },
    { role: 'KYC_OFFICER', allowed: ['dashboard', 'kyc', 'customers', 'audit'], denied: ['accounts', 'loans', 'investments', 'cards', 'reports', 'staff'] },
    { role: 'ACCOUNT_OPS', allowed: ['dashboard', 'accounts', 'cards', 'customers', 'audit'], denied: ['kyc', 'loans', 'investments', 'reports', 'staff'] },
    { role: 'AUDIT_COMPLIANCE', allowed: ['dashboard', 'audit', 'reports', 'customers'], denied: ['accounts', 'loans', 'investments', 'cards', 'staff'] },
    { role: 'CUSTOMER_SUPPORT', allowed: ['dashboard', 'tickets', 'customers'], denied: ['kyc', 'accounts', 'loans', 'investments', 'cards', 'audit', 'reports', 'staff'] }
  ];

  for (const r of roles) {
    const user = { role: r.role };
    for (const sec of r.allowed) {
      assert.equal(hasSectionAccess(sec, user), true, `Role ${r.role} must have access to ${sec}`);
    }
    for (const sec of r.denied) {
      assert.equal(hasSectionAccess(sec, user), false, `Role ${r.role} must be denied access to ${sec}`);
    }
  }
});

// -----------------------------------------------------------------------------
// PART 6: PHASE 4 — FORM VALIDATION INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- Part 6: Client-Side Form Validation Integrity ---');

it('ApplyModal enforces strict PAN format regex matching Indian Income Tax standard', () => {
  assert(applyModalContent.includes('/^[A-Z]{5}[0-9]{4}[A-Z]$/i'),
    'ApplyModal must validate 10-char PAN format [A-Z]{5}[0-9]{4}[A-Z]');
});

it('ApplyModal enforces 10-digit Indian mobile number format regex (/^[6-9]\\d{9}$/)', () => {
  assert(applyModalContent.includes('/^[6-9]\\d{9}$/'),
    'ApplyModal must validate 10-digit Indian mobile number starting with 6-9');
});

it('ApplyModal enforces 6-digit postal code pincode regex', () => {
  assert(applyModalContent.includes('/^\\d{6}$/'),
    'ApplyModal must validate 6-digit Indian PIN code');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 44 ACCEPTANCE VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
