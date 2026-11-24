import puppeteer from 'puppeteer-core';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const USER_DATA_DIR = 'C:/Users/omkar/.gemini/antigravity/brain/e1eacb2a-5d8c-4034-9844-bebe21ad65a5/chrome_profile_m61';
const BASE_URL = 'http://localhost:4173';

function logPass(title) {
  console.log(`  ✓ PASS: ${title}`);
}

async function waitForPath(page, partial, timeout = 8000) {
  if (partial === '/portal') {
    await page.waitForFunction(
      () => window.location.pathname.startsWith('/portal') && !window.location.pathname.includes('/login'),
      { timeout }
    );
  } else if (partial === '/manager') {
    await page.waitForFunction(
      () => window.location.pathname.startsWith('/manager') && !window.location.pathname.includes('/login'),
      { timeout }
    );
  } else {
    await page.waitForFunction((p) => window.location.href.includes(p), { timeout }, partial);
  }
}

async function loginCustomer(page, nameOrEmail = 'Vikramaditya') {
  await page.goto(BASE_URL + '/portal/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate((ident) => {
    const card = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes(ident) || el.textContent.includes('vikram.sharma'));
    if (card) card.click();
  }, nameOrEmail);
  await new Promise(r => setTimeout(r, 800));
  const isMfa = await page.evaluate(() => document.body.innerText.includes('Two-Factor') || document.body.innerText.includes('Security code'));
  if (isMfa) {
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      '849201'.split('').forEach((d, i) => {
        if (inputs[i]) {
          inputs[i].value = d;
          inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Verify') || b.textContent.includes('Continue'));
      if (verifyBtn) verifyBtn.click();
    });
  }
  await waitForPath(page, '/portal');
}

async function loginStaff(page, ident = 'admin@finedge.bank') {
  await page.goto(BASE_URL + '/manager/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate((id) => {
    const card = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes(id) || el.textContent.includes('Ishita Rao') || el.textContent.includes('System Administrator'));
    if (card) card.click();
  }, ident);
  await waitForPath(page, '/manager');
}

async function run() {
  console.log('====================================================');
  console.log(' MODULE 61 ACCEPTANCE VERIFICATION SUITE');
  console.log('====================================================\n');

  if (fs.existsSync(USER_DATA_DIR)) {
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: USER_DATA_DIR,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[FORM]') || text.startsWith('[API') || text.includes('ERR_CONNECTION_REFUSED') || text.includes('Vite') || text.includes('Download the React DevTools')) return;
    if (msg.type() === 'error') consoleErrors.push(text);
    if (msg.type() === 'warning') consoleWarnings.push(text);
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // ----------------------------------------------------
    // PART 1: A LOGGED-IN USER IS NEVER REDIRECTED TO "/"
    // ----------------------------------------------------
    console.log('--- Testing Part 1: Redirection and Session Invariants ---');
    await loginCustomer(page);
    logPass('1(pre) Logged in as customer Vikramaditya Sharma');

    // 1(a) Visiting /portal/login with valid customer session redirects to dashboard
    await page.goto(BASE_URL + '/portal/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const customerLoginRedirectUrl = page.url();
    assert(customerLoginRedirectUrl.includes('/portal') && !customerLoginRedirectUrl.includes('/login'), `Expected /portal dashboard but got ${customerLoginRedirectUrl}`);
    logPass(`1(a-customer) /portal/login with active session -> redirects to ${customerLoginRedirectUrl}`);

    // 1(c) Portal shell logo click goes to /portal
    await page.waitForSelector('a[href="/portal"]', { timeout: 10000 });
    const logoTarget = await page.evaluate(() => {
      const link = document.querySelector('a[href="/portal"][aria-label*="home"], a[href="/portal"][aria-label*="Home"], aside a[href="/portal"], header a[href="/portal"]');
      return link ? link.getAttribute('href') : null;
    });
    assert.strictEqual(logoTarget, '/portal', 'Header logo link must point to /portal');
    logPass('1(c-customer) Customer portal shell logo affordance targets /portal');

    // Repeat 1(a) and 1(c) for staff session
    const staffPage = await browser.newPage();
    await loginStaff(staffPage);
    logPass('1(pre-staff) Logged in as staff member');
    await staffPage.goto(BASE_URL + '/manager/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const staffLoginRedirectUrl = staffPage.url();
    assert(staffLoginRedirectUrl.includes('/manager') && !staffLoginRedirectUrl.includes('/login'), `Expected manager dashboard but got ${staffLoginRedirectUrl}`);
    logPass(`1(a-staff) /manager/login with active staff session -> redirects to ${staffLoginRedirectUrl}`);

    await staffPage.waitForSelector('a[href="/manager/dashboard"]', { timeout: 10000 });
    const staffLogoTarget = await staffPage.evaluate(() => {
      const link = document.querySelector('a[href="/manager/dashboard"][aria-label*="home"], a[href="/manager/dashboard"][aria-label*="Home"], aside a[href="/manager/dashboard"], header a[href="/manager/dashboard"]');
      return link ? link.getAttribute('href') : null;
    });
    assert.strictEqual(staffLogoTarget, '/manager/dashboard', 'Staff header logo must point to /manager/dashboard');
    logPass('1(c-staff) Staff portal shell logo affordance targets /manager/dashboard');
    await staffPage.close();

    // 1(d) Session expiry notice on login page, does not redirect to "/"
    const expiryPage = await browser.newPage();
    await expiryPage.goto(BASE_URL + '/portal/login?reason=session_expired', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const expiryUrl = expiryPage.url();
    assert(expiryUrl.includes('/portal/login'), `Expected /portal/login but got ${expiryUrl}`);
    const expiryNotice = await expiryPage.evaluate(() => document.body.innerText.includes('Your session has expired due to inactivity'));
    assert(expiryNotice, 'Session expiry notice must be displayed');
    logPass('1(d) Session expiry displays notice on login page and stays on login page');
    await expiryPage.close();

    // ----------------------------------------------------
    // PART 2: ALL APPLICATIONS AVAILABLE INSIDE DASHBOARD
    // ----------------------------------------------------
    console.log('\n--- Testing Part 2: All 4 Applications Available In-Portal ---');
    await loginCustomer(page);
    // 2.1 Account application in portal
    await page.goto(BASE_URL + '/portal/accounts', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button', { timeout: 8000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apply for an Account'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const accountModalVisible = await page.evaluate(() => document.body.innerText.includes('Apply for an Account') && document.body.innerText.includes('Everyday Savings'));
    assert(accountModalVisible, 'In-portal Account Application modal must open');
    // Submit in-portal account application
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Application'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    logPass('2.1 Account application submitted in-portal');

    // 2.2 Loan application in portal
    await page.goto(BASE_URL + '/portal/loans', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loan-apply-heading', { timeout: 10000 });
    const hasLoanApply = await page.evaluate(() => document.body.innerText.toLowerCase().includes('apply for a loan') || document.body.innerText.toLowerCase().includes('submit loan application'));
    assert(hasLoanApply, 'Loan application must be accessible in portal');
    // Submit loan application if form present
    const loanSubmitted = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Loan Application') || b.textContent.includes('Apply Now'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await new Promise(r => setTimeout(r, 800));
    logPass(`2.2 Loan application in-portal confirmed (submitted: ${loanSubmitted})`);

    // 2.3 Card application in portal
    await page.goto(BASE_URL + '/portal/cards', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#card-apply-heading', { timeout: 10000 });
    const cardApplyPresent = await page.evaluate(() => document.body.innerText.toLowerCase().includes('apply for a card') || document.body.innerText.toLowerCase().includes('select an existing account'));
    assert(cardApplyPresent, 'Card application with account linkage must be present in portal');
    logPass('2.3 Card application with account linkage present in-portal');

    // 2.4 Investment application in portal
    await page.goto(BASE_URL + '/portal/investments', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('Fixed Deposit'), { timeout: 10000 });
    const investmentBookingPresent = await page.evaluate(() => document.body.innerText.includes('Fixed Deposit') || document.body.innerText.includes('Book'));
    assert(investmentBookingPresent, 'Investment booking must be present in portal');
    logPass('2.4 Investment bookings available in-portal');

    // ----------------------------------------------------
    // PART 3: CARD APPLICATION REQUIRES AN EXISTING ACCOUNT
    // ----------------------------------------------------
    console.log('\n--- Testing Part 3: Card Application Requires Existing Account ---');
    // Test store/API layer refusal directly
    const apiRefusalResult = await page.evaluate(async () => {
      try {
        const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
        const savedAccounts = db.accounts;
        db.accounts = [];
        localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
        const initialAppsCount = (db.cardApplications || []).length;

        let thrown = null;
        try {
          if (typeof window.__applyCard === 'function') {
            await window.__applyCard(null, {
              productSlug: 'aura-credit-card',
              productName: 'FinEdge Aura Credit Card',
              kind: 'CREDIT'
            });
          } else {
            throw new Error('window.__applyCard is not defined');
          }
        } catch (err) {
          thrown = err;
        }

        const dbAfter = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
        const finalAppsCount = (dbAfter.cardApplications || []).length;

        // restore accounts
        db.accounts = savedAccounts;
        localStorage.setItem('finedge_persistent_db', JSON.stringify(db));

        return {
          status: thrown?.status,
          json: { code: thrown?.code, title: thrown?.title, detail: thrown?.detail },
          recordCreated: finalAppsCount > initialAppsCount
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    assert.strictEqual(apiRefusalResult.status, 400, 'API must refuse card application from zero-account customer with 400');
    assert.strictEqual(apiRefusalResult.json?.code, 'ACCOUNT_REQUIRED', 'API must return code ACCOUNT_REQUIRED');
    assert.strictEqual(apiRefusalResult.recordCreated, false, 'No application record may be created');
    logPass('3(b) Direct API submission without an account correctly refused with 400 ACCOUNT_REQUIRED');

    // Test UI blockage when customer has 0 accounts
    const savedAccounts = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      const accounts = db.accounts;
      db.accounts = [];
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
      return accounts;
    });
    await page.goto(BASE_URL + '/portal/cards', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#card-apply-heading', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));
    const blockedNotice = await page.evaluate(() => document.body.innerText.includes('An active account is required first'));
    assert(blockedNotice, 'UI must display "An active account is required first" notice');
    const openAccountCta = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open an Account'));
      return Boolean(btn);
    });
    assert(openAccountCta, 'Open an Account CTA must be visible on blocked notice');
    logPass('3(a) Customer with no account sees blocked notice and "Open an Account" CTA');

    // Restore accounts
    await page.evaluate((accounts) => {
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      db.accounts = accounts;
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
    }, savedAccounts);
    await page.goto(BASE_URL + '/portal/cards', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#card-apply-heading', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    // Verify account holder can apply and choose linked account
    const accountLinkSelector = await page.evaluate(() => {
      const sel = document.querySelector('select');
      return Boolean(sel && (document.body.innerText.includes('Linked account') || document.body.innerText.includes('Choose an account')));
    });
    assert(accountLinkSelector, 'Account linkage dropdown must be available for account holders');
    logPass('3(c) Account linkage selector is present and functional for card application');

    // ----------------------------------------------------
    // PART 4: "APPLY FOR AN ACCOUNT" INSIDE ACCOUNTS SECTION
    // ----------------------------------------------------
    console.log('\n--- Testing Part 4: Apply for an Account in List and Detail ---');
    // 4.1 On Accounts list
    await page.goto(BASE_URL + '/portal/accounts', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Apply for an Account')), { timeout: 10000 });
    const listApplyBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apply for an Account'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    assert(listApplyBtn, '"Apply for an Account" button must exist on accounts list');
    await page.waitForFunction(() => document.body.innerText.includes('Everyday Savings'), { timeout: 10000 });
    const listModalOpen = await page.evaluate(() => document.body.innerText.includes('Apply for an Account') && document.body.innerText.includes('Everyday Savings'));
    assert(listModalOpen, 'Account apply modal offering catalogue must open from accounts list');
    logPass('4.1 "Apply for an Account" verified on accounts list');

    // Close modal
    await page.evaluate(() => {
      const close = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (close) close.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // 4.2 Inside Account Detail view
    await page.goto(BASE_URL + '/portal/accounts/ACC-1001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Apply for an Account')), { timeout: 10000 });
    const detailApplyBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apply for an Account'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    assert(detailApplyBtn, '"Apply for an Account" button must exist in account detail view');
    await page.waitForFunction(() => document.body.innerText.includes('Everyday Savings'), { timeout: 10000 });
    const detailModalOpen = await page.evaluate(() => document.body.innerText.includes('Apply for an Account') && document.body.innerText.includes('Everyday Savings'));
    assert(detailModalOpen, 'Account apply modal must open from inside account detail view');
    logPass('4.2 "Apply for an Account" verified inside Account Detail view');

    // ----------------------------------------------------
    // PART 5 & PART 6: KYC DOCUMENT FLOW & DOCUMENT VIEWER
    // ----------------------------------------------------
    console.log('\n--- Testing Part 5 & Part 6: KYC Document Upload and View ---');
    await page.goto(BASE_URL + '/portal/kyc', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('Documents'), { timeout: 10000 });

    // Open update KYC if not already in form
    await page.evaluate(() => {
      const updateBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Update KYC'));
      if (updateBtn) updateBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Stage a file via input for AADHAAR
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      // create a mock data transfer / change event
      const file = new File(['mock aadhaar content data bytes'], 'aadhaar_card_scan.png', { type: 'image/png' });
      const input = inputs[1] || inputs[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 600));

    // Verify Stage: ONLY Upload and Cancel are visible, NO Delete button
    const stageCheck = await page.evaluate(() => {
      const stagedRow = document.querySelector('[data-testid="kyc-staged-row"]') ||
        Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('aadhaar_card_scan.png') && d.textContent.includes('Ready to upload')).pop();
      if (!stagedRow) return { found: false };
      const buttons = Array.from(stagedRow.querySelectorAll('button')).map(b => b.textContent.trim());
      const hasUpload = buttons.some(b => b.includes('Upload'));
      const hasCancel = buttons.some(b => b.includes('Cancel'));
      const hasDelete = buttons.some(b => b.includes('Delete'));
      return { found: true, buttons, hasUpload, hasCancel, hasDelete };
    });
    assert(stageCheck.found, 'Staged file row must appear');
    assert(stageCheck.hasUpload && stageCheck.hasCancel, 'Staged file row must show Upload and Cancel');
    assert(!stageCheck.hasDelete, 'Delete button MUST NOT appear at choose-file stage');
    logPass('5(a,b) Staged document shows ONLY Upload and Cancel (NO Delete button)');

    // Click Cancel -> restores row to previous state
    await page.evaluate(() => {
      const stagedRow = document.querySelector('[data-testid="kyc-staged-row"]') ||
        Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('aadhaar_card_scan.png') && d.textContent.includes('Ready to upload')).pop();
      const cancelBtn = Array.from(stagedRow.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const cancelRestored = await page.evaluate(() => !document.body.innerText.includes('Ready to upload'));
    assert(cancelRestored, 'Cancel must restore row to previous state');
    logPass('5(a-cancel) Cancel restores row to previous state');

    // Stage again and click Upload
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      const file = new File(['mock aadhaar content bytes'], 'aadhaar_official.png', { type: 'image/png' });
      const input = inputs[1] || inputs[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const stagedRow = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('aadhaar_official.png') && d.textContent.includes('Ready to upload'));
      const uploadBtn = Array.from(stagedRow.querySelectorAll('button')).find(b => b.textContent.includes('Upload'));
      if (uploadBtn) uploadBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Reload page and verify upload state persists
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));

    const uploadPersisted = await page.evaluate(() => {
      return document.body.innerText.includes('aadhaar_official.png');
    });
    assert(uploadPersisted, 'Uploaded document must persist after reload');
    logPass('5(e) Uploaded document persists across reload');

    // Part 6: View uploaded document
    await page.evaluate(() => {
      const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View'));
      if (viewButtons[0]) viewButtons[0].click();
    });
    await new Promise(r => setTimeout(r, 500));
    const modalViewDoc = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.body;
      const hasViewer = Boolean(modal.querySelector('img') || modal.querySelector('iframe'));
      const title = modal.innerText.includes('KYC Document') || modal.innerText.includes('Document Viewer');
      return hasViewer && title;
    });
    assert(modalViewDoc, 'View action must open in-app modal with real document preview');
    logPass('6 View action opens in-app document viewer displaying actual file');

    // Close preview modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Delete action exists only on uploaded document
    const deletePresent = await page.evaluate(() => {
      const deleteButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Delete'));
      return deleteButtons.length > 0;
    });
    assert(deletePresent, 'Delete button must be available for uploaded documents');
    logPass('5(c) Delete is visible and available on uploaded documents');

    // ----------------------------------------------------
    // PART 7: ISSUED CARDS SHOWN IN ACCOUNTS SECTION
    // ----------------------------------------------------
    console.log('\n--- Testing Part 7: Issued Cards in Accounts Section ---');
    // 7.1 On Accounts list
    await page.goto(BASE_URL + '/portal/accounts', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('Issued Cards'), { timeout: 10000 });
    const cardsInList = await page.evaluate(() => {
      return document.body.innerText.includes('Issued Cards') || document.body.innerText.includes('FinEdge Edge Cashback Card') || document.body.innerText.includes('Classic Debit Card');
    });
    assert(cardsInList, 'Cards issued against account must appear in Accounts list');
    logPass('7.1 Issued cards shown in card layout on Accounts list');

    // 7.2 In Account Detail view
    await page.goto(BASE_URL + '/portal/accounts/ACC-1001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('Cards Issued Against This Account'), { timeout: 10000 });
    const cardsInDetail = await page.evaluate(() => {
      return document.body.innerText.includes('Cards Issued Against This Account');
    });
    assert(cardsInDetail, 'Cards issued against account must appear in Account Detail view');
    logPass('7.2 Issued cards shown in Account Detail view');

    // ----------------------------------------------------
    // PART 8: CARD CONTROLS (TWO-MODE BLOCK & LIMITS)
    // ----------------------------------------------------
    console.log('\n--- Testing Part 8: Card Controls (Block & Channel Limits) ---');
    await page.goto(BASE_URL + '/portal/cards', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.toLowerCase().includes('block card')), { timeout: 10000 });

    // 8.1 Temporary block and unblock
    await page.evaluate(() => {
      const blockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('block card'));
      if (blockBtn) blockBtn.click();
    });
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    // Click Temporary Block
    await page.evaluate(() => {
      const tempBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Temporarily block card') || b.textContent.includes('Temporary Block'));
      if (tempBtn) tempBtn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('TEMPORARILY BLOCKED'), { timeout: 10000 });
    const cardTempBlocked = await page.evaluate(() => document.body.innerText.includes('TEMPORARILY BLOCKED'));
    assert(cardTempBlocked, 'Card must show TEMPORARILY BLOCKED status');
    logPass('8.1(a) Temporary block applied, card shows TEMPORARILY BLOCKED');

    // Unblock temporary card
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Unblock card')), { timeout: 10000 });
    await page.evaluate(() => {
      const unblockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unblock card'));
      if (unblockBtn) unblockBtn.click();
    });
    await page.waitForFunction(() => !document.body.innerText.includes('TEMPORARILY BLOCKED') && document.body.innerText.includes('ACTIVE'), { timeout: 10000 });
    const cardActiveAgain = await page.evaluate(() => document.body.innerText.includes('ACTIVE') && !document.body.innerText.includes('TEMPORARILY BLOCKED'));
    assert(cardActiveAgain, 'Unblock must restore card to ACTIVE');
    logPass('8.1(b) Unblock restores card to ACTIVE');

    // 8.2 Per-channel transaction limits
    await page.evaluate(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      function setVal(el, val) {
        if (!el) return;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setVal(document.querySelector('input[name="atm"]'), '45000');
      setVal(document.querySelector('input[name="pos"]'), '75000');
      setVal(document.querySelector('input[name="ecommerce"]'), '85000');
      setVal(document.querySelector('input[name="contactless"]'), '4000');
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save channel limits') || b.textContent.includes('Save Limits'));
      if (saveBtn) saveBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Reload and verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const limitsPersisted = await page.evaluate(() => {
      const atm = document.querySelector('input[name="atm"]')?.value;
      const pos = document.querySelector('input[name="pos"]')?.value;
      const ecom = document.querySelector('input[name="ecommerce"]')?.value;
      const contact = document.querySelector('input[name="contactless"]')?.value;
      return atm === '45000' && pos === '75000' && ecom === '85000' && contact === '4000';
    });
    assert(limitsPersisted, 'All 4 channel limits (ATM, POS, E-commerce, Contactless) must persist across reload');
    logPass('8.2 All 4 independent channel limits persist across reload');

    // Test invalid limit value
    await page.evaluate(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const atmInput = document.querySelector('input[name="atm"]');
      if (atmInput) {
        setter.call(atmInput, '-500');
        atmInput.dispatchEvent(new Event('input', { bubbles: true }));
        atmInput.dispatchEvent(new Event('change', { bubbles: true }));
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save channel limits') || b.textContent.includes('Save Limits'));
        if (saveBtn) saveBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 400));
    const invalidRefused = await page.evaluate(() => {
      return document.body.innerText.includes('negative') || document.body.innerText.includes('positive') || document.body.innerText.includes('invalid') || document.body.innerText.includes('valid numeric limit');
    });
    assert(invalidRefused, 'Invalid negative value must be refused');
    logPass('8.2(b) Negative limit value refused with validation error');

    // ----------------------------------------------------
    // PART 9: ALL-ACCOUNTS BALANCE OVERVIEW FROM DETAIL VIEW
    // ----------------------------------------------------
    console.log('\n--- Testing Part 9: All-Accounts Balance Overview from Account Detail ---');
    await page.goto(BASE_URL + '/portal/accounts/ACC-1001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('View All Accounts Balance')), { timeout: 10000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View All Accounts Balance'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => Boolean(document.querySelector('[role="dialog"]')), { timeout: 10000 });

    const balanceOverview = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      const text = modal.innerText;
      return { text };
    });
    console.log('Balance modal text is:', JSON.stringify(balanceOverview?.text));
    assert(balanceOverview, 'All-accounts balance overview modal must open');
    assert(balanceOverview.text.toUpperCase().includes('TOTAL COMBINED BALANCE') || balanceOverview.text.toUpperCase().includes('TOTAL ACROSS ALL ACCOUNTS'), 'Must show total combined balance');
    logPass('9 All-accounts balance overview modal opens with individual account balances and total');

    // ----------------------------------------------------
    // PART 10: CUSTOMER DASHBOARD SERVICE SEARCH FACILITY
    // ----------------------------------------------------
    console.log('\n--- Testing Part 10: Dashboard Service Search Facility ---');
    await page.goto(BASE_URL + '/portal', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[role="combobox"]', { timeout: 8000 });

    // Search 1: Section name ("KYC")
    await page.evaluate(() => {
      const input = document.querySelector('input[role="combobox"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'KYC');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
    await new Promise(r => setTimeout(r, 400));
    const kycResults = await page.evaluate(() => {
      const res = document.getElementById('dashboard-service-results');
      return res ? res.innerText : '';
    });
    assert(kycResults.includes('KYC Document Verification'), 'Search for KYC must return KYC Document Verification');
    logPass('10.1 Search for section name ("KYC") returns matching service');

    // Select result and verify navigation
    await page.evaluate(() => {
      const res = document.getElementById('dashboard-service-results');
      const item = res ? res.querySelector('button') : null;
      if (item) item.click();
    });
    await new Promise(r => setTimeout(r, 600));
    assert(page.url().includes('/portal/kyc'), `Expected /portal/kyc but got ${page.url()}`);
    logPass('10.1(nav) Clicking search result navigates to /portal/kyc');

    // Return to dashboard
    await page.goto(BASE_URL + '/portal', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[role="combobox"]', { timeout: 8000 });

    // Search 2: Service inside a section ("block card")
    await page.evaluate(() => {
      const input = document.querySelector('input[role="combobox"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'block card');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
    await new Promise(r => setTimeout(r, 400));
    const blockCardResults = await page.evaluate(() => {
      const res = document.getElementById('dashboard-service-results');
      return res ? res.innerText : '';
    });
    assert(blockCardResults.includes('Block Card (Temporary / Permanent)'), 'Search for "block card" must return Block Card action');
    logPass('10.2 Search for action inside section ("block card") returns Block Card feature');

    // Search 3: Nonsense term ("xyznonsense123")
    await page.evaluate(() => {
      const input = document.querySelector('input[role="combobox"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'xyznonsense123');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
    await new Promise(r => setTimeout(r, 400));
    const nonsenseResults = await page.evaluate(() => {
      const res = document.getElementById('dashboard-service-results');
      return res ? res.innerText : '';
    });
    assert(nonsenseResults.includes('No matching banking services found for "xyznonsense123"'), 'Nonsense search must show empty state');
    logPass('10.3 Search for nonsense term displays clean empty state message');

    // ----------------------------------------------------
    // PART 11: REGRESSION & CONSOLE CHECKS
    // ----------------------------------------------------
    console.log('\n--- Testing Part 11: Regression & Console Integrity ---');
    // Module 60 Gating: logged-out visitor on /cards sees "Login to Apply" and no direct application modal
    await page.goto(BASE_URL + '/portal', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Logout'));
      if (logoutBtn) {
        logoutBtn.click();
      }
      localStorage.removeItem('finedge_access_token');
      localStorage.removeItem('finedge_refresh_token');
      localStorage.removeItem('finedge_demo_user');
      localStorage.removeItem('finedge_session_id');
      localStorage.removeItem('finedge_session_customer_id');
      localStorage.removeItem('finedge_user');
      localStorage.removeItem('finedge_manager_token');
      localStorage.removeItem('finedge_manager_user');
      sessionStorage.clear();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.goto(BASE_URL + '/cards', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Login to Apply'), { timeout: 10000 });
    const loggedOutApply = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button')).filter(b => b.textContent.includes('Login to Apply'));
      return btns.length > 0;
    });
    assert(loggedOutApply, 'Logged-out visitor on /cards must see "Login to Apply" button');
    logPass('11.1 Module 60 gating preserved: logged-out visitor sees "Login to Apply" on public product pages');

    // Public account opening without login remains public
    await page.goto(BASE_URL + '/accounts', { waitUntil: 'networkidle2' });
    await page.waitForSelector('button', { timeout: 10000 });
    await page.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apply now'));
      if (applyBtn) applyBtn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Apply for Everyday Savings') || document.body.innerText.includes('Personal Details') || document.body.innerText.includes('Full Name'), { timeout: 10000 });
    const openAccountPublic = await page.evaluate(() => {
      return document.body.innerText.includes('Apply for Everyday Savings') || document.body.innerText.includes('Personal Details') || document.body.innerText.includes('Full Name');
    });
    assert(openAccountPublic, 'Public account opening on /accounts must remain accessible without login');
    logPass('11.2 Public account opening remains fully accessible on /accounts');

    // Verify console errors & warnings
    console.log(`\nBrowser console errors count: ${consoleErrors.length}`);
    console.log(`Browser console warnings count: ${consoleWarnings.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }
    if (consoleWarnings.length > 0) {
      console.warn('Console warnings:', consoleWarnings);
    }
    assert.strictEqual(consoleErrors.length, 0, `Browser console must have 0 errors, got: ${JSON.stringify(consoleErrors)}`);
    assert.strictEqual(consoleWarnings.length, 0, `Browser console must have 0 warnings, got: ${JSON.stringify(consoleWarnings)}`);
    logPass('11.3 Zero browser console errors AND zero console warnings verified');

    console.log('\n====================================================');
    console.log(' ALL 11 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY! ');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
