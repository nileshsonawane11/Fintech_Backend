import { ConfirmationCheckmark } from '../../../components/common/ConfirmationCheckmark.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeIndianRupee, CheckCircle2, Landmark, Users } from 'lucide-react';
import { Badge, Button, Card, Field, FormError, Input, PageLoading, SectionHeader, Select, Stepper, Tabs } from '../../../components/ui.jsx';
import { formatDateTime, formatINR, maskAccount } from '../../../lib/format.js';
import { RAILS, listAccounts, listBeneficiaries, transfer } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { accountLabel } from './AccountsSection.jsx';

export default function TransfersPage() {
  const { user } = useAuth();
  useDbTick();
  const location = useLocation();

  const [accounts, setAccounts] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [step, setStep] = useState('fill'); // fill | review | receipt
  const [fromAccountId, setFromAccountId] = useState('');
  const [destTab, setDestTab] = useState('BENEFICIARY'); // BENEFICIARY | OWN
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [ownAccountId, setOwnAccountId] = useState('');
  const [railId, setRailId] = useState('INTERNAL');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const loadData = () => {
    if (!user?.customerId) return;
    Promise.all([listAccounts(user.customerId), listBeneficiaries(user.customerId)])
      .then(([accs, bens]) => {
        setAccounts(accs);
        setBeneficiaries(bens);
        setFromAccountId((prev) => prev || accs[0]?.id || '');

        // Preselect beneficiary if passed via location state or query
        const queryParams = new URLSearchParams(location.search);
        const preselectBeneId = location.state?.beneficiaryId || queryParams.get('beneficiaryId');
        if (preselectBeneId && bens.some((b) => b.id === preselectBeneId)) {
          setDestTab('BENEFICIARY');
          setBeneficiaryId(preselectBeneId);
        }
      })
      .catch((e) => setLoadError(e.message || 'We could not load your accounts.'));
  };

  useEffect(loadData, [user?.customerId, location]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromAccount = useMemo(() => (accounts || []).find((a) => a.id === fromAccountId) || null, [accounts, fromAccountId]);
  const beneficiary = useMemo(() => (beneficiaries || []).find((b) => b.id === beneficiaryId) || null, [beneficiaries, beneficiaryId]);
  const ownAccount = useMemo(() => (accounts || []).find((a) => a.id === ownAccountId) || null, [accounts, ownAccountId]);
  const ownOptions = useMemo(() => (accounts || []).filter((a) => a.id !== fromAccountId), [accounts, fromAccountId]);

  // Determine if destination is FinEdge Bank
  const isFinEdgeDest = useMemo(() => {
    if (destTab === 'OWN') return true;
    if (!beneficiary) return false;
    const ifsc = (beneficiary.ifsc || beneficiary.ifscCode || '').toUpperCase();
    const bank = (beneficiary.bankName || '').toLowerCase();
    return ifsc.startsWith('FEDG') || bank.includes('finedge');
  }, [destTab, beneficiary]);

  // Auto-switch rail when destination changes
  useEffect(() => {
    if (isFinEdgeDest) {
      if (railId !== 'INTERNAL') {
        setRailId('INTERNAL');
      }
    } else {
      if (railId === 'INTERNAL') {
        setRailId('IMPS');
      }
    }
  }, [isFinEdgeDest, railId]);

  const rail = useMemo(() => RAILS.find((r) => r.id === railId) || RAILS[0], [railId]);

  const amountNum = Number(amount);
  const amountValid = amount !== '' && Number.isFinite(amountNum) && amountNum > 0;
  const totalDebit = amountValid ? Math.round((amountNum + rail.charge) * 100) / 100 : 0;

  const validate = () => {
    const next = {};
    if (!fromAccount) next.fromAccountId = 'Choose the account to pay from.';
    if (destTab === 'BENEFICIARY' && !beneficiary) next.beneficiaryId = 'Choose a beneficiary.';
    if (destTab === 'OWN') {
      if (!ownAccount) next.ownAccountId = 'Choose one of your other accounts.';
      else if (ownAccount.id === fromAccountId) next.ownAccountId = 'Choose a different account from the source.';
    }

    // Rail eligibility validation
    if (isFinEdgeDest && railId !== 'INTERNAL') {
      next.rail = 'Only internal transfer is available for FinEdge destinations.';
    } else if (!isFinEdgeDest && railId === 'INTERNAL') {
      next.rail = 'Internal transfer is available only for FinEdge Bank accounts.';
    }

    if (!amountValid) next.amount = 'Enter an amount greater than zero.';
    else if (fromAccount) {
      if (amountNum > rail.limit) next.amount = `This exceeds the ${rail.id} limit of ${formatINR(rail.limit)} per transfer.`;
      else if (totalDebit > Number(fromAccount.balance)) next.amount = `Insufficient balance — amount plus charges (${formatINR(totalDebit)}) is more than your available balance of ${formatINR(fromAccount.balance)}.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goReview = () => {
    setFormError('');
    if (validate()) setStep('review');
  };

  const confirmTransfer = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const result = await transfer({
        customerId: user.customerId,
        fromAccountId,
        destinationType: destTab,
        destinationId: destTab === 'OWN' ? ownAccountId : beneficiaryId,
        amount: amountNum,
        railId,
        note: note.trim() || undefined,
      });
      setReceipt(result);
      setStep('receipt');
    } catch (e) {
      setFormError(e.message || 'The transfer could not be completed. Please review the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const makeAnother = () => {
    setAmount('');
    setNote('');
    setErrors({});
    setFormError('');
    setReceipt(null);
    setStep('fill');
    loadData();
  };

  if ((!accounts || !beneficiaries) && !loadError) return <PageLoading />;

  const stepState = (name) => {
    const order = ['fill', 'review', 'receipt'];
    if (order.indexOf(step) > order.indexOf(name)) return 'done';
    if (step === name) return 'current';
    return 'upcoming';
  };

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Payments"
        title="Transfer money"
        description="Move money to a beneficiary or between your own FinEdge accounts. External rails (UPI, IMPS, NEFT) are simulations in this prototype — no real money leaves FinEdge."
      />

      <FormError message={loadError} />

      <div className="mb-6 px-1">
        <Stepper horizontalOnMobile steps={[
          { label: 'Fill details', state: stepState('fill') },
          { label: 'Review', state: stepState('review') },
          { label: 'Receipt', state: stepState('receipt') },
        ]} />
      </div>

      {step === 'receipt' && receipt ? (
        <Card className="animate-scale-in px-5 py-6">
          <div className="flex items-start gap-3">
            <ConfirmationCheckmark size={44} className="shrink-0" />
            <div>
              <h2 className="font-display text-xl font-semibold text-midnight-950">Transfer completed</h2>
              <p className="mt-1 text-sm text-ink-600">
                {formatINR(receipt.amount)} has been sent to {receipt.toName || '—'}.
              </p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-ink-100 border-y border-ink-100 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Reference</dt>
              <dd className="tnum font-semibold text-ink-900">{receipt.reference || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Amount</dt>
              <dd className="tnum font-semibold text-ink-900">{formatINR(receipt.amount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">To</dt>
              <dd className="font-medium text-ink-900">{receipt.toName || '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">From</dt>
              <dd className="tnum font-medium text-ink-900">{maskAccount(receipt.fromAccount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Rail</dt>
              <dd className="flex items-center gap-2 font-medium text-ink-900">
                {receipt.rail || '—'}
                {receipt.simulated && <Badge tone="warning">Simulation</Badge>}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Charges</dt>
              <dd className="tnum font-medium text-ink-900">{receipt.charges ? formatINR(receipt.charges) : 'Free'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Total debited</dt>
              <dd className="tnum font-medium text-ink-900">{formatINR(receipt.totalDebit)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Balance after transfer</dt>
              <dd className="tnum font-semibold text-midnight-900">{formatINR(receipt.balanceAfter)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Date &amp; time</dt>
              <dd className="font-medium text-ink-900">{formatDateTime(receipt.at)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={makeAnother}>Make another transfer</Button>
            <Link to={`/portal/accounts/${fromAccountId}`}>
              <Button variant="secondary">View account</Button>
            </Link>
          </div>
        </Card>
      ) : step === 'review' ? (
        <Card className="px-5 py-5">
          <h2 className="font-display text-xl font-semibold text-midnight-950">Review your transfer</h2>
          <p className="mt-1 text-sm text-ink-600">Check every detail before you confirm. The money moves as soon as you confirm.</p>

          <dl className="mt-5 divide-y divide-ink-100 border-y border-ink-100 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">From</dt>
              <dd className="tnum text-right font-medium text-ink-900">
                {fromAccount ? `${accountLabel(fromAccount)} · ${maskAccount(fromAccount.accountNumber)}` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">To</dt>
              <dd className="text-right font-medium text-ink-900">
                {destTab === 'OWN'
                  ? (ownAccount ? `${accountLabel(ownAccount)} · ${maskAccount(ownAccount.accountNumber)}` : '—')
                  : (beneficiary ? (
                    <span>
                      {beneficiary.name}
                      <span className="tnum block text-[13px] font-normal text-ink-500">
                        {beneficiary.bankName || '—'} · {maskAccount(beneficiary.accountNumber)}
                      </span>
                    </span>
                  ) : '—')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Rail</dt>
              <dd className="flex items-center gap-2 font-medium text-ink-900">
                {rail.label}
                {rail.simulated && <Badge tone="warning">Simulation</Badge>}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Amount</dt>
              <dd className="tnum font-medium text-ink-900">{formatINR(amountNum)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-500">Charges</dt>
              <dd className="tnum font-medium text-ink-900">{rail.charge ? formatINR(rail.charge) : 'Free'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-semibold text-ink-800">Total debit</dt>
              <dd className="tnum font-display text-lg font-semibold text-midnight-950">{formatINR(totalDebit)}</dd>
            </div>
            {note.trim() && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-ink-500">Note</dt>
                <dd className="text-right font-medium text-ink-900">{note.trim()}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4">
            <FormError message={formError} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => { setFormError(''); setStep('fill'); }} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to details
            </Button>
            <Button onClick={confirmTransfer} loading={submitting}>
              Confirm &amp; Transfer {formatINR(totalDebit)}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="px-5 py-5">
          <div className="grid gap-5">
            <Field label="From account" required error={errors.fromAccountId}>
              <Select
                value={fromAccountId}
                error={errors.fromAccountId}
                onChange={(e) => { setFromAccountId(e.target.value); if (e.target.value === ownAccountId) setOwnAccountId(''); }}
              >
                <option key="default-from" value="" disabled>Choose an account</option>
                {(accounts || []).map((a) => (
                  <option key={a.accountId || a.id || a.accountNumber} value={a.accountId || a.id}>
                    {accountLabel(a)} · {maskAccount(a.accountNumber)} · {formatINR(a.balance)}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-700">Send to</p>
              <Tabs
                tabs={[
                  { id: 'BENEFICIARY', label: 'Beneficiary' },
                  { id: 'OWN', label: 'Own account' },
                ]}
                active={destTab}
                onChange={(t) => setDestTab(t)}
              />
              <div className="pt-4">
                {destTab === 'BENEFICIARY' ? (
                  (beneficiaries || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-ink-200 bg-porcelain-50 px-4 py-4 text-sm text-ink-600">
                      <p className="flex items-center gap-2 font-medium text-ink-800"><Users className="h-4 w-4 text-midnight-700" aria-hidden /> No beneficiaries yet</p>
                      <p className="mt-1 text-[13px]">Add the person or business you want to pay first, then come back here to send money.</p>
                      <Link to="/portal/beneficiaries" className="mt-2 inline-block font-semibold text-midnight-800 underline decoration-gold-400 decoration-2 underline-offset-2 hover:text-midnight-600">
                        Add a beneficiary
                      </Link>
                    </div>
                  ) : (
                    <Field label="Beneficiary" required error={errors.beneficiaryId}>
                      <Select value={beneficiaryId} error={errors.beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
                        <option key="default-bene" value="" disabled>Choose a beneficiary</option>
                        {(beneficiaries || []).map((b) => (
                          <option key={b.beneficiaryId || b.id || b.accountNumber} value={b.beneficiaryId || b.id}>
                            {b.name} · {b.bankName || '—'} · {maskAccount(b.accountNumber)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )
                ) : ownOptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ink-200 bg-porcelain-50 px-4 py-4 text-sm text-ink-600">
                    <p className="flex items-center gap-2 font-medium text-ink-800"><Landmark className="h-4 w-4 text-midnight-700" aria-hidden /> No other account to move money to</p>
                    <p className="mt-1 text-[13px]">You only have one FinEdge account, so there is no second account to transfer into.</p>
                  </div>
                ) : (
                  <Field label="Your account" required error={errors.ownAccountId}>
                    <Select value={ownAccountId} error={errors.ownAccountId} onChange={(e) => setOwnAccountId(e.target.value)}>
                      <option key="default-own" value="" disabled>Choose an account</option>
                      {ownOptions.map((a) => (
                        <option key={a.accountId || a.id || a.accountNumber} value={a.accountId || a.id}>
                          {accountLabel(a)} · {maskAccount(a.accountNumber)} · {formatINR(a.balance)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-700">Transfer rail</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Transfer rail">
                {RAILS.map((r) => {
                  const selected = railId === r.id;
                  const isEligible = isFinEdgeDest ? r.id === 'INTERNAL' : r.id !== 'INTERNAL';
                  const ineligibilityReason = isFinEdgeDest
                    ? 'Beneficiary is with FinEdge Bank (internal transfer only)'
                    : 'Internal transfer is available only for FinEdge Bank accounts';

                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!isEligible}
                      onClick={() => { if (isEligible) setRailId(r.id); }}
                      className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
                        !isEligible
                          ? 'border-ink-100 bg-porcelain-100 opacity-60 cursor-not-allowed'
                          : selected
                          ? 'border-midnight-600 bg-midnight-50'
                          : 'border-ink-200 bg-white hover:border-midnight-300 cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink-900">{r.label}</span>
                        {r.simulated && <Badge tone="warning">Simulation</Badge>}
                      </span>
                      <span className="tnum mt-1 block text-[13px] text-ink-500">
                        {r.charge ? `Charge ${formatINR(r.charge)}` : 'No charge'} · Limit {formatINR(r.limit)} per transfer
                      </span>
                      {!isEligible && (
                        <span className="mt-1 block text-xs text-ink-500 font-medium">
                          {ineligibilityReason}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.rail && <p className="mt-1 text-xs text-danger-600">{errors.rail}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Amount"
                required
                error={errors.amount}
                hint={fromAccount ? `Available balance ${formatINR(fromAccount.balance)}${rail.charge ? ` · ${rail.id} charge ${formatINR(rail.charge)}` : ''}` : undefined}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-ink-500" aria-hidden>
                    <BadgeIndianRupee className="h-4 w-4" />
                  </span>
                  <Input
                    className="tnum pl-9"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    error={errors.amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Note (optional)" hint="Shown on both statements.">
                <Input value={note} maxLength={80} placeholder="e.g. Monthly rent" onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>

            {amountValid && !errors.amount && (
              <p className="tnum rounded-lg bg-porcelain-100 px-3.5 py-2.5 text-[13px] text-ink-700">
                Total debit from your account: <span className="font-semibold text-midnight-950">{formatINR(totalDebit)}</span>
                {rail.charge > 0 && <span> (amount {formatINR(amountNum)} + charge {formatINR(rail.charge)})</span>}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={goReview}>
                Review transfer <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <span className="text-[13px] text-ink-500">You will confirm on the next step — nothing moves yet.</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
