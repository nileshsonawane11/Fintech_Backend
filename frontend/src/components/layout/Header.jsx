import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Search,
  Sparkles,
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
  BRAND,
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
    const top = Math.max(...(inv.rateGrid?.map((r) => r.senior) || [7.45]));
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
      className={`group cursor-pointer flex items-center rounded-xl transition-colors duration-160 hover:bg-bank-primary-light/60 active:bg-bank-primary-light focus-visible:outline-2 focus-visible:outline-bank-primary ${
        isMobile
          ? 'px-3 py-2.5 min-h-[64px] gap-3'
          : 'px-[14px] py-3 min-h-[68px] gap-[14px]'
      }`}
    >
      {/* Tile: Cards 64x40 mini card art OR standard 48x48 icon tile */}
      {card ? (
        <span className="w-16 h-10 shrink-0 rounded-lg overflow-hidden border border-ink-100/60 bg-ink-950 p-0.5 shadow-xs flex items-center justify-center">
          <MiniCardThumb card={card} />
        </span>
      ) : Icon ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bank-primary-light text-bank-primary transition-colors duration-160 group-hover:bg-bank-primary group-hover:text-white">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}

      {/* Text Block & Fact Block */}
      {isMobile ? (
        <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="truncate text-base font-semibold text-ink-900 group-hover:text-bank-primary transition-colors duration-160">
                {name}
              </span>
              {chip && (
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                    chip === 'Guaranteed'
                      ? 'bg-bank-primary text-white'
                      : 'border border-bank-primary-border text-bank-primary bg-bank-primary-light'
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
              <span className="tnum text-[15px] font-semibold text-ink-900 tabular-nums whitespace-nowrap">
                {fact}
              </span>
            )}
            <ArrowRight
              className="h-4 w-4 text-ink-400 group-hover:text-bank-primary group-active:text-bank-primary group-active:translate-x-0.5 opacity-40 group-active:opacity-100 transition-all duration-160 menu-row-arrow shrink-0"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="truncate text-base font-semibold text-ink-900 group-hover:text-bank-primary transition-colors duration-160">
                {name}
              </span>
              {chip && (
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                    chip === 'Guaranteed'
                      ? 'bg-bank-primary text-white'
                      : 'border border-bank-primary-border text-bank-primary bg-bank-primary-light'
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
              <span className="tnum text-[15px] font-semibold text-ink-900 tabular-nums whitespace-nowrap">
                {fact}
              </span>
            )}
            <ArrowRight
              className="h-4 w-4 text-ink-400 group-hover:text-bank-primary group-hover:translate-x-0.5 group-active:text-bank-primary group-active:translate-x-0.5 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-160 menu-row-arrow shrink-0"
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
        className="w-full rounded-2xl border border-ink-200/80 border-t-2 border-t-bank-primary bg-white shadow-xl p-2.5 animate-menu-enter overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

export function Logo({ light = false, isScrolled = false, isHero = false }) {
  const showWhiteText = light || (isHero && !isScrolled);
  return (
    <Link to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="FinEdge Bank — home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#981a1d] text-white shadow-sm font-black text-lg tracking-tight">
        FE
      </span>
      <div>
        <span className={`block font-sans text-xl font-extrabold leading-none tracking-tight transition-colors ${showWhiteText ? 'text-white' : 'text-gray-950'}`}>
          FinEdge
        </span>
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#981a1d] block mt-0.5 leading-none">
          BANK
        </span>
      </div>
    </Link>
  );
}

export const Header = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navRef = useRef(null);
  const triggerRefs = useRef({});
  const hoverTimerRef = useRef(null);

  const isHero = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;
      setIsScrolled(sy > 20);
      setShowBackToTop(sy > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('loan')) navigate('/loans');
    else if (q.includes('card')) navigate('/cards');
    else if (q.includes('fd') || q.includes('invest') || q.includes('sip') || q.includes('rd') || q.includes('ssy')) navigate('/investments');
    else if (q.includes('calc') || q.includes('emi')) navigate('/calculators');
    else navigate('/accounts');
    setSearchQuery('');
    setSearchOpen(false);
  };

  // Close menus on route change
  useEffect(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
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

  const getTriggerClass = (menuKey, path) => {
    const isActive = openMenu === menuKey || isCurrentActive(path);
    if (isHero && !isScrolled) {
      return `relative flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white ${
        isActive
          ? 'bg-white/20 text-white font-bold'
          : 'text-white/90 hover:text-white hover:bg-white/10 font-semibold'
      }`;
    }
    return `relative flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#981a1d] ${
      isActive
        ? 'bg-red-50 text-[#981a1d] font-bold'
        : 'text-[#981a1d] hover:text-[#7a1215] hover:bg-red-50/60 font-semibold'
    }`;
  };

  return (
    <>
      <AccessibilityBar />
      <header className={`sticky top-0 z-40 transition-colors duration-200 ${
        isHero && !isScrolled
          ? 'bg-ink-950/95 sm:bg-transparent text-white border-b border-white/10'
          : 'bg-white text-ink-950 shadow-md border-b border-gray-100'
      }`}>
        <div className="idfc-container flex h-18 items-center justify-between gap-4">
          <Logo isHero={isHero} isScrolled={isScrolled} />

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
                className={getTriggerClass('Accounts', '/accounts')}
              >
                <span>Accounts</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-160 ${
                    openMenu === 'Accounts' ? 'rotate-180' : ''
                  } ${isHero && !isScrolled ? 'text-white/70' : 'text-[#981a1d]'}`}
                  aria-hidden
                />
                {isCurrentActive('/accounts') && (
                  <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${isHero && !isScrolled ? 'bg-white' : 'bg-[#981a1d]'}`} />
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
                className={getTriggerClass('Cards', '/cards')}
              >
                <span>Cards</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-160 ${
                    openMenu === 'Cards' ? 'rotate-180' : ''
                  } ${isHero && !isScrolled ? 'text-white/70' : 'text-[#981a1d]'}`}
                  aria-hidden
                />
                {isCurrentActive('/cards') && (
                  <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${isHero && !isScrolled ? 'bg-white' : 'bg-[#981a1d]'}`} />
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
                className={getTriggerClass('Loans', '/loans')}
              >
                <span>Loans</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-160 ${
                    openMenu === 'Loans' ? 'rotate-180' : ''
                  } ${isHero && !isScrolled ? 'text-white/70' : 'text-[#981a1d]'}`}
                  aria-hidden
                />
                {isCurrentActive('/loans') && (
                  <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${isHero && !isScrolled ? 'bg-white' : 'bg-[#981a1d]'}`} />
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
                className={getTriggerClass('Investments', '/investments')}
              >
                <span>Investments</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-160 ${
                    openMenu === 'Investments' ? 'rotate-180' : ''
                  } ${isHero && !isScrolled ? 'text-white/70' : 'text-[#981a1d]'}`}
                  aria-hidden
                />
                {isCurrentActive('/investments') && (
                  <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${isHero && !isScrolled ? 'bg-white' : 'bg-[#981a1d]'}`} />
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
                `${getTriggerClass('Calculators', '/calculators')}`
              }
            >
              <span>Calculators</span>
              {isCurrentActive('/calculators') && (
                <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${isHero && !isScrolled ? 'bg-white' : 'bg-[#981a1d]'}`} />
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
                className={getTriggerClass('Support', '/grievance-redressal')}
              >
                <span>Support</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-160 ${
                    openMenu === 'Support' ? 'rotate-180' : ''
                  } ${isHero && !isScrolled ? 'text-white/70' : 'text-[#981a1d]'}`}
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
                        className="font-bold text-ink-950 hover:text-bank-primary transition-colors"
                      >
                        1800 267 4100
                      </a>
                    </div>
                    <span className="text-xs text-ink-400">{BRAND.support.hours}</span>
                  </div>
                </MegaMenuPanel>
              )}
            </div>
          </nav>

          {/* Desktop Right Side Header Actions: Search outline pill + Login solid pill + Staff secondary pill */}
          <div className="ml-auto flex items-center gap-2.5">
            {/* Search Outline Pill */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isHero && !isScrolled
                  ? 'border-white/60 text-white hover:border-white hover:bg-white/10'
                  : 'border-[#981a1d] text-[#981a1d] hover:bg-[#981a1d]/5'
              }`}
              aria-label="Search products"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <div className="hidden sm:flex items-center gap-2.5">
              {/* Login Solid Pill */}
              {user ? (
                <Button
                  as={Link}
                  to="/portal"
                  variant={isHero && !isScrolled ? 'white' : 'primary'}
                  size="md"
                  className="shadow-sm"
                >
                  My Dashboard
                </Button>
              ) : (
                <Button
                  as={Link}
                  to="/portal/login"
                  variant={isHero && !isScrolled ? 'white' : 'primary'}
                  size="md"
                  className="shadow-sm"
                >
                  Customer Login
                </Button>
              )}

              {/* Staff Secondary Pill */}
              <Button
                as={Link}
                to="/manager/login"
                variant={isHero && !isScrolled ? 'outlineWhite' : 'secondary'}
                size="md"
              >
                Staff Login
              </Button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 transition-colors lg:hidden ${
                isHero && !isScrolled ? 'text-white hover:bg-white/10' : 'text-ink-700 hover:text-midnight-900'
              }`}
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
            className="animate-fade-in border-t border-ink-100 bg-white px-4 py-4 lg:hidden space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto"
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
                  className="w-full justify-center"
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
                  className="w-full justify-center"
                >
                  Customer Login
                </Button>
              )}
              <Button
                as={Link}
                to="/manager/login"
                onClick={closeMenu}
                variant="secondary"
                size="md"
                className="w-full justify-center"
              >
                Staff Login
              </Button>
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
                    <Link to="/accounts" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-ink-700 hover:text-midnight-900 font-semibold">View all accounts →</Link>
                    <Link to="/accounts?apply=1" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-midnight-900 hover:text-midnight-700 font-semibold">Open an account</Link>
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
                    <Link to="/cards" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-ink-700 hover:text-midnight-900 font-semibold">View all cards →</Link>
                    <Link to="/cards#compare" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-midnight-900 hover:text-midnight-700 font-semibold">Compare cards</Link>
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
                    <Link to="/loans" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-ink-700 hover:text-midnight-900 font-semibold">View all 7 loans →</Link>
                    <Link to="/calculators" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-midnight-900 hover:text-midnight-700 font-semibold">EMI calculator</Link>
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
                    <Link to="/investments" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-ink-700 hover:text-midnight-900 font-semibold">View all investments →</Link>
                    <Link to="/grievance-redressal" onClick={closeMenu} className="min-h-[44px] inline-flex items-center text-midnight-900 hover:text-midnight-700 font-semibold">Talk to us</Link>
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

      {/* Floating Quick-Apply Tab (Part A) */}
      <div
        onClick={() => {
          if (location.pathname === '/') {
            const el = document.getElementById('product-tabs');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.location.href = '/#product-tabs';
          }
        }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#c59a3f] hover:bg-[#b88c32] text-black font-extrabold text-[11px] uppercase tracking-wider py-4 px-2.5 rounded-l-2xl shadow-2xl border-l border-t border-b border-amber-600/30 hidden sm:flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:-translate-x-1 select-none"
        title="Apply Now"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (location.pathname === '/') {
              const el = document.getElementById('product-tabs');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.location.href = '/#product-tabs';
            }
          }
        }}
      >
        <Sparkles className="w-4 h-4 text-black shrink-0" />
        <div className="flex flex-col items-center leading-tight font-black text-center">
          <span>APPLY</span>
          <span>NOW</span>
        </div>
      </div>

      {/* Floating Back-to-Top Button (Part A) */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-black text-white hover:bg-gray-800 shadow-2xl flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group focus-visible:outline-2 focus-visible:outline-[#981a1d]"
          aria-label="Scroll back to top"
        >
          <span className="text-xs font-bold leading-none">↑</span>
          <span className="text-[9px] font-bold tracking-wider leading-none mt-0.5">TOP</span>
        </button>
      )}

      {/* Search Overlay Dialog (Part A) */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSearchOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search products, loans, cards, investments, calculators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-200 focus:border-[#981a1d] focus:ring-2 focus:ring-[#981a1d]/20 outline-none text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-400 py-1 font-medium">Quick Links:</span>
              {[
                { label: 'Savings Account', path: '/accounts' },
                { label: 'Home Loan', path: '/loans' },
                { label: 'Credit Cards', path: '/cards' },
                { label: 'Fixed Deposit', path: '/investments' },
                { label: 'Calculators', path: '/calculators' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setSearchOpen(false);
                  }}
                  className="px-3 py-1 rounded-full bg-gray-100 hover:bg-red-50 hover:text-[#981a1d] text-gray-700 font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
