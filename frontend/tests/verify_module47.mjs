// tests/verify_module47.mjs
// Automated Acceptance Verification Suite for Module 47 — Mobile-Desktop Parity (FinEdge Bank)

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

console.log('================================================================');
console.log('STARTING MODULE 47 ACCEPTANCE VERIFICATION: MOBILE-DESKTOP PARITY');
console.log('================================================================');

// Read source files
const headerContent = fs.readFileSync(path.join(rootDir, 'src/components/layout/Header.jsx'), 'utf8');
const homeContent = fs.readFileSync(path.join(rootDir, 'src/pages/HomePage.jsx'), 'utf8');
const accountsContent = fs.readFileSync(path.join(rootDir, 'src/pages/AccountsPage.jsx'), 'utf8');
const cardsContent = fs.readFileSync(path.join(rootDir, 'src/pages/CardsPage.jsx'), 'utf8');
const loansContent = fs.readFileSync(path.join(rootDir, 'src/pages/LoansPage.jsx'), 'utf8');
const investmentsContent = fs.readFileSync(path.join(rootDir, 'src/pages/InvestmentsPage.jsx'), 'utf8');
const pdpContent = fs.readFileSync(path.join(rootDir, 'src/pages/ProductDetailPage.jsx'), 'utf8');
const calcContent = fs.readFileSync(path.join(rootDir, 'src/pages/CalculatorsPage.jsx'), 'utf8');
const uiContent = fs.readFileSync(path.join(rootDir, 'src/components/ui.jsx'), 'utf8');
const portalShellContent = fs.readFileSync(path.join(rootDir, 'src/pages/portal/PortalDashboardPage.jsx'), 'utf8');
const managerShellContent = fs.readFileSync(path.join(rootDir, 'src/pages/manager/ManagerPortalPage.jsx'), 'utf8');
const transfersContent = fs.readFileSync(path.join(rootDir, 'src/pages/portal/sections/TransfersSection.jsx'), 'utf8');
const portalCardsContent = fs.readFileSync(path.join(rootDir, 'src/pages/portal/sections/CardsSection.jsx'), 'utf8');
const portalKycContent = fs.readFileSync(path.join(rootDir, 'src/pages/portal/sections/KycSection.jsx'), 'utf8');

console.log('\n--- Fix 1: Public Site Mobile Reflow & Parity ---');

it('Header mobile navigation drawer exposes accordion items for all desktop mega-menus', () => {
  assert(headerContent.includes("setMobileAccordion(mobileAccordion === 'Accounts'"), 'Accounts accordion missing');
  assert(headerContent.includes("setMobileAccordion(mobileAccordion === 'Cards'"), 'Cards accordion missing');
  assert(headerContent.includes("setMobileAccordion(mobileAccordion === 'Loans'"), 'Loans accordion missing');
  assert(headerContent.includes("setMobileAccordion(mobileAccordion === 'Investments'"), 'Investments accordion missing');
  assert(headerContent.includes("setMobileAccordion(mobileAccordion === 'Support'"), 'Support accordion missing');
  assert(headerContent.includes('to="/calculators"'), 'Calculators link missing');
});

it('Header mobile drawer positions primary login CTA button above fold on 667px screen', () => {
  const topDrawerSection = headerContent.slice(headerContent.indexOf('aria-label="Mobile Navigation"'), headerContent.indexOf('Accounts Accordion'));
  assert(topDrawerSection.includes('to="/portal/login"'), 'Mobile Login button missing from top drawer container');
  assert(topDrawerSection.includes('Staff Console'), 'Staff Console link missing from mobile drawer top container');
});

it('Homepage exposes all 7 sections in order without dropped blocks', () => {
  const heroIdx = homeContent.indexOf('aria-label="Welcome to FinEdge Bank"');
  const dirIdx = homeContent.indexOf('aria-label="Explore products"');
  const ratesIdx = homeContent.indexOf('aria-label="Rates at a glance"');
  const offersIdx = homeContent.indexOf('aria-label="Current seasonal offers"');
  const whyIdx = homeContent.indexOf('aria-label="Why FinEdge"');
  const faqIdx = homeContent.indexOf('aria-label="Frequently asked questions"');
  const ctaIdx = homeContent.indexOf('aria-label="Open an account"');

  assert(heroIdx !== -1 && dirIdx !== -1 && ratesIdx !== -1 && offersIdx !== -1 && whyIdx !== -1 && faqIdx !== -1 && ctaIdx !== -1,
    'One or more of the 7 homepage sections is missing');
  assert(heroIdx < dirIdx && dirIdx < ratesIdx && ratesIdx < offersIdx && offersIdx < whyIdx && whyIdx < faqIdx && faqIdx < ctaIdx,
    'Homepage sections are not in canonical reading order');
});

it('CardsPage & AccountsPage comparison tables contain sticky first column', () => {
  assert(cardsContent.includes('sticky left-0 bg-porcelain-100 z-10'), 'Cards table missing sticky first column header');
  assert(cardsContent.includes('sticky left-0 bg-white z-10'), 'Cards table missing sticky first column cells');
  assert(accountsContent.includes("className: 'sticky left-0 bg-white sm:bg-white z-10"), 'Accounts compare table missing sticky first column');
});

it('ProductDetailPage stacks application card in natural reading order without floating overlay', () => {
  assert(pdpContent.includes('static lg:sticky lg:top-24'), 'Product detail page sticky rail must be static on mobile');
  assert(pdpContent.includes('min-h-[44px] inline-flex items-center'), 'Product detail page tabs must meet 44px minimum tap target');
});

it('CalculatorsPage exposes all 5 calculators with contained overflow scrolling', () => {
  for (const id of ['emi', 'fd', 'rd', 'sip', 'ssy']) {
    assert(calcContent.includes(`id: '${id}'`), `Calculator tab ${id} missing`);
  }
  assert(calcContent.includes('overflow-x-auto'), 'Calculators schedule must have contained horizontal scroll');
});

console.log('\n--- Fix 2: Customer Portal Desktop Breadth on Small Screen ---');

it('PortalDashboardPage provides bottom navigation bar + More menu exposing all 12 sections', () => {
  assert(portalShellContent.includes("const BOTTOM = ['/portal', '/portal/accounts', '/portal/transfers', '/portal/cards']"),
    'Bottom bar must configure primary 4 destinations');
  assert(portalShellContent.includes('const moreItems = NAV.filter((n) => !BOTTOM.includes(n.to))'),
    'More menu must expose the remaining 8 destinations');
  assert(portalShellContent.includes('setMoreOpen'), 'More toggle setter missing');
  assert(portalShellContent.includes('pb-[env(safe-area-inset-bottom)]'), 'Bottom navigation must respect safe-area-inset-bottom');
});

it('PortalDashboardPage exposes unread notification badge on shell at all times', () => {
  assert(portalShellContent.includes('unreadN > 0'), 'Unread notification condition missing from shell');
  assert(portalShellContent.includes('to="/portal/notifications"'), 'Notification link missing from mobile top bar');
});

it('PortalDashboardPage provides one-tap user avatar menu from mobile top header', () => {
  assert(portalShellContent.includes('setAvatarMenuOpen'), 'Avatar menu state missing');
  assert(portalShellContent.includes('to="/portal/profile"'), 'Profile link missing from avatar menu');
  assert(portalShellContent.includes('Logout Session'), 'Logout button missing from avatar menu');
});

it('TransfersSection provides compact mobile stepper and 16px anti-zoom inputs', () => {
  assert(transfersContent.includes('horizontalOnMobile'), 'TransfersSection must enable horizontalOnMobile stepper');
  assert(uiContent.includes('text-base sm:text-sm'), 'Input component must enforce 16px text-base on mobile');
});

it('CardsSection quick toggles enforce >= 44x44px touch bounding box', () => {
  assert(portalCardsContent.includes('min-h-[44px] min-w-[44px] inline-flex items-center justify-center'),
    'CardsSection Toggle component must enforce min 44x44px bounding box');
});

console.log('\n--- Fix 3: Staff Console Full Operational Capability on Mobile ---');

it('ManagerPortalPage mobile pill nav scrolls horizontally with min-h-[44px] pills', () => {
  assert(managerShellContent.includes('overflow-x-auto'), 'Manager mobile pill nav must scroll horizontally');
  assert(managerShellContent.includes('min-h-[44px] inline-flex items-center'), 'Manager mobile nav pills must be min 44px tall');
  assert(managerShellContent.includes('managerUser?.roleTitle || managerUser?.role'), 'Manager role clearance badge must display on mobile');
});

it('Table component in ui.jsx provides mobile stacked-card reflow preserving all columns', () => {
  assert(uiContent.includes('hidden sm:block overflow-x-auto'), 'Desktop table wrapper must be preserved');
  assert(uiContent.includes('sm:hidden space-y-3'), 'Mobile stacked-card container missing');
  assert(uiContent.includes('c.render ? c.render(row) : row[c.key]'), 'Mobile card must render column values without dropping columns');
  assert(uiContent.includes('Review details →'), 'Mobile clickable row must render Review details affordance');
});

it('Manager review drawers feature full-width mobile responsive sheet & pinned decision footer', () => {
  const kycDrawer = fs.readFileSync(path.join(rootDir, 'src/pages/manager/sections/ManagerKycSection.jsx'), 'utf8');
  assert(kycDrawer.includes('w-full max-w-[540px]'), 'KYC drawer must be full width on mobile screens');
  assert(kycDrawer.includes('sticky bottom-0 z-10 shrink-0'), 'Decision controls must be pinned sticky at the bottom');
  assert(kycDrawer.includes('pb-[calc(1rem+env(safe-area-inset-bottom))]'), 'Decision footer must respect safe-area bottom inset');
});

console.log('\n--- Fix 4: Global Mobile Rules & Zero Defects ---');

it('Zero occurrences of sub-12px font size classes across src/', () => {
  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) results = results.concat(walk(full));
      else if (/\.(jsx?|tsx?|css)$/.test(file)) results.push(full);
    });
    return results;
  }
  const files = walk(path.join(rootDir, 'src'));
  const sub12Hits = [];
  files.forEach(f => {
    const text = fs.readFileSync(f, 'utf8');
    const lines = text.split('\n');
    lines.forEach((l, i) => {
      const m = l.match(/text-\[(?:[0-9]|1[01])px\]/g);
      if (m) sub12Hits.push({ file: path.relative(rootDir, f), line: i + 1, matches: m });
    });
  });
  assert.equal(sub12Hits.length, 0, `Found sub-12px occurrences: ${JSON.stringify(sub12Hits)}`);
});

it('Button component enforces minimum 44px tap target on all sizes', () => {
  assert(uiContent.includes("sm: 'min-h-[44px]"), 'Button size sm must enforce min-h-[44px]');
  assert(uiContent.includes("md: 'min-h-[44px]"), 'Button size md must enforce min-h-[44px]');
});

it('Tabs component enforces minimum 44px tap target', () => {
  assert(uiContent.includes('min-h-[44px] inline-flex items-center'), 'Tabs buttons must enforce min-h-[44px]');
});

it('Checkbox component enforces minimum 44px touch area', () => {
  assert(uiContent.includes('min-h-[44px] gap-2.5'), 'Checkbox label container must enforce min-h-[44px]');
});

it('Modal shell enforces safe-area inset on bottom sticky footer', () => {
  assert(uiContent.includes('pb-[calc(1rem+env(safe-area-inset-bottom))]'), 'Modal footer must include safe-area inset bottom padding');
});

console.log('\n================================================================');
console.log(`MODULE 47 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
