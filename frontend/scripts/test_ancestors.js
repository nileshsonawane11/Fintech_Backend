import http from 'http';
import { spawn } from 'child_process';

const PORT = 5173;

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

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9233',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await wait(2000);
  const targets = await getJson('http://localhost:9233/json');
  const target = targets.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  function send(method, params={}) {
    return new Promise(r => {
      const cur = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === cur) { ws.removeEventListener('message', handler); r(m.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }
  await send('Page.enable');
  await send('Page.navigate', { url: `http://localhost:${PORT}/accounts/everyday-savings?apply=true` });
  await wait(1500);

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        let el = document.querySelector('[role="dialog"]');
        const chain = [];
        while (el) {
          const cs = window.getComputedStyle(el);
          if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' || cs.contain !== 'none' || cs.willChange !== 'auto') {
            chain.push({ tag: el.tagName, class: el.className, transform: cs.transform, filter: cs.filter, willChange: cs.willChange });
          }
          el = el.parentElement;
        }
        return {
          chain,
          scrollY: window.scrollY,
          dialogRect: document.querySelector('[role="dialog"]').getBoundingClientRect()
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Result:', JSON.stringify(res.result ? res.result.value : res, null, 2));
  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
