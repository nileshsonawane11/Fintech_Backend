import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Info, Landmark, PiggyBank, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Button, Card, EmptyState, Field, FormError, Input, PageLoading,
  SectionHeader, Select, StatusChip, Table, Tabs, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatINR, maskAccount } from '../../../lib/format.js';
import { calculateFD, calculateRD, calculateSIP, calculateSSY } from '../../../lib/finance.js';
import { FD, RD, SIP, SSY } from '../../../data/products.js';
import { listAccounts, getMyProfile } from '../../../services/portalBridge.js';
import { bookFd, bookRd, listHoldings, openSsy, startSip } from '../../../services/portalBridge.js';

const KIND_META = {
  FD: { label: 'Fixed Deposits', icon: Landmark },
  RD: { label: 'Recurring Deposits', icon: CalendarClock },
  SIP: { label: 'SIP — Mutual Funds', icon: TrendingUp },
  SSY: { label: 'Sukanya Samriddhi Yojana', icon: ShieldCheck },
};
const KIND_ORDER = ['FD', 'RD', 'SIP', 'SSY'];

// Representative tenure (months) for each FD rate-grid slab / RD band, used
// for the maturity projection and the booking call.
const FD_TENURE_MONTHS = [1, 3, 9, 18, 30, 48, 84];
const RD_TENURE_MONTHS = [12, 18, 36, 60];

function kindOf(h) {
  return String(h.kind || h.type || '').toUpperCase();
}
function monthlyOf(h) {
  return h.monthly ?? h.monthlyAmount ?? null;
}

function AccountOptions({ accounts }) {
  return accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {(a.productName || a.type || 'Account')} · {maskAccount(a.accountNumber)} · {formatINR(a.balance)}
    </option>
  ));
}

function useFirstAccount(accounts, accountId, setAccountId) {
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId, setAccountId]);
}

function PreviewBox({ rows, note }) {
  return (
    <div className="rounded-lg border border-midnight-200 bg-midnight-50 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-xs font-medium text-ink-500">{r.label}</p>
            <p className="tnum text-sm font-semibold text-midnight-950">{r.value}</p>
          </div>
        ))}
      </div>
      {note && <p className="mt-2 text-xs leading-relaxed text-ink-500">{note}</p>}
    </div>
  );
}

/* ------------------------------ FD form ------------------------------ */

function FdForm({ customerId, accounts, profile, onBooked }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('100000');
  const [gridIdx, setGridIdx] = useState(3);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFirstAccount(accounts, accountId, setAccountId);

  // Senior rate is derived from customer DOB in profile
  const customerAge = useMemo(() => {
    const dob = profile?.customer?.dob;
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }, [profile?.customer?.dob]);

  const isSenior = customerAge !== null && customerAge >= 60;
  const entry = FD.rateGrid[gridIdx] || FD.rateGrid[0];
  const rate = isSenior ? entry.senior : entry.general;
  const tenureMonths = FD_TENURE_MONTHS[gridIdx] || 12;
  const amt = Number(amount) || 0;

  const preview = useMemo(() => {
    try {
      if (amt <= 0) return null;
      return calculateFD({ principal: amt, annualRatePct: rate, tenureMonths });
    } catch { return null; }
  }, [amt, rate, tenureMonths]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!accountId) next.accountId = 'Choose a funding account.';
    if (!(amt >= FD.minAmount)) next.amount = `Minimum deposit is ${formatINR(FD.minAmount)}.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    traceForm('InvestmentApplication', { kind: 'FD', accountId, amount: amt, tenureMonths, rate });
    setSubmitting(true);
    setFormError('');
    try {
      const inv = await bookFd(customerId, {
        accountId,
        amount: amt,
        tenureMonths,
        rate,
        seniorCitizen: isSenior,
        productName: FD.name,
        maturityAmount: preview?.maturityValue,
        maturityDate: new Date(Date.now() + tenureMonths * 30 * 24 * 3600 * 1000).toISOString()
      });
      toast({ title: 'Fixed deposit booked', body: `${formatINR(amt)} for ${tenureMonths} months at ${rate.toFixed(2)}% p.a. · Ref ${inv.id}` });
      onBooked();
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Server not connected — bypassed for now');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Funding account" required error={errors.accountId}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            <AccountOptions accounts={accounts} />
          </Select>
        </Field>
        <Field label="Deposit amount" required error={errors.amount} hint={`Minimum ${formatINR(FD.minAmount)}`}>
          <Input type="number" min={FD.minAmount} step="100" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        </Field>
        <Field label="Tenure" required hint="Exact tenure locked at booking.">
          <Select value={gridIdx} onChange={(e) => setGridIdx(Number(e.target.value))}>
            {FD.rateGrid.map((g, i) => (
              <option key={g.tenure} value={i}>
                {FD_TENURE_MONTHS[i]} months — {g.tenure} band — {(isSenior ? g.senior : g.general).toFixed(2)}% p.a.
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Interest rate">
          <div className="flex h-[42px] items-center rounded-lg border border-ink-200 bg-porcelain-100 px-3 text-sm font-semibold text-midnight-900">
            {rate.toFixed(2)}% p.a.
          </div>
        </Field>
      </div>

      {customerAge !== null && isSenior && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          Senior citizen rate applied automatically based on your verified age ({customerAge} years, 60+).
        </div>
      )}
      {customerAge !== null && !isSenior && (
        <p className="text-[13px] text-ink-500">
          General citizen rate applied based on your verified date of birth ({customerAge} years).
        </p>
      )}
      {customerAge === null && (
        <p className="text-[13px] text-ink-500">
          Standard rate applied. Complete your KYC to verify date of birth for senior citizen rates.
        </p>
      )}

      {preview && (
        <PreviewBox
          rows={[
            { label: 'You deposit', value: formatINR(preview.principal) },
            { label: 'Interest earned', value: formatINR(preview.interestEarned) },
            { label: 'Maturity value', value: formatINR(preview.maturityValue) },
          ]}
          note={FD.disclosure}
        />
      )}
      <Button type="submit" loading={submitting} disabled={accounts.length === 0}>Book fixed deposit</Button>
    </form>
  );
}

/* ------------------------------ RD form ------------------------------ */

function RdForm({ customerId, accounts, onBooked }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [monthly, setMonthly] = useState('5000');
  const [bandIdx, setBandIdx] = useState(1);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFirstAccount(accounts, accountId, setAccountId);

  const band = RD.rateBands[bandIdx] || RD.rateBands[0];
  const rate = band.rate;
  const tenureMonths = RD_TENURE_MONTHS[bandIdx] || 12;
  const m = Number(monthly) || 0;

  const preview = useMemo(() => {
    try {
      if (m <= 0) return null;
      return calculateRD({ monthlyDeposit: m, annualRatePct: rate, tenureMonths });
    } catch { return null; }
  }, [m, rate, tenureMonths]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!accountId) next.accountId = 'Choose a funding account.';
    if (!(m >= RD.minMonthly)) next.monthly = `Minimum monthly deposit is ${formatINR(RD.minMonthly)}.`;
    else if (m % 100 !== 0) next.monthly = 'Monthly deposit must be a multiple of ₹100.';
    setErrors(next);
    if (Object.keys(next).length) return;
    traceForm('InvestmentApplication', { kind: 'RD', accountId, monthly: m, tenureMonths, rate });
    setSubmitting(true);
    setFormError('');
    try {
      const inv = await bookRd(customerId, {
        accountId,
        monthly: m,
        monthlyAmount: m,
        tenureMonths,
        rate,
        productName: RD.name,
        maturityAmount: preview?.maturityValue,
        maturityDate: new Date(Date.now() + tenureMonths * 30 * 24 * 3600 * 1000).toISOString()
      });
      toast({ title: 'Recurring deposit started', body: `${formatINR(m)} per month for ${tenureMonths} months at ${rate.toFixed(2)}% p.a. · Ref ${inv.id}` });
      onBooked();
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Server not connected — bypassed for now');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Funding account" required error={errors.accountId}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            <AccountOptions accounts={accounts} />
          </Select>
        </Field>
        <Field label="Monthly deposit" required error={errors.monthly} hint={`Minimum ${formatINR(RD.minMonthly)}, in multiples of ${formatINR(RD.monthlyStep)}`}>
          <Input type="number" min={RD.minMonthly} step={RD.monthlyStep} value={monthly} onChange={(e) => setMonthly(e.target.value)} error={errors.monthly} />
        </Field>
        <Field label="Tenure" required hint="Exact tenure locked at booking.">
          <Select value={bandIdx} onChange={(e) => setBandIdx(Number(e.target.value))}>
            {RD.rateBands.map((b, i) => (
              <option key={b.tenure} value={i}>
                {RD_TENURE_MONTHS[i]} months — {b.tenure} band — {b.rate.toFixed(2)}% p.a.
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Interest rate">
          <div className="flex h-[42px] items-center rounded-lg border border-ink-200 bg-porcelain-100 px-3 text-sm font-semibold text-midnight-900">
            {rate.toFixed(2)}% p.a.
          </div>
        </Field>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-500">The first instalment is debited now; later instalments are collected by standing instruction from the same account.</p>
      {preview && (
        <PreviewBox
          rows={[
            { label: 'Total deposited', value: formatINR(preview.totalDeposited) },
            { label: 'Interest earned', value: formatINR(preview.interestEarned) },
            { label: 'Maturity value', value: formatINR(preview.maturityValue) },
          ]}
          note={RD.disclosure}
        />
      )}
      <Button type="submit" loading={submitting} disabled={accounts.length === 0}>Start recurring deposit</Button>
    </form>
  );
}

/* ------------------------------ SIP form ------------------------------ */

function SipForm({ customerId, accounts, onBooked }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [monthly, setMonthly] = useState('5000');
  const [fundName, setFundName] = useState(SIP.fundCategories[0]?.name || '');
  const [assumed, setAssumed] = useState('12');
  const [tenure, setTenure] = useState('60');
  const [debitDate, setDebitDate] = useState('5');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFirstAccount(accounts, accountId, setAccountId);

  const m = Number(monthly) || 0;
  const rate = Number(assumed) || 0;
  const tenureMonths = Math.max(0, Math.floor(Number(tenure) || 0));

  const preview = useMemo(() => {
    try {
      if (m <= 0 || tenureMonths <= 0) return null;
      return calculateSIP({ monthlyInvestment: m, expectedReturnPct: rate, tenureMonths });
    } catch { return null; }
  }, [m, rate, tenureMonths]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!accountId) next.accountId = 'Choose a funding account.';
    if (!(m >= SIP.minMonthly)) next.monthly = `Minimum monthly investment is ${formatINR(SIP.minMonthly)}.`;
    if (!fundName) next.fundName = 'Choose a fund category.';
    if (!(tenureMonths >= 12)) next.tenure = 'Choose a horizon of at least 12 months.';
    setErrors(next);
    if (Object.keys(next).length) return;
    traceForm('InvestmentApplication', { kind: 'SIP', accountId, fundName, monthly: m, tenureMonths, rate, debitDate });
    setSubmitting(true);
    setFormError('');
    try {
      const inv = await startSip(customerId, {
        accountId,
        monthly: m,
        monthlyAmount: m,
        rate,
        productName: SIP.name,
        fundName,
        fundCategory: fundName,
        tenureMonths,
        debitDate: Number(debitDate) || 5,
        maturityAmount: preview?.maturityValue,
        maturityDate: new Date(Date.now() + tenureMonths * 30 * 24 * 3600 * 1000).toISOString()
      });
      toast({ title: 'SIP started', body: `${formatINR(m)} per month in ${fundName} (Debit day: ${debitDate}). Market-linked — returns are not guaranteed. · Ref ${inv.id}` });
      onBooked();
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Server not connected — bypassed for now');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-start gap-2 rounded-lg border border-warning-600/30 bg-warning-50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />
        <span>{SIP.disclosure}</span>
      </div>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Funding account" required error={errors.accountId}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            <AccountOptions accounts={accounts} />
          </Select>
        </Field>
        <Field label="Fund category" required error={errors.fundName}>
          <Select value={fundName} onChange={(e) => setFundName(e.target.value)} error={errors.fundName}>
            {SIP.fundCategories.map((f) => (
              <option key={f.name} value={f.name}>{f.name} — {f.riskLevel} risk</option>
            ))}
          </Select>
        </Field>
        <Field label="Monthly investment" required error={errors.monthly} hint={`Minimum ${formatINR(SIP.minMonthly)}`}>
          <Input type="number" min={SIP.minMonthly} step="100" value={monthly} onChange={(e) => setMonthly(e.target.value)} error={errors.monthly} />
        </Field>
        <Field label="Monthly debit date" hint="Day of the month for regular SIP deductions">
          <Select value={debitDate} onChange={(e) => setDebitDate(e.target.value)}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of every month
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Investment horizon (months)" required error={errors.tenure}>
          <Input type="number" min="12" step="12" value={tenure} onChange={(e) => setTenure(e.target.value)} error={errors.tenure} />
        </Field>
        <Field label="Assumed return for illustration (% p.a.)" hint="An assumption you choose for the projection below — not a rate offered by the bank.">
          <Select value={assumed} onChange={(e) => setAssumed(e.target.value)}>
            {[8, 10, 12, 14].map((r) => (
              <option key={r} value={String(r)}>{r}% p.a. (assumed)</option>
            ))}
          </Select>
        </Field>
      </div>
      {preview && (
        <PreviewBox
          rows={[
            { label: 'Total invested', value: formatINR(preview.totalInvested) },
            { label: 'Illustrative gain', value: formatINR(preview.estimatedGain) },
            { label: 'Illustrative value', value: formatINR(preview.maturityValue) },
          ]}
          note="Projection only, at the assumed return above. Market-linked — returns are not guaranteed, and the actual value can be higher or lower, including below the amount invested."
        />
      )}
      <Button type="submit" loading={submitting} disabled={accounts.length === 0}>Start SIP</Button>
    </form>
  );
}

/* ------------------------------ SSY form ------------------------------ */

function SsyForm({ customerId, accounts, profile, onBooked }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('25000');
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [guardianName, setGuardianName] = useState(profile?.customer?.fullName || '');
  const [guardianRelationship, setGuardianRelationship] = useState('Father');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFirstAccount(accounts, accountId, setAccountId);

  useEffect(() => {
    if (profile?.customer?.fullName && !guardianName) {
      setGuardianName(profile.customer.fullName);
    }
  }, [profile?.customer?.fullName]);

  const amt = Number(amount) || 0;
  const rate = SSY.rate;

  const preview = useMemo(() => {
    try {
      if (amt <= 0) return null;
      return calculateSSY({ annualDeposit: amt, annualRatePct: rate });
    } catch { return null; }
  }, [amt, rate]);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!accountId) next.accountId = 'Choose a funding account.';
    if (!(amt >= SSY.minDepositYearly)) next.amount = `Minimum yearly deposit is ${formatINR(SSY.minDepositYearly)}.`;
    else if (amt > SSY.maxDepositYearly) next.amount = `The scheme caps deposits at ${formatINR(SSY.maxDepositYearly)} per financial year.`;
    
    if (!childName.trim()) next.childName = 'Enter the girl child’s full name.';
    if (!childDob) {
      next.childDob = 'Enter the girl child’s date of birth.';
    } else {
      const birth = new Date(childDob);
      const ageYears = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (isNaN(birth.getTime()) || ageYears < 0 || ageYears >= 10) {
        next.childDob = 'The girl child must be under 10 years of age to open an SSY account.';
      }
    }
    if (!guardianName.trim()) next.guardianName = 'Enter guardian full name.';

    setErrors(next);
    if (Object.keys(next).length) return;
    traceForm('InvestmentApplication', { kind: 'SSY', accountId, childName, childDob, guardianName, amount: amt });
    setSubmitting(true);
    setFormError('');
    try {
      const inv = await openSsy(customerId, {
        accountId,
        amount: amt,
        annualDeposit: amt,
        childName: childName.trim(),
        girlChildName: childName.trim(),
        childDob,
        guardianName: guardianName.trim(),
        guardianRelationship,
        productName: SSY.name,
        rate,
        maturityAmount: preview?.maturityValue
      });
      toast({ title: 'SSY account opened', body: `${formatINR(amt)} deposited for ${childName.trim()} at ${rate.toFixed(2)}% p.a. · Ref ${inv.id}` });
      onBooked();
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Server not connected — bypassed for now');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Funding account" required error={errors.accountId}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            <AccountOptions accounts={accounts} />
          </Select>
        </Field>
        <Field label="Girl child’s full name" required error={errors.childName}>
          <Input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Full name of the girl child" error={errors.childName} />
        </Field>
        <Field label="Girl child date of birth" required error={errors.childDob} hint="Child must be under 10 years of age">
          <Input type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} error={errors.childDob} />
        </Field>
        <Field label="Guardian full name" required error={errors.guardianName}>
          <Input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Full name of parent/guardian" error={errors.guardianName} />
        </Field>
        <Field label="Relationship with child" required>
          <Select value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)}>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Legal Guardian">Legal Guardian</option>
          </Select>
        </Field>
        <Field label="Deposit for this year" required error={errors.amount} hint={`${formatINR(SSY.minDepositYearly)} to ${formatINR(SSY.maxDepositYearly)} per financial year`}>
          <Input type="number" min={SSY.minDepositYearly} max={SSY.maxDepositYearly} step="250" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        </Field>
        <Field label="Interest rate">
          <div className="flex h-[42px] items-center rounded-lg border border-ink-200 bg-porcelain-100 px-3 text-sm font-semibold text-midnight-900">
            {rate.toFixed(2)}% p.a.
          </div>
        </Field>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-500">{SSY.rateNote} Deposits are made for {SSY.depositYears} years and the account matures after {SSY.tenureYears} years.</p>
      {preview && (
        <PreviewBox
          rows={[
            { label: 'Total deposited (15 years)', value: formatINR(preview.totalDeposited) },
            { label: 'Projected interest', value: formatINR(preview.interestEarned) },
            { label: 'Projected maturity value', value: formatINR(preview.maturityValue) },
          ]}
          note={SSY.disclosure}
        />
      )}
      <Button type="submit" loading={submitting} disabled={accounts.length === 0}>Open SSY account</Button>
    </form>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function InvestmentsPage() {
  const { user } = useAuth();
  useDbTick();
  const customerId = user?.customerId;
  const [holdings, setHoldings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('FD');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    traceData('PortalInvestments');
    setLoading(true);
    Promise.all([
      listHoldings(customerId),
      listAccounts(customerId),
      getMyProfile(customerId).catch(() => null)
    ])
      .then(([h, a, p]) => {
        if (!live) return;
        setHoldings(h || []);
        setAccounts(a || []);
        setProfile(p);
        setError('');
      })
      .catch((err) => { if (live) setError(err?.message || 'We could not load your investments.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId, refresh]);

  const grouped = useMemo(() => {
    const map = { FD: [], RD: [], SIP: [], SSY: [] };
    for (const h of holdings) {
      const k = kindOf(h);
      if (map[k]) map[k].push(h);
      else map.SIP.push(h);
    }
    return map;
  }, [holdings]);

  if (loading) return <PageLoading />;

  const columnsFor = (kind) => {
    const base = [
      { key: 'product', label: 'Product', render: (h) => <span className="font-medium text-ink-900">{h.productName || h.fundName || KIND_META[kind].label}</span> },
    ];
    if (kind === 'FD') {
      return [
        ...base,
        { key: 'principal', label: 'Principal', align: 'right', render: (h) => <span className="tnum">{formatINR(h.principal)}</span> },
        { key: 'rate', label: 'Rate', align: 'right', render: (h) => <span className="tnum">{h.rate != null ? `${Number(h.rate).toFixed(2)}% p.a.` : '—'}</span> },
        { key: 'start', label: 'Start date', render: (h) => formatDate(h.startDate || h.bookingDate) },
        { key: 'mat', label: 'Maturity date', render: (h) => formatDate(h.maturityDate) },
        { key: 'matVal', label: 'Maturity value', align: 'right', render: (h) => <span className="tnum font-semibold">{formatINR(h.maturityValue ?? h.maturityAmount)}</span> },
        { key: 'status', label: 'Status', render: (h) => <StatusChip status={h.status} /> },
      ];
    }
    if (kind === 'RD') {
      return [
        ...base,
        { key: 'monthly', label: 'Monthly', align: 'right', render: (h) => <span className="tnum">{formatINR(monthlyOf(h))}</span> },
        { key: 'rate', label: 'Rate', align: 'right', render: (h) => <span className="tnum">{h.rate != null ? `${Number(h.rate).toFixed(2)}% p.a.` : '—'}</span> },
        { key: 'start', label: 'Start date', render: (h) => formatDate(h.startDate || h.bookingDate) },
        { key: 'mat', label: 'Maturity date', render: (h) => formatDate(h.maturityDate) },
        { key: 'matVal', label: 'Maturity value', align: 'right', render: (h) => <span className="tnum font-semibold">{formatINR(h.maturityValue ?? h.maturityAmount)}</span> },
        { key: 'status', label: 'Status', render: (h) => <StatusChip status={h.status} /> },
      ];
    }
    if (kind === 'SSY') {
      return [
        ...base,
        { key: 'child', label: 'Child Name', render: (h) => h.childName || h.girlChildName || h.name || '—' },
        { key: 'principal', label: 'Deposited', align: 'right', render: (h) => <span className="tnum">{formatINR(h.principal || h.depositAmount || h.annualDeposit)}</span> },
        { key: 'rate', label: 'Rate', align: 'right', render: (h) => <span className="tnum">{h.rate != null ? `${Number(h.rate).toFixed(2)}% p.a.` : '—'}</span> },
        { key: 'start', label: 'Start date', render: (h) => formatDate(h.startDate || h.bookingDate) },
        { key: 'mat', label: 'Maturity date', render: (h) => formatDate(h.maturityDate) },
        { key: 'status', label: 'Status', render: (h) => <StatusChip status={h.status} /> },
      ];
    }
    // SIP
    return [
      ...base,
      { key: 'monthly', label: 'Monthly', align: 'right', render: (h) => <span className="tnum">{formatINR(monthlyOf(h))}</span> },
      { key: 'invested', label: 'Invested so far', align: 'right', render: (h) => <span className="tnum">{formatINR(h.investedToDate ?? h.principal ?? monthlyOf(h))}</span> },
      { key: 'start', label: 'Start date', render: (h) => formatDate(h.startDate || h.bookingDate) },
      { key: 'status', label: 'Status', render: (h) => <StatusChip status={h.status} /> },
    ];
  };

  return (
    <div className="space-y-8">
      <SectionHeader titleAs="h1"
        eyebrow="Investments"
        title="My investments"
        description="Your deposits and investments in one place. Deposit values are as per the booking; SIP values are market-linked and can move up or down."
      />
      <FormError message={error} />

      {holdings.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No investments yet"
          body="Book a fixed deposit, start a recurring deposit or SIP, or open an SSY account using the booking panel below — it takes a minute."
        />
      ) : (
        KIND_ORDER.filter((k) => grouped[k].length > 0).map((kind) => {
          const Meta = KIND_META[kind];
          return (
            <section key={kind} className="space-y-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
                <Meta.icon className="h-5 w-5 text-midnight-700" aria-hidden /> {Meta.label}
                <span className="text-sm font-normal text-ink-500">({grouped[kind].length})</span>
              </h3>
              <Table columns={columnsFor(kind)} rows={grouped[kind]} rowKey={(h) => h.id} />
              {kind === 'SIP' && (
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-midnight-600" aria-hidden />
                  Market-linked — returns are not guaranteed. The value of a SIP depends on the performance of the underlying mutual fund scheme.
                </p>
              )}
            </section>
          );
        })
      )}

      <section className="space-y-4">
        <h3 className="font-display text-xl font-semibold text-midnight-950">Book or start a new investment</h3>
        <Card className="p-5">
          <Tabs
            tabs={[
              { id: 'FD', label: 'Fixed Deposit' },
              { id: 'RD', label: 'Recurring Deposit' },
              { id: 'SIP', label: 'SIP' },
              { id: 'SSY', label: 'SSY' },
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="pt-5">
            {accounts.length === 0 && (
              <p className="mb-4 rounded-lg border border-warning-600/30 bg-warning-50 px-3 py-2.5 text-sm text-ink-700">
                You need an active FinEdge account to fund an investment. Your accounts will appear here once opened.
              </p>
            )}
            {tab === 'FD' && <FdForm customerId={customerId} accounts={accounts} profile={profile} onBooked={() => setRefresh((r) => r + 1)} />}
            {tab === 'RD' && <RdForm customerId={customerId} accounts={accounts} onBooked={() => setRefresh((r) => r + 1)} />}
            {tab === 'SIP' && <SipForm customerId={customerId} accounts={accounts} onBooked={() => setRefresh((r) => r + 1)} />}
            {tab === 'SSY' && <SsyForm customerId={customerId} accounts={accounts} profile={profile} onBooked={() => setRefresh((r) => r + 1)} />}
          </div>
        </Card>
      </section>
    </div>
  );
}
