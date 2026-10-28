# FinEdge Bank — Technical Architecture & Implementation Plan

Technical architecture, module composition, and engineering specifications for the FinEdge Bank web platform.

---

## 1. Core Technical Stack & Architecture

- **Framework:** React 19.2 (Hooks, Actions, Transitions, Optimized Rendering).
- **Tooling:** Vite 8.3 (Hot Module Replacement, optimized rollup production bundling).
- **Styling Architecture:** Tailwind CSS 4.3 with semantic FinEdge design tokens.
- **Routing:** React Router 7.18 (declarative SPA routing, protected portal guards, dynamic navigation).
- **State Architecture:** React Context API for global accessibility and authentication state; component-level reactive state for calculators and modal workflows.
- **Accessibility:** Strict WCAG 2.1 AA compliance (ARIA live regions, semantic landmark tags, screen-reader headings, keyboard navigation).

---

## 2. Comprehensive Domain Module Coverage

### A. Accounts & Deposits Ecosystem
1. **Savings Accounts:**
   - Standard High-Yield (up to 7% interest compounding monthly)
   - Corporate Salary Account (Zero balance, complimentary lounge access)
   - Senior Citizens Account (7.35% p.a., doorstep banking)
   - Student Youth Account (Zero fee, lifestyle discounts)
   - Minor Step Account (Guardian spending limits, piggy bank feature)
2. **Current & Commercial Accounts:**
   - Business Current Account (Auto-sweep into flexi-deposits, bulk payments)
3. **Deposits & Fixed Returns:**
   - Regular & Tax-Saving Fixed Deposit (Quarterly compounding)
   - Recurring Deposit (Flexible monthly contributions)
   - Sukanya Samriddhi Yojana (SSY) for girl child education

### B. Lending & Credit Facilities
1. **Retail Loans:**
   - Dream Home Loan (8.45% p.a., digital sanction in 48 hours)
   - MSME Business Loan (Collateral-free credit up to ₹75 Lakhs)
   - Kisan Agriculture Loan (Crop cycle seasonal repayments)
   - Vehicle & Auto Finance (Up to 100% on-road financing)
   - Instant Gold Loan (Disbursal in 20 minutes)
   - Loan Against Property (Commercial & residential mortgage)
   - Global Education Loan (Moratorium grace period during studies)

### C. Cards & Payments
1. **Credit Cards Matrix:**
   - Ashva Metal Credit Card (Handcrafted stainless steel, 0% forex markup)
   - Mayura Luxury Metal Card (Curated dining, airport concierge)
   - FinEdge Millennia Credit Card (Lifetime free, 5% cashback)
   - FIRST WOW! FD-Backed Card (Guaranteed instant approval credit builder)
2. **Debit Cards:**
   - Platinum Contactless Debit Card (Daily limit ₹5,00,000, zero fraud liability)

---

## 3. Financial Calculation Engines

- **Loan EMI Calculator:** Reduces principal monthly, accurately calculating amortization schedules.
- **Fixed Deposit (FD) Engine:** Quarterly compounding ($A = P(1+r/400)^{4t}$) with Senior Citizen (+0.50%) toggle.
- **Recurring Deposit (RD) Engine:** Compounded monthly installments with exact terminal maturity calculation.
- **Savings Monthly Compounding:** Visual comparison demonstrating higher compounding yields from monthly interest credits.
- **SIP Wealth Growth:** Multi-decade capital compounding projections for retail mutual fund investors.

---

## 4. Simulated Customer Portal

- **Secure Sandbox Login:** One-click demo credentials for quick walkthrough.
- **Live Balances:** Savings and current account balances with visibility toggles.
- **Instant Fund Transfers:** IMPS/NEFT fund transfers with immediate balance updates and generated UTR references.
- **Transaction Ledger:** Live searchable and categorised transaction stream.
- **Underwriting Pipeline:** Real-time application tracker for loans and credit cards.
