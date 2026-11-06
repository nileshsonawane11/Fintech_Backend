import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'pages', 'ProductDetailPage.jsx');

let code = fs.readFileSync(file, 'utf8');

// Replace sticky top-24 with static lg:sticky lg:top-24
code = code.replaceAll(
  '<div className="sticky top-24 space-y-5">',
  '<div className="static lg:sticky lg:top-24 space-y-5">'
);

// Tab buttons minimum height
code = code.replaceAll(
  'className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-gold-500 ${',
  'className={`min-h-[44px] inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-gold-500 ${'
);

fs.writeFileSync(file, code, 'utf8');
console.log('ProductDetailPage.jsx updated for mobile parity.');
