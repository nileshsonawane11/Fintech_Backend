import Reveal from '../components/Reveal.jsx';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, CreditCard } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { CREDIT_CARDS, DEBIT_CARDS, RATE_DISCLAIMER } from '../data/products.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';
import { CardVisual } from '../components/common/CardVisual.jsx';
import { TiltCard } from '../components/TiltCard.jsx';

function moneyOrNil(value) {
  if (value === null || value === undefined) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function CardTile({ card, onApply, isLogged }) {
  const isCredit = card.cardType === 'credit';
  return (
    <div
      id={card.slug}
      className="relative rounded-2xl p-6 sm:p-7 text-white flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg min-h-[420px]"
      style={{ backgroundColor: '#1e293b' }}
    >
      {/* 3D Tilt Card Visual */}
      <div className="relative z-10 w-full max-w-[260px] mx-auto mb-4">
        <TiltCard maxTilt={10} perspective={800} sweepKey={card.slug}>
          <CardVisual card={card} shadow={false} />
        </TiltCard>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
            {isCredit ? 'Credit Card' : 'Debit Card'}
          </span>
          {card.network && (
            <span className="text-xs font-semibold text-slate-300">
              {card.network}
            </span>
          )}
        </div>

        <h3 className="font-sans font-bold text-xl text-white tracking-tight">
          {shortProductName(card.name)}
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2">
          {card.tagline}
        </p>

        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block">Annual Fee</span>
            <span className="font-mono font-semibold text-white">{moneyOrNil(card.annualFee)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Forex Markup</span>
            <span className="font-mono font-bold text-white">
              {card.fees?.forexMarkupPct ? `${card.fees.forexMarkupPct}%` : 'Standard'}
            </span>
          </div>
          {isCredit ? (
            <>
              <div>
                <span className="text-slate-400 block">Grace Period</span>
                <span className="font-medium text-white">{card.interestFreeDays ? `Up to ${card.interestFreeDays}d` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Credit Limit</span>
                <span className="font-mono font-semibold text-white truncate block">
                  {card.creditLimitRange ? formatINRWhole(card.creditLimitRange.max) : 'Slab-based'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-slate-400 block">Daily ATM</span>
                <span className="font-mono font-semibold text-white">{card.limits ? formatINRWhole(card.limits.atmDaily) : '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Daily POS</span>
                <span className="font-mono font-semibold text-white">{card.limits ? formatINRWhole(card.limits.posDaily) : '—'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Actions: White Outline Pill + White Underlined Link */}
      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
        <button
          onClick={() => onApply(card)}
          className="px-5 py-2.5 rounded-full border border-white text-white font-bold text-xs hover:bg-white hover:text-[#1e293b] transition-colors cursor-pointer"
        >
          {isLogged ? 'Apply Now' : 'Login to Apply'}
        </button>
        <Link
          to={`/cards/${card.slug}`}
          className="text-xs font-semibold text-white/90 underline decoration-white/50 hover:text-white hover:decoration-white transition-colors"
        >
          Know more →
        </Link>
      </div>

      {/* Cropped line icon at bottom right */}
      <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none select-none">
        <CreditCard className="w-36 h-36" strokeWidth={1.2} />
      </div>
    </div>
  );
}

export default function CardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleApply = (c) => {
    if (!user) navigate(`/portal/login?redirect=/portal/cards&product=${c.slug}`);
    else navigate(`/portal/cards?apply=${c.slug}`);
  };
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
    <div className="w-full bg-white text-neutral-900">
      {/* PART I: BLUSH MINI-HERO ON TOP WITH BREADCRUMB PILL */}
      <section className="bg-[#fdecec] py-10 sm:py-14 border-b border-red-100">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-neutral-700 border border-red-150 shadow-xs mb-4">
            <Link to="/" className="hover:text-[#981a1d] transition-colors">Home</Link>
            <span className="text-neutral-400">/</span>
            <span className="text-[#981a1d] font-bold">Cards</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Cards built with clear terms and zero hidden surprises
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-700 max-w-2xl">
                Original credit and debit cards with transparent fee waivers, explicit forex markups and slab-qualified limits.
              </p>
            </div>

            {/* Pill Tabs for Credit vs Debit */}
            <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-full border border-red-200 shrink-0">
              <button
                type="button"
                onClick={() => onTabChange('credit')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tab === 'credit'
                    ? 'bg-[#981a1d] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Credit Cards ({CREDIT_CARDS.length})
              </button>
              <button
                type="button"
                onClick={() => onTabChange('debit')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tab === 'debit'
                    ? 'bg-[#981a1d] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Debit Cards ({DEBIT_CARDS.length})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PART C: FLAT COLOUR-BLOCK PRODUCT GRID (Cards = dark slate/ink #1e293b) */}
      <section className="py-14 bg-white">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, idx) => (
              <Reveal key={card.slug} treatment="B" staggerIndex={idx}>
                <CardTile
                  card={card}
                  isLogged={Boolean(user)}
                  onApply={handleApply}
                />
              </Reveal>
            ))}
          </div>

          {/* Card Comparison Section */}
          <section id="compare" className="mt-16 scroll-mt-24 border-t border-neutral-200 pt-12">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">
                  Compare FinEdge Cards Side by Side
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                  Comprehensive breakdown of joining fees, annual fees, limits, and forex markups.
                </p>
              </div>

              <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => onTabChange('credit')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    tab === 'credit' ? 'bg-[#981a1d] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Credit Cards
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('debit')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    tab === 'debit' ? 'bg-[#981a1d] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Debit Cards
                </button>
              </div>
            </div>

            {tab === 'credit' ? (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-100/80 font-bold uppercase tracking-wider text-neutral-700">
                      <th className="px-5 py-3.5 sticky left-0 bg-neutral-100 z-10">Card</th>
                      <th className="px-5 py-3.5">Joining Fee</th>
                      <th className="px-5 py-3.5">Annual Fee</th>
                      <th className="px-5 py-3.5">APR</th>
                      <th className="px-5 py-3.5">Interest-Free Period</th>
                      <th className="px-5 py-3.5">Credit Limit</th>
                      <th className="px-5 py-3.5">Forex Markup</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {CREDIT_CARDS.map((c) => (
                      <tr key={c.slug} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 whitespace-nowrap sticky left-0 bg-white z-10">
                          {shortProductName(c.name)}
                        </td>
                        <td className="px-5 py-4 text-neutral-700 whitespace-nowrap">{moneyOrNil(c.joiningFee)}</td>
                        <td className="px-5 py-4 text-neutral-700 whitespace-nowrap">{moneyOrNil(c.annualFee)}</td>
                        <td className="px-5 py-4 font-mono font-bold text-[#981a1d] whitespace-nowrap">
                          {c.aprPct != null ? `${c.aprPct.toFixed(1)}% p.a.` : '—'}
                        </td>
                        <td className="px-5 py-4 text-neutral-700 whitespace-nowrap">
                          {c.interestFreeDays ? `Up to ${c.interestFreeDays} days` : '—'}
                        </td>
                        <td className="px-5 py-4 font-mono text-neutral-800 whitespace-nowrap">
                          {c.creditLimitRange ? `${formatINRWhole(c.creditLimitRange.min)} – ${formatINRWhole(c.creditLimitRange.max)}` : 'Slab-based'}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-neutral-900 whitespace-nowrap">
                          {c.fees?.forexMarkupPct ? `${c.fees.forexMarkupPct}%` : 'Standard'}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Button variant="primary" size="sm" onClick={() => handleApply(c)} className="text-xs px-3 py-1 font-bold">
                            {user ? 'Apply' : 'Login'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-100/80 font-bold uppercase tracking-wider text-neutral-700">
                      <th className="px-5 py-3.5 sticky left-0 bg-neutral-100 z-10">Card</th>
                      <th className="px-5 py-3.5">Joining Fee</th>
                      <th className="px-5 py-3.5">Annual Fee</th>
                      <th className="px-5 py-3.5">Daily ATM Limit</th>
                      <th className="px-5 py-3.5">Daily Spend Limit</th>
                      <th className="px-5 py-3.5">Forex Markup</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {DEBIT_CARDS.map((c) => (
                      <tr key={c.slug} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 whitespace-nowrap sticky left-0 bg-white z-10">
                          {shortProductName(c.name)}
                        </td>
                        <td className="px-5 py-4 text-neutral-700 whitespace-nowrap">{moneyOrNil(c.joiningFee)}</td>
                        <td className="px-5 py-4 text-neutral-700 whitespace-nowrap">{moneyOrNil(c.annualFee)}</td>
                        <td className="px-5 py-4 font-mono text-neutral-800 whitespace-nowrap">
                          {c.limits ? formatINRWhole(c.limits.atmDaily) : '—'}
                        </td>
                        <td className="px-5 py-4 font-mono text-neutral-800 whitespace-nowrap">
                          {c.limits ? formatINRWhole(c.limits.posDaily) : '—'}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-neutral-900 whitespace-nowrap">
                          {c.fees?.forexMarkupPct ? `${c.fees.forexMarkupPct}%` : 'Standard'}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Button variant="primary" size="sm" onClick={() => handleApply(c)} className="text-xs px-3 py-1 font-bold">
                            {user ? 'Apply' : 'Login'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="mt-10 text-xs text-neutral-500 leading-relaxed">{RATE_DISCLAIMER}</p>
        </div>
      </section>

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
