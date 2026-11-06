import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Search, X } from 'lucide-react';
import {
  Button, EmptyState, Field, FormError, Input, Modal, PageLoading,
  SectionHeader, Select, StatusChip, Table, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { ageOf, formatDate, formatDateTime, formatINR, statusLabel } from '../../../lib/format.js';
import { declineCardApplication, issueCard, listCardApplications } from '../../../services/managerBridge.js';
import { getCustomerDetail } from '../../../services/managerBridge.js';
import { getCardBySlug } from '../../../data/products.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const TAB_DEFS = [
  { id: 'ALL', label: 'All' },
  { id: 'UNDER_REVIEW', label: 'Pending Issuance' },
  { id: 'APPROVED', label: 'Issued' },
  { id: 'REJECTED', label: 'Declined' },
];

const DECLINE_CODES = [
  { value: 'CREDIT_SCORE', label: 'Credit score does not meet policy' },
  { value: 'INSUFFICIENT_INCOME', label: 'Income insufficient for the requested limit' },
  { value: 'KYC_INCOMPLETE', label: 'KYC incomplete or documents missing' },
  { value: 'DUPLICATE_CARD', label: 'Customer already holds an equivalent card' },
  { value: 'ADDRESS_UNVERIFIED', label: 'Dispatch address could not be verified' },
  { value: 'OTHER', label: 'Other — explain in the note' },
];

function productFor(app) {
  if (!app?.productSlug) return null;
  return getCardBySlug(app.productSlug);
}

function cardName(app) {
  if (!app) return '—';
  if (app.cardName) return app.cardName;
  if (app.productName) return app.productName;
  const p = productFor(app);
  if (p) return p.name;
  if (app.variant) return statusLabel(app.variant);
  return '—';
}

function cardKind(app) {
  return app?.kind || app?.cardType || null;
}

function isCredit(app) {
  return String(cardKind(app) || '').toUpperCase() === 'CREDIT';
}

function linkedId(app) {
  return app?.linkedAccountId || app?.accountId || null;
}

function maskRef(id) {
  if (!id) return '—';
  return `•••• ${String(id).slice(-4)}`;
}

function formatAddress(address) {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  const parts = [address.line1, address.line2, address.city, address.state, address.pin].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-900">{children ?? '—'}</dd>
    </div>
  );
}

export default function ManagerCardsPage() {
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;
  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'AUDIT_COMPLIANCE';
  const { toast } = useToast();
  useDbTick();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailId, setDetailId] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [approvedLimit, setApprovedLimit] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'ISSUE' | 'DECLINE'
  const [submitting, setSubmitting] = useState(false);
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [issueResult, setIssueResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const [all, filtered] = await Promise.all([
        listCardApplications({}),
        listCardApplications({ status: tab, query: query.trim() || undefined }),
      ]);
      setAllRows(all);
      setRows(filtered);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || 'Could not load card applications.');
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const detail = useMemo(
    () => (detailId ? allRows.find((r) => r.id === detailId) || rows.find((r) => r.id === detailId) || null : null),
    [detailId, allRows, rows],
  );

  useEffect(() => {
    setReasonCode('');
    setNote('');
    setFormError('');
    setPendingAction(null);
    setLinkedAccount(null);
    setIssueResult(null);
    setApprovedLimit(detail?.requestedLimit ? String(detail.requestedLimit) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  // Resolve the linked account so its real masked number can be shown.
  useEffect(() => {
    let cancelled = false;
    const id = linkedId(detail || {});
    if (detail?.customerId && id) {
      getCustomerDetail(detail.customerId)
        .then(({ accounts }) => {
          if (cancelled) return;
          setLinkedAccount((accounts || []).find((a) => a.id === id) || null);
        })
        .catch(() => { if (!cancelled) setLinkedAccount(null); });
    }
    return () => { cancelled = true; };
  }, [detail?.customerId, detail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = TAB_DEFS.map((t) => ({
    ...t,
    count: t.id === 'ALL'
      ? allRows.length
      : t.id === 'UNDER_REVIEW'
        ? allRows.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING' || r.status === 'PENDING_APPROVAL').length
        : t.id === 'APPROVED'
          ? allRows.filter((r) => r.status === 'APPROVED' || r.status === 'ISSUED').length
          : allRows.filter((r) => r.status === 'REJECTED' || r.status === 'DECLINED').length,
  }));

  const customer = detail?.customer || null;
  const product = useMemo(() => productFor(detail), [detail]);
  const credit = detail ? isCredit(detail) : false;
  const issuedEntry = useMemo(
    () => (detail?.history || []).filter((h) => h.action === 'ISSUED').slice(-1)[0] || null,
    [detail],
  );

  const openAction = (action) => {
    setFormError('');
    if (action === 'DECLINE' && !reasonCode) {
      setFormError('Select a reason code before declining this application.');
      return;
    }
    if (action === 'ISSUE' && credit) {
      const limit = Number(approvedLimit);
      if (!approvedLimit || Number.isNaN(limit) || limit <= 0) {
        setFormError('Enter a valid approved limit before issuing this credit card.');
        return;
      }
    }
    setPendingAction(action);
  };

  const confirmAction = async () => {
    if (!detail || !pendingAction) return;
    setSubmitting(true);
    setFormError('');
    try {
      if (pendingAction === 'ISSUE') {
        const limitNum = Number(approvedLimit) || (credit ? 250000 : 50000);
        const prod = productFor(detail);
        if (prod?.limitMax && limitNum > prod.limitMax) {
          setFormError(`Limit cannot exceed card maximum of ${formatINR(prod.limitMax)}.`);
          setSubmitting(false);
          return;
        }
        const res = await issueCard(detail.id, {
          limit: limitNum,
          actor: user?.fullName || user?.name || 'Card Ops Officer',
          actorRole: user?.role || 'ACCOUNT_OPS',
          actorEmail: user?.email
        });
        setIssueResult(res);
        setPendingAction(null);
        setRefreshKey((k) => k + 1);
        toast({
          title: 'Card issued',
          body: `Card application ${detail.id} approved with limit ${formatINR(limitNum)}. Card materialized in active ledger.`,
        });
      } else {
        await declineCardApplication(detail.id, {
          reasonCode: reasonCode || undefined,
          note: note.trim() || undefined,
          actor: user?.fullName || user?.name || 'Card Ops Officer',
          actorRole: user?.role || 'ACCOUNT_OPS',
          actorEmail: user?.email
        });
        setPendingAction(null);
        setRefreshKey((k) => k + 1);
        toast({ title: 'Application declined', body: `${detail.id} has been declined and the customer notified.`, tone: 'info' });
      }
    } catch (err) {
      setPendingAction(null);
      setFormError(err?.message || 'The action could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    {
      key: 'customer',
      label: 'Customer',
      render: (r) => (
        <span>
          <span className="block">{r.customer?.fullName || '—'}</span>
          <span className="block text-[13px] text-ink-500">CIF {r.customer?.id || r.customerId || '—'}</span>
        </span>
      ),
    },
    { key: 'card', label: 'Card', render: (r) => cardName(r) },
    { key: 'type', label: 'Type', render: (r) => (cardKind(r) ? statusLabel(cardKind(r)) : '—') },
    {
      key: 'linked',
      label: 'Linked account',
      render: (r) => maskRef(linkedId(r)),
    },
    { key: 'requestedLimit', label: 'Requested limit', align: 'right', render: (r) => formatINR(r.requestedLimit) },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'age', label: 'Age', render: (r) => ageOf(r.submittedAt) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  ];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Card Operations"
        title="Card Applications"
        description="Review card applications in the issuance queue, set the approved limit for credit cards, and issue or decline."
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <Input
          className="pl-9 pr-9"
          placeholder="Search by reference, customer or card"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search card applications"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-5">
        {loadError && <div className="mb-4"><FormError message={loadError} /></div>}
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No applications found"
            body={query ? 'No card applications match this search in the selected queue.' : 'Card applications submitted by customers will appear here for issuance.'}
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} />
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Application ${detail.id}`}>
          <div className="absolute inset-0 bg-midnight-950/60" onClick={() => setDetailId(null)} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col bg-white shadow-modal overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">{detail.id}</h3>
                <p className="text-[13px] text-ink-500">{cardName(detail)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={detail.status} />
                <button onClick={() => setDetailId(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800" aria-label="Close review">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
              <h4 className="text-sm font-semibold text-midnight-950">Applicant</h4>
              <dl className="mt-1 divide-y divide-ink-50">
                <DetailRow label="Customer">{customer?.fullName || '—'}</DetailRow>
                <DetailRow label="CIF">{customer?.id || detail.customerId || '—'}</DetailRow>
                <DetailRow label="Email">{customer?.email || '—'}</DetailRow>
                <DetailRow label="Mobile">{customer?.mobile || '—'}</DetailRow>
                <DetailRow label="KYC status">{customer?.kycStatus ? <StatusChip status={customer.kycStatus} /> : '—'}</DetailRow>
              </dl>

              <h4 className="mt-6 text-sm font-semibold text-midnight-950">Card terms</h4>
              {product ? (
                <dl className="mt-1 divide-y divide-ink-50">
                  <DetailRow label="Product">{product.name}</DetailRow>
                  <DetailRow label="Network">{product.network || '—'}</DetailRow>
                  <DetailRow label="Joining fee">{formatINR(product.joiningFee)}</DetailRow>
                  <DetailRow label="Annual fee">{formatINR(product.annualFee)}</DetailRow>
                  <DetailRow label="APR">{product.aprPct ? `${product.aprPct}% p.a.` : 'Not applicable'}</DetailRow>
                  <DetailRow label="Finance charge">{product.financeChargeMonthlyPct ? `${product.financeChargeMonthlyPct}% per month` : 'Not applicable'}</DetailRow>
                  <DetailRow label="Interest-free days">{product.interestFreeDays ? `${product.interestFreeDays} days` : 'Not applicable'}</DetailRow>
                  <DetailRow label="Credit limit range">
                    {product.creditLimitRange ? `${formatINR(product.creditLimitRange.min)} – ${formatINR(product.creditLimitRange.max)}` : 'Not applicable'}
                  </DetailRow>
                </dl>
              ) : (
                <>
                  <dl className="mt-1 divide-y divide-ink-50">
                    <DetailRow label="Product">{cardName(detail)}</DetailRow>
                    <DetailRow label="Network">—</DetailRow>
                    <DetailRow label="Joining fee">—</DetailRow>
                    <DetailRow label="Annual fee">—</DetailRow>
                    <DetailRow label="APR">—</DetailRow>
                  </dl>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                    This application does not reference a product in the current catalogue, so catalogue fees and APR are not available for it.
                  </p>
                </>
              )}

              <h4 className="mt-6 text-sm font-semibold text-midnight-950">Application</h4>
              <dl className="mt-1 divide-y divide-ink-50">
                <DetailRow label="Type">{cardKind(detail) ? statusLabel(cardKind(detail)) : '—'}</DetailRow>
                <DetailRow label="Requested limit">{formatINR(detail.requestedLimit)}</DetailRow>
                <DetailRow label="Linked account">
                  {linkedAccount?.accountNumber ? maskRef(linkedAccount.accountNumber) : maskRef(linkedId(detail))}
                  {linkedAccount?.type ? ` (${statusLabel(linkedAccount.type)})` : ''}
                </DetailRow>
                <DetailRow label="Dispatch address">{formatAddress(customer?.address)}</DetailRow>
                <DetailRow label="Submitted">{formatDateTime(detail.submittedAt)}</DetailRow>
                <DetailRow label="Age">{ageOf(detail.submittedAt)}</DetailRow>
              </dl>

              {detail.status === 'ISSUED' && (
                <div className="mt-6 rounded-lg border border-success-600/25 bg-success-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-success-600">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Card issued
                  </p>
                  <dl className="mt-1 divide-y divide-ink-50">
                    <DetailRow label="Dispatch reference">{detail.dispatchRef || issueResult?.dispatchRef || '—'}</DetailRow>
                    <DetailRow label="Issued on">{issuedEntry ? formatDateTime(issuedEntry.at) : issueResult?.issuedAt ? formatDateTime(issueResult.issuedAt) : '—'}</DetailRow>
                    <DetailRow label="Approved limit">{issueResult?.limit ? formatINR(issueResult.limit) : '—'}</DetailRow>
                  </dl>
                </div>
              )}

              {(detail.history || []).length > 0 && (
                <>
                  <h4 className="mt-6 text-sm font-semibold text-midnight-950">History</h4>
                  <ol className="mt-2 space-y-3">
                    {detail.history.map((h, i) => (
                      <li key={i} className="border-l-2 border-ink-100 pl-3">
                        <p className="text-sm font-medium text-ink-900">{statusLabel(h.action)} <span className="font-normal text-ink-500">· {h.actor || '—'}</span></p>
                        <p className="text-xs text-ink-500">{formatDateTime(h.at)}</p>
                        {h.note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{h.note}</p>}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-ink-100 bg-porcelain-50 px-5 py-4">
              {detail.status === 'REJECTED' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-ink-500">This application was declined. No further actions are available.</p>
                  <Button variant="secondary" disabled title="Reopen workflow is not part of this prototype">Reopen</Button>
                </div>
              ) : (detail.status === 'APPROVED' || detail.status === 'ISSUED') ? (
                <p className="text-[13px] text-ink-500">
                  This card has been issued{detail.dispatchRef ? ` · dispatch reference ${detail.dispatchRef}` : ''}. No further actions are available.
                </p>
              ) : (detail.status === 'UNDER_REVIEW' || detail.status === 'PENDING' || detail.status === 'PENDING_APPROVAL') ? (
                <div className="space-y-3">
                  <FormError message={formError} />
                  {credit && (
                    <Field label="Approved limit (₹)" required hint={`Requested: ${formatINR(detail.requestedLimit)}`}>
                      <Input
                        type="number"
                        min="1"
                        step="1000"
                        value={approvedLimit}
                        onChange={(e) => setApprovedLimit(e.target.value)}
                        placeholder="Approved credit limit"
                      />
                    </Field>
                  )}
                  <Field label="Decline reason code" hint="Required only when declining.">
                    <Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                      <option value="">Select a reason code</option>
                      {DECLINE_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Note to customer">
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note recorded with a decline" />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="danger" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => openAction('DECLINE')}>Decline</Button>
                    <Button variant="primary" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => openAction('ISSUE')}>Issue Card</Button>
                  </div>
                  {isAuditor && <p className="text-xs text-ink-500 text-right mt-1">Auditor clearance is read-only — action controls are disabled.</p>}
                </div>
              ) : (
                <p className="text-[13px] text-ink-500">No actions are available for this status.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <Modal
        open={!!pendingAction}
        onClose={() => !submitting && setPendingAction(null)}
        title={pendingAction === 'ISSUE' ? 'Confirm — Issue Card' : pendingAction === 'DECLINE' ? 'Confirm — Decline Application' : ''}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={submitting}>Cancel</Button>
            <Button
              variant={pendingAction === 'DECLINE' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={confirmAction}
            >
              {pendingAction === 'ISSUE' ? 'Confirm Issue' : 'Confirm Decline'}
            </Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm leading-relaxed text-ink-700">
          <p>
            Application <strong className="text-ink-900">{detail?.id}</strong> for{' '}
            <strong className="text-ink-900">{customer?.fullName || '—'}</strong> — {cardName(detail || {})}.
          </p>
          {pendingAction === 'ISSUE' && (
            <p>
              The card will be created and dispatched to the customer address on file.
              {credit ? ` Approved limit: ${formatINR(Number(approvedLimit))}.` : ''}
            </p>
          )}
          {pendingAction === 'DECLINE' && (
            <p>Reason: {DECLINE_CODES.find((c) => c.value === reasonCode)?.label || reasonCode}. The customer will be notified.</p>
          )}
          {pendingAction === 'DECLINE' && note.trim() && <p>Note: {note.trim()}</p>}
        </div>
      </Modal>
    </div>
  );
}
