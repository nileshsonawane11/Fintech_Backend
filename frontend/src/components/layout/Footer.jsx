import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Header';

export const Footer = () => {
  return (
    <footer className="bg-midnight-950 text-porcelain-200 mt-auto border-t border-midnight-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 text-[13px] leading-relaxed text-porcelain-200/80">
            A demonstration digital bank with original products, slab-based qualified rates, and honest operational controls. Deposits and loan approvals in this prototype are simulated.
          </p>
        </div>
        <nav aria-label="Products">
          <h3 className="mb-3 text-[13px] font-semibold text-porcelain-50">Products</h3>
          <ul className="space-y-2 text-[13px]">
            <li><Link className="transition-colors hover:text-gold-300" to="/accounts">Accounts</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/cards">Cards</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/loans">Loans</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/investments">Investments</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/calculators">Calculators</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h3 className="mb-3 text-[13px] font-semibold text-porcelain-50">Legal &amp; Trust</h3>
          <ul className="space-y-2 text-[13px]">
            <li><Link className="transition-colors hover:text-gold-300" to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/terms-and-conditions">Terms &amp; Conditions</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/disclosures">Disclosures</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/grievance-redressal">Grievance Redressal</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/fair-practice-code">Fair Practice Code</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/schedule-of-charges">Schedule of Charges</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="mb-3 text-[13px] font-semibold text-porcelain-50">Reach Us &amp; Access</h3>
          <ul className="space-y-2 text-[13px]">
            <li><a className="transition-colors hover:text-gold-300" href="tel:18002674100">Toll free: 1800 267 4100</a></li>
            <li><span className="text-porcelain-300">Mon–Sat, 9:00 AM – 7:00 PM IST</span></li>
            <li className="pt-2"><Link className="transition-colors text-gold-300 hover:text-gold-200" to="/portal/login">Customer NetBanking Portal →</Link></li>
            <li><Link className="transition-colors text-porcelain-400 hover:text-porcelain-200" to="/manager/login">Bank Staff Operations Terminal →</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-porcelain-50/10">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 py-4 text-xs text-porcelain-300 sm:px-6">
          <p>© {new Date().getFullYear()} FinEdge Bank. All rights reserved. Fictional prototype for technical evaluation.</p>
          <div className="flex gap-4">
            <Link to="/disclosures" className="hover:text-gold-300">Regulatory Disclosures</Link>
            <Link to="/privacy-policy" className="hover:text-gold-300">Privacy &amp; Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
