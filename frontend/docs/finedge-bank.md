# FinEdge Bank — Platform Architecture & Executive Overview

**Entity:** FinEdge Retail & Commercial Banking  
**Domain:** Enterprise FinTech & Digital Banking Architecture  
**Release Version:** v2.4 (React 19 Enterprise Release)  
**Standard:** RBI Digital Banking Unit (DBU) & DICGC Insured Guidelines  

---

## 1. Executive Summary

FinEdge Bank is a digital-first, high-yield financial institution and next-generation FinTech banking platform. The frontend web application is engineered to provide retail, commercial, and institutional clients with seamless access to high-yield savings (featuring monthly interest crediting), tax-efficient deposits, pre-approved lending facilities, premium metal cards, and wealth management portfolios.

The frontend is architected as an ultra-fast, reactive Single Page Application (SPA) utilizing **React 19**, **Vite**, **Tailwind CSS**, and **React Router**, delivering sub-second route transitions, WCAG 2.1 AA accessibility compliance, and bank-grade client-side mathematical modeling.

---

## 2. Core Architectural Pillars

### A. High-Yield Retail & Commercial Ecosystem
FinEdge Bank differentiates itself with customer-centric financial engineering:
- **Monthly Interest Compounding:** Savings accounts credit interest on the last calendar day of every month, accelerating compounding velocity compared to traditional quarterly crediting.
- **Auto-Sweep Commercial Accounts:** Current accounts feature automated BRAVO sweeps into interest-bearing flexi-deposits above configurable threshold balances.
- **Instant Digital Sanctions:** Modular onboarding and loan applications with automated validation for PAN, Aadhaar-linked mobile verification, and PIN-code geolocation.
- **Metal & High-Reward Card Matrix:** Premium contactless cards with 0% forex markup, complimentary lounge access, and zero-fee annual structures.

### B. Accessibility & Omnichannel Inclusivity
- **Global Typography Scaling:** One-click root-level font resizing (`S`, `M`, `L`) dynamically adjusting viewport rem scales.
- **Letter-Spacing Typography Ribbon:** Dynamic tracking adjustment to assist users with visual fatigue or dyslexia.
- **High-Contrast Design Tokens:** Strict contrast ratios exceeding 4.5:1 for body copy and 3.0:1 for large display elements.
- **Full Keyboard Traversal:** Keyboard focus outlines, skip-to-content anchors, and accessible ARIA attributes across all interactive components.

### C. Client-Side Mathematical Engines
FinEdge provides zero-latency financial calculators executing exact actuarial and compound formulas:
- **Reducing Balance Loan EMI:** Dynamically computing monthly amortization with dual slider-numeric synchronization.
- **Quarterly Compounded Fixed Deposits:** Accurately compounding interest according to standard banking regulations, with instant senior citizen rate adjustments (+0.50%).
- **Recurring Deposit & SIP Accumulator:** Projecting long-term capital appreciation and compounding returns for disciplined investors.

---

## 3. Product Ecosystem

| Division | Flagship Offerings | Core Value Proposition |
|---|---|---|
| **Retail Accounts** | High-Yield Savings, Corporate Salary, Senior Citizen Savings, Student Youth, Minor Step | Up to 7.00% p.a. with monthly interest crediting, zero account maintenance fees on salary accounts. |
| **Commercial Accounts** | Business Current Account, Startup Flexi-Line | Automated liquidity sweep, multi-user permissions, unlimited free RTGS/NEFT transactions. |
| **Lending & Credit** | Dream Home Loan, MSME Business Loan, Agri Loan, Auto Finance, Instant Gold Loan, LAP | In-principle digital sanction within 48 hours, transparent interest rates from 8.45% p.a. |
| **Cards Division** | Ashva Metal, Mayura Luxury Metal, FinEdge Millennia, FIRST WOW! FD-Backed | Handcrafted metal card bodies, zero forex markup, lifetime free options, guaranteed credit builder cards. |
| **Wealth & Investments**| Term Fixed Deposits, Recurring Deposits, Direct Mutual Fund SIPs, SSY | Up to 7.60% p.a. for Senior Citizens, tax exemption under Section 80C, automated SIP debits. |

---

## 4. Security Architecture & Boundary Isolation

1. **Client Isolation:** The frontend operates on strict zero-trust sandbox principles. No card PINs, CVVs, or biometric credentials are ever stored client-side.
2. **Session Security:** NetBanking simulation maintains transient, encrypted session state in memory, with automatic timeout and instant clearance upon logout.
3. **Transaction Integrity:** Transfer workflows generate cryptographically unique UTR (Unique Transaction Reference) codes and simulate dual-factor authorization before ledger commitment.
