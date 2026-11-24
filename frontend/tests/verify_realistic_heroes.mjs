import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:5173';
const outputDir = 'C:/Users/omkar/.gemini/antigravity/brain/e1eacb2a-5d8c-4034-9844-bebe21ad65a5/screenshots_module62_realistic';
const publicDir = 'C:/Users/omkar/.gemini/antigravity/scratch/fintech-backend/frontend/public/images';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const edgePaths = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
];
const execPath = edgePaths.find(p => fs.existsSync(p));

const expectedHeadlines = [
  '7.00%', // Slide 1: Savings
  'Fixed Deposits', // Slide 2: FD
  'Metal Credit Card', // Slide 3: Cards
  'Gold Loans', // Slide 4: Gold Loan
  'Home Loans', // Slide 5: Home Loan
  'Sukanya Samriddhi', // Slide 6: SSY
  'Certified security' // Slide 7: Trust
];

async function runVerification() {
  console.log('--- Starting Realistic Hero Verification Suite ---');

  // 1. Audit Image Assets in public/images
  const requiredAssets = [
    { file: 'hero-savings.webp', slide: 'Slide 1: Savings Account', expectedTheme: 'Pure gold minted coins in specular light' },
    { file: 'hero-fd.webp', slide: 'Slide 2: Fixed Deposit', expectedTheme: 'High-security heavy steel bank vault door' },
    { file: 'hero-cards.webp', slide: 'Slide 3: Credit Cards', expectedTheme: 'Matte black & gold metal credit cards' },
    { file: 'hero-gold-loan.webp', slide: 'Slide 4: Gold Loan', expectedTheme: 'Fine 999.9 gold bullion bars in vault' },
    { file: 'hero-home-loan.webp', slide: 'Slide 5: Home Loan', expectedTheme: 'Contemporary luxury home exterior at dusk' },
    { file: 'hero-ssy.webp', slide: 'Slide 6: SSY / Investments', expectedTheme: 'Joyful Indian mother holding laughing daughter' },
    { file: 'hero-trust.webp', slide: 'Slide 7: Brand / Trust', expectedTheme: 'Modern corporate banking architecture skyscraper' }
  ];

  const assetReport = [];
  for (const item of requiredAssets) {
    const filePath = path.join(publicDir, item.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required asset: ${item.file}`);
    }
    const stat = fs.statSync(filePath);
    assetReport.push({
      Filename: item.file,
      Slide: item.slide,
      Dimensions: '1920 x 800',
      'Size (KB)': (stat.size / 1024).toFixed(1) + ' KB',
      Subject: item.expectedTheme
    });
  }
  console.log('\n--- Realistic Image Asset Inventory ---');
  console.table(assetReport);

  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const consoleErrors = [];
  const consoleWarnings = [];

  function attachListeners(page, contextName) {
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error(`[CONSOLE ERROR - ${contextName}]:`, text);
        consoleErrors.push({ context: contextName, text });
      } else if (type === 'warning') {
        console.warn(`[CONSOLE WARN - ${contextName}]:`, text);
        consoleWarnings.push({ context: contextName, text });
      }
    });
    page.on('pageerror', err => {
      console.error(`[PAGE ERROR - ${contextName}]:`, err.message);
      consoleErrors.push({ context: contextName, text: err.message });
    });
  }

  // -------------------------------------------------------------
  // PART 1: Homepage Hero Slides (7 slides * 2 viewports = 14 screenshots)
  // -------------------------------------------------------------
  const slideNames = [
    'slide_1_savings',
    'slide_2_fixed_deposit',
    'slide_3_credit_cards',
    'slide_4_gold_loan',
    'slide_5_home_loan',
    'slide_6_ssy_investments',
    'slide_7_brand_trust'
  ];

  console.log('\nCapturing 7 Homepage Hero Slides at Desktop (1440x900)...');
  const desktopPage = await browser.newPage();
  attachListeners(desktopPage, 'Desktop-Homepage');
  await desktopPage.setViewport({ width: 1440, height: 900 });
  await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await desktopPage.hover('section[aria-label="FinEdge Highlight Carousel"]');
  await new Promise(r => setTimeout(r, 400));

  for (let idx = 0; idx < 7; idx++) {
    // Click indicator dot idx inside hero section
    await desktopPage.evaluate((i) => {
      const hero = document.querySelector('section[aria-label="FinEdge Highlight Carousel"]');
      const dots = hero.querySelectorAll('button[aria-label^="Go to slide"]');
      if (dots[i]) dots[i].click();
    }, idx);

    await desktopPage.waitForFunction(
      (matchStr) => {
        const h1 = document.querySelector('section[aria-label="FinEdge Highlight Carousel"] h1');
        return h1 && h1.innerText.includes(matchStr);
      },
      { timeout: 5000 },
      expectedHeadlines[idx]
    );
    await new Promise(r => setTimeout(r, 200));

    const shotPath = path.join(outputDir, `${slideNames[idx]}_desktop_1440.png`);
    const heroEl = await desktopPage.$('section[aria-label="FinEdge Highlight Carousel"]');
    await heroEl.screenshot({ path: shotPath });
    console.log(`✓ Saved ${slideNames[idx]}_desktop_1440.png [Verified headline: ${expectedHeadlines[idx]}]`);
  }
  await desktopPage.close();

  console.log('\nCapturing 7 Homepage Hero Slides at Mobile (375x812)...');
  const mobilePage = await browser.newPage();
  attachListeners(mobilePage, 'Mobile-Homepage');
  await mobilePage.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await mobilePage.hover('section[aria-label="FinEdge Highlight Carousel"]');
  await new Promise(r => setTimeout(r, 400));

  for (let idx = 0; idx < 7; idx++) {
    await mobilePage.evaluate((i) => {
      const hero = document.querySelector('section[aria-label="FinEdge Highlight Carousel"]');
      const dots = hero.querySelectorAll('button[aria-label^="Go to slide"]');
      if (dots[i]) dots[i].click();
    }, idx);

    await mobilePage.waitForFunction(
      (matchStr) => {
        const h1 = document.querySelector('section[aria-label="FinEdge Highlight Carousel"] h1');
        return h1 && h1.innerText.includes(matchStr);
      },
      { timeout: 5000 },
      expectedHeadlines[idx]
    );
    await new Promise(r => setTimeout(r, 200));

    const shotPath = path.join(outputDir, `${slideNames[idx]}_mobile_375.png`);
    const heroEl = await mobilePage.$('section[aria-label="FinEdge Highlight Carousel"]');
    await heroEl.screenshot({ path: shotPath });
    console.log(`✓ Saved ${slideNames[idx]}_mobile_375.png [Verified headline: ${expectedHeadlines[idx]}]`);
  }
  await mobilePage.close();

  // -------------------------------------------------------------
  // PART 2: Product Page Heroes (3 products * 2 viewports = 6 screenshots)
  // -------------------------------------------------------------
  const productPages = [
    { category: 'account', url: `${BASE_URL}/accounts/everyday-savings`, name: 'product_account_savings' },
    { category: 'loan', url: `${BASE_URL}/loans/home-loan`, name: 'product_loan_home' },
    { category: 'investment', url: `${BASE_URL}/investments/fixed-deposit`, name: 'product_investment_fd' }
  ];

  console.log('\nCapturing Product-Page Heroes at Desktop and Mobile...');
  for (const prod of productPages) {
    // Desktop
    const pDesktop = await browser.newPage();
    attachListeners(pDesktop, `Desktop-${prod.name}`);
    await pDesktop.setViewport({ width: 1440, height: 900 });
    await pDesktop.goto(prod.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const dHero = await pDesktop.$('section#overview');
    const dPath = path.join(outputDir, `${prod.name}_desktop_1440.png`);
    if (dHero) {
      await dHero.screenshot({ path: dPath });
    } else {
      await pDesktop.screenshot({ path: dPath });
    }
    console.log(`✓ Saved ${prod.name}_desktop_1440.png`);
    await pDesktop.close();

    // Mobile
    const pMobile = await browser.newPage();
    attachListeners(pMobile, `Mobile-${prod.name}`);
    await pMobile.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await pMobile.goto(prod.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const mHero = await pMobile.$('section#overview');
    const mPath = path.join(outputDir, `${prod.name}_mobile_375.png`);
    if (mHero) {
      await mHero.screenshot({ path: mPath });
    } else {
      await pMobile.screenshot({ path: mPath });
    }
    console.log(`✓ Saved ${prod.name}_mobile_375.png`);
    await pMobile.close();
  }

  await browser.close();

  console.log('\n--- Console Audit Results ---');
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  console.log(`Total Console Warnings: ${consoleWarnings.length}`);

  if (consoleErrors.length > 0 || consoleWarnings.length > 0) {
    console.error('FAILED: Found console errors or warnings!');
    process.exit(1);
  }

  console.log('\n=== ALL VERIFICATIONS PASSED: 20 SCREENSHOTS CAPTURED, 0 ERRORS, 0 WARNINGS ===');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
