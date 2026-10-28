import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, PhoneCall, Mail, MapPin, ExternalLink, QrCode } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#1C1B1F] text-gray-300 pt-16 pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Disclaimer & Security Strip */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#9D1D27]/20 border border-[#9D1D27]/40 flex items-center justify-center text-[#9D1D27] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Regulatory Notice & DICGC Insurance</h4>
              <p className="text-xs text-gray-400 mt-0.5 max-w-2xl">
                FinEdge Bank is a scheduled commercial bank governed under the Banking Regulation Act, 1949. All depositor funds are insured up to ₹5,00,000 under the Deposit Insurance and Credit Guarantee Corporation (DICGC).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-gray-400">Security:</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 text-xs font-mono text-gray-300 border border-gray-700">PCI-DSS 4.0</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-800 text-xs font-mono text-gray-300 border border-gray-700">256-Bit TLS</span>
          </div>
        </div>

        {/* 5-Column Sitemap Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Accounts */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
              Accounts & Deposits
            </h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/accounts#savings" className="hover:text-white transition-colors">Savings Account (7% p.a.)</Link></li>
              <li><Link to="/accounts#salary" className="hover:text-white transition-colors">Corporate Salary Account</Link></li>
              <li><Link to="/accounts#current" className="hover:text-white transition-colors">Business Current Account</Link></li>
              <li><Link to="/accounts#student" className="hover:text-white transition-colors">Student Youth Account</Link></li>
              <li><Link to="/accounts#minor" className="hover:text-white transition-colors">Minor FIRST Step Account</Link></li>
              <li><Link to="/investments#fixed-deposit" className="hover:text-white transition-colors">Fixed Deposits (7.10% p.a.)</Link></li>
              <li><Link to="/investments#recurring-deposit" className="hover:text-white transition-colors">Recurring Deposits</Link></li>
            </ul>
          </div>

          {/* Col 2: Loans */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
              Lending & Finance
            </h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/loans#home-loan" className="hover:text-white transition-colors">Dream Home Loan</Link></li>
              <li><Link to="/loans#business-loan" className="hover:text-white transition-colors">MSME Business Loan</Link></li>
              <li><Link to="/loans#agri-loan" className="hover:text-white transition-colors">Kisan & Agriculture Loan</Link></li>
              <li><Link to="/loans#auto-loan" className="hover:text-white transition-colors">New & Used Car Loan</Link></li>
              <li><Link to="/loans#gold-loan" className="hover:text-white transition-colors">Instant Gold Loan (20 Min)</Link></li>
              <li><Link to="/loans#lap-loan" className="hover:text-white transition-colors">Loan Against Property</Link></li>
              <li><Link to="/loans#education-loan" className="hover:text-white transition-colors">Overseas Education Loan</Link></li>
            </ul>
          </div>

          {/* Col 3: Cards & Wealth */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
              Cards & Wealth
            </h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/cards#ashva-metal" className="hover:text-white transition-colors">Ashva Metal Credit Card</Link></li>
              <li><Link to="/cards#mayura-metal" className="hover:text-white transition-colors">Mayura Metal Luxury</Link></li>
              <li><Link to="/cards#first-millennia" className="hover:text-white transition-colors">FIRST Millennia Lifetime Free</Link></li>
              <li><Link to="/cards#first-wow" className="hover:text-white transition-colors">FIRST WOW! FD-Backed Card</Link></li>
              <li><Link to="/investments#sip" className="hover:text-white transition-colors">Direct Mutual Fund SIPs</Link></li>
              <li><Link to="/investments#ssy" className="hover:text-white transition-colors">Sukanya Samriddhi (SSY)</Link></li>
            </ul>
          </div>

          {/* Col 4: Calculators */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
              Financial Calculators
            </h5>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link to="/calculators" className="hover:text-white transition-colors">Home Loan EMI Calculator</Link></li>
              <li><Link to="/calculators" className="hover:text-white transition-colors">Personal Loan EMI Calculator</Link></li>
              <li><Link to="/calculators" className="hover:text-white transition-colors">Fixed Deposit Calculator</Link></li>
              <li><Link to="/calculators" className="hover:text-white transition-colors">Recurring Deposit Calculator</Link></li>
              <li><Link to="/calculators" className="hover:text-white transition-colors">Savings Interest Calculator</Link></li>
              <li><Link to="/calculators" className="hover:text-white transition-colors">SIP Wealth Compounding</Link></li>
            </ul>
          </div>

          {/* Col 5: Support & App */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
              Support & Portal
            </h5>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-[#9D1D27]" />
                <span>1800 10 888 (Toll Free)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#9D1D27]" />
                <span>support@finedge.bank.in</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#9D1D27] shrink-0 mt-0.5" />
                <span>FinEdge Towers, BKC, Bandra East, Mumbai - 400051</span>
              </div>

              <div className="pt-2">
                <Link
                  to="/portal/login"
                  className="w-full text-center py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold block transition-colors border border-gray-700"
                >
                  Customer NetBanking
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 FinEdge Bank Limited. All Rights Reserved. CIN: L65110MH2014PLC083619</p>
          <div className="flex flex-wrap gap-4">
            <span className="hover:text-gray-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-300 cursor-pointer">Terms & Conditions</span>
            <span className="hover:text-gray-300 cursor-pointer">RBI Disclosures</span>
            <span className="hover:text-gray-300 cursor-pointer">Grievance Redressal</span>
            <span className="hover:text-gray-300 cursor-pointer">Fair Practice Code</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
