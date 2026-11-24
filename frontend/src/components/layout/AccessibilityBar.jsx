import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FINEDGE_RATES_CONFIG } from '../../data/ratesConfig.js';
import { FD } from '../../data/products.js';

export const AccessibilityBar = () => {
  const location = useLocation();
  const isPersonal = location.pathname === '/' || !location.pathname.startsWith('/accounts');
  const topFdRate = Math.max(...(FD.rateGrid || []).map((r) => r.senior));

  return (
    <div className="bg-white border-b border-gray-100 py-1.5 text-xs text-gray-500">
      <div className="idfc-container flex items-center justify-between">
        {/* Left: Segment links (Personal / Business) - existing routes only */}
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/"
            className={`font-semibold transition-colors ${
              isPersonal ? 'text-[#981a1d] font-bold' : 'text-gray-500 hover:text-[#981a1d]'
            }`}
          >
            Personal
          </Link>
          <span className="text-gray-300" aria-hidden>|</span>
          <Link
            to="/accounts"
            className={`transition-colors ${
              !isPersonal ? 'text-[#981a1d] font-bold' : 'text-gray-500 hover:text-[#981a1d]'
            }`}
          >
            Business
          </Link>
        </div>

        {/* Right: Interest-rate snapshot & Trust links - quiet style, existing routes */}
        <div className="flex items-center gap-3 ml-auto text-xs">
          <div className="hidden lg:flex items-center gap-2 text-gray-500">
            <span>Savings up to <strong className="text-[#981a1d] font-semibold">{FINEDGE_RATES_CONFIG.savings.peakRate}</strong></span>
            <span className="text-gray-300" aria-hidden>•</span>
            <span>FD up to <strong className="text-[#981a1d] font-semibold">{topFdRate.toFixed(2)}% p.a.</strong></span>
            <span className="text-gray-300 mx-1" aria-hidden>|</span>
          </div>

          <Link to="/grievance-redressal" className="text-gray-500 hover:text-[#981a1d] transition-colors">
            Help
          </Link>
          <span className="text-gray-300" aria-hidden>|</span>
          <Link to="/disclosures" className="text-gray-500 hover:text-[#981a1d] transition-colors">
            Safe Banking
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityBar;
