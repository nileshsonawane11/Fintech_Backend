// Finance math library — pure functions, INR, paise-safe.
//
// Conventions:
// - All money inputs/outputs are rupee numbers; monetary results are rounded
//   to paise (2 decimals). The EMI amortization schedule is computed in
//   integer paise internally so its principal components sum EXACTLY to the
//   loan principal and the closing balance ends at exactly 0.
// - Rates are annual percentages (12 means 12% p.a.) unless a name says else.
// - Invalid input is rejected loudly: non-finite numbers throw TypeError,
//   out-of-range values throw RangeError. Calculators never silently
//   return NaN.

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round a rupee amount to paise (2 decimals). */
export function roundToPaise(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

const toPaise = (rupees) => Math.round(rupees * 100);
const fromPaise = (paise) => paise / 100;

function assertFiniteNumber(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${String(value)}`);
  }
}

function assertPositive(name, value) {
  assertFiniteNumber(name, value);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0, got ${value}`);
}

function assertRate(name, value) {
  assertFiniteNumber(name, value);
  if (value < 0) throw new RangeError(`${name} must not be negative, got ${value}`);
}

function assertTenureMonths(value) {
  assertFiniteNumber('tenureMonths', value);
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`tenureMonths must be a positive whole number of months, got ${value}`);
  }
}

// ---------------------------------------------------------------------------
// EMI / loans (reducing balance)
// ---------------------------------------------------------------------------

/**
 * Monthly EMI and full amortization schedule for a reducing-balance loan.
 *
 * EMI = P · r · (1+r)^n / ((1+r)^n − 1), r = annualRatePct / 1200.
 * At a 0% rate the EMI is simply principal / months.
 * The final instalment is adjusted by a few paise, if needed, so the loan
 * closes at exactly 0 and the schedule's principal parts sum exactly to the
 * original principal.
 *
 * @returns {{ emi: number, totalPayment: number, totalInterest: number,
 *   schedule: Array<{ month: number, emi: number, principal: number,
 *   interest: number, balance: number }> }}
 *   `balance` is the outstanding balance AFTER that month's payment.
 */
export function calculateEMI(principal, annualRatePct, tenureMonths) {
  assertPositive('principal', principal);
  assertRate('annualRatePct', annualRatePct);
  assertTenureMonths(tenureMonths);

  const principalPaise = toPaise(principal);
  const r = annualRatePct / 1200;

  let emiPaise;
  if (r === 0) {
    emiPaise = Math.round(principalPaise / tenureMonths);
  } else {
    const factor = Math.pow(1 + r, tenureMonths);
    emiPaise = Math.round((principalPaise * r * factor) / (factor - 1));
  }

  let balancePaise = principalPaise;
  let totalInterestPaise = 0;
  const schedule = [];

  for (let month = 1; month <= tenureMonths; month += 1) {
    const interestPaise = Math.round(balancePaise * r);
    let principalPartPaise = emiPaise - interestPaise;
    let paymentPaise = emiPaise;
    if (month === tenureMonths || principalPartPaise >= balancePaise) {
      // Closing instalment: clear whatever principal remains.
      principalPartPaise = balancePaise;
      paymentPaise = balancePaise + interestPaise;
    }
    balancePaise -= principalPartPaise;
    totalInterestPaise += interestPaise;
    schedule.push({
      month,
      emi: fromPaise(paymentPaise),
      principal: fromPaise(principalPartPaise),
      interest: fromPaise(interestPaise),
      balance: fromPaise(balancePaise),
    });
  }

  return {
    emi: fromPaise(emiPaise),
    totalPayment: fromPaise(principalPaise + totalInterestPaise),
    totalInterest: fromPaise(totalInterestPaise),
    schedule,
  };
}

// ---------------------------------------------------------------------------
// Bullet Repayment (Gold Loan option)
// ---------------------------------------------------------------------------

/**
 * Bullet repayment calculation for gold / short-term loans.
 * In a bullet repayment, principal is repaid as a lump sum at the end of tenure,
 * with simple interest accrued over the period:
 * Interest = Principal · (annualRatePct / 100) · (tenureMonths / 12)
 *
 * @param {number} principal
 * @param {number} annualRatePct
 * @param {number} tenureMonths
 * @returns {{ principal: number, totalInterest: number, totalPayment: number, monthlyInterest: number }}
 */
export function calculateBulletRepayment(principal, annualRatePct, tenureMonths) {
  assertPositive('principal', principal);
  assertRate('annualRatePct', annualRatePct);
  assertTenureMonths(tenureMonths);

  const totalInterest = roundToPaise((principal * (annualRatePct / 100) * tenureMonths) / 12);
  const totalPayment = roundToPaise(principal + totalInterest);
  const monthlyInterest = roundToPaise(totalInterest / tenureMonths);

  return {
    principal,
    totalInterest,
    totalPayment,
    monthlyInterest,
  };
}

// ---------------------------------------------------------------------------
// Fixed Deposit — quarterly compounding (the Indian bank standard)
// ---------------------------------------------------------------------------

/**
 * FD maturity with quarterly compounding: A = P · (1 + rate/400)^(months/3).
 * Tenures that are not a whole number of quarters use the fractional
 * exponent, i.e. interest keeps accruing pro-rata for the part quarter.
 *
 * @param {{ principal: number, annualRatePct: number, tenureMonths: number,
 *   seniorCitizen?: boolean, seniorCitizenDeltaPct?: number }} input
 *   `seniorCitizenDeltaPct` (default 0.50) is ADDED to the base rate when
 *   `seniorCitizen` is true.
 * @returns {{ principal: number, rateAppliedPct: number,
 *   maturityValue: number, interestEarned: number }}
 */
export function calculateFD({
  principal,
  annualRatePct,
  tenureMonths,
  seniorCitizen = false,
  seniorCitizenDeltaPct = 0.5,
} = {}) {
  assertPositive('principal', principal);
  assertRate('annualRatePct', annualRatePct);
  assertTenureMonths(tenureMonths);
  assertRate('seniorCitizenDeltaPct', seniorCitizenDeltaPct);

  const rateAppliedPct = annualRatePct + (seniorCitizen ? seniorCitizenDeltaPct : 0);
  const maturityValue = roundToPaise(
    principal * Math.pow(1 + rateAppliedPct / 400, tenureMonths / 3),
  );
  return {
    principal: roundToPaise(principal),
    rateAppliedPct,
    maturityValue,
    interestEarned: roundToPaise(maturityValue - principal),
  };
}

/**
 * Premature FD withdrawal estimate. The bank practice modelled here: the
 * depositor earns the booked rate LESS a penalty (default 1 percentage
 * point) for the period actually completed, floored at 0%. (A real bank
 * would use the rate slab for the completed tenure; slab data is not part
 * of this library, so the booked-rate-minus-penalty model is used and
 * documented as such.)
 *
 * @param {{ principal: number, annualRatePct: number, tenureMonths: number,
 *   completedMonths: number, penaltyPct?: number }} input
 *   `tenureMonths` is the originally booked tenure; `completedMonths` must
 *   be smaller — for a deposit held to term, use calculateFD.
 * @returns {{ principal: number, rateAppliedPct: number,
 *   payoutValue: number, interestEarned: number }}
 */
export function calculateFDPreclosure({
  principal,
  annualRatePct,
  tenureMonths,
  completedMonths,
  penaltyPct = 1,
} = {}) {
  assertPositive('principal', principal);
  assertRate('annualRatePct', annualRatePct);
  assertTenureMonths(tenureMonths);
  assertTenureMonths(completedMonths);
  assertRate('penaltyPct', penaltyPct);
  if (completedMonths >= tenureMonths) {
    throw new RangeError(
      'completedMonths must be less than the booked tenureMonths for a preclosure; use calculateFD at maturity',
    );
  }

  const rateAppliedPct = Math.max(0, annualRatePct - penaltyPct);
  const payoutValue = roundToPaise(
    principal * Math.pow(1 + rateAppliedPct / 400, completedMonths / 3),
  );
  return {
    principal: roundToPaise(principal),
    rateAppliedPct,
    payoutValue,
    interestEarned: roundToPaise(payoutValue - principal),
  };
}

// ---------------------------------------------------------------------------
// Recurring Deposit — monthly deposits, quarterly compounding
// ---------------------------------------------------------------------------

/**
 * RD maturity using the standard Indian banking formula
 *   M = P · [(1+i)^n − 1] / [1 − (1+i)^(−1/3)]
 * where P is the monthly deposit, i = annualRatePct/400 (quarterly rate)
 * and n = tenureMonths/3 (number of quarters). This is exactly equivalent
 * to depositing at the start of each month and letting every instalment
 * compound quarterly for its remaining term.
 *
 * @param {{ monthlyDeposit: number, annualRatePct: number,
 *   tenureMonths: number }} input
 * @returns {{ totalDeposited: number, maturityValue: number,
 *   interestEarned: number }}
 */
export function calculateRD({ monthlyDeposit, annualRatePct, tenureMonths } = {}) {
  assertPositive('monthlyDeposit', monthlyDeposit);
  assertRate('annualRatePct', annualRatePct);
  assertTenureMonths(tenureMonths);

  const totalDeposited = roundToPaise(monthlyDeposit * tenureMonths);
  if (annualRatePct === 0) {
    return { totalDeposited, maturityValue: totalDeposited, interestEarned: 0 };
  }
  const i = annualRatePct / 400;
  const quarters = tenureMonths / 3;
  const maturityValue = roundToPaise(
    (monthlyDeposit * (Math.pow(1 + i, quarters) - 1)) / (1 - Math.pow(1 + i, -1 / 3)),
  );
  return {
    totalDeposited,
    maturityValue,
    interestEarned: roundToPaise(maturityValue - totalDeposited),
  };
}

// ---------------------------------------------------------------------------
// SIP — monthly investments, annuity due
// ---------------------------------------------------------------------------

/**
 * Future value of a monthly SIP where each instalment is invested at the
 * START of the month (annuity due):
 *   FV = P · [((1+r)^n − 1) / r] · (1 + r),  r = expectedReturnPct / 1200.
 * Returns are an assumption, never a guarantee — callers must label them
 * as projections.
 *
 * @param {{ monthlyInvestment: number, expectedReturnPct: number,
 *   tenureMonths: number }} input
 * @returns {{ totalInvested: number, maturityValue: number,
 *   estimatedGain: number }}
 */
export function calculateSIP({ monthlyInvestment, expectedReturnPct, tenureMonths } = {}) {
  assertPositive('monthlyInvestment', monthlyInvestment);
  assertRate('expectedReturnPct', expectedReturnPct);
  assertTenureMonths(tenureMonths);

  const totalInvested = roundToPaise(monthlyInvestment * tenureMonths);
  const r = expectedReturnPct / 1200;
  if (r === 0) {
    return { totalInvested, maturityValue: totalInvested, estimatedGain: 0 };
  }
  const maturityValue = roundToPaise(
    monthlyInvestment * ((Math.pow(1 + r, tenureMonths) - 1) / r) * (1 + r),
  );
  return {
    totalInvested,
    maturityValue,
    estimatedGain: roundToPaise(maturityValue - totalInvested),
  };
}

// ---------------------------------------------------------------------------
// SSY (Sukanya Samriddhi Yojana) — annual deposits, yearly compounding
// ---------------------------------------------------------------------------

/**
 * SSY maturity projection. Deposits are made at the start of each deposit
 * year and capped per year at `maxDepositPerYear` (scheme cap, default
 * ₹1,50,000); interest compounds annually on the balance including that
 * year's deposit. This is a projection model — the statutory scheme
 * computes interest monthly on minimum balances, so treat the output as
 * an estimate, not a scheme statement.
 *
 * @param {{ annualDeposit: number, annualRatePct: number,
 *   depositYears?: number, maturityYears?: number,
 *   maxDepositPerYear?: number }} input
 * @returns {{ appliedAnnualDeposit: number, totalDeposited: number,
 *   interestEarned: number, maturityValue: number,
 *   schedule: Array<{ year: number, deposit: number, interest: number,
 *   balance: number }> }}
 */
export function calculateSSY({
  annualDeposit,
  annualRatePct,
  depositYears = 15,
  maturityYears = 21,
  maxDepositPerYear = 150000,
} = {}) {
  assertPositive('annualDeposit', annualDeposit);
  assertRate('annualRatePct', annualRatePct);
  assertPositive('depositYears', depositYears);
  assertPositive('maturityYears', maturityYears);
  if (!Number.isInteger(depositYears) || !Number.isInteger(maturityYears)) {
    throw new RangeError('depositYears and maturityYears must be whole years');
  }
  if (maturityYears < depositYears) {
    throw new RangeError('maturityYears must be greater than or equal to depositYears');
  }
  assertPositive('maxDepositPerYear', maxDepositPerYear);

  const appliedAnnualDeposit = Math.min(annualDeposit, maxDepositPerYear);
  let balance = 0;
  const schedule = [];
  for (let year = 1; year <= maturityYears; year += 1) {
    const deposit = year <= depositYears ? appliedAnnualDeposit : 0;
    balance = roundToPaise(balance + deposit);
    const interest = roundToPaise((balance * annualRatePct) / 100);
    balance = roundToPaise(balance + interest);
    schedule.push({ year, deposit, interest, balance });
  }

  const totalDeposited = roundToPaise(appliedAnnualDeposit * depositYears);
  return {
    appliedAnnualDeposit,
    totalDeposited,
    interestEarned: roundToPaise(balance - totalDeposited),
    maturityValue: balance,
    schedule,
  };
}

// ---------------------------------------------------------------------------
// Formatting / parsing helpers
// ---------------------------------------------------------------------------

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a rupee amount with Indian digit grouping and paise:
 * formatINR(1234567.89) === '₹12,34,567.89'. Null/NaN renders as '—'.
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return inrFormatter.format(Number(amount));
}

/**
 * Compact Indian formatting for headline figures:
 * ₹1.50 Cr at/above a crore, ₹2.50 L at/above a lakh, full formatINR below.
 */
export function formatINRCompact(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return formatINR(n);
}

const AMOUNT_SUFFIXES = {
  cr: 1e7,
  crore: 1e7,
  l: 1e5,
  lac: 1e5,
  lakh: 1e5,
  k: 1e3,
};

/**
 * Parse a user-typed amount into a rupee number. Accepts an optional ₹,
 * Indian or western digit grouping ('1,00,000'), decimals, and a magnitude
 * suffix: '2.5L' / '2.5 lakh' → 250000, '1.2 Cr' → 12000000, '50k' → 50000.
 * Returns NaN for anything unparseable (including empty input).
 */
export function parseAmount(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  if (typeof input !== 'string') return NaN;
  const cleaned = input.replace(/₹/g, '').replace(/,/g, '').trim();
  if (!cleaned) return NaN;
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l|k)?$/i);
  if (!match) return NaN;
  const base = Number.parseFloat(match[1]);
  const multiplier = match[2] ? AMOUNT_SUFFIXES[match[2].toLowerCase()] : 1;
  return base * multiplier;
}
