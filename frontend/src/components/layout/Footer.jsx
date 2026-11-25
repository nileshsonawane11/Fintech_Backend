import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Header';
import { BRAND, ALL_PRODUCTS } from '../../data/products.js';
import { getContent } from '../../services/api.js';
import {
  ArrowRight,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  Home,
  User,
  Car,
  GraduationCap,
  Coins,
  Building2,
  Briefcase,
  PiggyBank,
  CalendarClock,
  LineChart,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// Product icon mapping for all 21 FinEdge products
const PRODUCT_ICONS = {
  // 5 Accounts
  'everyday-savings': Wallet,
  'salary-privilege': Landmark,
  'senior-citizen-savings': ShieldCheck,
  'student-edge': GraduationCap,
  'business-current': Building2,
  // 7 Loans
  'home-loan': Home,
  'personal-loan': User,
  'vehicle-loan': Car,
  'education-loan': GraduationCap,
  'gold-loan': Coins,
  'loan-against-property': Building2,
  'business-growth-loan': Briefcase,
  // 5 Cards
  'millennia-cashback-credit': CreditCard,
  'travel-elite-credit': CreditCard,
  'classic-debit': CreditCard,
  'platinum-rupay-debit': CreditCard,
  'infinite-metal-credit': CreditCard,
  // 4 Investments
  'fixed-deposit': PiggyBank,
  'recurring-deposit': CalendarClock,
  'systematic-investment-plan': LineChart,
  'sukanya-samriddhi': ShieldCheck,
};

const getProductRoute = (prod) => {
  if (!prod) return '/';
  const cat = prod.category;
  if (cat === 'account') return `/accounts/${prod.slug}`;
  if (cat === 'loan') return `/loans/${prod.slug}`;
  if (cat === 'card') return `/cards/${prod.slug}`;
  if (cat === 'investment') return `/investments/${prod.slug}`;
  return `/products/${prod.slug}`;
};

export const Footer = () => {
  const footer = typeof getContent === 'function' ? getContent('footer') : null;

  // Retrieve products safely
  const products = (ALL_PRODUCTS && ALL_PRODUCTS.length > 0) ? ALL_PRODUCTS : [
    { slug: 'everyday-savings', name: 'Everyday Savings Account', category: 'account' },
    { slug: 'salary-privilege', name: 'Salary Privilege Account', category: 'account' },
    { slug: 'senior-citizen-savings', name: 'Senior Citizen Savings Account', category: 'account' },
    { slug: 'student-edge', name: 'Student Edge Account', category: 'account' },
    { slug: 'business-current', name: 'Business Current Account', category: 'account' },
    { slug: 'home-loan', name: 'Home Loan', category: 'loan' },
    { slug: 'personal-loan', name: 'Personal Loan', category: 'loan' },
    { slug: 'vehicle-loan', name: 'Vehicle Loan', category: 'loan' },
    { slug: 'education-loan', name: 'Education Loan', category: 'loan' },
    { slug: 'gold-loan', name: 'Gold Loan', category: 'loan' },
    { slug: 'loan-against-property', name: 'Loan Against Property', category: 'loan' },
    { slug: 'business-growth-loan', name: 'Business Growth Loan', category: 'loan' },
    { slug: 'millennia-cashback-credit', name: 'Millennia Cashback Credit Card', category: 'card' },
    { slug: 'travel-elite-credit', name: 'Travel Elite Credit Card', category: 'card' },
    { slug: 'classic-debit', name: 'Classic Debit Card', category: 'card' },
    { slug: 'platinum-rupay-debit', name: 'Platinum RuPay Debit Card', category: 'card' },
    { slug: 'infinite-metal-credit', name: 'Infinite Metal Credit Card', category: 'card' },
    { slug: 'fixed-deposit', name: 'Fixed Deposit', category: 'investment' },
    { slug: 'recurring-deposit', name: 'Recurring Deposit', category: 'investment' },
    { slug: 'systematic-investment-plan', name: 'Systematic Investment Plan', category: 'investment' },
    { slug: 'sukanya-samriddhi', name: 'Sukanya Samriddhi Yojana', category: 'investment' },
  ];

  return (
    <footer className="mt-auto bg-[#4a0b0d] text-white">
      {/* =========================================================================
          PART H: PRE-FOOTER "APPLY FOR A PRODUCT" BAND
          Darkest maroon (#4a0b0d), white text, seamless transition into footer.
          Left: Display mission line (white/outline type) + H2 + sub-line.
          Right: 21 FinEdge product rows with icons and right arrows.
      ========================================================================= */}
      <section
        id="pre-footer-apply"
        aria-label="Apply for a product now"
        className="border-b border-white/10 py-16 sm:py-20"
      >
        <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Mission statement and CTA headline */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-red-200/80 mb-2">
                  Direct Application Access
                </p>
                <div
                  className="font-sans font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white/20 select-none uppercase leading-none"
                  style={{
                    WebkitTextStroke: '1px rgba(255, 255, 255, 0.4)',
                    color: 'transparent',
                  }}
                >
                  BANKING WITH A FINER EDGE
                </div>
              </div>

              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Apply for a product now
                </h2>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-red-100/80 max-w-md">
                  Select any product from our full suite below to begin your application or review complete specifications and interest slab schedules.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/portal/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-[#981a1d] font-bold text-sm hover:bg-neutral-100 transition-colors shadow-sm"
                >
                  Sign in to NetBanking
                </Link>
                <Link
                  to="/calculators"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  Explore Calculators
                </Link>
              </div>

              <div className="pt-4 flex items-center gap-6 text-xs text-red-200/70 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>21 Original Products</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Slab-Based Qualified Rates</span>
                </div>
              </div>
            </div>

            {/* Right Column: 21 FinEdge product rows */}
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/15">
                <span className="text-xs font-bold uppercase tracking-wider text-red-200">
                  Full Catalogue ({products.length} Products)
                </span>
                <span className="text-xs text-red-200/60">
                  Accounts · Loans · Cards · Investments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 max-h-[520px] overflow-y-auto pr-2 no-scrollbar">
                {products.map((p) => {
                  const Icon = PRODUCT_ICONS[p.slug] || Wallet;
                  const linkTarget = getProductRoute(p);
                  return (
                    <Link
                      key={p.slug}
                      to={linkTarget}
                      className="group flex items-center justify-between py-2.5 px-3 rounded-lg border-b border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white/90 shrink-0 group-hover:bg-white/20 transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-white/90 group-hover:text-white truncate">
                          {p.name.replace(/^FinEdge\s+/, '')}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:translate-x-1 shrink-0 transition-transform" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN FOOTER COLUMNS
          Continues the same dark red (#4a0b0d).
          4 Columns: About FinEdge, Products, Important Links, Explore / Reach Us.
      ========================================================================= */}
      <div className="idfc-container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: About FinEdge */}
          <div className="space-y-4">
            <Logo light />
            <p className="text-[13px] leading-relaxed text-red-100/75">
              {footer?.brandTagline ||
                'A demonstration digital bank with original products, slab-based qualified rates, and honest operational controls. Deposits and loan approvals in this prototype are simulated.'}
            </p>
            <div className="pt-2 text-xs text-red-200/60 space-y-1">
              <p>Demo IFSC Prefix: <span className="font-mono font-bold text-white">{BRAND.ifscPrefix}</span></p>
              <p>Prototype Mode: Technical Evaluation</p>
            </div>
          </div>

          {/* Column 2: Products */}
          <nav aria-label="Footer Products">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Products
            </h3>
            <ul className="space-y-2.5 text-[13px] text-red-100/80">
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/accounts">
                  Savings &amp; Current Accounts
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/cards">
                  Credit &amp; Debit Cards
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/loans">
                  Retail &amp; Business Loans
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/investments">
                  Fixed Deposits &amp; Investments
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/calculators">
                  Financial Calculators
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3: Important Links (Legal & Trust) */}
          <nav aria-label="Legal and Trust">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Important Links
            </h3>
            <ul className="space-y-2.5 text-[13px] text-red-100/80">
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/terms-and-conditions">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/disclosures">
                  Regulatory Disclosures
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/grievance-redressal">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/fair-practice-code">
                  Fair Practice Code
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-white hover:underline" to="/schedule-of-charges">
                  Schedule of Charges
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 4: Explore / Reach Us */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Explore &amp; Reach Us
            </h3>
            <ul className="space-y-2.5 text-[13px] text-red-100/80">
              <li>
                <a
                  className="transition-colors hover:text-white"
                  href={`tel:${(footer?.supportPhone || '1800 267 4100').replace(/[^0-9+]/g, '')}`}
                >
                  Toll free: <span className="font-semibold text-white">{footer?.supportPhone || '1800 267 4100'}</span>
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-white"
                  href={`mailto:${footer?.supportEmail || BRAND.support.email}`}
                >
                  Email: <span className="text-white underline">{footer?.supportEmail || BRAND.support.email}</span>
                </a>
              </li>
              <li>
                <span className="text-red-200/70 text-xs">{BRAND.support.hours}</span>
              </li>
              <li className="pt-3">
                <Link
                  className="inline-flex items-center gap-1 font-semibold text-white hover:text-red-200 transition-colors"
                  to="/portal/login"
                >
                  Customer NetBanking Portal →
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex items-center gap-1 text-xs text-red-200/70 hover:text-white transition-colors"
                  to="/manager/login"
                >
                  Bank Staff Operations Terminal →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Icons Row */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-red-200/70">Connect with FinEdge:</span>
            <div className="flex items-center gap-2">
              {['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'YouTube'].map((net) => (
                <span
                  key={net}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white hover:bg-white/20 cursor-pointer transition-colors"
                  title={net}
                >
                  {net[0]}
                </span>
              ))}
            </div>
          </div>
          <div className="text-xs text-red-200/60">
            Certified ISO 27001 Simulation · 256-Bit SSL Demo Encryption
          </div>
        </div>

        {/* Bottom Legal Row */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-red-200/70">
          <p>© {new Date().getFullYear()} FinEdge Bank Limited. All rights reserved. Fictional prototype for technical evaluation.</p>
          <div className="flex gap-4">
            <Link to="/disclosures" className="hover:text-white transition-colors">
              Regulatory Disclosures
            </Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy &amp; Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
