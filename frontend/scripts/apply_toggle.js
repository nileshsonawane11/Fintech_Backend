import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'pages', 'portal', 'sections', 'CardsSection.jsx');

let code = fs.readFileSync(file, 'utf8');

const oldToggle = `function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={\`relative h-6 w-11 shrink-0 rounded-full transition-colors \${
        checked ? 'bg-midnight-700' : 'bg-ink-200'
      } \${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}\`}
    >
      <span
        className={\`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all \${
          checked ? 'left-[22px]' : 'left-0.5'
        }\`}
        aria-hidden
      />
    </button>
  );
}`;

const newToggle = `function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={\`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full focus-visible:outline-2 focus-visible:outline-gold-500 \${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }\`}
    >
      <span
        className={\`relative h-6 w-11 shrink-0 rounded-full transition-colors block \${
          checked ? 'bg-midnight-700' : 'bg-ink-200'
        }\`}
      >
        <span
          className={\`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all block \${
            checked ? 'left-[22px]' : 'left-0.5'
          }\`}
          aria-hidden
        />
      </span>
    </button>
  );
}`;

code = code.replace(oldToggle.replace(/\r\n/g, '\n'), newToggle.replace(/\r\n/g, '\n'));
code = code.replace(oldToggle.replace(/\n/g, '\r\n'), newToggle.replace(/\n/g, '\r\n'));

fs.writeFileSync(file, code, 'utf8');
console.log('CardsSection.jsx toggle updated.');
