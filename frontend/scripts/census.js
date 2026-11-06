import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const baseDir = 'C:/Users/omkar/.gemini/antigravity/scratch/fintech-backend/frontend/src';
const files = walk(baseDir);
const matches = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('<Modal') || l.includes('ApplyModal') || l.includes('<aside') || l.includes('role="dialog"') || l.includes('aria-modal')) {
      matches.push({
        file: path.relative(baseDir, f).replace(/\\/g, '/'),
        line: idx + 1,
        text: l.trim().slice(0, 100)
      });
    }
  });
});

console.log(JSON.stringify(matches, null, 2));
