import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Calendar,
  CheckCircle2,
  FileText,
  PhoneCall,
  AlertTriangle,
} from 'lucide-react';
import { Card, SectionHeader, Modal, Button } from '../components/ui.jsx';
import Reveal from '../components/Reveal.jsx';
import { TiltCard } from '../components/TiltCard.jsx';
import { CardVisual } from '../components/common/CardVisual.jsx';
import { PhotoSlider } from '../components/common/PhotoSlider.jsx';
import { ApplyModal } from '../components/common/ApplyModal.jsx';
import { HeroEdgeGoldCard } from '../components/HeroEdgeGoldCard.jsx';
import { formatINRWhole, formatDate, shortProductName } from '../lib/format.js';
import {
  BRAND,
  RATE_DISCLAIMER,
  RATES_AT_A_GLANCE,
  getProductBySlug,
  getProductsByCategory,
} from '../data/products.js';
import { OFFERS, GENERAL_FAQS } from '../data/content.js';
import { ACCOUNT_ICONS, LOAN_ICONS, INVESTMENT_ICONS } from '../data/productIcons.js';

const CATEGORY_PATH = {
  account: '/accounts',
  loan: '/loans',
  card: '/cards',
  investment: '/investments',
};

function productPath(product) {
  const base = CATEGORY_PATH[product.category] || '/accounts';
  return `${base}/${product.slug}`;
}

function explorePath(product) {
  const base = CATEGORY_PATH[product.category] || '/accounts';
  return `${base}#${product.slug}`;
}

/** Headline figure for a product card — derived from product data without staff jargon. */
function headlineFor(product) {
  if (product.category === 'account') {
    if (product.rateSlabs && product.rateSlabs.length > 0) {
      const top = Math.max(...product.rateSlabs.map((s) => s.rate));
      return `Up to ${top.toFixed(2)}% p.a. interest`;
    }
    if (product.overdraftRate) return `Overdraft at ${product.overdraftRate.toFixed(2)}% p.a.`;
    return product.amb?.label || 'Zero balance';
  }
  if (product.category === 'loan') {
    if (product.rateMin != null && product.rateMax != null) {
      return product.rateMin === product.rateMax
        ? `${product.rateMin.toFixed(2)}% p.a.`
        : `From ${product.rateMin.toFixed(2)}% p.a.`;
    }
    return 'Fixed APR pricing';
  }
  if (product.category === 'card') {
    if (product.annualFee === 0) return 'No annual fee';
    if (product.annualFee != null) return `${formatINRWhole(product.annualFee)} annual fee`;
    return 'Lifetime free';
  }
  if (product.category === 'investment') {
    if (product.rateGrid) {
      const top = Math.max(...product.rateGrid.map((r) => r.general));
      return `Up to ${top.toFixed(2)}% p.a.`;
    }
    if (product.rateBands) {
      const top = Math.max(...product.rateBands.map((b) => b.rate));
      return `Up to ${top.toFixed(2)}% p.a.`;
    }
    if (product.rate != null) return `${product.rate.toFixed(2)}% p.a.`;
    if (product.minMonthly != null) return `Start with ${formatINRWhole(product.minMonthly)}/month`;
    return 'Market linked';
  }
  return '—';
}

const CATEGORY_TABS = [
  { key: 'account', label: 'Accounts', icon: Wallet, to: '/accounts' },
  { key: 'card', label: 'Cards', icon: CreditCard, to: '/cards' },
  { key: 'loan', label: 'Loans', icon: HandCoins, to: '/loans' },
  { key: 'investment', label: 'Investments', icon: TrendingUp, to: '/investments' },
];

/** Customer-facing trust cards for Why FinEdge (Fix 4). */
const TRUST_POINTS = [
  {
    icon: FileText,
    title: 'One published schedule',
    body: 'Every rate and fee comes from a single published schedule; product pages and the Schedule of Charges can never disagree.',
    linkText: 'Schedule of Charges',
    linkTo: '/schedule-of-charges',
  },
  {
    icon: ShieldCheck,
    title: 'Charges before you apply',
    body: 'The full fee table is published on every product page before any form. No surprise maintenance fees or unannounced processing deductions.',
    linkText: 'Explore our accounts',
    linkTo: '/accounts',
  },
  {
    icon: PhoneCall,
    title: 'A human when you need one',
    body: 'Direct phone support at 1800 267 4100 (Mon–Sat 9:00 AM–7:00 PM IST), along with a transparent multi-level Grievance Redressal framework.',
    linkText: 'Grievance Redressal',
    linkTo: '/grievance-redressal',
    extraLinkText: 'Call 1800 267 4100',
    extraHref: 'tel:18002674100',
  },
];

/** 5 Customer-facing FAQs kept on homepage per Fix 1 */
const HOMEPAGE_FAQ_QUESTIONS = [
  'Is FinEdge Bank a real bank?',
  'How do I open an account?',
  'What documents do I need for KYC?',
  'Is my data safe on this platform?',
  'How do I raise a complaint or a service request?',
];

function HomeHero({ savingsRow, homeLoanRow, edgeGoldDebit }) {
  const heroRef = useRef(null);
  const bgPhotoRef = useRef(null);
  const parallaxRafId = useRef(null);

  // Background photo scroll parallax (max 24px translate, passive listener, zero React state)
  // Fine pointer / desktop only (hover: hover and pointer: fine)
  useEffect(() => {
    const isTouch = typeof window !== 'undefined' && (window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches);
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || isReduced) return undefined;

    const onScroll = () => {
      if (parallaxRafId.current || !bgPhotoRef.current) return;
      parallaxRafId.current = requestAnimationFrame(() => {
        parallaxRafId.current = null;
        if (!bgPhotoRef.current) return;
        const scrollY = window.scrollY || 0;
        const transY = Math.min(24, Math.max(0, scrollY * 0.08));
        bgPhotoRef.current.style.transform = `translate3d(0, ${transY.toFixed(1)}px, 0)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (parallaxRafId.current) cancelAnimationFrame(parallaxRafId.current);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      data-testid="hero-section"
      className="relative overflow-hidden bg-midnight-950 text-porcelain-50 pt-0 pb-16 sm:pb-20 lg:min-h-[680px] lg:py-28 flex flex-col justify-center"
      aria-label="Welcome to FinEdge Bank"
    >
      {/* 1. Mobile Contained Photo Band (<= 1023px) */}
      <div className="relative w-full aspect-[1920/1281] lg:hidden overflow-hidden bg-midnight-950 hero-bg-enter">
        <picture className="w-full h-full block">
          <source
            type="image/webp"
            srcSet="/images/hero-bg-768.webp 768w, /images/hero-bg-1280.webp 1280w, /images/hero-bg-1920.webp 1920w, /images/hero-bg-2560.webp 2560w, /images/hero-bg-3840.webp 3840w"
            sizes="100vw"
          />
          <img
            src="/images/hero-bg-1920.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width="1920"
            height="1281"
            className="w-full h-full object-contain object-top block"
            style={{
              filter: 'saturate(0.6) contrast(1.05)',
            }}
          />
        </picture>
        {/* Bottom gradient on the band dissolving into the midnight content zone */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 sm:h-28 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(5,15,29,1) 0%, rgba(5,15,29,0.7) 40%, transparent 100%)',
          }}
        />
      </div>

      {/* 2. Desktop Full-background landscape photograph with responsive WebP + scroll parallax (>= 1024px) */}
      <div
        ref={bgPhotoRef}
        className="hidden lg:block absolute -top-6 -bottom-6 inset-x-0 pointer-events-none overflow-hidden"
        style={{
          transform: 'none',
          willChange: 'transform',
        }}
      >
        <picture className="h-full w-full block">
          <source
            type="image/webp"
            srcSet="/images/hero-bg-768.webp 768w, /images/hero-bg-1280.webp 1280w, /images/hero-bg-1920.webp 1920w, /images/hero-bg-2560.webp 2560w, /images/hero-bg-3840.webp 3840w"
            sizes="100vw"
          />
          <img
            src="/images/hero-bg-1920.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width="1920"
            height="1281"
            className="h-full w-full object-cover object-[right_center] hero-bg-enter"
            style={{
              filter: 'saturate(0.6) contrast(1.05)',
            }}
          />
        </picture>
      </div>

      {/* Desktop Readability Overlays */}
      {/* Desktop Left-to-Right Midnight Wash */}
      <div
        className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,15,29,0.96) 0%, rgba(5,15,29,0.88) 45%, rgba(5,15,29,0.45) 70%, rgba(5,15,29,0.22) 100%)',
        }}
      />
      {/* Desktop Bottom Grounding Gradient */}
      <div
        className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{
          background:
            'linear-gradient(to top, rgba(5,15,29,0.65) 0%, rgba(5,15,29,0.55) 15%, transparent 35%)',
        }}
      />
      {/* Desktop Subtle Top Radial Gold Wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(184,147,63,0.08),transparent)] pointer-events-none hidden lg:block" />

      {/* 3. Foreground Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full pt-4 sm:pt-6 lg:pt-0">
        <div className="relative">
          {/* Left Zone: Copy, CTAs & Stats (never overlapped by card) */}
          <div
            data-testid="hero-left-zone"
            className="max-w-xl lg:max-w-[48%] xl:max-w-[50%]"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-midnight-900/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-300 backdrop-blur-sm">
              <Landmark className="h-3.5 w-3.5 text-gold-400" />
              <span>Banking with a finer edge</span>
            </div>

            <h1 className="hero-enter-headline mt-4 font-display text-4xl font-semibold leading-tight text-porcelain-50 sm:text-5xl">
              Banking that grows with you — accounts, cards, loans and investments in one place.
            </h1>

            <p className="hero-enter-subtext mt-5 text-base leading-relaxed text-porcelain-200/90 sm:text-lg">
              Open an account in minutes, borrow with the rate shown before you apply, and grow your savings with
              deposits and investments whose charges are stated up front. {BRAND.name} is a demonstration platform —
              every workflow works end to end, with simulations labelled honestly.
            </p>

            {/* CTAs: Porcelain primary button on midnight band */}
            <div className="hero-enter-cta mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                to="/accounts"
                className="inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-[color,background-color,border-color,transform] duration-150 ease-out active:translate-y-px min-h-11 px-5 text-sm bg-porcelain-50 text-midnight-950 border border-transparent shadow-sm hover:bg-porcelain-200"
              >
                Open an account <ArrowRight className="h-4 w-4 text-midnight-900" aria-hidden />
              </Link>
              <Link
                to="/calculators"
                className="text-sm font-medium text-porcelain-50 underline decoration-porcelain-50/50 underline-offset-4 transition-colors hover:decoration-porcelain-50"
              >
                Try the calculators
              </Link>
            </div>

            {/* Stats Row: Derived from single rates source */}
            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-porcelain-50/10 pt-6 sm:grid-cols-3">
              <div className="hero-stat-e" style={{ '--stat-delay': '550ms' }}>
                <p className="text-xs text-porcelain-300">Savings account</p>
                <p className="font-display text-lg font-semibold text-gold-300 sm:text-xl">
                  {savingsRow?.display || 'Up to 6.75% p.a.'}
                </p>
                <p className="mt-1 text-[13px] text-porcelain-300">Interest credited quarterly</p>
              </div>
              <div className="hero-stat-e" style={{ '--stat-delay': '620ms' }}>
                <p className="text-xs text-porcelain-300">Home loan (from)</p>
                <p className="font-display text-lg font-semibold text-gold-300 sm:text-xl">
                  {homeLoanRow?.display || 'From 8.35% p.a.'}
                </p>
              </div>
              <div className="hero-stat-e col-span-2 sm:col-span-1" style={{ '--stat-delay': '690ms' }}>
                <p className="text-xs text-porcelain-300">{shortProductName(edgeGoldDebit?.name || 'Edge Gold Debit')}</p>
                <p className="font-display text-lg font-semibold text-gold-300 sm:text-xl">
                  {edgeGoldDebit ? `${formatINRWhole(edgeGoldDebit.annualFee)}/yr` : '₹599/yr'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Zone: 3D Flagship Card */}
          {/* On mobile: normal flow below stats. On desktop: absolute lower-right foreground. */}
          <div
            data-testid="hero-right-zone"
            className="mt-10 lg:mt-0 mx-auto lg:mx-0 w-full max-w-[380px] sm:max-w-[420px] lg:max-w-none lg:w-[clamp(380px,34vw,500px)] lg:absolute lg:right-4 xl:right-8 lg:bottom-6 xl:bottom-8 z-20"
          >
            <div className="hero-card-entrance">
              <div className="relative">
                {/* Radial gold glow behind card */}
                <div className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(184,147,63,0.22),transparent_70%)] pointer-events-none -z-10" />

                {/* Shared 3D TiltCard with locked hero settings */}
                <TiltCard
                  maxTilt={12}
                  perspective={1000}
                  lerpFactor={0.12}
                  enableFloat={true}
                  glare={true}
                  shadow={true}
                  shadowBaseY={25}
                  shadowFactor={2.2}
                  shadowBlur={45}
                  restingShadow="0 20px 45px -10px rgba(10, 30, 53, 0.45)"
                  borderRadius="18px"
                  sweepKey="hero-edge-gold-card"
                  data-testid="hero-card-tilt"
                  className="w-full"
                >
                  <HeroEdgeGoldCard />
                </TiltCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [activeTab, setActiveTab] = useState('account');
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const dirTabsRef = useRef(null);
  const [dirIndicator, setDirIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!dirTabsRef.current) return;
    const btn = dirTabsRef.current.querySelector(`[data-tab-key="${activeTab}"]`);
    if (btn) {
      setDirIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, opacity: 1 });
    }
  }, [activeTab]);
  const [expandedRates, setExpandedRates] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [detailModalAccount, setDetailModalAccount] = useState(null);
  const [applyModalProduct, setApplyModalProduct] = useState(null);

  // Single rates source from data files
  const savingsRow = RATES_AT_A_GLANCE.find((r) => r.productSlug === 'everyday-savings');
  const homeLoanRow = RATES_AT_A_GLANCE.find((r) => r.productSlug === 'home-loan');
  const edgeGoldDebit = getProductBySlug('edge-gold-debit');

  // Rates split into two clean categories (Fix 5: Savings & Deposits | Borrowing)
  const depositRates = RATES_AT_A_GLANCE.filter(
    (r) =>
      r.label.toLowerCase().includes('savings') ||
      r.label.toLowerCase().includes('deposit') ||
      r.label.toLowerCase().includes('sukanya')
  );
  const borrowingRates = RATES_AT_A_GLANCE.filter((r) => r.label.toLowerCase().includes('loan'));

  const visibleDepositRates = expandedRates ? depositRates : depositRates.slice(0, 2);
  const visibleBorrowingRates = expandedRates ? borrowingRates : borrowingRates.slice(0, 2);

  // Offers: 6 -> 3 by nearest validity date (Fix 1)
  const sortedOffers = [...OFFERS].sort((a, b) => new Date(a.validTill) - new Date(b.validTill));
  const visibleOffers = expandedOffers ? sortedOffers : sortedOffers.slice(0, 3);

  // 5 FAQs for the homepage
  const homepageFaqs = GENERAL_FAQS.filter((f) => HOMEPAGE_FAQ_QUESTIONS.includes(f.q));

  // Products for active category tab (one row of 3)
  const activeProducts = getProductsByCategory(activeTab);
  const featuredProducts = activeProducts.slice(0, 3);
  const currentTabMeta = CATEGORY_TABS.find((t) => t.key === activeTab) || CATEGORY_TABS[0];

  const handleTabChange = (key) => {
    if (key === activeTab) return;
    setTabTransitioning(true);
    setTimeout(() => {
      setActiveTab(key);
      setTabTransitioning(false);
    }, 160);
  };

  return (
    <div>
      {/* ====================================================================== */}
      {/* (a) HERO SECTION (Full-background banner with Option A layout & 3D card) */}
      {/* ====================================================================== */}
      <HomeHero
        savingsRow={savingsRow}
        homeLoanRow={homeLoanRow}
        edgeGoldDebit={edgeGoldDebit}
      />

      {/* ====================================================================== */}
      {/* (b) PRODUCT DIRECTORY (White background - Fix 1 & 2) */}
      {/* ====================================================================== */}
      <section id="discovery" className="py-20 sm:py-24 bg-white border-b border-ink-100" aria-label="Explore products">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header — Treatment A */}
          <Reveal treatment="A">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div>
                <p className="reveal-eyebrow-line text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">Product Directory</p>
                <h2 className="reveal-title mt-1 font-display text-2xl sm:text-3xl font-semibold text-midnight-950">
                  Engineered for every milestone
                </h2>
                <p className="reveal-description mt-1.5 text-sm text-ink-600 max-w-xl">
                  Choose a category to preview popular solutions with transparent rates, upfront fee schedules, and direct application pathways.
                </p>
              </div>

              {/* Fix 3: Category Tabs with animated sliding gold underline */}
              <div ref={dirTabsRef} className="relative flex items-center border-b border-ink-200 overflow-x-auto scrollbar-none" role="tablist">
                {CATEGORY_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      data-tab-key={tab.key}
                      id={`home-dir-tab-${tab.key}`}
                      role="tab"
                      type="button"
                      aria-selected={isActive}
                      aria-controls={`home-dir-panel-${tab.key}`}
                      onClick={() => handleTabChange(tab.key)}
                      className={`relative pb-3 pt-2 px-4 text-sm font-semibold transition-colors duration-150 flex items-center gap-2 shrink-0 ${
                        isActive ? 'text-midnight-950 font-bold' : 'text-ink-600 hover:text-midnight-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-gold-600' : 'text-ink-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
                <span
                  className="pointer-events-none absolute bottom-0 h-0.5 bg-gold-500 rounded-full transition-all duration-240 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{
                    transform: `translateX(${dirIndicator.left}px)`,
                    width: `${dirIndicator.width}px`,
                    opacity: dirIndicator.opacity,
                    boxShadow: '0 1px 3px rgba(184, 147, 63, 0.4)',
                  }}
                  aria-hidden
                />
              </div>
            </div>
          </Reveal>

            {/* Curated 3 Cards for Active Category (Fix 2: Shared directory card component) */}
            <div
              id={`home-dir-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`home-dir-tab-${activeTab}`}
              className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-160 ${
                tabTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {featuredProducts.map((product, idx) => {
                const isCardTab = activeTab === 'card';
                const isAccountTab = activeTab === 'account';
                const isLoanTab = activeTab === 'loan';
                const isInvestmentTab = activeTab === 'investment';

                const ProductIcon =
                  (isAccountTab && ACCOUNT_ICONS[product.slug]) ||
                  (isLoanTab && LOAN_ICONS[product.slug]) ||
                  (isInvestmentTab && INVESTMENT_ICONS[product.slug]) ||
                  Wallet;

                return (
                  <Reveal key={idx} treatment="B" staggerIndex={idx}>
                    <div className="group flex h-full flex-col rounded-xl border border-ink-100 bg-white p-6 shadow-xs transition-all duration-180 hover:-translate-y-0.5 hover:shadow-card hover:border-midnight-300 active:translate-y-0 active:scale-[0.99] active:shadow-xs">
                      {/* Visual slot per tab (Fix 1: Aspect-ratio box reserving art's true rendered height) */}
                      {isCardTab ? (
                        <div className="w-full mb-4">
                          <TiltCard maxTilt={6} glare={true} shadow={true} sweepKey={product.slug}>
                            <CardVisual card={product} shadow={false} />
                          </TiltCard>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 shadow-xs transition-colors group-hover:bg-midnight-800">
                              <ProductIcon className="h-5 w-5 transition-colors group-hover:text-gold-300" />
                            </div>
                            <span className="rounded-full bg-midnight-50 px-2.5 py-0.5 text-xs font-semibold text-midnight-900">
                              {product.category.toUpperCase()}
                            </span>
                          </div>

                          {/* Investments chip (Guaranteed vs Market-linked) */}
                          {isInvestmentTab && product.riskClass && (
                            product.riskClass === 'guaranteed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                                <ShieldCheck className="h-3.5 w-3.5" /> Guaranteed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold">
                                <AlertTriangle className="h-3.5 w-3.5" /> Market-linked
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <h3 className="text-base font-semibold text-midnight-950">
                        {shortProductName(product.name)}
                      </h3>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-600">
                        {product.tagline}
                      </p>

                      {/* Metric box (Fix 0: Label removed entirely, fact speaks) */}
                      <div className="mt-4 rounded-lg bg-porcelain-50 p-3 border border-ink-100">
                        <p className="font-display text-sm font-semibold text-midnight-950">{headlineFor(product)}</p>
                      </div>

                      {/* Truthful actions (Fix 2) */}
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink-100 pt-3.5">
                        {isAccountTab ? (
                          <button
                            type="button"
                            onClick={() => setDetailModalAccount(product)}
                            className="text-xs font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600 transition-colors"
                          >
                            View details
                          </button>
                        ) : (
                          <Link
                            to={productPath(product)}
                            className="text-xs font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600 transition-colors"
                          >
                            View details
                          </Link>
                        )}
                        <Link
                          to={explorePath(product)}
                          className="group/btn inline-flex items-center gap-1 rounded-lg bg-midnight-900 px-3 py-1.5 text-xs font-semibold text-porcelain-50 transition-colors hover:bg-midnight-800 active:scale-[0.98]"
                        >
                          Explore <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover/btn:translate-x-0.5 group-active/btn:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            {/* Category Expansion Footer */}
            <div className="mt-10 text-center">
              <Link
                to={currentTabMeta.to}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-porcelain-50 px-5 py-2.5 text-sm font-semibold text-midnight-900 shadow-xs transition-colors hover:bg-porcelain-100 hover:border-midnight-400"
              >
                View all {currentTabMeta.label} ({activeProducts.length} products) <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

      {/* ====================================================================== */}
      {/* (c) RATES AT A GLANCE (Porcelain background - Fix 1 & Fix 5) */}
      {/* ====================================================================== */}
      <section className="bg-porcelain-50 py-20 sm:py-24 border-b border-ink-100" aria-label="Rates at a glance">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header — Treatment A */}
            <Reveal treatment="A">
              <div className="mb-8">
                <p className="reveal-eyebrow-line text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">Interest Rates</p>
                <h2 className="reveal-title mt-1 font-display text-2xl sm:text-3xl font-semibold text-midnight-950">
                  Rates at a glance
                </h2>
                <p className="reveal-description mt-1.5 text-sm text-ink-600">
                  Single published rates updated daily across deposit tiers and lending product schedules.
                </p>
              </div>
            </Reveal>

            {/* Fix 5: Full container width on desktop as two group columns */}
            {/* Treatment C: rate rows cascade in with top-border scaleX */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Column 1: Savings & Deposits */}
              <Reveal treatment="C" as="div" className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-xs">
                <div className="border-b border-ink-100 bg-porcelain-100/60 px-5 py-3">
                  <h3 className="text-sm font-semibold text-midnight-900">
                    Savings &amp; Deposits
                  </h3>
                </div>
                <ul className="divide-y divide-ink-100">
                  {visibleDepositRates.map((row, idx) => (
                    <li key={`${row.label}-${row.productSlug}`} className="reveal-row" style={{'--stagger-index': idx}}>
                      <Link
                        to={productPath(getProductBySlug(row.productSlug) || { category: 'investment', slug: row.productSlug })}
                        className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-midnight-50/50"
                      >
                        <span className="text-sm font-medium text-ink-800 group-hover:text-midnight-900">{row.label}</span>
                        <span className="tnum shrink-0 text-sm font-semibold text-midnight-950 group-hover:text-gold-600">{row.display}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* Column 2: Borrowing (Fix 4: starts 150ms after first column) */}
              <Reveal treatment="C" as="div" style={{ '--column-delay': '150ms' }} className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-xs">
                <div className="border-b border-ink-100 bg-porcelain-100/60 px-5 py-3">
                  <h3 className="text-sm font-semibold text-midnight-900">
                    Borrowing
                  </h3>
                </div>
                <ul className="divide-y divide-ink-100">
                  {visibleBorrowingRates.map((row, idx) => (
                    <li key={`${row.label}-${row.productSlug}`} className="reveal-row" style={{'--stagger-index': idx}}>
                      <Link
                        to={productPath(getProductBySlug(row.productSlug) || { category: 'loan', slug: row.productSlug })}
                        className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-midnight-50/50"
                      >
                        <span className="text-sm font-medium text-ink-800 group-hover:text-midnight-900">{row.label}</span>
                        <span className="tnum shrink-0 text-sm font-semibold text-midnight-950 group-hover:text-gold-600">{row.display}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            {/* Expander toggle (Fix 0: "View all rates", zero jargon; Fix 4: fades in last) */}
            <Reveal treatment="B" style={{ transitionDelay: '800ms' }} className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setExpandedRates((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-1 px-3 rounded-md hover:bg-porcelain-200"
              >
                {expandedRates ? (
                  <>
                    <span>Show fewer rates</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>View all rates</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </Reveal>

            <p className="mt-4 text-xs leading-relaxed text-ink-500">{RATE_DISCLAIMER}</p>
          </div>
        </section>

      {/* ====================================================================== */}
      {/* (d) CURRENT OFFERS (White background - Fix 1) */}
      {/* ====================================================================== */}
      <section className="bg-white py-20 sm:py-24 border-b border-ink-100" aria-label="Current seasonal offers">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header — Treatment A */}
            <Reveal treatment="A">
              <div className="mb-10">
                <p className="reveal-eyebrow-line text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">Special Privileges</p>
                <h2 className="reveal-title mt-1 font-display text-2xl sm:text-3xl font-semibold text-midnight-950">Current seasonal offers</h2>
                <p className="reveal-description mt-1.5 text-sm text-ink-600 max-w-2xl">Promotions running on FinEdge products right now. Validity periods and eligibility terms are stated clearly on each offer.</p>
              </div>
            </Reveal>
            {/* Fix 1: 3 offers visible by default, expander reveals the remaining 3 */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleOffers.map((offer, idx) => {
                const product = getProductBySlug(offer.productSlug);
                return (
                  <Reveal key={offer.id} treatment="B" staggerIndex={idx}>
                    <Card className="flex h-full flex-col p-5 shadow-xs transition-all duration-180 hover:-translate-y-0.5 hover:shadow-card">
                      <div className="reveal-icon-tile flex items-center justify-between gap-2">
                        <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                          Active Promotion
                        </span>
                        <div className="flex items-center gap-1 text-xs text-ink-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Till {formatDate(offer.validTill)}</span>
                        </div>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold leading-snug text-midnight-950">{offer.title}</h3>
                      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-600">{offer.summary}</p>

                      <div className="mt-3 rounded-lg bg-porcelain-50 px-3 py-2 border border-ink-100">
                        <p className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Privilege</p>
                        <p className="text-xs font-semibold text-midnight-900">{offer.highlight}</p>
                      </div>

                      {product && (
                        <Link
                          to={productPath(product)}
                          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600 transition-colors"
                        >
                          View {shortProductName(product.name)} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      )}
                    </Card>
                  </Reveal>
                );
              })}
            </div>

            {/* Fix 1: View all offers expander */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setExpandedOffers((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-midnight-800 hover:text-midnight-600 transition-colors py-1.5 px-4 rounded-md border border-ink-200 hover:bg-porcelain-100"
              >
                {expandedOffers ? (
                  <>
                    <span>Show fewer offers</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>View all offers ({OFFERS.length})</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

      {/* ====================================================================== */}
      {/* (e) WHY FINEDGE (Porcelain background - Fix 4) */}
      {/* ====================================================================== */}
      <section className="bg-porcelain-50 py-20 sm:py-24 border-b border-ink-100" aria-label="Why FinEdge">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header — Treatment A */}
            <Reveal treatment="A">
              <div className="mb-10">
                <p className="reveal-eyebrow-line text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">Why FinEdge</p>
                <h2 className="reveal-title mt-1 font-display text-2xl sm:text-3xl font-semibold text-midnight-950">Banking built on clear terms and upfront truth</h2>
                <p className="reveal-description mt-1.5 text-sm text-ink-600 max-w-2xl">No hidden schedules, no fine-print traps — just transparent banking where every fee and rate is verified before you sign.</p>
              </div>
            </Reveal>

            {/* Two-part layout (Module 33 Placement A): Visual Half (PhotoSlider) + Trust Points Half */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Visual Half (PhotoSlider) — Stacks above trust points on mobile, left column on desktop */}
              <div className="lg:col-span-7">
                <Reveal treatment="D">
                  <PhotoSlider />
                </Reveal>
              </div>

              {/* Trust Points Half — Preserves all 3 customer-facing cards and facts verbatim */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {TRUST_POINTS.map((point, idx) => {
                  const Icon = point.icon;
                  return (
                    <Reveal key={point.title} treatment="B" staggerIndex={idx}>
                      <Card className="flex flex-col p-5 sm:p-6 shadow-xs border-ink-200 bg-white transition-all duration-180 hover:-translate-y-0.5 hover:shadow-card">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 shadow-xs">
                            <Icon className="h-5 w-5 text-gold-300" aria-hidden />
                          </div>
                          <h3 className="text-base font-semibold text-midnight-950">{point.title}</h3>
                        </div>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-600">{point.body}</p>

                        <div className="mt-4 pt-3 border-t border-ink-100 flex items-center gap-3 text-xs font-semibold">
                          <Link
                            to={point.linkTo}
                            className="inline-flex items-center gap-1 text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600"
                          >
                            {point.linkText} <ArrowRight className="h-3 w-3" />
                          </Link>
                          {point.extraHref && (
                            <a
                              href={point.extraHref}
                              className="text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600"
                            >
                              {point.extraLinkText}
                            </a>
                          )}
                        </div>
                      </Card>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      {/* ====================================================================== */}
      {/* (f) FREQUENTLY ASKED QUESTIONS (White background - Fix 1 & Fix 5) */}
      {/* ====================================================================== */}
      <section id="faq" className="bg-white py-20 sm:py-24 border-b border-ink-100" aria-label="Frequently asked questions">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header — Treatment A */}
            <Reveal treatment="A">
              <div className="mb-10">
                <p className="reveal-eyebrow-line text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">Help &amp; Answers</p>
                <h2 className="reveal-title mt-1 font-display text-2xl sm:text-3xl font-semibold text-midnight-950">Frequently asked questions</h2>
                <p className="reveal-description mt-1.5 text-sm text-ink-600 max-w-2xl">The essential questions every new customer asks. Product-specific terms are detailed on each dedicated product page.</p>
              </div>
            </Reveal>
            {/* Fix 1: 5 Questions, Fix 5: One open at a time */}
            {/* FAQ rows — Treatment C divider cascade */}
            <Reveal treatment="C" as="div" className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-xs divide-y divide-ink-100">
              {homepageFaqs.map((faq, i) => {
                const open = openFaq === i;
                const panelId = `home-faq-panel-${i}`;
                const buttonId = `home-faq-button-${i}`;
                return (
                  <div key={faq.q} className="reveal-row" style={{'--stagger-index': i}}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(open ? -1 : i)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-100/70"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-midnight-700 transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                          }`}
                          aria-hidden
                        />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="accordion-grid-wrapper"
                      data-open={open}
                    >
                      <div className="accordion-grid-inner">
                        <div className="px-6 pb-5 pt-1">
                          <p className="text-sm leading-relaxed text-ink-600">{faq.a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Reveal>

            <p className="mt-6 text-[13px] text-ink-500">
              Still have questions? Visit the{' '}
              <Link to="/portal/login" className="font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600">
                Customer Portal
              </Link>{' '}
              or review our{' '}
              <Link to="/grievance-redressal" className="font-semibold text-midnight-800 underline decoration-midnight-300 hover:text-midnight-600">
                Grievance Redressal
              </Link>{' '}
              procedure.
            </p>
          </div>
        </section>

      {/* ====================================================================== */}
      {/* (g) CALL TO ACTION STRIP & RELOCATED DEMO DISCLOSURE (Midnight - Fix 0 & Fix 4) */}
      {/* ====================================================================== */}
      <Reveal treatment="B" as="div">
        <section className="bg-midnight-950 py-16 relative overflow-hidden" aria-label="Open an account">
          {/* Fix 4: Band top gold hairline border draws across full width 900ms */}
          <div className="reveal-cta-line absolute top-0 inset-x-0" aria-hidden="true" />

          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-xl reveal-cta-heading">
              <h2 className="font-display text-2xl font-semibold text-porcelain-50 sm:text-3xl">Start banking with FinEdge today</h2>
              <p className="mt-2 text-sm leading-relaxed text-porcelain-200/85">
                Create your account, complete simulated KYC, and track every application from one unified dashboard.
              </p>
            </div>
            {/* Fix 0: Porcelain button on midnight background (NO gold button fill; Fix 4: fades in last) */}
            <div className="reveal-cta-btn">
              <Link
                to="/portal/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-porcelain-50 px-6 py-3 text-sm font-semibold text-midnight-950 transition-colors hover:bg-porcelain-200 shadow-sm"
              >
                Create your account <ArrowRight className="h-4 w-4 text-midnight-900" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Fix 4: Relocated slim demonstration disclosure line under closing CTA (fades in with band) */}
        <div className="bg-midnight-950 border-t border-porcelain-50/10 py-3.5 px-4 text-center reveal-cta-smallprint">
          <p className="text-xs leading-relaxed text-porcelain-300/80">
            FinEdge Bank is a demonstration platform — balances and journeys are simulated and labelled as such.
          </p>
        </div>
      </Reveal>

      {/* ====================================================================== */}
      {/* TRUTHFUL DETAIL MODAL FOR ACCOUNTS (Fix 2) */}
      {/* ====================================================================== */}
      {detailModalAccount && (
        <Modal
          open={Boolean(detailModalAccount)}
          onClose={() => setDetailModalAccount(null)}
          title={shortProductName(detailModalAccount.name)}
          wide
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => setDetailModalAccount(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const target = detailModalAccount;
                  setDetailModalAccount(null);
                  setApplyModalProduct(target);
                }}
              >
                Apply for this account <ArrowRight className="h-4 w-4 ml-1 inline" />
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gold-600">{detailModalAccount.tagline}</p>
              <p className="mt-1 text-sm text-ink-700 leading-relaxed">{detailModalAccount.overview}</p>
            </div>

            {/* Interest slabs */}
            {Array.isArray(detailModalAccount.rateSlabs) && detailModalAccount.rateSlabs.length > 0 && (
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2 text-[13px]">Interest Rate Slabs</h4>
                <div className="rounded-xl border border-ink-100 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-porcelain-100 border-b border-ink-100 font-semibold text-ink-700">
                      <tr>
                        <th className="p-3">Daily Balance Slab</th>
                        <th className="p-3 text-right">Interest Rate (% p.a.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {detailModalAccount.rateSlabs.map((s, idx) => (
                        <tr key={idx} className="hover:bg-porcelain-50">
                          <td className="p-3 text-ink-800">{s.label}</td>
                          <td className="p-3 text-right font-semibold text-midnight-950 font-mono">{s.rate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Eligibility */}
            {Array.isArray(detailModalAccount.eligibility) && detailModalAccount.eligibility.length > 0 && (
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2 text-[13px]">Eligibility Criteria</h4>
                <ul className="space-y-2">
                  {detailModalAccount.eligibility.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-ink-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Charges */}
            {Array.isArray(detailModalAccount.charges) && detailModalAccount.charges.length > 0 && (
              <div>
                <h4 className="font-semibold text-midnight-950 mb-2 text-[13px]">Schedule of Charges</h4>
                <div className="rounded-xl border border-ink-100 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-porcelain-100 border-b border-ink-100 font-semibold text-ink-700">
                      <tr>
                        <th className="p-3">Service</th>
                        <th className="p-3 text-right">Charge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {detailModalAccount.charges.map((c, idx) => (
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

      {/* Apply Modal */}
      {applyModalProduct && (
        <ApplyModal
          open={Boolean(applyModalProduct)}
          product={applyModalProduct}
          onClose={() => setApplyModalProduct(null)}
        />
      )}
    </div>
  );
}

export { HomePage };
