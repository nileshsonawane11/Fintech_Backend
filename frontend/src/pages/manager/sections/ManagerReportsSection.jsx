import React, { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageLoading, SectionHeader, Table } from '../../../components/ui.jsx';
import { ageOf, formatINR } from '../../../lib/format.js';
import { reportsSummary } from '../../../services/managerBridge.js';
import { useDbTick } from '../../../context/AuthContext.jsx';

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const QUEUES = [
  { key: 'kycPending', label: 'KYC verification' },
  { key: 'accountAppsPending', label: 'Account applications' },
  { key: 'loanAppsPending', label: 'Loan applications' },
  { key: 'cardAppsPending', label: 'Card applications' },
  { key: 'ticketsOpen', label: 'Support tickets (open)' },
];

/** SLA colour from the age of the oldest item in a queue. */
function slaTone(oldestAt) {
  if (!oldestAt) return 'success';
  const hours = (Date.now() - new Date(oldestAt).getTime()) / 3600000;
  if (Number.isNaN(hours)) return 'neutral';
  if (hours >= 72) return 'danger';
  if (hours >= 24) return 'warning';
  return 'success';
}

function slaLabel(oldestAt) {
  const tone = slaTone(oldestAt);
  if (tone === 'danger') return 'Breaching';
  if (tone === 'warning') return 'At risk';
  if (tone === 'success') return 'Within SLA';
  return '—';
}

export default function ManagerReportsPage() {
  useDbTick();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    reportsSummary()
      .then((s) => { if (alive) { setSummary(s); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || 'Could not load reports.'); });
    return () => { alive = false; };
  }, []);

  function summaryCsv(s) {
    const rows = [
      ['Metric', 'Value'],
      ['Customers', s.customers],
      ['Accounts', s.accounts],
      ['Total deposits (INR)', s.totalDeposits],
      ['Active loans', s.activeLoans],
      ['Loan book (INR)', s.loanBook],
      ['Cards issued', s.cardsIssued],
      ['Investments', s.investments],
      ['', ''],
      ['Queue', 'Pending', 'Oldest item at'],
      ...QUEUES.map(({ key, label }) => [label, s.queues?.[key]?.count ?? 0, s.queues?.[key]?.oldestAt || '']),
    ];
    return rows.map((r) => r.map(esc).join(',')).join('\n');
  }

  const queueRows = summary ? QUEUES.map(({ key, label }) => ({
    key,
    label,
    count: summary.queues?.[key]?.count ?? 0,
    oldestAt: summary.queues?.[key]?.oldestAt || null,
  })) : [];

  const cards = summary ? [
    { label: 'Customers', value: String(summary.customers ?? '—'), sub: 'Registered customer records' },
    { label: 'Accounts', value: String(summary.accounts ?? '—'), sub: 'Open deposit accounts' },
    { label: 'Total deposits', value: formatINR(summary.totalDeposits), sub: 'Across all accounts', money: true },
    { label: 'Active loans', value: String(summary.activeLoans ?? '—'), sub: `Loan book ${formatINR(summary.loanBook)}`, money: true },
    { label: 'Cards issued', value: String(summary.cardsIssued ?? '—'), sub: 'Credit and debit cards live' },
    { label: 'Investments', value: String(summary.investments ?? '—'), sub: 'FD, RD, SIP and SSY holdings' },
  ] : [];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Audit & Compliance"
        title="Reports"
        description="Bank-wide summary and queue health, computed live from the shared records. Figures are demonstration data for this prototype."
        action={(
          <Button variant="ghost" disabled={!summary} onClick={() => { if (summary) downloadCsv('finedge-summary.csv', summaryCsv(summary)); }}>
            <Download className="h-4 w-4" aria-hidden /> Download summary CSV
          </Button>
        )}
      />

      {error ? (
        <EmptyState variant="error" icon={BarChart3} title="Could not load reports" body={error} />
      ) : !summary ? (
        <PageLoading />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <Card key={c.label} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.label}</p>
                <p className={`tnum mt-2 font-display text-3xl font-semibold text-midnight-950 ${c.money ? '' : ''}`}>{c.value}</p>
                <p className="mt-1 text-[13px] text-ink-500">{c.sub}</p>
              </Card>
            ))}
          </div>

          <div>
            <h3 className="mb-1 text-base font-semibold text-ink-900">Queue health</h3>
            <p className="mb-4 text-sm text-ink-600">Pending work by queue, with the age of its oldest item. SLA flags turn amber after 24 hours and red after 72 hours.</p>
            {queueRows.length === 0 ? (
              <EmptyState icon={BarChart3} title="No queue data" body="Queue health will appear once there is work in the system." />
            ) : (
              <Table
                columns={[
                  { key: 'label', label: 'Queue', render: (r) => <span className="font-medium text-ink-900">{r.label}</span> },
                  { key: 'count', label: 'Pending', align: 'right', render: (r) => <span className="tnum font-semibold">{r.count}</span> },
                  { key: 'oldestAt', label: 'Oldest item age', render: (r) => (r.oldestAt ? ageOf(r.oldestAt) : '—') },
                  { key: 'sla', label: 'SLA', render: (r) => <Badge tone={r.count === 0 ? 'neutral' : slaTone(r.oldestAt)}>{r.count === 0 ? 'Clear' : slaLabel(r.oldestAt)}</Badge> },
                ]}
                rows={queueRows}
                rowKey={(r) => r.key}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
