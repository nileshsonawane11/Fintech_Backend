import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { ACCOUNTS_DATA, LOANS_DATA, CARDS_DATA, INVESTMENTS_DATA, FAQS_DATA } from '../data/bankingData';

export const HomePage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('popular');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const heroSlides = [
    {
      badge: 'Flagship Wealth Compounding',
      title: 'Monthly interest credits',
      subtitle: 'for faster compounding and continuous savings growth up to 7.00% p.a.',
      ctaText: 'Open Savings Account',
      productRef: ACCOUNTS_DATA[0],
      bgGradient: 'from-[#1C1B1F] via-[#2A1215] to-[#450A0E]',
      statText: '7.00% p.a.',
      statSub: 'Earned & credited monthly'
    },
    {
      badge: 'Guaranteed Returns',
      title: 'Lock in high-yield Fixed Deposits',
      subtitle: 'Earn up to 7.10% p.a. guaranteed returns with quarterly compounding safety.',
      ctaText: 'Book Fixed Deposit',
      productRef: INVESTMENTS_DATA[0],
      bgGradient: 'from-[#1C1B1F] via-[#1E293B] to-[#0F172A]',
      statText: '7.10% p.a.',
      statSub: 'Senior citizens get 7.60%'
    },
    {
      badge: 'Bespoke Luxury',
      title: 'Ashva & Mayura Metal Cards',
      subtitle: 'Precision crafted stainless-steel credit cards with zero forex markup worldwide.',
      ctaText: 'Explore Metal Cards',
      productRef: CARDS_DATA[0],
      bgGradient: 'from-[#1C1B1F] via-[#292524] to-[#1C1917]',
      statText: '0% Forex',
      statSub: 'Unlimited lounge access'
    }
  ];

  const handleApplyClick = (product) => {
    setSelectedProduct(product);
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
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 1. Hero Carousel */}
      <section className={`relative text-white overflow-hidden bg-gradient-to-r ${currentSlide.bgGradient} transition-colors duration-700 py-16 md:py-24`}>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 border border-white/20 text-white backdrop-blur-xs">
                {currentSlide.badge}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                {currentSlide.title}
              </h1>
              <p className="text-base md:text-lg text-gray-300 max-w-xl leading-relaxed">
                {currentSlide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  onClick={() => handleApplyClick(currentSlide.productRef)}
                  variant="primary"
                  size="lg"
                  className="shadow-lg shadow-red-950/40"
                >
                  {currentSlide.ctaText}
                </Button>
                <Link to={currentSlide.productRef?.category === 'Loans' ? '/loans' : currentSlide.productRef?.category === 'Cards' ? '/cards' : currentSlide.productRef?.category === 'Investments' ? '/investments' : '/accounts'}>
                  <Button variant="outlineWhite" size="lg">
                    Know More
                  </Button>
                </Link>
              </div>

              {/* Slider Controls */}
              <div className="flex items-center gap-4 pt-6">
                <div className="flex items-center gap-1.5">
                  {heroSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        carouselIndex === idx ? 'w-8 bg-[#9D1D27]' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-white/60 ml-2">
                  <button 
                    onClick={handlePrevSlide} 
                    className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleNextSlide} 
                    className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Stat Card (3D Simulated Visual) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center shadow-2xl relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#9D1D27] to-amber-500 flex items-center justify-center text-white shadow-lg text-3xl font-black">
                  ₹
                </div>
                <div className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                  {currentSlide.statText}
                </div>
                <p className="text-sm text-gray-300 font-medium mb-6">
                  {currentSlide.statSub}
                </p>
                <div className="bg-black/30 rounded-xl p-3 border border-white/10 text-xs text-gray-300 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>100% Paperless Digital Onboarding</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Category Tabs Strip */}
      <section className="bg-white border-b border-[#E2E5EA] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar" role="tablist">
            {[
              { id: 'popular', label: 'Popular Products', icon: Sparkles },
              { id: 'accounts', label: 'Accounts', icon: Percent },
              { id: 'loans', label: 'Loans', icon: Home },
              { id: 'cards', label: 'Credit Cards', icon: CreditCard },
              { id: 'investments', label: 'Investments', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-standard ${
                    isActive
                      ? 'bg-[#9D1D27] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Dynamic Products Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-[#9D1D27] uppercase tracking-wider">Curated Financial Suite</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1C1B1F] mt-1">
              Explore Our Benchmark Products
            </h2>
          </div>
          <Link to={activeTab === 'popular' ? '/accounts' : `/${activeTab}`} className="text-sm font-bold text-[#9D1D27] hover:underline flex items-center gap-1">
            View All in this category <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tab 1: Popular Highlight Grid */}
        {activeTab === 'popular' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Savings */}
            <Card hoverEffect className="p-6 flex flex-col justify-between border-t-4 border-t-[#9D1D27]">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="crimson">High Yield</Badge>
                  <span className="text-xs font-bold text-gray-500">Savings</span>
                </div>
                <h3 className="text-xl font-bold text-[#1C1B1F] mb-1">FIRST Savings Account</h3>
                <p className="text-xs text-gray-600 mb-4">Monthly compounding with interest credit up to 7.00% p.a. & zero charges on 28+ services.</p>
                <div className="bg-red-50/60 rounded-lg p-3 text-xs text-[#9D1D27] font-semibold mb-4">
                  Rate: Up to 7.00% p.a. • Zero Minimum for Salary
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button onClick={() => handleApplyClick(ACCOUNTS_DATA[0])} variant="primary" size="sm" className="w-full">
                  Apply Now
                </Button>
                <Link to="/accounts#savings" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">Know More</Button>
                </Link>
              </div>
            </Card>

            {/* Card 2: Home Loan */}
            <Card hoverEffect className="p-6 flex flex-col justify-between border-t-4 border-t-[#0288D1]">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="blue">Zero Foreclosure</Badge>
                  <span className="text-xs font-bold text-gray-500">Loans</span>
                </div>
                <h3 className="text-xl font-bold text-[#1C1B1F] mb-1">Dream Home Loan</h3>
                <p className="text-xs text-gray-600 mb-4">Fast in-principle sanction in 48 hours, tenure up to 30 years and attractive balance transfer.</p>
                <div className="bg-blue-50/60 rounded-lg p-3 text-xs text-[#0288D1] font-semibold mb-4">
                  Rates from 8.45% p.a. • Up to ₹10 Crores
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button onClick={() => handleApplyClick(LOANS_DATA[0])} variant="primary" size="sm" className="w-full">
                  Apply Now
                </Button>
                <Link to="/loans#home-loan" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">Know More</Button>
                </Link>
              </div>
            </Card>

            {/* Card 3: Metal Card */}
            <Card hoverEffect className="p-6 flex flex-col justify-between border-t-4 border-t-[#1C1B1F]">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="dark">Metal Luxury</Badge>
                  <span className="text-xs font-bold text-gray-500">Credit Cards</span>
                </div>
                <h3 className="text-xl font-bold text-[#1C1B1F] mb-1">Ashva Metal Credit Card</h3>
                <p className="text-xs text-gray-600 mb-4">Precision stainless steel card with 0% forex markup and unlimited domestic lounge access.</p>
                <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-900 font-semibold mb-4">
                  0% Forex Markup • 5X - 10X Points
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button onClick={() => handleApplyClick(CARDS_DATA[0])} variant="primary" size="sm" className="w-full">
                  Apply Now
                </Button>
                <Link to="/cards#ashva-metal" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">Know More</Button>
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Accounts */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ACCOUNTS_DATA.slice(0, 3).map((item) => (
              <Card key={item.id} hoverEffect className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="crimson" className="mb-2">{item.interestRate}</Badge>
                  <h3 className="text-lg font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 mb-4">{item.tagline}</p>
                  <ul className="text-xs text-gray-600 space-y-1.5 mb-4">
                    {item.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full">Apply</Button>
                  <Link to={`/accounts#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab 3: Loans */}
        {activeTab === 'loans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LOANS_DATA.slice(0, 3).map((item) => (
              <Card key={item.id} hoverEffect className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="blue" className="mb-2">{item.interestRate}</Badge>
                  <h3 className="text-lg font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 mb-4">{item.tagline}</p>
                  <div className="bg-blue-50/50 p-2.5 rounded-lg text-xs font-semibold text-blue-900 mb-4">
                    Max: {item.maxAmount} • Tenure: {item.tenure}
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full">Apply</Button>
                  <Link to={`/loans#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab 4: Cards */}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CARDS_DATA.slice(0, 3).map((item) => (
              <Card key={item.id} hoverEffect className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="dark" className="mb-2">{item.tier}</Badge>
                  <h3 className="text-lg font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 mb-4">{item.tagline}</p>
                  <div className="bg-gray-100 p-2.5 rounded-lg text-xs font-semibold text-gray-900 mb-4">
                    Fee: {item.annualFee}
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full">Apply</Button>
                  <Link to={`/cards#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab 5: Investments */}
        {activeTab === 'investments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INVESTMENTS_DATA.slice(0, 3).map((item) => (
              <Card key={item.id} hoverEffect className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="gold" className="mb-2">{item.rate}</Badge>
                  <h3 className="text-lg font-bold text-[#1C1B1F]">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 mb-4">{item.tagline}</p>
                  <div className="bg-amber-50 p-2.5 rounded-lg text-xs font-semibold text-amber-900 mb-4">
                    Tenure: {item.tenure}
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button onClick={() => handleApplyClick(item)} variant="primary" size="sm" className="w-full">Invest</Button>
                  <Link to={`/investments#${item.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 4. Calculator Quick Teaser Strip */}
      <section className="bg-gradient-to-br from-[#1C1B1F] to-[#25243B] text-white py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Financial Planning Suite</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                Instant Interactive Calculators for Loans, FDs, and SIPs
              </h2>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                Plan your EMIs, evaluate maturity corpus, and see your wealth compound in real-time. Calculate your Home Loan, Car Loan, and SIP targets with exact mathematical precision.
              </p>
            </div>
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <Link to="/calculators">
                <Button variant="white" size="lg" className="font-bold">
                  Open All Calculators →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQs Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-[#9D1D27] uppercase tracking-wider">Help & Clarifications</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1C1B1F] mt-1">Frequently Asked Questions</h2>
          <p className="text-xs text-gray-500 mt-1">Clear answers to your daily banking and account inquiries.</p>
        </div>

        <div className="space-y-3">
          {FAQS_DATA.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-5 font-bold text-sm text-[#1C1B1F] flex items-center justify-between hover:text-[#9D1D27] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#9D1D27]' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};
