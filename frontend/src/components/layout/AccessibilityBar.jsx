import React from 'react';

export const AccessibilityBar = () => {
  return (
    <div className="bg-midnight-950 border-b border-midnight-900 py-1.5 text-xs text-porcelain-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-porcelain-300">
          <span className="hidden sm:inline">FinEdge Bank — Demonstration Banking Platform</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-gold-300 font-medium">Clear rates &amp; honest banking</span>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs">
          <span className="text-porcelain-400 hidden sm:inline">Toll-Free Helpline:</span>
          <a href="tel:18002674100" className="text-gold-300 font-semibold hover:text-gold-200 transition-colors min-h-[44px] inline-flex items-center py-1">
            1800 267 4100
          </a>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityBar;
