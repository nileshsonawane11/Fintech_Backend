import { ApplyModal } from '../components/common/ApplyModal.jsx';
import { CardVisual } from '../components/common/CardVisual.jsx';
import { TiltCard } from '../components/TiltCard.jsx';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Table } from '../components/ui.jsx';
import { RATE_DISCLAIMER, SAVINGS_SLABS, getProductBySlug, getProductsByCategory, FD, RD, SIP, SSY } from '../data/products.js';
import { LOAN_ICONS } from '../data/productIcons.js';
import { formatINR, formatINRWhole, shortProductName } from '../lib/format.js';
import { calculateEMI, calculateBulletRepayment, calculateFD, calculateRD, calculateSIP, calculateSSY } from '../lib/finance.js';

/** The route prop is plural ('accounts'); the catalogue category is singular ('account'). */
const CATEGORY_MAP = {
  accounts: { category: 'account', base: '/accounts', label: 'Accounts', singular: 'account' },
  cards: { category: 'card', base: '/cards', label: 'Cards', singular: 'card' },
  loans: { category: 'loan', base: '/loans', label: 'Loans', singular: 'loan' },
  investments: { category: 'investment', base: '/investments', label: 'Investments', singular: 'investment' },
};

const FALLBACK_STEPS = [
  'Choose the product and start your application online',
  'Fill in your details and submit the application',
  'Upload/submit KYC and product documents for verification',
  'Track the application in your FinEdge account until disbursement',
];

function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/Pct$/, ' (%)')
    .replace(/^./, (c) => c.toUpperCase());
}

function moneyOrNil(value) {
  if (value === null || value === undefined) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function feeValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (/Pct$/.test(key)) return `${value}%`;
    return moneyOrNil(value);
  }
  return String(value);
}

function tenureLabel(minMonths, maxMonths) {
  if (minMonths === null || minMonths === undefined || maxMonths === null || maxMonths === undefined) return '—';
  if (minMonths % 12 === 0 && maxMonths % 12 === 0) {
    const lo = minMonths / 12;
    const hi = maxMonths / 12;
    return lo === hi ? `${lo} year${lo === 1 ? '' : 's'}` : `${lo} – ${hi} years`;
  }
  return minMonths === maxMonths ? `${minMonths} months` : `${minMonths} – ${maxMonths} months`;
}

/** Normalise the three fee shapes in the catalogue into {service, fee} rows. */
function feeRows(product) {
  if (Array.isArray(product.charges) && product.charges.length > 0) {
    return product.charges.map((c) => ({ service: c.service, fee: c.fee }));
  }
  const rows = [];
  if (product.processingFee && typeof product.processingFee === 'object') {
    const pf = product.processingFee;
    const bounds = [];
    if (pf.min !== null && pf.min !== undefined) bounds.push(`minimum ${pf.min === 0 ? 'Nil' : formatINRWhole(pf.min)}`);
    if (pf.max !== null && pf.max !== undefined) bounds.push(`maximum ${formatINRWhole(pf.max)}`);
    rows.push({
      service: 'Processing fee',
      fee: `${pf.pct}% of the sanctioned amount${bounds.length ? ` (${bounds.join(', ')})` : ''}${pf.note ? ` — ${pf.note}` : ''}`,
    });
  }
  if (product.fees && typeof product.fees === 'object' && !Array.isArray(product.fees)) {
    for (const [key, value] of Object.entries(product.fees)) {
      rows.push({ service: humanize(key), fee: feeValue(key, value) });
    }
  }
  if (typeof product.joiningFee === 'number' || typeof product.annualFee === 'number') {
    rows.unshift(
      { service: 'Joining fee', fee: moneyOrNil(product.joiningFee) },
      { service: 'Annual fee', fee: moneyOrNil(product.annualFee) },
    );
    if (product.annualFeeWaiver) rows.push({ service: 'Annual fee waiver', fee: product.annualFeeWaiver });
  }
  return rows;
}

function faqList(product) {
  if (!Array.isArray(product.faqs)) return [];
  return product.faqs
    .map((f) => ({ question: f.q || f.question || '', answer: f.a || f.answer || '' }))
    .filter((f) => f.question && f.answer);
}

function Eligibility({ product, compact = false }) {
  const e = product.eligibility;
  if (!e) return null;

  if (Array.isArray(e)) {
    if (e.length === 0) return null;
    return (
      <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {e.map((item) => (
          <li key={item} className={`flex gap-2 text-ink-700 ${compact ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'}`}>
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-midnight-700" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof e === 'object') {
    const rows = [];
    if (e.ageMin !== null && e.ageMin !== undefined) {
      rows.push({ label: 'Age', value: e.ageMax ? `${e.ageMin} – ${e.ageMax} years` : `${e.ageMin} years and above` });
    }
    if (e.minMonthlyIncome) rows.push({ label: 'Min. monthly income', value: formatINRWhole(e.minMonthlyIncome) });
    if (e.minAnnualTurnover) rows.push({ label: 'Min. annual turnover', value: formatINRWhole(e.minAnnualTurnover) });
    if (e.minBusinessVintageYears) {
      rows.push({ label: 'Min. business vintage', value: `${e.minBusinessVintageYears} years` });
    }
    if (e.creditScoreMin) rows.push({ label: 'Min. credit score', value: String(e.creditScoreMin) });
    return (
      <div className="space-y-2.5">
        {rows.length > 0 && (
          <dl className="space-y-1.5 divide-y divide-ink-100">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 pt-1.5 text-xs first:pt-0">
                <dt className="text-ink-500">{r.label}</dt>
                <dd className="text-right font-semibold text-midnight-950">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {Array.isArray(e.employment) && e.employment.length > 0 && (
          <ul className="space-y-1 pt-1">
            {e.employment.map((item) => (
              <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-700">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-midnight-700" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {e.note && <p className="text-[11px] leading-relaxed text-ink-500 pt-1 border-t border-ink-100">{e.note}</p>}
      </div>
    );
  }
  return null;
}

function RateSection({ product }) {
  /* Accounts — slab table. */
  if (product.category === 'account') {
    const slabs =
      Array.isArray(product.rateSlabs) && product.rateSlabs.length > 0
        ? product.rateSlabs
        : product.accountType && product.accountType !== 'CURRENT'
          ? SAVINGS_SLABS
          : [];
    return (
      <div className="space-y-4">
        {product.interestNote && <p className="text-sm leading-relaxed text-ink-700">{product.interestNote}</p>}
        {slabs.length > 0 ? (
          <Table
            columns={[
              { key: 'label', label: 'Balance slab' },
              { key: 'rate', label: 'Rate (% p.a.)', align: 'right', render: (r) => `${r.rate.toFixed(2)}%` },
            ]}
            rows={slabs}
            rowKey={(r) => r.label}
          />
        ) : (
          <p className="text-sm text-ink-600">No interest is paid on this account.</p>
        )}
        {product.amb && (
          <dl className="space-y-2 rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-500">Average monthly balance</dt>
              <dd className="text-right font-semibold text-ink-900">{product.amb.label || moneyOrNil(product.amb.amount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-500">Non-maintenance charge</dt>
              <dd className="font-semibold text-ink-900">
                {product.amb.penaltyPerMonth ? `${formatINRWhole(product.amb.penaltyPerMonth)} per month` : 'Nil'}
              </dd>
            </div>
            {typeof product.overdraftRate === 'number' && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-500">Optional overdraft rate</dt>
                <dd className="font-semibold text-ink-900">{product.overdraftRate.toFixed(2)}% p.a. on utilisation</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    );
  }

  /* Loans — rate range, tenure, amount, LTV. */
  if (product.category === 'loan') {
    const rows = [
      { key: 'rate', label: 'Interest rate range', value: `${product.rateMin?.toFixed(2) ?? '—'}% – ${product.rateMax?.toFixed(2) ?? '—'}% p.a. (reducing balance)` },
      { key: 'amount', label: 'Maximum loan amount', value: product.maxAmount ? formatINRWhole(product.maxAmount) : '—' },
      { key: 'tenure', label: 'Tenure', value: tenureLabel(product.tenureMinMonths, product.tenureMaxMonths) },
      ...(product.maxLtvPct && product.fundingBasis
        ? [{ key: 'ltv', label: 'Maximum funding', value: `${product.maxLtvPct}% of the ${product.fundingBasis}` }]
        : []),
    ];
    return (
      <Table
        columns={[
          { key: 'label', label: 'Pricing' },
          { key: 'value', label: 'Detail', align: 'right' },
        ]}
        rows={rows}
        rowKey={(r) => r.key}
      />
    );
  }

  /* Cards — limit, interest-free period, finance charge, daily limits. */
  if (product.category === 'card') {
    const rows = [];
    if (product.creditLimitRange) {
      rows.push({
        key: 'limit',
        label: 'Credit limit range',
        value: `${formatINRWhole(product.creditLimitRange.min)} – ${formatINRWhole(product.creditLimitRange.max)}`,
      });
    }
    if (product.interestFreeDays) {
      rows.push({ key: 'grace', label: 'Interest-free period', value: `Up to ${product.interestFreeDays} days` });
    }
    if (typeof product.financeChargeMonthlyPct === 'number') {
      rows.push({
        key: 'finance',
        label: 'Finance charge on revolving balances',
        value: `${product.financeChargeMonthlyPct.toFixed(2)}% per month (${product.aprPct?.toFixed(1) ?? '—'}% APR)`,
      });
    }
    if (product.limits) {
      rows.push(
        { key: 'atm', label: 'Daily ATM limit', value: formatINRWhole(product.limits.atmDaily) },
        { key: 'pos', label: 'Daily in-store limit', value: formatINRWhole(product.limits.posDaily) },
        { key: 'online', label: 'Daily online limit', value: formatINRWhole(product.limits.onlineDaily) },
      );
    }
    if (rows.length === 0) return null;
    return (
      <Table
        columns={[
          { key: 'label', label: 'Limits & pricing' },
          { key: 'value', label: 'Detail', align: 'right' },
        ]}
        rows={rows}
        rowKey={(r) => r.key}
      />
    );
  }

  /* Investments — FD grid / RD bands / SSY rate / SIP fund categories. */
  if (product.category === 'investment') {
    if (Array.isArray(product.rateGrid) && product.rateGrid.length > 0) {
      return (
        <div className="space-y-3">
          <Table
            columns={[
              { key: 'tenure', label: 'Tenure' },
              { key: 'general', label: 'General (% p.a.)', align: 'right', render: (r) => `${r.general.toFixed(2)}%` },
              { key: 'senior', label: 'Senior citizens (% p.a.)', align: 'right', render: (r) => `${r.senior.toFixed(2)}%` },
            ]}
            rows={product.rateGrid}
            rowKey={(r) => r.tenure}
          />
          <p className="text-[13px] text-ink-500">
            Minimum deposit {product.minAmount ? formatINRWhole(product.minAmount) : '—'}. Senior-citizen premium:{' '}
            {typeof product.seniorDelta === 'number' ? `+${product.seniorDelta.toFixed(2)}% p.a.` : '—'} from age 60.
          </p>
        </div>
      );
    }
    if (Array.isArray(product.rateBands) && product.rateBands.length > 0) {
      return (
        <div className="space-y-3">
          <Table
            columns={[
              { key: 'tenure', label: 'Tenure' },
              { key: 'rate', label: 'Rate (% p.a.)', align: 'right', render: (r) => `${r.rate.toFixed(2)}%` },
            ]}
            rows={product.rateBands}
            rowKey={(r) => r.tenure}
          />
          <p className="text-[13px] text-ink-500">
            Monthly deposit from {product.minMonthly ? formatINRWhole(product.minMonthly) : '—'}
            {product.monthlyStep ? `, in multiples of ${formatINRWhole(product.monthlyStep)}` : ''}. Interest is
            compounded quarterly.
          </p>
        </div>
      );
    }
    if (typeof product.rate === 'number') {
      const rows = [
        { key: 'rate', label: 'Interest rate', value: `${product.rate.toFixed(2)}% p.a.` },
        ...(product.minDepositYearly !== undefined
          ? [{
              key: 'deposit',
              label: 'Deposit per financial year',
              value: `${formatINRWhole(product.minDepositYearly)} – ${formatINRWhole(product.maxDepositYearly)}`,
            }]
          : []),
        ...(product.depositYears ? [{ key: 'depYears', label: 'Deposit period', value: `${product.depositYears} years` }] : []),
        ...(product.tenureYears ? [{ key: 'maturity', label: 'Maturity', value: `${product.tenureYears} years` }] : []),
      ];
      return (
        <div className="space-y-3">
          <Table
            columns={[
              { key: 'label', label: 'Scheme terms' },
              { key: 'value', label: 'Detail', align: 'right' },
            ]}
            rows={rows}
            rowKey={(r) => r.key}
          />
          {product.rateNote && <p className="text-[13px] leading-relaxed text-ink-500">{product.rateNote}</p>}
        </div>
      );
    }
    if (Array.isArray(product.fundCategories) && product.fundCategories.length > 0) {
      return (
        <Table
          columns={[
            { key: 'name', label: 'Fund category' },
            { key: 'riskLevel', label: 'Risk level' },
            { key: 'note', label: 'Notes' },
          ]}
          rows={product.fundCategories}
          rowKey={(r) => r.name}
        />
      );
    }
  }
  return null;
}

function headlineStats(product) {
  const stats = [];
  if (product.category === 'account') {
    const slabs = Array.isArray(product.rateSlabs) ? product.rateSlabs : [];
    if (slabs.length) stats.push({ label: 'Interest', value: `Up to ${Math.max(...slabs.map((s) => s.rate)).toFixed(2)}% p.a.` });
    if (product.amb) stats.push({ label: 'Avg. monthly balance', value: product.amb.amount === 0 ? 'Zero balance' : formatINRWhole(product.amb.amount) });
  }
  if (product.category === 'loan') {
    stats.push({ label: 'Rate range', value: `${product.rateMin?.toFixed(2) ?? '—'} – ${product.rateMax?.toFixed(2) ?? '—'}% p.a.` });
    if (product.maxAmount) stats.push({ label: 'Maximum amount', value: formatINRWhole(product.maxAmount) });
    stats.push({ label: 'Tenure', value: tenureLabel(product.tenureMinMonths, product.tenureMaxMonths) });
  }
  if (product.category === 'card') {
    stats.push({ label: 'Joining fee', value: moneyOrNil(product.joiningFee) });
    stats.push({ label: 'Annual fee', value: moneyOrNil(product.annualFee) });
    if (product.cardType === 'credit' && typeof product.aprPct === 'number') {
      stats.push({ label: 'APR', value: `${product.aprPct.toFixed(1)}% p.a.` });
    }
    if (product.limits?.atmDaily) {
      stats.push({ label: 'ATM limit', value: formatINRWhole(product.limits.atmDaily) });
    } else if (product.network) {
      stats.push({ label: 'Network', value: product.network });
    }
  }
  if (product.category === 'investment') {
    if (product.kind === 'FD' && Array.isArray(product.rateGrid) && product.rateGrid.length > 0) {
      const topRate = Math.max(...product.rateGrid.map((r) => r.general));
      const firstTenure = product.rateGrid[0].tenure.split('–')[0].trim();
      const lastTenure = product.rateGrid[product.rateGrid.length - 1].tenure.split('–')[1]?.trim() || product.rateGrid[product.rateGrid.length - 1].tenure;
      stats.push({ label: 'Rate', value: `Up to ${topRate.toFixed(2)}% p.a.` });
      if (product.minAmount) stats.push({ label: 'Minimum amount', value: formatINRWhole(product.minAmount) });
      stats.push({ label: 'Tenure', value: `${firstTenure} – ${lastTenure}` });
    } else if (product.kind === 'RD' && Array.isArray(product.rateBands) && product.rateBands.length > 0) {
      const topRate = Math.max(...product.rateBands.map((b) => b.rate));
      const firstTenure = product.rateBands[0].tenure.split('–')[0].trim();
      const lastTenure = product.rateBands[product.rateBands.length - 1].tenure.split('–')[1]?.trim() || product.rateBands[product.rateBands.length - 1].tenure;
      stats.push({ label: 'Rate', value: `Up to ${topRate.toFixed(2)}% p.a.` });
      if (product.minMonthly) stats.push({ label: 'Minimum monthly', value: formatINRWhole(product.minMonthly) });
      stats.push({ label: 'Tenure', value: `${firstTenure} – ${lastTenure}` });
    } else if (product.kind === 'SSY' && typeof product.rate === 'number') {
      stats.push({ label: 'Rate', value: `${product.rate.toFixed(2)}% p.a.` });
      if (product.minDepositYearly && product.maxDepositYearly) {
        stats.push({ label: 'Yearly deposit', value: `${formatINRWhole(product.minDepositYearly)} – ${formatINRWhole(product.maxDepositYearly)}` });
      }
      if (product.depositYears) {
        stats.push({ label: 'Deposit period', value: `${product.depositYears} years` });
      }
    } else if (product.kind === 'SIP') {
      stats.push({ label: 'Returns', value: 'Market-linked — not guaranteed' });
      if (product.minMonthly) stats.push({ label: 'Minimum monthly', value: formatINRWhole(product.minMonthly) });
      stats.push({ label: 'Fund categories', value: String(product.fundCategories?.length || 0) });
    }
  }
  return stats;
}

// ============================================================================
// FIX 3: INTERACTIVE WIDGETS (COMPUTED PER CARD FROM ITS OWN DATA)
// ============================================================================

/** Card 1: Edge Cashback Card ("See what you'd earn") */
function CashbackCalculator({ product }) {
  const [onlineSpend, setOnlineSpend] = useState(20000);
  const [otherSpend, setOtherSpend] = useState(0);

  // 5% online capped at ₹500/month
  const rawOnlineCashback = onlineSpend * 0.05;
  const onlineCap = 500;
  const isCapped = rawOnlineCashback > onlineCap;
  const onlineCashback = Math.min(rawOnlineCashback, onlineCap);
  // 1% on other spends (uncapped)
  const otherCashback = otherSpend * 0.01;
  const totalMonthlyCashback = Math.floor(onlineCashback + otherCashback);
  const totalYearlyCashback = totalMonthlyCashback * 12;

  // Annual spend toward fee waiver: ₹2,00,000 threshold
  const totalMonthlySpend = onlineSpend + otherSpend;
  const annualSpend = totalMonthlySpend * 12;
  const waiverTarget = 200000;
  const waiverPct = Math.min(100, Math.round((annualSpend / waiverTarget) * 100));
  const waiverAchieved = annualSpend >= waiverTarget;

  return (
    <div className="rounded-xl border border-ink-200 bg-porcelain-50/80 p-5 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-midnight-950 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gold-600" aria-hidden />
            See what you'd earn
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Estimated from this card's published rates</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-midnight-900 text-porcelain-50">
          5% Online · 1% Other
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <label htmlFor="cashback-online-slider" className="font-medium text-ink-800">
              Monthly online spend
            </label>
            <span className="font-mono font-bold text-midnight-950 text-base">{formatINRWhole(onlineSpend)}</span>
          </div>
          <input
            id="cashback-online-slider"
            type="range"
            min="1000"
            max="200000"
            step="1000"
            value={onlineSpend}
            onChange={(e) => setOnlineSpend(Number(e.target.value))}
            className="w-full accent-midnight-900 cursor-pointer h-2 bg-ink-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mt-1">
            <span>₹1,000</span>
            <span>₹50,000</span>
            <span>₹1,00,000</span>
            <span>₹2,00,000</span>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-white border border-ink-100 p-3.5 shadow-xs">
            <span className="text-xs text-ink-500 block font-medium">Estimated monthly cashback</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-midnight-950 font-mono">{formatINRWhole(totalMonthlyCashback)}</span>
              {isCapped && (
                <span className="text-[10px] font-semibold text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded border border-warning-200">
                  ₹500 monthly cap applied
                </span>
              )}
            </div>
            <span className="text-[11px] text-ink-400 mt-1 block">Credited automatically as statement credit</span>
          </div>
          <div className="rounded-lg bg-white border border-ink-100 p-3.5 shadow-xs">
            <span className="text-xs text-ink-500 block font-medium">Estimated yearly cashback</span>
            <span className="text-2xl font-bold text-midnight-950 font-mono mt-1 block">{formatINRWhole(totalYearlyCashback)}</span>
            <span className="text-[11px] text-ink-400 mt-1 block">Annualized reward value</span>
          </div>
        </div>

        {/* Annual fee waiver progress line */}
        <div className="rounded-lg bg-white p-3 text-xs text-ink-700 border border-ink-100 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium">
              {formatINRWhole(annualSpend)} of {formatINRWhole(waiverTarget)} annual spends toward the fee waiver
            </span>
            <span className={`font-semibold ${waiverAchieved ? 'text-success-700' : 'text-midnight-900'}`}>
              {waiverAchieved ? 'Waiver achieved' : `${waiverPct}%`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${waiverAchieved ? 'bg-success-600' : 'bg-midnight-800'}`}
              style={{ width: `${waiverPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card 2: Edge Voyage Card ("See what you'd earn") */
function VoyageCalculator({ product }) {
  const [monthlySpend, setMonthlySpend] = useState(50000);
  const [travelShare, setTravelShare] = useState(30);

  // 4 points per ₹150 on travel spends; 2 per ₹150 elsewhere (1 point = ₹0.50 on travel redemption)
  const travelSpend = Math.round(monthlySpend * (travelShare / 100));
  const otherSpend = monthlySpend - travelSpend;

  const travelPoints = (travelSpend / 150) * 4;
  const otherPoints = (otherSpend / 150) * 2;
  const totalMonthlyPoints = Math.round(travelPoints + otherPoints);
  const totalMonthlyValue = Math.round(totalMonthlyPoints * 0.50);

  const totalYearlyPoints = totalMonthlyPoints * 12;
  const totalYearlyValue = totalMonthlyValue * 12;

  // Fee waiver: ₹6,00,000 annual spend
  const annualSpend = monthlySpend * 12;
  const waiverTarget = 600000;
  const waiverPct = Math.min(100, Math.round((annualSpend / waiverTarget) * 100));
  const waiverAchieved = annualSpend >= waiverTarget;

  return (
    <div className="rounded-xl border border-ink-200 bg-porcelain-50/80 p-5 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-midnight-950 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gold-600" aria-hidden />
            See what you'd earn
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Estimated from this card's published rates</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-midnight-900 text-porcelain-50">
          4 pts / ₹150 Travel · 1 pt = ₹0.50
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <label htmlFor="voyage-spend-slider" className="font-medium text-ink-800">
              Monthly total spend
            </label>
            <span className="font-mono font-bold text-midnight-950 text-base">{formatINRWhole(monthlySpend)}</span>
          </div>
          <input
            id="voyage-spend-slider"
            type="range"
            min="1000"
            max="200000"
            step="1000"
            value={monthlySpend}
            onChange={(e) => setMonthlySpend(Number(e.target.value))}
            className="w-full accent-midnight-900 cursor-pointer h-2 bg-ink-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mt-1">
            <span>₹1,000</span>
            <span>₹50,000</span>
            <span>₹1,00,000</span>
            <span>₹2,00,000</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <label htmlFor="voyage-travel-slider" className="font-medium text-ink-800">
              Travel spend share
            </label>
            <span className="font-mono font-bold text-midnight-950 text-base">{travelShare}% ({formatINRWhole(travelSpend)})</span>
          </div>
          <input
            id="voyage-travel-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={travelShare}
            onChange={(e) => setTravelShare(Number(e.target.value))}
            className="w-full accent-midnight-900 cursor-pointer h-2 bg-ink-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mt-1">
            <span>0% (Retail only)</span>
            <span>50%</span>
            <span>100% (All travel bookings)</span>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-white border border-ink-100 p-3.5 shadow-xs">
            <span className="text-xs text-ink-500 block font-medium">Monthly reward value</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-midnight-950 font-mono">{formatINRWhole(totalMonthlyValue)}</span>
              <span className="text-xs text-ink-500 font-mono">({totalMonthlyPoints.toLocaleString('en-IN')} pts)</span>
            </div>
            <span className="text-[11px] text-ink-400 mt-1 block">Redeemable against airline/hotel bookings</span>
          </div>
          <div className="rounded-lg bg-white border border-ink-100 p-3.5 shadow-xs">
            <span className="text-xs text-ink-500 block font-medium">Yearly reward value</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-midnight-950 font-mono">{formatINRWhole(totalYearlyValue)}</span>
              <span className="text-xs text-ink-500 font-mono">({totalYearlyPoints.toLocaleString('en-IN')} pts)</span>
            </div>
            <span className="text-[11px] text-ink-400 mt-1 block">Annualized travel redemption</span>
          </div>
        </div>

        {/* Fee waiver progress line */}
        <div className="rounded-lg bg-white p-3 text-xs text-ink-700 border border-ink-100 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium">
              {formatINRWhole(annualSpend)} of {formatINRWhole(waiverTarget)} annual spends toward the fee waiver
            </span>
            <span className={`font-semibold ${waiverAchieved ? 'text-success-700' : 'text-midnight-900'}`}>
              {waiverAchieved ? 'Waiver achieved' : `${waiverPct}%`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${waiverAchieved ? 'bg-success-600' : 'bg-midnight-800'}`}
              style={{ width: `${waiverPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card 3: Edge Assured Card ("Your limit, from your deposit") */
function AssuredCalculator({ product }) {
  const minFd = 12000;
  const maxFd = 500000;
  const [fdAmount, setFdAmount] = useState(50000);
  const limitPct = 85;

  const computedLimit = Math.floor(fdAmount * (limitPct / 100));

  return (
    <div className="rounded-xl border border-ink-200 bg-porcelain-50/80 p-5 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-midnight-950 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gold-600" aria-hidden />
            Your limit, from your deposit
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Estimated from this card's published rates</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-midnight-900 text-porcelain-50">
          85% Limit · Zero Credit Check
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <label htmlFor="assured-fd-slider" className="font-medium text-ink-800">
              Fixed deposit amount
            </label>
            <span className="font-mono font-bold text-midnight-950 text-base">{formatINRWhole(fdAmount)}</span>
          </div>
          <input
            id="assured-fd-slider"
            type="range"
            min={minFd}
            max={maxFd}
            step="1000"
            value={fdAmount}
            onChange={(e) => setFdAmount(Number(e.target.value))}
            className="w-full accent-midnight-900 cursor-pointer h-2 bg-ink-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-ink-400 mt-1">
            <span>{formatINRWhole(minFd)} (Min. FD)</span>
            <span>₹1,00,000</span>
            <span>₹2,50,000</span>
            <span>{formatINRWhole(maxFd)}</span>
          </div>
        </div>

        {/* Live computed limit line */}
        <div className="rounded-lg bg-gold-50/70 border border-gold-200/80 p-4 shadow-xs">
          <span className="text-xs font-semibold text-midnight-900 uppercase tracking-wider block mb-1">
            Computed Credit Limit
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-midnight-950 font-mono">
              {formatINRWhole(computedLimit)}
            </span>
            <span className="text-xs font-medium text-midnight-800">
              — {limitPct}% of your deposit
            </span>
          </div>
          <p className="text-xs text-ink-600 mt-2">
            No credit-history check — your limit is secured by your deposit. Your fixed deposit continues to earn full compounding interest while securing this card.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Cards 4 & 5: Debit Cards ("Your daily limits") */
function DebitLimitsWidget({ product }) {
  const atm = product.limits?.atmDaily || 0;
  const pos = product.limits?.posDaily || 0;
  const online = product.limits?.onlineDaily || 0;
  const maxLimit = Math.max(atm, pos, online, 1);

  const atmPct = Math.round((atm / maxLimit) * 100);
  const posPct = Math.round((pos / maxLimit) * 100);
  const onlinePct = Math.round((online / maxLimit) * 100);

  return (
    <div className="rounded-xl border border-ink-200 bg-porcelain-50/80 p-5 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-midnight-950 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gold-600" aria-hidden />
            Your daily limits
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Estimated from this card's published rates</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-midnight-900 text-porcelain-50">
          Daily Transaction Caps
        </span>
      </div>

      <div className="space-y-4">
        {/* ATM */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-ink-800">Daily ATM withdrawal</span>
            <span className="font-mono font-bold text-midnight-950">{formatINRWhole(atm)}</span>
          </div>
          <div className="h-2.5 w-full bg-ink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-midnight-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${atmPct}%` }}
              role="progressbar"
              aria-valuenow={atm}
              aria-valuemin="0"
              aria-valuemax={maxLimit}
            />
          </div>
        </div>

        {/* In-store POS */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-ink-800">Daily in-store purchases (POS)</span>
            <span className="font-mono font-bold text-midnight-950">{formatINRWhole(pos)}</span>
          </div>
          <div className="h-2.5 w-full bg-ink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-midnight-700 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${posPct}%` }}
              role="progressbar"
              aria-valuenow={pos}
              aria-valuemin="0"
              aria-valuemax={maxLimit}
            />
          </div>
        </div>

        {/* Online E-commerce */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-ink-800">Daily online e-commerce</span>
            <span className="font-mono font-bold text-midnight-950">{formatINRWhole(online)}</span>
          </div>
          <div className="h-2.5 w-full bg-ink-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${onlinePct}%` }}
              role="progressbar"
              aria-valuenow={online}
              aria-valuemin="0"
              aria-valuemax={maxLimit}
            />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-ink-500 mt-4 pt-3 border-t border-ink-100">
        Limits can be managed or customized anytime in the customer portal card controls.
      </p>
    </div>
  );
}

// ============================================================================
// FIX 4: FEES & CHARGES PRESENTATION (HEADLINE FIRST, 3-ROW MINI TABLE)
// ============================================================================

function parseLatePayment(latePaymentStr) {
  if (!latePaymentStr || typeof latePaymentStr !== 'string' || latePaymentStr.includes('Not applicable')) {
    return null;
  }
  const parts = latePaymentStr.split('/').map((p) => p.trim());
  if (parts.length >= 2) {
    return parts.map((part) => {
      const match = part.match(/^(₹[\d,]+)\s*\((.+)\)$/);
      if (match) {
        let slab = match[2].replace(/^due\s+/i, '');
        return { slab, fee: match[1] };
      }
      return { slab: part, fee: '' };
    });
  }
  return null;
}

function LifePhoto({ photo }) {
  if (!photo || !photo.src) return null;
  return (
    <figure data-life-photo className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xs">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-porcelain-100">
        <picture>
          {photo.srcSet && (
            <source
              type="image/webp"
              srcSet={photo.srcSet}
              sizes="(min-width: 1024px) 680px, 100vw"
            />
          )}
          <img
            src={photo.src}
            alt={photo.alt || ''}
            width={photo.width || 1200}
            height={photo.height || 750}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </picture>
      </div>
      {photo.caption && (
        <figcaption className="px-4 py-2.5 text-xs text-ink-600 bg-porcelain-50/80 border-t border-ink-100/60 font-medium">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

function CardFeesSection({ product }) {
  const [showAll, setShowAll] = useState(false);
  const isCredit = product.cardType === 'credit';
  const latePaymentRows = isCredit ? parseLatePayment(product.fees?.latePayment) : null;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-porcelain-100/60 text-xs font-semibold uppercase tracking-wider text-ink-600">
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-4 text-right">Fee / Charge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {/* 1. Joining Fee */}
            <tr>
              <td className="py-3.5 px-4 font-medium text-midnight-950">Joining fee</td>
              <td className="py-3.5 px-4 text-right font-semibold text-midnight-950">
                {product.joiningFee === 0 ? 'Nil' : formatINRWhole(product.joiningFee)}
              </td>
            </tr>

            {/* 2. Annual Fee */}
            <tr>
              <td className="py-3.5 px-4 font-medium text-midnight-950">Annual fee</td>
              <td className="py-3.5 px-4 text-right font-semibold text-midnight-950">
                {product.annualFee === 0 ? 'Nil' : formatINRWhole(product.annualFee)}
              </td>
            </tr>

            {/* 3. Late Payment (Mini-Table for Credit, or N/A) */}
            {isCredit && (
              <tr>
                <td className="py-3.5 px-4 align-top font-medium text-midnight-950">
                  Late payment charges
                  <p className="text-xs text-ink-500 font-normal mt-0.5">Tiered by outstanding due amount</p>
                </td>
                <td className="py-3.5 px-4 text-right align-top">
                  {latePaymentRows ? (
                    <div className="inline-block text-left text-xs bg-porcelain-50 border border-ink-100 rounded-lg p-2.5">
                      <div className="space-y-1.5 divide-y divide-ink-100">
                        {latePaymentRows.map((tier) => (
                          <div key={tier.slab} className="flex items-center justify-between gap-4 pt-1 first:pt-0">
                            <span className="text-ink-600 capitalize">{tier.slab}:</span>
                            <span className="font-semibold text-midnight-950 font-mono">{tier.fee}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="font-semibold text-midnight-950">{product.fees?.latePayment || '—'}</span>
                  )}
                </td>
              </tr>
            )}

            {/* 4. Forex Markup */}
            <tr>
              <td className="py-3.5 px-4 font-medium text-midnight-950">Foreign currency markup</td>
              <td className="py-3.5 px-4 text-right font-semibold text-midnight-950">
                {product.fees?.forexMarkupPct ? `${product.fees.forexMarkupPct}%` : '—'}
              </td>
            </tr>

            {/* 5. Cash Advance / ATM Fee */}
            <tr>
              <td className="py-3.5 px-4 font-medium text-midnight-950">
                {isCredit ? 'Cash advance fee' : 'ATM cash withdrawal fee'}
              </td>
              <td className="py-3.5 px-4 text-right font-semibold text-midnight-950 text-xs sm:text-sm">
                {product.fees?.cashAdvanceFee || '—'}
              </td>
            </tr>

            {/* Expanded schedule rows */}
            {showAll && (
              <>
                {isCredit && product.fees?.overLimitFee !== undefined && (
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-midnight-950">Over-limit charge</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-midnight-950">
                      {formatINRWhole(product.fees.overLimitFee)}
                    </td>
                  </tr>
                )}
                {product.fees?.cardReplacement !== undefined && (
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-midnight-950">Card replacement fee</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-midnight-950">
                      {formatINRWhole(product.fees.cardReplacement)}
                    </td>
                  </tr>
                )}
                {product.annualFeeWaiver && (
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-midnight-950">Annual fee waiver criteria</td>
                    <td className="py-3.5 px-4 text-right text-xs text-ink-700">
                      {product.annualFeeWaiver}
                    </td>
                  </tr>
                )}
                {!isCredit && (
                  <tr>
                    <td colSpan="2" className="py-3.5 px-4 bg-porcelain-50 text-xs text-ink-600">
                      <span className="font-semibold text-midnight-900 block mb-0.5">Not applicable to debit cards:</span>
                      Late payment charges, revolving finance charges, over-limit fees.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 py-1 px-3 rounded-md hover:bg-porcelain-100 transition-colors"
        >
          {showAll ? (
            <>
              Show headline fees only <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            </>
          ) : (
            <>
              Show all fees & charges <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FIX 5: MORE CARDS SECTION (ART-LED, SELF-EXCLUDING, NO FINEDGE PREFIX)
// ============================================================================

function MoreCardsSection({ currentSlug }) {
  const allCards = getProductsByCategory('card');
  const ordered = [
    ...allCards.filter((c) => c.cardType === 'credit'),
    ...allCards.filter((c) => c.cardType === 'debit'),
  ];
  const otherCards = ordered.filter((c) => c.slug !== currentSlug);

  return (
    <section aria-labelledby="related-cards-heading" className="mt-14 border-t border-ink-100 pt-10">
      <h2 id="related-cards-heading" className="font-display text-2xl font-semibold text-midnight-950">
        More cards
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {otherCards.map((rel) => {
          const cleanName = rel.name.replace(/^FinEdge\s+/, '');
          const joining = rel.joiningFee === 0 ? 'Nil' : formatINRWhole(rel.joiningFee);
          const annual = rel.annualFee === 0 ? 'Nil' : formatINRWhole(rel.annualFee);

          return (
            <Link
              key={rel.slug}
              to={`/cards/${rel.slug}`}
              className="group flex flex-col rounded-xl border border-ink-200 bg-white p-4 shadow-xs transition-all duration-200 hover:border-midnight-500 hover:shadow-md"
            >
              <div className="w-full flex justify-center py-2">
                <div className="w-[180px]">
                  <CardVisual card={rel} shadow={false} />
                </div>
              </div>
              <div className="mt-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-midnight-950 group-hover:text-midnight-700">
                    {cleanName}
                  </h3>
                  <p className="mt-1 text-xs text-ink-600 line-clamp-2">
                    {rel.tagline}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-ink-100 text-[11px] text-ink-600 font-medium">
                  Joining: <span className="text-midnight-950 font-semibold">{joining}</span> · Annual: <span className="text-midnight-950 font-semibold">{annual}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// FIX 4: LOAN EMI CALCULATOR WIDGET (INTERACTIVE, FINEDGE MATH, GOLD BULLET)
// ============================================================================

function LoanEmiCalculator({ product }) {
  const isGold = product.slug === 'gold-loan';
  const isKrishi = product.slug === 'agriculture-loan';

  const minAmt = product.minAmount || 25000;
  const maxAmt = product.maxAmount || 50000000;
  const initialAmt =
    product.slug === 'home-loan'
      ? 5000000
      : product.slug === 'vehicle-loan'
      ? 800000
      : product.slug === 'business-loan'
      ? 1500000
      : product.slug === 'lap-loan'
      ? 3000000
      : product.slug === 'education-loan'
      ? 1000000
      : product.slug === 'gold-loan'
      ? 200000
      : product.slug === 'agriculture-loan'
      ? 200000
      : minAmt;

  const minTenure = product.tenureMinMonths || 12;
  const maxTenure = product.tenureMaxMonths || 360;
  const initialTenure =
    product.slug === 'home-loan'
      ? 240
      : product.slug === 'vehicle-loan'
      ? 60
      : product.slug === 'business-loan'
      ? 36
      : product.slug === 'lap-loan'
      ? 120
      : product.slug === 'education-loan'
      ? 84
      : product.slug === 'gold-loan'
      ? 12
      : product.slug === 'agriculture-loan'
      ? 36
      : minTenure;

  const minRate = product.rateMin || 8.35;
  const maxRate = product.rateMax || 15.5;

  const [amount, setAmount] = useState(initialAmt);
  const [tenure, setTenure] = useState(initialTenure);
  const [rate, setRate] = useState(minRate);

  // Synchronize state when product changes
  useEffect(() => {
    setAmount(initialAmt);
    setTenure(initialTenure);
    setRate(minRate);
  }, [product.slug]);

  const amtStep = maxAmt >= 10000000 ? 50000 : maxAmt >= 2000000 ? 25000 : 5000;
  const tenureStep = isGold ? 1 : 6;

  let emiCalc = { emi: 0, totalInterest: 0, totalPayment: 0 };
  try {
    emiCalc = calculateEMI(amount, rate, tenure);
  } catch {
    emiCalc = { emi: 0, totalInterest: 0, totalPayment: 0 };
  }

  let bulletCalc = null;
  if (isGold) {
    try {
      bulletCalc = calculateBulletRepayment(amount, rate, tenure);
    } catch {
      bulletCalc = null;
    }
  }

  const handleAmountChange = (val) => {
    const num = Number(val);
    if (isNaN(num)) return;
    setAmount(Math.max(minAmt, Math.min(maxAmt, num)));
  };

  return (
    <div className="mb-10 rounded-2xl border border-ink-200 bg-white p-5 sm:p-7 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gold-600" aria-hidden />
            <h2 className="font-display text-lg font-semibold text-midnight-950">
              {isGold ? 'Gold Loan Repayment Calculator' : 'Interactive EMI Calculator'}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-600">
            {isGold
              ? 'Compare monthly reducing EMI versus bullet settlement at maturity.'
              : 'Calculate your indicative monthly instalment and total borrowing cost.'}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200">
          From {minRate.toFixed(2)}% p.a.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Loan Amount Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="emi-calc-amount" className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                Loan Amount
              </label>
              <div className="flex items-center gap-1 font-mono text-sm font-bold text-midnight-950">
                <span>₹</span>
                <input
                  id="emi-calc-amount"
                  type="number"
                  min={minAmt}
                  max={maxAmt}
                  step={amtStep}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-32 rounded-md border border-ink-200 px-2.5 py-1 text-right text-sm font-bold text-midnight-950 focus:border-gold-500 focus:outline-hidden focus:ring-1 focus:ring-gold-500"
                />
              </div>
            </div>
            <input
              type="range"
              min={minAmt}
              max={maxAmt}
              step={amtStep}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label="Loan amount slider"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-ink-200 accent-midnight-900"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-500 font-medium">
              <span>{formatINRWhole(minAmt)}</span>
              <span className="font-semibold text-midnight-950">{formatINRWhole(amount)}</span>
              <span>{formatINRWhole(maxAmt)}</span>
            </div>
          </div>

          {/* Tenure Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="emi-calc-tenure" className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                Tenure
              </label>
              <span className="font-mono text-sm font-bold text-midnight-950">
                {tenure} Months {tenure >= 12 && tenure % 12 === 0 ? `(${tenure / 12} yrs)` : ''}
              </span>
            </div>
            <input
              id="emi-calc-tenure"
              type="range"
              min={minTenure}
              max={maxTenure}
              step={tenureStep}
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              aria-label="Tenure slider"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-ink-200 accent-midnight-900"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-500 font-medium">
              <span>{minTenure} mo</span>
              <span className="font-semibold text-midnight-950">{tenure} months</span>
              <span>{maxTenure} mo</span>
            </div>
          </div>

          {/* Interest Rate Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="emi-calc-rate" className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                Interest Rate
              </label>
              <span className="font-mono text-sm font-bold text-midnight-950">
                {rate.toFixed(2)}% p.a.
              </span>
            </div>
            <input
              id="emi-calc-rate"
              type="range"
              min={minRate}
              max={maxRate}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label="Interest rate slider"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-ink-200 accent-midnight-900"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-500 font-medium">
              <span>{minRate.toFixed(2)}%</span>
              <span className="font-semibold text-midnight-950">{rate.toFixed(2)}% p.a.</span>
              <span>{maxRate.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Output Column (5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-ink-100 bg-porcelain-50 p-5 lg:col-span-5">
          {isGold ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-ink-200 bg-white p-3.5 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block mb-1">
                  Option A: Monthly Reducing EMI
                </span>
                <div className="text-2xl font-bold font-mono text-midnight-950">
                  {formatINRWhole(emiCalc.emi)}
                  <span className="text-xs font-normal text-ink-500 font-sans"> / month</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-600 border-t border-ink-100 pt-2">
                  <span>Total Interest: {formatINRWhole(emiCalc.totalInterest)}</span>
                  <span>Total: {formatINRWhole(emiCalc.totalPayment)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-gold-400 bg-gold-50/40 p-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-midnight-950">
                    Option B: Bullet Repayment
                  </span>
                  <span className="text-[10px] font-semibold text-gold-700 bg-white px-1.5 py-0.5 rounded border border-gold-300">
                    Lump-Sum
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-midnight-950">
                  {formatINRWhole(bulletCalc?.totalPayment || 0)}
                  <span className="text-xs font-normal text-ink-500 font-sans"> at maturity</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-700 border-t border-gold-200 pt-2">
                  <span>Simple Interest: {formatINRWhole(bulletCalc?.totalInterest || 0)}</span>
                  <span>Principal: {formatINRWhole(amount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-ink-500">
                  Indicative Monthly EMI
                </span>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold font-mono text-midnight-950 tracking-tight">
                  {formatINRWhole(emiCalc.emi)}
                  <span className="text-sm font-normal text-ink-500 font-sans"> / month</span>
                </div>
              </div>

              <dl className="space-y-2 border-t border-ink-200 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">Principal Borrowed</dt>
                  <dd className="font-semibold text-midnight-950 font-mono">{formatINRWhole(amount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-600">Total Interest Payable</dt>
                  <dd className="font-semibold text-midnight-950 font-mono">{formatINRWhole(emiCalc.totalInterest)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-sm font-bold">
                  <dt className="text-midnight-950">Total Amount Payable</dt>
                  <dd className="text-midnight-950 font-mono">{formatINRWhole(emiCalc.totalPayment)}</dd>
                </div>
              </dl>
            </div>
          )}

          {isKrishi && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11px] text-emerald-900 leading-snug">
              <span className="font-bold">Harvest-Aligned Repayments:</span> Bullet and seasonal instalment schedules aligned with Kharif / Rabi harvest realization are sanctioned at branch approval.
            </div>
          )}

          <p className="mt-3 text-[11px] text-ink-500 italic leading-tight">
            * Figures are indicative based on reducing balance method at {rate.toFixed(2)}% p.a. Final terms determined upon credit underwriting.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FIX 4 / FIX 6: MORE LOANS SECTION (SELF-EXCLUDING, NO FINEDGE PREFIX)
// ============================================================================

function MoreLoansSection({ currentSlug }) {
  const allLoans = getProductsByCategory('loan');
  const otherLoans = allLoans.filter((l) => l.slug !== currentSlug);

  return (
    <section aria-labelledby="related-loans-heading" className="mt-14 border-t border-ink-100 pt-10">
      <h2 id="related-loans-heading" className="font-display text-2xl font-semibold text-midnight-950">
        More loans
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {otherLoans.map((rel) => {
          const cleanName = rel.name.replace(/^FinEdge\s+/, '');
          return (
            <Link
              key={rel.slug}
              to={`/loans/${rel.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-ink-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-midnight-500 hover:shadow-md"
            >
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200 mb-2.5">
                  Loan
                </span>
                <h3 className="font-display text-base font-semibold text-midnight-950 group-hover:text-midnight-700">
                  {cleanName}
                </h3>
                <p className="mt-1.5 text-xs text-ink-600 line-clamp-2">
                  {rel.tagline}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink-100 text-xs text-ink-600 font-medium flex items-center justify-between">
                <span>
                  From <strong className="text-midnight-950 font-semibold">{rel.rateMin?.toFixed(2)}% p.a.</strong>
                </span>
                <span>
                  Up to <strong className="text-midnight-950 font-semibold">{formatINRWhole(rel.maxAmount)}</strong>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// FIX 1 & FIX 5: INVESTMENT DETAIL CALCULATORS & MORE INVESTMENTS SECTION
// ============================================================================

const indianNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function SliderControl({ label, value, min, max, step = 1, decimals = 0, suffix, hint, onChange }) {
  const formatText = (v) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
    return decimals > 0 ? Number(v).toFixed(decimals) : indianNumber.format(Math.round(Number(v)));
  };
  const [text, setText] = useState(() => formatText(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatText(value));
  }, [value, focused, decimals]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-ink-800">
        <label>{label}</label>
        {hint && <span className="font-normal text-ink-500 text-[11px]">{hint}</span>}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(Number(value)) ? value : min}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          className="min-w-0 flex-1 h-2 cursor-pointer appearance-none rounded-lg bg-ink-200 accent-midnight-900"
        />
        <div className="flex w-36 shrink-0 items-center gap-1.5">
          <input
            type="text"
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
            className="w-full text-right h-9 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-sm font-semibold text-midnight-950 focus:border-gold-500 focus:outline-hidden focus:ring-1 focus:ring-gold-500"
          />
          {suffix && <span className="whitespace-nowrap text-xs text-ink-500 font-medium">{suffix}</span>}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-400">
        <span>{decimals > 0 ? min.toFixed(decimals) : indianNumber.format(min)}</span>
        <span>{decimals > 0 ? max.toFixed(decimals) : indianNumber.format(max)}</span>
      </div>
    </div>
  );
}

function FdProductCalculator({ product, onApplyWithFigures }) {
  const [amount, setAmount] = useState(100000);
  const [tenureBand, setTenureBand] = useState('2 – 3 years');
  const [senior, setSenior] = useState(false);

  const bands = product.rateGrid || [];
  const selectedBand = bands.find((b) => b.tenure === tenureBand) || bands[4] || bands[0];
  const baseRate = selectedBand ? selectedBand.general : 6.95;

  const tenureMonths = selectedBand?.tenure === '7 – 45 days' ? 1
    : selectedBand?.tenure === '46 – 179 days' ? 4
    : selectedBand?.tenure === '180 – 364 days' ? 9
    : selectedBand?.tenure === '1 – 2 years' ? 24
    : selectedBand?.tenure === '2 – 3 years' ? 36
    : selectedBand?.tenure === '3 – 5 years' ? 48
    : 60;

  const result = useMemo(() => {
    try {
      return calculateFD({
        principal: amount,
        annualRatePct: baseRate,
        tenureMonths,
        seniorCitizen: senior,
        seniorCitizenDeltaPct: product.seniorDelta || 0.5,
      });
    } catch {
      return null;
    }
  }, [amount, baseRate, tenureMonths, senior, product.seniorDelta]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-midnight-950">
          See what your deposit grows to
        </h2>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200">
          Cumulative payout
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <SliderControl
            label="Deposit amount"
            value={amount}
            min={product.minAmount || 5000}
            max={5000000}
            step={1000}
            suffix="₹"
            onChange={setAmount}
            hint={`Min. deposit ${formatINRWhole(product.minAmount || 5000)}`}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 block mb-1.5">
              Tenure band
            </label>
            <select
              value={tenureBand}
              onChange={(e) => setTenureBand(e.target.value)}
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 font-medium focus:border-gold-500 focus:outline-hidden focus:ring-1 focus:ring-gold-500"
            >
              {bands.map((b) => (
                <option key={b.tenure} value={b.tenure}>
                  {b.tenure} — {b.general.toFixed(2)}% p.a. {senior ? `(Senior: ${b.senior.toFixed(2)}% p.a.)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-ink-700">
              <input
                type="checkbox"
                checked={senior}
                onChange={(e) => setSenior(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-midnight-900 cursor-pointer"
              />
              <span>
                <span className="font-semibold text-ink-900">Senior citizen (age 60+)</span>
                <span className="block text-xs text-ink-500">
                  Adds +{(product.seniorDelta || 0.5).toFixed(2)}% p.a. to the rate as an illustration
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Results Column (5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-midnight-800 bg-midnight-900 p-5 text-porcelain-100 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Maturity value
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-porcelain-50">
              {result ? formatINR(result.maturityValue) : '—'}
            </p>
            <p className="mt-1 text-xs text-porcelain-200/80 leading-relaxed">
              Quarterly compounding, the Indian bank standard.
            </p>

            <dl className="mt-4 space-y-2 border-t border-porcelain-50/15 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Amount deposited</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">{formatINR(amount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Rate applied</dt>
                <dd className="font-semibold text-gold-300 font-mono">
                  {result ? `${result.rateAppliedPct.toFixed(2)}% p.a.` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Interest earned</dt>
                <dd className="font-semibold text-emerald-300 font-mono">
                  {result ? formatINR(result.interestEarned) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 border-t border-porcelain-50/15 pt-4">
            <button
              type="button"
              onClick={() => onApplyWithFigures(product, { amount, tenure: selectedBand?.tenure })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-4 py-2.5 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 cursor-pointer"
            >
              Apply with these figures <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RdProductCalculator({ product, onApplyWithFigures }) {
  const [amount, setAmount] = useState(5000);
  const [tenureBand, setTenureBand] = useState('25 – 60 months');

  const bands = product.rateBands || [];
  const selectedBand = bands.find((b) => b.tenure === tenureBand) || bands[2] || bands[0];
  const rate = selectedBand ? selectedBand.rate : 6.55;

  const tenureMonths = selectedBand?.tenure === '6 – 12 months' ? 12
    : selectedBand?.tenure === '13 – 24 months' ? 24
    : selectedBand?.tenure === '25 – 60 months' ? 60
    : 120;

  const result = useMemo(() => {
    try {
      return calculateRD({
        monthlyDeposit: amount,
        annualRatePct: rate,
        tenureMonths,
      });
    } catch {
      return null;
    }
  }, [amount, rate, tenureMonths]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-midnight-950">
          See what your monthly deposit builds
        </h2>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200">
          Quarterly compounding
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <SliderControl
            label="Monthly deposit"
            value={amount}
            min={product.minMonthly || 500}
            max={100000}
            step={product.monthlyStep || 100}
            suffix="₹"
            onChange={setAmount}
            hint={`Starts at ${formatINRWhole(product.minMonthly || 500)}/mo, multiples of ₹${product.monthlyStep || 100}`}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 block mb-1.5">
              Tenure band
            </label>
            <select
              value={tenureBand}
              onChange={(e) => setTenureBand(e.target.value)}
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 font-medium focus:border-gold-500 focus:outline-hidden focus:ring-1 focus:ring-gold-500"
            >
              {bands.map((b) => (
                <option key={b.tenure} value={b.tenure}>
                  {b.tenure} — {b.rate.toFixed(2)}% p.a.
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Column (5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-midnight-800 bg-midnight-900 p-5 text-porcelain-100 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Maturity value
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-porcelain-50">
              {result ? formatINR(result.maturityValue) : '—'}
            </p>
            <p className="mt-1 text-xs text-porcelain-200/80 leading-relaxed">
              A fixed monthly deposit that builds a lump sum quarter by quarter.
            </p>

            <dl className="mt-4 space-y-2 border-t border-porcelain-50/15 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Total deposited</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">
                  {result ? formatINR(result.totalDeposited) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Applied rate</dt>
                <dd className="font-semibold text-gold-300 font-mono">{rate.toFixed(2)}% p.a.</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Interest earned</dt>
                <dd className="font-semibold text-emerald-300 font-mono">
                  {result ? formatINR(result.interestEarned) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 border-t border-porcelain-50/15 pt-4">
            <button
              type="button"
              onClick={() => onApplyWithFigures(product, { amount, tenure: selectedBand?.tenure })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-4 py-2.5 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 cursor-pointer"
            >
              Apply with these figures <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SipProductCalculator({ product, onApplyWithFigures }) {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [returnPct, setReturnPct] = useState(10);

  const result = useMemo(() => {
    try {
      return calculateSIP({
        monthlyInvestment: monthly,
        expectedReturnPct: returnPct,
        tenureMonths: Math.round(years * 12),
      });
    } catch {
      return null;
    }
  }, [monthly, returnPct, years]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-midnight-950">
          Illustrate a monthly investment
        </h2>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200">
          Hypothetical illustration
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <SliderControl
            label="Monthly investment"
            value={monthly}
            min={product.minMonthly || 500}
            max={100000}
            step={500}
            suffix="₹"
            onChange={setMonthly}
            hint={`Min. ${formatINRWhole(product.minMonthly || 500)}/mo`}
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
        </div>

        {/* Results Column (5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-midnight-800 bg-midnight-900 p-5 text-porcelain-100 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Projected value (illustration only)
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-porcelain-50">
              {result ? formatINR(result.maturityValue) : '—'}
            </p>
            <p className="mt-1 text-xs text-porcelain-200/80 leading-relaxed">
              What the deposits above would grow to IF markets returned exactly the assumed rate every year. They will not.
            </p>

            <dl className="mt-4 space-y-2 border-t border-porcelain-50/15 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Total invested</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">
                  {result ? formatINR(result.totalInvested) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Estimated gain</dt>
                <dd className="font-semibold text-emerald-300 font-mono">
                  {result ? formatINR(result.estimatedGain) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Horizon</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">{years} Years ({years * 12} mo)</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 border-t border-porcelain-50/15 pt-4">
            <button
              type="button"
              onClick={() => onApplyWithFigures(product, { amount: monthly, tenure: String(years) })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-4 py-2.5 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 cursor-pointer"
            >
              Apply with these figures <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SsyProductCalculator({ product, onApplyWithFigures }) {
  const [yearly, setYearly] = useState(150000);

  const minDep = product.minDepositYearly || 250;
  const maxDep = product.maxDepositYearly || 150000;
  const isOutOfRange = yearly < minDep || yearly > maxDep;

  const result = useMemo(() => {
    try {
      return calculateSSY({
        annualDeposit: yearly,
        annualRatePct: product.rate || 8.05,
        depositYears: product.depositYears || 15,
        maturityYears: product.tenureYears || 21,
        maxDepositPerYear: maxDep,
      });
    } catch {
      return null;
    }
  }, [yearly, product.rate, product.depositYears, product.tenureYears, maxDep]);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-midnight-950">
          Project this scheme
        </h2>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200">
          Government scheme · {product.rate.toFixed(2)}% p.a.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <SliderControl
            label="Deposit per year"
            value={yearly}
            min={minDep}
            max={maxDep}
            step={250}
            suffix="₹"
            onChange={setYearly}
            hint={`₹${formatINRWhole(minDep)} – ₹${formatINRWhole(maxDep)} / FY`}
          />

          {isOutOfRange && (
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
              Scheme deposit limits are {formatINRWhole(minDep)} to {formatINRWhole(maxDep)} per financial year.
            </div>
          )}

          <div className="rounded-lg border border-ink-100 bg-porcelain-50 px-4 py-3">
            <p className="text-sm text-ink-700">
              Interest rate used: <strong className="font-semibold text-midnight-900">{product.rate.toFixed(2)}% p.a.</strong>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{product.rateNote}</p>
          </div>
        </div>

        {/* Results Column (5 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-midnight-800 bg-midnight-900 p-5 text-porcelain-100 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Maturity value at 21 years (projection)
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-porcelain-50">
              {result ? formatINR(result.maturityValue) : '—'}
            </p>
            <p className="mt-1 text-xs text-porcelain-200/80 leading-relaxed">
              Projection at the illustrative rate above.
            </p>

            <dl className="mt-4 space-y-2 border-t border-porcelain-50/15 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Deposit per year</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">
                  {result ? formatINR(result.appliedAnnualDeposit) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Total deposited ({product.depositYears || 15} yrs)</dt>
                <dd className="font-semibold text-porcelain-50 font-mono">
                  {result ? formatINR(result.totalDeposited) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-porcelain-200/80">Interest earned (projected)</dt>
                <dd className="font-semibold text-emerald-300 font-mono">
                  {result ? formatINR(result.interestEarned) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 border-t border-porcelain-50/15 pt-4">
            <button
              type="button"
              onClick={() => onApplyWithFigures(product, { amount: yearly })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-4 py-2.5 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 cursor-pointer"
            >
              Apply with these figures <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoreInvestmentsSection({ currentSlug }) {
  const allInvestments = getProductsByCategory('investment');
  const otherInvestments = allInvestments.filter((i) => i.slug !== currentSlug);

  const getFactLine = (rel) => {
    if (rel.kind === 'FD' && Array.isArray(rel.rateGrid) && rel.rateGrid.length > 0) {
      const top = Math.max(...rel.rateGrid.map((r) => r.general));
      return `Up to ${top.toFixed(2)}% p.a.`;
    }
    if (rel.kind === 'RD' && Array.isArray(rel.rateBands) && rel.rateBands.length > 0) {
      const top = Math.max(...rel.rateBands.map((b) => b.rate));
      return `Up to ${top.toFixed(2)}% p.a.`;
    }
    if (rel.kind === 'SIP') {
      return `From ${formatINRWhole(rel.minMonthly)}/month · Market-linked`;
    }
    if (rel.kind === 'SSY' && rel.rate) {
      return `${rel.rate.toFixed(2)}% p.a. · Government scheme`;
    }
    return '';
  };

  return (
    <section aria-labelledby="related-investments-heading" className="mt-14 border-t border-ink-100 pt-10">
      <h2 id="related-investments-heading" className="font-display text-2xl font-semibold text-midnight-950">
        More investments
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {otherInvestments.map((rel) => {
          const cleanName = shortProductName(rel.name);
          const fact = getFactLine(rel);
          return (
            <Link
              key={rel.slug}
              to={`/investments/${rel.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-ink-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-midnight-500 hover:shadow-md cursor-pointer"
            >
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-porcelain-100 text-midnight-900 border border-ink-200 mb-2.5">
                  Investment
                </span>
                <h3 className="font-display text-base font-semibold text-midnight-950 group-hover:text-midnight-700">
                  {cleanName}
                </h3>
                <p className="mt-1.5 text-xs text-ink-600 line-clamp-2">
                  {rel.tagline}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink-100 text-xs text-ink-600 font-medium flex items-center justify-between">
                <span className="font-semibold text-midnight-950">{fact}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-midnight-800 group-hover:translate-x-0.5 transition-transform">
                  View details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// MAIN EXPORT: PRODUCT DETAIL PAGE
// ============================================================================

export default function ProductDetailPage({ category, categoryHint }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const queryAmount = searchParams.get('amount');
  const queryCategory = searchParams.get('category');
  const [openFaq, setOpenFaq] = useState(0);
  const [applyOpen, setApplyOpen] = useState(() => searchParams.get('apply') === 'true');
  const product = getProductBySlug(slug);
  const isCard = product?.category === 'card';
  const isLoan = product?.category === 'loan';
  const isInvestment = product?.category === 'investment';
  const isFD = isInvestment && (product?.kind === 'FD' || product?.slug === 'fixed-deposit');
  const isRD = isInvestment && (product?.kind === 'RD' || product?.slug === 'recurring-deposit');
  const isSIP = isInvestment && (product?.kind === 'SIP' || product?.slug === 'systematic-investment-plan');
  const isSSY = isInvestment && (product?.kind === 'SSY' || product?.slug === 'sukanya-samriddhi');

  const [investmentApplyState, setInvestmentApplyState] = useState(() => {
    if (searchParams.get('apply') === 'true' && product?.category === 'investment') {
      return {
        open: true,
        product,
        initialAmount: queryAmount ? Number(queryAmount) : undefined,
        initialCategory: queryCategory || undefined,
      };
    }
    return null;
  });

  const handleOpenInvestmentApply = (prod) => {
    setInvestmentApplyState({ open: true, product: prod || product });
  };

  const handleOpenInvestmentApplyWithFigures = (prod, figures) => {
    setInvestmentApplyState({
      open: true,
      product: prod || product,
      initialAmount: figures?.amount,
      initialTenure: figures?.tenure,
      initialCategory: figures?.category,
    });
  };
  const rawCat = (category || categoryHint || product?.category || 'accounts').toLowerCase();
  const meta =
    CATEGORY_MAP[rawCat] ||
    CATEGORY_MAP[rawCat + 's'] ||
    (product ? Object.values(CATEGORY_MAP).find((m) => m.category === product.category) : null) ||
    CATEGORY_MAP.accounts;

  // Tabs state & hash deep linking for Cards & Loans
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#fees' || hash === '#rates') return 'fees';
      if (hash === '#pricing' || hash === '#limits') return isLoan ? 'fees' : 'pricing';
      if (hash === '#faq' || hash === '#faqs') return 'faq';
      if (hash === '#overview') return 'overview';
    }
    return 'overview';
  });

  const tabListRef = useRef(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#fees' || hash === '#rates') setActiveTab('fees');
      else if (hash === '#pricing' || hash === '#limits') setActiveTab(isLoan ? 'fees' : 'pricing');
      else if (hash === '#faq' || hash === '#faqs') setActiveTab('faq');
      else if (hash === '#overview') setActiveTab('overview');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isLoan]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const handleTabKeyDown = (e, currentIndex) => {
    const tabs = ['overview', 'pricing', 'fees'];
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      handleTabChange(tabs[nextIndex]);
      document.getElementById(`card-tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      handleTabChange(tabs[prevIndex]);
      document.getElementById(`card-tab-${tabs[prevIndex]}`)?.focus();
    }
  };

  const handleLoanTabKeyDown = (e, currentIndex) => {
    const tabs = ['overview', 'fees', 'faq'];
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      handleTabChange(tabs[nextIndex]);
      document.getElementById(`loan-tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      handleTabChange(tabs[prevIndex]);
      document.getElementById(`loan-tab-${tabs[prevIndex]}`)?.focus();
    }
  };

  if (!product || product.category !== meta.category) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <EmptyState
          icon={SearchX}
          title="We could not find that product"
          body={`There is no ${meta.singular} with the reference “${slug || '—'}” in the FinEdge catalogue. It may have been renamed or withdrawn.`}
          action={
            <Link to={meta.base}>
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {meta.label.toLowerCase()}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const cleanProductName = product.name.replace(/^FinEdge\s+/, '');
  const fees = feeRows(product);
  const faqs = faqList(product);
  const featureList = Array.isArray(product.features) && product.features.length > 0 ? product.features : product.rewards;
  const steps = Array.isArray(product.howToApply) && product.howToApply.length > 0 ? product.howToApply : FALLBACK_STEPS;
  const stats = headlineStats(product);
  const related = getProductsByCategory(product.category).filter((p) => p.slug !== product.slug).slice(0, 3);
  const isSip = product.kind === 'SIP';
  const rateTitle =
    product.category === 'account'
      ? 'Interest & balance rules'
      : product.category === 'loan'
        ? 'Rates, amount & tenure'
        : product.category === 'card'
          ? 'Limits & pricing'
          : isSip
            ? 'Fund categories & risk'
            : 'Rates & terms';

  // ==========================================================================
  // CARD DETAIL PRESENTATION (FIXES 0-5)
  // ==========================================================================
  if (isCard) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Breadcrumb */}
        <Link to="/cards" className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600 mb-5">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All cards
        </Link>

        {/* Fix 1: Slimmer compressed midnight hero band with 3D TiltCard inside */}
        <div className="rounded-2xl border border-midnight-800 bg-midnight-900 p-6 sm:p-8 text-porcelain-50 shadow-lg">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="min-w-0 flex-1">
              {/* Fix 0: Eyebrow chip with category label (Credit card / Debit card) */}
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-midnight-800 text-gold-400 border border-gold-500/30">
                  {product.cardType === 'credit' ? 'Credit card' : 'Debit card'}
                </span>
                {product.network && (
                  <span className="text-xs font-medium text-porcelain-300">
                    {product.network}
                  </span>
                )}
              </div>

              {/* Fix 0: H1 without brand prefix */}
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-porcelain-50">
                {cleanProductName}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-porcelain-200">
                {product.tagline}
              </p>

              {/* Four-fact strip */}
              {stats.length > 0 && (
                <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-porcelain-50/15 pt-4">
                  {stats.slice(0, 4).map((s) => (
                    <div key={s.label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-porcelain-300">{s.label}</dt>
                      <dd className="mt-0.5 text-sm sm:text-base font-semibold text-porcelain-50 font-mono">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Apply now CTA in hero */}
              <div className="mt-5">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setApplyOpen(true)}
                  className="bg-midnight-800 text-porcelain-50 border border-gold-500/40 hover:bg-midnight-700 font-semibold"
                >
                  Apply now <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
                </Button>
              </div>
            </div>

            {/* Right side: 3D interactive tilt card (hero setting ±12° + glare + shifting shadow) */}
            <div className="w-full sm:w-[320px] lg:w-[360px] shrink-0 flex justify-center">
              <TiltCard maxTilt={12} perspective={900} sweepKey={product.slug}>
                <CardVisual card={product} shadow={false} />
              </TiltCard>
            </div>
          </div>
        </div>

        {/* Fix 2: Sticky tab bar under hero */}
        <div className="sticky top-16 z-20 bg-porcelain-50/95 backdrop-blur-md border-b border-ink-200 mt-8 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Card details sections"
            className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2"
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'pricing', label: 'Limits & pricing' },
              { id: 'fees', label: 'Fees & charges' },
            ].map((tab, idx) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`card-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  aria-controls={`card-panel-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-gold-500 ${
                    selected
                      ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                      : 'text-ink-600 hover:text-midnight-950 hover:bg-porcelain-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Layout: Main Tab Panels (2 cols) + Working Rail (1 col) */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column: Tab Panels */}
          <div className="min-w-0 lg:col-span-2">
            {/* TAB 1: OVERVIEW */}
            <div
              id="card-panel-overview"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="card-tab-overview"
              className={activeTab === 'overview' ? 'block' : 'hidden'}
            >
              {/* Fix 3: One interactive widget computed from its own data */}
              {product.slug === 'edge-cashback-credit' && <CashbackCalculator product={product} />}
              {product.slug === 'edge-voyage-credit' && <VoyageCalculator product={product} />}
              {product.slug === 'edge-assured-credit' && <AssuredCalculator product={product} />}
              {product.cardType === 'debit' && <DebitLimitsWidget product={product} />}

              {/* Overview body */}
              <section aria-labelledby="card-overview-subheading" className="mb-10">
                <h2 id="card-overview-subheading" className="font-display text-2xl font-semibold text-midnight-950">
                  Overview
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{product.overview || '—'}</p>
              </section>

              {/* Rewards & benefits */}
              {Array.isArray(featureList) && featureList.length > 0 && (
                <section aria-labelledby="card-rewards-subheading" className="mb-10">
                  <h2 id="card-rewards-subheading" className="font-display text-2xl font-semibold text-midnight-950">
                    Rewards & benefits
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {featureList.map((f) => (
                      <li key={f} className="flex gap-2.5 rounded-lg border border-ink-100 bg-white p-3.5 text-sm leading-relaxed text-ink-700 shadow-xs">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* FAQs */}
              {faqs.length > 0 && (
                <section aria-labelledby="card-faq-subheading" className="mb-8">
                  <h2 id="card-faq-subheading" className="font-display text-2xl font-semibold text-midnight-950">
                    Frequently asked questions
                  </h2>
                  <div className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white shadow-xs">
                    {faqs.map((faq, i) => {
                      const open = openFaq === i;
                      return (
                        <div key={faq.question}>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenFaq(open ? -1 : i)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink-900 hover:text-midnight-800"
                          >
                            <span>{faq.question}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </button>
                          {open && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600">{faq.answer}</p>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {product.lifePhoto && <LifePhoto photo={product.lifePhoto} />}

              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>

            {/* TAB 2: LIMITS & PRICING */}
            <div
              id="card-panel-pricing"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="card-tab-pricing"
              className={activeTab === 'pricing' ? 'block' : 'hidden'}
            >
              <section aria-labelledby="card-limits-heading" className="mb-8">
                <h2 id="card-limits-heading" className="font-display text-2xl font-semibold text-midnight-950 mb-4">
                  Limits & pricing
                </h2>
                <RateSection product={product} />
              </section>
              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>

            {/* TAB 3: FEES & CHARGES (FIX 4) */}
            <div
              id="card-panel-fees"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="card-tab-fees"
              className={activeTab === 'fees' ? 'block' : 'hidden'}
            >
              <section aria-labelledby="card-fees-heading" className="mb-8">
                <h2 id="card-fees-heading" className="font-display text-2xl font-semibold text-midnight-950 mb-4">
                  Fees & charges
                </h2>
                <CardFeesSection product={product} />
              </section>
              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>
          </div>

          {/* Fix 1: Sticky Right Rail (Compact Who can apply, Apply button, How to apply) */}
          <div className="min-w-0">
            <div className="sticky top-24 space-y-5">
              {/* Who can apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">Who can apply</h2>
                <Eligibility product={product} compact />
              </Card>

              {/* Apply for this card CTA */}
              <Button
                variant="primary"
                onClick={() => setApplyOpen(true)}
                className="w-full bg-midnight-900 text-porcelain-50 hover:bg-midnight-800 h-11 text-sm font-semibold shadow-xs"
              >
                Apply for this card <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
              </Button>

              {/* How to apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">How to apply</h2>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-midnight-900 text-[11px] font-bold text-porcelain-50" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
        </div>

        {/* Fix 5: More cards section (art-led, self-excluding) */}
        <MoreCardsSection currentSlug={product.slug} />

        {/* Application Modal */}
        {applyOpen && <ApplyModal open={applyOpen} product={product} onClose={() => setApplyOpen(false)} />}
      </div>
    );
  }

  // ==========================================================================
  // LOAN DETAIL PRESENTATION (MODULE 18 - FIXES 1-6)
  // ==========================================================================
  if (isLoan) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Breadcrumb */}
        <Link to="/loans" className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600 mb-5">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All loans
        </Link>

        {/* Module 21: Option D light porcelain banner (size locked to ~285px desktop, ≤560px mobile) */}
        {(() => {
          const LoanIcon = (LOAN_ICONS && LOAN_ICONS[product.slug]) || FileText;
          const emiFromPerLakh = calculateEMI(100000, product.rateMin, product.tenureMaxMonths);
          const emiFromValue = Math.round(emiFromPerLakh.emi);

          return (
            <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-7 lg:px-10 lg:py-5 text-midnight-950 shadow-sm">
              <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                {/* Top Row Left: Chip, H1, Tagline, Gold Rule */}
                <div className="w-full lg:col-span-8 order-1">
                  {/* Eyebrow chip: gold-tinted surface, midnight text */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-400/15 text-midnight-900 border border-gold-400/30">
                      Loan
                    </span>
                    <span className="text-xs font-medium text-ink-500">
                      Retail Lending
                    </span>
                  </div>

                  {/* H1 in Fraunces, midnight, 40px desktop, line-height 1.1, no FinEdge prefix */}
                  <h1 className="font-display text-2xl sm:text-3xl lg:text-[38px] font-semibold leading-[1.1] text-midnight-950">
                    {cleanProductName}
                  </h1>

                  {/* Tagline from data file */}
                  <p className="mt-1 text-sm leading-relaxed text-ink-600 truncate">
                    {product.tagline}
                  </p>

                  {/* Thin gold rule (48px wide, 2px) */}
                  <div className="mt-2 h-0.5 w-12 bg-gold-500 rounded-full" aria-hidden="true" />
                </div>

                {/* Top Row Right on Desktop / Order 2 on Mobile: Icon Tile + Starting Rate */}
                <div className="w-full lg:col-span-4 order-2 mt-4 lg:mt-0 flex items-center lg:justify-end gap-3.5">
                  <div className="flex h-14 w-14 lg:h-16 lg:w-16 shrink-0 items-center justify-center rounded-xl bg-midnight-900 shadow-xs">
                    <LoanIcon className="h-6 w-6 lg:h-7 lg:w-7 text-gold-400" aria-hidden="true" />
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="font-display text-3xl sm:text-4xl lg:text-[40px] font-semibold leading-none text-midnight-950 font-mono">
                      {product.rateMin?.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs sm:text-[13px] text-ink-500 font-medium whitespace-nowrap">
                      Interest from, per annum
                    </p>
                  </div>
                </div>

                {/* Bottom Row Left: Four-fact strip divided by vertical hairlines (desktop: 4 in 1 row; mobile: 2x2 grid) */}
                <div className="w-full lg:col-span-8 order-3 mt-4 border-t border-ink-100 pt-3">
                  <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-ink-100">
                    <div className="sm:pr-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">Rate range</dt>
                      <dd className="mt-0.5 text-base font-semibold text-midnight-950 font-mono tnum">
                        {product.rateMin?.toFixed(2)}% – {product.rateMax?.toFixed(2)}% p.a.
                      </dd>
                    </div>
                    <div className="pt-2 sm:pt-0 sm:px-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">Maximum amount</dt>
                      <dd className="mt-0.5 text-base font-semibold text-midnight-950 font-mono tnum">
                        Up to {formatINRWhole(product.maxAmount)}
                      </dd>
                    </div>
                    <div className="pt-2 sm:pt-0 sm:px-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">Tenure</dt>
                      <dd className="mt-0.5 text-base font-semibold text-midnight-950 font-mono tnum">
                        {tenureLabel(product.tenureMinMonths, product.tenureMaxMonths)}
                      </dd>
                    </div>
                    <div className="pt-2 sm:pt-0 sm:pl-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gold-700">EMI from (per lakh)</dt>
                      <dd className="mt-0.5 text-base font-semibold text-midnight-950 font-mono tnum">
                        {formatINRWhole(emiFromValue)} / month
                      </dd>
                      <p className="text-[11px] text-ink-500 leading-tight">at the starting rate, longest tenure</p>
                    </div>
                  </dl>
                </div>

                {/* Bottom Row Right on Desktop / Order 4 on Mobile: Apply Now Button */}
                <div className="w-full lg:col-span-4 order-4 mt-4 lg:mt-4 flex items-center lg:justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setApplyOpen(true)}
                    className="w-full lg:w-auto min-h-[44px] h-11 px-7 bg-midnight-900 text-porcelain-50 hover:bg-midnight-800 font-semibold transition-colors shadow-xs"
                  >
                    Apply now <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Fix 4: Sticky tab bar under hero */}
        <div className="sticky top-16 z-20 bg-porcelain-50/95 backdrop-blur-md border-b border-ink-200 mt-2 sm:mt-2.5 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Loan details sections"
            className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2"
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'fees', label: 'Rates & fees' },
              { id: 'faq', label: 'Frequently asked questions' },
            ].map((tab, idx) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`loan-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  aria-controls={`loan-panel-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleLoanTabKeyDown(e, idx)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-gold-500 ${
                    selected
                      ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                      : 'text-ink-600 hover:text-midnight-950 hover:bg-porcelain-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Layout: Main Tab Panels (2 cols) + Working Rail (1 col) */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column: Tab Panels */}
          <div className="min-w-0 lg:col-span-2">
            {/* TAB 1: OVERVIEW */}
            <div
              id="loan-panel-overview"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="loan-tab-overview"
              className={activeTab === 'overview' ? 'block' : 'hidden'}
            >
              {/* Fix 4: Interactive EMI Calculator Widget at top of Overview */}
              <LoanEmiCalculator product={product} />

              {/* Overview text */}
              <section aria-labelledby="loan-overview-subheading" className="mb-10">
                <h2 id="loan-overview-subheading" className="font-display text-2xl font-semibold text-midnight-950">
                  Overview
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{product.overview || '—'}</p>
              </section>

              {/* Key features */}
              {Array.isArray(featureList) && featureList.length > 0 && (
                <section aria-labelledby="loan-features-subheading" className="mb-10">
                  <h2 id="loan-features-subheading" className="font-display text-2xl font-semibold text-midnight-950">
                    Key features
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {featureList.map((f) => (
                      <li key={f} className="flex gap-2.5 rounded-lg border border-ink-100 bg-white p-3.5 text-sm leading-relaxed text-ink-700 shadow-xs">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {product.lifePhoto && <LifePhoto photo={product.lifePhoto} />}

              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>

            {/* TAB 2: RATES & FEES */}
            <div
              id="loan-panel-fees"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="loan-tab-fees"
              className={activeTab === 'fees' ? 'block' : 'hidden'}
            >
              <section aria-labelledby="loan-pricing-heading" className="mb-8">
                <h2 id="loan-pricing-heading" className="font-display text-2xl font-semibold text-midnight-950 mb-4">
                  Pricing & loan structure
                </h2>
                <RateSection product={product} />
              </section>

              <section aria-labelledby="loan-fees-heading" className="mb-8">
                <h2 id="loan-fees-heading" className="font-display text-2xl font-semibold text-midnight-950 mb-4">
                  Fees & charges
                </h2>
                <Table
                  columns={[
                    { key: 'service', label: 'Service / Charge' },
                    { key: 'fee', label: 'Standard Rate / Fee', align: 'right' },
                  ]}
                  rows={fees}
                  rowKey={(r) => r.service}
                />
              </section>

              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>

            {/* TAB 3: FAQ */}
            <div
              id="loan-panel-faq"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="loan-tab-faq"
              className={activeTab === 'faq' ? 'block' : 'hidden'}
            >
              {faqs.length > 0 && (
                <section aria-labelledby="loan-faq-heading" className="mb-8">
                  <h2 id="loan-faq-heading" className="font-display text-2xl font-semibold text-midnight-950">
                    Frequently asked questions
                  </h2>
                  <div className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white shadow-xs">
                    {faqs.map((faq, i) => {
                      const open = openFaq === i;
                      return (
                        <div key={faq.question}>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenFaq(open ? -1 : i)}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink-900 hover:text-midnight-800"
                          >
                            <span>{faq.question}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </button>
                          {open && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600">{faq.answer}</p>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
            </div>
          </div>

          {/* Fix 4: Sticky Right Rail (Who can apply + Apply + Documents + How to apply) */}
          <div className="min-w-0">
            <div className="sticky top-24 space-y-5">
              {/* Who can apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">Who can apply</h2>
                <Eligibility product={product} compact />
              </Card>

              {/* Full-width Apply button for this loan */}
              <Button
                variant="primary"
                onClick={() => setApplyOpen(true)}
                className="w-full bg-midnight-900 text-porcelain-50 hover:bg-midnight-800 h-11 text-sm font-semibold shadow-xs"
              >
                Apply for this loan <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
              </Button>

              {/* Documents required */}
              {Array.isArray(product.documents) && product.documents.length > 0 && (
                <Card className="p-5 shadow-xs border-ink-200">
                  <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">Documents required</h2>
                  <ul className="space-y-2">
                    {product.documents.map((doc) => (
                      <li key={doc} className="flex gap-2 text-xs leading-relaxed text-ink-700">
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-midnight-700" aria-hidden />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* How to apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">How to apply</h2>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-midnight-900 text-[11px] font-bold text-porcelain-50" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
        </div>

        {/* Fix 4 / Fix 6: More loans section (self-excluding, fact lines, no brand prefix) */}
        <MoreLoansSection currentSlug={product.slug} />

        {/* Application Modal (Module 17 + Module 18 amendments) */}
        {applyOpen && <ApplyModal open={applyOpen} product={product} onClose={() => setApplyOpen(false)} />}
      </div>
    );
  }

  // ==========================================================================
  // INVESTMENT DETAIL PRESENTATION (MODULE 24 - FIXES 1-7)
  // ==========================================================================
  if (isInvestment) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Breadcrumb */}
        <Link to="/investments" className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600 mb-4">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All investments
        </Link>

        {/* Fix 5: Compressed midnight hero panel */}
        <div className="rounded-2xl border border-midnight-800 bg-midnight-900 px-6 py-5 sm:px-7 sm:py-5.5 text-porcelain-50 shadow-lg">
          {/* Eyebrow chip */}
          <div className="flex items-center gap-2.5 mb-2">
            {product.riskClass === 'guaranteed' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success-600/40 bg-midnight-800 px-2.5 py-0.5 text-xs font-semibold text-porcelain-100">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Guaranteed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-600/40 bg-midnight-800 px-2.5 py-0.5 text-xs font-semibold text-porcelain-100">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Market-linked — not guaranteed
              </span>
            )}
            <span className="text-xs font-medium text-porcelain-300">
              Investment · {isFD ? 'Fixed Deposit' : isRD ? 'Recurring Deposit' : isSSY ? 'Government scheme' : 'Mutual funds'}
            </span>
          </div>

          {/* Fix 3: H1 without FinEdge prefix */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-porcelain-50">
                {shortProductName(product.name)}
              </h1>
              <p className="mt-1 text-sm sm:text-base leading-relaxed text-porcelain-200">
                {product.tagline}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleOpenInvestmentApply(product)}
              className="shrink-0 bg-midnight-800 text-porcelain-50 border border-gold-500/40 hover:bg-midnight-700 font-semibold"
            >
              Apply now <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
            </Button>
          </div>

          {/* Fix 4: Completed hero stat rows from data */}
          {stats.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-porcelain-50/15 pt-3.5">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-porcelain-300">{s.label}</dt>
                  <dd className="mt-0.5 text-sm sm:text-base font-semibold text-porcelain-50 font-mono">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* SIP market-risk banner directly under hero */}
        {isSIP && product.disclosure && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm leading-relaxed text-warning-700" role="note">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />
            <span>{product.disclosure}</span>
          </div>
        )}

        {/* Content Layout: Main column + Sticky rail (mobile stacks rail after calculator) */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Fix 1: One calculator per product at the top of main column */}
          <div className="min-w-0 lg:col-span-2 order-1">
            {isFD && <FdProductCalculator product={product} onApplyWithFigures={handleOpenInvestmentApplyWithFigures} />}
            {isRD && <RdProductCalculator product={product} onApplyWithFigures={handleOpenInvestmentApplyWithFigures} />}
            {isSIP && <SipProductCalculator product={product} onApplyWithFigures={handleOpenInvestmentApplyWithFigures} />}
            {isSSY && <SsyProductCalculator product={product} onApplyWithFigures={handleOpenInvestmentApplyWithFigures} />}
          </div>

          {/* Fix 5: Sticky right rail on desktop, stacked after calculator on mobile */}
          <div className="min-w-0 lg:col-span-1 order-2 lg:order-none lg:row-span-2">
            <div className="sticky top-24 space-y-5">
              {/* Who can apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">Who can apply</h2>
                <Eligibility product={product} compact />
              </Card>

              {/* Apply button */}
              <Button
                variant="primary"
                onClick={() => handleOpenInvestmentApply(product)}
                className="w-full bg-midnight-900 text-porcelain-50 hover:bg-midnight-800 h-11 text-sm font-semibold shadow-xs"
              >
                Apply for this investment <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
              </Button>

              {/* Documents required */}
              {Array.isArray(product.documents) && product.documents.length > 0 && (
                <Card className="p-5 shadow-xs border-ink-200">
                  <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">Documents required</h2>
                  <ul className="space-y-2">
                    {product.documents.map((doc) => (
                      <li key={doc} className="flex gap-2 text-xs leading-relaxed text-ink-700">
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-midnight-700" aria-hidden />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* How to apply */}
              <Card className="p-5 shadow-xs border-ink-200">
                <h2 className="font-display text-base font-semibold text-midnight-950 mb-3">How to apply</h2>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-midnight-900 text-[11px] font-bold text-porcelain-50" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>

          {/* Main content body (Overview, Rates, Features, FAQs, Disclosures) */}
          <div className="min-w-0 lg:col-span-2 order-3 lg:order-none space-y-10">
            {/* Overview */}
            <section aria-labelledby="inv-overview-heading">
              <h2 id="inv-overview-heading" className="font-display text-2xl font-semibold text-midnight-950">
                Overview
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{product.overview || '—'}</p>
            </section>

            {/* Rates & terms */}
            <section aria-labelledby="inv-rates-heading">
              <h2 id="inv-rates-heading" className="font-display text-2xl font-semibold text-midnight-950">
                {rateTitle}
              </h2>
              <div className="mt-4">
                <RateSection product={product} />
              </div>
              {isSIP && (
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  No rate is published for SIP because returns are market-linked and cannot be assured. Historical
                  performance of any scheme is not a guide to future returns.
                </p>
              )}
            </section>

            {/* Key features */}
            {Array.isArray(featureList) && featureList.length > 0 && (
              <section aria-labelledby="inv-features-heading">
                <h2 id="inv-features-heading" className="font-display text-2xl font-semibold text-midnight-950">
                  Key features
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {featureList.map((f) => (
                    <li key={f} className="flex gap-2.5 rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm leading-relaxed text-ink-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* FAQs */}
            {faqs.length > 0 && (
              <section aria-labelledby="inv-faq-heading">
                <h2 id="inv-faq-heading" className="font-display text-2xl font-semibold text-midnight-950">
                  Frequently asked questions
                </h2>
                <div className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white shadow-xs">
                  {faqs.map((faq, i) => {
                    const open = openFaq === i;
                    return (
                      <div key={faq.question}>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenFaq(open ? -1 : i)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink-900 hover:text-midnight-800 cursor-pointer"
                        >
                          <span>{faq.question}</span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        {open && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600">{faq.answer}</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Fix 6: Disclosures with deposit insurance line for FD/RD */}
            {product.disclosure && !isSIP && (
              <div className="flex items-start gap-2.5 rounded-lg border border-midnight-200 bg-midnight-50 px-4 py-3 text-sm leading-relaxed text-midnight-900" role="note">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                <div className="space-y-1.5">
                  <p>{product.disclosure}</p>
                  {(isFD || isRD) && (
                    <p className="text-xs leading-relaxed text-midnight-800">
                      Deposits insured by DICGC up to ₹5,00,000 per depositor per bank, modelled on those norms.
                    </p>
                  )}
                </div>
              </div>
            )}

            {product.lifePhoto && <LifePhoto photo={product.lifePhoto} />}

            <p className="text-xs leading-relaxed text-ink-500 mt-6">{RATE_DISCLAIMER}</p>
          </div>
        </div>

        {/* Fix 5: More investments section (self-excluding, fact lines, no brand prefix) */}
        <MoreInvestmentsSection currentSlug={product.slug} />

        {/* Fix 7: Apply Modal for this product */}
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

  // ==========================================================================
  // STANDARD DETAIL PRESENTATION (ACCOUNTS, INVESTMENTS)
  // ==========================================================================
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <Link to={meta.base} className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All {meta.label.toLowerCase()}
      </Link>

      {/* Header */}
      <div className="mt-5 rounded-xl border border-midnight-800 bg-midnight-900 px-6 py-8 text-porcelain-50 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {product.riskClass === 'guaranteed' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success-600/40 bg-midnight-800 px-2.5 py-0.5 text-xs font-semibold text-porcelain-100">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Guaranteed
            </span>
          ) : product.riskClass === 'market-linked' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-600/40 bg-midnight-800 px-2.5 py-0.5 text-xs font-semibold text-porcelain-100">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Market-linked — not guaranteed
            </span>
          ) : (
            <Badge tone="info">{meta.label.slice(0, -1)}</Badge>
          )}
          {(product.riskClass || product.kind) && (
            <span className="text-sm font-medium text-porcelain-200">
              {[product.riskClass ? meta.label.slice(0, -1) : null, product.kind].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-base leading-relaxed text-porcelain-200">{product.tagline}</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setApplyOpen(true)} className="shrink-0">
            Apply now <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
          </Button>
        </div>
        {stats.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-porcelain-50/15 pt-5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-porcelain-300">{s.label}</dt>
                <dd className="mt-1 text-base font-semibold text-porcelain-50">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* SIP risk disclosure */}
      {isSip && product.disclosure && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm leading-relaxed text-warning-600" role="note">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{product.disclosure}</span>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-10 lg:col-span-2">
          {/* Overview */}
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="font-display text-2xl font-semibold text-midnight-950">
              Overview
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{product.overview || '—'}</p>
          </section>

          {/* Rates */}
          <section aria-labelledby="rates-heading">
            <h2 id="rates-heading" className="font-display text-2xl font-semibold text-midnight-950">
              {rateTitle}
            </h2>
            <div className="mt-4">
              <RateSection product={product} />
            </div>
            {isSip && (
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                No rate is published for SIP because returns are market-linked and cannot be assured. Historical
                performance of any scheme is not a guide to future returns.
              </p>
            )}
          </section>

          {/* Fees */}
          {fees.length > 0 && (
            <section aria-labelledby="fees-heading">
              <h2 id="fees-heading" className="font-display text-2xl font-semibold text-midnight-950">
                Fees & charges
              </h2>
              <div className="mt-4">
                <Table
                  columns={[
                    { key: 'service', label: 'Service' },
                    { key: 'fee', label: 'Charge', align: 'right' },
                  ]}
                  rows={fees}
                  rowKey={(r) => r.service}
                />
              </div>
            </section>
          )}

          {/* Features / rewards */}
          {Array.isArray(featureList) && featureList.length > 0 && (
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="font-display text-2xl font-semibold text-midnight-950">
                {product.category === 'card' ? 'Rewards & benefits' : 'Key features'}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {featureList.map((f) => (
                  <li key={f} className="flex gap-2.5 rounded-lg border border-ink-100 bg-white px-4 py-3 text-sm leading-relaxed text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <section aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="font-display text-2xl font-semibold text-midnight-950">
                Frequently asked questions
              </h2>
              <div className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
                {faqs.map((faq, i) => {
                  const open = openFaq === i;
                  return (
                    <div key={faq.question}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? -1 : i)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink-900 hover:text-midnight-800"
                      >
                        {faq.question}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                      {open && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600">{faq.answer}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {product.category === 'investment' && product.disclosure && !isSip && (
            <div className="flex items-start gap-2.5 rounded-lg border border-midnight-200 bg-midnight-50 px-4 py-3 text-sm leading-relaxed text-midnight-900" role="note">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{product.disclosure}</span>
            </div>
          )}

          {product.lifePhoto && <LifePhoto photo={product.lifePhoto} />}

          <p className="text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-midnight-950">Who can apply</h2>
            <div className="mt-3">
              <Eligibility product={product} />
            </div>
            <Button variant="primary" onClick={() => setApplyOpen(true)} className="mt-5 w-full">
              Apply for this {meta.singular} <ArrowRight className="h-4 w-4 ml-1.5 inline" aria-hidden />
            </Button>
          </Card>

          {Array.isArray(product.documents) && product.documents.length > 0 && (
            <Card className="p-6 shadow-none">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-midnight-950">
                <FileText className="h-5 w-5 text-midnight-700" aria-hidden /> Documents you will need
              </h2>
              <ul className="mt-3 space-y-2">
                {product.documents.map((doc) => (
                  <li key={doc} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-midnight-300" aria-hidden />
                    {doc}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6 shadow-none">
            <h2 className="font-display text-lg font-semibold text-midnight-950">How to apply</h2>
            <ol className="mt-4 space-y-4">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-midnight-800 text-xs font-bold text-porcelain-50" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed text-ink-700">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12">
          <h2 id="related-heading" className="font-display text-2xl font-semibold text-midnight-950">
            More {meta.label.toLowerCase()}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rel) => (
              <Link key={rel.slug} to={`${meta.base}/${rel.slug}`} className="group">
                <Card className="h-full p-6 shadow-none transition-colors group-hover:border-midnight-400">
                  <h3 className="font-display text-lg font-semibold leading-snug text-midnight-950">{rel.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{rel.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-midnight-800">
                    View details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {applyOpen && (
        <ApplyModal
          open={applyOpen}
          product={product}
          initialAmount={queryAmount ? Number(queryAmount) : undefined}
          initialCategory={queryCategory || undefined}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
}

export { ProductDetailPage };
