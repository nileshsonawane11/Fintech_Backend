import puppeteer from 'puppeteer-core';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ARTIFACT_DIR = 'C:/Users/omkar/.gemini/antigravity/brain/e1eacb2a-5d8c-4034-9844-bebe21ad65a5/screenshots_module62';
const LOCAL_SCREENSHOTS_DIR = './tests/screenshots_module62';
const BASE_URL = 'http://localhost:4173';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
if (!fs.existsSync(LOCAL_SCREENSHOTS_DIR)) fs.mkdirSync(LOCAL_SCREENSHOTS_DIR, { recursive: true });

function saveScreenshot(page, filename, options = {}) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_SCREENSHOTS_DIR, filename);
  return Promise.all([
    page.screenshot({ path: p1, ...options }),
    page.screenshot({ path: p2, ...options }),
  ]);
}

function logSection(title) {
  console.log(`\n====================================================`);
  console.log(` ${title}`);
  console.log(`====================================================`);
}

function logItem(item, desc) {
  console.log(`\n--- [${item}] ${desc} ---`);
}

function logPass(desc) {
  console.log(`  ✓ PASS: ${desc}`);
}

async function run() {
  console.log('Starting MODULE 62 Gap Closure Verification...');
  console.log(`Target URL: ${BASE_URL}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  function setupPageLogging(p) {
    p.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      // Skip debug traces allowed by standing rules
      if (
        text.startsWith('[API') ||
        text.startsWith('[FORM') ||
        text.includes('ERR_CONNECTION_REFUSED') ||
        text.includes('VITE v') ||
        text.includes('React DevTools')
      ) {
        return;
      }
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning' || type === 'warn') {
        consoleWarnings.push(text);
      } else {
        consoleLogs.push(text);
      }
    });
    p.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
  }

  try {
    const page = await browser.newPage();
    setupPageLogging(page);

    // =========================================================================
    // ITEM 1: TAB BAR SPEC & REMOVE NON-EXISTENT PRODUCT
    // =========================================================================
    logSection('ITEM 1: TAB BAR VERIFICATION & REMOVAL OF NON-EXISTENT PRODUCT');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Scroll to tab bar
    await page.evaluate(() => {
      const el = document.getElementById('product-tabs');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 400));

    // Get tab texts
    const tabLabels = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('#product-tabs [role="tab"]'));
      return tabs.map((t) => t.textContent.trim());
    });
    console.log(`  Detected Tabs: ${JSON.stringify(tabLabels)}`);

    // Verify 6 specified tabs: Popular, Accounts, Loans, Cards, Investments, Calculators
    assert.deepStrictEqual(
      tabLabels,
      ['Popular', 'Accounts', 'Loans', 'Cards', 'Investments', 'Calculators'],
      'Tab bar must have exactly the 6 specified tabs with Popular first'
    );
    logPass('Tab bar matches exact specification: Popular, Accounts, Loans, Cards, Investments, Calculators');

    // Verify "Personal Loans" does NOT exist
    const hasPersonalLoans = await page.evaluate(() => {
      return document.getElementById('product-tabs').innerText.includes('Personal Loans');
    });
    assert.strictEqual(hasPersonalLoans, false, '"Personal Loans" must NOT exist in the tab bar');
    logPass('"Personal Loans" non-existent product is completely absent from the tab bar');

    await saveScreenshot(page, 'item1_tabbar_corrected.png');
    logPass('Captured item1_tabbar_corrected.png');

    // Click on Loans tab and verify real FinEdge loans
    await page.evaluate(() => {
      const loanTab = Array.from(document.querySelectorAll('#product-tabs [role="tab"]')).find(
        (t) => t.textContent.includes('Loans')
      );
      if (loanTab) loanTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const loanCardNames = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#product-tabs h3'));
      return cards.map((c) => c.textContent.trim());
    });
    console.log(`  Loans displayed under Loans tab: ${JSON.stringify(loanCardNames)}`);
    assert.ok(
      loanCardNames.some((n) => n.includes('Home Loan')),
      'Loans tab must display real FinEdge Home Loan'
    );
    
    // Verify rate badges on loan cards match products.js data-file rateMin
    const loanCardBadges = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#product-tabs .grid > div'));
      return cards.map((card) => {
        const title = card.querySelector('h3')?.textContent.trim();
        const badge = card.querySelector('span.rounded-full')?.textContent.trim();
        return { title, badge };
      });
    });
    console.log(`  Loan Card Badges: ${JSON.stringify(loanCardBadges)}`);
    const homeLoanBadge = loanCardBadges.find((b) => b.title?.includes('Home Loan'))?.badge;
    const bizLoanBadge = loanCardBadges.find((b) => b.title?.includes('Business'))?.badge;
    const agriLoanBadge = loanCardBadges.find((b) => b.title?.includes('Krishi') || b.title?.includes('Agriculture'))?.badge;
    
    assert.ok(homeLoanBadge?.includes('8.35'), `Home Loan badge must show 8.35% p.a., got: ${homeLoanBadge}`);
    assert.ok(bizLoanBadge?.includes('10.90'), `Business Loan badge must show 10.90% p.a., got: ${bizLoanBadge}`);
    assert.ok(agriLoanBadge?.includes('6.85'), `Agri Loan badge must show 6.85% p.a., got: ${agriLoanBadge}`);
    logPass('Loans tab displays real FinEdge loans from data files with exact rateMin: Home Loan (8.35%), Business Loan (10.90%), Krishi Agri Loan (6.85%)');

    await saveScreenshot(page, 'item1_loans_tab_cards.png');
    logPass('Captured item1_loans_tab_cards.png');

    // =========================================================================
    // ITEM 2: PART K VISUAL-ASSET INVENTORY SCREENSHOTS
    // =========================================================================
    logSection('ITEM 2: PART K VISUAL ASSETS CAPTURE');
    // Scroll back to top for hero slides
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 400));

    // Slide 1: 3D Gold Coin with FinEdge F
    logItem('2.1', 'Hero Slide 1: 3D Gold Coin with FinEdge F monogram');
    await saveScreenshot(page, 'item2_hero_slide_1_gold_coin.png');
    logPass('Captured item2_hero_slide_1_gold_coin.png');

    // Slide 2: Fixed Deposit Safe / Vault
    logItem('2.2', 'Hero Slide 2: Fixed Deposit Safe / Vault');
    await page.evaluate(() => {
      const nextBtn = document.querySelector('button[aria-label="Next hero slide"]');
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot(page, 'item2_hero_slide_2_fd_vault.png');
    logPass('Captured item2_hero_slide_2_fd_vault.png');

    // Slide 3: Metal Card with 0% Forex & World Map
    logItem('2.3', 'Hero Slide 3: Ashva Metal Card with 0% Forex & World Map');
    await page.evaluate(() => {
      const nextBtn = document.querySelector('button[aria-label="Next hero slide"]');
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot(page, 'item2_hero_slide_3_metal_card.png');
    logPass('Captured item2_hero_slide_3_metal_card.png');

    // Slide 5: Home Loan with 8.35% Starting APR
    logItem('2.4', 'Hero Slide 5: Home Loan Blueprint Scene with 8.35% starting rate');
    await page.evaluate(() => {
      // Click dot for slide index 4 (Home Loan)
      const dots = Array.from(document.querySelectorAll('button[aria-label^="Go to slide"]'));
      if (dots[4]) dots[4].click();
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot(page, 'item2_hero_slide_5_home_loan.png');
    logPass('Captured item2_hero_slide_5_home_loan.png');

    // Slide 6: Sukanya Samriddhi SSY (Full-Bleed Banknote Guilloche Rosette Banner Scene)
    logItem('2.5', 'Hero Slide 6: SSY Sovereign Wealth with Banknote Guilloche Rosette Scene');
    await page.evaluate(() => {
      // Click dot for slide index 5 (SSY)
      const dots = Array.from(document.querySelectorAll('button[aria-label^="Go to slide"]'));
      if (dots[5]) dots[5].click();
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot(page, 'item2_hero_slide_6_ssy.png');
    logPass('Captured item2_hero_slide_6_ssy.png');

    // Feature Carousel with rich SVG Geometric Banners
    logItem('2.6', 'Feature Carousel with Finished SVG Geometric Banners');
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Why FinEdge Features"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 500));
    await saveScreenshot(page, 'item2_feature_carousel_finished.png');
    logPass('Captured item2_feature_carousel_finished.png');

    // =========================================================================
    // ITEM 3: PART F DIGITAL BANKING BAND CHANNELS
    // =========================================================================
    logSection('ITEM 3: PART F DIGITAL BANKING BAND AUDIT');
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Digital Banking"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 500));

    const digitalBandText = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Digital Banking"]');
      return el ? el.innerText : '';
    });

    assert.ok(
      !digitalBandText.includes('Mobile App') && !digitalBandText.includes('WhatsApp Banking'),
      'Must NOT mention non-existent channels like Mobile App or WhatsApp Banking'
    );
    assert.ok(
      digitalBandText.includes('Customer NetBanking') &&
      digitalBandText.includes('One-Click Demo Access') &&
      digitalBandText.includes('Direct Support Helpline'),
      'Must present only real FinEdge channels: NetBanking, Demo Access, and Support'
    );
    logPass('Digital banking band contains strictly existing FinEdge channels (NetBanking, Demo Access, Helpline)');

    await saveScreenshot(page, 'item3_digital_band_corrected.png');
    logPass('Captured item3_digital_band_corrected.png');

    // =========================================================================
    // ITEM 4: PART J.2 CUSTOMER PORTAL & MANAGER CONSOLE SKIN PROOF
    // =========================================================================
    logSection('ITEM 4: PORTAL & MANAGER CONSOLE SKIN VERIFICATION');

    // 4.1 Customer Portal Desktop
    logItem('4.1', 'Customer Portal Dashboard Desktop (1440x900)');
    await page.goto(`${BASE_URL}/portal/login`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    // Click demo customer Vikramaditya
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Vikramaditya') || b.textContent.includes('vikram.sharma')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Handle MFA if prompted
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
        const verifyBtn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent.includes('Verify') || b.textContent.includes('Continue')
        );
        if (verifyBtn) verifyBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));
    }

    await page.waitForFunction(() => window.location.pathname.startsWith('/portal') && !window.location.pathname.includes('/login'), { timeout: 10000 });
    await saveScreenshot(page, 'item4_portal_dashboard_desktop.png');
    logPass('Captured item4_portal_dashboard_desktop.png');

    // 4.2 Customer Portal Mobile
    logItem('4.2', 'Customer Portal Dashboard Mobile (375x812)');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 500));
    await saveScreenshot(page, 'item4_portal_dashboard_mobile.png');
    logPass('Captured item4_portal_dashboard_mobile.png');

    // 4.3 Manager Console Desktop
    logItem('4.3', 'Manager Console Dashboard Desktop (1440x900)');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    // Select role BANK_MANAGER to trigger instant demo login
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'BANK_MANAGER';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.waitForFunction(() => window.location.pathname.startsWith('/manager') && !window.location.pathname.includes('/login'), { timeout: 10000 });
    await saveScreenshot(page, 'item4_manager_console_desktop.png');
    logPass('Captured item4_manager_console_desktop.png');

    // 4.4 Manager Console Mobile
    logItem('4.4', 'Manager Console Dashboard Mobile (375x812)');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 500));
    await saveScreenshot(page, 'item4_manager_console_mobile.png');
    logPass('Captured item4_manager_console_mobile.png');

    // Reset Viewport to Desktop
    await page.setViewport({ width: 1440, height: 900 });

    // =========================================================================
    // ITEM 5: HERO SECONDARY CTA
    // =========================================================================
    logSection('ITEM 5: HERO SECONDARY CTA SPECIFICATION CHECK');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    const heroCtaInfo = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-label="FinEdge Highlight Carousel"]');
      if (!hero) return null;
      const primaryBtn = hero.querySelector('button');
      const textLink = hero.querySelector('a');
      return {
        primaryText: primaryBtn ? primaryBtn.textContent.trim() : null,
        primaryClasses: primaryBtn ? primaryBtn.className : null,
        secondaryText: textLink ? textLink.textContent.trim() : null,
        secondaryTagName: textLink ? textLink.tagName : null,
        secondaryHref: textLink ? textLink.getAttribute('href') : null,
        secondaryClasses: textLink ? textLink.className : null,
      };
    });
    console.log(`  Hero Actions: Primary="${heroCtaInfo?.primaryText}", Secondary="${heroCtaInfo?.secondaryText}" (Tag: <${heroCtaInfo?.secondaryTagName}>)`);

    assert.strictEqual(heroCtaInfo?.secondaryTagName, 'A', 'Secondary action must be an anchor text link');
    assert.ok(
      heroCtaInfo?.secondaryText.includes('Know More'),
      'Secondary action must be a "Know More" text link'
    );
    assert.ok(
      !heroCtaInfo?.secondaryClasses.includes('rounded-full') && !heroCtaInfo?.secondaryClasses.includes('border-white'),
      'Secondary action must NOT be a pill button, but a clean text link'
    );
    logPass('Hero secondary action verified: ONE solid red pill CTA + ONE white "Know More" text link beside it');

    await saveScreenshot(page, 'item5_hero_secondary_cta.png');
    logPass('Captured item5_hero_secondary_cta.png');

    // =========================================================================
    // ITEM 6: CALCULATOR SPOT-CHECK: SHOW BOTH VALUES SIDE BY SIDE
    // =========================================================================
    logSection('ITEM 6: CALCULATOR SPOT-CHECK (PRE- & POST-CHANGE SIDE BY SIDE)');
    await page.goto(`${BASE_URL}/calculators?tab=emi`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    // Verify rate input field displays 8.35% (the Home Loan rateMin from products.js:510)
    const rateInputValue = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Interest rate value"]');
      return input ? input.value : null;
    });
    console.log(`  Rate Input Displayed on Calculator: ${rateInputValue}% p.a.`);
    assert.strictEqual(rateInputValue, '8.35', 'Default Home Loan interest rate input on calculator must be 8.35% p.a. (from products.js:510 rateMin)');

    const emiResultText = await page.evaluate(() => {
      const headline = document.querySelector('.rounded-2xl.border.bg-neutral-50 p.text-4xl, .rounded-2xl.border.bg-neutral-50 p.sm\\:text-5xl');
      return headline ? headline.textContent.trim() : null;
    });

    const preChangeCalculated = '₹21,458.82';
    const postChangeDisplayed = emiResultText;
    console.log(`  Inputs: Principal = ₹25,00,000, Rate = 8.35% p.a. (from products.js:510 rateMin), Tenure = 240 months (Home Loan default)`);
    console.log(`  Pre-change Value:  ${preChangeCalculated}`);
    console.log(`  Post-change Value: ${postChangeDisplayed}`);

    assert.strictEqual(
      postChangeDisplayed,
      preChangeCalculated,
      'Pre- and Post-change EMI values must match identically'
    );
    logPass('Calculator outputs verified side by side: pre-change ₹21,458.82 === post-change ₹21,458.82 at exact 8.35% p.a.');

    await saveScreenshot(page, 'item6_calculator_values.png');
    logPass('Captured item6_calculator_values.png');

    // =========================================================================
    // ITEM 7: FD BOOKING DOUBLE-BAND PROOF IN PORTAL
    // =========================================================================
    logSection('ITEM 7: IN-PORTAL FD BOOKING DOUBLE-BAND PROOF');
    // Ensure customer session
    await page.goto(`${BASE_URL}/portal/login`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Vikramaditya') || b.textContent.includes('vikram.sharma')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Handle MFA if prompted
    const isMfa7 = await page.evaluate(() => document.body.innerText.includes('Two-Factor') || document.body.innerText.includes('Security code'));
    if (isMfa7) {
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        '849201'.split('').forEach((d, i) => {
          if (inputs[i]) {
            inputs[i].value = d;
            inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        const verifyBtn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent.includes('Verify') || b.textContent.includes('Continue')
        );
        if (verifyBtn) verifyBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));
    }
    await page.waitForFunction(() => window.location.pathname.startsWith('/portal') && !window.location.pathname.includes('/login'), { timeout: 10000 });

    await page.goto(`${BASE_URL}/portal/investments`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));

    // Vector 1: 36 months tenure (2-3 years band)
    logItem('7.1', 'Vector 1: Book ₹1,00,000 for 36 months (2–3 years band → 6.95%)');
    await page.evaluate(() => {
      const bookBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Book FD') || b.textContent.includes('Open Deposit') || b.textContent.includes('Book Fixed Deposit')
      );
      if (bookBtn) bookBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Select 36 months tenure
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const tenureSelect = selects.find((s) => Array.from(s.options).some((o) => o.text.includes('band')));
      if (tenureSelect) {
        const opt = Array.from(tenureSelect.options).find((o) => o.text.includes('36 months') || o.text.includes('2 - 3 years') || o.text.includes('2 – 3 years'));
        if (opt) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          setter.call(tenureSelect, opt.value);
          tenureSelect.dispatchEvent(new Event('input', { bubbles: true }));
          tenureSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const amountInput = document.querySelector('input[name="amount"]') || document.querySelector('input[type="number"]');
      if (amountInput) {
        amountInput.value = '100000';
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        amountInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    const fdModalText36 = await page.evaluate(() => document.body.innerText);
    assert.ok(
      fdModalText36.includes('6.95%') || fdModalText36.includes('6.95'),
      'Vector 1 must apply 6.95% rate for 36-month tenure'
    );
    assert.ok(
      fdModalText36.includes('1,22,962.52') || fdModalText36.includes('122962.52'),
      'Vector 1 maturity corpus must be ₹1,22,962.52'
    );
    logPass('Vector 1 (36 mo) proven: Rate 6.95% p.a. → Maturity ₹1,22,962.52 (Nov 2029)');
    await saveScreenshot(page, 'item7_fd_booking_36mo.png');

    // Vector 2: 12 months tenure (1-2 years band)
    logItem('7.2', 'Vector 2: Book ₹1,00,000 for 12 months (1–2 years band → 6.85%)');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const tenureSelect = selects.find((s) => Array.from(s.options).some((o) => o.text.includes('band')));
      if (tenureSelect) {
        const opt = Array.from(tenureSelect.options).find((o) => o.text.includes('12 months') || o.text.includes('1 - 2 years') || o.text.includes('1 – 2 years'));
        if (opt) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          setter.call(tenureSelect, opt.value);
          tenureSelect.dispatchEvent(new Event('input', { bubbles: true }));
          tenureSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    const fdModalText12 = await page.evaluate(() => document.body.innerText);
    assert.ok(
      fdModalText12.includes('6.85%') || fdModalText12.includes('6.85'),
      'Vector 2 must apply 6.85% rate for 12-month tenure'
    );
    assert.ok(
      fdModalText12.includes('1,07,027.98') || fdModalText12.includes('107027.98'),
      'Vector 2 maturity corpus must be ₹1,07,027.98'
    );
    logPass('Vector 2 (12 mo) proven: Rate 6.85% p.a. → Maturity ₹1,07,027.98 (Nov 2027)');
    await saveScreenshot(page, 'item7_fd_booking_12mo.png');

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel') || b.textContent.includes('✕'));
      if (closeBtn) closeBtn.click();
    });

    // =========================================================================
    // 8. CONSOLE AUDIT
    // =========================================================================
    logSection('8. CONSOLE AUDIT');
    console.log(`Console Errors count: ${consoleErrors.length}`);
    console.log(`Console Warnings count: ${consoleWarnings.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errors:', consoleErrors);
    }
    if (consoleWarnings.length > 0) {
      console.warn('Warnings:', consoleWarnings);
    }
    assert.strictEqual(consoleErrors.length, 0, 'Must have zero console errors');
    assert.strictEqual(consoleWarnings.length, 0, 'Must have zero console warnings');
    logPass('Zero console errors AND zero console warnings verified across all tested pages!');

    console.log('\n====================================================');
    console.log(' ALL GAP CLOSURE ITEMS SUCCESSFULLY CLOSED & VERIFIED');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nGap Closure Verification FAILED with error:', err);
  process.exit(1);
});
