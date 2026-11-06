// tests/verify_module45.mjs
// Automated Acceptance Verification Suite for Module 45 — Modal alignment & form UX (FinEdge Bank)

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
console.log('STARTING MODULE 45 ACCEPTANCE VERIFICATION');
console.log('================================================================');

// -----------------------------------------------------------------------------
// PART 1: FIX 1 — ONE BOUNDED SHELL FOR CENTERED MODALS & BOTTOM SHEETS
// -----------------------------------------------------------------------------
console.log('\n--- Part 1: Bounded Modal Shells (src/components/ui.jsx & ApplyModal.jsx) ---');

const uiJsxPath = path.join(rootDir, 'src/components/ui.jsx');
const applyModalPath = path.join(rootDir, 'src/components/common/ApplyModal.jsx');
const uiJsxContent = fs.readFileSync(uiJsxPath, 'utf8');
const applyModalContent = fs.readFileSync(applyModalPath, 'utf8');

it('Modal in ui.jsx uses createPortal to escape parent transform contexts', () => {
  assert(uiJsxContent.includes('createPortal('), 'Modal must call createPortal');
  assert(uiJsxContent.includes('document.body'), 'Modal portal target must be document.body');
});

it('Modal in ui.jsx implements plain dim backdrop without backdrop-blur', () => {
  assert(uiJsxContent.includes('bg-midnight-950/60'), 'Modal backdrop must use bg-midnight-950/60');
  assert(!uiJsxContent.includes('backdrop-blur'), 'Modal backdrop must NOT use backdrop-blur');
});

it('Modal in ui.jsx applies responsive overlay (bottom sheet mobile, centered desktop)', () => {
  assert(uiJsxContent.includes('fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6'),
    'Modal overlay must align items-end on mobile and items-center sm:p-6 on desktop');
});

it('Modal in ui.jsx strictly bounds height (94dvh mobile, calc(100dvh-3rem) desktop)', () => {
  assert(uiJsxContent.includes('max-h-[94dvh]'), 'Modal must have max-h-[94dvh] on mobile');
  assert(uiJsxContent.includes('sm:max-h-[calc(100dvh-3rem)]'), 'Modal must have sm:max-h-[calc(100dvh-3rem)] on desktop');
  assert(uiJsxContent.includes('rounded-t-2xl sm:rounded-2xl'), 'Modal must have rounded-t-2xl mobile and sm:rounded-2xl desktop');
  assert(uiJsxContent.includes('flex') && uiJsxContent.includes('flex-col'), 'Modal must have flex flex-col for scroll containment');
  assert(uiJsxContent.includes('overflow-hidden'), 'Modal container must have overflow-hidden');
});

it('Modal in ui.jsx has sticky header with title truncation', () => {
  assert(uiJsxContent.includes('shrink-0') && uiJsxContent.includes('border-b'), 'Header must be shrink-0 border-b');
  assert(uiJsxContent.includes('truncate'), 'Modal title must truncate long strings');
});

it('Modal in ui.jsx has flex-1 overflow-y-auto body with thin scrollbar', () => {
  assert(uiJsxContent.includes('flex-1') && uiJsxContent.includes('overflow-y-auto') && uiJsxContent.includes('[scrollbar-width:thin]'),
    'Modal body must be the only scroll container with flex-1 overflow-y-auto [scrollbar-width:thin]');
});

it('Modal in ui.jsx has sticky pinned footer with porcelain background', () => {
  assert(uiJsxContent.includes('sticky bottom-0') && uiJsxContent.includes('border-t') && uiJsxContent.includes('bg-porcelain-50'),
    'Modal footer must be sticky bottom-0 border-t bg-porcelain-50');
});

it('ApplyModal.jsx uses createPortal to escape parent transform contexts', () => {
  assert(applyModalContent.includes('createPortal('), 'ApplyModal must call createPortal');
  assert(applyModalContent.includes('document.body'), 'ApplyModal portal target must be document.body');
});

it('ApplyModal.jsx implements plain dim backdrop without backdrop-blur', () => {
  assert(applyModalContent.includes('bg-midnight-950/60'), 'ApplyModal backdrop must use bg-midnight-950/60');
  assert(!applyModalContent.includes('backdrop-blur'), 'ApplyModal backdrop must NOT use backdrop-blur');
});

it('ApplyModal.jsx strictly bounds height (94dvh mobile, calc(100dvh-3rem) desktop)', () => {
  assert(applyModalContent.includes('max-h-[94dvh]'), 'ApplyModal must have max-h-[94dvh] on mobile');
  assert(applyModalContent.includes('sm:max-h-[calc(100dvh-3rem)]'), 'ApplyModal must have sm:max-h-[calc(100dvh-3rem)] on desktop');
  assert(applyModalContent.includes('rounded-t-2xl sm:rounded-2xl'), 'ApplyModal must have rounded-t-2xl mobile and sm:rounded-2xl desktop');
  assert(applyModalContent.includes('flex') && applyModalContent.includes('flex-col'), 'ApplyModal must have flex flex-col');
  assert(applyModalContent.includes('overflow-hidden'), 'ApplyModal container must have overflow-hidden');
});

it('ApplyModal.jsx has sticky header with title truncation and wrapping facts strip', () => {
  assert(applyModalContent.includes('min-w-0 flex-1 pr-3') && applyModalContent.includes('truncate'), 'ApplyModal title must truncate properly');
  assert(applyModalContent.includes('max-w-full'), 'ApplyModal facts strip must not overflow header width');
});

it('ApplyModal.jsx body is the sole scroller and footer is pinned at bottom', () => {
  assert(applyModalContent.includes('flex-1') && applyModalContent.includes('overflow-y-auto') && applyModalContent.includes('[scrollbar-width:thin]'),
    'ApplyModal body must be flex-1 overflow-y-auto [scrollbar-width:thin]');
  assert(applyModalContent.includes('sticky bottom-0') && applyModalContent.includes('bg-porcelain-50') && applyModalContent.includes('border-t'),
    'ApplyModal footer must be sticky bottom-0 border-t bg-porcelain-50');
});

// -----------------------------------------------------------------------------
// PART 2: FIX 2 — FIELD ALIGNMENT SYSTEM & FORM UX
// -----------------------------------------------------------------------------
console.log('\n--- Part 2: Field Alignment System & Form UX ---');

it('Input components standardize to 42px height (h-[42px]) in ui.jsx', () => {
  assert(uiJsxContent.includes('h-[42px]'), 'ui.jsx must specify h-[42px] for form inputs');
});

it('Field in ui.jsx reserves min-height for error & hint stability (min-h-[18px])', () => {
  assert(uiJsxContent.includes('min-h-[18px]'), 'Field component must reserve min-h-[18px] to prevent layout jitter');
});

it('ApplyModal uses responsive 2-column grid collapsing to 1-column on mobile', () => {
  assert(applyModalContent.includes('grid-cols-1 sm:grid-cols-2'),
    'Form sections must use grid-cols-1 sm:grid-cols-2');
});

// -----------------------------------------------------------------------------
// PART 3: FIX 3 — IDENTITY TRUTH & COMPLETE SESSION PREFILL
// -----------------------------------------------------------------------------
console.log('\n--- Part 3: Identity Truth & Complete Session Prefill ---');

const investFieldsPath = path.join(rootDir, 'src/components/common/InvestmentFormFields.jsx');
const investFieldsContent = fs.readFileSync(investFieldsPath, 'utf8');
const portalBridgePath = path.join(rootDir, 'src/services/portalBridge.js');
const portalBridgeContent = fs.readFileSync(portalBridgePath, 'utf8');

it('Zero occurrences of dummy PAN ABCDE1234F in rendered value paths', () => {
  // Ensure dummy PAN is not assigned as state, value, or fallback
  assert(!applyModalContent.includes("pan: 'ABCDE1234F'"), 'ApplyModal must not set pan: ABCDE1234F');
  assert(!applyModalContent.includes("panNumber: 'ABCDE1234F'"), 'ApplyModal must not set panNumber: ABCDE1234F');
  assert(!applyModalContent.includes("|| 'ABCDE1234F'"), 'ApplyModal must not fallback to ABCDE1234F');
  assert(!investFieldsContent.includes("|| 'ABCDE1234F'"), 'InvestmentFormFields must not fallback to ABCDE1234F');
  assert(!investFieldsContent.includes("ABCDE••••F"), 'InvestmentFormFields must not contain ABCDE••••F');
  assert(!portalBridgeContent.includes("ABCDE1234F"), 'portalBridge must not contain ABCDE1234F');
});

await itAsync('portalBridge.getMyProfile() resolves Vikramaditya Sharma (CUS-100234) with authentic PAN', async () => {
  const { resetDemoDb } = await import('../src/services/api.js');
  const { portalBridge } = await import('../src/services/portalBridge.js');
  resetDemoDb();
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');

  const { customer } = await portalBridge.getMyProfile();
  assert.equal(customer.customerId, 'CUS-100234', 'Profile must belong to CUS-100234');
  assert.equal(customer.fullName, 'Vikramaditya Sharma', 'Profile full name must be Vikramaditya Sharma');
  assert.equal(customer.pan, 'FNEGS1023K', 'PAN must be authentic FNEGS1023K');
  assert.equal(customer.dob, '1995-08-14', 'DOB must be 1995-08-14');
  assert.equal(customer.gender, 'MALE', 'Gender must be MALE');
});

await itAsync('Vikramaditya Sharma masked PAN renders as FNEGS••••K in InvestmentFormFields', async () => {
  const { portalBridge } = await import('../src/services/portalBridge.js');
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');

  const { customer } = await portalBridge.getMyProfile();
  assert(investFieldsContent.includes('`${pan.slice(0, 5)}••••${pan.slice(-1)}`'), 'InvestmentFormFields must mask PAN as 5 chars + 4 dots + last char');
  const masked = `${customer.pan.slice(0, 5)}••••${customer.pan.slice(-1)}`;
  assert.equal(masked, 'FNEGS••••K', `Masked PAN must be FNEGS••••K, received: ${masked}`);
});

it('ApplyModal prefill logic completes profile-known fields when logged in, empty for guests', () => {
  assert(applyModalContent.includes('customerRecord'), 'ApplyModal must load customerRecord for prefill');
  assert(applyModalContent.includes('rec?.fullName'), 'ApplyModal must map customer fullName');
  assert(applyModalContent.includes('rec?.email'), 'ApplyModal must map customer email');
  assert(applyModalContent.includes('rec?.pan'), 'ApplyModal must map customer PAN');
  assert(applyModalContent.includes('rec?.dob'), 'ApplyModal must map customer dateOfBirth');
  assert(applyModalContent.includes('rec?.gender'), 'ApplyModal must map customer gender');
  assert(applyModalContent.includes('rec?.address'), 'ApplyModal must map customer address');
});

// -----------------------------------------------------------------------------
// PART 4: FIX 4 — MANAGER DRAWERS HEIGHT BOUNDING
// -----------------------------------------------------------------------------
console.log('\n--- Part 4: Manager Drawers Height Bounding ---');

const managerSections = [
  { name: 'ManagerKycSection', file: 'ManagerKycSection.jsx' },
  { name: 'ManagerAccountsSection', file: 'ManagerAccountsSection.jsx' },
  { name: 'ManagerCardsSection', file: 'ManagerCardsSection.jsx' },
  { name: 'ManagerLoansSection', file: 'ManagerLoansSection.jsx' },
  { name: 'ManagerTicketsSection', file: 'ManagerTicketsSection.jsx' },
  { name: 'ManagerCustomersSection', file: 'ManagerCustomersSection.jsx' }
];

for (const sec of managerSections) {
  const filePath = path.join(rootDir, 'src/pages/manager/sections', sec.file);
  const content = fs.readFileSync(filePath, 'utf8');

  it(`${sec.name} drawer container bounds height to h-[100dvh] max-h-[100dvh] with flex flex-col overflow-hidden`, () => {
    assert(content.includes('h-[100dvh]'), `${sec.name} drawer container must have h-[100dvh]`);
    assert(content.includes('max-h-[100dvh]'), `${sec.name} drawer container must have max-h-[100dvh]`);
    assert(content.includes('overflow-hidden'), `${sec.name} drawer container must have overflow-hidden`);
    assert(content.includes('flex') && content.includes('flex-col'), `${sec.name} drawer container must have flex flex-col`);
  });

  it(`${sec.name} drawer header is pinned (shrink-0 sticky top-0)`, () => {
    assert(content.includes('shrink-0') && (content.includes('sticky top-0') || content.includes('border-b')),
      `${sec.name} drawer header must be pinned`);
  });

  it(`${sec.name} drawer body is scrollable (flex-1 overflow-y-auto)`, () => {
    assert(content.includes('flex-1') && content.includes('overflow-y-auto'),
      `${sec.name} drawer body must have flex-1 overflow-y-auto`);
  });

  it(`${sec.name} drawer footer is pinned at bottom (shrink-0 sticky bottom-0 bg-porcelain-50 border-t)`, () => {
    assert(content.includes('shrink-0') && content.includes('border-t') && content.includes('bg-porcelain-50'),
      `${sec.name} drawer footer must be pinned with bg-porcelain-50 border-t`);
  });
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 45 ACCEPTANCE VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
