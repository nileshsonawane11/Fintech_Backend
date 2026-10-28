import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '../components/common/UIComponents';
import { ApplyModal } from '../components/common/ApplyModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Percent, 
  CreditCard, 
  Home, 
  Briefcase, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  Award, 
  Sparkles, 
  HelpCircle, 
  Smartphone, 
  ChevronDown, 
  CheckCircle2,
  Lock,
  Zap,
  Star,
  UserCheck,
  PhoneCall,
  Check,
  ExternalLink,
  SlidersHorizontal,
  Building2,
  FileCheck2,
  Compass,
  Headphones
} from 'lucide-react';
import { ACCOUNTS_DATA, LOANS_DATA, CARDS_DATA, INVESTMENTS_DATA, FAQS_DATA } from '../data/bankingData';

export const HomePage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('popular');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);

  // Interactive Loan Calculator state
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [loanTenure, setLoanTenure] = useState(20);
  const loanRate = 8.45; // 8.45% p.a.

  // Calculate EMI
  const monthlyRate = loanRate / (12 * 100);
  const totalMonths = loanTenure * 12;
  const calculatedEmi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );
  const totalRepayable = calculatedEmi * totalMonths;
  const totalInterest = totalRepayable - loanAmount;

  // 3-Slide Campaign Carousel Data (Grounded in Verified FinEdge Products)
  const heroSlides = [
    {
      id: 'everyday-banking',
      eyebrow: 'BANKING THAT MOVES WITH YOU',
      title: 'Your Money. Your Goals. Your Future.',
      description: 'Experience a simpler, smarter way to manage everyday banking with zero charges on 28+ daily services and monthly interest compounding.',
      primaryCta: 'Open an Account',
      secondaryCta: 'Explore Banking',
      secondaryLink: '/accounts',
      productRef: ACCOUNTS_DATA[0],
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
      badgeText: 'Flagship Savings',
      highlightBadge: {
        title: 'Monthly Interest Credited',
        value: '+₹ 1,658.00',
        subtitle: 'Credited directly on the 1st of every month'
      },
      pills: ['Zero Paperwork Video KYC', 'High-Yield up to 7.00% p.a.', 'RBI Licensed Bank']
    },
    {
      id: 'savings-goals',
      eyebrow: 'WEALTH & COMPOUNDING',
      title: 'Make Room for What Matters.',
      description: 'Explore high-yield savings and guaranteed fixed deposits designed around your family milestones with monthly interest credited directly to your ledger.',
      primaryCta: 'Explore Savings',
      secondaryCta: 'View Interest Rates',
      secondaryLink: '/accounts#savings',
      productRef: ACCOUNTS_DATA[0],
      imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80',
      badgeText: 'Wealth Architecture',
      highlightBadge: {
        title: 'Annual Compounding Yield',
        value: '7.00% p.a.',
        subtitle: 'Senior Citizen FD up to 7.75% p.a.'
      },
      pills: ['Quarterly Compounding FDs', 'Instant Digital Booking', 'DICGC Insured up to ₹5L']
    },
    {
      id: 'cards-convenience',
      eyebrow: 'BESPOKE LUXURY & REWARDS',
      title: 'Your Banking, Always Within Reach.',
      description: 'Discover Ashva Stainless-Steel Metal Cards with 0% forex markup worldwide, instant biometric app controls, and unlimited airport lounge privileges.',
      primaryCta: 'Explore Cards',
      secondaryCta: 'Compare Benefits',
      secondaryLink: '/cards',
      productRef: CARDS_DATA[0],
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
      badgeText: 'Ashva Metal Credit',
      highlightBadge: {
        title: 'Zero Forex Markup Worldwide',
        value: '0% Forex',
        subtitle: 'Unlimited domestic lounge access'
      },
      pills: ['Precision Stainless Steel', 'Instant Virtual Card', 'One-Tap Lock & Limits']
    }
  ];

  // Auto-slide effect (gentle 8-second interval, pauses on hover or interaction)
  useEffect(() => {
    if (isAutoPlayPaused) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoPlayPaused, heroSlides.length]);

  const handleApplyClick = (product) => {
    setSelectedProduct(product || ACCOUNTS_DATA[0]);
    setIsApplyModalOpen(true);
  };

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
  };

  const currentSlide = heroSlides[carouselIndex];

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#1C1B1F] font-sans selection:bg-[#9D1D27]/10 selection:text-[#9D1D27]">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION — PREMIUM IMAGE-LED SPLIT CAROUSEL */}
      {/* ========================================================================= */}
      <section 
        className="relative bg-gradient-to-b from-[#F7F8FA] to-white border-b border-[#E8ECF2] overflow-hidden"
        onMouseEnter={() => setIsAutoPlayPaused(true)}
        onMouseLeave={() => setIsAutoPlayPaused(false)}
        aria-label="FinEdge Bank Featured Campaigns"
      >
        {/* Subtle Architectural Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#1C1B1F 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left 55%: Editorial Copy & Action Deck */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Eyebrow Badge */}
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#9D1D27]/10 text-[#9D1D27] border border-[#9D1D27]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D1D27] animate-pulse" />
                  {currentSlide.eyebrow}
                </span>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">
                  Scheduled Commercial Bank
                </span>
              </div>

              {/* Editorial Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1B1F] tracking-tight leading-[1.08] transition-all duration-500">
                {currentSlide.title}
              </h1>

              {/* Reassuring Subtitle */}
              <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed font-normal">
                {currentSlide.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Button
                  onClick={() => handleApplyClick(currentSlide.productRef)}
                  variant="primary"
                  size="lg"
                  className="bg-[#9D1D27] hover:bg-[#80141D] text-white font-bold px-7 py-3.5 text-sm shadow-md hover:shadow-lg transition-all rounded-xl"
                >
                  {currentSlide.primaryCta}
                  <ArrowRight className="w-4 h-4 ml-2 inline-block" />
                </Button>

                <Link to={currentSlide.secondaryLink}>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-black font-bold px-6 py-3.5 text-sm rounded-xl"
                  >
                    {currentSlide.secondaryCta}
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators Strip */}
              <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-gray-500 font-semibold border-t border-gray-200/80">
                {currentSlide.pills.map((pill, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pill}</span>
                  </div>
                ))}
              </div>

              {/* Accessible Slide Controllers & Progress Bars */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  {heroSlides.map((slide, idx) => {
                    const isActive = carouselIndex === idx;
                    return (
                      <button
                        key={slide.id}
                        onClick={() => setCarouselIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isActive 
                            ? 'w-10 bg-[#9D1D27]' 
                            : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Switch to slide ${idx + 1}: ${slide.badgeText}`}
                        aria-current={isActive ? 'true' : 'false'}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrevSlide}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:border-gray-500 hover:bg-white text-gray-700 flex items-center justify-center transition-colors shadow-xs"
                    aria-label="Previous Campaign Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleNextSlide}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:border-gray-500 hover:bg-white text-gray-700 flex items-center justify-center transition-colors shadow-xs"
                    aria-label="Next Campaign Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-gray-400 ml-1">
                    0{carouselIndex + 1} / 0{heroSlides.length}
                  </span>
                </div>
              </div>

            </div>

            {/* Right 45%: Large Lifestyle Photography with Floating Status Cards on Perimeter */}
            <div className="lg:col-span-5 relative flex justify-center py-4">
              
              {/* Outer Glow Halo */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#9D1D27]/10 via-amber-500/5 to-transparent rounded-[2.5rem] blur-2xl pointer-events-none" />

              <div className="relative w-full max-w-md lg:max-w-lg">
                
                {/* Main Hero Photograph Frame - Clean, Unobstructed Image */}
                <div className="relative aspect-[4/4.8] sm:aspect-[4/4.5] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 bg-gray-100 group">
                  <img
                    key={currentSlide.imageUrl}
                    src={currentSlide.imageUrl}
                    alt={`FinEdge Bank Customer — ${currentSlide.title}`}
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement.classList.add('bg-gradient-to-br', 'from-[#0B132B]', 'via-[#1C2541]', 'to-[#3A506B]');
                    }}
                  />
                  {/* Subtle edge vignette at the very bottom border only */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>

                {/* Floating Metric Card: Positioned at bottom-left corner outside the photo subject */}
                <div className="absolute -bottom-5 -left-3 sm:-left-6 max-w-[220px] sm:max-w-[240px] bg-white rounded-2xl p-4 shadow-xl border border-gray-100 z-20 animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                      {currentSlide.highlightBadge.title}
                    </span>
                  </div>
                  <div className="text-xl font-black text-[#1C1B1F] tracking-tight">
                    {currentSlide.highlightBadge.value}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight font-medium">
                    {currentSlide.highlightBadge.subtitle}
                  </p>
                </div>

                {/* Floating Product Badge: Positioned at top-right corner on perimeter */}
                <div className="absolute -top-3 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2.5 z-20">
                  <div className="w-6 h-6 rounded-lg bg-[#9D1D27] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    FE
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {currentSlide.badgeText}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 inline" /> 100% Paperless KYC
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CATEGORY QUICK SWITCHER STRIP */}
      {/* ========================================================================= */}
      <nav className="bg-white border-b border-[#E2E5EA] sticky top-16 z-30 shadow-xs" aria-label="Product Categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3.5 scrollbar-none" role="tablist">
            {[
              { id: 'popular', label: 'Curated Highlights', icon: Sparkles },
              { id: 'accounts', label: 'Savings & Current Accounts', icon: Percent },
              { id: 'loans', label: 'Home & Personal Loans', icon: Home },
              { id: 'cards', label: 'Credit & Debit Cards', icon: CreditCard },
              { id: 'investments', label: 'Fixed Deposits & Wealth', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#9D1D27] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. BENCHMARK PRODUCT SHOWCASE (WITH PHOTOGRAPHY THUMBNAILS) */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#9D1D27] uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Benchmark Financial Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1C1B1F] tracking-tight mt-1">
              Thoughtfully Engineered Banking Products
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Transparent terms, zero surprise fees, and industry-leading compounding rates built for Indian households and enterprises.
            </p>
          </div>

          <Link 
            to={activeTab === 'popular' ? '/accounts' : `/${activeTab}`} 
            className="text-xs sm:text-sm font-bold text-[#9D1D27] hover:underline inline-flex items-center gap-1 group self-start md:self-end"
          >
            <span>View All {activeTab.toUpperCase()}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* --- TAB 1: CURATED HIGHLIGHTS --- */}
        {activeTab === 'popular' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: FIRST High-Yield Savings */}
            <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img 
                    src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80" 
                    alt="Family Financial Planning with FIRST Savings"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-[#9D1D27] shadow-sm">
                      High Yield Compounding
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 text-white text-xs font-bold">
                    Savings Account
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-[#1C1B1F]">FIRST Savings Account</h3>
                    <span className="text-sm font-extrabold text-[#9D1D27]">Up to 7.00%</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Monthly compounding interest credited directly to your balance. Enjoy zero fees across 28+ daily retail services.
                  </p>
                  
                  <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 text-xs text-[#9D1D27] font-semibold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Monthly Interest Credit Cycle</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Unlimited Free Domestic ATM Withdrawals</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center gap-3 border-t border-gray-100 mt-4">
                <Button onClick={() => handleApplyClick(ACCOUNTS_DATA[0])} variant="primary" size="sm" className="w-full bg-[#9D1D27] hover:bg-[#80141D] text-white font-bold py-2.5 rounded-xl">
                  Open Account
                </Button>
                <Link to="/accounts#savings" className="w-full">
                  <Button variant="outline" size="sm" className="w-full font-bold py-2.5 rounded-xl border-gray-300">
                    Know More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 2: Dream Home Loan */}
            <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img 
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80" 
                    alt="Couple enjoying contemporary dream home"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-[#0288D1] shadow-sm">
                      Zero Foreclosure
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 text-white text-xs font-bold">
                    Home Loans
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-[#1C1B1F]">Dream Home Loan</h3>
                    <span className="text-sm font-extrabold text-[#0288D1]">From 8.45%</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Digital in-principle sanction in 48 hours, tenure up to 30 years, and zero prepayment penalties on floating rates.
                  </p>
                  
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-[#0288D1] font-semibold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Sanction up to ₹10 Crores</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Pradhan Mantri Awas Yojana (PMAY) Eligible</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center gap-3 border-t border-gray-100 mt-4">
                <Button onClick={() => handleApplyClick(LOANS_DATA[0])} variant="primary" size="sm" className="w-full bg-[#0288D1] hover:bg-[#0277BD] text-white font-bold py-2.5 rounded-xl">
                  Check Eligibility
                </Button>
                <Link to="/loans#home-loan" className="w-full">
                  <Button variant="outline" size="sm" className="w-full font-bold py-2.5 rounded-xl border-gray-300">
                    Know More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 3: Ashva Metal Credit Card */}
            <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative h-48 overflow-hidden bg-gray-900">
                  <img 
                    src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80" 
                    alt="Ashva Metal Credit Card Luxury"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                      Stainless Steel Metal
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 text-white text-xs font-bold">
                    Credit Cards
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-[#1C1B1F]">Ashva Metal Card</h3>
                    <span className="text-sm font-extrabold text-amber-600">0% Forex</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Forged in aerospace-grade stainless steel with zero foreign currency transaction fees and unlimited airport lounge access.
                  </p>
                  
                  <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 font-semibold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Zero Markup on Global Currencies</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>5X to 10X Accelerated Reward Points</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center gap-3 border-t border-gray-100 mt-4">
                <Button onClick={() => handleApplyClick(CARDS_DATA[0])} variant="primary" size="sm" className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl">
                  Apply for Card
                </Button>
                <Link to="/cards#ashva-metal" className="w-full">
                  <Button variant="outline" size="sm" className="w-full font-bold py-2.5 rounded-xl border-gray-300">
                    Know More
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: ACCOUNTS --- */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ACCOUNTS_DATA.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-[#9D1D27] bg-red-50 px-2.5 py-1 rounded-md">
                      {item.interestRate}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.tagline}</p>
                  
                  <ul className="text-xs text-gray-600 space-y-2 pt-2 border-t border-gray-100">
                    {item.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-2">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full bg-[#9D1D27] hover:bg-[#80141D] text-white font-bold rounded-xl py-2.5">
                    Open Account
                  </Button>
                  <Link to={`/accounts#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full font-bold rounded-xl py-2.5 border-gray-300">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 3: LOANS --- */}
        {activeTab === 'loans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {LOANS_DATA.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-[#0288D1] bg-blue-50 px-2.5 py-1 rounded-md">
                      {item.interestRate}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.tagline}</p>
                  
                  <div className="bg-blue-50/60 p-3 rounded-xl text-xs text-blue-950 font-semibold space-y-1">
                    <div>Cap: {item.maxAmount}</div>
                    <div className="text-gray-500 font-normal">Tenure: {item.tenure}</div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-2">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full bg-[#0288D1] hover:bg-[#0277BD] text-white font-bold rounded-xl py-2.5">
                    Apply Now
                  </Button>
                  <Link to={`/loans#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full font-bold rounded-xl py-2.5 border-gray-300">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 4: CARDS --- */}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CARDS_DATA.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                      {item.tier}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.tagline}</p>
                  
                  <div className="bg-gray-100 p-3 rounded-xl text-xs text-gray-900 font-semibold">
                    Annual Fee: {item.annualFee}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-2">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl py-2.5">
                    Apply for Card
                  </Button>
                  <Link to={`/cards#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full font-bold rounded-xl py-2.5 border-gray-300">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 5: INVESTMENTS --- */}
        {activeTab === 'investments' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {INVESTMENTS_DATA.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      {item.rate}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.tagline}</p>
                  
                  <div className="bg-emerald-50/60 p-3 rounded-xl text-xs text-emerald-950 font-semibold">
                    Term: {item.tenure}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-2">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl py-2.5">
                    Book Deposit
                  </Button>
                  <Link to={`/investments#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full font-bold rounded-xl py-2.5 border-gray-300">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* ========================================================================= */}
      {/* 4. THE FINEDGE DIGITAL BANKING & MOBILE APP SHOWCASE */}
      {/* ========================================================================= */}
      <section className="bg-white border-y border-[#E2E5EA] py-16 md:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left 6 Columns: Digital Banking Value Pillars */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Next-Gen Indian Digital Banking</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-[#1C1B1F] tracking-tight leading-tight">
                High-Performance Banking, Crafted for Seamless Daily Flow.
              </h2>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Experience full-spectrum banking engineered for instantaneous response. From paperless video onboarding to biometric instant card locking, manage your complete financial footprint without visiting a branch.
              </p>

              {/* 4 Key Digital Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-gray-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#9D1D27]/10 text-[#9D1D27] flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1B1F]">3-Min Paperless Video KYC</h4>
                  <p className="text-xs text-gray-500">Live Aadhaar OTP and facial liveness verification from home.</p>
                </div>

                <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-gray-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1B1F]">One-Tap Card Freeze</h4>
                  <p className="text-xs text-gray-500">Toggle ATM limits, international usage, and instant hotlisting.</p>
                </div>

                <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-gray-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1B1F]">Monthly Compounding</h4>
                  <p className="text-xs text-gray-500">Interest computed daily and credited monthly for rapid growth.</p>
                </div>

                <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-gray-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1B1F]">ISO 27001 Security</h4>
                  <p className="text-xs text-gray-500">256-bit bank encryption and multi-factor hardware security modules.</p>
                </div>

              </div>

              <div className="pt-2 flex items-center gap-4">
                <Link to="/portal/login">
                  <Button variant="primary" size="md" className="bg-[#9D1D27] text-white font-bold px-6 py-3 rounded-xl">
                    Launch NetBanking Terminal
                  </Button>
                </Link>
                <Link to="/accounts" className="text-xs font-bold text-gray-600 hover:text-black flex items-center gap-1">
                  View Digital Schedule of Charges →
                </Link>
              </div>
            </div>

            {/* Right 6 Columns: Interactive Mobile Banking Mockup Preview */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-slate-800 relative">
                
                {/* Phone Notch */}
                <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-900" />
                </div>

                {/* Account Summary Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Primary Savings</span>
                    <div className="text-2xl font-black text-white">₹ 2,84,500.00</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    FE
                  </div>
                </div>

                {/* Digital Card Preview */}
                <div className="bg-gradient-to-r from-[#9D1D27] to-[#5C0D13] rounded-2xl p-4 shadow-lg mb-6 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-bold tracking-widest uppercase text-white/90">Ashva Metal</span>
                    <span className="text-xs font-mono font-bold text-amber-300">0% FOREX</span>
                  </div>
                  <div className="font-mono text-sm tracking-wider text-white mb-2">•••• •••• •••• 1234</div>
                  <div className="flex justify-between items-end text-[10px] text-white/80">
                    <span>VIKRAMADITYA SHARMA</span>
                    <span>EXP 12/30</span>
                  </div>
                </div>

                {/* Quick Action Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mb-6">
                  <div className="p-2.5 bg-slate-800/80 rounded-xl hover:bg-slate-700 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                    <span>Send Money</span>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl hover:bg-slate-700 transition-colors">
                    <Percent className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                    <span>Fixed Deposit</span>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl hover:bg-slate-700 transition-colors">
                    <Lock className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                    <span>Card Freeze</span>
                  </div>
                </div>

                {/* Live Monthly Compounding Feed */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Monthly Interest Ledger</span>
                    <span className="text-emerald-400 font-bold">+7.00% p.a.</span>
                  </div>
                  <div className="text-xs font-bold text-white flex justify-between">
                    <span>Interest Credited (Oct)</span>
                    <span className="text-emerald-400">+₹ 1,658.00</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE HOME LOAN EMI & FINANCIAL PLANNING STRIP */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-br from-[#1C1B1F] via-[#2A181B] to-[#1C1B1F] text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left 6 Columns: Loan Calculator Sliders */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                  Instant Eligibility & EMI Estimator
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-1">
                  Plan Your Dream Home with Total Transparency
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
                  Benchmark rates starting at 8.45% p.a. with zero prepayment penalty for floating rate borrowers.
                </p>
              </div>

              {/* Slider 1: Loan Amount */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-300">Desired Loan Amount</span>
                  <span className="text-amber-400 text-sm font-mono font-black">
                    ₹ {(loanAmount / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="50000000"
                  step="500000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>₹ 5 Lakhs</span>
                  <span>₹ 2.5 Crores</span>
                  <span>₹ 5 Crores</span>
                </div>
              </div>

              {/* Slider 2: Loan Tenure */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-300">Loan Tenure</span>
                  <span className="text-amber-400 text-sm font-mono font-black">
                    {loanTenure} Years
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>5 Years</span>
                  <span>15 Years</span>
                  <span>30 Years</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Link to="/calculators">
                  <Button variant="outlineWhite" className="border-gray-500 font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-white hover:text-black">
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 inline-block" />
                    Open Detailed Multi-Product Calculator Suite →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right 5 Columns: Output Summary Card */}
            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20 text-center space-y-5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-300 block">
                Estimated Monthly Repayment (EMI)
              </span>

              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-400 font-mono tracking-tight">
                ₹ {calculatedEmi.toLocaleString('en-IN')}
                <span className="text-xs text-gray-300 font-normal"> / month</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left pt-3 border-t border-white/10 text-xs">
                <div className="p-3 bg-black/30 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Principal Amount</span>
                  <span className="text-white font-bold font-mono">₹ {loanAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-black/30 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Interest Rate</span>
                  <span className="text-emerald-400 font-bold font-mono">8.45% p.a.</span>
                </div>
              </div>

              <Button
                onClick={() => handleApplyClick(LOANS_DATA[0])}
                variant="primary"
                size="lg"
                className="w-full bg-[#9D1D27] hover:bg-[#80141D] text-white font-bold text-sm py-3.5 rounded-xl shadow-lg"
              >
                Apply for Home Loan with this EMI
              </Button>

              <p className="text-[10px] text-gray-400">
                Final rate subject to CIBIL evaluation and property valuation.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRUST, SECURITY & REGULATORY PILLARS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#9D1D27]">
            Institutional Assurance
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1C1B1F] tracking-tight">
            Security and Protection Backed by Sovereign Frameworks
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Every transaction, rupee, and data record is guarded under rigorous regulatory standards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-3 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#9D1D27]/10 text-[#9D1D27] flex items-center justify-center font-black">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C1B1F]">RBI Licensed Commercial Bank</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Regulated by the Reserve Bank of India under the Banking Regulation Act, 1949 with strict capital adequacy ratios (CRAR &gt; 16%).
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-3 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C1B1F]">DICGC Insured up to ₹5 Lakhs</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every depositor&apos;s principal and accrued interest is covered under statutory DICGC deposit insurance scheme.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-3 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C1B1F]">256-Bit Bank Grade Encryption</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Certified ISO 27001 data center infrastructure with end-to-end TLS 1.3 tokenization and hardware security modules.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-3 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C1B1F]">24/7 Fraud & Hotlisting Desk</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Continuous transaction anomaly monitoring and immediate one-tap card freeze available on web and mobile.
            </p>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 7. CUSTOMER SUPPORT & DEDICATED ADVISORY DESK */}
      {/* ========================================================================= */}
      <section className="bg-white border-t border-gray-200/80 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-r from-slate-950 via-[#1C2541] to-slate-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
                  Priority Relationship Support
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Have Questions? Our Dedicated Advisory Team is Ready to Assist.
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                  Connect directly with our banking officers for doorstep account services, home loan guidance, and corporate treasury management.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-white">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    <span>Toll Free: 1800 10 888</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-white">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>24/7 Immediate Card Hotlisting</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-start lg:justify-end">
                <Link to="/portal/login">
                  <Button 
                    variant="white" 
                    size="lg" 
                    className="font-extrabold text-sm px-7 py-3.5 rounded-xl shadow-xl hover:bg-white text-[#9D1D27] hover:text-[#7A1620] hover:shadow-2xl transition-all transform hover:-translate-y-0.5 group"
                  >
                    <span>Access Support Desk</span>
                    <ArrowRight className="w-4 h-4 ml-2 inline-block text-[#9D1D27] group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FREQUENTLY ASKED QUESTIONS (FAQS ACCORDION) */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        
        <div className="text-center mb-10 space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-[#9D1D27]">Help & Guidance</span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1C1B1F]">Frequently Asked Questions</h2>
          <p className="text-xs text-gray-500">Transparent answers to daily banking, interest compounding, and onboarding queries.</p>
        </div>

        <div className="space-y-3">
          {FAQS_DATA.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-5 font-bold text-sm text-[#1C1B1F] flex items-center justify-between hover:text-[#9D1D27] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#9D1D27]' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-[#FBFBFC]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* Working Apply Modal Integration */}
      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        product={selectedProduct}
      />

    </div>
  );
};
