import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'pages', 'portal', 'sections', 'DashboardSection.jsx');

let code = fs.readFileSync(file, 'utf8');

// Update Pay again pills
code = code.replace(
  'className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-800 hover:border-midnight-500 hover:text-midnight-950 transition-colors shadow-xs"',
  'className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-800 hover:border-midnight-500 hover:text-midnight-950 transition-colors shadow-xs"'
);

// Update Txn filter buttons
code = code.replace(
  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
  'min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors'
);

fs.writeFileSync(file, code, 'utf8');
console.log('DashboardSection.jsx updated.');
