import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ZoomIn, ZoomOut, Type } from 'lucide-react';

export const AccessibilityBar = () => {
  const { textSize, setTextSize, letterSpacing, cycleLetterSpacing } = useAccessibility();

  return (
    <div className="bg-[#F5F5F5] border-b border-[#E2E5EA] py-1 text-xs text-gray-600 transition-standard">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-500">
          <span>RBI Licensed Scheduled Commercial Bank</span>
          <span>•</span>
          <span className="text-green-700 font-medium">DICGC Insured up to ₹5 Lakhs</span>
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
