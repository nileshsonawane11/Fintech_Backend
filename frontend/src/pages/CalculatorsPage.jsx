import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calculator, Info } from 'lucide-react';
import { Card, Field, Input, SectionHeader, Tabs } from '../components/ui.jsx';
import { formatINR, formatINRWhole } from '../lib/format.js';
import {
  calculateEMI,
  calculateFD,
  calculateRD,
  calculateSIP,
  calculateSSY,
} from '../lib/finance.js';
import { FD, LOANS, RATE_DISCLAIMER, RD, SIP, SSY } from '../data/products.js';

// ---------------------------------------------------------------------------
// Calculators — every figure on this page is an illustration produced by the
// shared finance library (src/lib/finance.js), the same math the loan and
// deposit engines use. Rates are illustrative; SIP returns are assumed, never
// guaranteed, and are labelled as such beside the result.
// ---------------------------------------------------------------------------

const TAB_IDS = ['emi', 'fd', 'rd', 'sip', 'ssy'];

const TABS = [
  { id: 'emi', label: 'Loan EMI' },
  { id: 'fd', label: 'Fixed Deposit' },
  { id: 'rd', label: 'Recurring Deposit' },
  { id: 'sip', label: 'SIP' },
  { id: 'ssy', label: 'SSY' },
];

const HOME_LOAN = LOANS.find((l) => l.slug === 'home-loan');
const FD_DEFAULT_RATE = FD.rateGrid.find((r) => r.tenure === '1 – 2 years')?.general ?? FD.rateGrid[0].general;
const RD_DEFAULT_RATE = RD.rateBands.find((b) => b.tenure === '25 – 60 months')?.rate ?? RD.rateBands[0].rate;

const indianNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tryCalc(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

/**
 * Slider ALWAYS paired with an editable numeric input.
 * - Typing in the input clamps the value into range on change.
 * - The input shows Indian digit grouping (and fixed decimals for rates)
 *   when it loses focus.
 */
function SliderControl({ label, value, min, max, step = 1, decimals = 0, suffix, hint, onChange }) {
  const formatText = (v) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
    return decimals > 0 ? Number(v).toFixed(decimals) : indianNumber.format(Math.round(Number(v)));
  };
  const [text, setText] = useState(() => formatText(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, decimals]);

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(Number(value)) ? value : min}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          className="min-w-0 flex-1 accent-midnight-800"
        />
        <div className="flex w-44 shrink-0 items-center gap-2">
          <Input
            value={text}
            inputMode="decimal"
            aria-label={`${label} value`}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              const raw = e.target.value;
              setText(raw);
              const parsed = Number(String(raw).replace(/[₹,\s]/g, ''));
              if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
            }}
            onBlur={() => {
              setFocused(false);
              setText(formatText(value));
            }}
            className="text-right"
          />
          {suffix && <span className="whitespace-nowrap text-sm text-ink-500">{suffix}</span>}
        </div>
      </div>
      <span className="mt-1 flex justify-between text-xs text-ink-400">
        <span>{decimals > 0 ? min.toFixed(decimals) : indianNumber.format(min)}</span>
        <span>{decimals > 0 ? max.toFixed(decimals) : indianNumber.format(max)}</span>
      </span>
    </Field>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-midnight-800"
      />
      <span>
        <span className="font-medium text-ink-800">{label}</span>
        {description && <span className="block text-xs leading-relaxed text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

/** One flat result panel: headline figure, proportion bar, rows, CTA. */
function ResultPanel({ headlineLabel, headlineValue, headlineNote, children, ctaTo, ctaLabel }) {
  return (
    <div className="rounded-xl border border-midnight-800 bg-midnight-900 p-6 text-porcelain-100 shadow-none">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">{headlineLabel}</p>
      <p className="mt-2 font-display text-4xl font-semibold text-porcelain-50">{headlineValue}</p>
      {headlineNote && <p className="mt-1.5 text-sm leading-relaxed text-porcelain-200/80">{headlineNote}</p>}
      {children}
      <div className="mt-6 border-t border-porcelain-50/15 pt-5">
        <Link
          to={ctaTo}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-5 py-3 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200"
        >
          {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-porcelain-200/70">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Illustrative simulation. {RATE_DISCLAIMER}</span>
        </p>
      </div>
    </div>
  );
}

function ResultRow({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-porcelain-50/10 py-2.5 last:border-0">
      <span className="text-sm text-porcelain-200/80">{label}</span>
      <span className={`text-right text-sm ${strong ? 'font-semibold text-porcelain-50' : 'text-porcelain-100'}`}>{value}</span>
    </div>
  );
}

function ProportionBar({ aLabel, aValue, bLabel, bValue }) {
  const total = (aValue || 0) + (bValue || 0);
  const aPct = total > 0 ? Math.round(((aValue || 0) / total) * 100) : 0;
  return (
    <div className="mt-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-porcelain-50/10" role="img" aria-label={`${aLabel} ${aPct}%, ${bLabel} ${100 - aPct}%`}>
        <div className="bg-midnight-400" style={{ width: `${aPct}%` }} />
        <div className="bg-midnight-300" style={{ width: `${100 - aPct}%` }} />
      </div>
      <div className="mt-2.5 space-y-1 text-xs text-porcelain-200/80">
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-midnight-400" aria-hidden />{aLabel}</span>
          <span>{formatINRWhole(aValue)} · {aPct}%</span>
        </p>
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-midnight-300" aria-hidden />{bLabel}</span>
          <span>{formatINRWhole(bValue)} · {100 - aPct}%</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EMI
// ---------------------------------------------------------------------------

function EmiCalculator() {
  const [amount, setAmount] = useState(2500000);
  const [rate, setRate] = useState(HOME_LOAN ? HOME_LOAN.rateMin : 8.35);
  const [tenureMonths, setTenureMonths] = useState(240);
  const [showAll, setShowAll] = useState(false);

  const result = useMemo(
    () => tryCalc(() => calculateEMI(amount, rate, Math.round(tenureMonths))),
    [amount, rate, tenureMonths],
  );
  const visibleRows = result ? (showAll ? result.schedule : result.schedule.slice(0, 12)) : [];

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 shadow-none lg:col-span-3">
          <div className="space-y-6">
            <SliderControl label="Loan amount" value={amount} min={100000} max={10000000} step={10000} suffix="₹" onChange={setAmount} />
            <SliderControl label="Interest rate" value={rate} min={5} max={16} step={0.05} decimals={2} suffix="% p.a." onChange={setRate} hint={HOME_LOAN ? `Home loan on this platform starts at ${HOME_LOAN.rateMin.toFixed(2)}% p.a. — adjust to the rate you expect to be sanctioned.` : undefined} />
            <SliderControl label="Tenure" value={tenureMonths} min={12} max={360} step={1} suffix="months" onChange={(v) => { setTenureMonths(v); setShowAll(false); }} hint={tenureMonths ? `${Math.floor(tenureMonths / 12)} year${Math.floor(tenureMonths / 12) === 1 ? '' : 's'}${tenureMonths % 12 ? ` ${tenureMonths % 12} month${tenureMonths % 12 === 1 ? '' : 's'}` : ''}` : undefined} />
          </div>
        </Card>
        <div className="lg:col-span-2">
          <ResultPanel
            headlineLabel="Monthly EMI"
            headlineValue={result ? formatINR(result.emi) : '—'}
            headlineNote="Reducing-balance EMI at the rate above, for the full tenure."
            ctaTo="/loans"
            ctaLabel="Apply for a loan"
          >
            {result && (
              <>
                <ProportionBar aLabel="Principal" aValue={amount} bLabel="Total interest" bValue={result.totalInterest} />
                <div className="mt-4">
                  <ResultRow label="Loan amount" value={formatINR(amount)} />
                  <ResultRow label="Total interest" value={formatINR(result.totalInterest)} />
                  <ResultRow label="Total payable" value={formatINR(result.totalPayment)} strong />
                </div>
              </>
            )}
          </ResultPanel>
        </div>
      </div>

      {result && (
        <details className="mt-6 rounded-xl border border-ink-100 bg-white shadow-card" open>
          <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-midnight-900">
            Amortisation schedule — how each EMI splits between principal and interest
          </summary>
          <div className="border-t border-ink-100 px-6 py-4">
            <div className={`overflow-x-auto ${showAll ? 'max-h-96 overflow-y-auto' : ''}`}>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-3 font-semibold">Month</th>
                    <th className="py-2 pr-3 text-right font-semibold">EMI</th>
                    <th className="py-2 pr-3 text-right font-semibold">Principal</th>
                    <th className="py-2 pr-3 text-right font-semibold">Interest</th>
                    <th className="py-2 text-right font-semibold">Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.month} className="border-b border-ink-50 last:border-0">
                      <td className="py-2 pr-3 text-ink-700">{row.month}</td>
                      <td className="py-2 pr-3 text-right text-ink-800">{formatINR(row.emi)}</td>
                      <td className="py-2 pr-3 text-right text-ink-800">{formatINR(row.principal)}</td>
                      <td className="py-2 pr-3 text-right text-ink-800">{formatINR(row.interest)}</td>
                      <td className="py-2 text-right font-medium text-ink-900">{formatINR(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.schedule.length > 12 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 text-sm font-semibold text-midnight-800 underline decoration-gold-400 decoration-2 underline-offset-2 hover:text-midnight-600"
              >
                {showAll ? 'Show first 12 months only' : `Show all ${result.schedule.length} months`}
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FD / RD / SIP / SSY
// ---------------------------------------------------------------------------

function FdCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(FD_DEFAULT_RATE);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [senior, setSenior] = useState(false);

  const result = useMemo(
    () => tryCalc(() => calculateFD({ principal, annualRatePct: rate, tenureMonths: Math.round(tenureMonths), seniorCitizen: senior })),
    [principal, rate, tenureMonths, senior],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl label="Deposit amount" value={principal} min={FD.minAmount} max={5000000} step={1000} suffix="₹" onChange={setPrincipal} hint={`Minimum booking amount on this platform is ${formatINRWhole(FD.minAmount)}.`} />
          <SliderControl label="Interest rate" value={rate} min={3} max={9} step={0.05} decimals={2} suffix="% p.a." onChange={setRate} hint="Quarterly compounding, the Indian bank standard. Compare with the FD rate grid on the Fixed Deposit page." />
          <SliderControl label="Tenure" value={tenureMonths} min={6} max={120} step={1} suffix="months" onChange={setTenureMonths} />
          <Toggle
            label="Senior citizen (age 60+)"
            description={`Adds ${FD.seniorDelta.toFixed(2)}% p.a. to the rate, as in the FD rate grid.`}
            checked={senior}
            onChange={setSenior}
          />
        </div>
      </Card>
      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel="Maturity value"
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="Cumulative deposit — interest stays invested until maturity."
          ctaTo="/investments/fixed-deposit"
          ctaLabel="Open a Fixed Deposit"
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Amount deposited" value={formatINR(result.principal)} />
              <ResultRow label="Rate applied" value={`${result.rateAppliedPct.toFixed(2)}% p.a.${senior ? ' (incl. senior premium)' : ''}`} />
              <ResultRow label="Interest earned" value={formatINR(result.interestEarned)} />
              <ResultRow label="Maturity value" value={formatINR(result.maturityValue)} strong />
            </div>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

function RdCalculator() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(RD_DEFAULT_RATE);
  const [tenureMonths, setTenureMonths] = useState(36);

  const result = useMemo(
    () => tryCalc(() => calculateRD({ monthlyDeposit: monthly, annualRatePct: rate, tenureMonths: Math.round(tenureMonths) })),
    [monthly, rate, tenureMonths],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl label="Monthly deposit" value={monthly} min={RD.minMonthly} max={100000} step={RD.monthlyStep} suffix="₹" onChange={setMonthly} hint={`Starts at ${formatINRWhole(RD.minMonthly)} a month, in multiples of ₹${RD.monthlyStep}.`} />
          <SliderControl label="Interest rate" value={rate} min={3} max={9} step={0.05} decimals={2} suffix="% p.a." onChange={setRate} hint="Compounded quarterly; the rate is fixed when the RD is opened." />
          <SliderControl label="Tenure" value={tenureMonths} min={6} max={120} step={1} suffix="months" onChange={setTenureMonths} />
        </div>
      </Card>
      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel="Maturity value"
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="A fixed monthly deposit, compounded quarter by quarter."
          ctaTo="/investments/recurring-deposit"
          ctaLabel="Open a Recurring Deposit"
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Total deposited" value={formatINR(result.totalDeposited)} />
              <ResultRow label="Interest earned" value={formatINR(result.interestEarned)} />
              <ResultRow label="Maturity value" value={formatINR(result.maturityValue)} strong />
            </div>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

function SipCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [returnPct, setReturnPct] = useState(12);
  const [years, setYears] = useState(10);

  const result = useMemo(
    () => tryCalc(() => calculateSIP({ monthlyInvestment: monthly, expectedReturnPct: returnPct, tenureMonths: Math.round(years) * 12 })),
    [monthly, returnPct, years],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl label="Monthly investment" value={monthly} min={SIP.minMonthly} max={100000} step={500} suffix="₹" onChange={setMonthly} hint={`SIP on this platform starts at ${formatINRWhole(SIP.minMonthly)} a month.`} />
          <SliderControl label="Assumed annual return" value={returnPct} min={1} max={20} step={0.5} decimals={1} suffix="% p.a." onChange={setReturnPct} hint="An assumption you choose for this illustration — not a rate the bank offers or expects." />
          <SliderControl label="Investment period" value={years} min={1} max={30} step={1} suffix="years" onChange={setYears} />
        </div>
      </Card>
      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel="Projected value (illustration only)"
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="What the deposits above would grow to IF markets returned exactly the assumed rate every year. They will not."
          ctaTo="/investments/systematic-investment-plan"
          ctaLabel="Start a SIP"
        >
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-porcelain-50/20 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-porcelain-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden />
            <span>
              <strong className="font-semibold text-porcelain-50">Market-linked — returns not guaranteed.</strong>{' '}
              Mutual fund investments are subject to market risks; the value can fall as well as rise and past performance does not predict future returns.
            </span>
          </div>
          {result && (
            <>
              <ProportionBar aLabel="You invest" aValue={result.totalInvested} bLabel="Estimated gain (assumed)" bValue={result.estimatedGain} />
              <div className="mt-4">
                <ResultRow label="Total invested" value={formatINR(result.totalInvested)} />
                <ResultRow label="Estimated gain" value={formatINR(result.estimatedGain)} />
                <ResultRow label="Projected value" value={formatINR(result.maturityValue)} strong />
              </div>
            </>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

function SsyCalculator() {
  const [yearly, setYearly] = useState(100000);

  const result = useMemo(
    () => tryCalc(() => calculateSSY({ annualDeposit: yearly, annualRatePct: SSY.rate, depositYears: SSY.depositYears, maturityYears: SSY.tenureYears, maxDepositPerYear: SSY.maxDepositYearly })),
    [yearly],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl
            label="Deposit per year"
            value={yearly}
            min={SSY.minDepositYearly}
            max={SSY.maxDepositYearly}
            step={250}
            suffix="₹"
            onChange={setYearly}
            hint={`Scheme limits: ${formatINRWhole(SSY.minDepositYearly)} to ${formatINRWhole(SSY.maxDepositYearly)} per financial year. Deposits are made for ${SSY.depositYears} years; the account matures after ${SSY.tenureYears} years.`}
          />
          <div className="rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3">
            <p className="text-sm text-ink-700">
              Interest rate used: <strong className="font-semibold text-midnight-900">{SSY.rate.toFixed(2)}% p.a.</strong>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{SSY.rateNote}</p>
          </div>
        </div>
      </Card>
      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel={`Maturity value at ${SSY.tenureYears} years (projection)`}
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="Projection at the rate above, held unchanged for the full term. The government revises the SSY rate from time to time, so the actual maturity value will differ."
          ctaTo="/investments/sukanya-samriddhi"
          ctaLabel="Open an SSY account"
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Deposit applied per year" value={formatINR(result.appliedAnnualDeposit)} />
              <ResultRow label={`Total deposited (${SSY.depositYears} years)`} value={formatINR(result.totalDeposited)} />
              <ResultRow label="Interest earned (projected)" value={formatINR(result.interestEarned)} />
              <ResultRow label="Maturity value" value={formatINR(result.maturityValue)} strong />
            </div>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalculatorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const active = TAB_IDS.includes(requested) ? requested : 'emi';

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader titleAs="h1"
        eyebrow="Calculators"
        title="Plan the numbers before you apply"
        description="The same finance library the bank's loan and deposit engines use — no rounded-off marketing maths. Every result is an illustration based on the figures you enter."
        action={<Calculator className="hidden h-8 w-8 text-gold-500 sm:block" aria-hidden />}
      />
      <Tabs
        tabs={TABS}
        active={active}
        onChange={(id) => setSearchParams({ tab: id }, { replace: true })}
      />
      <div className="mt-6">
        {active === 'emi' && <EmiCalculator />}
        {active === 'fd' && <FdCalculator />}
        {active === 'rd' && <RdCalculator />}
        {active === 'sip' && <SipCalculator />}
        {active === 'ssy' && <SsyCalculator />}
      </div>
    </div>
  );
}

export { CalculatorsPage };
