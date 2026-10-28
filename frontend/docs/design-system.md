# FinEdge Bank — Design System Specification

A unified, accessible design language and token specification for the FinEdge Bank web platform.

---

## 1. Color Palette & Semantic Tokens

### Primary Brand Identity
- **FinEdge Crimson:** `#9D1D27` (Primary CTA buttons, active state indicators, brand emblem)
- **FinEdge Dark Burgundy:** `#7A1620` (Hover states, linear gradient endpoints, dark headers)
- **FinEdge Accent Gold:** `#C9A227` / `#D4AF37` (Privilege tier badges, metal card finishes, high-yield tags)

### Neutral & Dark Tones
- **Pitch Black / Dark Charcoal:** `#1C1B1F` / `#000000` (Hero display areas, premium luxury cards)
- **Dark Navy / Slate:** `#25243B` (Primary headings, dark card variants, footer base)
- **Medium Slate:** `#4A4A6A` (Subheaders, secondary navigation items)
- **Neutral Grey:** `#6C757D` (Form labels, regulatory disclosure copy, inactive tab labels)
- **Border / Divider Grey:** `#E2E5EA` / `#ECEEF1` (Card borders, table dividers, input borders)
- **Off-White Canvas:** `#F7F8FA` / `#F0F2F5` (Page body canvas, alternate table row striping)
- **Pure White:** `#FFFFFF` (Card surfaces, dropdown containers, light button fill)

### Semantic & Status Colors
- **Success Green:** `#2E7D32` / `#4CAF50` (Credit balance indicators, positive returns, verified badges)
- **Warning Amber:** `#F5A623` / `#ED6C02` (Rating stars, notices, pending underwriting)
- **Error Red:** `#D32F2F` / `#C62828` (Validation errors, negative adjustments)
- **Info Blue:** `#1976D2` / `#0288D1` (Personal Loan cards, helper tooltips)

---

## 2. Typography

- **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Iconography:** Lucide React modern geometric vector glyphs.

### Type Scale & Hierarchy
| Level | Font Size | Line Height | Weight | Letter Spacing |
|---|---|---|---|---|
| **Display 1 (Hero Title)** | `40px` - `48px` | `1.15` | `700` (Bold) | `-0.5px` |
| **Headline 2 (Section Titles)** | `28px` - `32px` | `1.25` | `700` (Bold) | `-0.25px` |
| **Headline 3 (Card Titles)** | `20px` - `24px` | `1.3` | `600` (SemiBold) | `0px` |
| **Subhead / Lead** | `16px` - `18px` | `1.5` | `400` / `500` | `0px` |
| **Body (Default)** | `14px` | `1.5` | `400` (Regular) | `0px` |
| **Caption / Small** | `12px` | `1.4` | `500` (Medium) | `0.5px` |
| **Eyebrow / Overline** | `11px` - `12px` | `1.2` | `600` (SemiBold) | `1.5px` (Uppercase) |

---

## 3. Spacing, Elevation & Shapes

### Elevation Shadows
- `elevation-sm`: `0 2px 6px rgba(0, 0, 0, 0.06)` (Sticky header, input fields)
- `elevation-md`: `0 4px 16px rgba(0, 0, 0, 0.08)` (Cards resting state)
- `elevation-lg`: `0 12px 32px rgba(0, 0, 0, 0.12)` (Card hover state, modals, mega menus)

### Border Radii
- `radius-sm`: `4px` (Accessibility toggle buttons, micro-badges)
- `radius-md`: `6px` - `8px` (Form fields, standard CTA buttons)
- `radius-lg`: `12px` - `16px` (Product cards, calculator containers, mobile sheets)
- `radius-pill`: `9999px` (Search bar, rounded chip filters, category pills)

---

## 4. Accessibility Specifications (WCAG 2.1 AA)

1. **Color Contrast:** Minimum 4.5:1 contrast for all informational copy against light/dark backdrops.
2. **Dynamic Scaling:** Fully responsive to user-initiated rem font scaling (`S: 13px`, `M: 14px`, `L: 16px`).
3. **Motion Safety:** `prefers-reduced-motion` media queries disable continuous rotations and reduce carousel transitions.
