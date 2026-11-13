import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, FileText, Search, SearchX, X,
} from 'lucide-react';
import {
  Button, EmptyState, Field, FormError, Input, Modal, PageLoading, SectionHeader,
  Select, StatusChip, Table, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { ageOf, formatDate, formatDateTime, formatINR, maskPan, statusLabel } from '../../../lib/format.js';
import { decideKycCase, getKycCase, listKycCases } from '../../../services/managerBridge.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const PAGE_SIZE = 10;
const PENDING_STATUSES = ['PENDING', 'UNDER_REVIEW', 'SUBMITTED', 'INFO_REQUIRED'];

const REASON_CODES = [
  'DOCUMENT_ILLEGIBLE',
  'CKYC_MISMATCH',
  'ADDRESS_UNVERIFIABLE',
  'INCOME_UNVERIFIED',
  'OTHER',
];

const TAB_DEFS = [
  { id: 'ALL', label: 'All' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'INFO_REQUIRED', label: 'Info Required' },
];

const DECISION_LABELS = {
  APPROVED: 'Approve',
  REJECTED: 'Reject',
  INFO_REQUIRED: 'Request Info',
};

function ageHours(iso) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  return (Date.now() - start) / 3600000;
}

function ageClass(iso) {
  const hours = ageHours(iso);
  if (hours === null) return 'text-ink-600';
  if (hours > 72) return 'font-semibold text-danger-600';
  if (hours > 24) return 'font-semibold text-warning-600';
  return 'text-ink-600';
}

function formatAddress(customer) {
  const a = customer?.address;
  if (!a) return '—';
  if (typeof a === 'string') return a || '—';
  const parts = [a.line1, a.line2, a.city, a.state, a.pin].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export default function ManagerKycPage() {
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;
  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'AUDIT_COMPLIANCE';
  const { toast } = useToast();

  const [allCases, setAllCases] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [drawerCase, setDrawerCase] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [confirmDecision, setConfirmDecision] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    traceData('ManagerKycQueue');
    setLoading(true);
    setLoadError('');
    try {
      const [filtered, all] = await Promise.all([
        listKycCases({ status: activeTab, query: query.trim() || undefined }),
        listKycCases({}),
      ]);
      setRows(filtered);
      setAllCases(all);
    } catch (err) {
      setLoadError(err.message || 'Could not load the KYC queue. Try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, query]);

  useEffect(() => { loadList(); }, [loadList]);

  const counts = TAB_DEFS.reduce((acc, tab) => {
    if (tab.id === 'ALL') {
      acc[tab.id] = allCases.length;
    } else if (tab.id === 'UNDER_REVIEW') {
      acc[tab.id] = allCases.filter((c) => ['UNDER_REVIEW', 'PENDING', 'SUBMITTED'].includes(c.status)).length;
    } else {
      acc[tab.id] = allCases.filter((c) => c.status === tab.id).length;
    }
    return acc;
  }, {});
  const tabs = TAB_DEFS.map((t) => ({ ...t, count: counts[t.id] }));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, rows.length);

  const resetDecisionForm = () => {
    setReasonCode('');
    setRemarks('');
    setDecisionError('');
    setConfirmError('');
    setConfirmDecision(null);
  };

  const openCase = async (row) => {
    setDrawerCase(row);
    resetDecisionForm();
    setDrawerError('');
    setDrawerLoading(true);
    try {
      const detail = await getKycCase(row.id);
      setDrawerCase(detail);
    } catch (err) {
      setDrawerError(err.message || 'Could not load this case in full. Showing the queue summary.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    if (submitting) return;
    setDrawerCase(null);
    resetDecisionForm();
    setDrawerError('');
  };

  useEffect(() => {
    if (!drawerCase) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirmDecision) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerCase, confirmDecision, submitting]);

  const requestDecision = (decision) => {
    if ((decision === 'REJECTED' || decision === 'INFO_REQUIRED') && !reasonCode) {
      setDecisionError('Select a reason code before recording this decision.');
      return;
    }
    setDecisionError('');
    setConfirmError('');
    setConfirmDecision(decision);
  };

  const handleConfirmDecision = async () => {
    if (!drawerCase || !confirmDecision) return;
    const decidedId = drawerCase.id;
    const decision = confirmDecision;
    traceForm('KycDecision', {
      kycCaseId: decidedId,
      action: decision,
      remarks: remarks.trim() || reasonCode,
      riskCategory: drawerCase.riskCategory,
    });
    setSubmitting(true);
    setConfirmError('');
    try {
      await decideKycCase(decidedId, {
        decision,
        reasonCode,
        note: remarks.trim() || (decision === 'APPROVED' ? 'All documents verified' : undefined),
        actor: user?.fullName || user?.name || 'Senior KYC Officer',
        actorRole: user?.role || 'KYC_OFFICER',
        actorEmail: user?.email,
      });
      toast({
        title: decision === 'APPROVED' ? 'KYC approved' : decision === 'REJECTED' ? 'KYC rejected' : 'Information requested',
        body: `Case ${decidedId} — ${statusLabel(decision)}. The customer has been notified in this prototype.`,
        tone: decision === 'APPROVED' ? 'success' : 'info',
      });
      setConfirmDecision(null);

      const [filtered, all] = await Promise.all([
        listKycCases({ status: activeTab, query: query.trim() || undefined }),
        listKycCases({}),
      ]);
      setRows(filtered);
      setAllCases(all);

      const next = all.find((c) => c.id !== decidedId && PENDING_STATUSES.includes(c.status));
      if (next) {
        resetDecisionForm();
        setDrawerError('');
        setDrawerLoading(true);
        try {
          const detail = await getKycCase(next.id);
          setDrawerCase(detail);
        } catch {
          setDrawerCase(next);
        } finally {
          setDrawerLoading(false);
        }
      } else {
        setDrawerCase(null);
        resetDecisionForm();
      }
    } catch (err) {
      setConfirmError(err.message || 'Could not record the decision. Check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setActiveTab('ALL');
    setPage(1);
  };

  const columns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    {
      key: 'customer', label: 'Customer',
      render: (r) => (
        <span>
          <span className="block font-medium text-ink-900">{r.customer?.fullName || '—'}</span>
          <span className="block text-xs text-ink-500">{r.customer?.email || '—'}</span>
        </span>
      ),
    },
    { key: 'pan', label: 'PAN', render: (r) => <span className="tnum">{maskPan(r.customer?.pan)}</span> },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'age', label: 'Age', render: (r) => <span className={ageClass(r.submittedAt)}>{ageOf(r.submittedAt)}</span> },
    { key: 'riskCategory', label: 'Risk', render: (r) => r.riskCategory || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  ];

  const customer = drawerCase?.customer;
  const canDecide = drawerCase && PENDING_STATUSES.includes(drawerCase.status);
  const filtersActive = activeTab !== 'ALL' || query.trim() !== '';

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Work queues"
        title="KYC Queue"
        description="Identity cases, oldest first. Open a case to review its own documents and history — decisions are recorded only inside the case, never from this list."
      />

      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(id) => { setActiveTab(id); setPage(1); }}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input
            type="search"
            placeholder="Search name, PAN, CIF or email"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-9"
            aria-label="Search KYC cases"
          />
        </div>
        <p className="text-sm text-ink-500" role="status">
          {loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'case' : 'cases'}`}
          {filtersActive && !loading ? ' matching the current filters' : ''}
        </p>
      </div>

      <div className="mt-4">
        {loadError && (
          <div className="space-y-3">
            <FormError message={loadError} />
            <Button variant="secondary" onClick={loadList}>Retry</Button>
          </div>
        )}
        {!loadError && loading && <PageLoading />}
        {!loadError && !loading && rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={filtersActive ? 'No cases match these filters' : 'No KYC cases here yet'}
            body={filtersActive
              ? 'Try a different search, or clear the filters to see the whole queue.'
              : 'Customer KYC submissions will appear here, oldest first.'}
            action={filtersActive ? (
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            ) : undefined}
          />
        )}
        {!loadError && !loading && rows.length > 0 && (
          <>
            <Table columns={columns} rows={pagedRows} rowKey={(r) => r.id} onRowClick={openCase} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-500">Showing {showingFrom}–{showingTo} of {rows.length}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </Button>
                <span className="text-sm text-ink-600">Page {safePage} of {totalPages}</span>
                <Button
                  size="sm" variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {drawerCase && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`KYC case ${drawerCase.id}`}>
          <div className="absolute inset-0 bg-midnight-950/60" onClick={closeDrawer} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-[540px] flex-col bg-white shadow-modal overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">KYC case</p>
                <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-semibold text-midnight-950">
                  {drawerCase.id}
                  <StatusChip status={drawerCase.status} />
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  Submitted {formatDateTime(drawerCase.submittedAt)} · Age {ageOf(drawerCase.submittedAt)}
                </p>
              </div>
              <button
                type="button" onClick={closeDrawer}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors"
                aria-label="Close case"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
              {drawerError && <FormError message={drawerError} />}
              {drawerLoading && <p className="text-sm text-ink-500" role="status">Loading full case…</p>}

              <section aria-label="Customer summary">
                <h3 className="mb-3 text-sm font-semibold text-ink-700">Customer</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {[
                    ['Full name', customer?.fullName || '—'],
                    ['Customer ID (CIF)', customer?.id || drawerCase.customerId || '—'],
                    ['Email', customer?.email || '—'],
                    ['Mobile', customer?.mobile || '—'],
                    ['PAN', maskPan(customer?.pan)],
                    ['Date of birth', formatDate(customer?.dob)],
                    ['Risk category', drawerCase.riskCategory || customer?.riskCategory || '—'],
                    ['Occupation', customer?.occupation || '—'],
                    ['Annual income', customer?.annualIncome ? formatINR(customer.annualIncome) : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-medium text-ink-500">{label}</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-ink-900">{value}</dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-ink-500">Address</dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink-900">{formatAddress(customer)}</dd>
                  </div>
                </dl>
              </section>

              <section aria-label="Documents">
                <h3 className="mb-3 text-sm font-semibold text-ink-700">Documents</h3>
                <p className="mb-3 rounded-lg border border-warning-600/25 bg-warning-50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700">
                  Document verification is a simulation in this prototype — no external registry or document check was performed.
                </p>
                {(drawerCase.documents || []).length === 0 ? (
                  <EmptyState icon={FileText} title="No documents recorded" body="This case carries no document list in the prototype store." />
                ) : (
                  <ul className="space-y-2">
                    {drawerCase.documents.map((doc, i) => (
                      <li key={`${doc.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3.5 py-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink-900">{doc.name || '—'}</span>
                            {doc.type && <span className="block text-xs text-ink-500">{doc.type}</span>}
                          </span>
                        </span>
                        <StatusChip status={doc.state || 'PENDING'} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Case history">
                <h3 className="mb-3 text-sm font-semibold text-ink-700">History</h3>
                {(drawerCase.history || []).length === 0 ? (
                  <p className="text-sm text-ink-500">—</p>
                ) : (
                  <ol className="space-y-0 border-l-2 border-ink-100 pl-4">
                    {drawerCase.history.map((entry, i) => (
                      <li key={i} className="relative pb-4 last:pb-0">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold-500" aria-hidden />
                        <p className="text-sm font-semibold text-ink-900">
                          {statusLabel(entry.action)} <span className="font-normal text-ink-500">· {entry.actor || '—'}</span>
                        </p>
                        <p className="text-xs text-ink-500">{formatDateTime(entry.at)}</p>
                        {entry.note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{entry.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            {canDecide ? (
              <div className="sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-ink-100 bg-porcelain-50 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Field label="Reason code" hint="Required for Reject and Request Info." error={decisionError || undefined}>
                  <Select value={reasonCode} onChange={(e) => { setReasonCode(e.target.value); setDecisionError(''); }} error={decisionError || undefined}>
                    <option value="">Select a reason code</option>
                    {REASON_CODES.map((code) => (
                      <option key={code} value={code}>{statusLabel(code)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Remarks">
                  <Textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Remarks recorded in the case history and audit log."
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={closeDrawer}>Close</Button>
                  <Button variant="danger" className="flex-1" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => requestDecision('REJECTED')}>Reject</Button>
                  <Button variant="secondary" className="flex-1" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => requestDecision('INFO_REQUIRED')}>Request Info</Button>
                  <Button variant="primary" className="flex-1" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => requestDecision('APPROVED')}>Approve</Button>
                </div>
                {isAuditor && <p className="text-xs text-ink-500 text-center">Auditor clearance is read-only — decision controls are disabled.</p>}
              </div>
            ) : (
              <div className="sticky bottom-0 z-10 shrink-0 border-t border-ink-100 bg-porcelain-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  This case has already been decided ({statusLabel(drawerCase.status)}). Its history above is the record of that decision.
                </p>
                <Button variant="secondary" onClick={closeDrawer}>Close</Button>
              </div>
            )}
          </aside>
        </div>
      )}

      <Modal
        open={!!confirmDecision}
        onClose={() => { if (!submitting) setConfirmDecision(null); }}
        title={confirmDecision ? `${DECISION_LABELS[confirmDecision]} case ${drawerCase?.id || ''}?` : ''}
        footer={(
          <>
            <Button variant="secondary" disabled={submitting} onClick={() => setConfirmDecision(null)}>Cancel</Button>
            <Button
              variant={confirmDecision === 'REJECTED' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={handleConfirmDecision}
            >
              Confirm {confirmDecision ? DECISION_LABELS[confirmDecision] : ''}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-700">
            You are about to record{' '}
            <span className="font-semibold text-ink-900">{confirmDecision ? statusLabel(confirmDecision) : '—'}</span>{' '}
            for {customer?.fullName || 'this customer'} (case {drawerCase?.id || '—'}).
          </p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="w-28 shrink-0 font-medium text-ink-500">Reason code</dt><dd className="text-ink-900">{reasonCode ? statusLabel(reasonCode) : '—'}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 font-medium text-ink-500">Remarks</dt><dd className="text-ink-900">{remarks.trim() || '—'}</dd></div>
          </dl>
          <p className="text-[13px] leading-relaxed text-ink-500">
            This is written to the audit log and the customer&apos;s KYC status updates immediately in this prototype.
          </p>
          <FormError message={confirmError} />
        </div>
      </Modal>
    </div>
  );
}
