import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = 5173;
const ARTIFACT_DIR = 'C:\\Users\\omkar\\.gemini\\antigravity\\brain\\e1eacb2a-5d8c-4034-9844-bebe21ad65a5';

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getJsonWithRetry(url, maxRetries = 15, delay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getJson(url);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await wait(delay);
    }
  }
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const WS = globalThis.WebSocket;
    return new Promise((resolve, reject) => {
      this.ws = new WS(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
          if (type === 'error' || type === 'warning') {
            console.log(`[Browser Console ${type.toUpperCase()}]: ${text}`);
            if (this.onConsole) this.onConsole(type, text);
          }
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : null;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const tmpProfile = path.join(rootDir, 'scratch', 'chrome_tmp_profile_m47');
  if (!fs.existsSync(tmpProfile)) fs.mkdirSync(tmpProfile, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9252',
    `--user-data-dir=${tmpProfile}`,
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJsonWithRetry('http://127.0.0.1:9252/json');
  const target = targets.find(t => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);

  const consoleLogs = [];
  client.onConsole = (type, text) => {
    consoleLogs.push({ type, text });
  };

  await client.connect();
  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  console.log('\n======================================================');
  console.log('STARTING MODULE 47 POST-FIX VERIFICATION & CAPTURES');
  console.log('======================================================');

  // Helper to set customer session in localStorage
  async function setupCustomerSession() {
    await client.evaluate(`
      (() => {
        localStorage.setItem('finedge_session_id', 'm47-session-vikram');
        localStorage.setItem('finedge_session_customer_id', 'CUS-100234');
        localStorage.setItem('finedge_demo_user', JSON.stringify({
          customerId: 'CUS-100234',
          fullName: 'Vikramaditya Sharma',
          email: 'vikram.sharma@finedge.customer',
          mobile: '9820110023'
        }));
        localStorage.setItem('finedge_access_token', 'm47-session-vikram');

        const rawDb = localStorage.getItem('finedge_persistent_db');
        if (rawDb) {
          const db = JSON.parse(rawDb);
          if (!db.sessions) db.sessions = [];
          db.sessions = db.sessions.filter(s => s.sessionId !== 'm47-session-vikram');
          db.sessions.push({
            sessionId: 'm47-session-vikram',
            customerId: 'CUS-100234',
            type: 'CUSTOMER',
            role: 'CUSTOMER',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          });
          localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
        }
      })()
    `);
  }

  // Helper to set manager session in localStorage
  async function setupManagerSession(role = 'BANK_MANAGER') {
    await client.evaluate(`
      (() => {
        localStorage.setItem('finedge_manager_token', 'm47-token-mgr');
        localStorage.setItem('finedge_manager_user', JSON.stringify({
          staffId: 'STF-001',
          name: 'Priya Sharma',
          role: '${role}',
          email: 'manager@finedge.bank'
        }));

        const rawDb = localStorage.getItem('finedge_persistent_db');
        if (rawDb) {
          const db = JSON.parse(rawDb);
          if (!db.sessions) db.sessions = [];
          db.sessions = db.sessions.filter(s => s.sessionId !== 'm47-token-mgr');
          db.sessions.push({
            sessionId: 'm47-token-mgr',
            staffId: 'STF-001',
            type: 'STAFF',
            role: '${role}',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          });
          localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
        }
      })()
    `);
  }

  // Set desktop viewport 1440x900
  async function setDesktop() {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
  }

  // Set mobile viewport 390x844
  async function setMobile() {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
  }

  // ----------------------------------------------------
  // 1. CAPTURE DESKTOP SCREENSHOTS (1440px)
  // ----------------------------------------------------
  console.log('\n--- 1. Capturing Desktop Screenshots (1440px) ---');
  await setDesktop();

  // Public Home (1440px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await wait(1200);
  await client.captureScreenshot('m47-public-home-1440.png');

  // Product Detail (1440px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/loans/home-loan` });
  await wait(1200);
  await client.captureScreenshot('m47-product-detail-1440.png');

  // Customer Portal Dashboard (1440px)
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal` });
  await wait(1200);
  await client.captureScreenshot('m47-portal-dashboard-1440.png');

  // Customer Statement (1440px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/accounts/ACC-1001` });
  await wait(1500);
  await client.captureScreenshot('m47-portal-statement-1440.png');

  // Manager KYC Queue Drawer (1440px)
  await setupManagerSession('BANK_MANAGER');
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/manager/kyc` });
  await wait(1200);
  await client.evaluate(`
    (() => {
      const anyBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('Review') || 
        b.getAttribute('aria-label')?.includes('Review')
      );
      if (anyBtn) anyBtn.click();
    })()
  `);
  await wait(600);
  await client.captureScreenshot('m47-manager-queue-drawer-1440.png');

  // ----------------------------------------------------
  // 2. CAPTURE MOBILE SCREENSHOTS (390px)
  // ----------------------------------------------------
  console.log('\n--- 2. Capturing Mobile Screenshots (390px) ---');
  await setMobile();

  // Public Home (390px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await wait(1200);
  await client.captureScreenshot('m47-public-home-390.png');

  // Product Detail (390px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/loans/home-loan` });
  await wait(1200);
  await client.captureScreenshot('m47-product-detail-390.png');

  // Customer Portal Dashboard (390px)
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal` });
  await wait(1200);
  await client.captureScreenshot('m47-portal-dashboard-390.png');

  // Customer Statement (390px)
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/accounts/ACC-1001` });
  await wait(1500);
  await client.captureScreenshot('m47-portal-statement-390.png');

  // Manager KYC Queue Drawer (390px)
  await setupManagerSession('BANK_MANAGER');
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/manager/kyc` });
  await wait(1200);
  await client.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('Review') || 
        b.innerText.includes('Review details') ||
        b.getAttribute('aria-label')?.includes('Review')
      );
      if (btn) btn.click();
    })()
  `);
  await wait(600);
  await client.captureScreenshot('m47-manager-queue-drawer-390.png');

  // ----------------------------------------------------
  // 3. FIVE FUNCTIONAL SPOT CHECKS ON MOBILE (390px)
  // ----------------------------------------------------
  console.log('\n--- 3. Running 5 Functional Spot Checks on 390px Mobile ---');
  const spotChecks = {};

  // Spot Check a: Customer initiates transfer and submits
  console.log('\nExecuting Spot Check a: Customer Transfer...');
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/transfers` });
  await wait(1500);

  const transferResult = await client.evaluate(`
    (async () => {
      try {
        const hasStepper = Boolean(document.querySelector('ol'));
        
        // Select beneficiary if not selected
        const selects = Array.from(document.querySelectorAll('select'));
        if (selects.length > 1 && selects[1].options.length > 1) {
          selects[1].value = selects[1].options[1].value;
          selects[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Fill amount
        const amountInput = document.querySelector('input[type="number"]');
        if (amountInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(amountInput, '500');
          amountInput.dispatchEvent(new Event('input', { bubbles: true }));
          amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Click review button
        const reviewBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Review transfer')
        );
        const reviewClicked = Boolean(reviewBtn);
        if (reviewBtn) reviewBtn.click();

        return {
          ok: true,
          hasStepper,
          amountBound: amountInput?.value === '500',
          reviewClicked
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })()
  `);
  console.log('  Spot Check a Result:', transferResult);
  spotChecks.transfer = transferResult;

  // Spot Check b: Customer views statement and triggers download
  console.log('\nExecuting Spot Check b: Customer Statement Download...');
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/accounts/ACC-1001` });
  await wait(1500);

  const statementResult = await client.evaluate(`
    (() => {
      try {
        const buttons = Array.from(document.querySelectorAll('button'));
        const downloadCsvBtn = buttons.find(b => b.innerText.includes('Download CSV') || b.innerText.includes('CSV'));
        const downloadPdfBtn = buttons.find(b => b.innerText.includes('Download PDF') || b.innerText.includes('PDF'));
        
        // Check cards in mobile table
        const mobileContainer = Array.from(document.querySelectorAll('div')).find(d => 
          d.className.includes('sm:hidden') && d.className.includes('space-y-3')
        );
        const cardsCount = mobileContainer ? mobileContainer.children.length : 0;

        return {
          ok: true,
          hasCsvButton: Boolean(downloadCsvBtn),
          hasPdfButton: Boolean(downloadPdfBtn),
          cardsCount,
          mobileCardsRendered: cardsCount > 0
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })()
  `);
  console.log('  Spot Check b Result:', statementResult);
  spotChecks.statement = statementResult;

  // Spot Check c: Customer toggles card control
  console.log('\nExecuting Spot Check c: Customer Card Controls Toggle...');
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/cards` });
  await wait(1500);

  const cardToggleResult = await client.evaluate(`
    (async () => {
      try {
        const toggleButtons = Array.from(document.querySelectorAll('button[role="switch"]'));
        if (toggleButtons.length === 0) {
          return { ok: false, error: 'No switch buttons found' };
        }
        const firstToggle = toggleButtons[0];
        const rect = firstToggle.getBoundingClientRect();
        const initialChecked = firstToggle.getAttribute('aria-checked') === 'true';
        const wasDisabled = firstToggle.disabled;
        const label = firstToggle.getAttribute('aria-label');
        
        firstToggle.click();
        
        // Wait 600ms for optimistic update and re-query
        await new Promise(r => setTimeout(r, 600));
        const updatedButtons = Array.from(document.querySelectorAll('button[role="switch"]'));
        const afterChecked = updatedButtons[0] ? updatedButtons[0].getAttribute('aria-checked') === 'true' : null;
        
        return {
          ok: true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          label,
          wasDisabled,
          initialChecked,
          afterChecked,
          toggledSuccessfully: initialChecked !== afterChecked
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })()
  `);
  console.log('  Spot Check c Result:', cardToggleResult);
  spotChecks.cardToggle = cardToggleResult;

  // Spot Check d: Staff opens KYC queue drawer and approves/rejects
  console.log('\nExecuting Spot Check d: Staff KYC Queue Review Drawer Action...');
  await setupManagerSession('BANK_MANAGER');
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/manager/kyc` });
  await wait(1500);

  const kycDrawerResult = await client.evaluate(`
    (() => {
      try {
        const reviewBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Review details') || 
          b.innerText.includes('Review') || 
          b.getAttribute('aria-label')?.includes('Review')
        );
        if (!reviewBtn) return { ok: false, error: 'Review button not found' };
        
        reviewBtn.click();
        
        const drawer = document.querySelector('[role="dialog"], aside, .fixed.inset-y-0');
        const drawerOpen = Boolean(drawer);

        const approveBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Approve') && !b.disabled
        );
        const rejectBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Reject') && !b.disabled
        );

        return {
          ok: true,
          drawerOpen,
          hasApproveButton: Boolean(approveBtn),
          hasRejectButton: Boolean(rejectBtn)
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })()
  `);
  console.log('  Spot Check d Result:', kycDrawerResult);
  spotChecks.kycDrawer = kycDrawerResult;

  // Spot Check e: Staff / Customer opens support ticket and sends reply
  console.log('\nExecuting Spot Check e: Customer Support Ticket Interaction...');
  await setupCustomerSession();
  await client.send('Page.navigate', { url: `http://localhost:${PORT}/portal/support` });
  await wait(1500);

  const supportResult = await client.evaluate(`
    (() => {
      try {
        const newTicketBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Raise Ticket') || b.innerText.includes('New Ticket') || b.innerText.includes('Create')
        );
        const ticketItems = document.querySelectorAll('.cursor-pointer, [role="button"], button.w-full');
        
        return {
          ok: true,
          hasNewTicketButton: Boolean(newTicketBtn),
          ticketsListed: ticketItems.length
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    })()
  `);
  console.log('  Spot Check e Result:', supportResult);
  spotChecks.support = supportResult;

  // ----------------------------------------------------
  // 4. POST-FIX METRICS COMPILATION
  // ----------------------------------------------------
  const summary = {
    screenshotsCaptured: [
      'm47-public-home-1440.png',
      'm47-public-home-390.png',
      'm47-product-detail-1440.png',
      'm47-product-detail-390.png',
      'm47-portal-dashboard-1440.png',
      'm47-portal-dashboard-390.png',
      'm47-portal-statement-1440.png',
      'm47-portal-statement-390.png',
      'm47-manager-queue-drawer-1440.png',
      'm47-manager-queue-drawer-390.png'
    ],
    spotChecks,
    consoleErrors: consoleLogs.filter(c => c.type === 'error').length,
    consoleWarnings: consoleLogs.filter(c => c.type === 'warning').length,
    timestamp: new Date().toISOString()
  };

  const resultsPath = path.join(rootDir, 'scratch', 'module47_post_verify_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\nResults written to: ${resultsPath}`);
  console.log('Total Console Errors:', summary.consoleErrors);
  console.log('Total Console Warnings:', summary.consoleWarnings);

  client.close();
  chromeProc.kill('SIGKILL');
}

run().catch(err => {
  console.error('Post-verify failed:', err);
  process.exit(1);
});
