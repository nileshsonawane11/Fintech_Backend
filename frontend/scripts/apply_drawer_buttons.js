import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, '..', 'src', 'pages', 'manager', 'sections');

fs.readdirSync(dir).forEach(f => {
  const file = path.join(dir, f);
  let code = fs.readFileSync(file, 'utf8');
  const original = code;

  code = code.replaceAll(
    'className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800"',
    'className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors"'
  );

  // Also in drawer footer: ensure safe area padding
  code = code.replaceAll(
    'sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-ink-100 bg-porcelain-50 px-5 py-4',
    'sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-ink-100 bg-porcelain-50 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'
  );

  if (code !== original) {
    fs.writeFileSync(file, code, 'utf8');
    console.log(`Updated drawer close & safe-area in: ${f}`);
  }
});
