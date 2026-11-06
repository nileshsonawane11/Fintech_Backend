import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, '..', 'src', 'pages', 'manager', 'sections');

fs.readdirSync(dir).forEach(f => {
  const file = path.join(dir, f);
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('p-1.5') && (l.includes('close') || l.includes('Close') || l.includes('aria-label'))) {
      console.log(`${f}:${i + 1} -> ${l.trim()}`);
    }
  });
});
