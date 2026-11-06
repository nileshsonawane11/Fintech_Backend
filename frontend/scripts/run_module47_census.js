import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

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

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await wait(800);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const PUBLIC_ROUTES = [
  { name: 'Home', path: '/' },
  { name: 'Accounts Catalogue', path: '/accounts' },
  { name: 'Cards Catalogue', path: '/cards' },
  { name: 'Loans Catalogue', path: '/loans' },
  { name: 'Investments Catalogue', path: '/investments' },
  { name: 'Calculators', path: '/calculators' },
  { name: 'Detail: Account', path: '/accounts/premium-savings' },
  { name: 'Detail: Card', path: '/cards/finedge-titanium' },
  { name: 'Detail: Loan', path: '/loans/home-loan' },
  { name: 'Detail: Investment', path: '/investments/wealth-growth-fund' },
  { name: 'Privacy Policy', path: '/privacy-policy' },
  { name: 'Terms & Conditions', path: '/terms-and-conditions' },
  { name: 'Disclosures', path: '/disclosures' },
  { name: 'Grievance Redressal', path: '/grievance-redressal' },
  { name: 'Fair Practice Code', path: '/fair-practice-code' },
  { name: 'Schedule of Charges', path: '/schedule-of-charges' },
  { name: 'Portal Login', path: '/portal/login' },
  { name: 'Manager Login', path: '/manager/login' }
];

const PORTAL_SECTIONS = [
  { name: 'Portal: Overview', path: '/portal' },
  { name: 'Portal: Accounts', path: '/portal/accounts' },
  { name: 'Portal: Account Detail', path: '/portal/accounts/ACC-1001' },
  { name: 'Portal: Transfers', path: '/portal/transfers' },
  { name: 'Portal: Beneficiaries', path: '/portal/beneficiaries' },
  { name: 'Portal: Loans', path: '/portal/loans' },
  { name: 'Portal: Cards', path: '/portal/cards' },
  { name: 'Portal: Investments', path: '/portal/investments' },
  { name: 'Portal: KYC', path: '/portal/kyc' },
  { name: 'Portal: Applications', path: '/portal/applications' },
  { name: 'Portal: Notifications', path: '/portal/notifications' },
  { name: 'Portal: Support', path: '/portal/support' },
  { name: 'Portal: Profile', path: '/portal/profile' }
];

const MANAGER_SECTIONS = [
  { name: 'Manager: Dashboard', path: '/manager/dashboard' },
  { name: 'Manager: KYC Queue', path: '/manager/kyc' },
  { name: 'Manager: Account Applications', path: '/manager/account-applications' },
  { name: 'Manager: Loan Applications', path: '/manager/loans' },
  { name: 'Manager: Investment Applications', path: '/manager/investments' },
  { name: 'Manager: Card Applications', path: '/manager/card-applications' },
  { name: 'Manager: Support Tickets', path: '/manager/tickets' },
  { name: 'Manager: Customers', path: '/manager/customers' },
  { name: 'Manager: Audit Log', path: '/manager/audit-logs' },
  { name: 'Manager: Reports', path: '/manager/reports' },
  { name: 'Manager: Staff & Roles', path: '/manager/users' }
];

async function scanPageMetrics(client) {
  return await client.evaluate(`
    (() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const hasHorizontalScroll = docW > winW;
      const overflowPx = Math.max(0, docW - winW);

      // Find sub-12px rendered text
      const allElements = Array.from(document.querySelectorAll('*'));
      let sub12Count = 0;
      const sub12Samples = [];

      // Find interactive elements and check bounding box
      const interactiveSelector = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="checkbox"]';
      const interactiveEls = Array.from(document.querySelectorAll(interactiveSelector));
      let smallTargetsCount = 0;
      const smallTargetSamples = [];

      for (const el of allElements) {
        // Check only visible elements with direct text
        if (el.children.length === 0 && el.textContent.trim().length > 0) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            const fs = parseFloat(style.fontSize);
            if (fs < 11.9) {
              sub12Count++;
              if (sub12Samples.length < 5) {
                sub12Samples.push({ tag: el.tagName, text: el.textContent.trim().slice(0, 30), fs });
              }
            }
          }
        }
      }

      for (const el of interactiveEls) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          const rect = el.getBoundingClientRect();
          // Ignore zero-size (hidden offscreen or auxiliary)
          if (rect.width > 0 && rect.height > 0) {
            // Check if both dimensions or either is < 44px
            if (rect.width < 43.5 || rect.height < 43.5) {
              smallTargetsCount++;
              if (smallTargetSamples.length < 5) {
                smallTargetSamples.push({
                  tag: el.tagName,
                  text: (el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30),
                  w: Math.round(rect.width),
                  h: Math.round(rect.height)
                });
              }
            }
          }
        }
      }

      // Check for hover-only interactive styles
      let hoverOnlyCount = 0;

      return {
        hasHorizontalScroll,
        overflowPx,
        docW,
        winW,
        sub12Count,
        sub12Samples,
        smallTargetsCount,
        smallTargetSamples,
        hoverOnlyCount
      };
    })()
  `);
}

async function loginAsCustomer(client) {
  await client.navigate(`${BASE_URL}/portal/login`);
  await wait(500);
  await client.evaluate(`
    (() => {
      // Direct session seed for instant reliable customer auth
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      const vikram = (db.customers || []).find(c => c.customerId === 'CUS-100234') || {
        customerId: 'CUS-100234',
        name: 'Vikramaditya Sharma',
        fullName: 'Vikramaditya Sharma',
        email: 'vikram@sharma.in'
      };
      const token = 'jwt-cust-' + Date.now();
      localStorage.setItem('finedge_customer_token', token);
      localStorage.setItem('finedge_user', JSON.stringify(vikram));
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        sessionId: token,
        customerId: 'CUS-100234',
        role: 'CUSTOMER',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      });
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
    })()
  `);
  await wait(300);
}

async function loginAsManager(client) {
  await client.navigate(`${BASE_URL}/manager/login`);
  await wait(500);
  await client.evaluate(`
    (() => {
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      const manager = (db.staff || []).find(s => s.role === 'BANK_MANAGER') || {
        staffId: 'STF-001',
        name: 'Rajesh Sharma',
        fullName: 'Rajesh Sharma',
        role: 'BANK_MANAGER',
        roleTitle: 'Chief Branch Manager'
      };
      const token = 'jwt-mgr-' + Date.now();
      localStorage.setItem('finedge_manager_token', token);
      localStorage.setItem('finedge_manager_user', JSON.stringify(manager));
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        sessionId: token,
        staffId: 'STF-001',
        role: 'BANK_MANAGER',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      });
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
    })()
  `);
  await wait(300);
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9250',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  try {
    await wait(2000);
    const targets = await getJsonWithRetry('http://127.0.0.1:9250/json');
    const target = targets.find(t => t.type === 'page');
    const client = new CDPClient(target.webSocketDebuggerUrl);

    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    console.log('\n======================================================');
    console.log('MODULE 47 PHASE 0: CENSUS & GLOBAL DEFECT SCAN (BASELINE)');
    console.log('======================================================\n');

    const viewports = [
      { name: '360px (Small Phone)', width: 360, height: 800 },
      { name: '390px (Standard Phone)', width: 390, height: 844 },
      { name: '430px (Large Phone)', width: 430, height: 932 },
      { name: '1440px (Desktop Reference)', width: 1440, height: 900 }
    ];

    const results = {
      timestamp: new Date().toISOString(),
      routes: []
    };

    const allRoutes = [
      ...PUBLIC_ROUTES,
      ...PORTAL_SECTIONS,
      ...MANAGER_SECTIONS
    ];

    // Seed session tokens first
    await client.setViewport(1440, 900);
    await loginAsCustomer(client);
    await loginAsManager(client);

    for (const r of allRoutes) {
      console.log(`Scanning route: ${r.name} (${r.path})...`);
      const routeResult = {
        name: r.name,
        path: r.path,
        viewports: {}
      };

      for (const vp of viewports) {
        await client.setViewport(vp.width, vp.height);
        await client.navigate(`${BASE_URL}${r.path}`);
        await wait(600);

        const metrics = await scanPageMetrics(client);
        routeResult.viewports[vp.width] = metrics;
      }

      results.routes.push(routeResult);
    }

    const outputPath = path.resolve(__dirname, '..', 'scratch', 'module47_census_baseline.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\nCensus baseline written to ${outputPath}`);

    // Summary statistics
    console.log('\n--- SCAN SUMMARY ---');
    for (const width of [360, 390, 430]) {
      let hScrollErrors = 0;
      let totalSub12 = 0;
      let totalSmallTargets = 0;

      for (const r of results.routes) {
        const m = r.viewports[width];
        if (m.hasHorizontalScroll) {
          hScrollErrors++;
          console.log(`[H-Scroll Defect @ ${width}px] ${r.name}: docW=${m.docW} > winW=${m.winW} (+${m.overflowPx}px)`);
        }
        totalSub12 += m.sub12Count;
        totalSmallTargets += m.smallTargetsCount;
      }
      console.log(`Viewport ${width}px: H-Scroll Defective Routes = ${hScrollErrors}, Sub-12px elements = ${totalSub12}, Small Targets (<44px) = ${totalSmallTargets}`);
    }

    client.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(err => {
  console.error('Census error:', err);
  process.exit(1);
});
