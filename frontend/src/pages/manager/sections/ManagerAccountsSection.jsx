import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';
import {
  Badge, Button, EmptyState, Field, FormError, Modal, PageLoading,
  SectionHeader, Select, StatusChip, Table, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { ageOf, formatDate, formatDateTime, formatINR, maskPan, statusLabel } from '../../../lib/format.js';
import { decideAccountApplication, getCustomerDetail, listAccountApplications } from '../../../services/managerBridge.js';
import { getAccountBySlug, getProductsByCategory } from '../../../data/products.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const TAB_DEFS = [
  { id: 'ALL', label: 'All' },
  { id: 'UNDER_REVIEW', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'INFO_REQUIRED', label: 'Info Required' },
];

const REASON_CODES = [
  { value: 'KYC_INCOMPLETE', label: 'KYC incomplete or documents missing' },
  { value: 'DOCUMENT_MISMATCH', label: 'Document details do not match the application' },
  { value: 'ADDRESS_UNVERIFIED', label: 'Address could not be verified' },
  { value: 'INSUFFICIENT_FUNDING', label: 'Initial funding below the product minimum' },
  { value: 'DUPLICATE_APPLICATION', label: 'Duplicate application for the same product' },
  { value: 'OTHER', label: 'Other — explain in the note' },
];

const INFO_CODES = [
  { value: 'NEED_KYC_DOCUMENTS', label: 'KYC documents required' },
  { value: 'NEED_NOMINEE_DETAILS', label: 'Nominee details required' },
  { value: 'NEED_ADDRESS_PROOF', label: 'Address proof required' },
  { value: 'NEED_FUNDING_CONFIRMATION', label: 'Initial funding confirmation required' },
  { value: 'OTHER', label: 'Other — explain in the note' },
];

const OVERRIDE_CODES = [
  { value: 'OVERRIDE_BRANCH_ATTESTATION', label: 'Branch attestation for KYC received' },
  { value: 'OVERRIDE_KYC_IN_PROGRESS', label: 'KYC verification in progress — documents on file' },
  { value: 'OVERRIDE_SENIOR_APPROVAL', label: 'Senior compliance approval obtained' },
];

const DECISION_CODES = [
  ...REASON_CODES,
  ...INFO_CODES.filter((c) => !REASON_CODES.some((r) => r.value === c.value)),
];

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACTIONABLE = ['UNDER_REVIEW', 'PENDING', 'INFO_REQUIRED'];

function productFor(app) {
  if (!app) return null;
  if (app.productSlug) {
    const p = getAccountBySlug(app.productSlug);
    if (p) return p;
  }
  if (app.accountType) {
    return getProductsByCategory('account').find((p) => p.accountType === app.accountType) || null;
  }
  return null;
}

function formatAddress(address) {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  const parts = [address.line1, address.line2, address.city, address.state, address.pin].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function buildChecks(app, customer, product) {
  const checks = [];

  if (!customer) {
    checks.push({ check: 'KYC verified', expected: 'VERIFIED', actual: '—', result: 'Not run' });
  } else {
    checks.push({
      check: 'KYC verified',
      expected: 'VERIFIED',
      actual: customer.kycStatus || '—',
      result: (customer.kycStatus === 'VERIFIED' || customer.kycStatus === 'APPROVED') ? 'Pass' : 'Fail',
    });
  }

  const minimum = product?.amb?.amount ?? product?.minimum ?? null;
  if (!product || minimum === null || minimum === undefined) {
    checks.push({ check: 'Initial funding meets product minimum', expected: '—', actual: formatINR(app.initialFunding), result: 'Not run' });
  } else {
    checks.push({
      check: 'Initial funding meets product minimum',
      expected: formatINR(minimum),
      actual: formatINR(app.initialFunding),
      result: Number(app.initialFunding || 0) >= Number(minimum) ? 'Pass' : 'Fail',
    });
  }

  const nomineeValue = app.nomineeName || app.nominee || app.nomineeDetails || null;
  const nomineeFieldPresent = 'nomineeName' in app || 'nominee' in app || 'nomineeDetails' in app;
  if (!nomineeFieldPresent) {
    checks.push({ check: 'Nominee recorded', expected: 'Nominee name on file', actual: '—', result: 'Not run' });
  } else {
    checks.push({
      check: 'Nominee recorded',
      expected: 'Nominee name on file',
      actual: nomineeValue ? String(nomineeValue) : 'Not recorded',
      result: nomineeValue ? 'Pass' : 'Fail',
    });
  }

  const pan = customer?.pan ? String(customer.pan).toUpperCase() : null;
  if (!pan) {
    checks.push({ check: 'PAN format valid', expected: 'Format ABCDE1234F', actual: '—', result: 'Not run' });
  } else {
    checks.push({
      check: 'PAN format valid',
      expected: 'Format ABCDE1234F',
      actual: maskPan(pan),
      result: PAN_RE.test(pan) ? 'Pass' : 'Fail',
    });
  }
  return checks;
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-900">{children ?? '—'}</dd>
    </div>
  );
}

export default function ManagerAccountsPage() {
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;
  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'AUDIT_COMPLIANCE';
  const { toast } = useToast();
  useDbTick();

  const [tab, setTab] = useState('ALL');
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailId, setDetailId] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  const load = useCallback(async () => {
    try {
      const [all, filtered] = await Promise.all([
        listAccountApplications({}),
        listAccountApplications({ status: tab }),
      ]);
      setAllRows(all);
      setRows(filtered);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || 'Could not load account applications.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const detail = useMemo(
    () => (detailId ? allRows.find((r) => r.id === detailId) || rows.find((r) => r.id === detailId) || null : null),
    [detailId, allRows, rows],
  );

  useEffect(() => {
    setReasonCode('');
    setOverrideReason('');
    setNote('');
    setFormError('');
    setPendingDecision(null);
    setCreatedAccount(null);
  }, [detailId]);

  // Resolve the account created by an approval so its number can be shown.
  useEffect(() => {
    let cancelled = false;
    if (detail?.status === 'APPROVED' && detail.createdAccountId && detail.customerId) {
      getCustomerDetail(detail.customerId)
        .then(({ accounts }) => {
          if (cancelled) return;
          setCreatedAccount((accounts || []).find((a) => a.id === detail.createdAccountId || a.accountId === detail.createdAccountId) || null);
        })
        .catch(() => { if (!cancelled) setCreatedAccount(null); });
    }
    return () => { cancelled = true; };
  }, [detail?.status, detail?.createdAccountId, detail?.customerId]);

  const tabs = TAB_DEFS.map((t) => ({
    ...t,
    count: t.id === 'ALL'
      ? allRows.length
      : t.id === 'UNDER_REVIEW'
        ? allRows.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING').length
        : allRows.filter((r) => r.status === t.id).length,
  }));

  const product = useMemo(() => productFor(detail), [detail]);
  const customer = detail?.customer || null;
  const checks = useMemo(
    () => (detail ? buildChecks(detail, customer, product) : []),
    [detail, customer, product],
  );
  const needsOverride = !!customer && customer.kycStatus !== 'VERIFIED' && customer.kycStatus !== 'APPROVED';
  const actionable = detail ? ACTIONABLE.includes(detail.status) : false;

  const openDecision = (decision) => {
    setFormError('');
    if ((decision === 'REJECTED' || decision === 'INFO_REQUIRED') && !reasonCode) {
      setFormError('Select a reason code before recording this decision.');
      return;
    }
    if (decision === 'APPROVED' && needsOverride && !overrideReason) {
      setFormError('KYC is not verified — select a compliance override reason before approving.');
      return;
    }
    setPendingDecision(decision);
  };

  const confirmDecision = async () => {
    if (!detail || !pendingDecision) return;
    setSubmitting(true);
    try {
      const decision = pendingDecision;
      const result = await decideAccountApplication(detail.id, {
        decision,
        reasonCode: decision === 'APPROVED' ? (needsOverride ? overrideReason : reasonCode || undefined) : reasonCode,
        note: note.trim() || undefined,
        actor: user?.fullName || user?.name || 'Ops Officer',
        actorRole: user?.role || 'ACCOUNT_OPS',
        actorEmail: user?.email,
      });
      setPendingDecision(null);
      setRefreshKey((k) => k + 1);
      if (decision === 'APPROVED') {
        toast({
          title: 'Application approved',
          body: result?.createdAccountId
            ? `Account created (${result.createdAccountId}). It is now active for the customer.`
            : 'The account has been created and is active.',
        });
      } else if (decision === 'REJECTED') {
        toast({ title: 'Application rejected', body: `${detail.id} has been rejected and the customer notified.` });
      } else {
        toast({ title: 'Information requested', body: `${detail.id} is marked Info Required and the customer notified.`, tone: 'info' });
      }
    } catch (err) {
      setPendingDecision(null);
      setFormError(err?.message || 'The decision could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    { key: 'customer', label: 'Customer', render: (r) => r.customer?.fullName || '—' },
    { key: 'productName', label: 'Product', render: (r) => r.productName || productFor(r)?.name || '—' },
    { key: 'initialFunding', label: 'Initial funding', align: 'right', render: (r) => formatINR(r.initialFunding) },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'age', label: 'Age', render: (r) => ageOf(r.submittedAt) },
    {
      key: 'kycStatus',
      label: 'KYC status',
      render: (r) => (r.customer?.kycStatus ? <StatusChip status={r.customer.kycStatus} /> : '—'),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  ];

  const checkColumns = [
    { key: 'check', label: 'Check' },
    { key: 'expected', label: 'Expected' },
    { key: 'actual', label: 'Actual' },
    {
      key: 'result',
      label: 'Status',
      render: (c) => (
        <Badge tone={c.result === 'Pass' ? 'success' : c.result === 'Fail' ? 'danger' : 'neutral'}>{c.result}</Badge>
      ),
    },
  ];

  const decisionLabel = (d) => (d === 'APPROVED' ? 'Approve' : d === 'REJECTED' ? 'Reject' : 'Request Info');

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Account Operations"
        title="Account Applications"
        description="Review new account applications. Approval creates the account immediately and credits the initial funding."
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-5">
        {loadError && <div className="mb-4"><FormError message={loadError} /></div>}
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No applications in this queue"
            body="Applications submitted by customers will appear here for review."
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} />
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Application ${detail.id}`}>
          <div className="absolute inset-0 bg-midnight-950/60" onClick={() => setDetailId(null)} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-modal">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">{detail.id}</h3>
                <p className="text-[13px] text-ink-500">{detail.productName || product?.name || 'Account application'}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={detail.status} />
                <button onClick={() => setDetailId(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800" aria-label="Close review">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h4 className="text-sm font-semibold text-midnight-950">Applicant</h4>
              <dl className="mt-1 divide-y divide-ink-50">
                <DetailRow label="Customer">{customer?.fullName || '—'}</DetailRow>
                <DetailRow label="Customer ref">{detail.customerId || '—'}</DetailRow>
                <DetailRow label="Email">{customer?.email || '—'}</DetailRow>
                <DetailRow label="Mobile">{customer?.mobile || '—'}</DetailRow>
                <DetailRow label="PAN">{customer?.pan ? maskPan(customer.pan) : '—'}</DetailRow>
                <DetailRow label="Date of birth">{customer?.dob ? formatDate(customer.dob) : '—'}</DetailRow>
                <DetailRow label="KYC status">{customer?.kycStatus ? <StatusChip status={customer.kycStatus} /> : '—'}</DetailRow>
                <DetailRow label="Address">{formatAddress(customer?.address)}</DetailRow>
              </dl>

              <h4 className="mt-6 text-sm font-semibold text-midnight-950">Application</h4>
              <dl className="mt-1 divide-y divide-ink-50">
                <DetailRow label="Product">{detail.productName || product?.name || '—'}</DetailRow>
                <DetailRow label="Account type">{detail.accountType ? statusLabel(detail.accountType) : '—'}</DetailRow>
                <DetailRow label="Initial funding">{formatINR(detail.initialFunding)}</DetailRow>
                <DetailRow label="Interest rate">{detail.interestRate !== null && detail.interestRate !== undefined ? `${detail.interestRate}% p.a.` : '—'}</DetailRow>
                <DetailRow label="Submitted">{formatDateTime(detail.submittedAt)}</DetailRow>
                <DetailRow label="Age">{ageOf(detail.submittedAt)}</DetailRow>
              </dl>

              <h4 className="mt-6 text-sm font-semibold text-midnight-950">Checks</h4>
              <div className="mt-2">
                <Table columns={checkColumns} rows={checks} rowKey={(c) => c.check} />
              </div>

              {detail.status === 'APPROVED' && detail.createdAccountId && (
                <div className="mt-6 rounded-lg border border-success-600/25 bg-success-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-success-600">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Account created
                  </p>
                  <dl className="mt-1 divide-y divide-ink-50">
                    <DetailRow label="Account ref">{detail.createdAccountId}</DetailRow>
                    <DetailRow label="Account number">{createdAccount?.accountNumber || '—'}</DetailRow>
                    <DetailRow label="Balance">{createdAccount ? formatINR(createdAccount.balance) : '—'}</DetailRow>
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

            <div className="border-t border-ink-100 px-5 py-4">
              {detail.status === 'REJECTED' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-ink-500">This application was rejected. No further decisions are available.</p>
                  <Button variant="secondary" disabled title="Reopen workflow is not part of this prototype">Reopen</Button>
                </div>
              ) : detail.status === 'APPROVED' ? (
                <p className="text-[13px] text-ink-500">This application was approved and the account has been created. No further decisions are available.</p>
              ) : actionable ? (
                <div className="space-y-3">
                  {needsOverride && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning-600/30 bg-warning-50 px-3 py-2.5 text-sm text-warning-600" role="alert">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        This customer&apos;s KYC is <strong>{customer.kycStatus || 'not verified'}</strong>, not VERIFIED.
                        Approval is only possible as a compliance override with a recorded reason.
                      </span>
                    </div>
                  )}
                  <FormError message={formError} />
                  {needsOverride && (
                    <Field label="Compliance override reason" required>
                      <Select value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}>
                        <option value="">Select an override reason</option>
                        {OVERRIDE_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </Select>
                    </Field>
                  )}
                  <Field label="Reason code" hint="Required for Reject and Request Info.">
                    <Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                      <option value="">Select a reason code</option>
                      {DECISION_CODES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note to customer">
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note recorded with the decision" />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="danger" onClick={() => openDecision('REJECTED')}>Reject</Button>
                    <Button variant="secondary" onClick={() => openDecision('INFO_REQUIRED')}>Request Info</Button>
                    <Button variant="primary" onClick={() => openDecision('APPROVED')}>
                      {needsOverride ? 'Approve with Compliance Override' : 'Approve'}
                    </Button>
                  </div>
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
            <strong className="text-ink-900">{customer?.fullName || '—'}</strong> ({detail?.productName || product?.name || '—'}).
          </p>
          {pendingDecision === 'APPROVED' && <p>Approval creates the account immediately and credits the initial funding of {formatINR(detail?.initialFunding)}.</p>}
          {pendingDecision === 'APPROVED' && needsOverride && (
            <p className="font-medium text-warning-600">This is a compliance override — KYC is not VERIFIED. Override reason: {OVERRIDE_CODES.find((c) => c.value === overrideReason)?.label || overrideReason}.</p>
          )}
          {(pendingDecision === 'REJECTED' || pendingDecision === 'INFO_REQUIRED') && (
            <p>Reason: {[...REASON_CODES, ...INFO_CODES].find((c) => c.value === reasonCode)?.label || reasonCode}. The customer will be notified.</p>
          )}
          {note.trim() && <p>Note: {note.trim()}</p>}
        </div>
      </Modal>
    </div>
  );
}
