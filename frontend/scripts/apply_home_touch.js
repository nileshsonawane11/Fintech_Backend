import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'pages', 'HomePage.jsx');

let code = fs.readFileSync(file, 'utf8');

// Directory tabs
code = code.replace(
  'className={`relative pb-3 pt-2 px-4 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 ${',
  'className={`relative min-h-[44px] pb-3 pt-2 px-4 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 ${'
);

// Rates expander button
code = code.replace(
  'className="inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-1 px-3 rounded-md hover:bg-porcelain-200"',
  'className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-2 px-4 rounded-lg hover:bg-porcelain-200 shadow-xs"'
);

// Offers expander button
code = code.replace(
  'className="inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-1 px-3 rounded-md hover:bg-porcelain-100"',
  'className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-2 px-4 rounded-lg hover:bg-porcelain-100 shadow-xs"'
);

fs.writeFileSync(file, code, 'utf8');
console.log('HomePage.jsx updated for mobile touch targets.');
