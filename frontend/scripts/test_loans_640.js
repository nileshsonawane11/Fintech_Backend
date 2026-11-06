import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9234', '--disable-gpu', '--no-sandbox', 'about:blank']);
  await wait(2000);
  const res = await fetch('http://localhost:9234/json');
  const targets = await res.json();
  const target = targets.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) { ws.removeEventListener('message', handler); resolve(msg.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:5173/loans/home-loan?apply=true' });
  await wait(2000);
  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { found: false };
        const modalBox = dialog.querySelector('.bg-white.shadow-modal');
        const footer = dialog.querySelector('button[type="submit"]')?.closest('div');
        const submitBtn = dialog.querySelector('button[type="submit"]');

        const mRect = modalBox ? modalBox.getBoundingClientRect() : null;
        const fRect = footer ? footer.getBoundingClientRect() : null;
        const sRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        let anchor = 'centre';
        if (mRect) {
          if (vh - mRect.bottom <= 25) anchor = 'bottom';
          else if (mRect.top <= 25) anchor = 'top';
          else anchor = 'centre';
        }

        return {
          found: true,
          anchor,
          fullyOnScreen: mRect ? (mRect.top >= 0 && mRect.bottom <= vh && mRect.left >= 0 && mRect.right <= vw) : false,
          footerVisible: fRect ? (fRect.top < vh && fRect.bottom <= vh) : false,
          submitClickable: sRect ? (sRect.top < vh && sRect.bottom <= vh && sRect.top >= 0) : false,
          modalBottom: mRect?.bottom
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Result for Loans @ 640px:', evalRes.result.value);
  ws.close();
  chromeProc.kill();
}
run();
