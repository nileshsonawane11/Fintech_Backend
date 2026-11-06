import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CreditCard, FileText, History, Inbox, LifeBuoy, Receipt, ShieldCheck,
} from 'lucide-react';
import {
  Button, Card, EmptyState, FormError, PageLoading, SectionHeader, StatusChip, Table,
} from '../../../components/ui.jsx';
import { ageOf, formatDate, formatDateTime, formatINR, productDisplayName, statusLabel } from '../../../lib/format.js';
import { reportsSummary, listMyDecisions, hasSectionAccess } from '../../../services/managerBridge.js';
import { listKycCases } from '../../../services/managerBridge.js';
import { listLoanApplications } from '../../../services/managerBridge.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const LOAN_PENDING_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_VERIFICATION'];
const KYC_PENDING_STATUSES = ['PENDING', 'UNDER_REVIEW'];

function ageHours(iso) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  return (Date.now() - start) / 3600000;
}

function slaNote(iso) {
  const hours = ageHours(iso);
  if (hours === null) return '';
  if (hours > 72) return 'Over 72 hours old — needs attention first.';
  if (hours > 24) return 'Over 24 hours old.';
  return '';
}

function QueueCell({ icon: Icon, label, queue, to, onOpen }) {
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
        <span className={`mt-1 block text-xs font-medium ${ageHours(queue?.oldestAt) > 72 ? 'text-danger-600' : 'text-warning-600'}`}>
          {note}
        </span>
      )}
    </button>
  );
}

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;

  const [summary, setSummary] = useState(null);
  const [kycPreview, setKycPreview] = useState([]);
  const [loanPreview, setLoanPreview] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [sum, kycRows, loanRows, myDecisions] = await Promise.all([
          reportsSummary(),
          listKycCases({}),
          listLoanApplications({}),
          user?.email ? listMyDecisions(user.email, user.name || user.fullName) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setKycPreview(kycRows.filter((r) => KYC_PENDING_STATUSES.includes(r.status)).slice(0, 5));
        setLoanPreview(loanRows.filter((r) => LOAN_PENDING_STATUSES.includes(r.status)).slice(0, 5));
        setDecisions(myDecisions || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load the dashboard. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, user?.name, user?.fullName]);

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="space-y-4">
        <SectionHeader eyebrow="Staff Console" title="Dashboard" description="Work queues and today's operating picture." />
        <FormError message={error} />
        <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const queues = summary?.queues || {};
  const tiles = [
    { icon: ShieldCheck, label: 'KYC pending', queue: queues.kycPending, to: '/manager/kyc', section: 'kyc' },
    { icon: FileText, label: 'Account apps', queue: queues.accountAppsPending, to: '/manager/accounts', section: 'accounts' },
    { icon: Receipt, label: 'Loan apps', queue: queues.loanAppsPending, to: '/manager/loans', section: 'loans' },
    { icon: CreditCard, label: 'Card apps', queue: queues.cardAppsPending, to: '/manager/cards', section: 'cards' },
    { icon: LifeBuoy, label: 'Open tickets', queue: queues.ticketsOpen, to: '/manager/support', section: 'tickets' },
  ];

  const referenceStats = [
    { label: 'Customers', value: summary ? String(summary.customers) : '—' },
    { label: 'Accounts', value: summary ? String(summary.accounts) : '—' },
    { label: 'Total deposits', value: summary ? formatINR(summary.totalDeposits) : '—' },
    { label: 'Active loans', value: summary ? String(summary.activeLoans) : '—' },
    { label: 'Loan book', value: summary ? formatINR(summary.loanBook) : '—' },
    { label: 'Cards issued', value: summary ? String(summary.cardsIssued) : '—' },
    { label: 'Investments', value: summary ? String(summary.investments) : '—' },
  ];

  const kycColumns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    { key: 'customerName', label: 'Customer', render: (r) => r.customerName || r.applicantName || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { key: 'submittedAt', label: 'Age', render: (r) => ageOf(r.submittedAt) },
  ];

  const loanColumns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    { key: 'customerName', label: 'Customer', render: (r) => r.customerName || r.applicantName || '—' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.amount) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { key: 'submittedAt', label: 'Age', render: (r) => ageOf(r.submittedAt) },
  ];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Staff Console"
        title="Dashboard"
        description="Work queues and today's operating picture across deposits, cards and loans."
      />

      <div className="grid divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        {tiles.map((t) => (
          <QueueCell key={t.label} icon={t.icon} label={t.label} queue={t.queue} to={t.to} onOpen={navigate} canAccess={hasSectionAccess(t.section, user)} />
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-midnight-950">Operating picture</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {referenceStats.map((s) => (
            <Card key={s.label} className="p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{s.label}</span>
              <span className="tnum mt-1 block font-display text-xl font-semibold text-midnight-950">{s.value}</span>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0" aria-label="KYC queue preview">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-midnight-950">KYC queue — oldest pending</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/manager/kyc')}>
              View queue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {kycPreview.length === 0 ? (
            <EmptyState icon={Inbox} title="No pending KYC cases" body="Customer identity verifications awaiting action will appear here, oldest first." />
          ) : (
            <Table columns={kycColumns} rows={kycPreview} rowKey={(r) => r.id} onRowClick={() => navigate('/manager/kyc')} minWidthClass="min-w-0" />
          )}
        </section>

        <section className="min-w-0" aria-label="Loan queue preview">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-midnight-950">Loan applications — oldest pending</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/manager/loans')}>
              View queue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {loanPreview.length === 0 ? (
            <EmptyState icon={Inbox} title="No pending loan applications" body="New loan applications awaiting review will appear here, oldest first." />
          ) : (
            <Table columns={loanColumns} rows={loanPreview} rowKey={(r) => r.id} onRowClick={() => navigate('/manager/loans')} minWidthClass="min-w-0" />
          )}
        </section>
      </div>

      <section className="mt-8" aria-label="My recent decisions">
        <h2 className="mb-3 text-base font-semibold text-midnight-950">My recent decisions</h2>
        {decisions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No decisions yet"
            body="Approvals, rejections and information requests you record will be listed here from the audit log."
          />
        ) : (
          <Card className="divide-y divide-ink-100">
            {decisions.map((row) => (
              <div key={row.id || `${row.action}-${row.at}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{statusLabel(row.action)}</p>
                  <p className="text-[13px] text-ink-500">
                    {row.entity || '—'}{row.entityId ? ` · ${row.entityId}` : ''}
                    {row.detail ? ` · ${row.detail}` : ''}
                  </p>
                </div>
                <span className="text-[13px] text-ink-500">{formatDateTime(row.at || row.timestamp)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
