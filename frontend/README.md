# FinEdge Bank — Enterprise FinTech Banking Platform

A modern, responsive, and reactive FinTech banking application built with **React 19**, **Vite**, **Tailwind CSS**, and **React Router**.

---

## 🌟 Key Features

### 1. Benchmark Design System & Foundations
- **Tokens & Colors:** Brand Crimson (`#9D1D27`), Dark Burgundy (`#7A1620`), Accent Gold (`#C9A227`), and Slate Charcoal (`#1C1B1F` / `#25243B`).
- **Typography:** `Inter` font scale, high-contrast layouts, WCAG 2.1 AA accessible.
- **Accessibility Controls:** S/M/L root font scaling and normal/wide letter-spacing controls in the top ribbon.
- **Micro-Interactions:** Smooth card elevation, custom active tab pills, and keyboard navigation.

### 2. Comprehensive Navigation & Homepage
- **Sticky Header:** Category mega-menus for Accounts and Loans, search with route redirection, and NetBanking portal triggers.
- **Customer Support Ticker:** Dynamic rotating ticker cycling support hotlines and branch assistance every 3.2s.
- **Hero Offer Slider:** Multi-slide interactive carousel with working chevron controls and dot indicators.
- **Curated Product Tabs:** Filter products across Popular, Accounts, Loans, Credit Cards, and Investments.
- **Regulatory Footer:** 5-column sitemap, RBI/DICGC insurance notices, and legal compliance disclosures.

### 3. Complete Banking Ecosystem
- **Accounts:** Savings Account (up to 7% monthly interest credit), Business Current Account (BRAVO Auto-Sweep), Corporate Salary Account, Student Youth Account, Minor Savings Account.
- **Loans:** Dream Home Loan (8.45%), MSME Business Loan, Kisan Agri Loan, Car/Auto Loan, Instant Gold Loan (20-minute disbursal), Loan Against Property (LAP), Global Education Loan.
- **Cards:** Stainless-steel Ashva & Mayura Metal Cards (0% forex markup, lounge access), FinEdge Millennia (Lifetime Free), FIRST WOW! (100% Guaranteed FD-backed card), Platinum Debit Card.
- **Investments:** High-Yield Fixed Deposits (7.10% p.a., 7.60% for Senior Citizens), Recurring Deposits, Direct Mutual Fund SIPs, Sukanya Samriddhi Yojana (SSY).
- **Interactive Application Modal:** Instant digital onboarding with real-time validation (Aadhaar-linked mobile, PAN format, 6-digit PIN code).

### 4. Mathematical Financial Calculators
- **Loan EMI Calculator:** Reducing balance formula ($P \cdot r \cdot \frac{(1+r)^n}{(1+r)^n - 1}$) with live dual-sliders for Amount, Rate, and Tenure.
- **Fixed Deposit (FD) Calculator:** Quarterly compounded $P(1+r/400)^{4t}$ with Senior Citizen (+0.50%) toggle.
- **Recurring Deposit (RD) Calculator:** Compounded monthly installments.
- **Savings Monthly Compounding:** Visualizing the accelerated growth of monthly interest crediting.
- **SIP Wealth Calculator:** Projecting long-term equity market compounding.

### 5. Simulated FinTech Customer Portal
- **Demo NetBanking Login:** Sandbox login with one-click test credentials for *Vikramaditya Sharma*.
- **Customer Dashboard:** Real-time balance toggle (Eye/EyeOff), pre-approved loan credit lines, and card usage.
- **Simulated Transfers:** Instant IMPS/NEFT fund transfers with generated UTR confirmation references.
- **Ledger Records:** Interactive categorized transaction table.
- **Application Status Tracker:** Multi-stage pipeline stepper (Submitted -> Verification -> Video KYC -> Disbursed).

---

## 🛠️ Tech Stack

- **Framework:** React 19.2.8
- **Build Tool:** Vite 8.3.4
- **Routing:** React Router 7.18.4
- **Styling:** Tailwind CSS 4.3.3
- **Icons:** Lucide React

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/nileshsonawane11/Fintech_Frontend.git
cd Fintech_Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## 📚 Platform Documentation

Engineering and architectural specifications are located in the `docs/` folder:
- [`docs/finedge-bank.md`](docs/finedge-bank.md) — Platform overview, core pillars, and executive architecture
- [`docs/navigation-and-routes.md`](docs/navigation-and-routes.md) — Comprehensive routing and page hierarchy
- [`docs/design-system.md`](docs/design-system.md) — Complete tokens, color palettes, and typography
- [`docs/component-library.md`](docs/component-library.md) — Production component catalogue and UI specifications
- [`docs/interaction-specification.md`](docs/interaction-specification.md) — Micro-interactions, formulas, and form validation
- [`docs/technical-architecture.md`](docs/technical-architecture.md) — Technical architecture and domain composition
- [`docs/feature-deliverables.md`](docs/feature-deliverables.md) — Feature deliverable checklist and milestones
- [`docs/quality-assurance-report.md`](docs/quality-assurance-report.md) — Verification suite and test cases

---

## ⚖️ Disclaimer

*This application is built for educational, portfolio, and demonstrative FinTech engineering purposes. Calculations and offers shown are illustrative. No real card PINs, CVVs, or live banking transactions are processed.*
