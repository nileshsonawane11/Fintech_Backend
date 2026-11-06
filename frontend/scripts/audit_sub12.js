import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (/\.(jsx?|tsx?|css)$/.test(file)) results.push(full);
  });
  return results;
}

const files = walk(srcDir);
const sub12 = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const m = line.match(/text-\[(?:[0-9]|1[01])px\]/g);
    if (m) {
      const rel = path.relative(path.resolve(__dirname, '..'), f);
      sub12.push({ file: rel, line: idx + 1, matches: m, text: line.trim() });
    }
  });
});

console.log('Sub-12px occurrences count:', sub12.length);
sub12.forEach(s => console.log(`${s.file}:${s.line} [${s.matches.join(', ')}] -> ${s.text.slice(0, 100)}`));
