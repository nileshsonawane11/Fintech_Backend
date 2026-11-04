import React from 'react';

/**
 * Universal SVG Card Art Component (Module 34 — Premium Card-Art Finish).
 *
 * Implements the unified 7-layer visual system across all 5 card identities:
 * 1. Material base: Token base colour + radial depth + fine brushed metal texture
 * 2. Foil edge and edge light: 1px metallic hairline perimeter + soft top-edge specular line
 * 3. Etched EMV chip + contactless: Properly drawn SVG microchip with core/channels + 3 etched arcs
 * 4. Embossed typography: Paired light/dark micro-shadows on card number, CARD MEMBER, and VALID THRU
 * 5. Hologram medallion: Precision circular multi-stop foil disc with rim, micro-rings, and bank crest
 * 6. Satin sheen: Static diagonal sheen baked into face (under chip/numbers, under TiltCard glare)
 * 7. Marks & microtext: Crisp bank emblem, wordmarks, network marks, and bottom regulatory microtext
 *
 * All colours resolve strictly to design tokens (var(--color-*)). Zero hard-coded hex.
 * Zero raster image dependencies. Mobile and desktop render the exact identical art.
 */
export function CardVisual({
  card,
  className = '',
  role = 'img',
  holderName = null,
  shadow = true,
  maskedNumber: customNumber = null,
}) {
  if (!card) return null;

  const slug = card.slug || card.productSlug || '';
  const nameLower = (card.name || card.cardName || card.productName || '').toLowerCase();

  const variant = card.artVariant || (
    slug === 'edge-gold-debit' || nameLower.includes('gold') ? 'gold' :
    slug === 'edge-voyage-credit' || nameLower.includes('voyage') ? 'voyage' :
    slug === 'edge-assured-credit' || nameLower.includes('assured') ? 'assured' :
    slug === 'classic-debit' || nameLower.includes('classic') ? 'classic' :
    'cashback'
  );

  const isCredit = card.cardType === 'credit' ||
                   card.kind === 'CREDIT' ||
                   (card.cardType && String(card.cardType).toUpperCase() === 'CREDIT');

  const network = card.network || (variant === 'gold' || variant === 'voyage' ? 'Visa' : 'RuPay');

  const cardName = variant === 'gold' ? 'EDGE GOLD' :
                   variant === 'voyage' ? 'VOYAGE' :
                   variant === 'assured' ? 'ASSURED' :
                   variant === 'classic' ? 'CLASSIC' : 'CASHBACK';

  const defaultNumber = variant === 'gold' ? '•••• •••• •••• 8829' :
                        variant === 'voyage' ? '•••• •••• •••• 4821' :
                        variant === 'assured' ? '•••• •••• •••• 7305' :
                        variant === 'classic' ? '•••• •••• •••• 1964' :
                        '•••• •••• •••• 3058';

  const cardNumber = customNumber || card.maskedCardNumber || (
    card.number ? String(card.number).replace(/(\d{4})/g, '$1 ').trim() : defaultNumber
  );

  const expiry = card.expiryDate || card.expiry || (
    variant === 'gold' ? '12/29' :
    variant === 'voyage' ? '10/29' :
    variant === 'assured' ? '08/28' :
    variant === 'classic' ? '03/30' :
    '05/29'
  );

  const resolvedHolder = holderName || card.holderName || null;
  const isGraphite = variant === 'assured';

  // Gradient & accent token bindings
  const foilGradientId = isGraphite ? 'cv-foil-silver' : 'cv-foil-gold';
  const chipGradientId = isGraphite ? 'cv-chip-silver' : 'cv-chip-gold';
  const chipEtchColor = isGraphite ? 'var(--color-ink-700)' : 'var(--color-gold-700)';
  const medallionGradientId = isGraphite ? 'cv-hologram-silver' : 'cv-hologram-gold';
  const medallionCrestColor = isGraphite ? 'var(--color-ink-800)' : 'var(--color-gold-700)';
  const brandEmblemColor = isGraphite ? 'var(--color-ink-300)' : 'var(--color-gold-400)';
  const labelAccentColor = isGraphite ? 'var(--color-ink-300)' : 'var(--color-gold-400)';

  return (
    <div
      className={`relative aspect-[400/252] w-full overflow-hidden rounded-[18px] ${
        shadow ? 'shadow-raised' : ''
      } select-none ${className}`}
      role={role}
      aria-label={`${card.name || card.cardName || card.productName || cardName} — ${
        isCredit ? 'credit' : 'debit'
      } card artwork`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 252"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          {/* Card Boundary Clip */}
          <clipPath id="cv-card-boundary">
            <rect width="400" height="252" rx="18" />
          </clipPath>

          {/* 1. Fine Diagonal Brushed Metal Texture (Generalised to all 5 cards) */}
          <pattern
            id="cv-brushed-metal"
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

          {/* 2. Radial Depth Gradients per Variant */}
          {/* Edge Gold: Deep midnight base with warm top-left glow */}
          <radialGradient id="cv-gold-bg" cx="22%" cy="18%" r="95%">
            <stop offset="0%" stopColor="var(--color-midnight-700)" />
            <stop offset="45%" stopColor="var(--color-midnight-900)" />
            <stop offset="100%" stopColor="var(--color-midnight-950)" />
          </radialGradient>

          {/* Edge Voyage: Deepest midnight base with strongest radial depth */}
          <radialGradient id="cv-voyage-bg" cx="16%" cy="14%" r="105%">
            <stop offset="0%" stopColor="var(--color-midnight-700)" />
            <stop offset="35%" stopColor="var(--color-midnight-800)" />
            <stop offset="70%" stopColor="var(--color-midnight-900)" />
            <stop offset="100%" stopColor="var(--color-midnight-950)" />
          </radialGradient>

          {/* Edge Assured: Brushed Graphite Metal */}
          <radialGradient id="cv-assured-bg" cx="20%" cy="16%" r="95%">
            <stop offset="0%" stopColor="var(--color-ink-700)" />
            <stop offset="50%" stopColor="var(--color-ink-900)" />
            <stop offset="100%" stopColor="var(--color-ink-950)" />
          </radialGradient>

          {/* Edge Cashback: Midnight Base */}
          <radialGradient id="cv-cashback-bg" cx="22%" cy="18%" r="95%">
            <stop offset="0%" stopColor="var(--color-midnight-800)" />
            <stop offset="55%" stopColor="var(--color-midnight-900)" />
            <stop offset="100%" stopColor="var(--color-midnight-950)" />
          </radialGradient>

          {/* Classic Debit: Quiet Understated Midnight */}
          <radialGradient id="cv-classic-bg" cx="20%" cy="16%" r="95%">
            <stop offset="0%" stopColor="var(--color-midnight-700)" />
            <stop offset="50%" stopColor="var(--color-midnight-900)" />
            <stop offset="100%" stopColor="var(--color-midnight-950)" />
          </radialGradient>

          {/* 3. Metallic Foil Gradients */}
          <linearGradient id="cv-foil-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-200)" />
            <stop offset="40%" stopColor="var(--color-gold-400)" />
            <stop offset="75%" stopColor="var(--color-gold-500)" />
            <stop offset="100%" stopColor="var(--color-gold-700)" />
          </linearGradient>

          <linearGradient id="cv-foil-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-ink-100)" />
            <stop offset="40%" stopColor="var(--color-ink-300)" />
            <stop offset="75%" stopColor="var(--color-ink-400)" />
            <stop offset="100%" stopColor="var(--color-ink-600)" />
          </linearGradient>

          {/* 4. Top-Edge Specular Light Line Gradient */}
          <linearGradient id="cv-top-light" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="15%" stopColor="var(--color-porcelain-100)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--color-porcelain-50)" stopOpacity="0.75" />
            <stop offset="85%" stopColor="var(--color-porcelain-100)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* 5. Static Diagonal Satin Sheen Layer */}
          <linearGradient id="cv-satin-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="38%" stopColor="transparent" />
            <stop offset="48%" stopColor="var(--color-porcelain-50)" stopOpacity="0.08" />
            <stop offset="52%" stopColor="var(--color-porcelain-50)" stopOpacity="0.08" />
            <stop offset="62%" stopColor="transparent" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* 6. EMV Microchip Metal Gradients */}
          <linearGradient id="cv-chip-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-200)" />
            <stop offset="35%" stopColor="var(--color-gold-300)" />
            <stop offset="70%" stopColor="var(--color-gold-500)" />
            <stop offset="100%" stopColor="var(--color-gold-700)" />
          </linearGradient>

          <linearGradient id="cv-chip-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-ink-100)" />
            <stop offset="35%" stopColor="var(--color-ink-200)" />
            <stop offset="70%" stopColor="var(--color-ink-400)" />
            <stop offset="100%" stopColor="var(--color-ink-600)" />
          </linearGradient>

          {/* 7. Hologram Medallion Multi-Stop Radial Foil Gradients */}
          <radialGradient id="cv-hologram-gold" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--color-porcelain-50)" />
            <stop offset="30%" stopColor="var(--color-gold-200)" />
            <stop offset="65%" stopColor="var(--color-gold-400)" />
            <stop offset="100%" stopColor="var(--color-gold-700)" />
          </radialGradient>

          <radialGradient id="cv-hologram-silver" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--color-porcelain-50)" />
            <stop offset="30%" stopColor="var(--color-ink-100)" />
            <stop offset="65%" stopColor="var(--color-ink-300)" />
            <stop offset="100%" stopColor="var(--color-ink-600)" />
          </radialGradient>

          {/* 8. Micro Shadow Filters */}
          <filter id="cv-chip-shadow" x="-10%" y="-15%" width="125%" height="135%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="var(--color-midnight-950)" floodOpacity="0.55" />
          </filter>

          <filter id="cv-hologram-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="var(--color-midnight-950)" floodOpacity="0.45" />
          </filter>

          {/* Paired Light/Dark Micro-Shadows for Tactile Embossed Typography */}
          <filter id="cv-emboss" x="-5%" y="-15%" width="115%" height="135%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.35" floodColor="var(--color-porcelain-50)" floodOpacity="0.22" />
            <feDropShadow dx="0" dy="-0.75" stdDeviation="0.45" floodColor="var(--color-midnight-950)" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* ============================================================ */}
        {/* LAYER 1: BASE MATERIAL + RADIAL DEPTH + BRUSHED TEXTURE      */}
        {/* ============================================================ */}
        <rect
          width="400"
          height="252"
          rx="18"
          fill={`url(#cv-${variant}-bg)`}
        />

        {/* Generalised Fine Brushed Metal Texture */}
        <rect
          width="400"
          height="252"
          rx="18"
          fill="url(#cv-brushed-metal)"
        />

        {/* ============================================================ */}
        {/* LAYER 2: VARIANT-SPECIFIC REFINED MOTIFS                     */}
        {/* ============================================================ */}

        {/* (A) Edge Gold Debit: Brushed Foil Diagonal Facet Band */}
        {variant === 'gold' && (
          <g clipPath="url(#cv-card-boundary)">
            <path
              d="M400 252 L400 110 L250 252 Z"
              fill="url(#cv-foil-gold)"
              opacity="0.22"
            />
            {/* Fine Brushed Overlay on Foil Band */}
            <path
              d="M400 252 L400 110 L250 252 Z"
              fill="url(#cv-brushed-metal)"
              opacity="0.5"
            />
            <path
              d="M400 90 L230 252 L210 252 L400 70 Z"
              fill="url(#cv-foil-gold)"
              opacity="0.1"
            />
          </g>
        )}

        {/* (B) Edge Voyage: Foil Flight Route Line + Two Etched Nodes */}
        {variant === 'voyage' && (
          <g clipPath="url(#cv-card-boundary)">
            {/* Primary Foil Route Line */}
            <path
              d="M -20 180 C 80 120, 180 220, 320 80 C 370 30, 420 50, 440 30"
              fill="none"
              stroke="url(#cv-foil-gold)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.38"
            />
            {/* Secondary Cyan Route Curve */}
            <path
              d="M -10 220 C 100 160, 220 250, 360 120"
              fill="none"
              stroke="var(--color-midnight-300)"
              strokeWidth="1.2"
              opacity="0.22"
            />
            {/* Etched Node Point 1 (Top-Right Waypoint) */}
            <circle cx="320" cy="80" r="3.5" fill="url(#cv-foil-gold)" opacity="0.85" />
            <circle cx="320" cy="80" r="7" fill="none" stroke="url(#cv-foil-gold)" strokeWidth="0.9" opacity="0.45" />

            {/* Etched Node Point 2 (Mid-Left Waypoint) */}
            <circle cx="160" cy="170" r="2.5" fill="url(#cv-foil-gold)" opacity="0.75" />
            <circle cx="160" cy="170" r="5.5" fill="none" stroke="url(#cv-foil-gold)" strokeWidth="0.8" opacity="0.35" />
          </g>
        )}

        {/* (C) Edge Assured: Brushed Graphite Metal Ribs & Slate Anchor */}
        {variant === 'assured' && (
          <g clipPath="url(#cv-card-boundary)">
            <line x1="0" y1="45" x2="400" y2="45" stroke="var(--color-ink-600)" strokeWidth="0.75" opacity="0.35" />
            <line x1="0" y1="140" x2="400" y2="140" stroke="var(--color-ink-600)" strokeWidth="0.75" opacity="0.35" />
            <line x1="0" y1="195" x2="400" y2="195" stroke="var(--color-ink-600)" strokeWidth="0.75" opacity="0.35" />
            {/* Bottom Slate Metal Anchoring Strip */}
            <rect x="0" y="210" width="400" height="42" fill="var(--color-ink-950)" opacity="0.8" />
          </g>
        )}

        {/* (D) Edge Cashback: Abstract Etched Concentric Arcs (Spend Ripples) */}
        {variant === 'cashback' && (
          <g clipPath="url(#cv-card-boundary)">
            <circle cx="350" cy="180" r="35" fill="none" stroke="var(--color-gold-400)" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.06" />
            <circle cx="350" cy="180" r="65" fill="none" stroke="var(--color-gold-400)" strokeWidth="1" opacity="0.04" />
            <circle cx="350" cy="180" r="95" fill="none" stroke="var(--color-gold-400)" strokeWidth="0.9" strokeDasharray="4 4" opacity="0.04" />
            <circle cx="350" cy="180" r="130" fill="none" stroke="var(--color-gold-400)" strokeWidth="1.1" opacity="0.03" />
          </g>
        )}

        {/* (E) Classic Debit: Pure Material Surface (Uncluttered reference) */}
        {variant === 'classic' && (
          <g clipPath="url(#cv-card-boundary)">
            <rect x="0" y="216" width="400" height="36" fill="var(--color-midnight-950)" opacity="0.75" />
          </g>
        )}

        {/* ============================================================ */}
        {/* LAYER 3: STATIC SATIN SHEEN (Under typography & glare)       */}
        {/* ============================================================ */}
        <rect
          width="400"
          height="252"
          rx="18"
          fill="url(#cv-satin-sheen)"
          clipPath="url(#cv-card-boundary)"
          pointerEvents="none"
        />

        {/* ============================================================ */}
        {/* LAYER 4: FOIL PERIMETER EDGE + TOP SPECULAR LIGHT LINE       */}
        {/* ============================================================ */}
        {/* 1px Metallic Hairline Perimeter Stroke */}
        <rect
          x="0.75"
          y="0.75"
          width="398.5"
          height="250.5"
          rx="17.25"
          fill="none"
          stroke={`url(#${foilGradientId})`}
          strokeOpacity={isGraphite ? 0.35 : 0.45}
          strokeWidth="1.2"
        />

        {/* Soft Top-Edge Bevel Specular Line */}
        <path
          d="M 24 1.5 L 376 1.5"
          stroke="url(#cv-top-light)"
          strokeWidth="1"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* ============================================================ */}
        {/* LAYER 5: BRAND EMBLEM & PRODUCT WORDMARK (Top Row)           */}
        {/* ============================================================ */}
        {/* Bank Emblem (Top Left) */}
        <g transform="translate(26, 22) scale(0.55)">
          <path fill={brandEmblemColor} d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
          <rect fill="var(--color-porcelain-100)" x="13" y="36" width="7" height="14" />
          <rect fill="var(--color-porcelain-100)" x="28.5" y="32" width="7" height="18" />
          <rect fill="var(--color-porcelain-100)" x="44" y="36" width="7" height="14" />
          <rect fill="var(--color-porcelain-100)" x="10" y="54" width="44" height="3.5" rx="1.75" />
        </g>
        <text
          x="66"
          y="38"
          fontFamily="Fraunces, serif"
          fontSize="13"
          fontWeight="600"
          letterSpacing="0.5"
          fill="var(--color-porcelain-100)"
        >
          FinEdge Bank
        </text>

        {/* Product Name & Type Label (Top Right) */}
        <text
          x="372"
          y="38"
          textAnchor="end"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2.5"
          fill={labelAccentColor}
        >
          {cardName}
        </text>
        <text
          x="372"
          y="54"
          textAnchor="end"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="9"
          fontWeight="600"
          letterSpacing="2.5"
          fill="var(--color-porcelain-100)"
          opacity="0.8"
        >
          {isCredit ? 'CREDIT' : 'DEBIT'}
        </text>

        {/* ============================================================ */}
        {/* LAYER 6: ETCHED EMV CHIP + CONTACTLESS WAVES                 */}
        {/* ============================================================ */}
        <g filter="url(#cv-chip-shadow)">
          {/* Chip Base Plate */}
          <rect
            x="28"
            y="86"
            width="50"
            height="38"
            rx="6"
            fill={`url(#${chipGradientId})`}
          />
          {/* Chip Perimeter Etch */}
          <rect
            x="28.75"
            y="86.75"
            width="48.5"
            height="36.5"
            rx="5.25"
            fill="none"
            stroke={chipEtchColor}
            strokeWidth="0.8"
            strokeOpacity="0.75"
          />
          {/* Etched Contact Channels & Core */}
          <g stroke={chipEtchColor} strokeWidth="1.1" fill="none" strokeLinecap="round">
            <rect x="45" y="95" width="16" height="20" rx="2.5" strokeWidth="1.0" />
            <line x1="28" y1="98" x2="45" y2="98" />
            <line x1="28" y1="112" x2="45" y2="112" />
            <line x1="61" y1="98" x2="78" y2="98" />
            <line x1="61" y1="112" x2="78" y2="112" />
            <line x1="53" y1="86" x2="53" y2="95" />
            <line x1="53" y1="115" x2="53" y2="124" />
          </g>
        </g>

        {/* Contactless Waves (3 concentric arcs) */}
        <g
          stroke="var(--color-porcelain-100)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          opacity={isGraphite ? 0.75 : 0.85}
        >
          <path d="M96 97 A9 9 0 0 1 96 113" />
          <path d="M102 91 A16 16 0 0 1 102 119" />
          <path d="M108 85 A23 23 0 0 1 108 125" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 7: EMBOSSED NUMBER, HOLDER DETAILS, HOLOGRAM, NETWORK  */}
        {/* ============================================================ */}

        {/* (A) Embossed Card Number */}
        <text
          x="28"
          y="172"
          fontFamily="'Courier New', Courier, monospace"
          fontSize="19"
          fontWeight="600"
          letterSpacing="2.5"
          fill="var(--color-porcelain-100)"
          filter="url(#cv-emboss)"
        >
          {cardNumber}
        </text>

        {/* (B) Bottom Row Details */}
        {/* Column 1: CARD MEMBER */}
        <text
          x="28"
          y="204"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="8"
          fontWeight="600"
          letterSpacing="2.2"
          fill="var(--color-porcelain-100)"
          fillOpacity="0.6"
          filter="url(#cv-emboss)"
        >
          CARD MEMBER
        </text>
        <text
          x="28"
          y="222"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="12"
          fontWeight="600"
          letterSpacing="1.2"
          fill="var(--color-porcelain-100)"
        >
          {resolvedHolder || 'VALUED MEMBER'}
        </text>

        {/* Column 2: VALID THRU */}
        <text
          x="180"
          y="204"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="8"
          fontWeight="600"
          letterSpacing="2.2"
          fill="var(--color-porcelain-100)"
          fillOpacity="0.6"
          filter="url(#cv-emboss)"
        >
          VALID THRU
        </text>
        <text
          x="180"
          y="222"
          fontFamily="'Courier New', Courier, monospace"
          fontSize="12"
          fontWeight="700"
          letterSpacing="1"
          fill="var(--color-porcelain-100)"
        >
          {expiry}
        </text>

        {/* (C) Hologram Medallion (Circular multi-stop foil disc placed left of network mark) */}
        <g transform="translate(294, 213)" filter="url(#cv-hologram-shadow)">
          {/* Medallion Rim */}
          <circle cx="0" cy="0" r="12" fill={`url(#${medallionGradientId})`} />
          <circle
            cx="0"
            cy="0"
            r="11.2"
            fill="none"
            stroke="var(--color-porcelain-50)"
            strokeOpacity="0.45"
            strokeWidth="0.7"
          />
          {/* Micro Iridescent Concentric Ring */}
          <circle
            cx="0"
            cy="0"
            r="9"
            fill="none"
            stroke={medallionCrestColor}
            strokeWidth="0.6"
            strokeDasharray="1.5 1.5"
            strokeOpacity="0.65"
          />
          {/* FinEdge Bank Miniature Crest in Center */}
          <g transform="translate(-5.5, -5.5) scale(0.18)">
            <path fill={medallionCrestColor} d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
            <rect fill={medallionCrestColor} x="13" y="36" width="7" height="14" />
            <rect fill={medallionCrestColor} x="28.5" y="32" width="7" height="18" />
            <rect fill={medallionCrestColor} x="44" y="36" width="7" height="14" />
            <rect fill={medallionCrestColor} x="10" y="54" width="44" height="3.5" rx="1.75" />
          </g>
        </g>

        {/* (D) Payment Network Mark (Bottom Right) */}
        {network === 'Visa' ? (
          <text
            x="372"
            y="224"
            textAnchor="end"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fontSize="18"
            fontWeight="800"
            fontStyle="italic"
            letterSpacing="0.5"
            fill="var(--color-porcelain-100)"
          >
            VISA
          </text>
        ) : (
          <g transform="translate(325, 206)">
            <text
              x="47"
              y="18"
              textAnchor="end"
              fontFamily="'Segoe UI', Arial, sans-serif"
              fontSize="16"
              fontWeight="800"
              fontStyle="italic"
              letterSpacing="0.5"
              fill="var(--color-porcelain-100)"
            >
              RuPay
            </text>
            <circle cx="5" cy="12" r="5" fill={brandEmblemColor} opacity="0.9" />
          </g>
        )}

        {/* (E) Bottom Edge Regulatory Microtext */}
        <text
          x="200"
          y="244"
          textAnchor="middle"
          fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="5"
          letterSpacing="0.4"
          fill="var(--color-porcelain-100)"
          fillOpacity="0.35"
        >
          This card is the property of FinEdge Bank • Use implies acceptance of the cardholder terms
        </text>
      </svg>
    </div>
  );
}

export default CardVisual;
