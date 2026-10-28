# FinEdge Bank — Component Library & UI Specifications

Catalogue of production UI components, interaction patterns, and states across the FinEdge Bank web platform.

---

## 1. Global Navigation & Header Components

| Component | Selector / Structure | Props & Sub-elements | States Supported |
|---|---|---|---|
| **AccessibilityRibbon** | `AccessibilityBar.jsx` | Text sizing (`S`/`M`/`L`), letter spacing controls (`Normal`/`Wide`) | `normal`, `active`, `hover` |
| **BrandLogo** | `Header.jsx` | FinEdge Brand Emblem + "FinEdge Bank" typography | Static root link |
| **NavTabs** | `Header.jsx` | Primary segments: Personal, Business, Credit Cards, Investments | `resting`, `hover`, `active` |
| **SearchBar** | `Header.jsx` | Search input with instant typeahead routing and route suggestion | `collapsed`, `focused`, `active` |
| **OdometerTicker** | `Header.jsx` | Vertically scrolling text track cycling 5 customer service avenues | Infinite keyframe translation |
| **NetBankingCTA** | `Header.jsx` | Lock icon, label "NetBanking", quick sign-in trigger | `resting`, `hover`, `active` |
| **MegaMenuDropdown** | `Header.jsx` | Multi-column categorized navigation (Accounts, Loans, Cards, Deposits) | `hidden`, `visible-on-hover` |

---

## 2. Hero & Presentation Primitives

| Component | Selector / Structure | Purpose | Interactive Elements |
|---|---|---|---|
| **HeroBannerCarousel** | `HomePage.jsx` | Showcases high-impact financial propositions (Savings 7% interest, FD 7.10%) | Auto-play timer, Prev/Next buttons, dot indicators |
| **HeroActionBlock** | `HomePage.jsx` | Headlines, value badges, primary CTA, secondary inline links | Onboarding modal triggers |
| **VisualShowcaseCard**| `HomePage.jsx` | Rendered metallic cards, financial trust metrics | Responsive display |

---

## 3. Product & Offering Matrices

| Component | Selector / Structure | Key Attributes & Children | Visual Variations |
|---|---|---|---|
| **CategoryTabPillBar** | `HomePage.jsx` | Horizontal scrollable tab buttons with icon + title | Active tab has crimson underline and highlight tint |
| **ProductCard** | `HomePage.jsx` & Page Views | Category tag, title, benefit text, key rate pill, primary CTA, secondary link | Crimson, Navy, Gold, and Forest Green themes |
| **FeatureGrid** | `AccountsPage.jsx`, `LoansPage.jsx` | Responsive 3-column card layouts detailing interest rates and perks | Standard, High-Yield, Metal variants |

---

## 4. Financial Calculator Components

| Component | File Path | Inputs & Formula | Visual Feedback |
|---|---|---|---|
| **EMICalculator** | `CalculatorsPage.jsx` | Amount, Interest Rate, Tenure sliders | Live monthly EMI amount, total interest breakdown |
| **FDCalculator** | `CalculatorsPage.jsx` | Principal, Tenure, Senior Citizen (+0.50%) toggle | Maturity amount, accumulated interest earnings |
| **RDCalculator** | `CalculatorsPage.jsx` | Monthly deposit, tenure, annual interest rate | Total invested corpus vs. final maturity value |
| **SavingsCompounding**| `CalculatorsPage.jsx` | Average monthly balance, interest rate | Monthly interest credit vs. traditional quarterly payout |
| **SIPCalculator** | `CalculatorsPage.jsx` | Monthly investment, expected return rate, years | Wealth gain chart, total invested vs. estimated maturity |

---

## 5. Customer Portal & Transaction Primitives

| Component | File Path | Purpose | Behavior |
|---|---|---|---|
| **AccountBalanceCard** | `PortalDashboardPage.jsx` | Balance overview, quick transfer trigger | Balance visibility toggle (Eye/EyeOff) |
| **TransferModal** | `PortalDashboardPage.jsx` | Simulated instant IMPS/NEFT fund transfers | Form validation, live debit deduction, UTR generation |
| **TransactionTable** | `PortalDashboardPage.jsx` | Recent transaction history with category badges | Debit/Credit color coding, formatted date/time |
| **ApplicationTracker** | `PortalDashboardPage.jsx` | Multi-stage pipeline stepper for loan/account requests | Submitted -> Review -> Verification -> Approved |
