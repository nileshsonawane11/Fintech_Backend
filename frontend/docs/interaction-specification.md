# FinEdge Bank — Interaction & State Specification

Interaction patterns, transition timings, mathematical formulas, and form validation specifications across the FinEdge Bank web platform.

---

## 1. Global Navigation & Accessibility Interactions

### Accessibility Controls
- **Font Resizing (`S` / `M` / `L`):**
  - Trigger: Click on button element in accessibility bar.
  - State Mutation: Updates root `html` font-size from `13px` (`S`) -> `14px` (`M` default) -> `16px` (`L`).
  - Active Class: `.active` indicator with inverted contrast (`#1C1B1F` background, white text).
- **Letter Spacing Adjustment (`Normal` / `Wide`):**
  - Normal: `0px` letter spacing.
  - Wide: `1px` letter spacing for improved readability.

### Search Box Behavior
- **Resting State:** Width `180px`, light background, clear border.
- **Focus / Type State:** Expands to `240px` (`transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`), border shifts to crimson (`#9D1D27`).
- **Submit / Enter:** Redirects directly to `/accounts` or relevant matched product category.

### Customer Support Ticker
- **Animation Sequence:** An automated vertical cycle translating text items every `3200ms` with smooth ease-in-out.
- **Items Cycled:**
  1. *Customer Care: 1800-419-4332*
  2. *NetBanking Assistance*
  3. *Locate Nearest Branch*
  4. *Track Service Request*
  5. *Priority Banking Desk*

---

## 2. Carousel & Tab Navigation

### Hero Offer Slider
- **Auto-Play:** Advances slide every `5000ms`.
- **Manual Override:**
  - Chevrons: Left/Right arrows navigate sequentially.
  - Dot Indicators: Direct index jump. Active indicator transitions to an elongated pill.
- **Pause on Hover:** Timer pauses when user cursor enters the banner container.

### Product Matrix Quick-Tabs
- **Category Switching:** Instant filter across Popular, Accounts, Loans, Cards, and Investments.
- **Active State Transition:** Selected tab displays a crimson underline and active styling.
- **Card Grid Transition:** Switching tabs triggers a fast fade-in animation.

---

## 3. Product Cards & CTA Micro-Interactions

### Card Elevation & Focus
- **Hover State:** Card translates upward by `4px` (`transform: translateY(-4px)`), box shadow elevates to `0 12px 28px rgba(0, 0, 0, 0.1)`.
- **Focus-Visible:** Accessible outline with offset for keyboard navigation.
- **Button Hover States:**
  - Solid Primary: Background shifts from `#9D1D27` to `#7A1620`.
  - Outline Secondary: Background fills with subtle crimson tint.

---

## 4. Financial Calculator Interactions & Math Models

### Loan EMI Formula
$$\text{EMI} = \frac{P \times r \times (1 + r)^n}{(1 + r)^n - 1}$$
- Where $P$ = Principal Loan Amount, $r$ = Monthly interest rate ($\frac{\text{Annual Rate}}{12 \times 100}$), $n$ = Tenure in months.
- **Slider Interaction:** Dual-binding between custom range slider thumb and numeric text box. Real-time recalculation of total payment and total interest.

### Fixed Deposit Compound Interest
$$A = P \times \left(1 + \frac{r}{400}\right)^{4 \times t}$$
- Quarterly compounding frequency standard.
- **Senior Citizen Toggle:** Selecting "Senior Citizen" instantly applies a `+0.50%` interest premium to the base rate.

---

## 5. Form Validation & Security UX

| Field | Validation Trigger | Constraint Rule | Error Feedback |
|---|---|---|---|
| **Mobile Number** | `onBlur` & `onChange` (10 chars) | `^[6-9]\d{9}$` (Indian standard) | "Please enter a valid 10-digit mobile number" |
| **PAN Number** | `onBlur` & `onChange` | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` | "Enter valid 10-character PAN (e.g. ABCDE1234F)" |
| **Pincode** | `onBlur` | `^[1-9][0-9]{5}$` (6 digits) | "Enter valid 6-digit Indian PIN code" |
| **Full Name** | `onBlur` | Minimum 3 characters, letters only | "Enter full legal name as per PAN" |
