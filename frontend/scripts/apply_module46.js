import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. ManagerDashboardSection.jsx
const dashPath = path.join(rootDir, 'src/pages/manager/sections/ManagerDashboardSection.jsx');
let dashContent = fs.readFileSync(dashPath, 'utf8');

const oldQueueCell = `function QueueCell({ icon: Icon, label, queue, to, onOpen }) {
  const note = slaNote(queue?.oldestAt);
  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className="bg-white px-5 py-4 text-left transition-colors hover:bg-midnight-50/60"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-600">
          <Icon className="h-4 w-4 text-midnight-700" aria-hidden /> {label}
        </span>
        <ArrowRight className="h-4 w-4 text-ink-300" aria-hidden />
      </span>
      <span className="tnum mt-3 block text-3xl font-semibold text-midnight-950">{queue?.count ?? '—'}</span>
      <span className="mt-1 block text-[13px] text-ink-500">
        Oldest: {queue?.oldestAt ? ageOf(queue.oldestAt) : '—'}
      </span>
      {note && (
        <span className={\`mt-1 block text-xs font-medium \${ageHours(queue?.oldestAt) > 72 ? 'text-danger-600' : 'text-warning-600'}\`}>
          {note}
        </span>
      )}
    </button>
  );
}`;

const newQueueCell = `function QueueCell({ icon: Icon, label, queue, to, onOpen, canAccess }) {
  const note = slaNote(queue?.oldestAt);

  if (!canAccess) {
    return (
      <div className="bg-white px-5 py-4 text-left cursor-default">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink-500">
            <Icon className="h-4 w-4 text-ink-400" aria-hidden /> {label}
          </span>
        </span>
        <span className="tnum mt-3 block text-3xl font-semibold text-midnight-950">{queue?.count ?? '—'}</span>
        <span className="mt-1 block text-[13px] text-ink-500">
          Oldest: {queue?.oldestAt ? ageOf(queue.oldestAt) : '—'}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className="bg-white px-5 py-4 text-left transition-colors hover:bg-midnight-50/60"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-600">
          <Icon className="h-4 w-4 text-midnight-700" aria-hidden /> {label}
        </span>
        <ArrowRight className="h-4 w-4 text-ink-300" aria-hidden />
      </span>
      <span className="tnum mt-3 block text-3xl font-semibold text-midnight-950">{queue?.count ?? '—'}</span>
      <span className="mt-1 block text-[13px] text-ink-500">
        Oldest: {queue?.oldestAt ? ageOf(queue.oldestAt) : '—'}
      </span>
      {note && (
        <span className={\`mt-1 block text-xs font-medium \${ageHours(queue?.oldestAt) > 72 ? 'text-danger-600' : 'text-warning-600'}\`}>
          {note}
        </span>
      )}
    </button>
  );
}`;

// Normalize line endings for replacement
const normDash = dashContent.replace(/\r\n/g, '\n');
const normOld = oldQueueCell.replace(/\r\n/g, '\n');
const normNew = newQueueCell.replace(/\r\n/g, '\n');

if (normDash.includes(normOld)) {
  dashContent = normDash.replace(normOld, normNew);
  fs.writeFileSync(dashPath, dashContent, 'utf8');
  console.log('Successfully updated ManagerDashboardSection.jsx');
} else {
  console.error('Target oldQueueCell not found in ManagerDashboardSection.jsx');
  process.exit(1);
}

// 2. ManagerCustomersSection.jsx
const custPath = path.join(rootDir, 'src/pages/manager/sections/ManagerCustomersSection.jsx');
let custContent = fs.readFileSync(custPath, 'utf8');
custContent = custContent.replace(/\r\n/g, '\n');

// Import revealCustomerPan
const oldImport = "import { getCustomerDetail, listCustomers } from '../../../services/managerBridge.js';";
const newImport = "import { getCustomerDetail, listCustomers, revealCustomerPan } from '../../../services/managerBridge.js';";

if (custContent.includes(oldImport)) {
  custContent = custContent.replace(oldImport, newImport);
  console.log('Successfully added revealCustomerPan import in ManagerCustomersSection.jsx');
} else {
  console.error('Target oldImport not found in ManagerCustomersSection.jsx');
  process.exit(1);
}

// Fix drawer footer close button onClick
const oldCloseBtn = '<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>';
const newCloseBtn = '<Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>';

if (custContent.includes(oldCloseBtn)) {
  custContent = custContent.replace(oldCloseBtn, newCloseBtn);
  console.log('Successfully fixed drawer footer Close button in ManagerCustomersSection.jsx');
} else {
  console.error('Target oldCloseBtn not found in ManagerCustomersSection.jsx');
  process.exit(1);
}

fs.writeFileSync(custPath, custContent, 'utf8');
console.log('Module 46 modifications successfully written.');
