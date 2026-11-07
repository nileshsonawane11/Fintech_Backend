import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('STARTING MODULE 49 BROWSER CDP SCREENSHOTS & VERIFICATION');
  console.log('========================================================');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9285',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJsonWithRetry('http://127.0.0.1:9285/json');
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
          'products.read', 'products.create', 'products.update', 'products.delete',
          'content.read', 'content.update',
          'settings.read', 'settings.update'
        ],
        permissionOverrides: {}
      };

      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      db.staffUsers = db.staffUsers || [];
      const existingIdx = db.staffUsers.findIndex(s => s.staffId === 'STF-006');
      if (existingIdx >= 0) db.staffUsers[existingIdx] = adminStaff;
      else db.staffUsers.push(adminStaff);

      const sessionId = 'SESSION-ADMIN-M49-' + Date.now();
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

  console.log('\n--- 1. Capture Admin Site Content Section ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/site-content` });
  await wait(2500);
  const siteContentTitle = await client.evaluate(`document.querySelector('h1, h2')?.textContent || ''`);
  console.log('Site Content title:', siteContentTitle);
  await client.captureScreenshot('m49-admin-site-content.png');

  console.log('\n--- 2. Capture Admin Platform Settings Section ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/platform-settings` });
  await wait(2500);
  const settingsTitle = await client.evaluate(`document.querySelector('h1, h2')?.textContent || ''`);
  console.log('Platform Settings title:', settingsTitle);
  await client.captureScreenshot('m49-admin-platform-settings.png');

  console.log('\n--- 3. Capture Public Homepage (Live Content) ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await wait(2500);
  const heroHeading = await client.evaluate(`document.querySelector('h1')?.textContent || ''`);
  console.log('Homepage hero heading:', heroHeading);
  await client.captureScreenshot('m49-homepage-edited.png');

  console.log('\n--- 4. Capture Manager Access Denied on Platform Settings ---');
  // Switch session to Branch Manager
  await client.evaluate(`
    (() => {
      const db = JSON.parse(localStorage.getItem('finedge_persistent_db') || '{}');
      const mgrStaff = (db.staffUsers || []).find(s => s.role === 'BRANCH_MANAGER') || {
        staffId: 'STF-001',
        fullName: 'Vikramaditya Sharma',
        email: 'vikram.manager@finedge.bank',
        role: 'BRANCH_MANAGER',
        department: 'Retail Banking Operations',
        status: 'ACTIVE'
      };

      const sessionId = 'SESSION-BM-M49-' + Date.now();
      const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      db.sessions = db.sessions || [];
      db.sessions.push({
        sessionId,
        type: 'STAFF',
        staffId: mgrStaff.staffId,
        email: mgrStaff.email,
        role: 'BRANCH_MANAGER',
        issuedAt: new Date().toISOString(),
        expiresAt
      });
      localStorage.setItem('finedge_persistent_db', JSON.stringify(db));
      localStorage.setItem('finedge_manager_token', 'Bearer ' + sessionId);
      localStorage.setItem('finedge_manager_user', JSON.stringify(mgrStaff));
    })()
  `);
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/platform-settings` });
  await wait(2000);
  const deniedText = await client.evaluate(`document.querySelector('h1, h2, h3')?.textContent || ''`);
  console.log('Manager direct navigation header:', deniedText);
  await client.captureScreenshot('m49-manager-denied-settings.png');

  console.log('\n--- Console Health ---');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`Console Errors: ${errors.length}`);
  console.log(`Console Warnings: ${warnings.length}`);
  if (errors.length > 0) console.log('Errors:', errors);
  if (warnings.length > 0) console.log('Warnings:', warnings);

  client.close();
  chromeProc.kill();
  if (fs.existsSync('scripts/test_home.js')) {
    fs.unlinkSync('scripts/test_home.js');
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error during CDP screenshots:', err);
  process.exit(1);
});
