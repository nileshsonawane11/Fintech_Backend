import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calculator, Info } from 'lucide-react';
import { Card, Field, Input, SectionHeader } from '../components/ui.jsx';
import { formatINR, formatINRWhole, shortProductName } from '../lib/format.js';
import {
  calculateEMI,
  calculateBulletRepayment,
  calculateFD,
  calculateRD,
  calculateSIP,
  calculateSSY,
} from '../lib/finance.js';
import { FD, LOANS, RATE_DISCLAIMER, RD, SIP, SSY } from '../data/products.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';

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

const HOME_LOAN = LOANS.find((l) => l.slug === 'home-loan') || LOANS[0];

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
 * Tab row with sliding gold underline indicator (180ms ease-out).
 * Respects prefers-reduced-motion.
 */
function CalculatorTabs({ tabs, active, onChange }) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector(`[data-tab-id="${active}"]`);
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        opacity: 1,
      });
    }
  }, [active]);

  return (
    <div ref={containerRef} className="relative flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map((t) => {
        const isSelected = active === t.id;
        return (
          <button
            key={t.id}
            data-tab-id={t.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(t.id)}
            className={`relative -mb-px min-h-[44px] inline-flex items-center border-b-2 px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              isSelected
                ? 'border-transparent text-midnight-900 font-semibold'
                : 'border-transparent text-ink-500 hover:text-midnight-800'
            }`}
          >
            {t.label}
          </button>
        );
      })}
      <span
        className="pointer-events-none absolute bottom-0 h-0.5 bg-gold-500 rounded-full transition-all duration-240 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
        }}
        aria-hidden
      />
    </div>
  );
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
function ResultPanel({ headlineLabel, headlineValue, headlineNote, children, ctaTo, ctaLabel, onCtaClick, pulseKey }) {
  const [pulsing, setPulsing] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (pulseKey !== undefined) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 120);
      return () => clearTimeout(timer);
    }
  }, [pulseKey]);

  return (
    <div
      className={`rounded-xl border bg-midnight-900 p-6 text-porcelain-100 shadow-none transition-colors duration-120 motion-reduce:transition-none ${
        pulsing ? 'border-gold-400 ring-1 ring-gold-400/60' : 'border-midnight-800'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">{headlineLabel}</p>
      <p className="mt-2 font-display text-4xl font-semibold text-porcelain-50">{headlineValue}</p>
      {headlineNote && <p className="mt-1.5 text-sm leading-relaxed text-porcelain-200/80">{headlineNote}</p>}
      {children}
      <div className="mt-6 border-t border-porcelain-50/15 pt-5">
        {onCtaClick ? (
          <button
            type="button"
            onClick={onCtaClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-5 py-3 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 cursor-pointer"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <Link
            to={ctaTo}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-5 py-3 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
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
        <div
          className="bg-midnight-400 transition-[width] duration-240 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${aPct}%` }}
        />
        <div
          className="bg-midnight-300 transition-[width] duration-240 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${100 - aPct}%` }}
        />
      </div>
      <div className="mt-2.5 space-y-1 text-xs text-porcelain-200/80">
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-midnight-400" aria-hidden />{aLabel}</span>
          <span>{formatINR(aValue)} · {aPct}%</span>
        </p>
        <p className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-midnight-300" aria-hidden />{bLabel}</span>
          <span>{formatINR(bValue)} · {100 - aPct}%</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EMI Calculator
// ---------------------------------------------------------------------------

function EmiCalculator({ onOpenApply }) {
  const [selectedLoanSlug, setSelectedLoanSlug] = useState('home-loan');
  const [loanMode, setLoanMode] = useState('emi'); // 'emi' | 'bullet' (Gold loan only)
  const [amount, setAmount] = useState(2500000);
  const [rate, setRate] = useState(HOME_LOAN.rateMin);
  const [tenureMonths, setTenureMonths] = useState(240);
  const [showAll, setShowAll] = useState(false);

  const selectedLoan = useMemo(
    () => LOANS.find((l) => l.slug === selectedLoanSlug) || HOME_LOAN,
    [selectedLoanSlug],
  );

  const handleLoanChange = (slug) => {
    const nextLoan = LOANS.find((l) => l.slug === slug);
    if (!nextLoan) return;
    setSelectedLoanSlug(slug);
    setLoanMode('emi');
    setRate(nextLoan.rateMin);
    setAmount((prev) => clamp(prev, nextLoan.minAmount, nextLoan.maxAmount));
    setTenureMonths((prev) => clamp(prev, nextLoan.tenureMinMonths, nextLoan.tenureMaxMonths));
    setShowAll(false);
  };

  const isGold = selectedLoan.slug === 'gold-loan';
  const isBullet = isGold && loanMode === 'bullet';

  const emiResult = useMemo(
    () => tryCalc(() => calculateEMI(amount, rate, Math.round(tenureMonths))),
    [amount, rate, tenureMonths],
  );

  const bulletResult = useMemo(
    () => (isBullet ? tryCalc(() => calculateBulletRepayment(amount, rate, Math.round(tenureMonths))) : null),
    [isBullet, amount, rate, tenureMonths],
  );

  const visibleRows = emiResult ? (showAll ? emiResult.schedule : emiResult.schedule.slice(0, 12)) : [];

  const amountStep = selectedLoan.minAmount <= 25000 ? 5000 : 10000;

  return (
    <div>
      {/* Fix 2: Loan Selector with all 7 loans */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-600 block mb-2">
          Select Loan Product
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Loan product">
          {LOANS.map((l) => {
            const isSelected = l.slug === selectedLoan.slug;
            return (
              <button
                key={l.slug}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleLoanChange(l.slug)}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-midnight-900 text-porcelain-50 shadow-xs ring-1 ring-midnight-800'
                    : 'border border-ink-200 bg-white text-ink-700 hover:border-midnight-300 hover:text-midnight-900'
                }`}
              >
                {shortProductName(l.name)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 shadow-none lg:col-span-3">
          <div className="space-y-6">
            {/* Gold Loan EMI / Bullet toggle */}
            {isGold && (
              <div className="rounded-lg border border-ink-200 bg-porcelain-50 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-midnight-950">Repayment Structure</span>
                    <p className="text-xs text-ink-500">Choose between monthly reducing-balance EMI or bullet repayment at maturity.</p>
                  </div>
                  <div className="flex rounded-lg border border-ink-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setLoanMode('emi')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        loanMode === 'emi' ? 'bg-midnight-900 text-porcelain-50' : 'text-ink-600 hover:text-midnight-900'
                      }`}
                    >
                      Regular EMI
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanMode('bullet')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        loanMode === 'bullet' ? 'bg-midnight-900 text-porcelain-50' : 'text-ink-600 hover:text-midnight-900'
                      }`}
                    >
                      Bullet Repayment
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SliderControl
              label="Loan amount"
              value={amount}
              min={selectedLoan.minAmount}
              max={selectedLoan.maxAmount}
              step={amountStep}
              suffix="₹"
              onChange={setAmount}
              hint={`Min. ${formatINRWhole(selectedLoan.minAmount)} · Max. ${formatINRWhole(selectedLoan.maxAmount)}`}
            />
            <SliderControl
              label="Interest rate"
              value={rate}
              min={selectedLoan.rateMin}
              max={selectedLoan.rateMax}
              step={0.05}
              decimals={2}
              suffix="% p.a."
              onChange={setRate}
              hint={`${shortProductName(selectedLoan.name)} on this platform starts at ${selectedLoan.rateMin.toFixed(2)}% p.a. — adjust to the rate you expect to be sanctioned.`}
            />
            <SliderControl
              label="Tenure"
              value={tenureMonths}
              min={selectedLoan.tenureMinMonths}
              max={selectedLoan.tenureMaxMonths}
              step={1}
              suffix="months"
              onChange={(v) => {
                setTenureMonths(v);
                setShowAll(false);
              }}
              hint={
                tenureMonths
                  ? `${Math.floor(tenureMonths / 12)} year${Math.floor(tenureMonths / 12) === 1 ? '' : 's'}${
                      tenureMonths % 12 ? ` ${tenureMonths % 12} month${tenureMonths % 12 === 1 ? '' : 's'}` : ''
                    } (${selectedLoan.tenureMinMonths} – ${selectedLoan.tenureMaxMonths} mo range)`
                  : undefined
              }
            />
          </div>
        </Card>

        <div className="lg:col-span-2">
          {isBullet && bulletResult ? (
            <ResultPanel
              headlineLabel="Monthly Interest"
              headlineValue={formatINR(bulletResult.monthlyInterest)}
              headlineNote="Simple interest payable monthly; entire principal repaid at maturity."
              ctaTo={`/loans/${selectedLoan.slug}`}
              ctaLabel={`Apply for ${shortProductName(selectedLoan.name)}`}
              onCtaClick={() => onOpenApply?.(selectedLoan, amount, tenureMonths)}
              pulseKey={`${selectedLoan.slug}-${loanMode}`}
            >
              <ProportionBar aLabel="Principal" aValue={amount} bLabel="Total interest" bValue={bulletResult.totalInterest} />
              <div className="mt-4">
                <ResultRow label="Principal amount" value={formatINR(amount)} />
                <ResultRow label={`Total interest (${tenureMonths} mo)`} value={formatINR(bulletResult.totalInterest)} />
                <ResultRow label="Amount due at maturity" value={formatINR(bulletResult.totalPayment)} strong />
              </div>
            </ResultPanel>
          ) : (
            <ResultPanel
              headlineLabel="Monthly EMI"
              headlineValue={emiResult ? formatINR(emiResult.emi) : '—'}
              headlineNote="Reducing-balance EMI at the rate above, for the full tenure."
              ctaTo={`/loans/${selectedLoan.slug}`}
              ctaLabel={`Apply for ${shortProductName(selectedLoan.name)}`}
              onCtaClick={() => onOpenApply?.(selectedLoan, amount, tenureMonths)}
              pulseKey={`${selectedLoan.slug}-${loanMode}`}
            >
              {emiResult && (
                <>
                  <ProportionBar aLabel="Principal" aValue={amount} bLabel="Total interest" bValue={emiResult.totalInterest} />
                  <div className="mt-4">
                    <ResultRow label="Loan amount" value={formatINR(amount)} />
                    <ResultRow label="Total interest" value={formatINR(emiResult.totalInterest)} />
                    <ResultRow label="Total payable" value={formatINR(emiResult.totalPayment)} strong />
                  </div>
                </>
              )}
            </ResultPanel>
          )}
        </div>
      </div>

      {/* Amortisation or Bullet Summary */}
      {isBullet && bulletResult ? (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-6 shadow-card">
          <h3 className="font-display text-base font-semibold text-midnight-900">
            Bullet Repayment Schedule Summary
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            In bullet repayment mode, no monthly principal reduction occurs. Principal remains outstanding until maturity.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-ink-100 bg-porcelain-50 p-4">
              <span className="text-xs text-ink-500 uppercase tracking-wide">Monthly Servicing</span>
              <p className="mt-1 font-display text-lg font-semibold text-midnight-950">{formatINR(bulletResult.monthlyInterest)}</p>
              <span className="text-xs text-ink-400">Paid monthly for {tenureMonths} months</span>
            </div>
            <div className="rounded-lg border border-ink-100 bg-porcelain-50 p-4">
              <span className="text-xs text-ink-500 uppercase tracking-wide">Total Interest Accrued</span>
              <p className="mt-1 font-display text-lg font-semibold text-midnight-950">{formatINR(bulletResult.totalInterest)}</p>
              <span className="text-xs text-ink-400">At {rate.toFixed(2)}% p.a. simple interest</span>
            </div>
            <div className="rounded-lg border border-ink-100 bg-porcelain-50 p-4">
              <span className="text-xs text-ink-500 uppercase tracking-wide">Bullet Lump Sum at Maturity</span>
              <p className="mt-1 font-display text-lg font-semibold text-midnight-950">{formatINR(bulletResult.totalPayment)}</p>
              <span className="text-xs text-ink-400">Principal + final month interest</span>
            </div>
          </div>
        </div>
      ) : (
        emiResult && (
          <details className="mt-6 rounded-xl border border-ink-100 bg-white shadow-card" open>
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-midnight-900">
              Amortisation schedule — how each EMI splits between principal and interest
            </summary>
            <div className="border-t border-ink-100 px-6 py-4">
              {/* Fix 4: No inner vertical scroll trap. Horizontal scroll on <=640px */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                      <th className="py-2 pr-3 font-semibold">Month</th>
                      <th className="py-2 pr-3 text-right font-semibold">EMI</th>
                      <th className="py-2 pr-3 text-right font-semibold">Principal</th>
                      <th className="py-2 pr-3 text-right font-semibold">Interest</th>
                      <th className="py-2 text-right font-semibold">Balance after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, idx) => (
                      <tr
                        key={row.month}
                        style={{ '--stagger-index': idx }}
                        className="border-b border-ink-50 last:border-0 reveal-schedule-row"
                      >
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
              {emiResult.schedule.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 text-sm font-semibold text-midnight-800 underline decoration-gold-400 decoration-2 underline-offset-2 hover:text-midnight-600 cursor-pointer"
                >
                  {showAll ? 'Show first 12 months only' : `Show all ${emiResult.schedule.length} months`}
                </button>
              )}
            </div>
          </details>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fixed Deposit (FD)
// ---------------------------------------------------------------------------

function findFdGridBand(months) {
  if (months <= 1) return FD.rateGrid[0]; // 7 – 45 days
  if (months <= 5) return FD.rateGrid[1]; // 46 – 179 days
  if (months <= 11) return FD.rateGrid[2]; // 180 – 364 days
  if (months <= 24) return FD.rateGrid[3]; // 1 – 2 years
  if (months <= 36) return FD.rateGrid[4]; // 2 – 3 years
  if (months <= 60) return FD.rateGrid[5]; // 3 – 5 years
  return FD.rateGrid[6]; // 5 – 10 years
}

function FdCalculator({ onOpenApply }) {
  const [principal, setPrincipal] = useState(100000);
  const [tenureBand, setTenureBand] = useState('1 – 2 years');
  const [tenureMonths, setTenureMonths] = useState(12);
  const [senior, setSenior] = useState(false);

  // Synchronize tenureBand and selected grid item
  const selectedBand = useMemo(
    () => FD.rateGrid.find((g) => g.tenure === tenureBand) || FD.rateGrid[3],
    [tenureBand],
  );

  const appliedRate = senior ? selectedBand.senior : selectedBand.general;

  const handleBandSelect = (band) => {
    setTenureBand(band.tenure);
    // Representative months for each band
    const defaultMonths =
      band.tenure === '7 – 45 days'
        ? 1
        : band.tenure === '46 – 179 days'
        ? 3
        : band.tenure === '180 – 364 days'
        ? 6
        : band.tenure === '1 – 2 years'
        ? 12
        : band.tenure === '2 – 3 years'
        ? 36
        : band.tenure === '3 – 5 years'
        ? 48
        : 60;
    setTenureMonths(defaultMonths);
  };

  const handleSliderChange = (months) => {
    setTenureMonths(months);
    const band = findFdGridBand(months);
    if (band && band.tenure !== tenureBand) {
      setTenureBand(band.tenure);
    }
  };

  const result = useMemo(
    () =>
      tryCalc(() =>
        calculateFD({
          principal,
          annualRatePct: selectedBand.general,
          tenureMonths: Math.round(tenureMonths),
          seniorCitizen: senior,
          seniorCitizenDeltaPct: FD.seniorDelta,
        }),
      ),
    [principal, selectedBand.general, tenureMonths, senior],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl
            label="Deposit amount"
            value={principal}
            min={FD.minAmount}
            max={5000000}
            step={1000}
            suffix="₹"
            onChange={setPrincipal}
            hint={`Minimum booking amount on this platform is ${formatINRWhole(FD.minAmount)}.`}
          />

          {/* Fix 1: Tenure Band Selector & Read-only Fact line (No rate slider) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-600 block mb-2">
              Tenure Band (Rate Grid)
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="FD Tenure Band">
              {FD.rateGrid.map((b) => {
                const isSelected = b.tenure === selectedBand.tenure;
                return (
                  <button
                    key={b.tenure}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleBandSelect(b)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-midnight-900 text-porcelain-50 shadow-xs ring-1 ring-midnight-800'
                        : 'border border-ink-200 bg-white text-ink-700 hover:border-midnight-300 hover:text-midnight-900'
                    }`}
                  >
                    {b.tenure} ({senior ? `${b.senior.toFixed(2)}%` : `${b.general.toFixed(2)}%`})
                  </button>
                );
              })}
            </div>
          </div>

          <SliderControl
            label="Tenure"
            value={tenureMonths}
            min={6}
            max={120}
            step={1}
            suffix="months"
            onChange={handleSliderChange}
            hint={`${Math.floor(tenureMonths / 12)} year${Math.floor(tenureMonths / 12) === 1 ? '' : 's'}${
              tenureMonths % 12 ? ` ${tenureMonths % 12} month${tenureMonths % 12 === 1 ? '' : 's'}` : ''
            }`}
          />

          {/* Read-only fact line beside or beneath tenure */}
          <div className="rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm text-ink-700">
                Applied rate ({senior ? 'Senior Citizen' : 'General'}):{' '}
                <strong className="font-semibold text-midnight-900">{appliedRate.toFixed(2)}% p.a.</strong>
              </span>
              <span className="text-xs text-ink-500">
                {selectedBand.tenure}: {selectedBand.general.toFixed(2)}% p.a. (general) / {selectedBand.senior.toFixed(2)}% p.a. (senior)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">
              Compounded quarterly. Rates locked at deposit booking for the entire tenure.
            </p>
          </div>

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
          onCtaClick={() => onOpenApply?.(FD, principal, selectedBand.tenure, senior ? 'SENIOR' : 'GENERAL', tenureMonths)}
          pulseKey={`${selectedBand.tenure}-${senior}`}
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Amount deposited" value={formatINR(result.principal)} />
              <ResultRow label="Rate applied" value={`${result.rateAppliedPct.toFixed(2)}% p.a.${senior ? ' (incl. senior premium)' : ''}`} />
              <ResultRow label="Interest earned" value={formatINR(result.interestEarned)} />
            </div>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recurring Deposit (RD)
// ---------------------------------------------------------------------------

function findRdBand(months) {
  return RD.rateBands.find((b) => months >= b.minMonths && months <= b.maxMonths) || RD.rateBands[2];
}

function RdCalculator({ onOpenApply }) {
  const [monthly, setMonthly] = useState(5000);
  const [tenureMonths, setTenureMonths] = useState(36);

  // Band selected by tenure
  const selectedBand = useMemo(() => findRdBand(tenureMonths), [tenureMonths]);

  const handleBandSelect = (band) => {
    // Representative months: 12 for 6-12, 24 for 13-24, 36 for 25-60, 60 for 61-120
    const months =
      band.tenure === '6 – 12 months'
        ? 12
        : band.tenure === '13 – 24 months'
        ? 24
        : band.tenure === '25 – 60 months'
        ? 36
        : 60;
    setTenureMonths(months);
  };

  const result = useMemo(
    () =>
      tryCalc(() =>
        calculateRD({
          monthlyDeposit: monthly,
          annualRatePct: selectedBand.rate,
          tenureMonths: Math.round(tenureMonths),
        }),
      ),
    [monthly, selectedBand.rate, tenureMonths],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl
            label="Monthly deposit"
            value={monthly}
            min={RD.minMonthly}
            max={100000}
            step={RD.monthlyStep}
            suffix="₹"
            onChange={setMonthly}
            hint={`Starts at ${formatINRWhole(RD.minMonthly)} a month, in multiples of ₹${RD.monthlyStep}.`}
          />

          {/* Fix 1: RD Tenure Band Selector & Read-only Fact line (No rate slider) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-600 block mb-2">
              Tenure Band (Rate Grid)
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="RD Tenure Band">
              {RD.rateBands.map((b) => {
                const isSelected = b.tenure === selectedBand.tenure;
                return (
                  <button
                    key={b.tenure}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleBandSelect(b)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-midnight-900 text-porcelain-50 shadow-xs ring-1 ring-midnight-800'
                        : 'border border-ink-200 bg-white text-ink-700 hover:border-midnight-300 hover:text-midnight-900'
                    }`}
                  >
                    {b.tenure} ({b.rate.toFixed(2)}%)
                  </button>
                );
              })}
            </div>
          </div>

          <SliderControl
            label="Tenure"
            value={tenureMonths}
            min={6}
            max={120}
            step={1}
            suffix="months"
            onChange={setTenureMonths}
            hint={`${Math.floor(tenureMonths / 12)} year${Math.floor(tenureMonths / 12) === 1 ? '' : 's'}${
              tenureMonths % 12 ? ` ${tenureMonths % 12} month${tenureMonths % 12 === 1 ? '' : 's'}` : ''
            }`}
          />

          {/* Read-only fact line beside or beneath tenure */}
          <div className="rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm text-ink-700">
                Applied rate: <strong className="font-semibold text-midnight-900">{selectedBand.rate.toFixed(2)}% p.a.</strong>
              </span>
              <span className="text-xs text-ink-500">
                {selectedBand.tenure}: {selectedBand.rate.toFixed(2)}% p.a. (compounded quarterly; fixed when opened)
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel="Maturity value"
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="A fixed monthly deposit, compounded quarter by quarter."
          ctaTo="/investments/recurring-deposit"
          ctaLabel="Open a Recurring Deposit"
          onCtaClick={() => onOpenApply?.(RD, monthly, selectedBand.tenure)}
          pulseKey={selectedBand.tenure}
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Total deposited" value={formatINR(result.totalDeposited)} />
              <ResultRow label="Interest earned" value={formatINR(result.interestEarned)} />
            </div>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SIP
// ---------------------------------------------------------------------------

function SipCalculator({ onOpenApply }) {
  const [monthly, setMonthly] = useState(10000);
  const [returnPct, setReturnPct] = useState(12);
  const [years, setYears] = useState(10);

  const result = useMemo(
    () =>
      tryCalc(() =>
        calculateSIP({
          monthlyInvestment: monthly,
          expectedReturnPct: returnPct,
          tenureMonths: Math.round(years) * 12,
        }),
      ),
    [monthly, returnPct, years],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 shadow-none lg:col-span-3">
        <div className="space-y-6">
          <SliderControl
            label="Monthly investment"
            value={monthly}
            min={SIP.minMonthly}
            max={100000}
            step={500}
            suffix="₹"
            onChange={setMonthly}
            hint={`SIP on this platform starts at ${formatINRWhole(SIP.minMonthly)} a month.`}
          />
          <SliderControl
            label="Assumed annual return"
            value={returnPct}
            min={1}
            max={20}
            step={0.5}
            decimals={1}
            suffix="% p.a."
            onChange={setReturnPct}
            hint="An assumption you choose for this illustration — not a rate the bank offers or expects."
          />
          <SliderControl
            label="Investment period"
            value={years}
            min={1}
            max={30}
            step={1}
            suffix="years"
            onChange={setYears}
          />
        </div>
      </Card>

      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel="Projected value (illustration only)"
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="What the deposits above would grow to IF markets returned exactly the assumed rate every year. They will not."
          ctaTo="/investments/systematic-investment-plan"
          ctaLabel="Start a SIP"
          onCtaClick={() => onOpenApply?.(SIP, monthly, years)}
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
              </div>
            </>
          )}
        </ResultPanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SSY
// ---------------------------------------------------------------------------

function SsyCalculator({ onOpenApply }) {
  const [yearly, setYearly] = useState(100000);

  const result = useMemo(
    () =>
      tryCalc(() =>
        calculateSSY({
          annualDeposit: yearly,
          annualRatePct: SSY.rate,
          depositYears: SSY.depositYears,
          maturityYears: SSY.tenureYears,
          maxDepositPerYear: SSY.maxDepositYearly,
        }),
      ),
    [yearly],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-6">
        <Card className="p-6 shadow-none">
          <div className="space-y-6">
            <SliderControl
              label="Deposit per year"
              value={yearly}
              min={SSY.minDepositYearly}
              max={SSY.maxDepositYearly}
              step={250}
              suffix="₹"
              onChange={setYearly}
              hint={`Scheme limits: ${formatINRWhole(SSY.minDepositYearly)} to ${formatINRWhole(
                SSY.maxDepositYearly,
              )} per financial year. Deposits are made for ${SSY.depositYears} years; the account matures after ${
                SSY.tenureYears
              } years.`}
            />
            <div className="rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3">
              <p className="text-sm text-ink-700">
                Interest rate used: <strong className="font-semibold text-midnight-900">{SSY.rate.toFixed(2)}% p.a.</strong>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{SSY.rateNote}</p>
            </div>
          </div>
        </Card>

        {/* Fix 4: Collapsible year-wise schedule (calculateSSY schedule) */}
        {result && result.schedule && (
          <details className="rounded-xl border border-ink-100 bg-white shadow-card">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-midnight-900">
              Year-wise deposit and interest projection (21-year schedule)
            </summary>
            <div className="border-t border-ink-100 px-6 py-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                      <th className="py-2 pr-3 font-semibold">Year</th>
                      <th className="py-2 pr-3 text-right font-semibold">Deposit</th>
                      <th className="py-2 pr-3 text-right font-semibold">Interest</th>
                      <th className="py-2 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row, idx) => (
                      <tr
                        key={row.year}
                        style={{ '--stagger-index': idx }}
                        className="border-b border-ink-50 last:border-0 reveal-schedule-row"
                      >
                        <td className="py-2 pr-3 text-ink-700">Year {row.year}</td>
                        <td className="py-2 pr-3 text-right text-ink-800">{formatINR(row.deposit)}</td>
                        <td className="py-2 pr-3 text-right text-ink-800">{formatINR(row.interest)}</td>
                        <td className="py-2 text-right font-medium text-ink-900">{formatINR(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        )}
      </div>

      <div className="lg:col-span-2">
        <ResultPanel
          headlineLabel={`Maturity value at ${SSY.tenureYears} years (projection)`}
          headlineValue={result ? formatINR(result.maturityValue) : '—'}
          headlineNote="Projection at the rate above, held unchanged for the full term. The government revises the SSY rate from time to time, so the actual maturity value will differ."
          ctaTo="/investments/sukanya-samriddhi"
          ctaLabel="Open an SSY account"
          onCtaClick={() => onOpenApply?.(SSY, yearly)}
        >
          {result && (
            <div className="mt-4">
              <ResultRow label="Deposit applied per year" value={formatINR(result.appliedAnnualDeposit)} />
              <ResultRow label={`Total deposited (${SSY.depositYears} years)`} value={formatINR(result.totalDeposited)} />
              <ResultRow label="Interest earned (projected)" value={formatINR(result.interestEarned)} />
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
  const [applyModalState, setApplyModalState] = useState(null);

  const handleOpenApply = (product, initialAmount, initialTenure, initialCategory, initialTenureMonths) => {
    setApplyModalState({ product, initialAmount, initialTenure, initialCategory, initialTenureMonths });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader
        reveal
        titleAs="h1"
        eyebrow="Calculators"
        title="Plan the numbers before you apply"
        description="The same finance library the bank's loan and deposit engines use — no rounded-off marketing maths. Every result is an illustration based on the figures you enter."
        action={<Calculator className="hidden h-8 w-8 text-gold-500 sm:block" aria-hidden />}
      />
      <CalculatorTabs
        tabs={TABS}
        active={active}
        onChange={(id) => setSearchParams({ tab: id }, { replace: true })}
      />
      <div key={active} className="mt-6 animate-calc-fade-rise motion-reduce:animate-none">
        {active === 'emi' && <EmiCalculator onOpenApply={handleOpenApply} />}
        {active === 'fd' && <FdCalculator onOpenApply={handleOpenApply} />}
        {active === 'rd' && <RdCalculator onOpenApply={handleOpenApply} />}
        {active === 'sip' && <SipCalculator onOpenApply={handleOpenApply} />}
        {active === 'ssy' && <SsyCalculator onOpenApply={handleOpenApply} />}
      </div>

      {applyModalState && (
        <ApplyModal
          open={Boolean(applyModalState)}
          product={applyModalState.product}
          initialAmount={applyModalState.initialAmount}
          initialTenure={applyModalState.initialTenure}
          initialCategory={applyModalState.initialCategory}
          initialTenureMonths={applyModalState.initialTenureMonths}
          onClose={() => setApplyModalState(null)}
        />
      )}
    </div>
  );
}

export { CalculatorsPage };
