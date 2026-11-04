import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Landmark,
  Menu,
  X,
  ArrowRight,
  Wallet,
  Home,
  ScrollText,
  LifeBuoy,
  FileText,
  Scale,
  ShieldCheck,
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
  accountRateFact,
} from '../../data/products.js';
import { ACCOUNT_ICONS, LOAN_ICONS, INVESTMENT_ICONS } from '../../data/productIcons.js';
import { shortProductName } from '../../lib/format.js';
import { CardVisual } from '../common/CardVisual.jsx';

/* ---------------- Card Mini SVG Thumbnails (shared CardVisual) ---------------- */

function MiniCardThumb({ card, slug }) {
  const target = card || CARDS.find((c) => c.slug === slug);
  if (!target) return null;
  return <CardVisual card={target} className="w-full h-full shadow-none" />;
}

/* ---------------- Fact Helpers ---------------- */

function getAccountFact(acc) {
  return accountRateFact(acc);
}

function getCardFact(card) {
  if (card.annualFee === 0) return 'No annual fee';
  if (card.annualFee != null) return `₹${card.annualFee}/yr`;
  return 'Nil';
}

function getInvestmentMeta(inv) {
  const Icon = INVESTMENT_ICONS[inv.slug] || ScrollText;
  if (inv.kind === 'FD') {
    const top = Math.max(...(inv.rateGrid?.map((r) => r.general) || [6.95]));
    return { fact: `Up to ${top.toFixed(2)}% p.a.`, type: 'Guaranteed', icon: Icon };
  }
  if (inv.kind === 'RD') {
    const top = Math.max(...(inv.rateBands?.map((b) => b.rate) || [7.00]));
    return { fact: `Up to ${top.toFixed(2)}% p.a.`, type: 'Guaranteed', icon: Icon };
  }
  if (inv.kind === 'SIP') {
    return { fact: 'Market-linked', type: 'Market-linked', icon: Icon };
  }
  if (inv.kind === 'SSY') {
    return { fact: `${inv.rate?.toFixed(2) || '8.05'}% p.a.`, type: 'Guaranteed', icon: Icon };
  }
  return { fact: '—', type: 'Guaranteed', icon: Icon };
}

const SUPPORT_ITEMS = [
  {
    name: 'Customer Support & Grievances',
    description: 'Statutory redressal officer & dispute escalations',
    to: '/grievance-redressal',
    icon: LifeBuoy,
  },
  {
    name: 'Schedule of Charges',
    description: 'Honest tariff schedule across all accounts and loans',
    to: '/schedule-of-charges',
    icon: FileText,
  },
  {
    name: 'Fair Practice Code',
    description: 'Lending commitments & grievance resolution charter',
    to: '/fair-practice-code',
    icon: Scale,
  },
  {
    name: 'Regulatory Disclosures',
    description: 'Capital adequacy ratios, Basel III & liquidity records',
    to: '/disclosures',
    icon: ShieldCheck,
  },
  {
    name: 'Privacy Policy & Terms',
    description: 'Digital data protection and cookie management',
    to: '/privacy-policy',
    icon: Lock,
  },
];

/* ---------------- Module 28 Shared UI: MenuRow & MegaMenuPanel ---------------- */

/**
 * Shared MenuRow template (Module 28 Fix 0).
 * Consumed across all 6 desktop mega menus and mobile accordion.
 */
function MenuRow({
  to,
  onClick,
  icon: Icon,
  card,
  name,
  description,
  chip,
  fact,
  isMobile = false,
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group cursor-pointer flex items-center rounded-xl transition-colors duration-160 hover:bg-midnight-50 active:bg-midnight-100/60 focus-visible:outline-2 focus-visible:outline-gold-500 ${
        isMobile
          ? 'px-3 py-2.5 min-h-[64px] gap-3'
          : 'px-[14px] py-3 min-h-[68px] gap-[14px]'
      }`}
    >
      {/* Tile: Cards 64x40 mini card art OR standard 48x48 icon tile */}
      {card ? (
        <span className="w-16 h-10 shrink-0 rounded-lg overflow-hidden border border-ink-100/60 bg-midnight-950 p-0.5 shadow-xs flex items-center justify-center">
          <MiniCardThumb card={card} />
        </span>
      ) : Icon ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-porcelain-50 transition-colors duration-160 group-hover:text-gold-300">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}

      {/* Text Block & Fact Block */}
      {isMobile ? (
        <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950 transition-colors duration-160">
                {name}
              </span>
              {chip && (
                <span
                  className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                    chip === 'Guaranteed'
                      ? 'bg-midnight-900 text-porcelain-50'
                      : 'border border-gold-500 text-gold-700 bg-gold-50/60'
                  }`}
                >
                  {chip}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-0.5 text-sm leading-snug text-ink-600">
                {description}
              </p>
            )}
          </div>
          <div className="flex-none text-right flex items-center gap-1.5 shrink-0 ml-auto max-[400px]:w-full max-[400px]:justify-end">
            {fact && (
              <span className="tnum text-[15px] font-semibold text-midnight-950 tabular-nums whitespace-nowrap">
                {fact}
              </span>
            )}
            <ArrowRight
              className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 group-active:text-midnight-900 group-active:translate-x-0.5 opacity-40 group-active:opacity-100 transition-all duration-160 menu-row-arrow shrink-0"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="truncate text-base font-semibold text-ink-900 group-hover:text-midnight-950 transition-colors duration-160">
                {name}
              </span>
              {chip && (
                <span
                  className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                    chip === 'Guaranteed'
                      ? 'bg-midnight-900 text-porcelain-50'
                      : 'border border-gold-500 text-gold-700 bg-gold-50/60'
                  }`}
                >
                  {chip}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-0.5 text-sm leading-snug text-ink-600">
                {description}
              </p>
            )}
          </div>
          <div className="flex-none text-right flex items-center gap-2 shrink-0 ml-3">
            {fact && (
              <span className="tnum text-[15px] font-semibold text-midnight-950 tabular-nums whitespace-nowrap">
                {fact}
              </span>
            )}
            <ArrowRight
              className="h-4 w-4 text-ink-400 group-hover:text-midnight-900 group-hover:translate-x-0.5 group-active:text-midnight-900 group-active:translate-x-0.5 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-160 menu-row-arrow shrink-0"
              aria-hidden
            />
          </div>
        </>
      )}
    </Link>
  );
}

/**
 * Viewport-safe MegaMenuPanel (Module 28 Fix 1).
 * Clamps dynamically within viewport bounds (min 16px clearance on both edges).
 */
function MegaMenuPanel({
  children,
  align = 'left',
  widthClass = 'w-[min(640px,calc(100vw-32px))]',
  role = 'region',
  'aria-label': ariaLabel,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const clamp = () => {
      el.style.transform = '';
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const minLeft = 16;
      const maxRight = vw - 16;

      let shift = 0;
      if (rect.right > maxRight) {
        shift = -(rect.right - maxRight);
      } else if (rect.left < minLeft) {
        shift = minLeft - rect.left;
      }

      if (shift !== 0) {
        el.style.transform = `translateX(${shift}px)`;
      }
    };

    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-50 ${widthClass} max-w-[calc(100vw-32px)]`}
    >
      <div
        role={role}
        aria-label={ariaLabel}
        className="w-full rounded-2xl border border-ink-100 border-t-2 border-t-gold-500 bg-white shadow-2xl shadow-modal p-2.5 animate-menu-enter overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

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
  useEffect(() => {
    if (!openMenu) return;
    const onGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const currentKey = openMenu;
        closeMenu();
        if (triggerRefs.current[currentKey]) {
          triggerRefs.current[currentKey].focus();
        }
      }
    };
    document.addEventListener('keydown', onGlobalKeyDown);
    return () => document.removeEventListener('keydown', onGlobalKeyDown);
  }, [openMenu]);

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
                  openMenu === 'Accounts'
                    ? 'bg-porcelain-200/80 text-midnight-950 font-semibold'
                    : isCurrentActive('/accounts')
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
                <MegaMenuPanel align="left" aria-label="Accounts Menu">
                  <div className="grid gap-1">
                    {ACCOUNTS.map((acc) => {
                      const Icon = ACCOUNT_ICONS[acc.slug] || Wallet;
                      return (
                        <MenuRow
                          key={acc.slug}
                          to={`/accounts#${acc.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(acc.name)}
                          description={acc.tagline}
                          fact={getAccountFact(acc)}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 -mx-2.5 -mb-2.5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
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
                </MegaMenuPanel>
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
                  openMenu === 'Cards'
                    ? 'bg-porcelain-200/80 text-midnight-950 font-semibold'
                    : isCurrentActive('/cards')
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
                <MegaMenuPanel align="left" aria-label="Cards Menu">
                  <div className="space-y-3">
                    {/* CREDIT CARDS GROUP */}
                    <div>
                      <p className="px-3.5 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                        Credit Cards
                      </p>
                      <div className="grid gap-1">
                        {CREDIT_CARDS.map((card) => (
                          <MenuRow
                            key={card.slug}
                            to={`/cards#${card.slug}`}
                            onClick={closeMenu}
                            card={card}
                            name={shortProductName(card.name)}
                            description={card.tagline}
                            fact={getCardFact(card)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-ink-100" />

                    {/* DEBIT CARDS GROUP */}
                    <div>
                      <p className="px-3.5 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                        Debit Cards
                      </p>
                      <div className="grid gap-1">
                        {DEBIT_CARDS.map((card) => (
                          <MenuRow
                            key={card.slug}
                            to={`/cards#${card.slug}`}
                            onClick={closeMenu}
                            card={card}
                            name={shortProductName(card.name)}
                            description={card.tagline}
                            fact={getCardFact(card)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 -mx-2.5 -mb-2.5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
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
                </MegaMenuPanel>
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
                  openMenu === 'Loans'
                    ? 'bg-porcelain-200/80 text-midnight-950 font-semibold'
                    : isCurrentActive('/loans')
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
                <MegaMenuPanel align="left" aria-label="Loans Menu">
                  <div className="grid gap-1">
                    {LOANS.map((loan) => {
                      const Icon = LOAN_ICONS[loan.slug] || Home;
                      return (
                        <MenuRow
                          key={loan.slug}
                          to={`/loans#${loan.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(loan.name)}
                          description={loan.tagline}
                          fact={`From ${loan.rateMin.toFixed(2)}% p.a.`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 -mx-2.5 -mb-2.5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
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
                </MegaMenuPanel>
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
                  openMenu === 'Investments'
                    ? 'bg-porcelain-200/80 text-midnight-950 font-semibold'
                    : isCurrentActive('/investments')
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
                <MegaMenuPanel align="right" aria-label="Investments Menu">
                  <div className="grid gap-1">
                    {INVESTMENTS.map((inv) => {
                      const { fact, type, icon: Icon } = getInvestmentMeta(inv);
                      return (
                        <MenuRow
                          key={inv.slug}
                          to={`/investments#${inv.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(inv.name)}
                          chip={type}
                          description={inv.tagline}
                          fact={fact}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 -mx-2.5 -mb-2.5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
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
                </MegaMenuPanel>
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

            {/* 6. SUPPORT MEGA MENU */}
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
                  openMenu === 'Support'
                    ? 'bg-porcelain-200/80 text-midnight-950 font-semibold'
                    : 'text-ink-700 hover:text-midnight-900 hover:bg-midnight-50/50'
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
                <MegaMenuPanel
                  align="right"
                  widthClass="w-[min(490px,calc(100vw-32px))]"
                  aria-label="Support and Compliance Menu"
                >
                  <div className="grid gap-1">
                    {SUPPORT_ITEMS.map((item) => (
                      <MenuRow
                        key={item.name}
                        to={item.to}
                        onClick={closeMenu}
                        icon={item.icon}
                        name={item.name}
                        description={item.description}
                      />
                    ))}
                  </div>
                  <div className="mt-2.5 -mx-2.5 -mb-2.5 flex items-center justify-between border-t border-ink-100 bg-porcelain-50/90 px-5 py-3.5 text-[15px]">
                    <div>
                      <p className="text-xs text-ink-500">Toll-Free Helpline</p>
                      <a
                        href="tel:18002674100"
                        className="font-bold text-midnight-950 hover:text-gold-600 transition-colors"
                      >
                        1800 267 4100
                      </a>
                    </div>
                    <span className="text-xs text-ink-400">Mon–Sat, 9AM–7PM</span>
                  </div>
                </MegaMenuPanel>
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
              <div className="accordion-grid-wrapper" data-open={mobileAccordion === 'Accounts'}>
                <div className="accordion-grid-inner">
                  <div className="border-t border-ink-100 p-2 bg-porcelain-50/50 space-y-1 animate-accordion-down">
                  <div className="grid gap-1">
                    {ACCOUNTS.map((acc) => {
                      const Icon = ACCOUNT_ICONS[acc.slug] || Wallet;
                      return (
                        <MenuRow
                          key={acc.slug}
                          to={`/accounts#${acc.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(acc.name)}
                          description={acc.tagline}
                          fact={getAccountFact(acc)}
                          isMobile
                        />
                      );
                    })}
                  </div>
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs border-t border-ink-100 mt-2">
                    <Link to="/accounts" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all accounts →</Link>
                    <Link to="/accounts?apply=1" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Open an account</Link>
                  </div>
                </div>
                </div>
              </div>
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
              <div className="accordion-grid-wrapper" data-open={mobileAccordion === 'Cards'}>
                <div className="accordion-grid-inner">
                  <div className="border-t border-ink-100 p-2 bg-porcelain-50/50 space-y-2 animate-accordion-down">
                  <div>
                    <p className="text-xs font-semibold text-ink-400 uppercase tracking-[0.14em] px-2 pb-1">Credit Cards</p>
                    <div className="grid gap-1">
                      {CREDIT_CARDS.map((c) => (
                        <MenuRow
                          key={c.slug}
                          to={`/cards#${c.slug}`}
                          onClick={closeMenu}
                          card={c}
                          name={shortProductName(c.name)}
                          description={c.tagline}
                          fact={getCardFact(c)}
                          isMobile
                        />
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-ink-100" />
                  <div>
                    <p className="text-xs font-semibold text-ink-400 uppercase tracking-[0.14em] px-2 pb-1">Debit Cards</p>
                    <div className="grid gap-1">
                      {DEBIT_CARDS.map((c) => (
                        <MenuRow
                          key={c.slug}
                          to={`/cards#${c.slug}`}
                          onClick={closeMenu}
                          card={c}
                          name={shortProductName(c.name)}
                          description={c.tagline}
                          fact={getCardFact(c)}
                          isMobile
                        />
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs border-t border-ink-100 mt-2">
                    <Link to="/cards" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all cards →</Link>
                    <Link to="/cards#compare" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Compare cards</Link>
                  </div>
                </div>
                </div>
              </div>
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
              <div className="accordion-grid-wrapper" data-open={mobileAccordion === 'Loans'}>
                <div className="accordion-grid-inner">
                  <div className="border-t border-ink-100 p-2 bg-porcelain-50/50 space-y-1 animate-accordion-down">
                  <div className="grid gap-1">
                    {LOANS.map((l) => {
                      const Icon = LOAN_ICONS[l.slug] || Home;
                      return (
                        <MenuRow
                          key={l.slug}
                          to={`/loans#${l.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(l.name)}
                          description={l.tagline}
                          fact={`From ${l.rateMin.toFixed(2)}%`}
                          isMobile
                        />
                      );
                    })}
                  </div>
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs border-t border-ink-100 mt-2">
                    <Link to="/loans" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all 7 loans →</Link>
                    <Link to="/calculators" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">EMI calculator</Link>
                  </div>
                </div>
                </div>
              </div>
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
              <div className="accordion-grid-wrapper" data-open={mobileAccordion === 'Investments'}>
                <div className="accordion-grid-inner">
                  <div className="border-t border-ink-100 p-2 bg-porcelain-50/50 space-y-1 animate-accordion-down">
                  <div className="grid gap-1">
                    {INVESTMENTS.map((inv) => {
                      const { fact, type, icon: Icon } = getInvestmentMeta(inv);
                      return (
                        <MenuRow
                          key={inv.slug}
                          to={`/investments#${inv.slug}`}
                          onClick={closeMenu}
                          icon={Icon}
                          name={shortProductName(inv.name)}
                          chip={type}
                          description={inv.tagline}
                          fact={fact}
                          isMobile
                        />
                      );
                    })}
                  </div>
                  <div className="pt-2 px-2 flex justify-between font-semibold text-xs border-t border-ink-100 mt-2">
                    <Link to="/investments" onClick={closeMenu} className="text-ink-700 hover:text-midnight-900">View all investments →</Link>
                    <Link to="/grievance-redressal" onClick={closeMenu} className="text-midnight-900 hover:text-midnight-700">Talk to us</Link>
                  </div>
                </div>
                </div>
              </div>
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
              <div className="accordion-grid-wrapper" data-open={mobileAccordion === 'Support'}>
                <div className="accordion-grid-inner">
                  <div className="border-t border-ink-100 p-2 bg-porcelain-50/50 space-y-1 animate-accordion-down">
                  <div className="grid gap-1">
                    {SUPPORT_ITEMS.map((item) => (
                      <MenuRow
                        key={item.name}
                        to={item.to}
                        onClick={closeMenu}
                        icon={item.icon}
                        name={item.name}
                        description={item.description}
                        isMobile
                      />
                    ))}
                  </div>
                  <div className="pt-2 px-2 text-xs text-ink-600 border-t border-ink-100 mt-2">
                    Helpline: <a href="tel:18002674100" className="font-bold text-midnight-950">1800 267 4100</a>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
};

export default Header;
