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
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeader
        titleAs="h1"
        eyebrow="Accounts"
        title="Accounts for every stage of life"
        description="Savings, current, salary, student and minor accounts — one illustrative rate and fee schedule, read straight from the product catalogue. Tick Compare on up to three accounts to see them side by side."
      />

      {/* Category Filter Chips (Module 52 D14) */}
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
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-midnight-950 text-white shadow-xs'
                  : 'bg-porcelain-100 text-ink-700 hover:bg-porcelain-200 hover:text-ink-950 border border-ink-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar with Result Count and Clear Control (Fix 7) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search accounts — try “student” or “salary”"
            aria-label="Search accounts"
            className="pl-9 pr-9"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { handleClearSearch(); setCategory("all"); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm font-medium text-ink-500">
          Showing <span className="font-semibold text-midnight-950">{filtered.length}</span> {filtered.length === 1 ? 'account' : 'accounts'}
        </p>
      </div>

      {/* Empty State when no accounts match (Fix 7) */}
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
        /* Balanced Grid (Fix 3: 6-column layout with 3 cards row 1, 2 cards row 2) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          {filtered.map((account, index) => {
            const Icon = ACCOUNT_ICONS[account.slug] || PiggyBank;
            const checked = compare.includes(account.slug);
            const spanClass = getCardGridSpan(index, filtered.length);

            return (
              <Reveal key={account.slug} treatment="B" staggerIndex={index} className={spanClass}>
                <Card
                id={account.slug}
                className="h-full flex flex-col p-6 scroll-mt-24 shadow-card transition-all duration-180 ease-out hover:-translate-y-0.5 hover:shadow-raised motion-reduce:hover:translate-y-0"
              >
                {/* Product Header: 48x48 Dark Tile (Fix 2) */}
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 shadow-xs">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-700 bg-gold-50/80 px-2.5 py-1 rounded-md border border-gold-200">
                    {account.accountType}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-midnight-950">
                  {shortProductName(account.name)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 line-clamp-2">
                  {account.tagline}
                </p>

                {/* Facts Table: 100% Derived from products.js (Fix 1) */}
                <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500">Interest</dt>
                    <dd className="text-right text-sm font-semibold text-midnight-950 tnum">
                      {account.rateSlabs?.length ? accountRateFact(account) : 'No interest'}
                    </dd>
                  </div>
                  {account.overdraftRate && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-500">Overdraft rate</dt>
                      <dd className="text-right text-sm font-semibold text-midnight-950 tnum">
                        {account.overdraftRate.toFixed(2)}% p.a. (on utilisation)
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500">Avg. monthly balance</dt>
                    <dd className="text-right font-semibold text-ink-900">
                      {accountAmbFact(account)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500">Non-maintenance charge</dt>
                    <dd className="text-right font-semibold text-ink-900">
                      {accountPenaltyFact(account)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500">Debit card annual fee</dt>
                    <dd className="text-right font-semibold text-ink-900">
                      {accountCardFeeFact(account)}
                    </dd>
                  </div>
                </dl>

                {/* Features List */}
                {Array.isArray(account.features) && account.features.length > 0 && (
                  <ul className="mt-4 space-y-1.5 flex-1">
                    {account.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex gap-2 text-[13px] leading-snug text-ink-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Bottom Pinned Controls: Checkbox & Aligned Buttons (Fix 3) */}
                <div className="mt-auto pt-5">
                  <div className="border-t border-ink-100 pt-3.5 mb-3">
                    <Checkbox
                      label={`Compare ${shortProductName(account.name)}`}
                      checked={checked}
                      onChange={() => toggleCompare(account.slug)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      ref={(el) => (detailsTriggerRefs.current[account.slug] = el)}
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleOpenDetail(account)}
                      aria-label={`View details for ${account.name}`}
                    >
                      View details
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => setSelectedProductForApply(account)}
                      aria-label={`Apply now for ${account.name}`}
                    >
                      Apply now
                    </Button>
                  </div>
                </div>
              </Card>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* Persistent / Responsive Comparison Tray (Fix 6) */}
      {compare.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-midnight-800 bg-midnight-950/95 text-porcelain-50 p-3 sm:p-4 shadow-2xl backdrop-blur flex flex-wrap items-center justify-between gap-3 animate-fade-in"
          role="region"
          aria-label="Comparison Tray"
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-porcelain-200 shrink-0">
              Comparing ({compare.length} of {MAX_COMPARE}):
            </span>
            {selected.map((acc) => (
              <span
                key={acc.slug}
                className="inline-flex items-center gap-1.5 rounded-lg bg-midnight-800 px-2.5 py-1 text-xs font-semibold text-porcelain-50 border border-porcelain-50/15"
              >
                <span>{shortProductName(acc.name)}</span>
                <button
                  type="button"
                  onClick={() => toggleCompare(acc.slug)}
                  className="rounded hover:bg-midnight-700 text-porcelain-300 hover:text-white p-0.5"
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
              className="text-xs font-medium text-porcelain-300 hover:text-white underline underline-offset-4 px-2 py-1"
            >
              Clear all
            </button>
            <Button
              variant="brass"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Side by Side Comparison</p>
              <h3 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-midnight-950">
                <Scale className="h-6 w-6 text-gold-600" aria-hidden /> Comparing {selected.length} accounts
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
              <div className="rounded-xl border border-gold-300 bg-gold-50 p-4 text-xs sm:text-sm text-ink-800">
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
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0 mt-2" />
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
