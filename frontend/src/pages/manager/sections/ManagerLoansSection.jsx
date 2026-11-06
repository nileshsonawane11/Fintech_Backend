import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Receipt, Search, X } from 'lucide-react';
import {
  Button, EmptyState, Field, FormError, Input, Modal, PageLoading,
  SectionHeader, Select, StatusChip, Stepper, Table, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { ageOf, formatDate, formatDateTime, formatINR, statusLabel, titleizeSlug } from '../../../lib/format.js';
import { calculateEMI } from '../../../lib/finance.js';
import { decideLoanApplication, disburseLoan, listLoanApplications } from '../../../services/managerBridge.js';
import { getCustomerDetail } from '../../../services/managerBridge.js';
import { getLoanBySlug } from '../../../data/products.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const TAB_DEFS = [
  { id: 'ALL', label: 'All' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'DOCUMENT_VERIFICATION', label: 'Document Verification' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'INFO_REQUIRED', label: 'Info Required' },
  { id: 'DISBURSED', label: 'Disbursed' },
];

const REJECT_CODES = [
  { value: 'INSUFFICIENT_INCOME', label: 'Income insufficient for the requested amount' },
  { value: 'CREDIT_HISTORY', label: 'Credit history does not meet policy' },
  { value: 'EMPLOYMENT_UNVERIFIED', label: 'Employment / business could not be verified' },
  { value: 'DOCUMENTS_INVALID', label: 'Submitted documents are invalid' },
  { value: 'OTHER', label: 'Other — explain in the remarks' },
];

const DOC_CODES = [
  { value: 'NEED_INCOME_PROOF', label: 'Income proof required (salary slips / ITR)' },
  { value: 'NEED_BANK_STATEMENTS', label: 'Bank statements required' },
  { value: 'NEED_IDENTITY_DOCUMENTS', label: 'Identity / address documents required' },
  { value: 'NEED_PROPERTY_DOCUMENTS', label: 'Property / asset documents required' },
  { value: 'OTHER', label: 'Other — explain in the remarks' },
];

const ALL_CODES = [...REJECT_CODES, ...DOC_CODES.filter((c) => !REJECT_CODES.some((r) => r.value === c.value))];
const ACTIONABLE = ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'UNDER_REVIEW', 'INFO_REQUIRED', 'DOCS_REQUESTED'];

function productFor(app) {
  if (!app?.productSlug) return null;
  return getLoanBySlug(app.productSlug);
}

function productName(app) {
  return app?.productName || productFor(app)?.name || titleizeSlug(app?.productSlug) || '—';
}

function emiOf(app) {
  if (app?.emi) return app.emi;
  const rate = app?.rate ?? productFor(app)?.rateMin;
  if (app?.amount && app?.tenureMonths && rate) {
    try {
      return calculateEMI(app.amount, rate, app.tenureMonths).emi;
    } catch {
      return null;
    }
  }
  return null;
}

function rateLabel(app) {
  if (app?.rate) return `${app.rate}% p.a.`;
  const p = productFor(app);
  if (p) return `${p.rateMin}% – ${p.rateMax}% p.a. (product range)`;
  return '—';
}

function maskId(id) {
  if (!id) return '—';
  return `•••• ${String(id).slice(-4)}`;
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-900">{children ?? '—'}</dd>
    </div>
  );
}

export default function ManagerLoansPage() {
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
  const [remarks, setRemarks] = useState('');
  const [sanctionedAmount, setSanctionedAmount] = useState('');
  const [sanctionedRate, setSanctionedRate] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null); // 'APPROVED' | 'REJECTED' | 'REQUEST_DOCS'
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disburseResult, setDisburseResult] = useState(null); // loan returned by disburseLoan
  const [creditedAccount, setCreditedAccount] = useState(null);
  const [linkedAccount, setLinkedAccount] = useState(null);

  const load = useCallback(async () => {
    try {
      const [all, filtered] = await Promise.all([
        listLoanApplications({}),
        listLoanApplications({ status: tab, query: query.trim() || undefined }),
      ]);
      setAllRows(all);
      setRows(filtered);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || 'Could not load loan applications.');
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => { load(); }, [load, refreshKey]);

    useEffect(() => {
    if (!detailId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !pendingDecision && !disburseOpen) setDetailId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [detailId, pendingDecision, disburseOpen]);

  const detail = useMemo(
    () => (detailId ? allRows.find((r) => r.id === detailId) || rows.find((r) => r.id === detailId) || null : null),
    [detailId, allRows, rows],
  );

  useEffect(() => {
    setReasonCode('');
    setRemarks('');
    setFormError('');
    setConfirmError('');
    setSanctionedAmount(detail?.sanctionedAmount != null ? String(detail.sanctionedAmount) : (detail?.amount != null ? String(detail.amount) : ''));
    const defaultRate = detail?.sanctionedRate != null ? detail.sanctionedRate : (detail?.rate != null ? detail.rate : (productFor(detail)?.rateMin || 8.75));
    setSanctionedRate(String(defaultRate));
    setPendingDecision(null);
    setDisburseOpen(false);
    setDisburseResult(null);
    setCreditedAccount(null);
    setLinkedAccount(null);
  }, [detailId]);

  // Resolve the disbursement account so its real masked number can be shown.
  useEffect(() => {
    let cancelled = false;
    if (detail?.customerId && detail?.accountId) {
      getCustomerDetail(detail.customerId)
        .then(({ accounts }) => {
          if (cancelled) return;
          setLinkedAccount((accounts || []).find((a) => a.id === detail.accountId) || null);
        })
        .catch(() => { if (!cancelled) setLinkedAccount(null); });
    }
    return () => { cancelled = true; };
  }, [detail?.customerId, detail?.accountId]);

  const tabs = TAB_DEFS.map((t) => ({
    ...t,
    count: t.id === 'ALL'
      ? allRows.length
      : allRows.filter((r) => r.status === t.id || (t.id === 'INFO_REQUIRED' && r.status === 'DOCS_REQUESTED') || (t.id === 'APPROVED' && r.status === 'SANCTIONED')).length,
  }));

  const customer = detail?.customer || null;
  const actionable = detail ? ACTIONABLE.includes(detail.status) : false;
  const disbursedEntry = useMemo(
    () => (detail?.timeline || []).filter((t) => t.stage === 'DISBURSED').slice(-1)[0] || null,
    [detail],
  );

  const openDecision = (decision) => {
    setFormError('');
    if ((decision === 'REJECTED' || decision === 'REQUEST_DOCS') && !reasonCode) {
      setFormError('Select a reason code before recording this decision.');
      return;
    }
    setPendingDecision(decision);
  };

  const confirmDecision = async () => {
    if (!detail || !pendingDecision) return;
    setSubmitting(true);
    setConfirmError('');
    try {
      const decision = pendingDecision;
      let sAmt = detail.amount;
      let sRt = detail.rate || 8.75;
      if (decision === 'APPROVED') {
        sAmt = Number(sanctionedAmount);
        sRt = Number(sanctionedRate);
        const prod = productFor(detail);
        if (!sAmt || isNaN(sAmt) || sAmt <= 0) {
          setConfirmError('Sanctioned amount must be a positive number.');
          setSubmitting(false);
          return;
        }
        if (prod?.amountMax && sAmt > prod.amountMax) {
          setConfirmError(`Sanctioned amount cannot exceed product maximum of ${formatINR(prod.amountMax)}.`);
          setSubmitting(false);
          return;
        }
        if (!sRt || isNaN(sRt) || sRt <= 0) {
          setConfirmError('Sanctioned rate must be a positive number.');
          setSubmitting(false);
          return;
        }
        if (prod?.rateMin && sRt < prod.rateMin) {
          setConfirmError(`Sanctioned rate cannot be below product minimum of ${prod.rateMin}%.`);
          setSubmitting(false);
          return;
        }
        if (prod?.rateMax && sRt > prod.rateMax) {
          setConfirmError(`Sanctioned rate cannot exceed product maximum of ${prod.rateMax}%.`);
          setSubmitting(false);
          return;
        }
      }

      await decideLoanApplication(detail.id, {
        decision,
        reasonCode: reasonCode || undefined,
        note: remarks.trim() || undefined,
        actor: user?.fullName || user?.name || 'Chief Branch Manager',
        actorRole: user?.role || 'BANK_MANAGER',
        actorEmail: user?.email,
        sanctionedAmount: sAmt,
        sanctionedRate: sRt,
      });
      setPendingDecision(null);
      setRefreshKey((k) => k + 1);
      toast({
        title: decision === 'APPROVED' ? 'Loan approved' : decision === 'REJECTED' ? 'Loan rejected' : 'Documents requested',
        body:
          decision === 'APPROVED'
            ? `${detail.id} is approved with sanctioned amount ${formatINR(Number(sanctionedAmount) || detail.amount)}.`
            : decision === 'REJECTED'
              ? `${detail.id} has been rejected and the customer notified.`
              : `${detail.id} marked Documents Requested and customer notified.`,
        tone: decision === 'APPROVED' ? 'success' : 'info',
      });
    } catch (err) {
      setPendingDecision(null);
      setFormError(err?.message || 'The decision could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDisburse = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const loan = await disburseLoan(detail.id, {
        actor: user?.fullName || user?.name || 'Chief Branch Manager',
        actorRole: user?.role || 'BANK_MANAGER',
        actorEmail: user?.email
      });
      setDisburseResult(loan);
      setDisburseOpen(false);
      setRefreshKey((k) => k + 1);
      if (loan?.accountId && detail.customerId) {
        try {
          const { accounts } = await getCustomerDetail(detail.customerId);
          setCreditedAccount((accounts || []).find((a) => a.id === loan.accountId) || null);
        } catch {
          setCreditedAccount(null);
        }
      }
      toast({
        title: 'Loan disbursed',
        body: loan?.disbursementRef
          ? `${formatINR(loan.principal ?? detail.amount)} credited · reference ${loan.disbursementRef}.`
          : 'The loan amount has been credited to the customer account.',
      });
    } catch (err) {
      setDisburseOpen(false);
      setFormError(err?.message || 'Disbursement failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    { key: 'customer', label: 'Customer', render: (r) => (typeof r.customer === 'object' ? r.customer?.fullName : r.customer) || r.applicantName || r.fullName || '—' },
    { key: 'product', label: 'Product', render: (r) => productName(r) },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.amount) },
    { key: 'tenureMonths', label: 'Tenure', render: (r) => (r.tenureMonths ? `${r.tenureMonths} months` : '—') },
    { key: 'emi', label: 'EMI', align: 'right', render: (r) => formatINR(emiOf(r)) },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'age', label: 'Age', render: (r) => ageOf(r.submittedAt) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  ];

  const decisionLabel = (d) => (d === 'APPROVED' ? 'Approve' : d === 'REJECTED' ? 'Reject' : 'Request Documents');

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Loan Operations"
        title="Loan Applications"
        description="Review loan applications, record decisions, and disburse approved loans into the customer account."
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Search by reference, customer or product"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search loan applications"
        />
      </div>

      <div className="mt-5">
        {loadError && <div className="mb-4"><FormError message={loadError} /></div>}
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No applications found"
            body={query ? 'No loan applications match this search in the selected queue.' : 'Applications submitted by customers will appear here for review.'}
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
                <p className="text-[13px] text-ink-500">{productName(detail)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={detail.status} />
                <button onClick={() => setDetailId(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors" aria-label="Close review">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
              <h4 className="text-sm font-semibold text-midnight-950">Application summary</h4>
              <dl className="mt-1 divide-y divide-ink-50">
                <DetailRow label="Customer">{(typeof customer === 'object' ? customer?.fullName : customer) || detail.applicantName || detail.fullName || '—'}</DetailRow>
                <DetailRow label="Customer ref">{detail.customerId || '—'}</DetailRow>
                <DetailRow label="Product">{productName(detail)}</DetailRow>
                <DetailRow label="Amount">{formatINR(detail.amount)}</DetailRow>
                <DetailRow label="Tenure">{detail.tenureMonths ? `${detail.tenureMonths} months` : '—'}</DetailRow>
                <DetailRow label="EMI">{formatINR(emiOf(detail))}</DetailRow>
                <DetailRow label="Rate">{rateLabel(detail)}</DetailRow>
                <DetailRow label="Monthly income">{formatINR(detail.monthlyIncome)}</DetailRow>
                <DetailRow label="Employment">{detail.employmentType ? statusLabel(detail.employmentType) : '—'}</DetailRow>
                <DetailRow label="Purpose">{detail.purpose || '—'}</DetailRow>
                <DetailRow label="Disbursement account">{linkedAccount?.accountNumber ? maskId(linkedAccount.accountNumber) : maskId(detail.accountId)}</DetailRow>
                <DetailRow label="Submitted">{formatDateTime(detail.submittedAt)}</DetailRow>
                <DetailRow label="Age">{ageOf(detail.submittedAt)}</DetailRow>
              </dl>

              {detail.loanDetails && Object.keys(detail.loanDetails).length > 0 && (
                <>
                  <h4 className="mt-6 text-sm font-semibold text-midnight-950">Loan-specific details</h4>
                  <dl className="mt-1 divide-y divide-ink-50">
                    {Object.entries(detail.loanDetails).map(([k, v]) => {
                      if (v === undefined || v === null || v === '' || typeof v === 'object') return null;
                      const isMoney = (k.toLowerCase().includes('amount') || k.toLowerCase().includes('price') || k.toLowerCase().includes('turnover') || k.toLowerCase().includes('value') || k.toLowerCase().includes('fee') || k.toLowerCase().includes('income')) && !isNaN(Number(v));
                      return (
                        <DetailRow key={k} label={titleizeSlug(k)}>{isMoney ? formatINR(Number(v)) : String(v)}</DetailRow>
                      );
                    })}
                  </dl>
                </>
              )}

              {detail.steps && detail.steps.length > 0 && (
                <>
                  <h4 className="mt-6 text-sm font-semibold text-midnight-950">Progress</h4>
                  <div className="mt-3">
                    <Stepper steps={detail.steps.map((s) => ({ ...s, date: s.date ? formatDate(s.date) : null }))} />
                  </div>
                </>
              )}

              {(detail.timeline || []).length > 0 && (
                <>
                  <h4 className="mt-6 text-sm font-semibold text-midnight-950">Timeline</h4>
                  <ol className="mt-2 space-y-3">
                    {detail.timeline.map((t, i) => (
                      <li key={i} className="border-l-2 border-ink-100 pl-3">
                        <p className="text-sm font-medium text-ink-900">{statusLabel(t.stage)}</p>
                        <p className="text-xs text-ink-500">{formatDateTime(t.at)}</p>
                        {t.note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{t.note}</p>}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {detail.status === 'DISBURSED' && (
                <div className="mt-6 rounded-lg border border-success-600/25 bg-success-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-success-600">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Loan disbursed
                  </p>
                  <dl className="mt-1 divide-y divide-ink-50">
                    <DetailRow label="Disbursement reference">{disburseResult?.disbursementRef || '—'}</DetailRow>
                    <DetailRow label="Loan ref">{disburseResult?.id || '—'}</DetailRow>
                    <DetailRow label="Detail">{disbursedEntry?.note || '—'}</DetailRow>
                  </dl>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-ink-100 bg-porcelain-50 px-5 py-4">
              {detail.status === 'REJECTED' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-ink-500">This application was rejected. No further decisions are available.</p>
                  <Button variant="secondary" disabled title="Reopen workflow is not part of this prototype">Reopen</Button>
                </div>
              ) : detail.status === 'DISBURSED' ? (
                <p className="text-[13px] text-ink-500">This loan has been disbursed. No further actions are available.</p>
              ) : detail.status === 'APPROVED' ? (
                <div className="space-y-3">
                  <FormError message={formError} />
                  {disburseResult ? (
                    <div className="rounded-lg border border-success-600/25 bg-success-50 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-success-600">
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> Disbursement complete
                      </p>
                      <dl className="mt-1 divide-y divide-ink-50">
                        <DetailRow label="Disbursement reference">{disburseResult.disbursementRef || '—'}</DetailRow>
                        <DetailRow label="Amount credited">{formatINR(disburseResult.principal ?? detail.amount)}</DetailRow>
                        <DetailRow label="Credited account">{creditedAccount?.accountNumber ? maskId(creditedAccount.accountNumber) : maskId(disburseResult.accountId)}</DetailRow>
                      </dl>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] leading-relaxed text-ink-500">
                        This application is approved. Disbursing credits {formatINR(detail.amount)} to the customer&apos;s account and starts the EMI schedule.
                      </p>
                      <div className="flex justify-end">
                        <Button disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => setDisburseOpen(true)}>Disburse Loan</Button>
                      </div>
                    </>
                  )}
                </div>
              ) : actionable ? (
                <div className="space-y-3">
                  <FormError message={formError} />
                  <Field label="Reason code" hint="Required for Reject and Request Documents.">
                    <Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                      <option value="">Select a reason code</option>
                      {ALL_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Remarks">
                    <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks recorded with the decision" />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="danger" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => openDecision('REJECTED')}>Reject</Button>
                    <Button variant="secondary" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => openDecision('REQUEST_DOCS')}>Request Documents</Button>
                    <Button variant="primary" disabled={isAuditor} title={isAuditor ? 'Auditor access is read-only' : undefined} onClick={() => openDecision('APPROVED')}>Approve</Button>
                  </div>
                  {isAuditor && <p className="text-xs text-ink-500 text-right mt-1">Auditor clearance is read-only — decision controls are disabled.</p>}
                </div>
              ) : (
                <p className="text-[13px] text-ink-500">No decision actions are available for this status.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <Modal
        open={!!pendingDecision}
        onClose={() => !submitting && setPendingDecision(null)}
        title={pendingDecision ? `Confirm — ${decisionLabel(pendingDecision)}` : ''}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPendingDecision(null)} disabled={submitting}>Cancel</Button>
            <Button
              variant={pendingDecision === 'REJECTED' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={confirmDecision}
            >
              Confirm {pendingDecision ? decisionLabel(pendingDecision) : ''}
            </Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm leading-relaxed text-ink-700">
          <p>
            Application <strong className="text-ink-900">{detail?.id}</strong> for{' '}
            <strong className="text-ink-900">{customer?.fullName || '—'}</strong> — {productName(detail || {})},{' '}
            {formatINR(detail?.amount)} over {detail?.tenureMonths ? `${detail.tenureMonths} months` : '—'}.
          </p>
          {confirmError && <div className="mb-2"><FormError message={confirmError} /></div>}
          {pendingDecision === 'APPROVED' && (
            <div className="space-y-3 pt-2">
              <p>Approval sets the sanction terms and moves the application to Approved. Disbursement is a separate step.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sanctioned Amount (₹)" hint={`Max: ${productFor(detail)?.amountMax ? formatINR(productFor(detail).amountMax) : '₹10,00,00,000'}`}>
                  <Input
                    type="number"
                    value={sanctionedAmount}
                    onChange={(e) => setSanctionedAmount(e.target.value)}
                  />
                </Field>
                <Field label="Sanctioned Rate (% p.a.)" hint={`Range: ${productFor(detail)?.rateMin ?? 8.5}% – ${productFor(detail)?.rateMax ?? 15}%`}>
                  <Input
                    type="number"
                    step="0.05"
                    value={sanctionedRate}
                    onChange={(e) => setSanctionedRate(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
          {(pendingDecision === 'REJECTED' || pendingDecision === 'REQUEST_DOCS') && (
            <p>Reason: {ALL_CODES.find((c) => c.value === reasonCode)?.label || reasonCode}. The customer will be notified.</p>
          )}
          {remarks.trim() && <p>Remarks: {remarks.trim()}</p>}
        </div>
      </Modal>

      <Modal
        open={disburseOpen}
        onClose={() => !submitting && setDisburseOpen(false)}
        title="Confirm — Disburse Loan"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDisburseOpen(false)} disabled={submitting}>Cancel</Button>
            <Button loading={submitting} onClick={confirmDisburse}>Confirm Disbursement</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm leading-relaxed text-ink-700">
          <p>
            Disburse <strong className="text-ink-900">{formatINR(detail?.amount)}</strong> for application{' '}
            <strong className="text-ink-900">{detail?.id}</strong> ({productName(detail || {})}) to{' '}
            <strong className="text-ink-900">{customer?.fullName || '—'}</strong>.
          </p>
          <p>The amount is credited to the customer&apos;s account, a loan record is created, and the EMI schedule starts. This cannot be undone from this console.</p>
        </div>
      </Modal>
    </div>
  );
}
