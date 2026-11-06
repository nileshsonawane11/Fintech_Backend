import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update CardsPage.jsx
const cardsFile = path.resolve(__dirname, '..', 'src', 'pages', 'CardsPage.jsx');
let cardsCode = fs.readFileSync(cardsFile, 'utf8');

cardsCode = cardsCode.replaceAll(
  '<th className="px-5 py-3.5">Card</th>',
  '<th className="px-5 py-3.5 sticky left-0 bg-porcelain-100 z-10 shadow-[1px_0_0_0_#e2e8f0]">Card</th>'
);

cardsCode = cardsCode.replaceAll(
  '<td className="px-5 py-4 font-semibold text-midnight-950 whitespace-nowrap">',
  '<td className="px-5 py-4 font-semibold text-midnight-950 whitespace-nowrap sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">'
);

fs.writeFileSync(cardsFile, cardsCode, 'utf8');
console.log('CardsPage.jsx updated with sticky column.');

// Update AccountsPage.jsx
const accFile = path.resolve(__dirname, '..', 'src', 'pages', 'AccountsPage.jsx');
let accCode = fs.readFileSync(accFile, 'utf8');

accCode = accCode.replace(
  "{ key: 'label', label: 'Feature / Tariff' },",
  "{ key: 'label', label: 'Feature / Tariff', className: 'sticky left-0 bg-white sm:bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]' },"
);

fs.writeFileSync(accFile, accCode, 'utf8');
console.log('AccountsPage.jsx updated with sticky column.');
