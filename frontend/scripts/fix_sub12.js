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
let totalReplaced = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  
  // Replace text-[10px] and text-[11px] with text-xs
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-xs');
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[8px\]/g, 'text-xs');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    const rel = path.relative(path.resolve(__dirname, '..'), f);
    console.log(`Updated sub-12px classes in: ${rel}`);
    totalReplaced++;
  }
});

console.log(`Finished updating sub-12px classes in ${totalReplaced} files.`);
