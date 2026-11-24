import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Calculator,
  Lock,
  Percent,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  FileText,
  BadgePercent,
  Coins,
  Building,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui.jsx';
import { ApplyModal } from '../components/common/ApplyModal.jsx';
import {
  ACCOUNTS,
  LOANS,
  CREDIT_CARDS,
  DEBIT_CARDS,
  INVESTMENTS,
  RATE_DISCLAIMER,
  BRAND,
  getProductBySlug,
  accountRateFact,
} from '../data/products.js';
import { ACCOUNT_ICONS, LOAN_ICONS, INVESTMENT_ICONS } from '../data/productIcons.js';
import { formatINR, formatINRWhole, shortProductName } from '../lib/format.js';
import { calculateEMI, calculateFD, calculateRD, calculateSIP } from '../lib/finance.js';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [activeTab, setActiveTab] = useState('popular');
  const [featureIndex, setFeatureIndex] = useState(0);
  const [applyModalProduct, setApplyModalProduct] = useState(null);

  // Calculator State
  const [calcTab, setCalcTab] = useState('emi'); // 'emi', 'fd', 'rd', 'savings', 'sip'
  const [emiAmount, setEmiAmount] = useState(2500000);
  const [emiRate, setEmiRate] = useState(8.35);
  const [emiTenureYears, setEmiTenureYears] = useState(20);

  const [fdAmount, setFdAmount] = useState(100000);
  const [fdTenureMonths, setFdTenureMonths] = useState(36);
  const [isSenior, setIsSenior] = useState(false);

  const [rdMonthly, setRdMonthly] = useState(5000);
  const [rdTenureMonths, setRdTenureMonths] = useState(24);

  const [savingsBal, setSavingsBal] = useState(200000);

  const [sipMonthly, setSipMonthly] = useState(5000);
  const [sipRate, setSipRate] = useState(12.0);
  const [sipYears, setSipYears] = useState(10);

  // -------------------------------------------------------------------------
  // 1. HERO CAROUSEL DATA (7 Slides strictly from FinEdge real data)
  // -------------------------------------------------------------------------
  const heroSlides = [
    {
      id: 'savings',
      category: 'SAVINGS ACCOUNT',
      headline: 'Earn up to 7.00% p.a. with monthly compounding',
      subline: 'Monthly interest credit credited straight to your balance. 100% digital paperless video KYC onboarding.',
      ctaText: 'Open Savings Account',
      ctaSlug: 'everyday-savings',
      ctaCategory: 'accounts',
      product: getProductBySlug('everyday-savings'),
      bgGradient: 'from-[#140406] via-[#240a0e] to-[#0f0304]',
      heroImage: '/images/hero-savings.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-sm ml-auto p-6 rounded-3xl bg-black/45 backdrop-blur-md border border-white/20 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Peak Savings Rate</span>
            <Percent className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-amber-100 tracking-tight">7.00% <span className="text-base font-semibold text-amber-300">p.a.</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">Monthly compounding with interest credited directly to your daily balance.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-200">
            <span>Zero Paperwork</span>
            <span>⚡ Instant Video KYC</span>
          </div>
        </div>
      ),
    },
    {
      id: 'fd',
      category: 'FIXED DEPOSIT',
      headline: 'Book Fixed Deposits at up to 7.45% p.a.',
      subline: 'Guaranteed compound returns with flexible tenures from 7 days to 10 years. DICGC insured up to ₹5 Lakhs.',
      ctaText: 'Open Fixed Deposit',
      ctaSlug: 'tax-saver-fd-5yr',
      ctaCategory: 'investments',
      product: getProductBySlug('tax-saver-fd-5yr'),
      bgGradient: 'from-[#081326] via-[#0d1e3d] to-[#050b17]',
      heroImage: '/images/hero-fd.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-sm ml-auto p-6 rounded-3xl bg-black/45 backdrop-blur-md border border-sky-400/25 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300">Guaranteed Return</span>
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">7.45% <span className="text-base font-semibold text-sky-300">p.a.</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">Senior citizen peak yield (6.95% regular). DICGC insurance coverage up to ₹5 Lakhs.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-sky-200">
            <span>Flexible Tenures</span>
            <span>7 Days to 10 Years</span>
          </div>
        </div>
      ),
    },
    {
      id: 'cards',
      category: 'CREDIT CARDS',
      headline: 'FinEdge First Metal Credit Card',
      subline: 'Zero annual fee forever. 10X reward points that never expire, airport lounge access and 1% forex markup.',
      ctaText: user ? 'Apply for Metal Card' : 'Login to Apply',
      ctaSlug: 'aura-metal-card',
      ctaCategory: 'cards',
      product: getProductBySlug('aura-metal-card'),
      bgGradient: 'from-[#111111] via-[#1c1c1c] to-[#0a0a0a]',
      heroImage: '/images/hero-cards.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-xs ml-auto p-5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Aura Metal Edition</span>
            <CreditCard className="w-5 h-5 text-gray-200" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">Zero <span className="text-sm font-semibold text-gray-300">Annual Fee</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">10X reward points that never expire, airport lounge access and low 1% forex markup fee.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-200">
            <span>Contactless NFC</span>
            <span>Lifetime Free</span>
          </div>
        </div>
      ),
    },
    {
      id: 'gold-loan',
      category: 'GOLD LOAN',
      headline: 'Instant Gold Loans starting from 8.60% p.a.',
      subline: 'Highest per-gram valuation with door-step or in-branch valuation. Instant fund transfer in 20 minutes.',
      ctaText: user ? 'Apply for Gold Loan' : 'Login to Apply',
      ctaSlug: 'gold-loan',
      ctaCategory: 'loans',
      product: getProductBySlug('gold-loan'),
      bgGradient: 'from-[#1f1304] via-[#332007] to-[#120a01]',
      heroImage: '/images/hero-gold-loan.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-sm ml-auto p-6 rounded-3xl bg-black/45 backdrop-blur-md border border-amber-500/25 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Instant Valuation</span>
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-amber-100 tracking-tight">8.60% <span className="text-base font-semibold text-amber-300">p.a.</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">Highest per-gram valuation with verified purity testing and funds transferred in 20 minutes.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-200">
            <span>Up to 75% LTV</span>
            <span>⚡ Disbursal in 20 Min</span>
          </div>
        </div>
      ),
    },
    {
      id: 'home-loan',
      category: 'HOME FINANCING',
      headline: 'Dream Home Loans starting from 8.35% p.a.',
      subline: 'Transparent processing, zero prepayment charges on floating rates, and tenure up to 30 years.',
      ctaText: user ? 'Apply for Home Loan' : 'Login to Apply',
      ctaSlug: 'home-loan',
      ctaCategory: 'loans',
      product: getProductBySlug('home-loan'),
      bgGradient: 'from-[#051426] via-[#09223e] to-[#040e1a]',
      heroImage: '/images/hero-home-loan.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-sm ml-auto p-6 rounded-3xl bg-black/45 backdrop-blur-md border border-sky-500/25 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300">Home Financing</span>
            <Building className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">8.35% <span className="text-base font-semibold text-sky-300">p.a.</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">Transparent processing, zero prepayment charges on floating rates, tenure up to 30 years.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-sky-200">
            <span>Zero Foreclosure Fee</span>
            <span>Up to 30 Years</span>
          </div>
        </div>
      ),
    },
    {
      id: 'ssy',
      category: 'TAX-FREE INVESTMENTS',
      headline: 'Secure her future with Sukanya Samriddhi Yojana',
      subline: 'Government guaranteed 8.05% p.a. tax-free returns under Section 80C with sovereign protection.',
      ctaText: user ? 'Book SSY Online' : 'Login to Apply',
      ctaSlug: 'sukanya-samriddhi',
      ctaCategory: 'investments',
      product: getProductBySlug('sukanya-samriddhi'),
      bgGradient: 'from-[#1e0729] via-[#320d44] to-[#120419]',
      heroImage: '/images/hero-ssy.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-xs ml-auto p-5 rounded-2xl bg-black/60 backdrop-blur-md border border-purple-400/30 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">Sukanya Samriddhi</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">8.05% <span className="text-sm font-semibold text-purple-300">p.a.</span></div>
          <p className="text-xs text-purple-100/90 leading-relaxed">Government guaranteed annual yield with triple tax exemption (EEE) under Section 80C.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-purple-200">
            <span>Triple Tax Free</span>
            <span>Sovereign Guarantee</span>
          </div>
        </div>
      ),
    },
    {
      id: 'trust',
      category: 'SCHEDULED COMMERCIAL BANK',
      headline: 'FinEdge Bank: Certified security & regulatory trust',
      subline: 'Governed by the Banking Regulation Act, 1949. All depositor funds protected up to ₹5 Lakhs by DICGC.',
      ctaText: 'Explore Transparent Banking',
      ctaSlug: 'everyday-savings',
      ctaCategory: 'accounts',
      product: getProductBySlug('everyday-savings'),
      bgGradient: 'from-[#170507] via-[#24090c] to-[#0e0304]',
      heroImage: '/images/hero-trust.webp',
      renderVisual: () => (
        <div className="relative w-full max-w-sm ml-auto p-6 rounded-3xl bg-black/45 backdrop-blur-md border border-red-500/25 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-300">Regulatory Assurance</span>
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">₹5 Lakh <span className="text-base font-semibold text-red-300">DICGC</span></div>
          <p className="text-xs text-gray-300 leading-relaxed">Scheduled Commercial Bank governed under Banking Regulation Act, 1949 with deposit protection.</p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-red-200">
            <span>RBI Regulated</span>
            <span>100% Capital Adequacy</span>
          </div>
        </div>
      ),
    },
  ];

  // Hero Autoplay
  useEffect(() => {
    if (heroPaused) return;
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroPaused, heroSlides.length]);

  const currentSlide = heroSlides[heroSlide];

  // -------------------------------------------------------------------------
  // 2. PRODUCT TABS & COLOUR-BLOCK CARDS (Part C)
  // -------------------------------------------------------------------------
  const popularProducts = useMemo(() => {
    return [
      { product: getProductBySlug('everyday-savings'), category: 'account', colorClass: 'bg-[#981a1d]' },
      { product: getProductBySlug('home-loan'), category: 'loan', colorClass: 'bg-[#0c2340]' },
      { product: getProductBySlug('ashva-metal-card'), category: 'card', colorClass: 'bg-[#1e293b]' },
    ].filter((p) => p.product);
  }, []);

  const getCardColorByCategory = (cat) => {
    switch (cat) {
      case 'account':
        return 'bg-[#981a1d]'; // primary red
      case 'card':
        return 'bg-[#1e293b]'; // dark slate
      case 'loan':
        return 'bg-[#0c2340]'; // deep blue
      case 'investment':
        return 'bg-[#2e1065]'; // deep plum
      default:
        return 'bg-[#981a1d]';
    }
  };

  const getProductRoute = (prod) => {
    if (!prod) return '/accounts';
    if (prod.isCalculator) return `/calculators?tab=${prod.slug}`;
    const cat = prod.category;
    if (cat === 'loan') return `/loans/${prod.slug}`;
    if (cat === 'card') return `/cards/${prod.slug}`;
    if (cat === 'investment') return `/investments/${prod.slug}`;
    return `/accounts/${prod.slug}`;
  };

  const handleApplyClick = (product) => {
    if (!product) return;
    if (product.isCalculator) {
      const el = document.getElementById('calculators-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else navigate(`/calculators?tab=${product.slug}`);
      return;
    }
    const cat = product.category;
    if (cat === 'account') {
      // Accounts apply without login (M60 A4 / M61 Part 2)
      setApplyModalProduct(product);
    } else {
      // Cards, Loans, Investments: require login
      if (!user) {
        navigate('/portal/login');
      } else {
        setApplyModalProduct(product);
      }
    }
  };

  const getApplyButtonLabel = (product) => {
    if (!product) return 'Apply Now';
    if (product.isCalculator) return 'Calculate Now';
    const cat = product.category;
    if (cat === 'account') {
      return 'Open Account';
    }
    if (cat === 'investment') {
      return user ? 'Book Now' : 'Login to Apply';
    }
    return user ? 'Apply Now' : 'Login to Apply';
  };

  // Products to display in current tab
  const tabProducts = useMemo(() => {
    if (activeTab === 'popular') {
      return popularProducts;
    }
    if (activeTab === 'accounts') {
      return ACCOUNTS.slice(0, 3).map((p) => ({ product: p, category: 'account', colorClass: 'bg-[#981a1d]' }));
    }
    if (activeTab === 'loans') {
      return LOANS.slice(0, 3).map((p) => ({ product: p, category: 'loan', colorClass: 'bg-[#0c2340]' }));
    }
    if (activeTab === 'cards') {
      return CREDIT_CARDS.slice(0, 3).map((p) => ({ product: p, category: 'card', colorClass: 'bg-[#1e293b]' }));
    }
    if (activeTab === 'investments') {
      return INVESTMENTS.slice(0, 3).map((p) => ({ product: p, category: 'investment', colorClass: 'bg-[#2e1065]' }));
    }
    if (activeTab === 'calculators') {
      return [
        { product: { name: 'Loan EMI Calculator', slug: 'emi', category: 'calculators', rateFact: '8.35% base', tagline: 'Plan monthly instalments, principal repayment, and amortisation schedule.', isCalculator: true }, category: 'loan', colorClass: 'bg-[#0c2340]' },
        { product: { name: 'Fixed Deposit Calculator', slug: 'fd', category: 'calculators', rateFact: '7.45% p.a.', tagline: 'Compute quarterly compounding returns, maturity corpus, and senior citizen bonus.', isCalculator: true }, category: 'investment', colorClass: 'bg-[#2e1065]' },
        { product: { name: 'Recurring Deposit Calculator', slug: 'rd', category: 'calculators', rateFact: '7.00% p.a.', tagline: 'Estimate maturity values for disciplined monthly savings with quarterly compounding.', isCalculator: true }, category: 'account', colorClass: 'bg-[#981a1d]' },
      ];
    }
    return [];
  }, [activeTab, popularProducts]);

  // -------------------------------------------------------------------------
  // 3. WHY FINEDGE FEATURE CAROUSEL (Part D)
  // -------------------------------------------------------------------------
  const whyPoints = [
    {
      id: 1,
      title: 'One published schedule',
      body: 'Every rate and fee comes from a single published schedule; product pages and the Schedule of Charges can never disagree.',
      gradientBg: 'from-[#981a1d] via-[#7e1417] to-[#4f0c0e]',
      icon: FileText,
      link: '/schedule-of-charges',
    },
    {
      id: 2,
      title: 'Charges before you apply',
      body: 'The full fee table is published on every product page before any form. Zero hidden charges or unexpected deductions.',
      gradientBg: 'from-[#0c2340] via-[#091b31] to-[#040e1c]',
      icon: ShieldCheck,
      link: '/accounts',
    },
    {
      id: 3,
      title: 'A human when you need one',
      body: `Direct toll-free phone support at 1800 267 4100 (${BRAND.support.hours}), backed by a multi-level statutory redressal framework.`,
      gradientBg: 'from-[#1e293b] via-[#16202e] to-[#0f172a]',
      icon: PhoneCall,
      link: '/grievance-redressal',
    },
    {
      id: 4,
      title: 'Monthly interest credit',
      body: 'High-yield savings accounts credit interest monthly into your account, accelerating compound growth on daily balances.',
      gradientBg: 'from-[#2e1065] via-[#240c50] to-[#170535]',
      icon: Percent,
      link: '/accounts/everyday-savings',
    },
    {
      id: 5,
      title: 'DICGC insurance protection',
      body: 'All depositor funds across savings, current, and fixed deposits are insured up to ₹5,00,000 under DICGC regulations.',
      gradientBg: 'from-[#981a1d] via-[#751114] to-[#4a0b0d]',
      icon: Landmark,
      link: '/disclosures',
    },
    {
      id: 6,
      title: 'Zero foreclosure penalties',
      body: 'Floating rate retail loans carry transparent zero-prepayment charges, letting you prepay without surprise exit penalties.',
      gradientBg: 'from-[#0c2340] via-[#0b274c] to-[#07162b]',
      icon: Coins,
      link: '/loans',
    },
  ];

  const handlePrevFeature = () => {
    setFeatureIndex((prev) => (prev === 0 ? whyPoints.length - 3 : prev - 1));
  };
  const handleNextFeature = () => {
    setFeatureIndex((prev) => (prev >= whyPoints.length - 3 ? 0 : prev + 1));
  };

  // -------------------------------------------------------------------------
  // 4. FINANCIAL CALCULATORS MATH (Part E)
  // -------------------------------------------------------------------------
  const emiOutput = useMemo(() => {
    return calculateEMI(emiAmount, emiRate, emiTenureYears * 12);
  }, [emiAmount, emiRate, emiTenureYears]);

  const fdOutput = useMemo(() => {
    // Determine rate from standard grid
    let rate = 6.95;
    if (fdTenureMonths < 12) rate = 6.05;
    else if (fdTenureMonths <= 24) rate = 6.85;
    else if (fdTenureMonths <= 36) rate = 6.95;
    else if (fdTenureMonths <= 60) rate = 6.90;
    else rate = 6.75;
    try {
      const res = calculateFD({
        principal: fdAmount,
        annualRatePct: rate,
        tenureMonths: fdTenureMonths,
        seniorCitizen: isSenior,
      });
      return {
        maturity: res.maturityValue,
        interest: res.interestEarned,
        rateAppliedPct: res.rateAppliedPct,
      };
    } catch {
      return { maturity: fdAmount, interest: 0, rateAppliedPct: rate };
    }
  }, [fdAmount, fdTenureMonths, isSenior]);

  const rdOutput = useMemo(() => {
    try {
      const res = calculateRD({
        monthlyDeposit: rdMonthly,
        annualRatePct: 7.0,
        tenureMonths: rdTenureMonths,
      });
      return {
        totalDeposited: res.totalDeposited,
        maturity: res.maturityValue,
        interest: res.interestEarned,
      };
    } catch {
      return { totalDeposited: rdMonthly * rdTenureMonths, maturity: rdMonthly * rdTenureMonths, interest: 0 };
    }
  }, [rdMonthly, rdTenureMonths]);

  const savingsOutput = useMemo(() => {
    const monthlyCredit = Math.round(savingsBal * (7.0 / 1200));
    const annualCompound = Math.round(savingsBal * (Math.pow(1 + 7.0 / 1200, 12) - 1));
    return { monthlyCredit, annualCompound };
  }, [savingsBal]);

  const sipOutput = useMemo(() => {
    try {
      const res = calculateSIP({
        monthlyInvestment: sipMonthly,
        expectedReturnPct: sipRate,
        tenureMonths: sipYears * 12,
      });
      return {
        invested: res.totalInvested,
        gain: res.estimatedGain,
        maturity: res.maturityValue,
      };
    } catch {
      return { invested: sipMonthly * sipYears * 12, gain: 0, maturity: sipMonthly * sipYears * 12 };
    }
  }, [sipMonthly, sipRate, sipYears]);

  return (
    <div className="min-h-screen bg-white">
      {/* ====================================================================== */}
      {/* PART B: HOMEPAGE HERO CAROUSEL (~70vh, dark, CSS/SVG 3D scenes) */}
      {/* ====================================================================== */}
      <section
        className={`relative w-full overflow-hidden bg-gradient-to-r ${currentSlide.bgGradient} text-white transition-colors duration-700 -mt-18 pt-24 pb-28 sm:pb-32`}
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        aria-label="FinEdge Highlight Carousel"
      >
        {/* Full-bleed Realistic Image Background with Scrim Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            key={currentSlide.id}
            src={currentSlide.heroImage}
            alt=""
            className="w-full h-full object-cover object-right"
          />
          {/* Scrim Overlay: heaviest on left copy zone, easing towards subject on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 via-45% to-black/30 lg:from-black/95 lg:via-black/75 lg:via-50% lg:to-black/20" />
          {/* Mobile full-coverage scrim for 100% contrast when text stacks over visual */}
          <div className="absolute inset-0 bg-black/50 sm:bg-transparent" />
        </div>

        <div className="idfc-container relative z-10 min-h-[460px] flex flex-col justify-between">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
            {/* Copy Left (~45-50%, vertically centred, left-aligned) */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-white/10 text-white border border-white/20 backdrop-blur-xs">
                {currentSlide.category}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-white leading-[1.18] tracking-tight">
                {currentSlide.headline}
              </h1>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                {currentSlide.subline}
              </p>

              {/* CTA Row: ONE solid red pill CTA + ONE white "Know More" text link beside it */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button
                  onClick={() => handleApplyClick(currentSlide.product)}
                  variant="primary"
                  size="lg"
                  className="shadow-lg shadow-red-950/60"
                >
                  {currentSlide.ctaText}
                </Button>
                <Link
                  to={getProductRoute(currentSlide.product)}
                  className="text-white hover:underline text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Know More</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual Right (~50%, bleeding to the edge) */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              {currentSlide.renderVisual()}
            </div>
          </div>

          {/* Controls: bottom-left, quiet white-on-dark (chevron, dots, chevron) */}
          <div className="flex items-center gap-4 pt-4 pb-2 z-20">
            <button
              onClick={() => setHeroSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Previous hero slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    heroSlide === idx ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setHeroSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1))}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Next hero slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* PART C: PRODUCT TABS + COLOUR-BLOCK CARDS (Overlapping Hero) */}
      {/* ====================================================================== */}
      <section id="product-tabs" className="relative z-20 bg-white pb-20 pt-0">
        <div className="idfc-container -mt-14 sm:-mt-16">
          {/* Frosted Glass Tab Bar: white ~65% opacity, backdrop blur, rounded-t-2xl, centered */}
          <div className="bg-white/75 backdrop-blur-md border border-white/60 shadow-lg rounded-2xl p-1.5 mb-8">
            <div className="flex items-center justify-start md:justify-center gap-1 overflow-x-auto no-scrollbar" role="tablist">
              {[
                { id: 'popular', label: 'Popular', icon: Sparkles },
                { id: 'accounts', label: 'Accounts', icon: Wallet },
                { id: 'loans', label: 'Loans', icon: HandCoins },
                { id: 'cards', label: 'Cards', icon: CreditCard },
                { id: 'investments', label: 'Investments', icon: TrendingUp },
                { id: 'calculators', label: 'Calculators', icon: Calculator },
              ].map((tab, idx) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <React.Fragment key={tab.id}>
                    {idx > 0 && <div className="h-6 w-px bg-gray-200/60 hidden md:block" />}
                    <button
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id === 'calculators') {
                          const el = document.getElementById('calculators-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={`relative flex flex-col sm:flex-row items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-white shadow-xs text-gray-950 font-bold'
                          : 'text-gray-600 hover:text-gray-950 hover:bg-white/40'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#981a1d]' : 'text-gray-500'}`} />
                      <span>{tab.label}</span>
                      {isSelected && (
                        <span className="absolute bottom-0 left-4 right-4 h-1 bg-[#981a1d] rounded-full" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 3 Cards Per Row: FLAT COLOUR block per category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabProducts.map(({ product, category, colorClass }) => {
              const Icon =
                category === 'account'
                  ? ACCOUNT_ICONS[product.slug] || Wallet
                  : category === 'loan'
                  ? LOAN_ICONS[product.slug] || HandCoins
                  : category === 'card'
                  ? CreditCard
                  : INVESTMENT_ICONS[product.slug] || TrendingUp;

              const applyLabel = getApplyButtonLabel(product);

              return (
                <div
                  key={product.slug}
                  className={`relative overflow-hidden rounded-2xl ${colorClass} text-white p-7 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between min-h-[320px]`}
                >
                  {/* Top content */}
                  <div className="relative z-10 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">
                        {product.category || category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold backdrop-blur-xs">
                        {product.slug === 'fixed-deposit'
                          ? 'Up to 7.45% p.a.'
                          : product.slug === 'recurring-deposit'
                          ? 'Up to 6.55% p.a.'
                          : product.slug === 'sukanya-samriddhi'
                          ? '8.05% p.a.'
                          : product.rateFact || (typeof product.rate === 'number' ? `${product.rate.toFixed(2)}% p.a.` : product.rate) || (product.rateMin ? `From ${product.rateMin.toFixed(2)}% p.a.` : (product.category === 'account' ? accountRateFact(product) : 'Flagship'))}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white leading-snug">
                      {shortProductName(product.name)}
                    </h3>

                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed line-clamp-3">
                      {product.tagline || product.overview}
                    </p>
                  </div>

                  {/* Actions: bottom-left, white outline pill CTA + white underline Know more */}
                  <div className="relative z-10 pt-6 mt-auto flex items-center justify-between border-t border-white/15">
                    <button
                      type="button"
                      onClick={() => handleApplyClick(product)}
                      className="border border-white text-white hover:bg-white hover:text-gray-950 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                    >
                      {applyLabel}
                    </button>

                    <Link
                      to={getProductRoute(product)}
                      className="text-white hover:text-white/90 text-xs sm:text-sm font-semibold underline underline-offset-4 decoration-white/60 hover:decoration-white transition-colors"
                    >
                      Know more
                    </Link>
                  </div>

                  {/* Large white lucide line icon at bottom-right, deliberately cropped by card edge */}
                  <Icon
                    className="absolute -bottom-6 -right-6 w-36 h-36 text-white/10 pointer-events-none select-none"
                    strokeWidth={1.2}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* PART D: "WHY FINEDGE" FEATURE CAROUSEL (White Background) */}
      {/* ====================================================================== */}
      <section className="bg-white py-20 sm:py-24 border-t border-gray-100" aria-label="Why FinEdge Features">
        <div className="idfc-container">
          {/* Header Row: Left-aligned H2 + grey sub-line; Right: Know more -> + black circular arrows */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl sm:text-[34px] font-bold text-gray-900 text-left leading-snug">
                Why FinEdge Bank
              </h2>
              <p className="text-[15px] sm:text-base text-gray-600 mt-2">
                Banking built on verified published terms, complete transparency, and upfront truth.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                to="/disclosures"
                className="text-sm font-semibold text-[#981a1d] hover:underline inline-flex items-center gap-1"
              >
                <span>Know more</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevFeature}
                  className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                  aria-label="Previous features"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextFeature}
                  className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                  aria-label="Next features"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3 visible cards horizontally */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyPoints.slice(featureIndex, featureIndex + 3).map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.id}
                  className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  {/* Rich SVG Geometric Banner with Frosted Glass Badge */}
                  <div className={`relative overflow-hidden bg-gradient-to-r ${point.gradientBg} h-32 flex items-center justify-between px-6 text-white select-none`}>
                    {/* SVG Guilloche & Dot Matrix Texture */}
                    <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`pat-${point.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                          <circle cx="3" cy="3" r="1.5" fill="#ffffff" />
                          <path d="M 0 24 L 24 0 M 0 0 L 24 24" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.4" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pat-${point.id})`} />
                    </svg>

                    <div className="relative z-10 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 bg-black/25 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-xs">
                        Pillar 0{point.id}
                      </span>
                    </div>

                    <span className="relative z-10 text-3xl font-black text-white/25 font-mono">
                      0{point.id}
                    </span>
                  </div>

                  {/* Below it: bold H3 title, body, and red Read more arrow link */}
                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">
                        {point.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        {point.body}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <Link
                        to={point.link}
                        className="text-xs sm:text-sm font-semibold text-[#981a1d] hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Read more</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* PART E: CALCULATORS SECTION (Light Grey #f5f6f7 Background) */}
      {/* ====================================================================== */}
      <section id="calculators-section" className="bg-[#f5f6f7] py-20 sm:py-24 border-t border-gray-200/60" aria-label="Financial Calculators">
        <div className="idfc-container">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-[34px] font-bold text-gray-900 leading-snug">
              Financial Calculators
            </h2>
            <p className="text-[15px] sm:text-base text-gray-600 mt-2">
              Plan your finances with verifiable mathematical models built to statutory compounding standards.
            </p>
          </div>

          {/* ONE Wide White Card (~14px/16px radius, soft shadow), split left/right */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-10">
            {/* Calculator Tabs on Top of the Card */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-gray-100 no-scrollbar" role="tablist">
              {[
                { id: 'emi', label: 'Home Loan EMI' },
                { id: 'fd', label: 'Fixed Deposit (FD)' },
                { id: 'rd', label: 'Recurring Deposit (RD)' },
                { id: 'savings', label: 'Savings Compounding' },
                { id: 'sip', label: 'SIP Wealth Growth' },
              ].map((tab) => {
                const isSelected = calcTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setCalcTab(tab.id)}
                    className={`relative pb-3 px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                      isSelected ? 'text-[#981a1d]' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isSelected && (
                      <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#981a1d] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Split Left (55%) / Right (45%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Input Box ABOVE Slider */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. EMI Controls */}
                {calcTab === 'emi' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Loan Amount</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          ₹ {formatINRWhole(emiAmount)}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="500000"
                        max="10000000"
                        step="50000"
                        value={emiAmount}
                        onChange={(e) => setEmiAmount(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>₹5 Lakhs</span>
                        <span>₹1 Crore</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Interest Rate (% p.a.)</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {emiRate.toFixed(2)} %
                        </div>
                      </div>
                      <input
                        type="range"
                        min="6.5"
                        max="15.0"
                        step="0.05"
                        value={emiRate}
                        onChange={(e) => setEmiRate(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>6.50%</span>
                        <span>15.00%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Tenure (Years)</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {emiTenureYears} Years
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="1"
                        value={emiTenureYears}
                        onChange={(e) => setEmiTenureYears(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>1 Year</span>
                        <span>30 Years</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FD Controls */}
                {calcTab === 'fd' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Deposit Amount</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          ₹ {formatINRWhole(fdAmount)}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="2000000"
                        step="10000"
                        value={fdAmount}
                        onChange={(e) => setFdAmount(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>₹10,000</span>
                        <span>₹20 Lakhs</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Tenure (Months)</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {fdTenureMonths} Months
                        </div>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="120"
                        step="1"
                        value={fdTenureMonths}
                        onChange={(e) => setFdTenureMonths(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>3 Months</span>
                        <span>120 Months (10 Yrs)</span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-700 font-medium">
                      <input
                        type="checkbox"
                        checked={isSenior}
                        onChange={(e) => setIsSenior(e.target.checked)}
                        className="rounded accent-[#981a1d] w-4 h-4"
                      />
                      <span>Senior Citizen (+0.50% p.a. benefit)</span>
                    </label>
                  </div>
                )}

                {/* 3. RD Controls */}
                {calcTab === 'rd' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Monthly Installment</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          ₹ {formatINRWhole(rdMonthly)}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="50000"
                        step="500"
                        value={rdMonthly}
                        onChange={(e) => setRdMonthly(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>₹500 / month</span>
                        <span>₹50,000 / month</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Tenure (Months)</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {rdTenureMonths} Months
                        </div>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="120"
                        step="6"
                        value={rdTenureMonths}
                        onChange={(e) => setRdTenureMonths(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>6 Months</span>
                        <span>120 Months</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Savings Compounding Controls */}
                {calcTab === 'savings' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Average Savings Balance</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          ₹ {formatINRWhole(savingsBal)}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="1000000"
                        step="10000"
                        value={savingsBal}
                        onChange={(e) => setSavingsBal(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>₹10,000</span>
                        <span>₹10 Lakhs</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Calculated at peak 7.00% p.a. interest rate credited monthly on daily end-of-day balances.
                    </p>
                  </div>
                )}

                {/* 5. SIP Controls */}
                {calcTab === 'sip' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Monthly SIP Amount</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          ₹ {formatINRWhole(sipMonthly)}
                        </div>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="50000"
                        step="500"
                        value={sipMonthly}
                        onChange={(e) => setSipMonthly(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>₹500 / month</span>
                        <span>₹50,000 / month</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Expected Annual Return</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {sipRate.toFixed(1)} %
                        </div>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="20"
                        step="0.5"
                        value={sipRate}
                        onChange={(e) => setSipRate(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>5.0%</span>
                        <span>20.0%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Investment Horizon</label>
                        <div className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 bg-gray-50">
                          {sipYears} Years
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="1"
                        value={sipYears}
                        onChange={(e) => setSipYears(Number(e.target.value))}
                        className="idfc-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
                        <span>1 Year</span>
                        <span>30 Years</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Result Panel with LARGE BOLD RED headline */}
              <div className="lg:col-span-5 bg-[#fbfcfd] border border-gray-200/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6">
                <div>
                  {/* Supporting comparison lines in grey */}
                  {calcTab === 'emi' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                        <span>Principal Borrowed:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(emiAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-100">
                        <span>Total Interest Payable:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(emiOutput.totalInterest)}</strong>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Estimated Monthly EMI</span>
                        <div className="text-3xl sm:text-4xl font-black text-[#981a1d] tracking-tight mt-1 font-mono">
                          ₹ {formatINRWhole(emiOutput.emi)}
                        </div>
                      </div>
                    </>
                  )}

                  {calcTab === 'fd' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                        <span>Principal Deposited:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(fdAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-100">
                        <span>Total Interest Accrued:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(fdOutput.interest)}</strong>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Maturity Corpus</span>
                        <div className="text-3xl sm:text-4xl font-black text-[#981a1d] tracking-tight mt-1 font-mono">
                          ₹ {formatINRWhole(fdOutput.maturity)}
                        </div>
                      </div>
                    </>
                  )}

                  {calcTab === 'rd' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                        <span>Total Deposited:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(rdOutput.totalDeposited)}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-100">
                        <span>Total Interest:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(rdOutput.interest)}</strong>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Maturity Amount</span>
                        <div className="text-3xl sm:text-4xl font-black text-[#981a1d] tracking-tight mt-1 font-mono">
                          ₹ {formatINRWhole(rdOutput.maturity)}
                        </div>
                      </div>
                    </>
                  )}

                  {calcTab === 'savings' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                        <span>Daily Average Balance:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(savingsBal)}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-100">
                        <span>Estimated Annual Interest:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(savingsOutput.annualCompound)}</strong>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Monthly Credit to Account</span>
                        <div className="text-3xl sm:text-4xl font-black text-[#981a1d] tracking-tight mt-1 font-mono">
                          ₹ {formatINRWhole(savingsOutput.monthlyCredit)}
                        </div>
                      </div>
                    </>
                  )}

                  {calcTab === 'sip' && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                        <span>Invested Capital:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(sipOutput.invested)}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-100">
                        <span>Estimated Capital Gain:</span>
                        <strong className="text-gray-900 font-mono">₹ {formatINRWhole(sipOutput.gain)}</strong>
                      </div>
                      <div className="mt-4">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Expected Future Corpus</span>
                        <div className="text-3xl sm:text-4xl font-black text-[#981a1d] tracking-tight mt-1 font-mono">
                          ₹ {formatINRWhole(sipOutput.maturity)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Mini red bar-chart graphic */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                      <div className="bg-[#981a1d] h-full" style={{ width: '65%' }} />
                      <div className="bg-slate-400 h-full" style={{ width: '35%' }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#981a1d]" /> Principal / Base
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Interest / Gain
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section CTA Pill + Disclaimer Link */}
                <div className="pt-2 flex flex-col gap-3">
                  <Button
                    as={Link}
                    to="/calculators"
                    variant="primary"
                    size="md"
                    className="w-full text-center shadow-sm"
                  >
                    Open Full Financial Calculators Suite
                  </Button>
                  <p className="text-[11px] text-gray-400 text-center leading-normal">
                    Mathematical model estimation. Final rates subject to credit assessment and terms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* PART F: DIGITAL BANKING / APP BAND (Pale Blush #fdecec Background) */}
      {/* ====================================================================== */}
      <section className="bg-[#fdecec] py-20 sm:py-24 border-t border-red-100/60" aria-label="Digital Banking">
        <div className="idfc-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy: H2 + subline + red text link */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-[#981a1d]/10 text-[#981a1d]">
                INSTANT ONLINE BANKING
              </span>
              <h2 className="text-3xl sm:text-[36px] font-bold text-gray-950 leading-snug">
                Digital banking made effortless &amp; secure
              </h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                Manage your accounts, transfer funds with instant IMPS/NEFT, create fixed deposits in seconds, and track all service requests from our unified NetBanking platform.
              </p>
              <div className="pt-2">
                <Link
                  to="/portal/login"
                  className="text-[#981a1d] font-bold text-sm sm:text-base hover:underline inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Log in to NetBanking Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: Phone mockup built in CSS showing stylized FinEdge dashboard */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-68 sm:w-76 rounded-[40px] bg-slate-950 p-3 shadow-2xl border-4 border-slate-800 relative select-none">
                {/* Phone Speaker/Camera Notch */}
                <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                </div>

                {/* Stylized Screen Contents */}
                <div className="bg-white rounded-[32px] p-4 text-gray-900 space-y-3.5 shadow-inner">
                  {/* Header inside phone */}
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-md bg-[#981a1d] text-white font-black text-xs flex items-center justify-center">
                        FE
                      </span>
                      <span className="font-extrabold text-xs tracking-tight">FinEdge NetBanking</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  </div>

                  {/* Balance Widget inside phone */}
                  <div className="bg-[#981a1d] text-white rounded-2xl p-4 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold text-white/70">Total Net Balance</span>
                    <div className="text-2xl font-black font-mono">₹ 15,79,500.00</div>
                    <span className="text-[10px] text-white/80 block">Everyday Savings •••• 1234</span>
                  </div>

                  {/* Quick Action Tiles */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-gray-700">
                    <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl">
                      <ArrowRight className="w-4 h-4 mx-auto text-[#981a1d] mb-1" />
                      Send
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl">
                      <TrendingUp className="w-4 h-4 mx-auto text-[#981a1d] mb-1" />
                      Invest
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl">
                      <FileText className="w-4 h-4 mx-auto text-[#981a1d] mb-1" />
                      History
                    </div>
                  </div>

                  {/* Recent Activity Line */}
                  <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 text-[11px] space-y-1">
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Monthly Interest Credit</span>
                      <span className="text-emerald-600">+₹755.42</span>
                    </div>
                    <div className="text-[10px] text-gray-400">Compounded 7.00% p.a.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row of 3 Access Tiles Below */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 pt-12 border-t border-red-200/50">
            <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-6 border border-red-100 space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#981a1d]/10 text-[#981a1d] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Customer NetBanking</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                24/7 web portal access for fund transfers, term deposits, and statement downloads.
              </p>
              <div className="pt-2">
                <Link to="/portal/login" className="text-xs font-bold text-[#981a1d] hover:underline inline-flex items-center gap-1">
                  Log In →
                </Link>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-6 border border-red-100 space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#981a1d]/10 text-[#981a1d] flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">One-Click Demo Access</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Experience simulated customer workflows and bank manager operations immediately.
              </p>
              <div className="pt-2">
                <Link to="/portal/login" className="text-xs font-bold text-[#981a1d] hover:underline inline-flex items-center gap-1">
                  Demo Login →
                </Link>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-6 border border-red-100 space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#981a1d]/10 text-[#981a1d] flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Direct Support Helpline</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Toll-free customer care at 1800 267 4100 with transparent Grievance Redressal.
              </p>
              <div className="pt-2">
                <Link to="/grievance-redressal" className="text-xs font-bold text-[#981a1d] hover:underline inline-flex items-center gap-1">
                  Get Help →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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

export default HomePage;
