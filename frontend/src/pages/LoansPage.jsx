import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Landmark } from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../components/ui.jsx';
import { LOANS, RATE_DISCLAIMER } from '../data/products.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';

/** Tenures are stored in months; show years when they divide cleanly. */
function tenureLabel(minMonths, maxMonths) {
  if (minMonths === null || minMonths === undefined || maxMonths === null || maxMonths === undefined) return '—';
  if (minMonths % 12 === 0 && maxMonths % 12 === 0) {
    const lo = minMonths / 12;
    const hi = maxMonths / 12;
    return lo === hi ? `${lo} year${lo === 1 ? '' : 's'}` : `${lo} – ${hi} years`;
  }
  return minMonths === maxMonths ? `${minMonths} months` : `${minMonths} – ${maxMonths} months`;
}

function processingFeeLabel(fee) {
  if (!fee || typeof fee !== 'object') return '—';
  const parts = [`${fee.pct}% of the loan amount`];
  const bounds = [];
  if (fee.min !== null && fee.min !== undefined) bounds.push(`min ${fee.min === 0 ? 'Nil' : formatINRWhole(fee.min)}`);
  if (fee.max !== null && fee.max !== undefined) bounds.push(`max ${formatINRWhole(fee.max)}`);
  if (bounds.length) parts.push(`(${bounds.join(', ')})`);
  return parts.join(' ');
}

export default function LoansPage() {
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader
        titleAs="h1"
        eyebrow="Loans"
        title="Borrow with the full price on the table"
        description="Every FinEdge loan lists its rate range, maximum amount, tenure and processing fee up front. Your sanctioned rate depends on your profile and is confirmed before you sign — use the calculators page to model EMIs before you apply."
        action={
          <Link to="/calculators">
            <Button variant="secondary">
              Open the EMI calculator <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LOANS.map((loan) => (
          <Card key={loan.slug} id={loan.slug} className="flex flex-col p-6 scroll-mt-24 shadow-none transition-shadow hover:shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              {loan.maxLtvPct ? <Badge tone="info">Up to {loan.maxLtvPct}% of value</Badge> : null}
            </div>

            <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-midnight-950">{shortProductName(loan.name)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{loan.tagline}</p>

            <p className="mt-4 text-sm font-medium text-ink-900 tnum">
              {loan.rateMin !== null && loan.rateMin !== undefined ? loan.rateMin.toFixed(2) : '—'}
              {' – '}
              {loan.rateMax !== null && loan.rateMax !== undefined ? loan.rateMax.toFixed(2) : '—'}
              <span className="ml-1">% p.a.</span>
            </p>
            <p className="text-xs text-ink-500">Interest rate range, reducing balance</p>

            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Maximum amount</dt>
                <dd className="font-semibold text-ink-900">
                  {loan.maxAmount ? `Up to ${formatINRWhole(loan.maxAmount)}` : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Tenure</dt>
                <dd className="font-semibold text-ink-900">{tenureLabel(loan.tenureMinMonths, loan.tenureMaxMonths)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Processing fee</dt>
                <dd className="text-right font-semibold text-ink-900">{processingFeeLabel(loan.processingFee)}</dd>
              </div>
            </dl>

            {loan.processingFee?.note && (
              <p className="mt-2 text-[13px] leading-snug text-ink-500">{loan.processingFee.note}.</p>
            )}

            {Array.isArray(loan.features) && loan.features.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {loan.features.slice(0, 2).map((f) => (
                  <li key={f} className="flex gap-2 text-[13px] leading-snug text-ink-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-midnight-300" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link to={`/loans/${loan.slug}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  View details <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setSelectedProductForApply(loan)}
              >
                Apply now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-ink-600">
        All loans are subject to eligibility, document verification and credit assessment. On this demonstration
        platform, applications move through a staff review queue so you can watch each stage — nothing here is a real
        credit offer.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>

      {selectedProductForApply && (
        <ApplyModal
          open={Boolean(selectedProductForApply)}
          product={selectedProductForApply}
          onClose={() => setSelectedProductForApply(null)}
        />
      )}
    </div>
  );
}

export { LoansPage };
