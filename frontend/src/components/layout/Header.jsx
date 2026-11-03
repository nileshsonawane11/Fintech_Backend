import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Landmark,
  Menu,
  X,
  ArrowRight,
  Wallet,
  Receipt,
  GraduationCap,
  Sprout,
  PiggyBank,
  Repeat,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Home,
  Briefcase,
  Car,
  Coins,
  Building2,
  LifeBuoy,
  FileText,
  Scale,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui.jsx';
import { AccessibilityBar } from './AccessibilityBar';
import {
  CARDS,
  ACCOUNTS,
  LOANS,
  CREDIT_CARDS,
  DEBIT_CARDS,
  INVESTMENTS,
  SAVINGS_TOP_RATE,
  accountRateFact,
} from '../../data/products.js';
import { ACCOUNT_ICONS } from '../../data/productIcons.js';
import { shortProductName } from '../../lib/format.js';
import { CardVisual } from '../common/CardVisual.jsx';

/* ---------------- Card Mini SVG Thumbnails (shared CardVisual) ---------------- */

function MiniCardThumb({ card, slug }) {
  const target = card || CARDS.find((c) => c.slug === slug);
  if (!target) return null;
  return <CardVisual card={target} className="w-full h-full shadow-none" />;
}

/* ---------------- Dynamic Product Mapping ---------------- */

const LOAN_ICONS = {
  'home-loan': Home,
  'business-loan': Briefcase,
  'agriculture-loan': Sprout,
  'vehicle-loan': Car,
  'gold-loan': Coins,
  'loan-against-property': Building2,
  'education-loan': GraduationCap,
};

function getAccountFact(acc) {
  return accountRateFact(acc);
}

function getCardFact(card) {
  if (card.annualFee === 0) return 'No annual fee';
  if (card.annualFee != null) return `₹${card.annualFee}/yr`;
  return 'Nil';
}

function getInvestmentMeta(inv) {
  if (inv.kind === 'FD') {
    const top = Math.max(...(inv.rateGrid?.map((r) => r.general) || [6.95]));
    return { fact: `Up to ${top.toFixed(2)}% p.a.`, type: 'Guaranteed', icon: PiggyBank };
  }
  if (inv.kind === 'RD') {
    const top = Math.max(...(inv.rateBands?.map((b) => b.rate) || [7.00]));
    return { fact: `Up to ${top.toFixed(2)}% p.a.`, type: 'Guaranteed', icon: Repeat };
  }
  if (inv.kind === 'SIP') {
    return { fact: 'Market-linked', type: 'Market-linked', icon: TrendingUp };
  }
  if (inv.kind === 'SSY') {
    return { fact: `${inv.rate?.toFixed(2) || '8.20'}% p.a.`, type: 'Guaranteed', icon: ShieldCheck };
  }
  return { fact: '—', type: 'Guaranteed', icon: PiggyBank };
}

const SUPPORT_ITEMS = [
  {
    name: 'Customer Support & Grievances',
    description: 'Statutory redressal officer & dispute escalations',
    to: '/grievance-redressal',
    icon: LifeBuoy,
    fact: '24x7 Queue',
  },
  {
    name: 'Schedule of Charges',
    description: 'Honest tariff schedule across all accounts and loans',
    to: '/schedule-of-charges',
    icon: FileText,
    fact: 'Transparent',
  },
  {
    name: 'Fair Practice Code',
    description: 'Lending commitments & grievance resolution charter',
    to: '/fair-practice-code',
    icon: Scale,
    fact: 'Statutory',
  },
  {
    name: 'Regulatory Disclosures',
    description: 'Capital adequacy ratios, Basel III & liquidity records',
    to: '/disclosures',
    icon: ShieldCheck,
    fact: 'RBI Norms',
  },
  {
    name: 'Privacy Policy & Terms',
    description: 'Digital data protection and cookie management',
    to: '/privacy-policy',
    icon: Lock,
    fact: 'Encrypted',
  },
];

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="FinEdge Bank — home">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-900 text-gold-300 shadow-sm">
        <Landmark className="h-5 w-5" aria-hidden />
      </span>
      <span className={`font-display text-lg font-semibold leading-tight tracking-tight ${light ? 'text-porcelain-50' : 'text-midnight-950'}`}>
        FinEdge Bank
      </span>
    </Link>
  );
}

export const Header = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(null);
  const location = useLocation();
  const { user } = useAuth();
  const navRef = useRef(null);
  const triggerRefs = useRef({});
  const hoverTimerRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 120ms hover intent delay
  const handleMouseEnter = (menuKey) => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpenMenu(menuKey);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 120);
  };

  const handleTriggerClick = (menuKey) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const closeMenu = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpenMenu(null);
    setMobileOpen(false);
  };

  // Keyboard accessibility: Escape closes open menu and returns focus
  const handleKeyDown = (e, menuKey) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      if (triggerRefs.current[menuKey]) {
        triggerRefs.current[menuKey].focus();
      }
    }
  };

  const isCurrentActive = (path) => location.pathname === path;

  return (
    <>
      <AccessibilityBar />
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-porcelain-50/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />

          {/* Desktop Navigation with Data-Driven Mega Menus */}
          <nav
            ref={navRef}
            className="ml-6 hidden items-center gap-1 lg:flex"
            aria-label="Products and Services"
          >
            {/* 1. ACCOUNTS MEGA MENU */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('Accounts')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'Accounts')}
            >
              <button
                ref={(el) => (triggerRefs.current['Accounts'] = el)}
                type="button"
                aria-expanded={openMenu === 'Accounts'}
                aria-haspopup="true"
                onClick={() => handleTriggerClick('Accounts')}
                className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isCurrentActive('/accounts')
                    ? 'text-midnight-950 font-semibold'
                    : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`}
              >
                <span>Accounts</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-160 ${
                    openMenu === 'Accounts' ? 'rotate-180 text-gold-600' : ''
                  }`}
                  aria-hidden
                />
                {isCurrentActive('/accounts') && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold-400 rounded-full" />
                )}
              </button>

              {openMenu === 'Accounts' && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-[620px] min-w-[620px] rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal z-50 overflow-hidden p-5 animate-fade-in"
                  role="region"
                  aria-label="Accounts Menu"
                >
                  <div className="grid gap-1">
                    {ACCOUNTS.map((acc) => {
                      const Icon = ACCOUNT_ICONS[acc.slug] || Wallet;
                      const fact = getAccountFact(acc);
                      return (
                        <Link
                          key={acc.slug}
                          to={`/accounts#${acc.slug}`}
                          onClick={closeMenu}
                          className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 transition-colors duration-150 group-hover:bg-midnight-800 group-hover:text-gold-300">
                              <Icon className="h-6 w-6" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                {shortProductName(acc.name)}
                              </p>
                              <p className="truncate text-sm text-ink-500">{acc.tagline}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span className="tnum text-[15px] font-semibold text-ink-900 group-hover:text-midnight-950">
                              {fact}
                            </span>
                            <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 -mx-5 -mb-5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <Link
                      to="/accounts"
                      onClick={closeMenu}
                      className="font-medium text-ink-700 hover:text-midnight-900 transition-colors"
                    >
                      View all accounts →
                    </Link>
                    <Link
                      to="/accounts?apply=1"
                      onClick={closeMenu}
                      className="font-semibold text-midnight-900 hover:text-midnight-700 transition-colors"
                    >
                      Open an account
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 2. CARDS MEGA MENU */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('Cards')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'Cards')}
            >
              <button
                ref={(el) => (triggerRefs.current['Cards'] = el)}
                type="button"
                aria-expanded={openMenu === 'Cards'}
                aria-haspopup="true"
                onClick={() => handleTriggerClick('Cards')}
                className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isCurrentActive('/cards')
                    ? 'text-midnight-950 font-semibold'
                    : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`}
              >
                <span>Cards</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-160 ${
                    openMenu === 'Cards' ? 'rotate-180 text-gold-600' : ''
                  }`}
                  aria-hidden
                />
                {isCurrentActive('/cards') && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold-400 rounded-full" />
                )}
              </button>

              {openMenu === 'Cards' && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-[620px] min-w-[620px] rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal z-50 overflow-hidden p-5 animate-fade-in"
                  role="region"
                  aria-label="Cards Menu"
                >
                  <div className="space-y-3">
                    {/* CREDIT CARDS GROUP */}
                    <div>
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                        Credit Cards
                      </p>
                      <div className="grid gap-1">
                        {CREDIT_CARDS.map((card) => (
                          <Link
                            key={card.slug}
                            to={`/cards#${card.slug}`}
                            onClick={closeMenu}
                            className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 p-1.5 overflow-hidden transition-colors duration-150 group-hover:bg-midnight-800">
                                <MiniCardThumb slug={card.slug} />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                  {shortProductName(card.name)}
                                </p>
                                <p className="truncate text-sm text-ink-500">{card.tagline}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <span className="tnum text-[15px] font-semibold text-ink-900 group-hover:text-midnight-950">
                                {getCardFact(card)}
                              </span>
                              <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-ink-100" />

                    {/* DEBIT CARDS GROUP */}
                    <div>
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                        Debit Cards
                      </p>
                      <div className="grid gap-1">
                        {DEBIT_CARDS.map((card) => (
                          <Link
                            key={card.slug}
                            to={`/cards#${card.slug}`}
                            onClick={closeMenu}
                            className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 p-1.5 overflow-hidden transition-colors duration-150 group-hover:bg-midnight-800">
                                <MiniCardThumb slug={card.slug} />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                  {shortProductName(card.name)}
                                </p>
                                <p className="truncate text-sm text-ink-500">{card.tagline}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <span className="tnum text-[15px] font-semibold text-ink-900 group-hover:text-midnight-950">
                                {getCardFact(card)}
                              </span>
                              <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 -mx-5 -mb-5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <Link
                      to="/cards"
                      onClick={closeMenu}
                      className="font-medium text-ink-700 hover:text-midnight-900 transition-colors"
                    >
                      View all cards →
                    </Link>
                    <Link
                      to="/cards#compare"
                      onClick={closeMenu}
                      className="font-semibold text-midnight-900 hover:text-midnight-700 transition-colors"
                    >
                      Compare cards
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 3. LOANS MEGA MENU (ALL 7 PRODUCTS) */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('Loans')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'Loans')}
            >
              <button
                ref={(el) => (triggerRefs.current['Loans'] = el)}
                type="button"
                aria-expanded={openMenu === 'Loans'}
                aria-haspopup="true"
                onClick={() => handleTriggerClick('Loans')}
                className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isCurrentActive('/loans')
                    ? 'text-midnight-950 font-semibold'
                    : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`}
              >
                <span>Loans</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-160 ${
                    openMenu === 'Loans' ? 'rotate-180 text-gold-600' : ''
                  }`}
                  aria-hidden
                />
                {isCurrentActive('/loans') && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold-400 rounded-full" />
                )}
              </button>

              {openMenu === 'Loans' && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-[620px] min-w-[620px] rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal z-50 overflow-hidden p-5 animate-fade-in"
                  role="region"
                  aria-label="Loans Menu"
                >
                  <div className="grid gap-1">
                    {LOANS.map((loan) => {
                      const Icon = LOAN_ICONS[loan.slug] || Home;
                      return (
                        <Link
                          key={loan.slug}
                          to={`/loans#${loan.slug}`}
                          onClick={closeMenu}
                          className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 transition-colors duration-150 group-hover:bg-midnight-800 group-hover:text-gold-300">
                              <Icon className="h-6 w-6" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                {shortProductName(loan.name)}
                              </p>
                              <p className="truncate text-sm text-ink-500">{loan.tagline}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span className="tnum text-[15px] font-semibold text-ink-900 group-hover:text-midnight-950">
                              From {loan.rateMin.toFixed(2)}% p.a.
                            </span>
                            <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 -mx-5 -mb-5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <Link
                      to="/loans"
                      onClick={closeMenu}
                      className="font-medium text-ink-700 hover:text-midnight-900 transition-colors"
                    >
                      View all 7 loans →
                    </Link>
                    <Link
                      to="/calculators"
                      onClick={closeMenu}
                      className="font-semibold text-midnight-900 hover:text-midnight-700 transition-colors"
                    >
                      EMI calculator
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. INVESTMENTS MEGA MENU */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('Investments')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'Investments')}
            >
              <button
                ref={(el) => (triggerRefs.current['Investments'] = el)}
                type="button"
                aria-expanded={openMenu === 'Investments'}
                aria-haspopup="true"
                onClick={() => handleTriggerClick('Investments')}
                className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isCurrentActive('/investments')
                    ? 'text-midnight-950 font-semibold'
                    : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`}
              >
                <span>Investments</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-160 ${
                    openMenu === 'Investments' ? 'rotate-180 text-gold-600' : ''
                  }`}
                  aria-hidden
                />
                {isCurrentActive('/investments') && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold-400 rounded-full" />
                )}
              </button>

              {openMenu === 'Investments' && (
                <div
                  className="absolute -left-16 top-full mt-1.5 w-[620px] min-w-[620px] rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal z-50 overflow-hidden p-5 animate-fade-in"
                  role="region"
                  aria-label="Investments Menu"
                >
                  <div className="grid gap-1">
                    {INVESTMENTS.map((inv) => {
                      const { fact, type, icon: Icon } = getInvestmentMeta(inv);
                      const isGuaranteed = type === 'Guaranteed';
                      return (
                        <Link
                          key={inv.slug}
                          to={`/investments#${inv.slug}`}
                          onClick={closeMenu}
                          className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 transition-colors duration-150 group-hover:bg-midnight-800 group-hover:text-gold-300">
                              <Icon className="h-6 w-6" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                  {shortProductName(inv.name)}
                                </p>
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                                    isGuaranteed
                                      ? 'bg-midnight-900 text-porcelain-50'
                                      : 'border border-gold-500 text-gold-700 bg-gold-50/60'
                                  }`}
                                >
                                  {type}
                                </span>
                              </div>
                              <p className="truncate text-sm text-ink-500">
                                {inv.kind === 'SIP' ? 'Market-linked mutual funds • Risks apply' : inv.tagline}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span className="tnum text-[15px] font-semibold text-ink-900 group-hover:text-midnight-950">
                              {fact}
                            </span>
                            <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 -mx-5 -mb-5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <Link
                      to="/investments"
                      onClick={closeMenu}
                      className="font-medium text-ink-700 hover:text-midnight-900 transition-colors"
                    >
                      View all investments →
                    </Link>
                    <Link
                      to="/grievance-redressal"
                      onClick={closeMenu}
                      className="font-semibold text-midnight-900 hover:text-midnight-700 transition-colors"
                    >
                      Talk to us
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 5. CALCULATORS DIRECT LINK */}
            <NavLink
              to="/calculators"
              className={({ isActive }) =>
                `relative rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isActive ? 'text-midnight-950 font-semibold' : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`
              }
            >
              Calculators
              {isCurrentActive('/calculators') && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold-400 rounded-full" />
              )}
            </NavLink>

            {/* 6. SUPPORT MEGA MENU (400px, shifted right so it never clips) */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('Support')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'Support')}
            >
              <button
                ref={(el) => (triggerRefs.current['Support'] = el)}
                type="button"
                aria-expanded={openMenu === 'Support'}
                aria-haspopup="true"
                onClick={() => handleTriggerClick('Support')}
                className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  openMenu === 'Support' ? 'text-midnight-950 font-semibold' : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
                }`}
              >
                <span>Support</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-160 ${
                    openMenu === 'Support' ? 'rotate-180 text-gold-600' : ''
                  }`}
                  aria-hidden
                />
              </button>

              {openMenu === 'Support' && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-[400px] min-w-[400px] rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal z-50 overflow-hidden p-5 animate-fade-in"
                  role="region"
                  aria-label="Support and Compliance Menu"
                >
                  <div className="grid gap-1">
                    {SUPPORT_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.to}
                          onClick={closeMenu}
                          className="group cursor-pointer flex min-h-[64px] items-center justify-between rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-porcelain-200 focus-visible:outline-2 focus-visible:outline-gold-500"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 transition-colors duration-150 group-hover:bg-midnight-800 group-hover:text-gold-300">
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950">
                                {item.name}
                              </p>
                              <p className="truncate text-sm text-ink-500">{item.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 transition-colors ml-2 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 -mx-5 -mb-5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <div>
                      <p className="text-xs text-ink-500">Toll-Free Helpline</p>
                      <a href="tel:18002674100" className="font-bold text-midnight-950 hover:text-gold-600 transition-colors">
                        1800 267 4100
                      </a>
                    </div>
                    <span className="text-xs text-ink-400">Mon–Sat, 9AM–7PM</span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Right Side Header Actions: Primary Login + Secondary Staff Console */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <Button
                  as={Link}
                  to="/portal"
                  variant="primary"
                  size="md"
                  className="shadow-sm"
                >
                  My Dashboard
                </Button>
              ) : (
                <Button
                  as={Link}
                  to="/portal/login"
                  variant="primary"
                  size="md"
                  className="shadow-sm"
                >
                  Login
                </Button>
              )}
              <Link
                to="/manager/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-midnight-800 transition-colors hover:bg-midnight-50/70 hover:text-midnight-950"
              >
                Staff Console
              </Link>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="rounded-lg p-2 text-ink-700 transition-colors hover:text-midnight-900 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Sheet */}
        {mobileOpen && (
          <nav
            className="animate-fade-in border-t border-ink-100 bg-porcelain-50 px-4 py-4 lg:hidden space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto"
            aria-label="Mobile Navigation"
          >
            {/* Mobile Header: Primary Login Button at top, Staff Console secondary row below */}
            <div className="pb-3 border-b border-ink-100 space-y-2">
              {user ? (
                <Button
                  as={Link}
                  to="/portal"
                  onClick={closeMenu}
                  variant="primary"
                  size="md"
                  className="w-full justify-center shadow-sm"
                >
                  My Dashboard
                </Button>
              ) : (
                <Button
                  as={Link}
                  to="/portal/login"
                  onClick={closeMenu}
                  variant="primary"
                  size="md"
                  className="w-full justify-center shadow-sm"
                >
                  Login
                </Button>
              )}
              <Link
                to="/manager/login"
                onClick={closeMenu}
                className="flex w-full items-center justify-center rounded-lg py-2 px-3 text-sm font-medium text-midnight-800 hover:bg-midnight-50/70 transition-colors"
              >
                Staff Console
              </Link>
            </div>

            {/* Accounts Accordion */}
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setMobileAccordion(mobileAccordion === 'Accounts' ? null : 'Accounts')}
                className="flex w-full items-center justify-between p-3.5 text-sm font-semibold text-midnight-950"
              >
                <span>Accounts</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === 'Accounts' ? 'rotate-180' : ''}`} />
              </button>
              {mobileAccordion === 'Accounts' && (
                <div className="border-t border-ink-100 divide-y divide-ink-50 p-2 bg-porcelain-50/50 space-y-1">
                  {ACCOUNTS.map((acc) => {
                    const Icon = ACCOUNT_ICONS[acc.slug] || Wallet;
                    return (
                      <Link
                        key={acc.slug}
                        to={`/accounts#${acc.slug}`}
                        onClick={closeMenu}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
                            <Icon className="h-6 w-6" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-ink-900 truncate">{shortProductName(acc.name)}</p>
                            <p className="text-xs text-ink-500 truncate">{acc.tagline}</p>
                          </div>
                        </div>
                        <span className="tnum font-semibold text-xs text-ink-900 shrink-0 ml-2">{getAccountFact(acc)}</span>
                      </Link>
                    );
                  })}
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs">
                    <Link to="/accounts" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all accounts →</Link>
                    <Link to="/accounts?apply=1" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Open an account</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Cards Accordion */}
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setMobileAccordion(mobileAccordion === 'Cards' ? null : 'Cards')}
                className="flex w-full items-center justify-between p-3.5 text-sm font-semibold text-midnight-950"
              >
                <span>Cards</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === 'Cards' ? 'rotate-180' : ''}`} />
              </button>
              {mobileAccordion === 'Cards' && (
                <div className="border-t border-ink-100 divide-y divide-ink-50 p-2 bg-porcelain-50/50 space-y-1">
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-[0.14em] px-2 pt-1">Credit Cards</p>
                  {CREDIT_CARDS.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/cards#${c.slug}`}
                      onClick={closeMenu}
                      className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 p-1.5 overflow-hidden">
                          <MiniCardThumb slug={c.slug} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-ink-900 truncate">{shortProductName(c.name)}</p>
                          <p className="text-xs text-ink-500 truncate">{c.tagline}</p>
                        </div>
                      </div>
                      <span className="tnum font-semibold text-xs text-ink-900 shrink-0 ml-2">{getCardFact(c)}</span>
                    </Link>
                  ))}
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-[0.14em] px-2 pt-2">Debit Cards</p>
                  {DEBIT_CARDS.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/cards#${c.slug}`}
                      onClick={closeMenu}
                      className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 p-1.5 overflow-hidden">
                          <MiniCardThumb slug={c.slug} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-ink-900 truncate">{shortProductName(c.name)}</p>
                          <p className="text-xs text-ink-500 truncate">{c.tagline}</p>
                        </div>
                      </div>
                      <span className="tnum font-semibold text-xs text-ink-900 shrink-0 ml-2">{getCardFact(c)}</span>
                    </Link>
                  ))}
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs">
                    <Link to="/cards" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all cards →</Link>
                    <Link to="/cards#compare" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Compare cards</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Loans Accordion (ALL 7) */}
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setMobileAccordion(mobileAccordion === 'Loans' ? null : 'Loans')}
                className="flex w-full items-center justify-between p-3.5 text-sm font-semibold text-midnight-950"
              >
                <span>Loans</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === 'Loans' ? 'rotate-180' : ''}`} />
              </button>
              {mobileAccordion === 'Loans' && (
                <div className="border-t border-ink-100 divide-y divide-ink-50 p-2 bg-porcelain-50/50 space-y-1">
                  {LOANS.map((l) => {
                    const Icon = LOAN_ICONS[l.slug] || Home;
                    return (
                      <Link
                        key={l.slug}
                        to={`/loans#${l.slug}`}
                        onClick={closeMenu}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
                            <Icon className="h-6 w-6" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-ink-900 truncate">{shortProductName(l.name)}</p>
                            <p className="text-xs text-ink-500 truncate">{l.tagline}</p>
                          </div>
                        </div>
                        <span className="tnum font-semibold text-xs text-ink-900 shrink-0 ml-2">From {l.rateMin.toFixed(2)}%</span>
                      </Link>
                    );
                  })}
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs">
                    <Link to="/loans" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all 7 loans →</Link>
                    <Link to="/calculators" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">EMI calculator</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Investments Accordion */}
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setMobileAccordion(mobileAccordion === 'Investments' ? null : 'Investments')}
                className="flex w-full items-center justify-between p-3.5 text-sm font-semibold text-midnight-950"
              >
                <span>Investments</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === 'Investments' ? 'rotate-180' : ''}`} />
              </button>
              {mobileAccordion === 'Investments' && (
                <div className="border-t border-ink-100 divide-y divide-ink-50 p-2 bg-porcelain-50/50 space-y-1">
                  {INVESTMENTS.map((inv) => {
                    const { fact, type, icon: Icon } = getInvestmentMeta(inv);
                    return (
                      <Link
                        key={inv.slug}
                        to={`/investments#${inv.slug}`}
                        onClick={closeMenu}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
                            <Icon className="h-6 w-6" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-ink-900">{shortProductName(inv.name)}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-midnight-100 font-bold text-midnight-900">{type}</span>
                            </div>
                            <p className="text-xs text-ink-500 truncate">{inv.tagline}</p>
                          </div>
                        </div>
                        <span className="tnum font-semibold text-xs text-ink-900 shrink-0 ml-2">{fact}</span>
                      </Link>
                    );
                  })}
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs">
                    <Link to="/investments" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all investments →</Link>
                    <Link to="/grievance-redressal" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Talk to us</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Calculators Direct Link */}
            <Link
              to="/calculators"
              onClick={closeMenu}
              className="block rounded-xl border border-ink-200/70 bg-white p-3.5 text-sm font-semibold text-midnight-950 shadow-xs"
            >
              Calculators
            </Link>

            {/* Support Accordion */}
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setMobileAccordion(mobileAccordion === 'Support' ? null : 'Support')}
                className="flex w-full items-center justify-between p-3.5 text-sm font-semibold text-midnight-950"
              >
                <span>Support &amp; Grievances</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === 'Support' ? 'rotate-180' : ''}`} />
              </button>
              {mobileAccordion === 'Support' && (
                <div className="border-t border-ink-100 divide-y divide-ink-50 p-2 bg-porcelain-50/50 space-y-1">
                  {SUPPORT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.to}
                        onClick={closeMenu}
                        className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-porcelain-100 transition-colors"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-ink-900 truncate">{item.name}</p>
                          <p className="text-xs text-ink-500 truncate">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="pt-2 px-2 text-xs text-ink-600">
                    Helpline: <a href="tel:18002674100" className="font-bold text-midnight-950">1800 267 4100</a>
                  </div>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
};

export default Header;
