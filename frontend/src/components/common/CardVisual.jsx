import React from 'react';

/**
 * Universal SVG Card Art component.
 * Renders one of 5 distinct variants using the single design system:
 * - Edge Gold Debit: Flagship gold-accent foil treatment
 * - Edge Voyage Credit: Midnight with curved travel flight-path contours
 * - Edge Cashback Credit: Pure midnight with geometric cashback facet pattern
 * - Edge Assured Credit: Graphite/slate carbon variant (secured)
 * - Classic Debit: Understated standard midnight
 *
 * Used identically across:
 * 1. Catalogue tile (/cards)
 * 2. Header mega-menu thumbnails
 * 3. Detail view (/cards/:slug)
 */
export function CardVisual({ card, className = '', role = 'img', holderName = null, shadow = true }) {
  if (!card) return null;

  const slug = card.slug || '';
  const variant = card.artVariant || (
    slug === 'edge-gold-debit' ? 'gold' :
    slug === 'edge-voyage-credit' ? 'voyage' :
    slug === 'edge-assured-credit' ? 'assured' :
    slug === 'classic-debit' ? 'classic' :
    'cashback'
  );

  const isCredit = card.cardType === 'credit';
  const network = card.network || (variant === 'gold' || variant === 'voyage' ? 'Visa' : 'RuPay');
  const cardName = variant === 'gold' ? 'EDGE GOLD' :
                   variant === 'voyage' ? 'VOYAGE' :
                   variant === 'assured' ? 'ASSURED' :
                   variant === 'classic' ? 'CLASSIC' : 'CASHBACK';

  const maskedNumber = variant === 'gold' ? '•••• •••• •••• 8829' :
                       variant === 'voyage' ? '•••• •••• •••• 4821' :
                       variant === 'assured' ? '•••• •••• •••• 7305' :
                       variant === 'classic' ? '•••• •••• •••• 1964' :
                       '•••• •••• •••• 3058';

  const expiry = variant === 'gold' ? '12/29' :
                 variant === 'voyage' ? '10/29' :
                 variant === 'assured' ? '08/28' :
                 variant === 'classic' ? '03/30' :
                 '05/29';

  return (
    <div
      className={`relative aspect-[400/252] w-full overflow-hidden rounded-2xl ${shadow ? 'shadow-raised' : ''} select-none ${className}`}
      role={role}
      aria-label={`${card.name} — ${isCredit ? 'credit' : 'debit'} card artwork`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 252"
        className="w-full h-full block"
        aria-hidden="true"
      >
        <defs>
          {/* Edge Gold Gradient */}
          <linearGradient id="gold-card-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#122A46" />
            <stop offset="60%" stopColor="#0B1A2C" />
            <stop offset="100%" stopColor="#050F1D" />
          </linearGradient>

          {/* Edge Voyage Gradient */}
          <linearGradient id="voyage-card-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D1E33" />
            <stop offset="60%" stopColor="#142334" />
            <stop offset="100%" stopColor="#07111D" />
          </linearGradient>

          {/* Edge Cashback Gradient */}
          <linearGradient id="cashback-card-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0A1E35" />
            <stop offset="60%" stopColor="#08182B" />
            <stop offset="100%" stopColor="#040D18" />
          </linearGradient>

          {/* Edge Assured Graphite Gradient */}
          <linearGradient id="assured-card-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#252A30" />
            <stop offset="50%" stopColor="#1D2126" />
            <stop offset="100%" stopColor="#14171A" />
          </linearGradient>

          {/* Classic Debit Gradient */}
          <linearGradient id="classic-card-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1A2736" />
            <stop offset="60%" stopColor="#121D2A" />
            <stop offset="100%" stopColor="#0C141E" />
          </linearGradient>

          {/* Clip path for card boundary */}
          <clipPath id={`card-clip-${variant}`}>
            <rect width="400" height="252" rx="18" />
          </clipPath>
        </defs>

        {/* 1. Base Card Face */}
        <rect
          width="400"
          height="252"
          rx="18"
          fill={`url(#${variant}-card-bg)`}
        />

        {/* 2. Variant-Specific Background Motifs */}
        {variant === 'gold' && (
          <g clipPath={`url(#card-clip-${variant})`}>
            {/* Diagonal Gold Facet */}
            <path d="M400 252 L400 110 L250 252 Z" fill="#B8933F" opacity="0.18" />
            <path d="M400 90 L230 252 L210 252 L400 70 Z" fill="#B8933F" opacity="0.08" />
            {/* Gold foil perimeter stroke */}
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
          </g>
        )}

        {variant === 'voyage' && (
          <g clipPath={`url(#card-clip-${variant})`}>
            {/* Travel Flight-Route Curves / Contour Lines */}
            <path
              d="M -20 180 C 80 120, 180 220, 320 80 C 370 30, 420 50, 440 30"
              fill="none"
              stroke="#B8933F"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.32"
            />
            <path
              d="M -10 220 C 100 160, 220 250, 360 120"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              opacity="0.22"
            />
            <path
              d="M 60 270 C 160 190, 260 210, 420 110"
              fill="none"
              stroke="#FAF8F4"
              strokeWidth="0.8"
              strokeDasharray="2 3"
              opacity="0.18"
            />
            {/* Compass / Waypoint dot */}
            <circle cx="320" cy="80" r="3.5" fill="#B8933F" opacity="0.75" />
            <circle cx="320" cy="80" r="7" fill="none" stroke="#B8933F" strokeWidth="0.8" opacity="0.4" />
            <rect
              x="0.75"
              y="0.75"
              width="398.5"
              height="250.5"
              rx="17.25"
              fill="none"
              stroke="#38BDF8"
              strokeOpacity="0.25"
              strokeWidth="1.2"
            />
          </g>
        )}

        {variant === 'cashback' && (
          <g clipPath={`url(#card-clip-${variant})`}>
            {/* Hexagonal / Cashback Geometric Mesh Motif */}
            <path
              d="M 280 252 L 350 180 L 420 252 Z"
              fill="#B8933F"
              opacity="0.08"
            />
            <circle cx="350" cy="180" r="45" fill="none" stroke="#B8933F" strokeWidth="1" strokeDasharray="3 3" opacity="0.12" />
            <circle cx="350" cy="180" r="80" fill="none" stroke="#B8933F" strokeWidth="1" opacity="0.06" />
            <rect
              x="0.75"
              y="0.75"
              width="398.5"
              height="250.5"
              rx="17.25"
              fill="none"
              stroke="#FAF8F4"
              strokeOpacity="0.18"
              strokeWidth="1.2"
            />
          </g>
        )}

        {variant === 'assured' && (
          <g clipPath={`url(#card-clip-${variant})`}>
            {/* Brushed Graphite / Slate Carbon Horizontal Lines */}
            <line x1="0" y1="45" x2="400" y2="45" stroke="#374151" strokeWidth="0.75" opacity="0.4" />
            <line x1="0" y1="140" x2="400" y2="140" stroke="#374151" strokeWidth="0.75" opacity="0.4" />
            <line x1="0" y1="195" x2="400" y2="195" stroke="#374151" strokeWidth="0.75" opacity="0.4" />
            {/* Bottom slate anchoring strip */}
            <rect x="0" y="210" width="400" height="42" fill="#111417" opacity="0.8" />
            <rect
              x="0.75"
              y="0.75"
              width="398.5"
              height="250.5"
              rx="17.25"
              fill="none"
              stroke="#9BA4B5"
              strokeOpacity="0.25"
              strokeWidth="1.2"
            />
          </g>
        )}

        {variant === 'classic' && (
          <g clipPath={`url(#card-clip-${variant})`}>
            {/* Understated Classic Bottom Dark Navy Strip */}
            <rect x="0" y="216" width="400" height="36" fill="#080E16" opacity="0.75" />
            <rect
              x="0.75"
              y="0.75"
              width="398.5"
              height="250.5"
              rx="17.25"
              fill="none"
              stroke="#FAF8F4"
              strokeOpacity="0.15"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* 3. Bank Emblem & Brand Name (Top Left) */}
        <g transform="translate(26,22) scale(0.55)">
          <path fill={variant === 'gold' ? '#B8933F' : variant === 'assured' ? '#9BA4B5' : '#B8933F'} d="M32 4 L60 28 L49 28 L32 15 L15 28 L4 28 Z" />
          <rect fill="#F7F3EA" x="13" y="36" width="7" height="14" />
          <rect fill="#F7F3EA" x="28.5" y="32" width="7" height="18" />
          <rect fill="#F7F3EA" x="44" y="36" width="7" height="14" />
          <rect fill="#F7F3EA" x="10" y="54" width="44" height="3.5" rx="1.75" />
        </g>
        <text
          x="66"
          y="38"
          fontFamily="Fraunces, serif"
          fontSize="13"
          fontWeight="600"
          letterSpacing="0.5"
          fill="#F7F3EA"
        >
          FinEdge Bank
        </text>

        {/* 4. Product Name & Credit/Debit Chip (Top Right) */}
        <text
          x="372"
          y="42"
          textAnchor="end"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2.5"
          fill={variant === 'gold' ? '#B8933F' : variant === 'assured' ? '#D1D5DB' : '#FAF8F4'}
        >
          {cardName}
        </text>
        <text
          x="372"
          y="58"
          textAnchor="end"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="9"
          fontWeight="600"
          letterSpacing="2.5"
          fill={variant === 'gold' ? '#F7F3EA' : variant === 'assured' ? '#9CA3AF' : '#FAF8F4'}
          opacity="0.8"
        >
          {isCredit ? 'CREDIT' : 'DEBIT'}
        </text>

        {/* 5. EMV Chip (Positioned identically across all 5 cards) */}
        <g>
          <rect
            x="30"
            y="94"
            width="54"
            height="40"
            rx="7"
            fill={variant === 'assured' ? '#9BA4B5' : '#B8933F'}
          />
          <path
            d="M30 108 H47 M30 120 H47 M84 108 H67 M84 120 H67 M47 94 V134 M67 94 V134"
            stroke={variant === 'assured' ? '#6B7280' : '#8C6D2F'}
            strokeWidth="1.6"
            fill="none"
          />
        </g>

        {/* 6. Contactless Waves */}
        <g
          stroke={variant === 'assured' ? '#D1D5DB' : '#F7F3EA'}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        >
          <path d="M110 107 A8 8 0 0 1 110 123" />
          <path d="M116 101 A15 15 0 0 1 116 129" />
          <path d="M122 95 A22 22 0 0 1 122 135" />
        </g>

        {/* 7. Masked Card Number */}
        <text
          x="30"
          y="178"
          fontFamily="'Courier New', monospace"
          fontSize="20"
          letterSpacing="2"
          fill={variant === 'assured' ? '#E5E7EB' : '#F7F3EA'}
        >
          {maskedNumber}
        </text>

        {/* 8. Card Member Details (Bottom Left) — Neutral catalogue treatment without personal name */}
        <text
          x="30"
          y="206"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="8"
          letterSpacing="2"
          fill={variant === 'assured' ? '#9CA3AF' : '#F7F3EA'}
          opacity="0.65"
        >
          CARD MEMBER
        </text>
        {holderName && (
          <text
            x="30"
            y="224"
            fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
            fontSize="12"
            fontWeight="600"
            letterSpacing="1.5"
            fill="#F7F3EA"
          >
            {holderName}
          </text>
        )}

        {/* 9. Valid Thru */}
        <text
          x="285"
          y="206"
          textAnchor="end"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="8"
          letterSpacing="2"
          fill={variant === 'assured' ? '#9CA3AF' : '#F7F3EA'}
          opacity="0.65"
        >
          VALID THRU
        </text>
        <text
          x="285"
          y="224"
          textAnchor="end"
          fontFamily="'Courier New', monospace"
          fontSize="12"
          fill="#F7F3EA"
        >
          {expiry}
        </text>

        {/* 10. Payment Network Mark (Bottom Right) */}
        {network === 'Visa' ? (
          <text
            x="372"
            y="226"
            textAnchor="end"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fontSize="18"
            fontWeight="800"
            fontStyle="italic"
            letterSpacing="0.5"
            fill={variant === 'gold' ? '#FAF8F4' : '#F7F3EA'}
          >
            VISA
          </text>
        ) : (
          <g transform="translate(325, 208)">
            <text
              x="47"
              y="17"
              textAnchor="end"
              fontFamily="'Segoe UI', Arial, sans-serif"
              fontSize="16"
              fontWeight="800"
              fontStyle="italic"
              letterSpacing="0.5"
              fill={variant === 'assured' ? '#E5E7EB' : '#F7F3EA'}
            >
              RuPay
            </text>
            <circle cx="5" cy="11" r="5" fill="#B8933F" opacity="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default CardVisual;
