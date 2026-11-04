import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, TrendingUp, Search, X, Check, AlertCircle } from 'lucide-react';
import {
  Button, EmptyState, Field, FormError, Input, Modal, PageLoading,
  SectionHeader, Select, StatusChip, Stepper, Table, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { formatDate, formatDateTime, formatINR, formatINRWhole, statusLabel } from '../../../lib/format.js';
import { decideInvestmentApplication, bookInvestmentApplication, listInvestmentApplications } from '../../../services/managerBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const TAB_DEFS = [
  { id: 'ALL', label: 'All' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'BOOKED', label: 'Booked' },
  { id: 'REJECTED', label: 'Rejected' },
];

const REJECT_CODES = [
  { value: 'KYC_NOT_VERIFIED', label: 'KYC documents could not be verified' },
  { value: 'PAN_INELIGIBLE', label: 'PAN status invalid or inoperative' },
  { value: 'AGE_INELIGIBLE', label: 'Applicant / child age criteria not met' },
  { value: 'FUNDING_UNVERIFIED', label: 'Funding account balance / status unverified' },
  { value: 'OTHER', label: 'Other — explain in the remarks' },
];

const ACTIONABLE = ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION'];

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink-100/60 last:border-b-0">
      <dt className="text-[13px] text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-900">{children ?? '—'}</dd>
    </div>
  );
}

export default function ManagerInvestmentsSection() {
  const { user } = useAuth();
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
  const [pendingDecision, setPendingDecision] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await listInvestmentApplications({ status: tab, query });
      setRows(data);
      if (!query && tab === 'ALL') setAllRows(data);
    } catch (err) {
      setLoadError(err?.message || 'Could not load investment applications.');
    } finally {
      setLoading(false);
    }
  }, [tab, query, refreshKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = useMemo(() => {
    return TAB_DEFS.map((t) => {
      let count = 0;
      if (t.id === 'ALL') {
        count = allRows.length;
      } else {
        count = allRows.filter((r) => (r.status || '').toUpperCase() === t.id).length;
      }
      return { id: t.id, label: t.label, count };
    });
  }, [allRows]);

  const detail = useMemo(() => {
    if (!detailId) return null;
    return rows.find((r) => (r.applicationId || r.id) === detailId) || null;
  }, [detailId, rows]);

  const handleDecision = async (decision) => {
    if (!detail) return;
    setSubmitting(true);
    setFormError('');
    try {
      const updated = await decideInvestmentApplication(detail.id, {
        decision,
        reasonCode: reasonCode || undefined,
        note: decisionNote || undefined,
        actor: user?.name || 'Branch Manager',
      });
      setRefreshKey((k) => k + 1);
      setPendingDecision(null);
      setReasonCode('');
      setDecisionNote('');
      toast({
        title: decision === 'APPROVED' ? 'Application approved' : 'Application rejected',
        body:
          decision === 'APPROVED'
            ? `${detail.id} has been approved and moved to booking stage.`
            : `${detail.id} has been rejected.`,
        tone: decision === 'APPROVED' ? 'success' : 'info',
      });
    } catch (err) {
      setFormError(err?.message || 'The decision could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = async () => {
    if (!detail) return;
    setSubmitting(true);
    setFormError('');
    try {
      await bookInvestmentApplication(detail.id, { actor: user?.name || 'Branch Manager' });
      setRefreshKey((k) => k + 1);
      toast({
        title: 'Investment booked',
        body: `${detail.id} has been formally booked into core banking records.`,
        tone: 'success',
      });
    } catch (err) {
      setFormError(err?.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Ref', render: (r) => <span className="font-medium text-midnight-900">{r.id}</span> },
    { key: 'applicant', label: 'Applicant / Customer', render: (r) => r.applicant?.fullName || r.applicantName || r.fullName || '—' },
    { key: 'product', label: 'Product', render: (r) => r.productName || '—' },
    { key: 'kind', label: 'Kind', render: (r) => <span className="font-semibold text-midnight-800">{r.kind}</span> },
    {
      key: 'keyFigure',
      label: 'Investment Details',
      render: (r) => {
        const d = r.investmentDetails || {};
        if (r.kind === 'FD') {
          return `${formatINR(d.depositAmount || d.amount)} · ${d.tenureBand || '—'} · ${d.appliedRate ? d.appliedRate + '% p.a.' : '—'}`;
        }
        if (r.kind === 'RD') {
          return `${formatINR(d.monthlyDeposit || d.monthlyAmount)}/mo · ${d.tenureBand || '—'}`;
        }
        if (r.kind === 'SIP') {
          return `${d.fundCategory || 'Mutual Fund'} · ${formatINR(d.monthlyInvestment || d.monthlyAmount)}/mo (Day ${d.sipDate || 5})`;
        }
        if (r.kind === 'SSY') {
          return `${formatINR(d.annualDeposit)}/yr · Child: ${d.childName || '—'}`;
        }
        return '—';
      },
    },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    {
      key: 'action',
      label: '',
      render: (r) => (
        <button
          type="button"
          onClick={() => setDetailId(r.applicationId || r.id)}
          className="text-xs font-semibold text-midnight-800 hover:text-midnight-600 hover:underline"
        >
          View details
        </button>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        titleAs="h1"
        eyebrow="Investment Operations"
        title="Investment Applications"
        description="Review incoming deposit and scheme applications, verify compliance and KYC criteria, and issue bookings."
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <Input
          className="pl-9"
          placeholder="Search by reference, applicant, kind or product"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search investment applications"
        />
      </div>

      <div className="mt-5">
        {loadError && <div className="mb-4"><FormError message={loadError} /></div>}
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investment applications in this queue"
            body="New applications for FD, RD, SIP and SSY submitted via the portal will appear here."
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(r) => r.applicationId || r.id} />
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {detail && (
        <Modal
          open={Boolean(detail)}
          onClose={() => setDetailId(null)}
          title={`Investment Application: ${detail.id}`}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
              <div>
                <p className="text-base font-semibold text-midnight-950">{detail.productName}</p>
                <p className="text-xs text-ink-500">Submitted {formatDateTime(detail.submittedAt)}</p>
              </div>
              <StatusChip status={detail.status} />
            </div>

            {/* Stepper */}
            {Array.isArray(detail.steps) && detail.steps.length > 0 && (
              <div className="py-2">
                <Stepper
                  steps={detail.steps.map((s) => ({
                    label: s.label,
                    state: s.state,
                    date: s.date ? formatDate(s.date) : undefined,
                  }))}
                />
              </div>
            )}

            {/* Investment Details Specific to Kind */}
            <div className="rounded-xl border border-ink-100 bg-porcelain-50/70 p-4">
              <h4 className="font-display text-sm font-semibold text-midnight-950 mb-3">
                {detail.kind} Investment Terms
              </h4>
              <dl className="divide-y divide-ink-100/50">
                {detail.kind === 'FD' && (
                  <>
                    <DetailRow label="Principal Deposit">{formatINR(detail.investmentDetails?.depositAmount)}</DetailRow>
                    <DetailRow label="Tenure Band">{detail.investmentDetails?.tenureBand}</DetailRow>
                    <DetailRow label="Rate Applied">
                      {detail.investmentDetails?.appliedRate}% p.a.
                      {detail.investmentDetails?.isSeniorCitizen ? ' (Senior citizen 60+ rate)' : ' (General rate)'}
                    </DetailRow>
                    <DetailRow label="Interest Payout">{detail.investmentDetails?.payoutOption || 'Cumulative'}</DetailRow>
                    <DetailRow label="Maturity Value">{formatINR(detail.investmentDetails?.maturityValue)}</DetailRow>
                    <DetailRow label="Auto-Renewal">{detail.investmentDetails?.autoRenew ? 'Yes (Opted in)' : 'No'}</DetailRow>
                  </>
                )}
                {detail.kind === 'RD' && (
                  <>
                    <DetailRow label="Monthly Instalment">{formatINR(detail.investmentDetails?.monthlyDeposit)}</DetailRow>
                    <DetailRow label="Tenure Band">{detail.investmentDetails?.tenureBand}</DetailRow>
                    <DetailRow label="Rate Applied">{detail.investmentDetails?.appliedRate}% p.a.</DetailRow>
                    <DetailRow label="Monthly Debit Date">Day {detail.investmentDetails?.debitDate} of every month</DetailRow>
                    <DetailRow label="Total Deposited">{formatINR(detail.investmentDetails?.totalDeposited)}</DetailRow>
                    <DetailRow label="Maturity Value">{formatINR(detail.investmentDetails?.maturityValue)}</DetailRow>
                  </>
                )}
                {detail.kind === 'SIP' && (
                  <>
                    <DetailRow label="Fund Category">{detail.investmentDetails?.fundCategory}</DetailRow>
                    <DetailRow label="Risk Classification">{detail.investmentDetails?.riskLevel}</DetailRow>
                    <DetailRow label="Monthly SIP Amount">{formatINR(detail.investmentDetails?.monthlyInvestment)}</DetailRow>
                    <DetailRow label="SIP Debit Date">Day {detail.investmentDetails?.sipDate} of every month</DetailRow>
                    <DetailRow label="Investment Duration">{detail.investmentDetails?.durationYears} years</DetailRow>
                    <DetailRow label="Annual Step-up">{detail.investmentDetails?.stepUp || 'None'}</DetailRow>
                    <DetailRow label="Assumed Return">{detail.investmentDetails?.assumedReturnPct}% p.a. (Illustration)</DetailRow>
                    <DetailRow label="Projected Value (Illustration)">{formatINR(detail.investmentDetails?.projectedValue)}</DetailRow>
                  </>
                )}
                {detail.kind === 'SSY' && (
                  <>
                    <DetailRow label="Guardian Name">{detail.investmentDetails?.guardianName || detail.applicant?.fullName}</DetailRow>
                    <DetailRow label="Relationship to Child">{detail.investmentDetails?.guardianRelationship}</DetailRow>
                    <DetailRow label="Guardian Date of Birth">{detail.investmentDetails?.guardianDob || detail.applicant?.dob}</DetailRow>
                    <DetailRow label="Girl Child Name">{detail.investmentDetails?.childName}</DetailRow>
                    <DetailRow label="Girl Child Date of Birth">{detail.investmentDetails?.childDob}</DetailRow>
                    <DetailRow label="Annual Deposit Amount">{formatINR(detail.investmentDetails?.annualDeposit)} / financial year</DetailRow>
                    <DetailRow label="Statutory Rate">{detail.investmentDetails?.statutoryRate || '8.05% p.a. (Illustrative)'}</DetailRow>
                    <DetailRow label="Maturity Value at 21 Years">{formatINR(detail.investmentDetails?.maturityValue)}</DetailRow>
                  </>
                )}
              </dl>
            </div>

            {/* Applicant Identity */}
            <div className="rounded-xl border border-ink-100 bg-porcelain-50/70 p-4">
              <h4 className="font-display text-sm font-semibold text-midnight-950 mb-3">Applicant & Funding</h4>
              <dl className="divide-y divide-ink-100/50">
                <DetailRow label="Full Name">{detail.applicant?.fullName || detail.fullName}</DetailRow>
                <DetailRow label="Mobile Number">{detail.applicant?.mobileNumber || detail.mobileNumber}</DetailRow>
                <DetailRow label="Email Address">{detail.applicant?.email || detail.email}</DetailRow>
                <DetailRow label="Date of Birth">{detail.applicant?.dob || 'On file'}</DetailRow>
                <DetailRow label="PAN">{detail.applicant?.panNumber || 'On file'}</DetailRow>
                <DetailRow label="Funding Account">
                  {detail.fundingAccount?.noFinEdgeAccountYet
                    ? 'No FinEdge account yet (New customer path)'
                    : detail.fundingAccount?.accountId || detail.fundingAccount?.accountNumber || 'Operative Account'}
                </DetailRow>
              </dl>
            </div>

            {/* Nominee Block if present */}
            {detail.nominee && detail.nominee.fullName && (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50/70 p-4">
                <h4 className="font-display text-sm font-semibold text-midnight-950 mb-3">Nominee Details</h4>
                <dl className="divide-y divide-ink-100/50">
                  <DetailRow label="Nominee Name">{detail.nominee.fullName}</DetailRow>
                  <DetailRow label="Relationship">{detail.nominee.relationship}</DetailRow>
                  {detail.nominee.dateOfBirth && <DetailRow label="Date of Birth">{detail.nominee.dateOfBirth}</DetailRow>}
                </dl>
              </div>
            )}

            {/* Decision Actions */}
            {formError && <FormError message={formError} />}

            {ACTIONABLE.includes((detail.status || '').toUpperCase()) && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-ink-100">
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setPendingDecision('REJECTED')}
                  className="text-danger-700 hover:bg-danger-50 hover:text-danger-800"
                >
                  Reject Application
                </Button>
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => handleDecision('APPROVED')}
                >
                  Approve Application
                </Button>
              </div>
            )}

            {detail.status === 'APPROVED' && (
              <div className="flex items-center justify-between pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-600">Application approved. Ready for core system booking.</span>
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={handleBook}
                >
                  Book Investment
                </Button>
              </div>
            )}

            {detail.status === 'BOOKED' && (
              <div className="rounded-lg bg-success-50 p-3 text-xs text-success-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span>This investment is fully booked and active in the bank ledger.</span>
              </div>
            )}

            {detail.status === 'REJECTED' && (
              <div className="rounded-lg bg-danger-50 p-3 text-xs text-danger-800">
                <p className="font-semibold">Application Rejected</p>
                <p className="mt-0.5">{detail.decisionReason || 'Criteria not met.'}</p>
                {detail.decidedBy && <p className="mt-0.5 text-danger-600">Decided by: {detail.decidedBy}</p>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {pendingDecision === 'REJECTED' && (
        <Modal
          open={Boolean(pendingDecision)}
          onClose={() => setPendingDecision(null)}
          title="Reject Investment Application"
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              Please specify the formal reason for rejecting application <strong>{detail?.id}</strong>.
            </p>
            <Field label="Rejection Reason" required>
              <Select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                options={[{ value: '', label: 'Select a reason code' }, ...REJECT_CODES]}
              />
            </Field>
            <Field label="Staff Remarks / Note">
              <Textarea
                rows={3}
                placeholder="Explain the rejection decision for audit logs and customer communication..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
              />
            </Field>
            {formError && <FormError message={formError} />}
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setPendingDecision(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDecision('REJECTED')}
                disabled={submitting || !reasonCode}
                className="bg-danger-600 hover:bg-danger-700"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
