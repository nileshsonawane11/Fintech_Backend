import React from 'react';

/**
 * ConfirmationCheckmark — Module 35 Fix 4: Shared confirmation choreography.
 * - Single SVG check draws itself once: stroke draw, 600ms, house easing cubic-bezier(0.22, 1, 0.36, 1).
 * - Accent token stroke (success/emerald/gold).
 * - Under prefers-reduced-motion: animation is disabled and stroke is fully drawn instantly.
 */
export function ConfirmationCheckmark({ size = 56, className = '' }) {
  return (
    <div
      className={`animate-scale-in inline-flex items-center justify-center rounded-full bg-success-50 text-success-600 border border-success-600/20 shadow-xs ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.54)}
        height={Math.round(size * 0.54)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-success-600"
      >
        <path
          className="check-stroke-draw"
          d="M20 6L9 17L4 12"
        />
      </svg>
    </div>
  );
}

export default ConfirmationCheckmark;
