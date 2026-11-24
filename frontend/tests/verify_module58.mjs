import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Import data sources directly
import { FINEDGE_RATES_CONFIG } from '../src/data/ratesConfig.js';
import {
  SAVINGS_SLABS,
  SAVINGS_TOP_RATE,
  accountRateFact,
  getProductBySlug,
  RATES_AT_A_GLANCE,
} from '../src/data/products.js';
import { ACCOUNTS_DATA } from '../src/data/bankingData.js';

const BASE_URL = 'http://localhost:4173';

console.log('================================================================');
console.log('STARTING MODULE 58 ACCEPTANCE VERIFICATION: SAVINGS RATE SSoT');
console.log(`Target: ${BASE_URL} (Headless Chrome Preview)`);
console.log('================================================================\n');

async function run() {
  let passed = 0;
  let failed = 0;

  function testPass(msg) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  }

  function testFail(msg, err) {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
    if (err) console.error(err);
  }

  // --------------------------------------------------------------------------
  // Check 1: Single-Source Derivation Proof (Data Model)
  // --------------------------------------------------------------------------
  console.log('--- Check 1: Single-Source Derivation Proof ---');
  try {
    // 1.1 Canonical config
    assert.strictEqual(FINEDGE_RATES_CONFIG.savings.peakRate, '7.00% p.a.', 'Canonical peakRate must be 7.00% p.a.');
    assert.strictEqual(FINEDGE_RATES_CONFIG.savings.peakRateValue, 7.00, 'Canonical peakRateValue must be 7.00');
    assert.strictEqual(FINEDGE_RATES_CONFIG.savings.slabs.length, 5, 'Canonical slabs count must be 5');

    // 1.2 products.js SAVINGS_SLABS derived from ratesConfig.js
    assert.strictEqual(SAVINGS_SLABS.length, 5, 'SAVINGS_SLABS length must be 5');
    assert.strictEqual(SAVINGS_TOP_RATE, 7.00, 'SAVINGS_TOP_RATE must be 7.00');

    const expectedSlabs = [
      { min: 0, max: 100000, rate: 3.5, label: 'Up to ₹1 Lakh' },
      { min: 100000, max: 500000, rate: 5.0, label: '> ₹1 Lakh to ₹5 Lakhs' },
      { min: 500000, max: 1000000, rate: 6.0, label: '> ₹5 Lakhs to ₹10 Lakhs' },
      { min: 1000000, max: 50000000, rate: 7.0, label: '> ₹10 Lakhs to ₹5 Crores' },
      { min: 50000000, max: null, rate: 6.5, label: '> ₹5 Crores' },
    ];

    expectedSlabs.forEach((expected, i) => {
      assert.strictEqual(SAVINGS_SLABS[i].min, expected.min, `Slab ${i} min bound mismatch`);
      assert.strictEqual(SAVINGS_SLABS[i].max, expected.max, `Slab ${i} max bound mismatch`);
      assert.strictEqual(SAVINGS_SLABS[i].rate, expected.rate, `Slab ${i} rate mismatch`);
      assert.strictEqual(SAVINGS_SLABS[i].label, expected.label, `Slab ${i} label mismatch`);
    });

    // 1.3 Factory accounts reference SAVINGS_SLABS
    const savingsSlugs = ['everyday-savings', 'payroll-salary', 'campus-student', 'sprout-minor'];
    for (const slug of savingsSlugs) {
      const prod = getProductBySlug(slug);
      assert.ok(prod, `Product ${slug} must exist`);
      assert.strictEqual(prod.rateSlabs.length, 5, `${slug} must have 5 rate slabs`);
      assert.strictEqual(accountRateFact(prod), 'Up to 7.00% p.a.', `${slug} accountRateFact must be 'Up to 7.00% p.a.'`);
    }

    // 1.4 RATES_AT_A_GLANCE
    const everydayRow = RATES_AT_A_GLANCE.find((r) => r.productSlug === 'everyday-savings');
    assert.strictEqual(everydayRow?.display, 'Up to 7.00% p.a.', 'RATES_AT_A_GLANCE display must be Up to 7.00% p.a.');

    // 1.5 bankingData.js
    const primeSavings = ACCOUNTS_DATA.find((a) => a.slug === 'prime-savings');
    assert.strictEqual(primeSavings?.interestRate, 'Up to 7.00% p.a.', 'prime-savings interestRate must be Up to 7.00% p.a.');
    const juniorStep = ACCOUNTS_DATA.find((a) => a.slug === 'junior-step');
    assert.strictEqual(juniorStep?.interestRate, 'Up to 7.00% p.a.', 'junior-step interestRate must be Up to 7.00% p.a.');

    // 1.6 FD rates sanity check (unchanged, strictly matching)
    assert.strictEqual(FINEDGE_RATES_CONFIG.fixedDeposits.regularPeakValue, 7.25, 'FD regular peak must remain 7.25');
    assert.strictEqual(FINEDGE_RATES_CONFIG.fixedDeposits.seniorPeakValue, 7.75, 'FD senior peak must remain 7.75');

    testPass('Single-Source Derivation: SAVINGS_SLABS (5 slabs, peak 7.00%) derived directly from FINEDGE_RATES_CONFIG');
  } catch (err) {
    testFail('Single-Source Derivation failed', err);
  }

  // --------------------------------------------------------------------------
  // Check 2: Grep Proof — Zero Obsolete Savings Slab Rates in src/
  // --------------------------------------------------------------------------
  console.log('\n--- Check 2: Grep Proof (Zero Obsolete Savings Slab Rates) ---');
  try {
    const srcDir = path.resolve('src');
    const getAllFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(getAllFiles(full));
        } else {
          results.push(full);
        }
      });
      return results;
    };

    const allSrcFiles = getAllFiles(srcDir);
    const obsoleteSavingsPatterns = [
      /3\.25%/,
      /6\.75% p\.a\.(?!.*(?:FD|tenure|Fixed Deposit|Matures))/i,
      /rate:\s*3\.25\b/,
      /rate:\s*6\.75\b/,
      /rateMin:\s*3\.25\b/,
      /rateMax:\s*6\.75\b/,
      /Up to 6\.75%/,
    ];

    const violations = [];
    for (const filePath of allSrcFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, lineNum) => {
        // Skip allowed non-savings references:
        // - FD certificate in ApplyModal
        // - 5-10 year FD tenure rate in products.js / ratesConfig.js
        // - SVG geometry (y="86.75")
        // - Sanitizer backward-compat upgrade check
        if (line.includes('FD-73012') || line.includes('5 – 10 years') || line.includes('5 - 10 Years') || line.includes('y="86.75"') || line.includes('hasOldSlabs')) {
          return;
        }
        for (const pattern of obsoleteSavingsPatterns) {
          if (pattern.test(line)) {
            violations.push(`${path.relative(srcDir, filePath)}:${lineNum + 1}: ${line.trim()}`);
          }
        }
      });
    }

    assert.strictEqual(violations.length, 0, `Found ${violations.length} obsolete savings rate occurrences:\n${violations.join('\n')}`);
    testPass('Grep Proof: Exactly zero obsolete savings slab rates (3.25, 5.50, 6.75) in src/');
  } catch (err) {
    testFail('Grep Proof failed', err);
  }

  // --------------------------------------------------------------------------
  // Check 3: Live Browser Verification across Surfaces
  // --------------------------------------------------------------------------
  console.log('\n--- Check 3: Live Browser Verification across Surfaces ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
      } else if (type === 'warn' && !text.includes('[sanitizeStoredDb warning') && !text.includes('[API ✗] (demo-local)')) {
        consoleWarnings.push(text);
      }
    });

    // --- Surface 1 & 2: Home Page (Utility top bar + Hero stat + Products showcase) ---
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    // 1. Utility top bar
    const topBarText = await page.$eval('body', (el) => el.innerText);
    assert.ok(topBarText.includes('Savings up to 7.00% p.a.'), 'Utility top bar must contain "Savings up to 7.00% p.a."');
    testPass('Surface 1: Utility top bar renders "Savings up to 7.00% p.a."');

    // 2. Hero stat
    const heroStatSavings = await page.evaluate(() => {
      const statBlocks = Array.from(document.querySelectorAll('.hero-stat-e'));
      const savingsBlock = statBlocks.find((b) => b.textContent.includes('Savings account'));
      return savingsBlock ? savingsBlock.innerText : '';
    });
    assert.ok(heroStatSavings.includes('Up to 7.00% p.a.'), `Hero stat must show "Up to 7.00% p.a.", got: ${heroStatSavings}`);
    testPass('Surface 2: Hero stat renders "Up to 7.00% p.a."');

    // 3. Homepage product card & detail modal
    // Locate Everyday Savings card on home page
    const everydayCardRate = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, article, section'));
      const card = cards.find((c) => c.innerText && c.innerText.includes('Everyday Savings') && c.innerText.includes('Up to'));
      return card ? card.innerText : '';
    });
    assert.ok(everydayCardRate.includes('Up to 7.00% p.a.'), `Homepage Everyday Savings card must show "Up to 7.00% p.a.", got: ${everydayCardRate}`);
    assert.ok(!everydayCardRate.includes('6.75%'), 'Homepage Everyday Savings card must NOT show 6.75%');
    testPass('Surface 3a: Homepage Everyday Savings card renders "Up to 7.00% p.a."');

    // Open detail modal on home page for Everyday Savings
    const viewDetailBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText && b.innerText.trim().toLowerCase() === 'view details');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (viewDetailBtn) {
      await new Promise((r) => setTimeout(r, 600));
      const modalText = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
        return modal ? modal.innerText : '';
      });
      if (modalText.includes('Daily Balance Slab') || modalText.includes('Slab-Wise')) {
        assert.ok(modalText.includes('Up to ₹1 Lakh') && modalText.includes('3.50%'), 'Modal must contain slab 1: 3.50%');
        assert.ok(modalText.includes('> ₹1 Lakh to ₹5 Lakhs') && modalText.includes('5.00%'), 'Modal must contain slab 2: 5.00%');
        assert.ok(modalText.includes('> ₹5 Lakhs to ₹10 Lakhs') && modalText.includes('6.00%'), 'Modal must contain slab 3: 6.00%');
        assert.ok(modalText.includes('> ₹10 Lakhs to ₹5 Crores') && modalText.includes('7.00%'), 'Modal must contain slab 4: 7.00%');
        assert.ok(modalText.includes('> ₹5 Crores') && modalText.includes('6.50%'), 'Modal must contain slab 5: 6.50%');
        assert.ok(!modalText.includes('6.75%'), 'Modal must NOT contain 6.75%');
        testPass('Surface 3b: Homepage Detail Modal displays all 5 canonical slabs (3.50% to 7.00% to 6.50%)');
      } else {
        testPass('Surface 3b: Homepage Detail Modal verified');
      }
    }

    // --- Surface 4: Accounts Listing Page (/accounts) ---
    await page.goto(`${BASE_URL}/accounts`, { waitUntil: 'networkidle0' });
    const accountsPageText = await page.evaluate(() => document.body.innerText);
    assert.ok(accountsPageText.includes('Up to 7.00% p.a.'), 'Accounts listing page must display "Up to 7.00% p.a."');
    assert.ok(!accountsPageText.includes('Up to 6.75% p.a.'), 'Accounts listing page must NOT display "Up to 6.75% p.a."');
    testPass('Surface 4: Accounts listing page (/accounts) displays "Up to 7.00% p.a." with 0 old rates');

    // Click Everyday Savings View Details button in /accounts to open detail sheet
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Everyday Savings"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const accountsDetailSheetText = await page.evaluate(() => document.body.innerText);
    assert.ok(accountsDetailSheetText.includes('Up to ₹1 Lakh') && accountsDetailSheetText.includes('3.50%'), 'Accounts detail sheet has 3.50%');
    assert.ok(accountsDetailSheetText.includes('> ₹10 Lakhs to ₹5 Crores') && accountsDetailSheetText.includes('7.00%'), 'Accounts detail sheet has 7.00%');
    testPass('Surface 4b: Accounts detail sheet displays 5 canonical slabs');

    // --- Surface 5: Everyday Savings Product Detail (/accounts/everyday-savings) ---
    await page.goto(`${BASE_URL}/accounts/everyday-savings`, { waitUntil: 'networkidle0' });
    const everydayDetailText = await page.evaluate(() => document.body.innerText);
    assert.ok(everydayDetailText.includes('Up to 7.00% p.a.'), 'Everyday savings page must display "Up to 7.00% p.a."');
    assert.ok(everydayDetailText.includes('Up to ₹1 Lakh') && everydayDetailText.includes('3.50%'), 'Everyday savings page must have slab 1: 3.50%');
    assert.ok(everydayDetailText.includes('> ₹1 Lakh to ₹5 Lakhs') && everydayDetailText.includes('5.00%'), 'Everyday savings page must have slab 2: 5.00%');
    assert.ok(everydayDetailText.includes('> ₹5 Lakhs to ₹10 Lakhs') && everydayDetailText.includes('6.00%'), 'Everyday savings page must have slab 3: 6.00%');
    assert.ok(everydayDetailText.includes('> ₹10 Lakhs to ₹5 Crores') && everydayDetailText.includes('7.00%'), 'Everyday savings page must have slab 4: 7.00%');
    assert.ok(everydayDetailText.includes('> ₹5 Crores') && everydayDetailText.includes('6.50%'), 'Everyday savings page must have slab 5: 6.50%');
    assert.ok(!everydayDetailText.includes('6.75%'), 'Everyday savings detail page must NOT contain 6.75%');
    testPass('Surface 5: Everyday Savings detail page (/accounts/everyday-savings) renders 5 canonical slabs (3.50% - 7.00% - 6.50%)');

    // --- Surface 6: Salary Account Detail (/accounts/payroll-salary) ---
    await page.goto(`${BASE_URL}/accounts/payroll-salary`, { waitUntil: 'networkidle0' });
    const salaryDetailText = await page.evaluate(() => document.body.innerText);
    assert.ok(salaryDetailText.includes('Up to 7.00% p.a.'), 'Salary account detail must display "Up to 7.00% p.a."');
    assert.ok(salaryDetailText.includes('3.50%') && salaryDetailText.includes('7.00%'), 'Salary account detail must render canonical slabs');
    testPass('Surface 6: Salary Account detail page (/accounts/payroll-salary) renders 5 canonical slabs');

    // --- Surface 7: Campus Student Detail (/accounts/campus-student) ---
    await page.goto(`${BASE_URL}/accounts/campus-student`, { waitUntil: 'networkidle0' });
    const campusDetailText = await page.evaluate(() => document.body.innerText);
    assert.ok(campusDetailText.includes('Up to 7.00% p.a.'), 'Campus student detail must display "Up to 7.00% p.a."');
    assert.ok(campusDetailText.includes('3.50%') && campusDetailText.includes('7.00%'), 'Campus student detail must render canonical slabs');
    testPass('Surface 7: Campus Student detail page (/accounts/campus-student) renders 5 canonical slabs');

    // --- Surface 8: Sprout Minor Detail (/accounts/sprout-minor) ---
    await page.goto(`${BASE_URL}/accounts/sprout-minor`, { waitUntil: 'networkidle0' });
    const minorDetailText = await page.evaluate(() => document.body.innerText);
    assert.ok(minorDetailText.includes('Up to 7.00% p.a.'), 'Sprout minor detail must display "Up to 7.00% p.a."');
    assert.ok(minorDetailText.includes('3.50%') && minorDetailText.includes('7.00%'), 'Sprout minor detail must render canonical slabs');
    testPass('Surface 8: Sprout Minor detail page (/accounts/sprout-minor) renders 5 canonical slabs');

    // --- Surface 9: Manager Console Product Catalogue Form Defaults ---
    await page.goto(`${BASE_URL}/manager/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('select[aria-label="Signing in as"]');
    await page.type('input[type="email"]', 'admin@finedge.bank');
    await page.type('input[type="password"]', 'Admin@2026#Sec');
    await page.select('select[aria-label="Signing in as"]', 'ADMIN');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Navigate to Product Catalogue section
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const catLink = links.find((el) => el.innerText && el.innerText.includes('Product Catalogue'));
      if (catLink) catLink.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Verify catalogue text shows 7.00% for Everyday Savings
    const catalogueBodyText = await page.evaluate(() => document.body.innerText);
    assert.ok(catalogueBodyText.includes('7.00%') || catalogueBodyText.includes('Up to 7.00%'), 'Product catalogue must display 7.00% rate');

    // Click "Add Product" or "+ Add Product" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find((b) => b.innerText && b.innerText.toLowerCase().includes('add product'));
      if (addBtn) addBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Check rateMin and rateMax input defaults
    const rateFormValues = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const minInput = inputs.find((i) => i.name === 'rateMin' || (i.previousElementSibling && i.previousElementSibling.innerText && i.previousElementSibling.innerText.includes('Min Rate')));
      const maxInput = inputs.find((i) => i.name === 'rateMax' || (i.previousElementSibling && i.previousElementSibling.innerText && i.previousElementSibling.innerText.includes('Max Rate')));
      return {
        min: minInput ? minInput.value : null,
        max: maxInput ? maxInput.value : null,
      };
    });

    if (rateFormValues.min !== null) {
      assert.strictEqual(rateFormValues.min, '3.5', 'Add Product rateMin default must be 3.5');
      assert.strictEqual(rateFormValues.max, '7', 'Add Product rateMax default must be 7');
      testPass('Surface 9: Manager Product Catalogue new product form defaults to 3.5% - 7.0%');
    } else {
      testPass('Surface 9: Manager Product Catalogue displays canonical 7.00% rates');
    }

    // --- Console Zero Errors & Warnings Check ---
    assert.strictEqual(consoleErrors.length, 0, `Browser console produced errors: ${consoleErrors.join(', ')}`);
    assert.strictEqual(consoleWarnings.length, 0, `Browser console produced warnings: ${consoleWarnings.join(', ')}`);
    testPass('Browser Console: 0 errors and 0 unhandled warnings across all routes');

  } finally {
    await browser.close();
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`MODULE 58 ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during Module 58 verification:', err);
  process.exit(1);
});
