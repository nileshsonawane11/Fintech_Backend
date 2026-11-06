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
    '--remote-debugging-port=9231',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJson('http://localhost:9231/json');
  const target = targets.find(t => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('DOM.enable');

  const results = [];

  for (const b of branches) {
    for (const w of widths) {
      const h = 900;
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: w < 640
      });

      await client.send('Page.navigate', { url: b.url });
      await wait(1200);

      const metrics = await client.evaluate(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return { found: false };
          const modalBox = dialog.querySelector('.bg-white.shadow-modal') || dialog.querySelector('.relative.w-full') || dialog.children[0];
          const footer = dialog.querySelector('button[type="submit"]')?.closest('div') || dialog.querySelector('.border-t');
          const submitBtn = dialog.querySelector('button[type="submit"]');

          const dRect = dialog.getBoundingClientRect();
          const mRect = modalBox ? modalBox.getBoundingClientRect() : null;
          const fRect = footer ? footer.getBoundingClientRect() : null;
          const sRect = submitBtn ? submitBtn.getBoundingClientRect() : null;

          const vh = window.innerHeight;
          const vw = window.innerWidth;

          // Anchor classification
          let anchor = 'centre';
          if (mRect) {
            if (vh - mRect.bottom <= 25) anchor = 'bottom';
            else if (mRect.top <= 25) anchor = 'top';
            else anchor = 'centre';
          }

          const fullyOnScreen = mRect ? (mRect.top >= 0 && mRect.bottom <= vh && mRect.left >= 0 && mRect.right <= vw) : false;
          const footerVisible = fRect ? (fRect.top < vh && fRect.bottom <= vh) : false;
          const submitClickable = sRect ? (sRect.top < vh && sRect.bottom <= vh && sRect.top >= 0) : false;

          return {
            found: true,
            anchor,
            modalRect: mRect ? { top: Math.round(mRect.top), bottom: Math.round(mRect.bottom), width: Math.round(mRect.width), height: Math.round(mRect.height) } : null,
            footerRect: fRect ? { top: Math.round(fRect.top), bottom: Math.round(fRect.bottom) } : null,
            submitRect: sRect ? { top: Math.round(sRect.top), bottom: Math.round(sRect.bottom) } : null,
            fullyOnScreen,
            footerVisible,
            submitClickable,
            viewport: { width: vw, height: vh }
          };
        })()
      `);

      results.push({
        branch: b.name,
        width: w,
        anchor: metrics?.anchor || 'N/A',
        fullyOnScreen: metrics?.fullyOnScreen ? 'Y' : 'N',
        footerVisible: metrics?.footerVisible ? 'Y' : 'N',
        submitClickable: metrics?.submitClickable ? 'Y' : 'N',
        modalHeight: metrics?.modalRect?.height,
        modalWidth: metrics?.modalRect?.width,
        modalTop: metrics?.modalRect?.top,
        modalBottom: metrics?.modalRect?.bottom,
        submitTop: metrics?.submitRect?.top,
        submitBottom: metrics?.submitRect?.bottom
      });
      console.log(`${b.name} @ ${w}px -> Anchor: ${metrics?.anchor}, FullyOnScreen: ${metrics?.fullyOnScreen ? 'Y' : 'N'}, FooterVisible: ${metrics?.footerVisible ? 'Y' : 'N'}, SubmitClickable: ${metrics?.submitClickable ? 'Y' : 'N'}`);
    }
  }

  fs.writeFileSync('C:/Users/omkar/.gemini/antigravity/scratch/fintech-backend/frontend/scratch/phase0_reproduction_results.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nSaved Phase 0 results to phase0_reproduction_results.json');
  console.table(results.map(r => ({
    branch: r.branch,
    width: r.width,
    anchor: r.anchor,
    fullyOnScreen: r.fullyOnScreen,
    footerVisible: r.footerVisible,
    submitClickable: r.submitClickable,
    modalH: r.modalHeight,
    bottom: r.modalBottom
  })));

  client.close();
  chromeProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
