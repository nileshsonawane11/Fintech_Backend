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

async function getJsonWithRetry(url, maxRetries = 10, delay = 500) {
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
  console.log('========================================================');
  console.log('STARTING MODULE 48 BROWSER CDP VERIFICATION & SCREENSHOTS');
  console.log('========================================================');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9278',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJsonWithRetry('http://127.0.0.1:9278/json');
  const target = targets.find(t => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);

  const consoleLogs = [];
  client.onConsole = (type, text) => {
    if (text.includes('[vite]') || text.includes('WebSocket')) return;
    consoleLogs.push({ type, text });
  };

  await client.connect();
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to login page first to initialize mock db and storage
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/login` });
  await wait(1500);

  // Setup admin user & active session
  await client.evaluate(`
    (() => {
      const adminStaff = {
        staffId: 'STF-006',
        fullName: 'Ishita Rao',
        email: 'admin@finedge.bank',
        role: 'ADMIN',
        department: 'Platform Administration',
        status: 'ACTIVE',
        permissions: [
          'kyc.read', 'kyc.review', 'kyc.approve', 'kyc.reject',
          'accounts.read', 'accounts.review', 'accounts.approve', 'accounts.reject',
          'cards.read', 'cards.issue', 'cards.block', 'cards.unblock', 'cards.limit',
          'loans.read', 'loans.underwrite', 'loans.disburse', 'loans.reject',
          'investments.read', 'investments.book',
          'tickets.read', 'tickets.reply', 'tickets.status',
          'customers.read', 'customers.pan_reveal',
          'audit.read', 'reports.read',
          'users.read', 'users.create', 'users.update', 'users.deactivate', 'users.override',
          'roles.read', 'roles.create', 'roles.update', 'roles.delete',
          'products.read', 'products.create', 'products.update', 'products.delete'
        ],
        permissionOverrides: {}
      };

      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      db.staffUsers = db.staffUsers || [];
      const existingIdx = db.staffUsers.findIndex(s => s.staffId === 'STF-006');
      if (existingIdx >= 0) db.staffUsers[existingIdx] = adminStaff;
      else db.staffUsers.push(adminStaff);

      const sessionId = 'SESSION-ADMIN-TEST-' + Date.now();
      const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      db.sessions = db.sessions || [];
      db.sessions.push({
        sessionId,
        type: 'STAFF',
        staffId: 'STF-006',
        email: 'admin@finedge.bank',
        role: 'ADMIN',
        issuedAt: new Date().toISOString(),
        expiresAt
      });

      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
      localStorage.setItem('finedge_manager_token', 'Bearer ' + sessionId);
      localStorage.setItem('finedge_manager_user', JSON.stringify(adminStaff));
    })()
  `);

  // -------------------------------------------------------------------------
  // SCENARIO 1: ADMIN LOGIN & DASHBOARD REACH
  // -------------------------------------------------------------------------
  console.log('\n--- Part 1: Admin Login & Dashboard Navigation ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/dashboard` });
  await wait(1800);

  const navText = await client.evaluate(`
    Array.from(document.querySelectorAll('nav a, nav button')).map(el => el.textContent.trim())
  `);
  console.log('Admin sidebar navigation items count:', navText.length);
  const hasUserMgmt = navText.some(t => t.includes('User Management'));
  const hasRolesPerms = navText.some(t => t.includes('Roles & Permissions'));
  const hasProductCat = navText.some(t => t.includes('Product Catalogue'));
  const hasStaffRoles = navText.some(t => t === 'Staff & Roles');

  console.log('Admin sees User Management:', hasUserMgmt);
  console.log('Admin sees Roles & Permissions:', hasRolesPerms);
  console.log('Admin sees Product Catalogue:', hasProductCat);
  console.log('Staff & Roles hidden for Admin:', !hasStaffRoles);

  await client.captureScreenshot('m48-admin-dashboard.png');

  // -------------------------------------------------------------------------
  // SCENARIO 2: USER MANAGEMENT SECTION & USER DRAWER
  // -------------------------------------------------------------------------
  console.log('\n--- Part 2: User Management Section & Effective Permissions Drawer ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/user-management` });
  await wait(1800);

  // Click on first row in directory table to open user drawer
  await client.evaluate(`
    (() => {
      const rows = document.querySelectorAll('table tbody tr');
      if (rows.length > 0) rows[0].click();
    })()
  `);
  await wait(1200);

  const drawerHeader = await client.evaluate(`
    document.querySelector('aside h2, aside h3, [role="dialog"] h2, [role="dialog"] h3')?.textContent || ''
  `);
  console.log('Opened User Drawer header:', drawerHeader);
  await client.captureScreenshot('m48-user-management-drawer.png');

  // -------------------------------------------------------------------------
  // SCENARIO 3: ROLES & PERMISSIONS SECTION
  // -------------------------------------------------------------------------
  console.log('\n--- Part 3: Roles & Permissions Matrix ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/roles-permissions` });
  await wait(1800);

  const roleListHeader = await client.evaluate(`
    document.querySelector('main h1, main h2')?.textContent || ''
  `);
  console.log('Roles page header:', roleListHeader);
  await client.captureScreenshot('m48-roles-permissions.png');

  // -------------------------------------------------------------------------
  // SCENARIO 4: PRODUCT CATALOGUE SECTION
  // -------------------------------------------------------------------------
  console.log('\n--- Part 4: Product Catalogue Table & Actions ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/product-catalogue` });
  await wait(1800);

  const productRowsCount = await client.evaluate(`
    document.querySelectorAll('table tbody tr').length
  `);
  console.log('Product rows rendered:', productRowsCount);
  await client.captureScreenshot('m48-product-catalogue.png');

  // -------------------------------------------------------------------------
  // SCENARIO 5: AUDIT TRAIL PREVIOUS -> NEW VALUES
  // -------------------------------------------------------------------------
  console.log('\n--- Part 5: Audit Trail Previous vs New Values Rendering ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/audit` });
  await wait(1800);

  // Expand first expandable audit row
  await client.evaluate(`
    (() => {
      const expandBtn = document.querySelector('table tbody tr button');
      if (expandBtn) expandBtn.click();
    })()
  `);
  await wait(800);
  await client.captureScreenshot('m48-audit-prev-new.png');

  // -------------------------------------------------------------------------
  // SCENARIO 6: MANAGER OUT-OF-ROLE ACCESS DENIED
  // -------------------------------------------------------------------------
  console.log('\n--- Part 6: Manager Access Denied on Administration ---');
  await client.evaluate(`
    (() => {
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      const mgrStaff = (db.staffUsers || []).find(s => s.role === 'BANK_MANAGER') || {
        staffId: 'STF-001',
        fullName: 'Devendra Singhania',
        email: 'manager@finedge.bank',
        role: 'BANK_MANAGER',
        department: 'Branch Leadership',
        status: 'ACTIVE'
      };

      const sessionId = 'SESSION-MGR-TEST-' + Date.now();
      const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      db.sessions = db.sessions || [];
      db.sessions.push({
        sessionId,
        type: 'STAFF',
        staffId: mgrStaff.staffId,
        email: mgrStaff.email,
        role: 'BANK_MANAGER',
        issuedAt: new Date().toISOString(),
        expiresAt
      });
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
      localStorage.setItem('finedge_manager_token', 'Bearer ' + sessionId);
      localStorage.setItem('finedge_manager_user', JSON.stringify(mgrStaff));
    })()
  `);

  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/user-management` });
  await wait(1800);

  const deniedTitle = await client.evaluate(`
    document.querySelector('h1, h2, h3')?.textContent || ''
  `);
  console.log('Manager direct navigation header:', deniedTitle);
  await client.captureScreenshot('m48-manager-denied.png');

  // -------------------------------------------------------------------------
  // CONSOLE AUDIT SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n--- Console Health ---');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`Console Errors: ${errors.length}`);
  console.log(`Console Warnings: ${warnings.length}`);
  if (errors.length > 0) console.log('Errors:', errors);
  if (warnings.length > 0) console.log('Warnings:', warnings);

  client.close();
  chromeProc.kill();
  console.log('\n========================================================');
  console.log('MODULE 48 BROWSER VERIFICATION COMPLETE');
  console.log('========================================================');
}

run().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
