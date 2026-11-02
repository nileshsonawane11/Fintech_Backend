import React from 'react';

/**
 * Flagship Edge Gold Debit Card Component (Module 16)
 * True ISO/IEC 7810 ID-1 proportions (1.586 : 1, 400x252 viewBox)
 *
 * Layered with preserve-3d internal depth parallax:
 * - Layer 0 (translateZ(0px)): Base radial midnight surface, fine diagonal brushed texture, restrained gold band, perimeter foil edge
 * - Glare Layer (translateZ(6px)): Softened glare below detail layers
 * - Layer 1 (translateZ(18px)): Embossed card number (•••• •••• •••• 8829), bottom row columns, microtext
 * - Layer 2 (translateZ(28px)): FinEdge Bank emblem & wordmark, EDGE GOLD DEBIT, etched EMV chip, contactless arcs
 * - Layer 3 (translateZ(34px)): Circular gold foil hologram medallion with dynamic hue rotation
 */
export function HeroEdgeGoldCard({
  cardFaceRef,
  glareRef,
  hologramRef,
  shimmerRef,
  className = '',
}) {
  return (
    <div
      ref={cardFaceRef}
      role="img"
      aria-label="Edge Gold Debit Card — flagship debit card artwork"
      className={`relative aspect-[400/252] w-full rounded-[18px] overflow-hidden select-none ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: '0 20px 45px -10px rgba(10, 30, 53, 0.45)',
        transition: 'box-shadow 0.3s ease-out',
      }}
    >
      {/* ============================================================ */}
      {/* LAYER 0: BASE SURFACE (translateZ(0px))                      */}
      {/* Radial depth, brushed metal texture, gold facet, foil border */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: 'translateZ(0px)' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 252"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <defs>
            {/* Soft radial depth gradient: lighter top-left (#152E4D), darker bottom-right (#050F1D) */}
            <radialGradient id="hero-gold-radial-bg" cx="22%" cy="18%" r="95%">
              <stop offset="0%" stopColor="#152E4D" />
              <stop offset="45%" stopColor="#0B1B2C" />
              <stop offset="100%" stopColor="#050F1D" />
            </radialGradient>

            {/* Fine diagonal brushed texture at 3.5% opacity */}
            <pattern
              id="hero-brushed-metal"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.035" />
            </pattern>

            {/* Gold Facet Gradient */}
            <linearGradient id="hero-facet-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#DFBF75" />
              <stop offset="50%" stopColor="#B8933F" />
              <stop offset="100%" stopColor="#8C6D2F" />
            </linearGradient>

            {/* Card Boundary Clip */}
            <clipPath id="hero-card-boundary">
              <rect width="400" height="252" rx="18" />
            </clipPath>
          </defs>

          {/* Base Background */}
          <rect width="400" height="252" rx="18" fill="url(#hero-gold-radial-bg)" />

          {/* Brushed Metal Texture */}
          <rect width="400" height="252" rx="18" fill="url(#hero-brushed-metal)" />

          {/* Catalogue Gold Debit Diagonal Gold Band Identity */}
          <g clipPath="url(#hero-card-boundary)">
            <path d="M400 252 L400 110 L250 252 Z" fill="url(#hero-facet-gold)" opacity="0.18" />
            <path d="M400 90 L230 252 L210 252 L400 70 Z" fill="url(#hero-facet-gold)" opacity="0.08" />
          </g>

          {/* Hairline Gold Foil Edge — 1px inset border, gold at ~45% opacity */}
          <rect
            x="0.75"
            y="0.75"
            width="398.5"
            height="250.5"
            rx="17.25"
            fill="none"
            stroke="#B8933F"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* GLARE LAYER (translateZ(6px))                                */}
      {/* Softened radial glare washed over texture, under typography  */}
      {/* ============================================================ */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 z-10 rounded-[18px] transition-opacity duration-150"
        style={{
          transform: 'translateZ(6px)',
          opacity: 0,
          background: 'radial-gradient(circle 320px at 50% 50%, rgba(255,255,255,0.4), transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Foil Shimmer Sheen Layer (dynamically positioned by cursor x) */}
      <div
        ref={shimmerRef}
        className="pointer-events-none absolute -inset-full z-15 opacity-25"
        style={{
          transform: 'translate3d(0, 0, 0)',
          background: 'linear-gradient(105deg, transparent 40%, rgba(223, 191, 117, 0.45) 48%, rgba(255, 255, 255, 0.5) 50%, rgba(223, 191, 117, 0.45) 52%, transparent 60%)',
          mixBlendMode: 'color-dodge',
        }}
      />

      {/* ============================================================ */}
      {/* LAYER 1: MID DEPTH (translateZ(18px))                        */}
      {/* Number row, 3 bottom row columns, microtext                  */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          transform: 'translateZ(18px)',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 252"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <defs>
            <filter id="number-emboss" x="-5%" y="-10%" width="110%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.4" floodColor="#FFFFFF" floodOpacity="0.22" />
              <feDropShadow dx="0" dy="-1" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Number Row: •••• •••• •••• 8829 in tabular figures with subtle emboss (size ≈ 5% of card width = 20px) */}
          <text
            x="28"
            y="172"
            fontFamily="'Courier New', Courier, monospace"
            fontSize="20"
            fontWeight="600"
            letterSpacing="2.5"
            fill="#F7F3EA"
            filter="url(#number-emboss)"
          >
            •••• •••• •••• 8829
          </text>

          {/* Bottom Row: Three baseline-aligned columns */}
          {/* Column 1: CARD MEMBER micro label over VALUED MEMBER */}
          <text
            x="28"
            y="204"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
            fontSize="8"
            fontWeight="600"
            letterSpacing="2.2"
            fill="#F7F3EA"
            fillOpacity="0.55"
          >
            CARD MEMBER
          </text>
          <text
            x="28"
            y="223"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
            fontSize="12"
            fontWeight="600"
            letterSpacing="1.2"
            fill="#F7F3EA"
          >
            VALUED MEMBER
          </text>

          {/* Column 2: VALID THRU micro label over 12/29 (sample validity matching catalogue art) */}
          <text
            x="180"
            y="204"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
            fontSize="8"
            fontWeight="600"
            letterSpacing="2.2"
            fill="#F7F3EA"
            fillOpacity="0.55"
          >
            VALID THRU
          </text>
          <text
            x="180"
            y="223"
            fontFamily="'Courier New', Courier, monospace"
            fontSize="12"
            fontWeight="700"
            letterSpacing="1"
            fill="#F7F3EA"
          >
            12/29
          </text>

          {/* Column 3: Complete and unobstructed VISA wordmark */}
          <text
            x="372"
            y="224"
            textAnchor="end"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fontSize="18"
            fontWeight="800"
            fontStyle="italic"
            letterSpacing="0.5"
            fill="#FAF8F4"
          >
            VISA
          </text>

          {/* Microtext along very bottom edge (5px scale, low contrast flourish) */}
          <text
            x="200"
            y="244"
            textAnchor="middle"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
            fontSize="5.2"
            letterSpacing="0.4"
            fill="#F7F3EA"
            fillOpacity="0.35"
          >
            This card is the property of FinEdge Bank • Use implies acceptance of the cardholder terms
          </text>
        </svg>
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: HIGH DEPTH (translateZ(28px))                       */}
      {/* Bank emblem + wordmark, EDGE GOLD DEBIT, EMV chip, waves    */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          transform: 'translateZ(28px)',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 252"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <defs>
            {/* Rich multi-stop gold foil for lettering */}
            <linearGradient id="hero-gold-foil" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F5DF9E" />
              <stop offset="45%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#B8933F" />
              <stop offset="100%" stopColor="#967425" />
            </linearGradient>

            {/* EMV Microchip Gold Texture Gradient */}
            <linearGradient id="emv-gold-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EAD397" />
              <stop offset="30%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#B8933F" />
              <stop offset="100%" stopColor="#8C6514" />
            </linearGradient>

            {/* Drop shadow for EMV microchip */}
            <filter id="emv-chip-shadow" x="-10%" y="-15%" width="125%" height="135%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#050F1D" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Top Row Left: FinEdge Bank Landmark Emblem + Wordmark */}
          <g transform="translate(28, 20) scale(0.55)">
            <path fill="#B8933F" d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
            <rect fill="#F7F3EA" x="13" y="36" width="7" height="14" />
            <rect fill="#F7F3EA" x="28.5" y="32" width="7" height="18" />
            <rect fill="#F7F3EA" x="44" y="36" width="7" height="14" />
            <rect fill="#F7F3EA" x="10" y="54" width="44" height="3.5" rx="1.75" />
          </g>
          <text
            x="68"
            y="36"
            fontFamily="Fraunces, Georgia, serif"
            fontSize="13"
            fontWeight="600"
            letterSpacing="0.5"
            fill="#F7F3EA"
          >
            FinEdge Bank
          </text>

          {/* Top Row Right: EDGE GOLD with letter spacing, DEBIT beneath in small porcelain caps */}
          <text
            x="372"
            y="38"
            textAnchor="end"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
            fontSize="13"
            fontWeight="700"
            letterSpacing="3"
            fill="url(#hero-gold-foil)"
          >
            EDGE GOLD
          </text>
          <text
            x="372"
            y="54"
            textAnchor="end"
            fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
            fontSize="9"
            fontWeight="600"
            letterSpacing="3"
            fill="#F7F3EA"
            fillOpacity="0.8"
          >
            DEBIT
          </text>

          {/* Chip Row: Properly drawn EMV chip with etched contact-line pattern (SVG) */}
          <g filter="url(#emv-chip-shadow)">
            {/* Chip Gold Base */}
            <rect
              x="28"
              y="84"
              width="50"
              height="38"
              rx="6"
              fill="url(#emv-gold-metal)"
            />
            {/* Chip Perimeter Etching */}
            <rect
              x="28.75"
              y="84.75"
              width="48.5"
              height="36.5"
              rx="5.25"
              fill="none"
              stroke="#6E5010"
              strokeWidth="0.8"
              strokeOpacity="0.7"
            />
            {/* Etched Contact Pattern Lines */}
            <g stroke="#6E5010" strokeWidth="1.2" fill="none" strokeLinecap="round">
              {/* Central Microprocessor Core */}
              <rect x="45" y="93" width="16" height="20" rx="2.5" strokeWidth="1.1" />
              {/* Contact Channels */}
              <line x1="28" y1="96" x2="45" y2="96" />
              <line x1="28" y1="110" x2="45" y2="110" />
              <line x1="61" y1="96" x2="78" y2="96" />
              <line x1="61" y1="110" x2="78" y2="110" />
              <line x1="53" y1="84" x2="53" y2="93" />
              <line x1="53" y1="113" x2="53" y2="122" />
            </g>
          </g>

          {/* Contactless Mark in porcelain at full opacity (crisp 3 concentric arcs) */}
          <g stroke="#F7F3EA" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M96 95 A9 9 0 0 1 96 111" />
            <path d="M102 89 A16 16 0 0 1 102 117" />
            <path d="M108 83 A23 23 0 0 1 108 123" />
          </g>
        </svg>
      </div>

      {/* ============================================================ */}
      {/* LAYER 3: PEAK DEPTH (translateZ(34px))                       */}
      {/* Circular gold foil hologram medallion with dynamic hue tilt  */}
      {/* ============================================================ */}
      <div
        ref={hologramRef}
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          transform: 'translateZ(34px)',
          transformStyle: 'preserve-3d',
          transition: 'filter 0.15s ease-out',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 252"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <defs>
            {/* Hologram metallic foil gradient */}
            <radialGradient id="hologram-gold-foil" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFF2B8" />
              <stop offset="35%" stopColor="#E2C167" />
              <stop offset="70%" stopColor="#B38927" />
              <stop offset="100%" stopColor="#78550D" />
            </radialGradient>
            <filter id="hologram-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#050F1D" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Hologram: small circular gold foil medallion (~6% width = 24px diameter) placed left of VISA */}
          <g transform="translate(294, 213)" filter="url(#hologram-shadow)">
            {/* Medallion Rim */}
            <circle cx="0" cy="0" r="12" fill="url(#hologram-gold-foil)" />
            <circle cx="0" cy="0" r="11.2" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="0.7" />
            {/* Micro Iridescent concentric ring */}
            <circle cx="0" cy="0" r="9" fill="none" stroke="#9E7419" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
            {/* FinEdge Bank Glyph in center */}
            <g transform="translate(-5.5, -5.5) scale(0.18)">
              <path fill="#523908" d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
              <rect fill="#523908" x="13" y="36" width="7" height="14" />
              <rect fill="#523908" x="28.5" y="32" width="7" height="18" />
              <rect fill="#523908" x="44" y="36" width="7" height="14" />
              <rect fill="#523908" x="10" y="54" width="44" height="3.5" rx="1.75" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default HeroEdgeGoldCard;
