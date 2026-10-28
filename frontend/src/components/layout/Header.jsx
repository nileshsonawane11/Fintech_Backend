import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessibilityBar } from './AccessibilityBar';
import { 
  Search, 
  Lock, 
  Menu, 
  X, 
  ChevronDown, 
  CreditCard, 
  Landmark, 
  ShieldAlert, 
  Calculator, 
  PhoneCall, 
  ArrowUpRight,
  TrendingUp,
  Percent,
  UserCheck
} from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null); // 'accounts', 'loans', 'cards', 'investments'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [odometerIndex, setOdometerIndex] = useState(0);

  // Rotating customer support topics
  const odometerItems = [
    'Customer Care: 1800 10 888',
    'Locate 900+ Branches',
    'Raise Instant Service Request',
    'Doorstep Senior Banking',
    'WhatsApp Banking: Hi to 95555'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setOdometerIndex(prev => (prev + 1) % odometerItems.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [odometerItems.length]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('loan')) navigate('/loans');
    else if (q.includes('card')) navigate('/cards');
    else if (q.includes('fd') || q.includes('invest') || q.includes('sip')) navigate('/investments');
    else if (q.includes('calc') || q.includes('emi')) navigate('/calculators');
    else navigate('/accounts');
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-[#E2E5EA]">
      {/* Accessibility Sub-bar */}
      <AccessibilityBar />

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Category Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-[#9D1D27] flex items-center justify-center text-white font-black text-xl shadow-xs group-hover:bg-[#7A1620] transition-colors">
                FE
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-[#1C1B1F]">FinEdge</span>
                <span className="text-[10px] uppercase font-bold text-[#9D1D27] block -mt-1 tracking-widest">Bank</span>
              </div>
            </Link>

            {/* Desktop Navigation Links with Mega Menus */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
              <div 
                className="relative"
                onMouseEnter={() => setActiveMegaMenu('accounts')}
                onMouseLeave={() => setActiveMegaMenu(null)}
              >
                <Link
                  to="/accounts"
                  className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors ${
                    activeMegaMenu === 'accounts' ? 'text-[#9D1D27] bg-red-50/50' : 'text-gray-800 hover:text-[#9D1D27]'
                  }`}
                >
                  Accounts <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Link>

                {/* Accounts Mega Menu */}
                {activeMegaMenu === 'accounts' && (
                  <div className="absolute top-full left-0 w-80 bg-white shadow-xl rounded-xl border border-gray-100 p-4 grid gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">Account Varieties</span>
                    <Link to="/accounts#savings" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3 transition-colors">
                      <div className="p-1.5 rounded-md bg-red-100/60 text-[#9D1D27]">
                        <Percent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Savings Account</div>
                        <p className="text-xs text-gray-500">Up to 7.00% monthly interest credit</p>
                      </div>
                    </Link>
                    <Link to="/accounts#current" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3 transition-colors">
                      <div className="p-1.5 rounded-md bg-gray-100 text-gray-900">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Business Current Account</div>
                        <p className="text-xs text-gray-500">BRAVO Auto-Sweep & zero fee services</p>
                      </div>
                    </Link>
                    <Link to="/accounts#salary" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3 transition-colors">
                      <div className="p-1.5 rounded-md bg-blue-100 text-blue-800">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Corporate Salary Account</div>
                        <p className="text-xs text-gray-500">Zero balance with free executive card</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <div 
                className="relative"
                onMouseEnter={() => setActiveMegaMenu('loans')}
                onMouseLeave={() => setActiveMegaMenu(null)}
              >
                <Link
                  to="/loans"
                  className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors ${
                    activeMegaMenu === 'loans' ? 'text-[#9D1D27] bg-red-50/50' : 'text-gray-800 hover:text-[#9D1D27]'
                  }`}
                >
                  Loans <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Link>

                {/* Loans Mega Menu */}
                {activeMegaMenu === 'loans' && (
                  <div className="absolute top-full left-0 w-84 bg-white shadow-xl rounded-xl border border-gray-100 p-4 grid gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">Financing Solutions</span>
                    <Link to="/loans#home-loan" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-red-100/60 text-[#9D1D27]">🏡</div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Dream Home Loan</div>
                        <p className="text-xs text-gray-500">Rates from 8.45% p.a. with zero prepayment fees</p>
                      </div>
                    </Link>
                    <Link to="/loans#business-loan" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-gray-100 text-gray-900">🏢</div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">MSME Business Loan</div>
                        <p className="text-xs text-gray-500">Collateral-free funding up to ₹1 Crore</p>
                      </div>
                    </Link>
                    <Link to="/loans#gold-loan" className="p-2 rounded-lg hover:bg-gray-50 flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-amber-100 text-amber-900">🪙</div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Instant Gold Loan</div>
                        <p className="text-xs text-gray-500">20-minute disbursal with bullet repayment</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/cards"
                className="px-3 py-2 rounded-md text-sm font-semibold text-gray-800 hover:text-[#9D1D27] transition-colors"
              >
                Cards
              </Link>

              <Link
                to="/investments"
                className="px-3 py-2 rounded-md text-sm font-semibold text-gray-800 hover:text-[#9D1D27] transition-colors"
              >
                Investments & Deposits
              </Link>

              <Link
                to="/calculators"
                className="px-3 py-2 rounded-md text-sm font-semibold text-gray-800 hover:text-[#9D1D27] flex items-center gap-1 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-[#9D1D27]" /> Calculators
              </Link>
            </nav>
          </div>

          {/* Right Area: Search, Odometer, NetBanking Login */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search products, loans..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`text-xs pl-8 pr-3 py-2 rounded-full border border-gray-300 bg-gray-50 transition-all duration-300 focus:outline-none focus:bg-white focus:border-[#9D1D27] ${
                  searchFocused ? 'w-60 ring-2 ring-[#9D1D27]/20' : 'w-44'
                }`}
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            {/* Support Odometer Ticker */}
            <div className="hidden xl:flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-700 overflow-hidden h-8 w-60 border border-gray-200">
              <PhoneCall className="w-3.5 h-3.5 text-[#9D1D27] shrink-0 mr-2" />
              <div className="transition-all duration-500 font-medium truncate">
                {odometerItems[odometerIndex]}
              </div>
            </div>

            {/* Portal / Login Action */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/portal"
                  className="px-3 py-1.5 rounded-lg bg-[#9D1D27] text-white text-xs font-bold hover:bg-[#7A1620] flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" /> Portal ({user.name.split(' ')[0]})
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/portal/login"
                className="px-4 py-2 rounded-md bg-[#9D1D27] text-white text-xs font-bold hover:bg-[#7A1620] flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" /> NetBanking Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-50"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <div className="space-y-1 text-sm font-semibold">
            <Link
              to="/accounts"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-gray-800 hover:bg-red-50 hover:text-[#9D1D27]"
            >
              Accounts & Deposits
            </Link>
            <Link
              to="/loans"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-gray-800 hover:bg-red-50 hover:text-[#9D1D27]"
            >
              Loans & Credit Lines
            </Link>
            <Link
              to="/cards"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-gray-800 hover:bg-red-50 hover:text-[#9D1D27]"
            >
              Credit & Debit Cards
            </Link>
            <Link
              to="/investments"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-gray-800 hover:bg-red-50 hover:text-[#9D1D27]"
            >
              Investments (SIP, SSY, FD)
            </Link>
            <Link
              to="/calculators"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-gray-800 hover:bg-red-50 hover:text-[#9D1D27]"
            >
              Financial Calculators
            </Link>
          </div>

          <div className="pt-3 border-t border-gray-100">
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/portal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-[#9D1D27] text-white font-bold block"
                >
                  Go to Customer Dashboard
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-center py-2 text-xs text-gray-600 block"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/portal/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-[#9D1D27] text-white font-bold block"
              >
                Log In to NetBanking
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
