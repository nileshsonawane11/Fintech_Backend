import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ZoomIn, ZoomOut, Type } from 'lucide-react';

import { Link } from 'react-router-dom';

export const AccessibilityBar = () => {
  const { textSize, setTextSize, letterSpacing, cycleLetterSpacing } = useAccessibility();

  return (
    <div className="bg-[#F5F5F5] border-b border-[#E2E5EA] py-1 text-xs text-gray-600 transition-standard">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-gray-500">
          <span className="hidden md:inline">RBI Licensed Scheduled Commercial Bank</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden sm:inline text-green-700 font-medium">DICGC Insured up to ₹5 Lakhs</span>
          <span className="hidden sm:inline">•</span>
          <Link
            to="/manager/login"
            className="px-2 py-0.5 rounded bg-[#1C2541] hover:bg-[#0B132B] text-cyan-300 hover:text-white font-bold flex items-center gap-1 border border-[#3A506B]/50 transition-colors"
          >
            🛡️ Staff Terminal ↗
          </Link>
        </div>

        <div className="flex items-center gap-5 ml-auto">
          {/* Font Size */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Text sizing">
            <span className="font-medium text-gray-500 mr-1">Text size:</span>
            {['s', 'm', 'l'].map((size) => (
              <button
                key={size}
                onClick={() => setTextSize(size)}
                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] transition-colors ${
                  textSize === size
                    ? 'bg-[#1C1B1F] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                aria-pressed={textSize === size}
                aria-label={`Set text size to ${size.toUpperCase()}`}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="h-3 w-px bg-gray-300" />

          {/* Letter Spacing */}
          <div className="flex items-center gap-1" role="group" aria-label="Letter spacing">
            <span className="font-medium text-gray-500 mr-1 flex items-center gap-0.5">
              <Type className="w-3 h-3" /> Spacing:
            </span>
            <button
              onClick={() => cycleLetterSpacing('decrease')}
              className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 font-bold"
              aria-label="Decrease letter spacing"
            >
              −
            </button>
            <button
              onClick={() => cycleLetterSpacing('increase')}
              className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 font-bold"
              aria-label="Increase letter spacing"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
