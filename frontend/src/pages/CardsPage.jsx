import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowRight, CreditCard, Sparkles } from 'lucide-react';
import { Button, Card, SectionHeader, Tabs } from '../components/ui.jsx';
import { CARDS, CREDIT_CARDS, DEBIT_CARDS, RATE_DISCLAIMER } from '../data/products.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';
import { CardVisual } from '../components/common/CardVisual.jsx';
import { TiltCard } from '../components/TiltCard.jsx';

function moneyOrNil(value) {
  if (value === null || value === undefined) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function CardTile({ card, onApply }) {
  const isCredit = card.cardType === 'credit';
  return (
    <Card id={card.slug} className="min-w-0 flex flex-col p-6 scroll-mt-24 shadow-none transition-shadow hover:shadow-card">
      {/* 1. Visually distinct shared CardVisual face with cursor-tracked 3D tilt */}
      <TiltCard maxTilt={10} perspective={900} sweepKey={card.slug}>
        <CardVisual card={card} shadow={false} />
      </TiltCard>

      <div className="mt-5 flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-semibold leading-snug text-midnight-950">
          {shortProductName(card.name)}
        </h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          isCredit ? 'bg-midnight-900 text-porcelain-50' : 'bg-gold-100 text-gold-900 border border-gold-200'
        }`}>
          {isCredit ? 'Credit' : 'Debit'}
        </span>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{card.tagline}</p>

      {/* Facts Grid — All values read strictly from data file */}
      <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-500">Joining fee</dt>
          <dd className="font-semibold text-ink-900">{moneyOrNil(card.joiningFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-500">Annual fee</dt>
          <dd className="font-semibold text-ink-900">{moneyOrNil(card.annualFee)}</dd>
        </div>

        {isCredit ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Finance charge (APR)</dt>
              <dd className="font-semibold text-ink-900 tnum">
                {card.aprPct !== null && card.aprPct !== undefined ? `${card.aprPct.toFixed(1)}% p.a.` : '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Interest-free period</dt>
              <dd className="font-semibold text-ink-900">
                {card.interestFreeDays ? `Up to ${card.interestFreeDays} days` : '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Credit limit</dt>
              <dd className="text-right font-semibold text-ink-900 tnum">
                {card.creditLimitRange
                  ? `${formatINRWhole(card.creditLimitRange.min)} – ${formatINRWhole(card.creditLimitRange.max)}`
                  : '—'}
              </dd>
            </div>
            {card.limitBasis && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Limit basis</dt>
                <dd className="text-right font-semibold text-ink-900 text-xs">
                  {card.limitBasis}
                </dd>
              </div>
            )}
            {/* Fix 2: Dedicated Forex markup row — no comparative or numeric claim without its figure */}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Forex markup</dt>
              <dd className="font-semibold text-midnight-950 font-mono text-[13px] bg-porcelain-100 px-2 py-0.5 rounded">
                {card.fees?.forexMarkupPct ? `${card.fees.forexMarkupPct}%` : '—'}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Daily ATM limit</dt>
              <dd className="font-semibold text-ink-900 tnum">
                {card.limits ? formatINRWhole(card.limits.atmDaily) : '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Daily spend limit</dt>
              <dd className="font-semibold text-ink-900 tnum">
                {card.limits ? formatINRWhole(card.limits.posDaily) : '—'}
              </dd>
            </div>
            {/* Forex markup for Debit */}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Forex markup</dt>
              <dd className="font-semibold text-midnight-950 font-mono text-[13px] bg-porcelain-100 px-2 py-0.5 rounded">
                {card.fees?.forexMarkupPct ? `${card.fees.forexMarkupPct}%` : '—'}
              </dd>
            </div>
          </>
        )}
      </dl>

      {card.annualFeeWaiver && (
        <p className="mt-3 text-[13px] leading-snug text-ink-500 bg-porcelain-50 p-2.5 rounded-lg border border-ink-100/60">
          {card.annualFeeWaiver}.
        </p>
      )}

      {Array.isArray(card.rewards) && card.rewards.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {card.rewards.slice(0, 2).map((r, idx) => (
            <li key={`${card.slug}-reward-${idx}`} className="flex gap-2 text-[13px] leading-snug text-ink-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link to={`/cards/${card.slug}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            View details <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => onApply(card)}
        >
          Apply now
        </Button>
      </div>
    </Card>
  );
}

export default function CardsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const initial = params.get('type') === 'debit' ? 'debit' : 'credit';
  const [tab, setTab] = useState(initial);
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);
  const cards = tab === 'credit' ? CREDIT_CARDS : DEBIT_CARDS;

  const onTabChange = (id) => {
    setTab(id);
    setParams(id === 'debit' ? { type: 'debit' } : {}, { replace: true });
  };

  // Scroll to hash anchor (e.g. #compare or #card-slug)
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
  }, [location.hash]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader
        titleAs="h1"
        eyebrow="Cards"
        title="Cards that suit how you spend"
        description="Cashback, travel and credit-building credit cards, plus debit cards linked straight to your account. Fees, finance charges and limits below are the full illustrative schedule — the detail page carries every charge."
      />

      {/* Category Tabs: Credit Cards vs Debit Cards */}
      <Tabs
        tabs={[
          { id: 'credit', label: 'Credit cards', count: CREDIT_CARDS.length },
          { id: 'debit', label: 'Debit cards', count: DEBIT_CARDS.length },
        ]}
        active={tab}
        onChange={onTabChange}
      />

      <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-ink-600">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
        {tab === 'credit'
          ? 'Credit cards are issued subject to eligibility and credit assessment. The APR shown is the finance charge on revolving balances — pay in full within the interest-free period and no finance charge applies.'
          : 'Debit cards spend directly from your account balance and are issued with a FinEdge account. Daily limits can be adjusted in net-banking once your card is active.'}
      </p>

      {/* Tiles Grid */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <CardTile
            key={card.slug}
            card={card}
            onApply={(c) => setSelectedProductForApply(c)}
          />
        ))}
      </div>

      {/* Card Comparison Section (Fix 4: Decision-grade, split by category with #compare anchor) */}
      <section id="compare" className="mt-20 scroll-mt-24 border-t border-ink-100 pt-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <SectionHeader
            eyebrow="Side by side"
            title="Compare FinEdge Cards"
            description="Decision-grade comparison of joining fees, annual fees, finance charges, credit and transaction limits, and forex markups."
          />
          {/* Quick toggle within compare section matching main tab */}
          <div className="inline-flex rounded-lg border border-ink-200 bg-porcelain-100 p-1 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onTabChange('credit')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'credit'
                  ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                  : 'text-ink-600 hover:text-midnight-950'
              }`}
            >
              Credit Cards ({CREDIT_CARDS.length})
            </button>
            <button
              type="button"
              onClick={() => onTabChange('debit')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'debit'
                  ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                  : 'text-ink-600 hover:text-midnight-950'
              }`}
            >
              Debit Cards ({DEBIT_CARDS.length})
            </button>
          </div>
        </div>

        {tab === 'credit' ? (
          /* Table 1: CREDIT CARDS COMPARE TABLE */
          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-porcelain-100/80 text-xs font-semibold uppercase tracking-wider text-ink-700">
                  <th className="px-5 py-3.5">Card</th>
                  <th className="px-5 py-3.5">Joining Fee</th>
                  <th className="px-5 py-3.5">Annual Fee</th>
                  <th className="px-5 py-3.5">APR</th>
                  <th className="px-5 py-3.5">Interest-Free Period</th>
                  <th className="px-5 py-3.5">Credit Limit</th>
                  <th className="px-5 py-3.5">Forex Markup</th>
                  <th className="px-5 py-3.5">Key Benefit</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {CREDIT_CARDS.map((c) => (
                  <tr key={c.slug} className="hover:bg-midnight-50/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-midnight-950 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold">{shortProductName(c.name)}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-midnight-900 text-porcelain-50 font-bold">
                          {c.network}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap font-medium">
                      {moneyOrNil(c.joiningFee)}
                    </td>
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap font-medium">
                      {moneyOrNil(c.annualFee)}
                    </td>
                    <td className="px-5 py-4 text-ink-900 whitespace-nowrap font-semibold tnum">
                      {c.aprPct ? `${c.aprPct.toFixed(1)}% p.a.` : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap">
                      {c.interestFreeDays ? `Up to ${c.interestFreeDays} days` : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-900 text-xs max-w-[180px]">
                      {c.creditLimitRange
                        ? `${formatINRWhole(c.creditLimitRange.min)} – ${formatINRWhole(c.creditLimitRange.max)}`
                        : '—'}
                      {c.limitBasis && (
                        <span className="block text-[11px] text-ink-500 mt-0.5 font-normal">
                          ({c.limitBasis})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-midnight-950 text-xs whitespace-nowrap">
                      <span className="bg-porcelain-100 px-2 py-1 rounded border border-ink-100">
                        {c.fees?.forexMarkupPct ? `${c.fees.forexMarkupPct}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-600 max-w-xs leading-relaxed">
                      {c.rewards?.[0] || c.tagline}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/cards/${c.slug}`}
                          className="text-xs font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600"
                        >
                          Details →
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedProductForApply(c)}
                        >
                          Apply
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Table 2: DEBIT CARDS COMPARE TABLE */
          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-porcelain-100/80 text-xs font-semibold uppercase tracking-wider text-ink-700">
                  <th className="px-5 py-3.5">Card</th>
                  <th className="px-5 py-3.5">Joining Fee</th>
                  <th className="px-5 py-3.5">Annual Fee</th>
                  <th className="px-5 py-3.5">Daily ATM Limit</th>
                  <th className="px-5 py-3.5">Daily Spend Limit</th>
                  <th className="px-5 py-3.5">Forex Markup</th>
                  <th className="px-5 py-3.5">Key Benefit</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {DEBIT_CARDS.map((c) => (
                  <tr key={c.slug} className="hover:bg-midnight-50/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-midnight-950 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold">{shortProductName(c.name)}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gold-100 text-gold-900 border border-gold-200 font-bold">
                          {c.network}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap font-medium">
                      {moneyOrNil(c.joiningFee)}
                    </td>
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap font-medium">
                      {moneyOrNil(c.annualFee)}
                    </td>
                    <td className="px-5 py-4 text-ink-900 whitespace-nowrap font-semibold tnum">
                      {c.limits ? formatINRWhole(c.limits.atmDaily) : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-900 whitespace-nowrap font-semibold tnum">
                      {c.limits ? formatINRWhole(c.limits.posDaily) : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-midnight-950 text-xs whitespace-nowrap">
                      <span className="bg-porcelain-100 px-2 py-1 rounded border border-ink-100">
                        {c.fees?.forexMarkupPct ? `${c.fees.forexMarkupPct}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-600 max-w-xs leading-relaxed">
                      {c.rewards?.[0] || c.tagline}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/cards/${c.slug}`}
                          className="text-xs font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600"
                        >
                          Details →
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedProductForApply(c)}
                        >
                          Apply
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>

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

export { CardsPage };
