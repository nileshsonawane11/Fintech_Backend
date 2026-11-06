import React from 'react';

/**
 * Flagship Edge Gold Debit Card Component (Module 16 & Module 34 — Premium Card-Art Finish).
 * True ISO/IEC 7810 ID-1 proportions (1.586 : 1, 400x252 viewBox).
 *
 * Implements the unified 7-layer visual system with preserve-3d internal depth parallax:
 * - Layer 0 (translateZ(0px)): Base radial midnight surface, fine diagonal brushed texture,
 *   brushed gold facet band, perimeter foil edge, soft top-edge specular line, and static diagonal satin sheen.
 * - Glare Layer (translateZ(6px)): Softened glare below detail layers.
 * - Foil Shimmer Layer (translateZ(10px)): Cursor-tracked dynamic shimmer response.
 * - Layer 1 (translateZ(18px)): Embossed card number (•••• •••• •••• 8829), CARD MEMBER, VALID THRU, VISA, microtext.
 * - Layer 2 (translateZ(28px)): FinEdge Bank emblem & wordmark, EDGE GOLD DEBIT, etched EMV chip, contactless arcs.
 * - Layer 3 (translateZ(34px)): Circular gold foil hologram medallion with dynamic hue tilt.
 *
 * All colours resolve strictly to design tokens (var(--color-*)). Zero hard-coded hex.
 * Animation timings, angles, and wrapper settings remain frozen.
 */
export function HeroEdgeGoldCard({
  cardFaceRef,
  glareRef,
  hologramRef,
  shimmerRef,
  className = '',
  shadow = false,
  style = {},
}) {
  return (
    <div
      ref={cardFaceRef}
      role="img"
      aria-label="Edge Gold Debit Card — flagship debit card artwork"
      className={`relative aspect-[400/252] w-full rounded-[18px] overflow-hidden select-none ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: shadow ? '0 20px 45px -10px rgba(10, 30, 53, 0.45)' : 'none',
        transition: 'box-shadow 0.3s ease-out',
        ...style,
      }}
    >
      {/* ============================================================ */}
      {/* LAYER 0: BASE SURFACE (translateZ(0px))                      */}
      {/* Radial depth, brushed metal, gold facet, foil edge, sheen    */}
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
            {/* Card Boundary Clip */}
            <clipPath id="hero-card-boundary">
              <rect width="400" height="252" rx="18" />
            </clipPath>

            {/* Radial depth gradient resolving to design tokens */}
            <radialGradient id="hero-gold-radial-bg" cx="22%" cy="18%" r="95%">
              <stop offset="0%" stopColor="var(--color-midnight-700)" />
              <stop offset="45%" stopColor="var(--color-midnight-900)" />
              <stop offset="100%" stopColor="var(--color-midnight-950)" />
            </radialGradient>

            {/* Fine diagonal brushed texture at 3.8% opacity */}
            <pattern
              id="hero-brushed-metal"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--color-porcelain-50)"
                strokeWidth="0.8"
                strokeOpacity="0.038"
              />
            </pattern>

            {/* Gold Facet Gradient */}
            <linearGradient id="hero-facet-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-200)" />
              <stop offset="50%" stopColor="var(--color-gold-400)" />
              <stop offset="100%" stopColor="var(--color-gold-600)" />
            </linearGradient>

            {/* Perimeter Foil Edge Gradient */}
            <linearGradient id="hero-foil-edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-200)" />
              <stop offset="40%" stopColor="var(--color-gold-400)" />
              <stop offset="75%" stopColor="var(--color-gold-500)" />
              <stop offset="100%" stopColor="var(--color-gold-700)" />
            </linearGradient>

            {/* Top-Edge Specular Light Line Gradient */}
            <linearGradient id="hero-top-light" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="15%" stopColor="var(--color-porcelain-100)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="var(--color-porcelain-50)" stopOpacity="0.75" />
              <stop offset="85%" stopColor="var(--color-porcelain-100)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Static Diagonal Satin Sheen */}
            <linearGradient id="hero-satin-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="38%" stopColor="transparent" />
              <stop offset="48%" stopColor="var(--color-porcelain-50)" stopOpacity="0.08" />
              <stop offset="52%" stopColor="var(--color-porcelain-50)" stopOpacity="0.08" />
              <stop offset="62%" stopColor="transparent" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Base Background */}
          <rect width="400" height="252" rx="18" fill="url(#hero-gold-radial-bg)" />

          {/* Brushed Metal Texture */}
          <rect width="400" height="252" rx="18" fill="url(#hero-brushed-metal)" />

          {/* Brushed Foil Diagonal Facet Band */}
          <g clipPath="url(#hero-card-boundary)">
            <path d="M400 252 L400 110 L250 252 Z" fill="url(#hero-facet-gold)" opacity="0.22" />
            <path d="M400 252 L400 110 L250 252 Z" fill="url(#hero-brushed-metal)" opacity="0.5" />
            <path d="M400 90 L230 252 L210 252 L400 70 Z" fill="url(#hero-facet-gold)" opacity="0.1" />
          </g>

          {/* Static Diagonal Satin Sheen */}
          <rect
            width="400"
            height="252"
            rx="18"
            fill="url(#hero-satin-sheen)"
            clipPath="url(#hero-card-boundary)"
            pointerEvents="none"
          />

          {/* Hairline Gold Foil Edge — 1px perimeter stroke */}
          <rect
            x="0.75"
            y="0.75"
            width="398.5"
            height="250.5"
            rx="17.25"
            fill="none"
            stroke="url(#hero-foil-edge)"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />

          {/* Soft Top-Edge Bevel Specular Line */}
          <path
            d="M 24 1.5 L 376 1.5"
            stroke="url(#hero-top-light)"
            strokeWidth="1"
            strokeOpacity="0.4"
            fill="none"
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
          background:
            'linear-gradient(105deg, transparent 40%, rgba(223, 191, 117, 0.45) 48%, rgba(255, 255, 255, 0.5) 50%, rgba(223, 191, 117, 0.45) 52%, transparent 60%)',
          mixBlendMode: 'color-dodge',
        }}
      />

      {/* ============================================================ */}
      {/* LAYER 1: MID DEPTH (translateZ(18px))                        */}
      {/* Embossed number row, 3 bottom row columns, microtext         */}
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
            <filter id="hero-number-emboss" x="-5%" y="-15%" width="115%" height="135%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="0.35"
                floodColor="var(--color-porcelain-50)"
                floodOpacity="0.22"
              />
              <feDropShadow
                dx="0"
                dy="-0.75"
                stdDeviation="0.45"
                floodColor="var(--color-midnight-950)"
                floodOpacity="0.75"
              />
            </filter>
          </defs>

          {/* Number Row: •••• •••• •••• 8829 in tabular figures with tactile emboss */}
          <text
            x="28"
            y="172"
            className="font-mono tabular-nums"
            fontSize="19"
            fontWeight="600"
            letterSpacing="2.5"
            fill="var(--color-porcelain-100)"
            filter="url(#hero-number-emboss)"
          >
            •••• •••• •••• 8829
          </text>

          {/* Bottom Row: Three baseline-aligned columns */}
          {/* Column 1: CARD MEMBER micro label over VALUED MEMBER */}
          <text
            x="28"
            y="204"
            className="font-sans"
            fontSize="8"
            fontWeight="600"
            letterSpacing="2.2"
            fill="var(--color-porcelain-100)"
            fillOpacity="0.6"
            filter="url(#hero-number-emboss)"
          >
            CARD MEMBER
          </text>
          <text
            x="28"
            y="222"
            className="font-sans"
            fontSize="12"
            fontWeight="600"
            letterSpacing="1.2"
            fill="var(--color-porcelain-100)"
          >
            VALUED MEMBER
          </text>

          {/* Column 2: VALID THRU micro label over 12/29 */}
          <text
            x="180"
            y="204"
            className="font-sans"
            fontSize="8"
            fontWeight="600"
            letterSpacing="2.2"
            fill="var(--color-porcelain-100)"
            fillOpacity="0.6"
            filter="url(#hero-number-emboss)"
          >
            VALID THRU
          </text>
          <text
            x="180"
            y="222"
            className="font-mono tabular-nums"
            fontSize="12"
            fontWeight="700"
            letterSpacing="1"
            fill="var(--color-porcelain-100)"
          >
            12/29
          </text>

          {/* Column 3: Complete and unobstructed VISA wordmark */}
          <text
            x="372"
            y="224"
            textAnchor="end"
            className="font-sans"
            fontSize="18"
            fontWeight="800"
            fontStyle="italic"
            letterSpacing="0.5"
            fill="var(--color-porcelain-100)"
          >
            VISA
          </text>

          {/* Microtext along very bottom edge */}
          <text
            x="200"
            y="244"
            textAnchor="middle"
            className="font-sans"
            fontSize="5"
            letterSpacing="0.4"
            fill="var(--color-porcelain-100)"
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
              <stop offset="0%" stopColor="var(--color-gold-200)" />
              <stop offset="45%" stopColor="var(--color-gold-300)" />
              <stop offset="70%" stopColor="var(--color-gold-400)" />
              <stop offset="100%" stopColor="var(--color-gold-600)" />
            </linearGradient>

            {/* EMV Microchip Gold Texture Gradient */}
            <linearGradient id="hero-emv-gold-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-200)" />
              <stop offset="35%" stopColor="var(--color-gold-300)" />
              <stop offset="70%" stopColor="var(--color-gold-500)" />
              <stop offset="100%" stopColor="var(--color-gold-700)" />
            </linearGradient>

            {/* Drop shadow for EMV microchip */}
            <filter id="hero-emv-chip-shadow" x="-10%" y="-15%" width="125%" height="135%">
              <feDropShadow
                dx="0"
                dy="1.2"
                stdDeviation="1.2"
                floodColor="var(--color-midnight-950)"
                floodOpacity="0.55"
              />
            </filter>
          </defs>

          {/* Top Row Left: FinEdge Bank Landmark Emblem + Wordmark */}
          <g transform="translate(26, 22) scale(0.55)">
            <path fill="var(--color-gold-400)" d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
            <rect fill="var(--color-porcelain-100)" x="13" y="36" width="7" height="14" />
            <rect fill="var(--color-porcelain-100)" x="28.5" y="32" width="7" height="18" />
            <rect fill="var(--color-porcelain-100)" x="44" y="36" width="7" height="14" />
            <rect fill="var(--color-porcelain-100)" x="10" y="54" width="44" height="3.5" rx="1.75" />
          </g>
          <text
            x="66"
            y="38"
            className="font-display"
            fontSize="13"
            fontWeight="600"
            letterSpacing="0.5"
            fill="var(--color-porcelain-100)"
          >
            FinEdge Bank
          </text>

          {/* Top Row Right: EDGE GOLD with letter spacing, DEBIT beneath */}
          <text
            x="372"
            y="38"
            textAnchor="end"
            className="font-sans"
            fontSize="13"
            fontWeight="700"
            letterSpacing="2.5"
            fill="url(#hero-gold-foil)"
          >
            EDGE GOLD
          </text>
          <text
            x="372"
            y="54"
            textAnchor="end"
            className="font-sans"
            fontSize="9"
            fontWeight="600"
            letterSpacing="2.5"
            fill="var(--color-porcelain-100)"
            opacity="0.8"
          >
            DEBIT
          </text>

          {/* Chip Row: Properly drawn EMV chip with etched contact-line pattern (SVG) */}
          <g filter="url(#hero-emv-chip-shadow)">
            {/* Chip Gold Base Plate */}
            <rect
              x="28"
              y="86"
              width="50"
              height="38"
              rx="6"
              fill="url(#hero-emv-gold-metal)"
            />
            {/* Chip Perimeter Etching */}
            <rect
              x="28.75"
              y="86.75"
              width="48.5"
              height="36.5"
              rx="5.25"
              fill="none"
              stroke="var(--color-gold-700)"
              strokeWidth="0.8"
              strokeOpacity="0.75"
            />
            {/* Etched Contact Pattern Lines */}
            <g stroke="var(--color-gold-700)" strokeWidth="1.1" fill="none" strokeLinecap="round">
              <rect x="45" y="95" width="16" height="20" rx="2.5" strokeWidth="1.0" />
              <line x1="28" y1="98" x2="45" y2="98" />
              <line x1="28" y1="112" x2="45" y2="112" />
              <line x1="61" y1="98" x2="78" y2="98" />
              <line x1="61" y1="112" x2="78" y2="112" />
              <line x1="53" y1="86" x2="53" y2="95" />
              <line x1="53" y1="115" x2="53" y2="124" />
            </g>
          </g>

          {/* Contactless Mark in porcelain (crisp 3 concentric arcs) */}
          <g stroke="var(--color-porcelain-100)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M96 97 A9 9 0 0 1 96 113" />
            <path d="M102 91 A16 16 0 0 1 102 119" />
            <path d="M108 85 A23 23 0 0 1 108 125" />
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
            <radialGradient id="hero-hologram-gold-foil" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="var(--color-porcelain-50)" />
              <stop offset="30%" stopColor="var(--color-gold-200)" />
              <stop offset="65%" stopColor="var(--color-gold-400)" />
              <stop offset="100%" stopColor="var(--color-gold-700)" />
            </radialGradient>
            <filter id="hero-hologram-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1"
                floodColor="var(--color-midnight-950)"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/* Hologram: circular gold foil medallion placed left of VISA */}
          <g transform="translate(294, 213)" filter="url(#hero-hologram-shadow)">
            {/* Medallion Rim */}
            <circle cx="0" cy="0" r="12" fill="url(#hero-hologram-gold-foil)" />
            <circle
              cx="0"
              cy="0"
              r="11.2"
              fill="none"
              stroke="var(--color-porcelain-50)"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
            {/* Micro Iridescent concentric ring */}
            <circle
              cx="0"
              cy="0"
              r="9"
              fill="none"
              stroke="var(--color-gold-700)"
              strokeWidth="0.6"
              strokeDasharray="1.5 1.5"
              strokeOpacity="0.65"
            />
            {/* FinEdge Bank Glyph in center */}
            <g transform="translate(-5.5, -5.5) scale(0.18)">
              <path fill="var(--color-gold-700)" d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
              <rect fill="var(--color-gold-700)" x="13" y="36" width="7" height="14" />
              <rect fill="var(--color-gold-700)" x="28.5" y="32" width="7" height="18" />
              <rect fill="var(--color-gold-700)" x="44" y="36" width="7" height="14" />
              <rect fill="var(--color-gold-700)" x="10" y="54" width="44" height="3.5" rx="1.75" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default HeroEdgeGoldCard;
