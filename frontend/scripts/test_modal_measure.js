import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 5173;
const widths = [1920, 1440, 1024, 768, 640, 480, 390];
const branches = [
  { name: 'Accounts', url: `http://localhost:${PORT}/accounts/everyday-savings?apply=true` },
  { name: 'Cards', url: `http://localhost:${PORT}/cards/edge-cashback-credit?apply=true` },
  { name: 'Loans', url: `http://localhost:${PORT}/loans/home-loan?apply=true` },
  { name: 'Investments', url: `http://localhost:${PORT}/investments/fixed-deposit?apply=true` }
];

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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJson('http://localhost:9230/json');
  const target = targets.find(t => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('DOM.enable');

  // Test single branch at 1440 first
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await client.send('Page.navigate', { url: `http://localhost:${PORT}/accounts/everyday-savings?apply=true` });
  await wait(1500);

  const check1440 = await client.evaluate(`
    (() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const modalBox = dialog.querySelector('.bg-white.shadow-modal') || dialog.querySelector('.relative.w-full');
      const footer = dialog.querySelector('button[type="submit"]')?.closest('div') || dialog.querySelector('.border-t');
      const submitBtn = dialog.querySelector('button[type="submit"]');

      const dRect = dialog.getBoundingClientRect();
      const mRect = modalBox ? modalBox.getBoundingClientRect() : null;
      const fRect = footer ? footer.getBoundingClientRect() : null;
      const sRect = submitBtn ? submitBtn.getBoundingClientRect() : null;

      return {
        found: true,
        dialogRect: { top: dRect.top, height: dRect.height, width: dRect.width },
        modalRect: mRect ? { top: Math.round(mRect.top), bottom: Math.round(mRect.bottom), width: Math.round(mRect.width), height: Math.round(mRect.height) } : null,
        footerRect: fRect ? { top: Math.round(fRect.top), bottom: Math.round(fRect.bottom), height: Math.round(fRect.height) } : null,
        submitRect: sRect ? { top: Math.round(sRect.top), bottom: Math.round(sRect.bottom) } : null
      };
    })()
  `);
  console.log('Test Check Accounts @ 1440:', JSON.stringify(check1440, null, 2));

  // Test at 390
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await wait(500);

  const check390 = await client.evaluate(`
    (() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const modalBox = dialog.querySelector('.bg-white.shadow-modal') || dialog.querySelector('.relative.w-full');
      const footer = dialog.querySelector('button[type="submit"]')?.closest('div') || dialog.querySelector('.border-t');
      const submitBtn = dialog.querySelector('button[type="submit"]');

      const dRect = dialog.getBoundingClientRect();
      const mRect = modalBox ? modalBox.getBoundingClientRect() : null;
      const fRect = footer ? footer.getBoundingClientRect() : null;
      const sRect = submitBtn ? submitBtn.getBoundingClientRect() : null;

      return {
        found: true,
        dialogRect: { top: dRect.top, height: dRect.height, width: dRect.width },
        modalRect: mRect ? { top: Math.round(mRect.top), bottom: Math.round(mRect.bottom), width: Math.round(mRect.width), height: Math.round(mRect.height) } : null,
        footerRect: fRect ? { top: Math.round(fRect.top), bottom: Math.round(fRect.bottom), height: Math.round(fRect.height) } : null,
        submitRect: sRect ? { top: Math.round(sRect.top), bottom: Math.round(sRect.bottom) } : null,
        bottomPinned: mRect ? (844 - mRect.bottom <= 2) : false
      };
    })()
  `);
  console.log('Test Check Accounts @ 390:', JSON.stringify(check390, null, 2));

  client.close();
  chromeProc.kill();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
