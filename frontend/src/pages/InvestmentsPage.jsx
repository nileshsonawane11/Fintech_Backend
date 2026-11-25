import Reveal from '../components/Reveal.jsx';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ArrowRight, PiggyBank, CalendarClock, LineChart, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { FD, INVESTMENTS, RD, RATE_DISCLAIMER, SIP, SSY } from '../data/products.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';

const bySlug = (slug) => INVESTMENTS.find((i) => i.slug === slug) || {};
const fd = bySlug(FD.slug);
const rd = bySlug(RD.slug);
const sip = bySlug(SIP.slug);
const ssy = bySlug(SSY.slug);

function topOf(rows, key) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return Math.max(...rows.map((r) => r[key]));
}

export default function InvestmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleApply = (prod) => {
    const s = prod?.slug || 'fixed-deposit';
    if (!user) navigate(`/portal/login?redirect=/portal/investments&product=${s}`);
    else navigate(`/portal/investments?apply=${s}`);
  };
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);
  const [selectedCategoryForApply, setSelectedCategoryForApply] = useState(undefined);
  const fdTop = topOf(fd.rateGrid, 'general');
  const fdTopSenior = topOf(fd.rateGrid, 'senior');
  const rdTop = topOf(rd.rateBands, 'rate');

  const investmentItems = [
    {
      prod: fd,
      icon: PiggyBank,
      badge: 'Guaranteed Payout',
      rateDisplay: fdTopSenior ? `Up to ${fdTopSenior.toFixed(2)}% p.a.` : '7.45% p.a.',
      subRate: `Regular rates up to ${fdTop ? fdTop.toFixed(2) : 6.95}% p.a.`,
      tenure: '7 days to 10 years',
    },
    {
      prod: rd,
      icon: CalendarClock,
      badge: 'Disciplined Savings',
      rateDisplay: rdTop ? `Up to ${rdTop.toFixed(2)}% p.a.` : '7.10% p.a.',
      subRate: `From ${rd.minMonthly ? formatINRWhole(rd.minMonthly) : '₹500'} / month`,
      tenure: '6 months to 10 years',
    },
    {
      prod: ssy,
      icon: ShieldCheck,
      badge: 'Govt. Guaranteed',
      rateDisplay: `${ssy.rate || 8.05}% p.a.`,
      subRate: 'Sovereign backed scheme',
      tenure: 'Up to 21 years maturity',
    },
    {
      prod: sip,
      icon: LineChart,
      badge: 'Market-Linked',
      rateDisplay: 'Long-Term Compounding',
      subRate: 'Assumed illustrative return',
      tenure: 'Flexible monthly debits',
    },
  ];

  return (
    <div className="w-full bg-white text-neutral-900">
      {/* PART I: BLUSH MINI-HERO ON TOP WITH BREADCRUMB PILL */}
      <section className="bg-[#fdecec] py-10 sm:py-14 border-b border-red-100">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-neutral-700 border border-red-150 shadow-xs mb-4">
            <Link to="/" className="hover:text-[#981a1d] transition-colors">Home</Link>
            <span className="text-neutral-400">/</span>
            <span className="text-[#981a1d] font-bold">Investments</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Grow your money with transparent compounding
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-700 max-w-2xl">
                Guaranteed fixed deposits, recurring savings, government schemes, and market-linked SIPs — every figure calculated via our verified finance engine.
              </p>
            </div>
            <Link to="/calculators?tab=fd" className="shrink-0">
              <Button variant="outline" className="font-semibold text-xs sm:text-sm">
                Open FD Calculator <ArrowRight className="h-4 w-4 ml-1 inline" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PART C: FLAT COLOUR-BLOCK PRODUCT GRID (Investments = deep plum/ink #2e1065) */}
      <section className="py-14 bg-white">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-700 max-w-3xl">
            <strong className="font-semibold text-neutral-900">Deposit Insurance (DICGC):</strong> Bank deposits are insured by DICGC up to ₹5,00,000 per depositor per bank in accordance with regulatory norms. Fictional prototype demonstration.
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {investmentItems.map(({ prod, icon: Icon, badge, rateDisplay, subRate, tenure }, idx) => (
              <Reveal key={prod.slug || idx} treatment="B" staggerIndex={idx}>
                <div
                  id={prod.slug}
                  className="relative rounded-2xl p-6 sm:p-8 text-white flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg min-h-[320px]"
                  style={{ backgroundColor: '#2e1065' }}
                >
                  {/* Top Content */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200/90 bg-white/10 px-2.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                      <span className="text-xs text-purple-200/70">{tenure}</span>
                    </div>

                    <h3 className="font-sans font-bold text-xl sm:text-2xl text-white tracking-tight">
                      {shortProductName(prod.name)}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-purple-100/80 leading-relaxed line-clamp-2">
                      {prod.tagline}
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/15">
                      <div className="font-mono font-bold text-2xl text-white">
                        {rateDisplay}
                      </div>
                      <p className="text-xs text-purple-200/75 mt-0.5 font-medium">
                        {subRate}
                      </p>
                    </div>

                    {prod.slug === 'systematic-investment-plan' && (
                      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-200/90 bg-amber-500/10 p-2 rounded-lg border border-amber-400/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-300" />
                        <span>Market-linked investments are subject to market risks. Past returns do not assure future performance.</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions: White Outline Pill + White Underlined Link */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
                    <button
                      onClick={() => handleApply(prod)}
                      className="px-5 py-2.5 rounded-full border border-white text-white font-bold text-xs hover:bg-white hover:text-[#2e1065] transition-colors cursor-pointer"
                    >
                      {user ? 'Book Now' : 'Login to Apply'}
                    </button>
                    <Link
                      to={`/investments/${prod.slug}`}
                      className="text-xs font-semibold text-white/90 underline decoration-white/50 hover:text-white hover:decoration-white transition-colors"
                    >
                      View details →
                    </Link>
                  </div>

                  {/* Cropped line icon at bottom right */}
                  <div className="absolute -right-6 -bottom-6 text-white/10 pointer-events-none select-none">
                    <Icon className="w-40 h-40" strokeWidth={1.2} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 text-xs text-neutral-500 max-w-3xl leading-relaxed">
            <p>{RATE_DISCLAIMER}</p>
          </div>
        </div>
      </section>

      {selectedProductForApply && (
        <ApplyModal
          open={Boolean(selectedProductForApply)}
          product={selectedProductForApply}
          initialCategory={selectedCategoryForApply}
          onClose={() => {
            setSelectedProductForApply(null);
            setSelectedCategoryForApply(undefined);
          }}
        />
      )}
    </div>
  );
}

export { InvestmentsPage };
