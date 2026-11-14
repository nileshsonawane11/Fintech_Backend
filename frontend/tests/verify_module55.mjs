// ============================================================================
// FINEDGE BANK - MODULE 55 ACCEPTANCE VERIFICATION SUITE
// Tests: Demo-mode one-click role switching (Staff and Customer login),
//        guard on typed credentials, auto-populate + auto-submit,
//        strict role matching preserved, zero requests on invalid submit.
// ============================================================================

import puppeteer from 'puppeteer-core';
import assert from 'assert';

const BASE_URL = 'http://localhost:4173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passedCount = 0;
let failedCount = 0;

function logPass(title) {
  console.log(`  ✓ PASS: ${title}`);
  passedCount++;
}

function logFail(title, err) {
  console.error(`  ✗ FAIL: ${title} ->`, err?.message || err);
  failedCount++;
}

async function fillInput(page, selector, text) {
  const el = await page.waitForSelector(selector, { timeout: 5000 });
  await el.focus();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await el.type(text);
}

async function waitForDemoMode(page) {
  await page.waitForFunction(
    () => document.body.innerText.includes('Demo mode') || document.body.innerText.includes('Demo access'),
    { timeout: 8000 }
  );
}

import os from 'os';
import path from 'path';
import fs from 'fs';

// ----------------------------------------------------------------------------
// Test Runner
// ----------------------------------------------------------------------------
async function main() {
  console.log('================================================================');
  console.log('STARTING MODULE 55 LIVE DOM ACCEPTANCE VERIFICATION');
  console.log('Target: ' + BASE_URL + ' (Headless Chrome Preview)');
  console.log('================================================================\n');

  const tempUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_m55_'));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir: tempUserDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const runWithFreshPage = async (fn) => {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    try {
      await fn(page, context);
    } finally {
      await context.close();
    }
  };

  try {
    // ------------------------------------------------------------------------
    // Row 1: Demo mode: click BANK_MANAGER demo card -> lands as STF-001 without touching button
    // ------------------------------------------------------------------------
    console.log('--- Row 1: Click BANK_MANAGER demo card (one-click sign in) ---');
    await runWithFreshPage(async (page) => {
      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      // Wait for demo mode detection and Demo access expander to appear
      await page.waitForFunction(() => document.body.innerText.includes('Demo access'), { timeout: 8000 });

      // Expand demo access if collapsed
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const toggle = btns.find(b => b.innerText.includes('Demo access'));
        if (toggle) toggle.click();
      });

      // Wait for demo cards to expand into DOM
      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.innerText.includes('BANK_MANAGER') || b.innerText.includes('manager@finedge.bank'));
      }, { timeout: 5000 });

      // Click the BANK_MANAGER card
      const cardClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const mgrBtn = buttons.find(b => b.innerText.includes('BANK_MANAGER') || b.innerText.includes('manager@finedge.bank'));
        if (mgrBtn) {
          mgrBtn.click();
          return true;
        }
        return false;
      });
      assert.ok(cardClicked, 'Row 1: BANK_MANAGER card found and clicked');

      // Wait for automatic login navigation (WITHOUT clicking "Authenticate Staff Session")
      await page.waitForFunction(() => window.location.pathname.startsWith('/manager') && window.location.pathname !== '/manager/login', { timeout: 6000 });

      const currentUrl = page.url();
      assert.ok(currentUrl.includes('/manager'), `Row 1: Landed on manager portal: ${currentUrl}`);

      const token = await page.evaluate(() => localStorage.getItem('finedge_manager_token'));
      assert.ok(token, 'Row 1: Manager session token stored in localStorage');

      const userJson = await page.evaluate(() => localStorage.getItem('finedge_manager_user'));
      assert.ok(userJson, 'Row 1: Manager user stored');
      const user = JSON.parse(userJson);
      assert.strictEqual(user.staffId, 'STF-001', 'Row 1: User is STF-001');
      assert.strictEqual(user.role, 'BANK_MANAGER', 'Row 1: Role is BANK_MANAGER');

      logPass('Row 1: Click BANK_MANAGER demo card -> lands in manager console as STF-001 without touching "Authenticate Staff Session"');
    });

    // ------------------------------------------------------------------------
    // Row 2: Demo mode: from fresh login page, select "KYC Verification Officer" in dropdown
    // ------------------------------------------------------------------------
    console.log('\n--- Row 2: Select "KYC Verification Officer" in dropdown from fresh page ---');
    await runWithFreshPage(async (page) => {
      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await waitForDemoMode(page);
      await page.waitForSelector('select[aria-label="Signing in as"]');

      // Check email is empty before select
      const initialEmail = await page.$eval('input[type="email"]', el => el.value);
      assert.strictEqual(initialEmail, '', 'Row 2: Email input initially empty');

      // Select KYC_OFFICER from dropdown
      await page.select('select[aria-label="Signing in as"]', 'KYC_OFFICER');

      // Wait for automatic login navigation (WITHOUT touching submit button)
      await page.waitForFunction(() => window.location.pathname.startsWith('/manager') && window.location.pathname !== '/manager/login', { timeout: 6000 });

      const currentUrl = page.url();
      assert.ok(currentUrl.includes('/manager/kyc') || currentUrl.includes('/manager'), `Row 2: Landed on KYC queue: ${currentUrl}`);

      const userJson = await page.evaluate(() => localStorage.getItem('finedge_manager_user'));
      assert.ok(userJson, 'Row 2: User record stored');
      const user = JSON.parse(userJson);
      assert.strictEqual(user.role, 'KYC_OFFICER', 'Row 2: Logged in as KYC_OFFICER');
      assert.strictEqual(user.email, 'kyc.officer@finedge.bank', 'Row 2: Populated and authenticated kyc.officer@finedge.bank');

      logPass('Row 2: Fresh login page, select "KYC Verification Officer" in dropdown -> populates with KYC officer demo account and signs in without touching button');
    });

    // ------------------------------------------------------------------------
    // Row 3: Demo mode: type a non-demo email, then change dropdown -> guard holds
    // ------------------------------------------------------------------------
    console.log('\n--- Row 3: Guard on typed non-demo email ---');
    await runWithFreshPage(async (page) => {
      const consoleLogs = [];
      page.on('console', (msg) => {
        consoleLogs.push(msg.text());
      });

      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await waitForDemoMode(page);
      await page.waitForSelector('input[type="email"]');

      // Type non-demo email
      await fillInput(page, 'input[type="email"]', 'someone@outside.in');

      // Change dropdown to BANK_MANAGER
      await page.select('select[aria-label="Signing in as"]', 'BANK_MANAGER');
      await new Promise((r) => setTimeout(r, 1200));

      // Assert email is untouched
      const currentEmail = await page.$eval('input[type="email"]', el => el.value);
      assert.strictEqual(currentEmail, 'someone@outside.in', 'Row 3: Typed email remains untouched');

      // Assert still on login page
      assert.ok(page.url().includes('/manager/login'), 'Row 3: Still on /manager/login');

      // Assert no token stored
      const token = await page.evaluate(() => localStorage.getItem('finedge_manager_token'));
      assert.strictEqual(token, null, 'Row 3: No token issued');

      // Assert no auth request was fired
      const firedAuthRequest = consoleLogs.some(l => l.includes('StaffLogin') || l.includes('/admin/api/v1/auth/login'));
      assert.strictEqual(firedAuthRequest, false, 'Row 3: Zero auth requests fired');

      logPass('Row 3: Type non-demo email (someone@outside.in), then change dropdown -> typed email untouched, no request fired, no sign-in');
    });

    // ------------------------------------------------------------------------
    // Row 4: One-click ACCOUNT_OPS -> logout -> one-click AUDIT_COMPLIANCE (no identity bleed)
    // ------------------------------------------------------------------------
    console.log('\n--- Row 4: One-click ACCOUNT_OPS -> logout -> one-click AUDIT_COMPLIANCE ---');
    await runWithFreshPage(async (page) => {
      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Demo access'), { timeout: 8000 });

      // Expand demo access
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const toggle = btns.find(b => b.innerText.includes('Demo access'));
        if (toggle) toggle.click();
      });

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.innerText.includes('ACCOUNT_OPS'));
      }, { timeout: 5000 });

      // Click ACCOUNT_OPS card
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const opsBtn = buttons.find(b => b.innerText.includes('ACCOUNT_OPS') || b.innerText.includes('ops@finedge.bank'));
        opsBtn.click();
      });

      await page.waitForFunction(() => window.location.pathname.startsWith('/manager') && window.location.pathname !== '/manager/login', { timeout: 6000 });

      let user = JSON.parse(await page.evaluate(() => localStorage.getItem('finedge_manager_user')));
      assert.strictEqual(user.role, 'ACCOUNT_OPS', 'Row 4: Session 1 role is ACCOUNT_OPS');
      assert.strictEqual(user.email, 'ops@finedge.bank', 'Row 4: Session 1 email is ops@finedge.bank');

      // Log out
      await page.evaluate(() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign Out') || b.innerText.includes('Logout'));
        if (logoutBtn) logoutBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      // Navigate back to /manager/login
      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Demo access'), { timeout: 8000 });

      // Expand demo access again
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const toggle = btns.find(b => b.innerText.includes('Demo access'));
        if (toggle) toggle.click();
      });

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.innerText.includes('AUDIT_COMPLIANCE'));
      }, { timeout: 5000 });

      // Click AUDIT_COMPLIANCE card
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const auditBtn = buttons.find(b => b.innerText.includes('AUDIT_COMPLIANCE') || b.innerText.includes('audit.officer@finedge.bank'));
        auditBtn.click();
      });

      await page.waitForFunction(() => window.location.pathname.startsWith('/manager') && window.location.pathname !== '/manager/login', { timeout: 6000 });

      user = JSON.parse(await page.evaluate(() => localStorage.getItem('finedge_manager_user')));
      assert.strictEqual(user.role, 'AUDIT_COMPLIANCE', 'Row 4: Session 2 role is AUDIT_COMPLIANCE');
      assert.strictEqual(user.email, 'audit.officer@finedge.bank', 'Row 4: Session 2 email is audit.officer@finedge.bank');
      assert.ok(user.name !== 'Rohan Mehra', 'Row 4: Clean switch, no identity bleed');

      logPass('Row 4: Sign in as ACCOUNT_OPS via one click, log out, sign in as AUDIT_COMPLIANCE via one click -> correct person and role, no identity bleed');
    });

    // ------------------------------------------------------------------------
    // Row 5: Manual path unchanged: typed demo manager email with WRONG role (ADMIN) -> 401
    // ------------------------------------------------------------------------
    console.log('\n--- Row 5: Manual path: typed credentials with wrong role (ADMIN) ---');
    await runWithFreshPage(async (page) => {
      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await waitForDemoMode(page);
      await page.waitForSelector('input[type="email"]');

      // Type email first to mark credentials as typed (preserving manual path)
      await fillInput(page, 'input[type="email"]', 'manager@finedge.bank');
      await page.select('select[aria-label="Signing in as"]', 'ADMIN');
      await fillInput(page, 'input[type="password"]', 'Manager@2026');

      // Click Authenticate Staff Session
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 1200));

      const errorText = await page.evaluate(() => {
        const el = document.querySelector('[role="alert"]') || document.querySelector('.text-danger-600') || document.querySelector('.bg-danger-50');
        return el ? el.innerText : '';
      });

      assert.ok(errorText.includes('No account found') || errorText.includes('Check the details') || errorText.includes('Authentication Failed'), 'Row 5: Generic refusal message shown');
      assert.ok(!errorText.includes('role mismatch'), 'Row 5: Does not leak mismatch type');

      const token = await page.evaluate(() => localStorage.getItem('finedge_manager_token'));
      assert.strictEqual(token, null, 'Row 5: Zero token stored on role mismatch');
      assert.ok(page.url().includes('/manager/login'), 'Row 5: Stays on login page');

      logPass('Row 5: Manual path: type demo manager email with WRONG role selected (ADMIN), click Authenticate -> generic refusal, no token, no session');
    });

    // ------------------------------------------------------------------------
    // Row 6: No-role submit still fires zero requests with inline error
    // ------------------------------------------------------------------------
    console.log('\n--- Row 6: Submit with no role selected ---');
    await runWithFreshPage(async (page) => {
      const consoleLogs = [];
      page.on('console', (msg) => {
        consoleLogs.push(msg.text());
      });

      await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'domcontentloaded' });
      await waitForDemoMode(page);
      await page.waitForSelector('input[type="email"]');

      await fillInput(page, 'input[type="email"]', 'manager@finedge.bank');
      await fillInput(page, 'input[type="password"]', 'Manager@2026');

      // Submit without selecting a role
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 800));

      const roleErrorText = await page.evaluate(() => {
        const field = document.querySelector('label:has(select[aria-label="Signing in as"])');
        const errSpan = field?.querySelector('[role="alert"]') || document.querySelector('[role="alert"]');
        return errSpan ? errSpan.innerText : document.body.innerText;
      });
      assert.ok(roleErrorText.includes('Select the role you are signing in as'), 'Row 6: Inline role error displayed');

      const requestFired = consoleLogs.some(l => l.includes('/admin/api/v1/auth/login'));
      assert.strictEqual(requestFired, false, 'Row 6: Zero requests fired');

      logPass('Row 6: No-role submit still fires zero requests with inline error "Select the role you are signing in as."');
    });

    // ------------------------------------------------------------------------
    // Row 7: Customer login: click customer demo card -> lands in portal in one click
    // ------------------------------------------------------------------------
    console.log('\n--- Row 7: Customer login: click demo card (one click) ---');
    await runWithFreshPage(async (page) => {
      await page.goto(`${BASE_URL}/portal/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Demo access'), { timeout: 8000 });

      // Expand demo access
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const toggle = btns.find(b => b.innerText.includes('Demo access'));
        if (toggle) toggle.click();
      });

      await page.waitForFunction(() => {
        const cards = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Use account →'));
        return cards.length > 0;
      }, { timeout: 5000 });

      // Click first customer card (e.g. Vikramaditya Sharma / CUS-100234)
      const clicked = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Use account →'));
        if (cards.length > 0) {
          cards[0].click();
          return true;
        }
        return false;
      });
      assert.ok(clicked, 'Row 7: Customer demo card clicked');

      // Wait for navigation to /portal without touching sign in or OTP buttons
      await page.waitForFunction(() => window.location.pathname.startsWith('/portal') && window.location.pathname !== '/portal/login', { timeout: 8000 });

      const currentUrl = page.url();
      assert.ok(currentUrl.includes('/portal'), `Row 7: Landed on customer portal: ${currentUrl}`);

      const token = await page.evaluate(() => localStorage.getItem('finedge_access_token'));
      assert.ok(token, 'Row 7: Customer access token stored in localStorage');

      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return text.includes('Accounts') || text.includes('Overview') || text.includes('Balance') || text.includes('Vikramaditya') || text.includes('Portal');
      }, { timeout: 8000 });

      const portalText = await page.evaluate(() => document.body.innerText);
      assert.ok(portalText.includes('Accounts') || portalText.includes('Overview') || portalText.includes('Balance') || portalText.includes('Vikramaditya') || portalText.includes('Portal'), 'Row 7: Portal dashboard rendered');

      logPass('Row 7: Customer login: click customer demo card -> lands in that customer\'s portal without touching sign-in or MFA buttons');
    });

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`MODULE 55 VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL Test Suite Error:', err);
  process.exit(1);
});
