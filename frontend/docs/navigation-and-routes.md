# FinEdge Bank — Navigation & Route Directory

Comprehensive routing architecture and page hierarchy for the FinEdge Bank web application.

---

## 1. Top-Level Public Domain Segments

| Route Path | View / Component | Target Segment | Access Policy |
|---|---|---|---|
| `/` | `HomePage.jsx` | All Retail & Commercial Customers | Public |
| `/accounts` | `AccountsPage.jsx` | Savings, Salary, Minor & Current Account Holders | Public |
| `/loans` | `LoansPage.jsx` | Home, Personal, Business, Gold & Auto Borrowers | Public |
| `/cards` | `CardsPage.jsx` | Premium Metal, Millennia & Credit Card Applicants | Public |
| `/investments` | `InvestmentsPage.jsx`| Fixed Deposit, RD, SIP & Wealth Investors | Public |
| `/calculators` | `CalculatorsPage.jsx` | Financial Planning & Calculation Hub | Public |
| `/portal/login` | `PortalLoginPage.jsx` | NetBanking Authentication Sandbox | Public |
| `/portal/dashboard` | `PortalDashboardPage.jsx` | Customer Account Dashboard & Transfer Desk | Protected (Requires Login) |

---

## 2. Product Segment Taxonomy & Modals

### Accounts Segment
- **High-Yield Savings Account** — Instant digital account opening with monthly interest credit.
- **Corporate Salary Account** — Zero minimum balance, complimentary accidental insurance, unlimited ATM withdrawals.
- **Senior Citizens Savings Account** — Preferential interest rates (7.35% p.a.), priority teller service.
- **Student Youth Account** — Zero account maintenance, discount perks on books, transport, and streaming.
- **Minor Step Savings Account** — Supervised digital piggy bank with parent/guardian spending controls.
- **Business Current Account** — High transaction limits, automated liquidity sweep, bulk payroll tools.

### Lending & Financing Segment
- **Dream Home Loan** — Flexible repayment tenures up to 30 years, balance transfer with top-up facility.
- **MSME Business Loan** — Collateral-free credit lines for equipment purchase and working capital.
- **Kisan Agriculture Loan** — Tailored seasonal repayment aligned with crop harvesting cycles.
- **Car & Auto Loan** — Up to 100% on-road financing for electric and internal combustion vehicles.
- **Instant Gold Loan** — Disbursal in 20 minutes with bank-vault security.
- **Loan Against Property (LAP)** — Unlock equity from commercial and residential real estate.
- **Global Education Loan** — Covers tuition, living expenses, and travel with moratorium grace periods.

### Cards Segment
- **Ashva Metal Credit Card** — Stainless-steel body, 0% forex markup, complimentary golf and airport lounges.
- **Mayura Luxury Metal Card** — Ultra-premium concierge service, curated dining, and high rewards multiplier.
- **FinEdge Millennia Card** — Lifetime free credit card with 5% cashback on online shopping.
- **FIRST WOW! FD-Backed Card** — 100% approval rate, credit-score builder secured against fixed deposit.
- **Platinum Contactless Debit Card** — Daily purchase limit of ₹5,00,000, fraud liability protection.

### Investments & Wealth Segment
- **Term Fixed Deposit** — Guaranteed returns up to 7.10% p.a. (7.60% for Senior Citizens), quarterly compounding.
- **Recurring Deposit** — Disciplined monthly investments starting from ₹500/month.
- **Direct Mutual Fund SIP** — Zero-commission index funds and equity schemes with automated mandates.
- **Sukanya Samriddhi Yojana (SSY)** — Government-backed sovereign scheme for girl child education and marriage.

---

## 3. Omnichannel Modals & Workflows

- **`/apply` (Application Flow Modal):** Unified instant application modal launched across all product detail cards.
  - Step 1: Identity & Mobile Verification (Aadhaar linked)
  - Step 2: Income & Employment Category Selection
  - Step 3: Branch Selection & PIN Code Mapping
  - Step 4: Submission & Instant Reference Number Generation
- **`/portal/transfer`:** Simulated transfer interface supporting IMPS and NEFT transactions with live balance deduction.
- **`/portal/track`:** Application status tracker visualizing multi-tier underwriting progression.
