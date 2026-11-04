import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Landmark, ScrollText, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../components/ui.jsx';
import { FD, INVESTMENTS, RD, RATE_DISCLAIMER, SIP, SSY } from '../data/products.js';
import { INVESTMENT_ICONS } from '../data/productIcons.js';
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

function Actions({ slug, onApply, product }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-5">
      <Link to={`/investments/${slug}`} className="flex-1">
        <Button variant="secondary" className="w-full">
          View details <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Link>
      <Button
        variant="primary"
        className="flex-1"
        onClick={() => onApply(product)}
      >
        Apply now
      </Button>
    </div>
  );
}

export default function InvestmentsPage() {
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);
  const [selectedCategoryForApply, setSelectedCategoryForApply] = useState(undefined);
  const fdTop = topOf(fd.rateGrid, 'general');
  const fdTopSenior = topOf(fd.rateGrid, 'senior');
  const rdTop = topOf(rd.rateBands, 'rate');

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader
        titleAs="h1"
        eyebrow="Investments & deposits"
        title="Grow money two honest ways"
        description="Guaranteed deposits, where the rate is fixed in a contract before you invest — and market-linked investing, where returns are never guaranteed and the risk warning sits next to every figure. They are kept in separate sections on purpose."
      />

      {/* ---------------- Guaranteed deposits ---------------- */}
      <section aria-labelledby="guaranteed-heading">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 id="guaranteed-heading" className="font-display text-2xl font-semibold text-midnight-950">
              Guaranteed deposits
            </h3>
            <p className="text-sm text-ink-600">Fixed Deposit and Recurring Deposit — the rate is locked when you book.</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-midnight-200 bg-midnight-50 px-4 py-3 text-sm leading-relaxed text-midnight-900">
          <strong className="font-semibold">Deposit insurance (DICGC):</strong> deposits with scheduled banks in India
          are insured by the DICGC up to ₹5,00,000 per depositor per bank, and these products are modelled on those
          norms. On this demonstration platform all deposits are simulated records, not real money.
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card id={fd.slug} className="flex flex-col scroll-mt-24 p-6 shadow-none transition-shadow hover:shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
                {React.createElement(INVESTMENT_ICONS[fd.slug] || ScrollText, { className: 'h-5 w-5', 'aria-hidden': true })}
              </span>
              <Badge tone="success">Guaranteed</Badge>
            </div>
            <h4 className="mt-4 font-display text-xl font-semibold text-midnight-950">{shortProductName(fd.name)}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{fd.tagline}</p>
            <p className="mt-4 font-display text-2xl font-semibold text-midnight-800">
              {fdTop !== null ? `Up to ${fdTop.toFixed(2)}` : '—'}
              <span className="ml-1 text-sm font-medium text-ink-500">% p.a.</span>
            </p>
            <p className="text-xs text-ink-500">
              {fdTopSenior !== null ? `Senior citizens up to ${fdTopSenior.toFixed(2)}% p.a. (+${(fd.seniorDelta ?? 0).toFixed(2)}%)` : '—'}
              {' · '}Minimum {fd.minAmount ? formatINRWhole(fd.minAmount) : '—'}
              {fd.compoundingNote && <> · {fd.compoundingNote}</>}
            </p>
            {Array.isArray(fd.rateGrid) && (
              <div className="mt-4 overflow-hidden rounded-lg border border-ink-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-porcelain-100/70 text-xs uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2 font-semibold">Tenure</th>
                      <th className="px-3 py-2 text-right font-semibold">General</th>
                      <th className="px-3 py-2 text-right font-semibold">Senior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fd.rateGrid.slice(0, 4).map((row) => (
                      <tr key={row.tenure} className="border-t border-ink-50">
                        <td className="px-3 py-2 text-ink-700">{row.tenure}</td>
                        <td className="px-3 py-2 text-right font-semibold text-ink-900">{row.general.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right font-semibold text-ink-900">{row.senior.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-ink-500">First four tenure bands shown — the detail page carries the full grid.</p>
            {fd.prematureNote && <p className="mt-1 text-xs text-ink-500">{fd.prematureNote}</p>}
            <Actions
              slug={fd.slug}
              product={fd}
              onApply={(p) => setSelectedProductForApply(p)}
            />
          </Card>

          <Card id={rd.slug} className="flex flex-col scroll-mt-24 p-6 shadow-none transition-shadow hover:shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <Badge tone="success">Guaranteed</Badge>
            </div>
            <h4 className="mt-4 font-display text-xl font-semibold text-midnight-950">{shortProductName(rd.name)}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{rd.tagline}</p>
            <p className="mt-4 font-display text-2xl font-semibold text-midnight-800">
              {rdTop !== null ? `Up to ${rdTop.toFixed(2)}` : '—'}
              <span className="ml-1 text-sm font-medium text-ink-500">% p.a.</span>
            </p>
            <p className="text-xs text-ink-500">
              Start with {rd.minMonthly ? formatINRWhole(rd.minMonthly) : '—'} per month, in multiples of{' '}
              {rd.monthlyStep ? formatINRWhole(rd.monthlyStep) : '—'}{rd.compoundingNote && <> · {rd.compoundingNote}</>}
            </p>
            {Array.isArray(rd.rateBands) && (
              <div className="mt-4 overflow-hidden rounded-lg border border-ink-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-porcelain-100/70 text-xs uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2 font-semibold">Tenure</th>
                      <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rd.rateBands.map((band) => (
                      <tr key={band.tenure} className="border-t border-ink-50">
                        <td className="px-3 py-2 text-ink-700">{band.tenure}</td>
                        <td className="px-3 py-2 text-right font-semibold text-ink-900">{band.rate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rd.missedInstalmentNote && <p className="mt-2 text-xs text-ink-500">{rd.missedInstalmentNote}</p>}
            <Actions
              slug={rd.slug}
              product={rd}
              onApply={(p) => setSelectedProductForApply(p)}
            />
          </Card>
        </div>
      </section>

      {/* ---------------- Government scheme ---------------- */}
      <section aria-labelledby="ssy-heading" className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
            <Sprout className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 id="ssy-heading" className="font-display text-2xl font-semibold text-midnight-950">
              Government-backed scheme
            </h3>
            <p className="text-sm text-ink-600">Offered through the bank channel; the scheme and its rate belong to the Government of India.</p>
          </div>
        </div>

        <Card id={ssy.slug} className="mt-6 flex flex-col scroll-mt-24 p-6 shadow-none transition-shadow hover:shadow-card lg:flex-row lg:gap-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Government of India scheme</Badge>
              <span className="text-sm font-medium text-ink-900 tnum">Guaranteed by scheme rules</span>
            </div>
            <h4 className="mt-3 font-display text-xl font-semibold text-midnight-950">{shortProductName(ssy.name)}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{ssy.tagline}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">{ssy.overview}</p>
            {ssy.rateNote && <p className="mt-3 text-[13px] leading-snug text-ink-500">{ssy.rateNote}</p>}
          </div>
          <div className="mt-5 flex flex-col shrink-0 lg:mt-0 lg:w-64">
            <p className="font-display text-2xl font-semibold text-midnight-800">
              {typeof ssy.rate === 'number' ? ssy.rate.toFixed(2) : '—'}
              <span className="ml-1 text-sm font-medium text-ink-500">% p.a.</span>
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Yearly deposit</dt>
                <dd className="text-right font-semibold text-ink-900">
                  {formatINRWhole(ssy.minDepositYearly)} – {formatINRWhole(ssy.maxDepositYearly)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Deposit period</dt>
                <dd className="font-semibold text-ink-900">{ssy.depositYears ? `${ssy.depositYears} years` : '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Maturity</dt>
                <dd className="font-semibold text-ink-900">{ssy.tenureYears ? `${ssy.tenureYears} years` : '—'}</dd>
              </div>
            </dl>
            <Actions
              slug={ssy.slug}
              product={ssy}
              onApply={(p) => setSelectedProductForApply(p)}
            />
          </div>
        </Card>
      </section>

      {/* ---------------- Market-linked ---------------- */}
      <section aria-labelledby="sip-heading" className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning-600">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 id="sip-heading" className="font-display text-2xl font-semibold text-midnight-950">
              Market-linked investing
            </h3>
            <p className="text-sm text-ink-600">Returns depend on the market. There is no fixed rate and no guarantee — read the risk note.</p>
          </div>
        </div>

        <Card id={sip.slug} className="mt-6 flex flex-col scroll-mt-24 border-warning-600/30 p-6 shadow-none transition-shadow hover:shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Market-linked — returns not guaranteed</Badge>
            <span className="text-sm font-medium text-ink-900 tnum">Not a bank deposit</span>
          </div>
          <h4 className="mt-3 font-display text-xl font-semibold text-midnight-950">{shortProductName(sip.name)}</h4>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600">{sip.tagline}</p>

          {sip.disclosure && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3 text-sm leading-relaxed text-warning-600" role="note">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{sip.disclosure}</span>
            </div>
          )}

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline gap-3">
              <dt className="shrink-0 text-ink-500">Minimum monthly investment</dt>
              <dd className="font-semibold text-ink-900">{sip.minMonthly ? formatINRWhole(sip.minMonthly) : '—'}</dd>
            </div>
          </dl>

          {Array.isArray(sip.fundCategories) && sip.fundCategories.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-ink-100 bg-porcelain-50/50 divide-y divide-ink-100">
              {sip.fundCategories.map((fund) => (
                <button
                  type="button"
                  key={fund.name}
                  onClick={() => {
                    setSelectedCategoryForApply(fund.name);
                    setSelectedProductForApply(sip);
                  }}
                  className="w-full text-left flex flex-col gap-1 p-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 hover:bg-gold-50/40 transition-colors group cursor-pointer"
                  title={`Start SIP in ${fund.name}`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-ink-900 group-hover:text-midnight-950 underline decoration-dotted decoration-ink-300 group-hover:decoration-gold-500 underline-offset-4">{fund.name}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-warning-700">
                      Risk: {fund.riskLevel || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:text-right">
                    <p className="text-[13px] leading-snug text-ink-600">{fund.note}</p>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-400 group-hover:text-gold-600 transition-colors shrink-0 hidden sm:block" />
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Any SIP calculator illustration on this site uses a growth rate you choose yourself — it is a hypothetical
            example, not a promise, projection or guarantee of returns.
          </p>

          <Actions
            slug={sip.slug}
            product={sip}
            onApply={(p) => {
              setSelectedCategoryForApply(undefined);
              setSelectedProductForApply(p);
            }}
          />
        </Card>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>

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
