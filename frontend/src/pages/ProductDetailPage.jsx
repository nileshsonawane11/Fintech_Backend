import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Info,
  ShieldCheck,
  Sparkles,
  SearchX,
  SlidersHorizontal,
  Wallet,
  Landmark,
  CreditCard,
  Building2,
  PiggyBank,
  TrendingUp,
  Percent,
  Award,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Button, Card, EmptyState, Table } from '../components/ui.jsx';
import { ApplyModal } from '../components/common/ApplyModal.jsx';
import { CardVisual } from '../components/common/CardVisual.jsx';
import { TiltCard } from '../components/TiltCard.jsx';
import {
  RATE_DISCLAIMER,
  SAVINGS_SLABS,
  getProductBySlug,
  getProductsByCategory,
  ALL_PRODUCTS,
} from '../data/products.js';
import { formatINR, formatINRWhole, shortProductName } from '../lib/format.js';
import {
  calculateEMI,
  calculateFD,
  calculateRD,
  calculateSIP,
  calculateSSY,
} from '../lib/finance.js';

const CATEGORY_MAP = {
  accounts: { category: 'account', base: '/accounts', label: 'Accounts', singular: 'account' },
  cards: { category: 'card', base: '/cards', label: 'Cards', singular: 'card' },
  loans: { category: 'loan', base: '/loans', label: 'Loans', singular: 'loan' },
  investments: { category: 'investment', base: '/investments', label: 'Investments', singular: 'investment' },
};

const FALLBACK_STEPS = [
  'Choose your product variant and verify key eligibility criteria online in seconds',
  'Submit your application with instant paperless Aadhaar & PAN verification',
  'Access and manage your active account, card, or holding directly inside NetBanking',
];

const indianNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function moneyOrNil(value) {
  if (value === null || value === undefined) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function feeRows(product) {
  if (Array.isArray(product.charges) && product.charges.length > 0) {
    return product.charges.map((c) => ({ service: c.service, fee: c.fee }));
  }
  const rows = [];
  if (product.processingFee && typeof product.processingFee === 'object') {
    const pf = product.processingFee;
    const bounds = [];
    if (pf.min !== null && pf.min !== undefined) bounds.push(`min. ${pf.min === 0 ? 'Nil' : formatINRWhole(pf.min)}`);
    if (pf.max !== null && pf.max !== undefined) bounds.push(`max. ${formatINRWhole(pf.max)}`);
    rows.push({
      service: 'Processing fee',
      fee: `${pf.pct}% of loan amount${bounds.length ? ` (${bounds.join(', ')})` : ''}${pf.note ? ` — ${pf.note}` : ''}`,
    });
  }
  if (product.fees && typeof product.fees === 'object' && !Array.isArray(product.fees)) {
    for (const [key, value] of Object.entries(product.fees)) {
      rows.push({
        service: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        fee: typeof value === 'number' ? (value === 0 ? 'Nil' : formatINRWhole(value)) : String(value),
      });
    }
  }
  if (typeof product.joiningFee === 'number' || typeof product.annualFee === 'number') {
    rows.unshift(
      { service: 'Joining fee', fee: moneyOrNil(product.joiningFee) },
      { service: 'Annual fee', fee: moneyOrNil(product.annualFee) }
    );
    if (product.annualFeeWaiver) rows.push({ service: 'Annual fee waiver', fee: product.annualFeeWaiver });
  }
  if (rows.length === 0) {
    rows.push(
      { service: 'Account maintenance / Issuance', fee: 'Nil' },
      { service: 'Digital fund transfers (NEFT/IMPS/UPI)', fee: 'Free & Unlimited' },
      { service: 'Quarterly e-statements', fee: 'Free' }
    );
  }
  return rows;
}

function faqList(product) {
  if (Array.isArray(product.faqs) && product.faqs.length > 0) {
    return product.faqs
      .map((f) => ({ question: f.q || f.question || '', answer: f.a || f.answer || '' }))
      .filter((f) => f.question && f.answer);
  }
  return [
    {
      question: `What are the primary eligibility criteria for ${shortProductName(product.name)}?`,
      answer: `Applicants must be resident Indians aged 18 years or above with valid Aadhaar and PAN documents for paperless verification.`,
    },
    {
      question: `How quickly is the application processed?`,
      answer: `Digital onboarding and document verification are completed in minutes. Account details or card approvals reflect instantly in your portal.`,
    },
    {
      question: `Are there any hidden maintenance fees?`,
      answer: `No. FinEdge operates with complete transparency. All charges, maintenance schedules, and waivers are outlined in our schedule of charges.`,
    },
  ];
}

/* =========================================================================
   PART E / I SLIDER CONTROL
   Inputs in bordered input box ABOVE slider;
   Sliders are thin grey tracks with solid red circular thumb and red fill;
   Range labels at both ends.
========================================================================= */
function IdftSliderControl({ label, value, min, max, step = 1, prefix = '₹', suffix = '', onChange }) {
  const percent = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">{label}</label>
        <div className="flex items-center rounded-lg border border-neutral-300 bg-white px-2.5 py-1 shadow-xs focus-within:border-[#981a1d] focus-within:ring-1 focus-within:ring-[#981a1d]">
          {prefix && <span className="text-xs font-bold text-neutral-500 mr-1">{prefix}</span>}
          <input
            type="text"
            value={indianNumber.format(value)}
            onChange={(e) => {
              const raw = Number(e.target.value.replace(/[^0-9]/g, ''));
              if (!isNaN(raw)) onChange(clamp(raw, min, max));
            }}
            className="w-24 text-right font-mono text-sm font-bold text-neutral-900 focus:outline-hidden"
          />
          {suffix && <span className="text-xs font-semibold text-neutral-500 ml-1">{suffix}</span>}
        </div>
      </div>

      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="idfc-slider w-full h-1.5 cursor-pointer appearance-none rounded-lg bg-neutral-200"
          style={{
            background: `linear-gradient(to right, #981a1d 0%, #981a1d ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-[11px] font-medium text-neutral-400 mt-1">
          <span>{prefix}{indianNumber.format(min)}{suffix}</span>
          <span>{prefix}{indianNumber.format(max)}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   HERO CALCULATOR CARD (Part E styling applied on Hero right zone)
========================================================================= */
function HeroProductCalculator({ product, onApplyWithFigures, isLogged }) {
  const cat = product.category;
  const isFD = cat === 'investment' && (product.kind === 'FD' || product.slug === 'fixed-deposit');
  const isRD = cat === 'investment' && (product.kind === 'RD' || product.slug === 'recurring-deposit');
  const isSIP = cat === 'investment' && (product.kind === 'SIP' || product.slug === 'systematic-investment-plan');
  const isSSY = cat === 'investment' && (product.kind === 'SSY' || product.slug === 'sukanya-samriddhi');
  const isLoan = cat === 'loan';
  const isCard = cat === 'card';
  const isAccount = cat === 'account';

  // State
  const [fdAmount, setFdAmount] = useState(100000);
  const [fdTenureBand, setFdTenureBand] = useState('2 – 3 years');
  const [fdSenior, setFdSenior] = useState(false);

  const [loanAmount, setLoanAmount] = useState(product.maxAmount ? Math.min(2500000, product.maxAmount) : 1000000);
  const [loanTenureMonths, setLoanTenureMonths] = useState(product.tenureMaxMonths ? Math.min(120, product.tenureMaxMonths) : 60);

  const [savingsBal, setSavingsBal] = useState(250000);
  const [cardSpend, setCardSpend] = useState(35000);

  // FD Math
  const bands = product.rateGrid || [];
  const selectedBand = bands.find((b) => b.tenure === fdTenureBand) || bands[4] || bands[0];
  const baseFdRate = selectedBand ? selectedBand.general : 6.95;
  const fdMonths =
    selectedBand?.tenure === '7 – 45 days' ? 1 :
    selectedBand?.tenure === '46 – 179 days' ? 4 :
    selectedBand?.tenure === '180 – 364 days' ? 9 :
    selectedBand?.tenure === '1 – 2 years' ? 24 :
    selectedBand?.tenure === '2 – 3 years' ? 36 :
    selectedBand?.tenure === '3 – 5 years' ? 48 : 60;

  const fdResult = useMemo(() => {
    if (!isFD) return null;
    try {
      return calculateFD({
        principal: fdAmount,
        annualRatePct: baseFdRate,
        tenureMonths: fdMonths,
        seniorCitizen: fdSenior,
        seniorCitizenDeltaPct: product.seniorDelta || 0.5,
      });
    } catch {
      return null;
    }
  }, [isFD, fdAmount, baseFdRate, fdMonths, fdSenior, product.seniorDelta]);

  // Loan Math
  const loanRate = product.rateMin || 8.35;
  const loanResult = useMemo(() => {
    if (!isLoan) return null;
    try {
      return calculateEMI(loanAmount || 1000000, loanRate, loanTenureMonths || 60);
    } catch {
      return null;
    }
  }, [isLoan, loanAmount, loanRate, loanTenureMonths]);

  // Savings Math
  const savingsAnnualInterest = useMemo(() => {
    let bal = savingsBal;
    let total = 0;
    for (const slab of SAVINGS_SLABS) {
      if (bal <= 0) break;
      const lower = slab.min || 0;
      const upper = slab.max || Infinity;
      const slabSpan = upper - lower;
      if (bal > lower) {
        const taxableInSlab = Math.min(bal - lower, slabSpan);
        total += taxableInSlab * (slab.rate / 100);
      }
    }
    return Math.round(total);
  }, [savingsBal]);

  // Card Rewards Math
  const cardCashbackAnnual = useMemo(() => {
    const rate = product.cashbackPct || 2;
    return Math.round(cardSpend * 12 * (rate / 100));
  }, [cardSpend, product.cashbackPct]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xl text-neutral-900">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-150">
        <div>
          <h3 className="font-sans font-bold text-base text-neutral-900">
            {isFD ? 'Fixed Deposit Calculator' :
             isLoan ? 'Loan EMI Calculator' :
             isAccount ? 'Savings Interest Calculator' :
             isCard ? 'Rewards & Cashback Estimator' :
             'Financial Estimator'}
          </h3>
          <p className="text-xs text-neutral-500">Live computation based on official rates</p>
        </div>
        <span className="rounded-full bg-red-50 text-[#981a1d] px-2.5 py-0.5 text-xs font-bold border border-red-200">
          Instant
        </span>
      </div>

      <div className="space-y-4">
        {/* FD Controls */}
        {isFD && (
          <>
            <IdftSliderControl
              label="Deposit Amount"
              value={fdAmount}
              min={product.minAmount || 5000}
              max={2500000}
              step={5000}
              onChange={setFdAmount}
            />
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                Tenure Band
              </label>
              <select
                value={fdTenureBand}
                onChange={(e) => setFdTenureBand(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-[#981a1d] focus:outline-hidden"
              >
                {bands.map((b) => (
                  <option key={b.tenure} value={b.tenure}>
                    {b.tenure} — {b.general.toFixed(2)}% p.a. {fdSenior ? `(Senior: ${b.senior.toFixed(2)}%)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={fdSenior}
                onChange={(e) => setFdSenior(e.target.checked)}
                className="h-4 w-4 rounded-sm text-[#981a1d] accent-[#981a1d]"
              />
              <span>Senior Citizen (+{(product.seniorDelta || 0.5).toFixed(2)}% p.a.)</span>
            </label>
          </>
        )}

        {/* Loan Controls */}
        {isLoan && (
          <>
            <IdftSliderControl
              label="Loan Amount"
              value={loanAmount}
              min={product.minAmount || 50000}
              max={product.maxAmount || 5000000}
              step={25000}
              onChange={setLoanAmount}
            />
            <IdftSliderControl
              label="Tenure (Months)"
              value={loanTenureMonths}
              min={product.tenureMinMonths || 12}
              max={product.tenureMaxMonths || 240}
              step={6}
              prefix=""
              suffix=" mo"
              onChange={setLoanTenureMonths}
            />
          </>
        )}

        {/* Account Controls */}
        {isAccount && (
          <IdftSliderControl
            label="Average Daily Balance"
            value={savingsBal}
            min={10000}
            max={5000000}
            step={10000}
            onChange={setSavingsBal}
          />
        )}

        {/* Card Controls */}
        {isCard && (
          <IdftSliderControl
            label="Monthly Card Spends"
            value={cardSpend}
            min={5000}
            max={200000}
            step={2500}
            onChange={setCardSpend}
          />
        )}

        {/* Other Investments fallback */}
        {!isFD && !isLoan && !isAccount && !isCard && (
          <IdftSliderControl
            label="Investment Amount"
            value={fdAmount}
            min={1000}
            max={500000}
            step={1000}
            onChange={setFdAmount}
          />
        )}
      </div>

      {/* Result Panel in Bold Red */}
      <div className="mt-5 rounded-xl bg-neutral-50 p-4 border border-neutral-200">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {isFD ? 'Estimated Maturity Value' :
           isLoan ? 'Monthly EMI' :
           isAccount ? 'Annual Interest Earned' :
           isCard ? 'Estimated Annual Savings' :
           'Projected Return'}
        </p>
        <p className="font-sans text-2xl sm:text-3xl font-black text-[#981a1d] tracking-tight mt-0.5">
          {isFD && (fdResult ? formatINR(fdResult.maturityValue) : '—')}
          {isLoan && (loanResult ? `${formatINRWhole(loanResult.emi)} / mo` : '—')}
          {isAccount && formatINR(savingsAnnualInterest)}
          {isCard && formatINR(cardCashbackAnnual)}
          {!isFD && !isLoan && !isAccount && !isCard && formatINR(fdAmount * 1.07)}
        </p>

        <div className="mt-2 pt-2 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-600">
          <span>
            {isFD && `Rate: ${fdResult ? fdResult.rateAppliedPct.toFixed(2) : baseFdRate}% p.a.`}
            {isLoan && `Rate: ${loanRate.toFixed(2)}% p.a.`}
            {isAccount && 'Tiered slab qualification'}
            {isCard && `Up to ${product.cashbackPct || 2}% rewards value`}
          </span>
          <span className="font-semibold text-neutral-800">
            {isFD && `Interest: ${fdResult ? formatINR(fdResult.interestEarned) : '—'}`}
            {isLoan && `Total Interest: ${loanResult ? formatINRWhole(loanResult.totalInterest) : '—'}`}
            {isAccount && 'Credited Quarterly'}
            {isCard && 'No annual cap'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="primary"
          onClick={() => {
            if (isFD && onApplyWithFigures) {
              onApplyWithFigures(product, { amount: fdAmount, tenure: fdTenureBand });
            } else if (onApplyWithFigures) {
              onApplyWithFigures(product);
            }
          }}
          className="w-full justify-center font-bold text-sm shadow-sm"
        >
          {isLogged ? 'Apply with these figures' : (cat === 'account' ? 'Open Account Now' : 'Login to Apply')}
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   VARIANTS / TYPES SECTION
   Pill tab row, selected = solid red pill;
   One large feature card per variant: visual left, pale panel right with dot bullets,
   red "Know more" link + red pill CTA.
========================================================================= */
function VariantsSection({ currentProduct, categoryProducts, onApply, isLogged }) {
  const [activeVariantSlug, setActiveVariantSlug] = useState(currentProduct.slug);
  const activeVariant = categoryProducts.find((p) => p.slug === activeVariantSlug) || currentProduct;
  const isCard = activeVariant.category === 'card';

  return (
    <section id="variants" className="py-14 border-t border-neutral-200 bg-white">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Explore All {activeVariant.category === 'account' ? 'Accounts' :
                         activeVariant.category === 'loan' ? 'Loan Options' :
                         activeVariant.category === 'card' ? 'Card Variants' :
                         'Investment Options'}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Compare features across our full catalog to pick the right financial solution.
          </p>
        </div>

        {/* Pill Tab Row */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {categoryProducts.map((p) => {
            const isSelected = p.slug === activeVariantSlug;
            return (
              <button
                key={p.slug}
                onClick={() => setActiveVariantSlug(p.slug)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#981a1d] text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {shortProductName(p.name)}
              </button>
            );
          })}
        </div>

        {/* Large Feature Card: Visual Left, Pale Panel Right */}
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12">
          {/* Visual Left */}
          <div className="lg:col-span-5 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 p-8 flex flex-col items-center justify-center text-center text-white relative min-h-[260px]">
            {isCard ? (
              <div className="w-full max-w-[280px]">
                <TiltCard maxTilt={10} perspective={800} sweepKey={activeVariant.slug}>
                  <CardVisual card={activeVariant} shadow={false} />
                </TiltCard>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-[#981a1d] to-amber-500/80 p-0.5 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full bg-neutral-900 rounded-2xl flex items-center justify-center text-white">
                    {activeVariant.category === 'account' ? <Wallet className="w-10 h-10 text-amber-400" /> :
                     activeVariant.category === 'loan' ? <Landmark className="w-10 h-10 text-blue-400" /> :
                     <PiggyBank className="w-10 h-10 text-purple-400" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                    FinEdge Certified
                  </span>
                  <h4 className="text-xl font-bold mt-1 text-white">
                    {shortProductName(activeVariant.name)}
                  </h4>
                  <p className="text-xs text-neutral-300 max-w-xs mx-auto mt-1 line-clamp-2">
                    {activeVariant.tagline}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pale Panel Right with Dot Bullets & CTA */}
          <div className="lg:col-span-7 bg-[#f5f6f7] p-6 lg:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#981a1d]/10 text-[#981a1d]">
                  {activeVariant.category.toUpperCase()}
                </span>
                <span className="text-xs text-neutral-500">
                  Ref: {activeVariant.slug}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
                {activeVariant.name}
              </h3>
              <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                {activeVariant.tagline || activeVariant.overview}
              </p>

              {/* Dot Bullets */}
              <ul className="mt-5 space-y-2.5">
                {(activeVariant.features || activeVariant.rewards || [
                  'Full digital banking and paperless account access',
                  'Competitive interest rates computed with standard compounding',
                  'Zero concealed maintenance charges and free statements',
                ]).slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700">
                    <span className="w-2 h-2 rounded-full bg-[#981a1d] mt-1.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions: Red 'Know more' Link + Red Pill CTA */}
            <div className="mt-8 pt-4 border-t border-neutral-300 flex flex-wrap items-center justify-between gap-4">
              <Link
                to={`/${activeVariant.category === 'account' ? 'accounts' : activeVariant.category === 'loan' ? 'loans' : activeVariant.category === 'card' ? 'cards' : 'investments'}/${activeVariant.slug}`}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#981a1d] hover:underline"
              >
                Know more about this variant <ArrowRight className="w-4 h-4" />
              </Link>
              <Button
                variant="primary"
                onClick={() => onApply(activeVariant)}
                className="font-bold text-xs sm:text-sm shadow-sm"
              >
                {activeVariant.category === 'account'
                  ? 'Open Account'
                  : isLogged ? 'Apply Now' : 'Login to Apply'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   CLEAN RATE TABLE SECTION (Part I clean 2-column table with header row)
========================================================================= */
function RateTableSection({ product }) {
  const cat = product.category;
  const isAccount = cat === 'account';
  const isLoan = cat === 'loan';
  const isCard = cat === 'card';
  const isFD = cat === 'investment' && (product.kind === 'FD' || product.slug === 'fixed-deposit');
  const isRD = cat === 'investment' && (product.kind === 'RD' || product.slug === 'recurring-deposit');

  return (
    <section id="rates" className="py-14 border-t border-neutral-200 bg-[#f5f6f7]">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {isAccount ? 'Interest Rates & Balance Slabs' :
             isLoan ? 'Interest Rate & Financial Terms' :
             isCard ? 'Interest, Pricing & Limits' :
             'Deposit Rates & Terms'}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Official rates derived from FinEdge schedules. All figures are illustrative demonstration values.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden max-w-4xl">
          {/* Account Slabs */}
          {isAccount && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <th className="py-3.5 px-6">Balance Slab</th>
                  <th className="py-3.5 px-6 text-right">Interest Rate (% p.a.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {(product.rateSlabs || SAVINGS_SLABS).map((slab) => (
                  <tr key={slab.label} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-neutral-800">{slab.label}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-[#981a1d]">
                      {slab.rate.toFixed(2)}% p.a.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* FD Rate Grid */}
          {isFD && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <th className="py-3.5 px-6">Tenure Band</th>
                  <th className="py-3.5 px-6 text-right">Regular Rate (% p.a.)</th>
                  <th className="py-3.5 px-6 text-right">Senior Citizen (% p.a.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {(product.rateGrid || []).map((row) => (
                  <tr key={row.tenure} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-neutral-800">{row.tenure}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-[#981a1d]">
                      {row.general.toFixed(2)}%
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                      {row.senior.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* RD Rate Bands */}
          {isRD && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <th className="py-3.5 px-6">Deposit Tenure</th>
                  <th className="py-3.5 px-6 text-right">Interest Rate (% p.a.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {(product.rateBands || []).map((b) => (
                  <tr key={b.tenure} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-neutral-800">{b.tenure}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-[#981a1d]">
                      {b.rate.toFixed(2)}% p.a.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Loan Pricing */}
          {isLoan && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <th className="py-3.5 px-6">Pricing Parameter</th>
                  <th className="py-3.5 px-6 text-right">Applicable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Interest rate range</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-[#981a1d]">
                    {product.rateMin?.toFixed(2)}% – {product.rateMax?.toFixed(2)}% p.a. (reducing balance)
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Maximum loan amount</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    Up to {formatINRWhole(product.maxAmount || 5000000)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Repayment tenure</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    {product.tenureMinMonths} – {product.tenureMaxMonths} months
                  </td>
                </tr>
                {product.maxLtvPct && (
                  <tr className="hover:bg-neutral-50">
                    <td className="py-3 px-6 font-medium text-neutral-800">Maximum financing (LTV)</td>
                    <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                      Up to {product.maxLtvPct}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Card Pricing */}
          {isCard && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <th className="py-3.5 px-6">Card Fee / Limit</th>
                  <th className="py-3.5 px-6 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Credit limit range</td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-[#981a1d]">
                    {product.creditLimitRange ? `${formatINRWhole(product.creditLimitRange.min)} – ${formatINRWhole(product.creditLimitRange.max)}` : 'Slab-qualified'}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Interest-free grace period</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    Up to {product.interestFreeDays || 45} days
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Finance charge on revolving balance</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    {product.financeChargeMonthlyPct || 3.5}% / mo ({product.aprPct || 42}% APR)
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="py-3 px-6 font-medium text-neutral-800">Forex markup fee</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    {product.forexMarkupPct != null ? `${product.forexMarkupPct}%` : 'Standard'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Disclaimer row */}
        <p className="text-xs text-neutral-500 mt-3 max-w-4xl">
          {RATE_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}

/* =========================================================================
   HOW TO APPLY SECTION (Part I: 3 Numbered Step Cards)
========================================================================= */
function HowToApplySection({ steps, onApply, isLogged, cat }) {
  const stepItems = steps.slice(0, 3);
  return (
    <section id="how-to-apply" className="py-14 border-t border-neutral-200 bg-white">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            How to apply in 3 simple steps
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Experience our 100% digital, paperless onboarding flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stepItems.map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-neutral-200 bg-[#f5f6f7] p-6 flex flex-col justify-between hover:border-neutral-300 transition-colors"
            >
              <div>
                <div className="w-10 h-10 rounded-full bg-[#981a1d] text-white flex items-center justify-center font-bold text-sm shadow-sm mb-4">
                  0{idx + 1}
                </div>
                <h3 className="font-bold text-base text-neutral-900 mb-2">
                  {idx === 0 ? 'Digital Application' : idx === 1 ? 'Instant Verification' : 'Active Account Access'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {step}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-neutral-200 text-xs font-semibold text-[#981a1d] flex items-center gap-1">
                Step 0{idx + 1} of 03 <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Section boundary CTA */}
        <div className="mt-10 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-neutral-900 text-base">Ready to get started?</h4>
            <p className="text-xs text-neutral-500">Fast, secure and fully encrypted application.</p>
          </div>
          <Button
            variant="primary"
            onClick={onApply}
            className="font-bold text-sm shadow-sm"
          >
            {cat === 'account' ? 'Open Account Now' : isLogged ? 'Apply Now' : 'Login to Apply'}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   ELIGIBILITY & DOCUMENTS SECTION (Part I: Two icon-list blocks)
========================================================================= */
function EligibilitySection({ product }) {
  const e = product.eligibility;
  const docs = product.documents || [
    'PAN Card (Permanent Account Number)',
    'Aadhaar Card (with linked mobile for paperless OTP)',
    'Recent passport photograph',
    'Bank statements / Income proof (for select lending facilities)',
  ];

  return (
    <section id="eligibility" className="py-14 border-t border-neutral-200 bg-[#f5f6f7]">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Eligibility &amp; Documents Required
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Review the straightforward criteria and verification papers needed before you begin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Block 1: Eligibility Criteria */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#981a1d] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-900">Who Can Apply</h3>
                <p className="text-xs text-neutral-500">Applicant qualification criteria</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
              {Array.isArray(e) ? (
                e.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#981a1d] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#981a1d] shrink-0 mt-0.5" />
                    <span>Resident Indian individual, aged 18 years and above</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#981a1d] shrink-0 mt-0.5" />
                    <span>Active mobile number linked to Aadhaar for paperless e-sign</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#981a1d] shrink-0 mt-0.5" />
                    <span>Regular source of documented income or verified business vintage</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Block 2: Documents Required */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-900">Documents Needed</h3>
                <p className="text-xs text-neutral-500">100% digital upload &amp; verification</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
              {docs.map((doc) => (
                <li key={doc} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   FEES & CHARGES SECTION (Part I: Fees & charges block)
========================================================================= */
function FeesSection({ product }) {
  const fees = feeRows(product);
  return (
    <section id="fees" className="py-14 border-t border-neutral-200 bg-white">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Fees &amp; Operational Charges
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Complete transparency with no surprise overheads or hidden penalties.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden max-w-4xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100/90 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700">
                <th className="py-3.5 px-6">Service / Feature</th>
                <th className="py-3.5 px-6 text-right">Standard Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {fees.map((row) => (
                <tr key={row.service} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-6 font-medium text-neutral-800">{row.service}</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-neutral-900">
                    {row.fee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   FAQ ACCORDION SECTION (Part I: FAQ accordion, first item expanded)
========================================================================= */
function FaqSection({ faqs }) {
  const [openFaq, setOpenFaq] = useState(0); // first item expanded by default

  return (
    <section id="faqs" className="py-14 border-t border-neutral-200 bg-[#f5f6f7]">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Find prompt answers to popular queries regarding eligibility, rates, and onboarding.
          </p>
        </div>

        <div className="max-w-4xl space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm sm:text-base font-bold text-neutral-900 hover:text-[#981a1d] cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? 'rotate-180 text-[#981a1d]' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   RELATED PRODUCTS CAROUSEL (Part I: 4 cards from the same catalogue)
========================================================================= */
function RelatedProductsSection({ currentSlug, category, onApply, isLogged }) {
  const related = getProductsByCategory(category)
    .filter((p) => p.slug !== currentSlug)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="py-14 border-t border-neutral-200 bg-white">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Related Products
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Explore more offerings tailored to complement your financial portfolio.
            </p>
          </div>
          <Link
            to={`/${category === 'account' ? 'accounts' : category === 'loan' ? 'loans' : category === 'card' ? 'cards' : 'investments'}`}
            className="text-xs sm:text-sm font-bold text-[#981a1d] hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {related.map((p) => (
            <div
              key={p.slug}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  {p.category}
                </span>
                <h3 className="font-bold text-base text-neutral-900 mt-1 line-clamp-1">
                  {p.name.replace(/^FinEdge\s+/, '')}
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2">
                  {p.tagline}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-150 flex items-center justify-between">
                <Link
                  to={`/${category === 'account' ? 'accounts' : category === 'loan' ? 'loans' : category === 'card' ? 'cards' : 'investments'}/${p.slug}`}
                  className="text-xs font-bold text-[#981a1d] hover:underline"
                >
                  View Details →
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApply(p)}
                  className="text-xs px-3 py-1 font-semibold"
                >
                  {p.category === 'account' ? 'Apply' : isLogged ? 'Apply' : 'Login'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   STICKY SUB-NAVIGATION (Part I)
   Sticky bar directly under main header:
   Anchor links: Benefits, Types/Variants, Rates, How to Apply, Eligibility, Fees, FAQs
   Selected anchor with red underline;
   Persistent red pill CTA at right!
========================================================================= */
function StickySubNav({ sections, activeSection, onApply, ctaLabel }) {
  return (
    <div className="sticky top-[72px] z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Anchor Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={`whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#981a1d] text-[#981a1d] font-bold'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {sec.label}
              </a>
            );
          })}
        </nav>

        {/* Persistent Red Pill CTA at Right */}
        <div className="shrink-0 pl-4">
          <Button
            variant="primary"
            size="sm"
            onClick={onApply}
            className="font-bold text-xs sm:text-sm px-5 py-2 shadow-xs"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN EXPORT: PRODUCT DETAIL PAGE (MODULE 62 PART I)
========================================================================= */
export default function ProductDetailPage({ category, categoryHint }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [applyOpen, setApplyOpen] = useState(() => searchParams.get('apply') === 'true');
  const [investmentApplyState, setInvestmentApplyState] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  const product = getProductBySlug(slug);

  // Gating & Apply Handler
  const handleApply = (prod) => {
    const target = prod || product;
    const cat = target?.category || category || 'account';
    if (cat === 'account') {
      setApplyOpen(true);
      return;
    }
    const pSlug = target?.slug || '';
    const portalSec = cat === 'card' ? 'cards' : cat === 'loan' ? 'loans' : 'investments';
    if (!user) {
      navigate(`/portal/login?redirect=/portal/${portalSec}&product=${pSlug}`);
    } else {
      navigate(`/portal/${portalSec}?apply=${pSlug}`);
    }
  };

  const handleOpenInvestmentApplyWithFigures = (prod, figures) => {
    if (!user && prod?.category !== 'account') {
      navigate(`/portal/login?redirect=/portal/investments&product=${prod?.slug}`);
      return;
    }
    setInvestmentApplyState({
      open: true,
      product: prod || product,
      initialAmount: figures?.amount,
      initialTenure: figures?.tenure,
      initialCategory: figures?.category,
    });
  };

  // Active section scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['overview', 'benefits', 'variants', 'rates', 'how-to-apply', 'eligibility', 'fees', 'faqs'];
      const scrollPos = window.scrollY + 180;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!product) {
    return (
      <div className="idfc-container mx-auto px-4 py-20 text-center">
        <EmptyState
          icon={SearchX}
          title="Product Not Found"
          body={`We could not locate the product "${slug}". It may have been updated or removed from the catalog.`}
          action={
            <Link to="/accounts">
              <Button variant="primary">Return to Catalog</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const cleanProductName = product.name.replace(/^FinEdge\s+/, '');
  const faqs = faqList(product);
  const featureList = Array.isArray(product.features) && product.features.length > 0 ? product.features : product.rewards || [];
  const steps = Array.isArray(product.howToApply) && product.howToApply.length > 0 ? product.howToApply : FALLBACK_STEPS;
  const categoryProducts = getProductsByCategory(product.category);

  // Dynamic CTA label based on gating
  const ctaLabel =
    product.category === 'account'
      ? 'Open Account'
      : user
      ? (product.category === 'investment' ? 'Book Now' : 'Apply Now')
      : 'Login to Apply';

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'variants', label: 'Variants' },
    { id: 'rates', label: 'Interest & Pricing' },
    { id: 'how-to-apply', label: 'How to Apply' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'fees', label: 'Fees & Charges' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="w-full bg-white text-neutral-900">
      {/* =====================================================================
          PART I: HERO ZONE (Pale Blush #fdecec background, 3 Zones)
          Zone 1: Breadcrumb pill, headline with data-file rate, 3 benefit rows, ONE solid red pill CTA
          Zone 2: Realistic Photographic Category Backdrop with Blush Scrim
          Zone 3: White calculator card with Part E sliders & red result
      ===================================================================== */}
      <section id="overview" className="relative overflow-hidden bg-[#fdecec] py-12 sm:py-16 border-b border-red-100">
        {/* Category-matched realistic photographic backdrop with blush scrim */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src={
              product.category === 'account' ? '/images/hero-savings.webp' :
              product.category === 'card' ? '/images/hero-cards.webp' :
              product.category === 'loan' ? (product.slug.includes('gold') ? '/images/hero-gold-loan.webp' : '/images/hero-home-loan.webp') :
              (product.slug.includes('sukanya') ? '/images/hero-ssy.webp' : '/images/hero-fd.webp')
            }
            alt=""
            className="w-full h-full object-cover object-right opacity-25 mix-blend-multiply"
          />
          {/* Blush scrim: pure #fdecec on left copy zone, gently revealing realistic imagery on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdecec] via-[#fdecec]/90 to-[#fdecec]/30 lg:from-[#fdecec] lg:via-[#fdecec]/85 lg:to-transparent" />
        </div>

        <div className="idfc-container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Zone 1: Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              {/* Breadcrumb Pill */}
              <div>
                <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-neutral-700 border border-red-150 shadow-xs">
                  <Link to="/" className="hover:text-[#981a1d] transition-colors">Home</Link>
                  <span className="text-neutral-400">/</span>
                  <Link
                    to={`/${product.category === 'account' ? 'accounts' : product.category === 'loan' ? 'loans' : product.category === 'card' ? 'cards' : 'investments'}`}
                    className="hover:text-[#981a1d] transition-colors capitalize"
                  >
                    {product.category}s
                  </Link>
                  <span className="text-neutral-400">/</span>
                  <span className="text-[#981a1d] font-bold">{shortProductName(product.name)}</span>
                </nav>
              </div>

              {/* Headline with data-file rate figure */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 leading-tight">
                  {cleanProductName}
                </h1>
                <p className="text-base sm:text-lg text-neutral-700 mt-2 font-medium">
                  {product.tagline || product.overview}
                </p>
              </div>

              {/* 3 Benefit Rows with small red icons */}
              <div className="space-y-2.5 pt-1">
                {featureList.slice(0, 3).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-800">
                    <CheckCircle2 className="w-4 h-4 text-[#981a1d] shrink-0 mt-0.5" />
                    <span className="font-medium">{feat}</span>
                  </div>
                ))}
              </div>

              {/* ONE solid red pill CTA */}
              <div className="pt-2 flex items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleApply(product)}
                  className="font-bold text-sm sm:text-base px-8 py-3.5 shadow-sm"
                >
                  {ctaLabel} <ArrowRight className="w-4 h-4 ml-1.5 inline" />
                </Button>
                <a
                  href="#rates"
                  className="text-xs sm:text-sm font-bold text-[#981a1d] hover:underline"
                >
                  View Schedule of Rates ↓
                </a>
              </div>
            </div>

            {/* Zone 2 / 3: Right Side - Calculator Card */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              <HeroProductCalculator
                product={product}
                onApplyWithFigures={handleOpenInvestmentApplyWithFigures}
                isLogged={Boolean(user)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PART I: STICKY SUB-NAVIGATION DIRECTLY UNDER MAIN HEADER
      ===================================================================== */}
      <StickySubNav
        sections={sections}
        activeSection={activeSection}
        onApply={() => handleApply(product)}
        ctaLabel={ctaLabel}
      />

      {/* =====================================================================
          SECTION 1: INTRO (H1 + paragraph from existing copy)
      ===================================================================== */}
      <section className="py-14 bg-white">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#981a1d]">
              Overview &amp; Product Narrative
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mt-1">
              About {cleanProductName}
            </h2>
            <p className="text-base text-neutral-700 leading-relaxed mt-4">
              {product.overview || product.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: BENEFITS GRID (3-column cards from existing features)
      ===================================================================== */}
      <section id="benefits" className="py-14 bg-[#f5f6f7] border-t border-neutral-200">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Key Benefits &amp; Advantages
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Designed to deliver optimum flexibility, yield, and convenience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureList.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#981a1d] flex items-center justify-center font-bold mb-4">
                  {idx % 3 === 0 ? <Sparkles className="w-5 h-5" /> :
                   idx % 3 === 1 ? <ShieldCheck className="w-5 h-5" /> :
                   <TrendingUp className="w-5 h-5" />}
                </div>
                <h3 className="font-bold text-base text-neutral-900 mb-2">
                  {feat.split('—')[0] || `Benefit 0${idx + 1}`}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {feat}
                </p>
              </div>
            ))}
          </div>

          {/* Section boundary CTA */}
          <div className="mt-10 pt-6 border-t border-neutral-200 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Need personal assistance? Contact our 24/7 priority desk.</span>
            <Button variant="primary" size="sm" onClick={() => handleApply(product)} className="font-bold text-xs">
              {ctaLabel}
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: VARIANTS / TYPES (Pill tab row + Large Feature Card)
      ===================================================================== */}
      <VariantsSection
        currentProduct={product}
        categoryProducts={categoryProducts}
        onApply={handleApply}
        isLogged={Boolean(user)}
      />

      {/* =====================================================================
          SECTION 4: RATE TABLE (Clean 2-column table with header row)
      ===================================================================== */}
      <RateTableSection product={product} />

      {/* =====================================================================
          SECTION 5: HOW TO APPLY (3 numbered step cards)
      ===================================================================== */}
      <HowToApplySection
        steps={steps}
        onApply={() => handleApply(product)}
        isLogged={Boolean(user)}
        cat={product.category}
      />

      {/* =====================================================================
          SECTION 6: ELIGIBILITY & DOCUMENTS (Two icon-list blocks)
      ===================================================================== */}
      <EligibilitySection product={product} />

      {/* =====================================================================
          SECTION 7: FEES & CHARGES BLOCK
      ===================================================================== */}
      <FeesSection product={product} />

      {/* =====================================================================
          SECTION 8: FAQ ACCORDION (First item expanded by default)
      ===================================================================== */}
      <FaqSection faqs={faqs} />

      {/* =====================================================================
          SECTION 9: RELATED PRODUCTS CAROUSEL (4 cards)
      ===================================================================== */}
      <RelatedProductsSection
        currentSlug={product.slug}
        category={product.category}
        onApply={handleApply}
        isLogged={Boolean(user)}
      />

      {/* Application Modals */}
      {applyOpen && (
        <ApplyModal
          open={applyOpen}
          product={product}
          initialAmount={searchParams.get('amount') ? Number(searchParams.get('amount')) : undefined}
          initialCategory={searchParams.get('category') || undefined}
          onClose={() => setApplyOpen(false)}
        />
      )}

      {investmentApplyState?.open && (
        <ApplyModal
          open={investmentApplyState.open}
          product={investmentApplyState.product || product}
          initialAmount={investmentApplyState.initialAmount}
          initialTenure={investmentApplyState.initialTenure}
          initialCategory={investmentApplyState.initialCategory}
          onClose={() => setInvestmentApplyState(null)}
        />
      )}
    </div>
  );
}

export { ProductDetailPage };
