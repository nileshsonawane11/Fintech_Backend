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
          const text = msg.params.args.map(a => a.value || a.description || (a.preview ? JSON.stringify(a.preview) : '')).join(' ');
          if (this.onConsole) this.onConsole(type, text, msg.params.args);
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
  console.log('STARTING MODULE 50 BROWSER CDP SCREENSHOTS & TRACING');
  console.log('========================================================');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9287',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJsonWithRetry('http://127.0.0.1:9287/json');
  const target = targets.find(t => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);

  const tracesRecorded = [];
  client.onConsole = (type, text, args) => {
    if (text.includes('[vite]') || text.includes('WebSocket')) return;
    tracesRecorded.push({ type, text, args });
    console.log(`[Browser Console ${type.toUpperCase()}]: ${text}`);
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

  // 1. Clean boot check on homepage
  console.log('\n--- 1. Capture Clean Boot Public Homepage ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await wait(2000);

  const storageCheck = await client.evaluate(`
    (() => ({
      hasDb: localStorage.getItem('finedge_persistent_db'),
      tokens: localStorage.getItem('finedge_access_token'),
      title: document.querySelector('h1')?.textContent || ''
    }))()
  `);
  console.log('Storage on clean boot:', storageCheck);
  await client.captureScreenshot('m50-homepage.png');

  // 2. Customer Portal Login (Clean Form, No Demo Panels)
  console.log('\n--- 2. Capture Customer Login (No Demo Data / Reset Buttons) ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/portal/login` });
  await wait(2000);

  const portalLoginElements = await client.evaluate(`
    (() => ({
      heading: document.querySelector('h1, h2')?.textContent || '',
      hasDemoPanel: Boolean(document.querySelector('.demo-accounts, [data-demo-accounts]')),
      hasResetBtn: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Reset demo data')),
      buttonCount: document.querySelectorAll('button').length
    }))()
  `);
  console.log('Customer Login page audit:', portalLoginElements);
  await client.captureScreenshot('m50-customer-login.png');

  // 3. Staff Operations Login (Clean Form, No Demo Panels)
  console.log('\n--- 3. Capture Staff Login (No Demo Staff Panel / Reset Buttons) ---');
  await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manager/login` });
  await wait(2000);

  const managerLoginElements = await client.evaluate(`
    (() => ({
      heading: document.querySelector('h1, h2')?.textContent || '',
      hasDemoStaff: Boolean(document.querySelector('.staff-accounts, [data-staff-accounts]')),
      hasResetBtn: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Reset demo data')),
      inputs: document.querySelectorAll('input').length
    }))()
  `);
  console.log('Staff Login page audit:', managerLoginElements);
  await client.captureScreenshot('m50-staff-login.png');

  // 4. Test Cross-Login Bug Refusal (Customer credentials on /manager/login)
  console.log('\n--- 4. Test Customer Credentials on Staff Login (Cross-Login Refusal) ---');
  await client.evaluate(`
    (() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      if (emailInput) {
        nativeSetter.call(emailInput, 'customer@example.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (passInput) {
        nativeSetter.call(passInput, 'Password123!');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, 200);
    })()
  `);
  await wait(3000);

  const crossLoginResult = await client.evaluate(`
    (() => ({
      errorText: document.querySelector('[role="alert"], .text-danger-600, .bg-danger-50, .border-danger-600')?.textContent || '',
      managerToken: localStorage.getItem('finedge_manager_token'),
      managerUser: localStorage.getItem('finedge_manager_user')
    }))()
  `);
  console.log('Cross-login submission outcome:', crossLoginResult);
  await client.captureScreenshot('m50-cross-login-refused.png');

  // 5. Check Console Trace Logging
  console.log('\n--- 5. Traces Recorded in Live Browser ---');
  const structuredTraces = tracesRecorded.filter(t => 
    t.text.includes('[FORM]') || 
    t.text.includes('[API →]') || 
    t.text.includes('[API ←]') || 
    t.text.includes('[API ✗]') || 
    t.text.includes('[DATA]')
  );
  console.log(`Captured ${structuredTraces.length} structured traces.`);
  structuredTraces.forEach(t => console.log('  ' + t.text));

  const errors = tracesRecorded.filter(t => t.type === 'error');
  const warnings = tracesRecorded.filter(t => t.type === 'warning');
  console.log(`Console check: ${errors.length} errors, ${warnings.length} warnings.`);

  client.close();
  chromeProc.kill();
  console.log('\nFinished Module 50 browser verification.');
}

run().catch(err => {
  console.error('Browser run failed:', err);
  process.exit(1);
});
