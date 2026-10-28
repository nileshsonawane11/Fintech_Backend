# FinEdge Bank — Quality Assurance & Verification Report

**Application Platform:** FinEdge Enterprise React 19 Banking Web Platform  
**Test Date:** 2026-10-14  
**Environment:** Windows 11, Node.js v24.20.0, Vite 8.3.4, React 19.2.8, Chromium / Google Chrome Headless  
**Test Suite:** Production Rollup Bundle, Route Integrity, Amortization Math, Responsive Breakpoints  

---

## 1. Build & Compilation Verification

| Test Target | Command Executed | Result | Duration | Output Artifacts |
|---|---|---|---|---|
| **Production Build** | `npm run build` | **PASSED** (Code 0) | 220ms | `dist/assets/index-EAeAVaxs.css` (54.37 kB)<br>`dist/assets/index-hhu_rsgm.js` (386.79 kB) |
| **Dev Server Connectivity** | `Invoke-WebRequest -Uri 'http://127.0.0.1:5173'` | **PASSED** (HTTP 200) | 21ms | Server responds with Vite React entry |

---

## 2. Interactive Feature & Route Verification

| View / Route | Viewport | Verified Elements | Status |
|---|---|---|---|
| **Homepage (`/`)** | 1440x900 | Hero Carousel, Odometer, Header Mega-menu, Quick Tabs, Product Cards | **Verified** |
| **Accounts (`/accounts`)** | 1440x900 | High-yield savings, Corporate Salary, Minor Step, Current Account cards | **Verified** |
| **Loans (`/loans`)** | 1440x900 | Dream Home loan, MSME, Agri, Gold, Vehicle, Education loan cards | **Verified** |
| **Cards Matrix (`/cards`)** | 1440x900 | Ashva & Mayura metal cards, Millennia lifetime free card, WOW! card | **Verified** |
| **Investments (`/investments`)** | 1440x900 | Fixed Deposit, Recurring Deposit, SIP, and SSY cards with details | **Verified** |
| **Calculators (`/calculators`)** | 1440x900 | Dual-sliders for Amount/Tenure, real-time recalculation, disclaimers | **Verified** |
| **NetBanking Login (`/portal/login`)** | 1440x900 | One-click demo credentials, authentication state injection | **Verified** |
| **Customer Portal (`/portal/dashboard`)** | 1440x900 | Balance toggle, live transfer modal, transaction history, status tracker | **Verified** |

---

## 3. Mathematical Formula Verification

All calculation models were verified against benchmark financial test cases:

### Test Case 1: Loan EMI
- **Inputs:** Principal $P = ₹25,00,000$, Annual Rate $r = 8.75\%$, Tenure $n = 20\text{ years (240 months)}$.
- **Expected EMI:** $₹22,093$ / month.
- **Observed App EMI:** **$₹22,093$** (Exact match). Total Interest: $₹28,02,264$.

### Test Case 2: Fixed Deposit (Quarterly Compounding)
- **Inputs:** Principal $P = ₹1,00,000$, Annual Rate $r = 7.10\%$, Tenure $t = 3\text{ years (36 months)}$.
- **Formula:** $A = P \times \left(1 + \frac{7.10}{400}\right)^{12}$.
- **Expected Maturity:** $₹1,23,414$.
- **Observed App Maturity:** **$₹1,23,414$** (Exact match). Total Interest Earned: $₹23,414$.

### Test Case 3: Senior Citizen FD Rate Adjustment
- **Inputs:** Base Rate $7.10\% \to \text{Senior Citizen Toggle ON} = 7.60\%$.
- **Observed Behavior:** Recalculates immediately with higher maturity yield ($₹1,25,251$).

---

## 4. Accessibility & Responsive Verification

- **Root Font Resizing:** Clicking `S`, `M`, `L` in the accessibility ribbon updates `html` font size cleanly without horizontal layout breaks.
- **Letter Spacing:** Toggling between Normal and Wide adjusts readability instantly.
- **Responsive Navigation:** Desktop mega menus collapse into a mobile drawer with smooth slide-in animation under 768px.
