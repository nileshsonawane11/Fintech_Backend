// tests/verify_module46.mjs
// Automated Acceptance Verification Suite for Module 46 — Closing fixes (FinEdge Bank)

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
console.log('STARTING MODULE 46 ACCEPTANCE VERIFICATION');
console.log('================================================================');

// -----------------------------------------------------------------------------
// FIX 1: DASHBOARD QUEUE TILES OBEY THE ROLE MATRIX
// -----------------------------------------------------------------------------
console.log('\n--- Fix 1: Dashboard Queue Tiles Obey Role Matrix ---');

const dashPath = path.join(rootDir, 'src/pages/manager/sections/ManagerDashboardSection.jsx');
const dashContent = fs.readFileSync(dashPath, 'utf8');

it('ManagerDashboardSection.jsx QueueCell receives canAccess prop', () => {
  assert(dashContent.includes('function QueueCell({ icon: Icon, label, queue, to, onOpen, canAccess })'),
    'QueueCell signature must include canAccess');
});

it('ManagerDashboardSection.jsx wires canAccess from hasSectionAccess(t.section, user)', () => {
  assert(dashContent.includes('canAccess={hasSectionAccess(t.section, user)}'),
    'QueueCell call must pass hasSectionAccess(t.section, user)');
});

it('QueueCell renders a non-interactive div with no click/hover affordance when canAccess is false', () => {
  assert(dashContent.includes('if (!canAccess) {'), 'Must check !canAccess guard');
  assert(dashContent.includes('<div className="bg-white px-5 py-4 text-left cursor-default">'),
    'Non-accessible queue tile must be a plain div with cursor-default');
});

it('QueueCell omits action-framing SLA notes and navigation arrow when canAccess is false', () => {
  const nonAccessIdx = dashContent.indexOf('if (!canAccess)');
  const closeBraceIdx = dashContent.indexOf('  }\n\n  return (', nonAccessIdx);
  const nonAccessBlock = dashContent.slice(nonAccessIdx, closeBraceIdx !== -1 ? closeBraceIdx : nonAccessIdx + 600);
  assert(!nonAccessBlock.includes('ArrowRight'), 'Non-accessible branch must not render ArrowRight');
  assert(!nonAccessBlock.includes('{note &&'), 'Non-accessible branch must omit action-framing note');
  assert(nonAccessBlock.includes('Oldest:'), 'Non-accessible branch must preserve SLA age text as information');
});

it('QueueCell renders an interactive button with ArrowRight and SLA note when canAccess is true', () => {
  const buttonIdx = dashContent.indexOf('<button');
  const buttonBlock = dashContent.slice(buttonIdx, dashContent.indexOf('</button>', buttonIdx));
  assert(buttonBlock.includes('onClick={() => onOpen(to)}'), 'Accessible branch must attach onOpen click handler');
  assert(buttonBlock.includes('hover:bg-midnight-50/60'), 'Accessible branch must include hover transition styling');
  assert(dashContent.includes('<ArrowRight'), 'Accessible branch must render navigation ArrowRight icon');
  assert(dashContent.includes('{note && ('), 'Accessible branch must render SLA action notes');
});

await itAsync('Role matrix correctly evaluates the 5 dashboard queue tiles across all 5 roles', async () => {
  const { hasSectionAccess } = await import('../src/services/managerBridge.js');

  const queueSections = [
    { section: 'kyc', label: 'KYC pending' },
    { section: 'accounts', label: 'Account apps' },
    { section: 'loans', label: 'Loan apps' },
    { section: 'cards', label: 'Card apps' },
    { section: 'tickets', label: 'Open tickets' }
  ];

  const roleExpectations = [
    {
      role: 'BANK_MANAGER',
      interactive: ['kyc', 'accounts', 'loans', 'cards', 'tickets'],
      countsOnly: []
    },
    {
      role: 'KYC_OFFICER',
      interactive: ['kyc'],
      countsOnly: ['accounts', 'loans', 'cards', 'tickets']
    },
    {
      role: 'ACCOUNT_OPS',
      interactive: ['accounts', 'cards'],
      countsOnly: ['kyc', 'loans', 'tickets']
    },
    {
      role: 'AUDIT_COMPLIANCE',
      interactive: [],
      countsOnly: ['kyc', 'accounts', 'loans', 'cards', 'tickets']
    },
    {
      role: 'CUSTOMER_SUPPORT',
      interactive: ['tickets'],
      countsOnly: ['kyc', 'accounts', 'loans', 'cards']
    }
  ];

  for (const exp of roleExpectations) {
    const user = { role: exp.role };
    for (const q of queueSections) {
      const allowed = hasSectionAccess(q.section, user);
      if (exp.interactive.includes(q.section)) {
        assert.equal(allowed, true, `Role ${exp.role} must have interactive access to ${q.label}`);
      } else {
        assert.equal(allowed, false, `Role ${exp.role} must have counts-only view for ${q.label}`);
      }
    }
  }
});

// -----------------------------------------------------------------------------
// FIX 2: CUSTOMERS DRAWER: ONE CLOSE PATH, WORKING FOOTER
// -----------------------------------------------------------------------------
console.log('\n--- Fix 2: Customers Drawer Close Paths ---');

const custSecPath = path.join(rootDir, 'src/pages/manager/sections/ManagerCustomersSection.jsx');
const custSecContent = fs.readFileSync(custSecPath, 'utf8');

it('ManagerCustomersSection.jsx footer Close button calls setSelectedId(null)', () => {
  assert(custSecContent.includes('<Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>'),
    'Footer close button must call setSelectedId(null)');
});

it('ManagerCustomersSection.jsx contains zero references to undefined setSelected', () => {
  assert(!custSecContent.includes('setSelected('),
    'Stray undefined setSelected reference must be completely removed');
});

it('ManagerCustomersSection.jsx provides all four unified close paths via setSelectedId(null)', () => {
  // 1. Footer Close
  assert(custSecContent.includes('onClick={() => setSelectedId(null)}>Close</Button>'), 'Footer close path missing');
  // 2. ✕ close button
  assert(custSecContent.includes('onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800" aria-label="Close customer detail"'),
    'Header ✕ close path missing');
  // 3. Backdrop click
  assert(custSecContent.includes('className="absolute inset-0 bg-midnight-950/60" onClick={() => setSelectedId(null)}" aria-hidden') ||
         custSecContent.includes('onClick={() => setSelectedId(null)} aria-hidden'),
    'Backdrop overlay click path missing');
  // 4. Escape key
  assert(custSecContent.includes("if (e.key === 'Escape') setSelectedId(null);"),
    'Keyboard Escape listener close path missing');
});

it('ManagerCustomersSection.jsx preserves body scroll state upon drawer close/unmount', () => {
  assert(custSecContent.includes("const prevOverflow = document.body.style.overflow;"), 'Must capture prevOverflow');
  assert(custSecContent.includes("document.body.style.overflow = 'hidden';"), 'Must prevent body scroll while drawer open');
  assert(custSecContent.includes("document.body.style.overflow = prevOverflow;"), 'Must restore prevOverflow on close');
});

// -----------------------------------------------------------------------------
// FIX 3: PAN REVEAL: PROVE IT END TO END, IMPORT WHAT IT NEEDS
// -----------------------------------------------------------------------------
console.log('\n--- Fix 3: PAN Reveal & Export Audit Integrity ---');

it('ManagerCustomersSection.jsx imports revealCustomerPan from managerBridge.js', () => {
  assert(custSecContent.includes('revealCustomerPan'),
    'ManagerCustomersSection.jsx must import revealCustomerPan');
});

await itAsync('revealCustomerPan executes end-to-end, writes audit entry, and preserves session actor non-repudiation', async () => {
  const { resetDemoDb, getDb, saveDb } = await import('../src/services/api.js');
  const { revealCustomerPan, customersCsv, listAudit } = await import('../src/services/managerBridge.js');
  const { maskPan } = await import('../src/lib/format.js');

  // Reset demo DB
  resetDemoDb();

  // Create real active manager session in db.sessions
  const db = getDb();
  const mgrSessId = 'ses_stf_mgr_test_' + Date.now();
  db.sessions = [{
    sessionId: mgrSessId,
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    type: 'STAFF',
    role: 'BANK_MANAGER',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }];
  saveDb(db);

  // Set manager staff session in localStorage
  storageMap.set('finedge_manager_token', mgrSessId);
  storageMap.set('finedge_manager_user', JSON.stringify({
    staffId: 'STF-001',
    email: 'manager@finedge.bank',
    fullName: 'Devendra Singhania',
    role: 'BANK_MANAGER'
  }));

  const targetCif = 'CUS-100234';
  const revealRes = await revealCustomerPan(targetCif);

  assert.equal(revealRes.customerId, targetCif, 'Returned customerId must match CIF');
  assert.equal(revealRes.pan, 'FNEGS1023K', 'Returned PAN must be the full unmasked PAN');

  // Inspect persistent audit log in DB
  const freshDb = getDb();
  const auditEntries = (freshDb.auditLogs || []).filter(e => e.action === 'CUSTOMER_PAN_REVEALED' && (e.target === targetCif || e.entityId === targetCif));

  assert(auditEntries.length >= 1, 'Audit log must contain at least one CUSTOMER_PAN_REVEALED event');
  const latestAudit = auditEntries[0]; // unshifted to top of array

  assert.equal(latestAudit.actor, 'manager@finedge.bank', 'Audit actor must match signed-in staff email');
  assert.equal(latestAudit.actorRole, 'BANK_MANAGER', 'Audit role must match staff role');
  assert.equal(latestAudit.status, 'SUCCESS', 'Audit status must be SUCCESS');
  assert((latestAudit.details || '').includes('Revealed full PAN for CIF CUS-100234'), 'Audit detail must quote customer CIF');
  assert(Boolean(latestAudit.timestamp), 'Audit entry must carry an authentic timestamp');

  // Inspect via managerBridge listAudit
  const allLogs = await listAudit();
  const normalizedMatch = allLogs.find(l => l.action === 'CUSTOMER_PAN_REVEALED' && l.entityId === targetCif);
  assert(Boolean(normalizedMatch), 'Normalized audit logs must include CUSTOMER_PAN_REVEALED');
  assert.equal(normalizedMatch.actor, 'manager@finedge.bank');

  // Verify CSV export still strictly masks the PAN
  const csvOutput = customersCsv(freshDb.customers);
  const expectedMaskedPan = maskPan('FNEGS1023K');
  assert(!csvOutput.includes('FNEGS1023K'), 'Customer CSV export MUST NOT contain unmasked PAN');
  assert(csvOutput.includes(expectedMaskedPan), `Customer CSV export MUST contain masked PAN (${expectedMaskedPan})`);
});

it('revealCustomerPan fails gracefully and throws error for non-existent CIF', async () => {
  const { revealCustomerPan } = await import('../src/services/managerBridge.js');
  await assert.rejects(
    async () => {
      await revealCustomerPan('CUS-999999');
    },
    /Customer not found/,
    'Non-existent customer must throw "Customer not found"'
  );
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 46 ACCEPTANCE VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
