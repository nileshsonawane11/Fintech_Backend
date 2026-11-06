import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'components', 'layout', 'Header.jsx');

let code = fs.readFileSync(file, 'utf8');

// Update mobile hamburger button to >= 44x44px
code = code.replace(
  'className="rounded-lg p-2 text-ink-700 transition-colors hover:text-midnight-900 lg:hidden"',
  'className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 text-ink-700 transition-colors hover:text-midnight-900 lg:hidden"'
);

// Update Staff Console secondary button in mobile drawer
code = code.replace(
  'className="flex w-full items-center justify-center rounded-lg py-2 px-3 text-sm font-medium text-midnight-800 hover:bg-midnight-50/70 transition-colors"',
  'className="flex min-h-[44px] w-full items-center justify-center rounded-lg py-2.5 px-3 text-sm font-semibold text-midnight-800 hover:bg-midnight-50/70 transition-colors"'
);

// Update footer links in accordions
code = code.replaceAll(
  'className="text-ink-700 hover:text-midnight-900"',
  'className="min-h-[44px] inline-flex items-center text-ink-700 hover:text-midnight-900 font-semibold"'
);
code = code.replaceAll(
  'className="text-midnight-900 hover:text-midnight-700"',
  'className="min-h-[44px] inline-flex items-center text-midnight-900 hover:text-midnight-700 font-semibold"'
);

fs.writeFileSync(file, code, 'utf8');
console.log('Header.jsx touch targets updated.');
