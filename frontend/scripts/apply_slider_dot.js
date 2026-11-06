import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'src', 'components', 'common', 'PhotoSlider.jsx');

let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /className="cursor-pointer min-h-\[44px\] min-w-\[28px\] inline-flex items-center justify-center p-1\.5 focus-visible:outline-2 focus-visible:outline-gold-500 rounded-full"[\s\S]*?\/>/,
  `className="cursor-pointer min-h-[44px] min-w-[28px] inline-flex items-center justify-center p-1.5 focus-visible:outline-2 focus-visible:outline-gold-500 rounded-full"
              >
                <span
                  className={\`block rounded-full transition-all duration-180 \${
                    isActive
                      ? 'h-2 w-6 bg-gold-500'
                      : 'h-2 w-2 bg-ink-300 hover:bg-ink-400'
                  }\`}
                />
              </button>`
);

fs.writeFileSync(file, code, 'utf8');
console.log('PhotoSlider dot button updated successfully.');
