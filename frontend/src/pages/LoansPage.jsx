import Reveal from '../components/Reveal.jsx';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Landmark, Home, User, Car, GraduationCap, Coins, Building2, Briefcase } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { LOANS, RATE_DISCLAIMER } from '../data/products.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';

const LOAN_ICONS = {
  'home-loan': Home,
  'personal-loan': User,
  'vehicle-loan': Car,
  'education-loan': GraduationCap,
  'gold-loan': Coins,
  'loan-against-property': Building2,
  'business-growth-loan': Briefcase,
};

function tenureLabel(minMonths, maxMonths) {
  if (minMonths === null || minMonths === undefined || maxMonths === null || maxMonths === undefined) return '—';
  if (minMonths % 12 === 0 && maxMonths % 12 === 0) {
    const lo = minMonths / 12;
    const hi = maxMonths / 12;
    return lo === hi ? `${lo} yr${lo === 1 ? '' : 's'}` : `${lo} – ${hi} yrs`;
  }
  return minMonths === maxMonths ? `${minMonths} mo` : `${minMonths} – ${maxMonths} mo`;
}

export default function LoansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleApply = (loan) => {
    if (!user) navigate(`/portal/login?redirect=/portal/loans&product=${loan.slug}`);
    else navigate(`/portal/loans?apply=${loan.slug}`);
  };
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);

  return (
    <div className="w-full bg-white text-neutral-900">
      {/* PART I: BLUSH MINI-HERO ON TOP WITH BREADCRUMB PILL */}
      <section className="bg-[#fdecec] py-10 sm:py-14 border-b border-red-100">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-neutral-700 border border-red-150 shadow-xs mb-4">
            <Link to="/" className="hover:text-[#981a1d] transition-colors">Home</Link>
            <span className="text-neutral-400">/</span>
            <span className="text-[#981a1d] font-bold">Loans</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Borrow with the full price on the table
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-700 max-w-2xl">
                Every FinEdge loan lists its rate range, maximum amount, tenure and processing fee up front. Your sanctioned rate is confirmed before you sign.
              </p>
            </div>
            <Link to="/calculators" className="shrink-0">
              <Button variant="outline" className="font-semibold text-xs sm:text-sm">
                Open EMI Calculator <ArrowRight className="h-4 w-4 ml-1 inline" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PART C: FLAT COLOUR-BLOCK PRODUCT GRID (Loans = deep blue #0c2340) */}
      <section className="py-14 bg-white">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LOANS.map((loan, idx) => {
              const Icon = LOAN_ICONS[loan.slug] || Landmark;
              return (
                <Reveal key={loan.slug} treatment="B" staggerIndex={idx}>
                  <div
                    id={loan.slug}
                    className="relative rounded-2xl p-6 sm:p-7 text-white flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg min-h-[300px]"
                    style={{ backgroundColor: '#0c2340' }}
                  >
                    {/* Top Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                          Retail Loan
                        </span>
                        {loan.maxLtvPct && (
                          <span className="text-[11px] font-semibold text-blue-200/90">
                            Up to {loan.maxLtvPct}% LTV
                          </span>
                        )}
                      </div>

                      <h3 className="font-sans font-bold text-xl sm:text-2xl text-white tracking-tight">
                        {shortProductName(loan.name)}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-blue-100/75 leading-relaxed line-clamp-2">
                        {loan.tagline}
                      </p>

                      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-200/70 block">Interest from</span>
                          <span className="font-mono font-bold text-base text-white">
                            {loan.rateMin?.toFixed(2)}% p.a.
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-200/70 block">Max Amount</span>
                          <span className="font-mono font-semibold text-sm text-white">
                            {loan.maxAmount ? formatINRWhole(loan.maxAmount) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-200/70 block">Tenure</span>
                          <span className="font-medium text-white">
                            {tenureLabel(loan.tenureMinMonths, loan.tenureMaxMonths)}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-200/70 block">Processing Fee</span>
                          <span className="font-medium text-white truncate block">
                            {loan.processingFee?.pct ? `${loan.processingFee.pct}%` : 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: White Outline Pill + White Underlined Link */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
                      <button
                        onClick={() => handleApply(loan)}
                        className="px-5 py-2.5 rounded-full border border-white text-white font-bold text-xs hover:bg-white hover:text-[#0c2340] transition-colors cursor-pointer"
                      >
                        {user ? 'Apply Now' : 'Login to Apply'}
                      </button>
                      <Link
                        to={`/loans/${loan.slug}`}
                        className="text-xs font-semibold text-white/90 underline decoration-white/50 hover:text-white hover:decoration-white transition-colors"
                      >
                        View details →
                      </Link>
                    </div>

                    {/* Cropped line icon at bottom right */}
                    <div className="absolute -right-6 -bottom-6 text-white/10 pointer-events-none select-none">
                      <Icon className="w-36 h-36" strokeWidth={1.2} />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-12 text-xs text-neutral-500 max-w-3xl leading-relaxed">
            <p>
              All loans are subject to eligibility, document verification and credit assessment. On this demonstration
              platform, applications move through a staff review queue so you can watch each stage — nothing here is a real credit offer.
            </p>
            <p className="mt-2">{RATE_DISCLAIMER}</p>
          </div>
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

export { LoansPage };
