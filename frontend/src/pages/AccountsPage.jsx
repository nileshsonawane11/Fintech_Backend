import Reveal from '../components/Reveal.jsx';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Scale, Search, X } from 'lucide-react';
import { Button, Card, Checkbox, EmptyState, Input, Modal, SectionHeader, Table, useToast } from '../components/ui.jsx';
import {
  ACCOUNTS,
  RATE_DISCLAIMER,
  accountRateFact,
  accountAmbFact,
  accountPenaltyFact,
  accountCardFeeFact,
} from '../data/products.js';
import { ACCOUNT_ICONS } from '../data/productIcons.js';
import { formatINRWhole, shortProductName } from '../lib/format.js';
import { ApplyModal } from '../components/common/ApplyModal.jsx';

const MAX_COMPARE = 3;

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Accounts' },
  { id: 'savings', label: 'Savings' },
  { id: 'current', label: 'Current' },
  { id: 'salary', label: 'Salary' },
  { id: 'student', label: 'Student' },
  { id: 'minor', label: 'Minor' },
];

function moneyOrNil(value) {
  if (value === null || value === undefined) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function feeOf(account, key) {
  if (!account.fees || typeof account.fees !== 'object') return '—';
  const v = account.fees[key];
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? moneyOrNil(v) : String(v);
}

export default function AccountsPage() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const qParam = params.get('q') || '';
  const [inputValue, setInputValue] = useState(qParam);
  const [category, setCategory] = useState('all');
  const [compare, setCompare] = useState([]);
  const [selectedProductForApply, setSelectedProductForApply] = useState(null);
  const [detailAccount, setDetailAccount] = useState(null);
  const detailsTriggerRefs = useRef({});

  // Sync external search params (back/forward navigation)
  useEffect(() => {
    setInputValue(qParam);
  }, [qParam]);

  // Debounced URL sync only (count and grid filter synchronously without delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== qParam) {
        setParams(inputValue ? { q: inputValue } : {}, { replace: true });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, qParam, setParams]);

  // Auto-open ApplyModal if navigated with ?apply=1 or ?apply=<slug>, or detail modal if ?details=<slug>
  useEffect(() => {
    const applyParam = params.get('apply');
    if (applyParam) {
      if (applyParam === '1') {
        setSelectedProductForApply(ACCOUNTS[0]);
      } else {
        const match = ACCOUNTS.find((a) => a.slug === applyParam);
        if (match) setSelectedProductForApply(match);
      }
    }
    const detailsSlug = params.get('details');
    if (detailsSlug) {
      const match = ACCOUNTS.find((a) => a.slug === detailsSlug);
      if (match) setDetailAccount(match);
    }
  }, [params]);

  // Synchronous live filter: derives honest count and grid from ONE array in same render
  const filtered = useMemo(() => {
    const needle = inputValue.trim().toLowerCase();
    return ACCOUNTS.filter((a) => {
      if (category !== 'all') {
        const cat = (a.accountType || a.slug || '').toLowerCase();
        if (category === 'savings' && !cat.includes('savings')) return false;
        if (category === 'current' && !cat.includes('current')) return false;
        if (category === 'salary' && !cat.includes('salary')) return false;
        if (category === 'student' && !cat.includes('student')) return false;
        if (category === 'minor' && !cat.includes('minor')) return false;
      }
      if (!needle) return true;
      const haystack = [
        a.name,
        a.tagline,
        a.accountType,
        a.overview,
        ...(a.features || []),
        ...(a.eligibility || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [inputValue, category]);

  const selected = useMemo(() => ACCOUNTS.filter((a) => compare.includes(a.slug)), [compare]);

  const toggleCompare = (slug) => {
    setCompare((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE) {
        toast({
          tone: 'info',
          title: 'Compare up to three accounts',
          body: `You can compare up to ${MAX_COMPARE} accounts at a time. Remove one account from your comparison tray to select another.`,
        });
        return prev;
      }
      return [...prev, slug];
    });
  };

  const handleOpenDetail = (account) => {
    setDetailAccount(account);
  };

  const handleCloseDetail = () => {
    const slug = detailAccount?.slug;
    setDetailAccount(null);
    if (slug && detailsTriggerRefs.current[slug]) {
      setTimeout(() => {
        detailsTriggerRefs.current[slug]?.focus();
      }, 50);
    }
  };

  const handleClearSearch = () => {
    setInputValue('');
    setQ('');
    setParams({}, { replace: true });
  };

  // 6-column balanced grid span calculator (Fix 3)
  const getCardGridSpan = (index, totalCount) => {
    if (totalCount === 5) {
      // Row 1: 3 cards (2 cols each = 6); Row 2: 2 cards (3 cols each = 6). Zero dead slot!
      return index >= 3 ? 'lg:col-span-3 sm:col-span-1' : 'lg:col-span-2 sm:col-span-1';
    }
    if (totalCount === 4) {
      return 'lg:col-span-3 sm:col-span-1';
    }
    if (totalCount === 2) {
      return 'lg:col-span-3 sm:col-span-1';
    }
    if (totalCount === 1) {
      return 'lg:col-span-6 sm:col-span-2 max-w-xl mx-auto w-full';
    }
    return 'lg:col-span-2 sm:col-span-1';
  };

  // Side-by-side comparison matrix data (Fix 6)
  const compareRows = [
    {
      key: 'rate',
      label: 'Interest on balances',
      values: Object.fromEntries(
        selected.map((a) => [a.slug, a.rateSlabs?.length ? accountRateFact(a) : 'No interest'])
      ),
    },
    {
      key: 'overdraft',
      label: 'Overdraft line',
      values: Object.fromEntries(
        selected.map((a) => [
          a.slug,
          a.overdraftRate ? `${a.overdraftRate.toFixed(2)}% p.a. (on utilisation)` : 'Not offered',
        ])
      ),
    },
    {
      key: 'amb',
      label: 'Average monthly balance',
      values: Object.fromEntries(selected.map((a) => [a.slug, accountAmbFact(a)])),
    },
    {
      key: 'penalty',
      label: 'Non-maintenance charge',
      values: Object.fromEntries(selected.map((a) => [a.slug, accountPenaltyFact(a)])),
    },
    {
      key: 'cardFee',
      label: 'Debit card annual fee',
      values: Object.fromEntries(selected.map((a) => [a.slug, accountCardFeeFact(a)])),
    },
    {
      key: 'opening',
      label: 'Account opening fee',
      values: Object.fromEntries(selected.map((a) => [a.slug, feeOf(a, 'accountOpening')])),
    },
    {
      key: 'cheque',
      label: 'Cheque book',
      values: Object.fromEntries(
        selected.map((a) => [
          a.slug,
          feeOf(a, 'chequeBook25Leaves') !== '—'
            ? `${feeOf(a, 'chequeBook25Leaves')} (25 leaves)`
            : feeOf(a, 'chequeBook50Leaves') !== '—'
            ? `${feeOf(a, 'chequeBook50Leaves')} (50 leaves)`
            : '—',
        ]),
      ),
    },
    {
      key: 'features',
      label: 'Key features',
      values: Object.fromEntries(
        selected.map((a) => [
          a.slug,
          Array.isArray(a.features) ? a.features.slice(0, 2).join(' • ') : '—',
        ]),
      ),
    },
  ];

  const compareColumns = [
    { key: 'label', label: 'Feature / Tariff', className: 'sticky left-0 bg-white sm:bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]' },
    ...selected.map((a) => ({
      key: a.slug,
      label: shortProductName(a.name),
      render: (row) => row.values[a.slug] ?? '—',
    })),
  ];

  return (
    <div className="w-full bg-white text-neutral-900">
      {/* PART I: BLUSH MINI-HERO ON TOP WITH BREADCRUMB PILL */}
      <section className="bg-[#fdecec] py-10 sm:py-14 border-b border-red-100">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold text-neutral-700 border border-red-150 shadow-xs mb-4">
            <Link to="/" className="hover:text-[#981a1d] transition-colors">Home</Link>
            <span className="text-neutral-400">/</span>
            <span className="text-[#981a1d] font-bold">Accounts</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
            Accounts for every stage of life
          </h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-700 max-w-2xl">
            Savings, current, salary, student and minor accounts — one illustrative rate and fee schedule, read straight from the product catalogue. Tick Compare on up to three accounts to see them side by side.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter Chips as Pills */}
          <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Account Categories">
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = category === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setCategory(chip.id)}
                  className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#981a1d] text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar with Result Count and Clear Control */}
          <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search accounts — try “student” or “salary”"
                aria-label="Search accounts"
                className="w-full pl-10 pr-10 py-2.5 rounded-full border border-neutral-300 text-xs sm:text-sm text-neutral-900 focus:border-[#981a1d] focus:outline-hidden shadow-xs"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { handleClearSearch(); setCategory("all"); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs font-semibold text-neutral-500">
              Showing <span className="font-bold text-neutral-900">{filtered.length}</span> {filtered.length === 1 ? 'account' : 'accounts'}
            </p>
          </div>

          {/* Empty State when no accounts match */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title={`No accounts match “${inputValue}”`}
              body={`Nothing in the accounts catalogue matches your query. Try searching for “student”, “salary”, or “savings”, or reset the search to view all ${ACCOUNTS.length} accounts.`}
              action={
                <Button variant="secondary" onClick={handleClearSearch}>
                  Clear search
                </Button>
              }
            />
          ) : (
            /* PART C: FLAT COLOUR-BLOCK PRODUCT GRID (Accounts = primary red #981a1d) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((account, index) => {
                const Icon = ACCOUNT_ICONS[account.slug] || PiggyBank;
                const checked = compare.includes(account.slug);

                return (
                  <Reveal key={account.slug} treatment="B" staggerIndex={index}>
                    <div
                      id={account.slug}
                      className="relative rounded-2xl p-6 sm:p-7 text-white flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg min-h-[360px]"
                      style={{ backgroundColor: '#981a1d' }}
                    >
                      {/* Product Header */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 bg-white/15 px-2.5 py-0.5 rounded-full">
                            {account.accountType}
                          </span>
                          <span className="text-xs font-medium text-red-200/80">
                            Ref: {account.slug}
                          </span>
                        </div>

                        <h3 className="font-sans font-bold text-xl sm:text-2xl text-white tracking-tight">
                          {shortProductName(account.name)}
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-red-100/80 leading-relaxed line-clamp-2">
                          {account.tagline}
                        </p>

                        <div className="mt-5 pt-3 border-t border-white/15 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-red-200/70 block">Interest Rate</span>
                            <span className="font-mono font-bold text-sm text-white">
                              {account.rateSlabs?.length ? accountRateFact(account) : 'Zero interest'}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-200/70 block">Average Monthly Bal.</span>
                            <span className="font-mono font-semibold text-xs text-white">
                              {accountAmbFact(account)}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-200/70 block">Debit Card Fee</span>
                            <span className="font-medium text-white">
                              {accountCardFeeFact(account)}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-200/70 block">Non-Maintenance</span>
                            <span className="font-medium text-white">
                              {accountPenaltyFact(account)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions + Compare */}
                      <div className="mt-6 pt-4 border-t border-white/15 relative z-10 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => setSelectedProductForApply(account)}
                            className="px-5 py-2.5 rounded-full border border-white text-white font-bold text-xs hover:bg-white hover:text-[#981a1d] transition-colors cursor-pointer"
                          >
                            Open Account
                          </button>
                          <Link
                            to={`/accounts/${account.slug}`}
                            className="text-xs font-semibold text-white/90 underline decoration-white/50 hover:text-white hover:decoration-white transition-colors"
                          >
                            View details →
                          </Link>
                        </div>

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-red-200/90">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCompare(account.slug)}
                              className="rounded-sm accent-white h-3.5 w-3.5"
                            />
                            <span>Compare account</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(account)}
                            className="text-red-200 hover:text-white underline cursor-pointer text-xs"
                          >
                            Specs
                          </button>
                        </div>
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
          )}
        </div>
      </section>

      {/* Persistent / Responsive Comparison Tray (Fix 6) */}
      {compare.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-ink-200/80 bg-white/95 text-ink-900 p-3 sm:p-4 shadow-2xl backdrop-blur flex flex-wrap items-center justify-between gap-3 animate-fade-in"
          role="region"
          aria-label="Comparison Tray"
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-ink-600 shrink-0">
              Comparing ({compare.length} of {MAX_COMPARE}):
            </span>
            {selected.map((acc) => (
              <span
                key={acc.slug}
                className="inline-flex items-center gap-1.5 rounded-lg bg-porcelain-100 px-2.5 py-1 text-xs font-semibold text-ink-900 border border-ink-200"
              >
                <span>{shortProductName(acc.name)}</span>
                <button
                  type="button"
                  onClick={() => toggleCompare(acc.slug)}
                  className="rounded hover:bg-porcelain-200 text-ink-400 hover:text-ink-700 p-0.5"
                  aria-label={`Remove ${shortProductName(acc.name)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setCompare([])}
              className="text-xs font-medium text-ink-500 hover:text-ink-900 underline underline-offset-4 px-2 py-1"
            >
              Clear all
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const el = document.getElementById('compare-matrix');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={compare.length < 2}
              className="min-h-9 px-4 text-xs font-bold"
            >
              <Scale className="h-4 w-4" /> Compare side by side
            </Button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix (Fix 6) */}
      {selected.length >= 2 && (
        <section id="compare-matrix" aria-label="Account comparison" className="mt-14 scroll-mt-24 border-t border-ink-100 pt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-bank-primary">Side by Side Comparison</p>
              <h3 className="mt-1 flex items-center gap-2 font-sans text-2xl font-semibold text-midnight-950">
                <Scale className="h-6 w-6 text-bank-primary" aria-hidden /> Comparing {selected.length} accounts
              </h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCompare([])}>
              <X className="h-4 w-4" aria-hidden /> Clear comparison
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ink-100 shadow-sm bg-white">
            <Table
              columns={compareColumns}
              rows={compareRows}
              rowKey={(r) => r.key}
              minWidthClass="min-w-[620px]"
            />
          </div>

          {/* Direct Apply Actions in Comparison Table */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {selected.map((acc) => (
              <Button
                key={acc.slug}
                variant="primary"
                size="sm"
                onClick={() => setSelectedProductForApply(acc)}
              >
                Apply for {shortProductName(acc.name)} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>
        </section>
      )}

      <p className="mt-12 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>

      {/* View Details Modal with Slabs, Eligibility & Documents (Fix 4) */}
      {detailAccount && (
        <Modal
          open={Boolean(detailAccount)}
          onClose={handleCloseDetail}
          title={shortProductName(detailAccount.name)}
          wide
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="secondary" onClick={handleCloseDetail}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const target = detailAccount;
                  handleCloseDetail();
                  setSelectedProductForApply(target);
                }}
              >
                Apply for {shortProductName(detailAccount.name)} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          <div className="space-y-6 text-sm text-ink-800">
            {/* Overview */}
            <div>
              <p className="text-base text-ink-600 leading-relaxed">{detailAccount.overview}</p>
            </div>

            {/* Fact Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3">
                <p className="text-xs text-ink-500">Interest</p>
                <p className="text-sm font-semibold text-midnight-950 mt-1">
                  {detailAccount.rateSlabs?.length ? accountRateFact(detailAccount) : 'No interest'}
                </p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3">
                <p className="text-xs text-ink-500">Avg. monthly balance</p>
                <p className="text-sm font-semibold text-midnight-950 mt-1">{accountAmbFact(detailAccount)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3">
                <p className="text-xs text-ink-500">Non-Maintenance</p>
                <p className="text-sm font-semibold text-midnight-950 mt-1">{accountPenaltyFact(detailAccount)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3">
                <p className="text-xs text-ink-500">Debit Card Fee</p>
                <p className="text-sm font-semibold text-midnight-950 mt-1">{accountCardFeeFact(detailAccount)}</p>
              </div>
            </div>

            {/* Slab-wise Interest Table or Overdraft note */}
            {detailAccount.rateSlabs && detailAccount.rateSlabs.length > 0 ? (
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2">Slab-Wise Daily Balance Interest Rates</h4>
                <div className="rounded-xl border border-ink-100 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-porcelain-100 border-b border-ink-100 font-semibold text-ink-700">
                      <tr>
                        <th className="p-3">Daily Balance Slab</th>
                        <th className="p-3 text-right">Interest Rate (p.a.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {detailAccount.rateSlabs.map((s, idx) => (
                        <tr key={idx} className="hover:bg-porcelain-50">
                          <td className="p-3 text-ink-800">{s.label}</td>
                          <td className="p-3 text-right font-semibold text-midnight-950 tnum">{s.rate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-xs text-ink-500">Interest is computed on daily end-of-day balances and credited quarterly.</p>
              </div>
            ) : detailAccount.overdraftRate ? (
              <div className="rounded-xl border border-bank-primary-border bg-bank-primary-light p-4 text-xs sm:text-sm text-ink-800">
                <p className="font-semibold text-midnight-950">Overdraft Facility</p>
                <p className="mt-1">
                  Overdraft interest is charged at {detailAccount.overdraftRate.toFixed(2)}% p.a. on the utilized balance. Current accounts earn zero interest on credit balances per RBI norms.
                </p>
              </div>
            ) : null}

            {/* Eligibility & Documents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2.5">Eligibility Criteria</h4>
                <ul className="space-y-2">
                  {detailAccount.eligibility?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-ink-700">
                      <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-midnight-950 mb-2.5">Documents Required</h4>
                <ul className="space-y-2">
                  {detailAccount.documents?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-ink-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-bank-primary shrink-0 mt-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Complete Charges Schedule */}
            {Array.isArray(detailAccount.charges) && detailAccount.charges.length > 0 && (
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2">Service Charges &amp; Fees</h4>
                <div className="rounded-xl border border-ink-100 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-porcelain-100 border-b border-ink-100 font-semibold text-ink-700">
                      <tr>
                        <th className="p-3">Service / Event</th>
                        <th className="p-3 text-right">Fee / Tariff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {detailAccount.charges.map((c, idx) => (
                        <tr key={idx} className="hover:bg-porcelain-50">
                          <td className="p-3 text-ink-800">{c.service}</td>
                          <td className="p-3 text-right font-semibold text-midnight-950">{c.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Direct Apply Modal (Fix 5: guarantees clicked product is preselected and recorded) */}
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

export { AccountsPage };
