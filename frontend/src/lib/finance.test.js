import { describe, expect, it } from 'vitest';
import {
  calculateEMI,
  calculateFD,
  calculateFDPreclosure,
  calculateRD,
  calculateSIP,
  calculateSSY,
  formatINR,
  formatINRCompact,
  parseAmount,
  roundToPaise,
} from './finance.js';

// Every "known value" below was derived independently of the implementation
// (hand arithmetic or published calculator anchors) — see the comments.

describe('calculateEMI', () => {
  it('matches the textbook value: ₹1,00,000 at 12% p.a. for 12 months', () => {
    // EMI = 100000 · 0.01 · (1.01)^12 / ((1.01)^12 − 1) = ₹8,884.8788… → ₹8,884.88
    const res = calculateEMI(100000, 12, 12);
    expect(res.emi).toBe(8884.88);
    expect(res.totalInterest).toBe(6618.53);
    expect(res.totalPayment).toBe(106618.53);
    expect(res.schedule).toHaveLength(12);
  });

  it('amortization principal sums EXACTLY to the loan amount and closes at 0', () => {
    const res = calculateEMI(100000, 12, 12);
    const principalPaise = res.schedule.reduce((s, r) => s + Math.round(r.principal * 100), 0);
    expect(principalPaise).toBe(10000000); // ₹1,00,000.00 in paise, to the paisa
    expect(res.schedule.at(-1).balance).toBe(0);
  });

  it('first month of the anchor loan splits ₹8,884.88 into ₹1,000 interest + ₹7,884.88 principal', () => {
    // Month 1 interest = 1,00,000 × 1% = ₹1,000 exactly.
    const [first] = calculateEMI(100000, 12, 12).schedule;
    expect(first).toEqual({ month: 1, emi: 8884.88, principal: 7884.88, interest: 1000, balance: 92115.12 });
  });

  it('handles a longer loan: ₹5,00,000 at 9% for 60 months', () => {
    // Standard reducing-balance result: EMI ₹10,379.18.
    const res = calculateEMI(500000, 9, 60);
    expect(res.emi).toBe(10379.18);
    expect(res.schedule).toHaveLength(60);
    const principalPaise = res.schedule.reduce((s, r) => s + Math.round(r.principal * 100), 0);
    expect(principalPaise).toBe(50000000);
    expect(res.schedule.at(-1).balance).toBe(0);
  });

  it('handles a 0% rate: EMI is principal / months, interest is 0', () => {
    const res = calculateEMI(120000, 0, 12);
    expect(res.emi).toBe(10000);
    expect(res.totalInterest).toBe(0);
    expect(res.totalPayment).toBe(120000);
    expect(res.schedule.every((r) => r.interest === 0)).toBe(true);
  });

  it('rejects invalid input', () => {
    expect(() => calculateEMI(-100000, 12, 12)).toThrow(RangeError);
    expect(() => calculateEMI(0, 12, 12)).toThrow(RangeError);
    expect(() => calculateEMI(100000, -1, 12)).toThrow(RangeError);
    expect(() => calculateEMI(100000, 12, 0)).toThrow(RangeError);
    expect(() => calculateEMI(100000, 12, 2.5)).toThrow(RangeError);
    expect(() => calculateEMI(Number.NaN, 12, 12)).toThrow(TypeError);
    expect(() => calculateEMI('100000', 12, 12)).toThrow(TypeError);
  });
});

describe('calculateFD', () => {
  it('quarterly compounding: ₹1,00,000 at 8% for 12 months', () => {
    // (1 + 8/400)^4 = 1.02^4 = 1.08243216 exactly → ₹1,08,243.22
    const res = calculateFD({ principal: 100000, annualRatePct: 8, tenureMonths: 12 });
    expect(res.maturityValue).toBe(108243.22);
    expect(res.interestEarned).toBe(8243.22);
    expect(res.rateAppliedPct).toBe(8);
  });

  it('adds the senior-citizen delta (default +0.50) to the rate', () => {
    // (1 + 8.5/400)^4 = 1.02125^4 ≈ 1.08774800 → ₹1,08,774.80
    const res = calculateFD({ principal: 100000, annualRatePct: 8, tenureMonths: 12, seniorCitizen: true });
    expect(res.rateAppliedPct).toBe(8.5);
    expect(res.maturityValue).toBe(108774.8);
    expect(res.interestEarned).toBe(8774.8);
  });

  it('respects a custom senior delta and ignores it for non-seniors', () => {
    const senior = calculateFD({ principal: 100000, annualRatePct: 8, tenureMonths: 12, seniorCitizen: true, seniorCitizenDeltaPct: 0.25 });
    expect(senior.rateAppliedPct).toBe(8.25);
    const plain = calculateFD({ principal: 100000, annualRatePct: 8, tenureMonths: 12, seniorCitizenDeltaPct: 0.25 });
    expect(plain.rateAppliedPct).toBe(8);
    expect(plain.maturityValue).toBe(108243.22);
  });

  it('supports tenures that are not whole quarters (7 months)', () => {
    // 1.02^(7/3) ≈ 1.0472903 → ₹1,04,729.03
    const res = calculateFD({ principal: 100000, annualRatePct: 8, tenureMonths: 7 });
    expect(res.maturityValue).toBe(104729.03);
  });

  it('0% rate returns the principal untouched', () => {
    const res = calculateFD({ principal: 50000, annualRatePct: 0, tenureMonths: 24 });
    expect(res.maturityValue).toBe(50000);
    expect(res.interestEarned).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => calculateFD({ principal: -1, annualRatePct: 8, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateFD({ principal: 1000, annualRatePct: -8, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateFD({ principal: 1000, annualRatePct: 8, tenureMonths: 0 })).toThrow(RangeError);
    expect(() => calculateFD()).toThrow(TypeError);
  });
});

describe('calculateFDPreclosure', () => {
  it('applies booked rate minus penalty for the completed period', () => {
    // Booked 8% for 24m, closed after 6m, 1% penalty → 7% for 2 quarters:
    // 1,00,000 × 1.0175^2 = 1,00,000 × 1.03530625 = ₹1,03,530.63
    const res = calculateFDPreclosure({ principal: 100000, annualRatePct: 8, tenureMonths: 24, completedMonths: 6 });
    expect(res.rateAppliedPct).toBe(7);
    expect(res.payoutValue).toBe(103530.63);
    expect(res.interestEarned).toBe(3530.63);
  });

  it('floors the penalised rate at 0%', () => {
    const res = calculateFDPreclosure({ principal: 100000, annualRatePct: 0.5, tenureMonths: 24, completedMonths: 6, penaltyPct: 1 });
    expect(res.rateAppliedPct).toBe(0);
    expect(res.payoutValue).toBe(100000);
  });

  it('refuses a "preclosure" at or beyond the booked tenure', () => {
    expect(() => calculateFDPreclosure({ principal: 1000, annualRatePct: 8, tenureMonths: 12, completedMonths: 12 })).toThrow(RangeError);
    expect(() => calculateFDPreclosure({ principal: 1000, annualRatePct: 8, tenureMonths: 12, completedMonths: 18 })).toThrow(RangeError);
    expect(() => calculateFDPreclosure({ principal: 1000, annualRatePct: 8, tenureMonths: 12, completedMonths: 0 })).toThrow(RangeError);
  });
});

describe('calculateRD', () => {
  it('₹5,000/month at 6% for 12 months', () => {
    // Standard RD formula: i = 6/400, n = 4 quarters →
    // 5000 · (1.015^4 − 1) / (1 − 1.015^(−1/3)) = ₹61,976.17
    const res = calculateRD({ monthlyDeposit: 5000, annualRatePct: 6, tenureMonths: 12 });
    expect(res.totalDeposited).toBe(60000);
    expect(res.maturityValue).toBe(61976.17);
    expect(res.interestEarned).toBe(1976.17);
  });

  it('₹10,000/month at 7% for 12 months', () => {
    const res = calculateRD({ monthlyDeposit: 10000, annualRatePct: 7, tenureMonths: 12 });
    expect(res.totalDeposited).toBe(120000);
    expect(res.maturityValue).toBe(124621.32);
    expect(res.interestEarned).toBe(4621.32);
  });

  it('closed form agrees with an independent per-instalment summation', () => {
    // Independent method: deposit at the start of each month; every
    // instalment compounds at the quarterly rate for its exact remaining
    // term, (months remaining)/3 quarters — computed as a plain loop here.
    const loopRD = (p, rate, months) => {
      const i = rate / 400;
      let sum = 0;
      for (let j = 0; j < months; j += 1) sum += p * Math.pow(1 + i, (months - j) / 3);
      return Math.round(sum * 100) / 100;
    };
    for (const [p, rate, months] of [[3000, 6.5, 18], [7500, 5.75, 36], [1000, 8, 6]]) {
      expect(calculateRD({ monthlyDeposit: p, annualRatePct: rate, tenureMonths: months }).maturityValue)
        .toBe(loopRD(p, rate, months));
    }
  });

  it('0% rate returns deposits only', () => {
    const res = calculateRD({ monthlyDeposit: 2000, annualRatePct: 0, tenureMonths: 10 });
    expect(res.maturityValue).toBe(20000);
    expect(res.interestEarned).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => calculateRD({ monthlyDeposit: 0, annualRatePct: 6, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateRD({ monthlyDeposit: 1000, annualRatePct: -6, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateRD({ monthlyDeposit: 1000, annualRatePct: 6, tenureMonths: -12 })).toThrow(RangeError);
  });
});

describe('calculateSIP', () => {
  it('₹10,000/month at 12% for 12 months (annuity due)', () => {
    // FV = 10000 · [(1.01^12 − 1)/0.01] · 1.01
    //    = 10000 · 12.68250301 · 1.01 = ₹1,28,093.28 (published SIP anchor)
    const res = calculateSIP({ monthlyInvestment: 10000, expectedReturnPct: 12, tenureMonths: 12 });
    expect(res.totalInvested).toBe(120000);
    expect(res.maturityValue).toBe(128093.28);
    expect(res.estimatedGain).toBe(8093.28);
  });

  it('gain is maturity minus invested for a longer horizon', () => {
    const res = calculateSIP({ monthlyInvestment: 25000, expectedReturnPct: 12, tenureMonths: 120 });
    expect(res.totalInvested).toBe(3000000);
    expect(res.estimatedGain).toBeCloseTo(res.maturityValue - res.totalInvested, 2);
    expect(res.maturityValue).toBeGreaterThan(res.totalInvested);
  });

  it('0% return returns the invested amount', () => {
    const res = calculateSIP({ monthlyInvestment: 5000, expectedReturnPct: 0, tenureMonths: 24 });
    expect(res.maturityValue).toBe(120000);
    expect(res.estimatedGain).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => calculateSIP({ monthlyInvestment: -5000, expectedReturnPct: 12, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateSIP({ monthlyInvestment: 5000, expectedReturnPct: -12, tenureMonths: 12 })).toThrow(RangeError);
    expect(() => calculateSIP({ monthlyInvestment: 5000, expectedReturnPct: 12, tenureMonths: 0 })).toThrow(RangeError);
  });
});

describe('calculateSSY', () => {
  it('small hand-checked case: one ₹10,000 deposit at 10%, 2-year maturity', () => {
    // Year 1: 10,000 + 1,000 interest = 11,000. Year 2: +1,100 = 12,100.
    const res = calculateSSY({ annualDeposit: 10000, annualRatePct: 10, depositYears: 1, maturityYears: 2 });
    expect(res.totalDeposited).toBe(10000);
    expect(res.interestEarned).toBe(2100);
    expect(res.maturityValue).toBe(12100);
    expect(res.schedule).toHaveLength(2);
    expect(res.schedule[0]).toEqual({ year: 1, deposit: 10000, interest: 1000, balance: 11000 });
    expect(res.schedule[1].deposit).toBe(0);
  });

  it('caps the yearly deposit at the scheme cap (₹1,50,000 default)', () => {
    // Deposit request ₹2,00,000 → only ₹1,50,000 applied; 10% for 1 year → ₹1,65,000.
    const res = calculateSSY({ annualDeposit: 200000, annualRatePct: 10, depositYears: 1, maturityYears: 1 });
    expect(res.appliedAnnualDeposit).toBe(150000);
    expect(res.totalDeposited).toBe(150000);
    expect(res.maturityValue).toBe(165000);
  });

  it('respects a custom (lower) cap parameter', () => {
    const res = calculateSSY({ annualDeposit: 100000, annualRatePct: 0, depositYears: 2, maturityYears: 2, maxDepositPerYear: 60000 });
    expect(res.appliedAnnualDeposit).toBe(60000);
    expect(res.totalDeposited).toBe(120000);
    expect(res.maturityValue).toBe(120000); // 0% rate → deposits only
  });

  it('full statutory shape: 15 deposit years inside a 21-year maturity', () => {
    const res = calculateSSY({ annualDeposit: 150000, annualRatePct: 8.2 });
    expect(res.schedule).toHaveLength(21);
    expect(res.totalDeposited).toBe(2250000);
    expect(res.schedule.filter((r) => r.deposit > 0)).toHaveLength(15);
    expect(res.schedule.at(-1).balance).toBe(res.maturityValue);
    expect(res.interestEarned).toBeGreaterThan(res.totalDeposited);
  });

  it('rejects invalid input', () => {
    expect(() => calculateSSY({ annualDeposit: 0, annualRatePct: 8.2 })).toThrow(RangeError);
    expect(() => calculateSSY({ annualDeposit: 10000, annualRatePct: -1 })).toThrow(RangeError);
    expect(() => calculateSSY({ annualDeposit: 10000, annualRatePct: 8.2, depositYears: 15, maturityYears: 10 })).toThrow(RangeError);
    expect(() => calculateSSY({ annualDeposit: 10000, annualRatePct: 8.2, depositYears: 2.5 })).toThrow(RangeError);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping with paise', () => {
    expect(formatINR(100000)).toBe('₹1,00,000.00');
    expect(formatINR(1234567.89)).toBe('₹12,34,567.89');
    expect(formatINR(1000)).toBe('₹1,000.00');
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(99.9)).toBe('₹99.90');
  });

  it('formats negatives and placeholders', () => {
    expect(formatINR(-2500.5)).toBe('-₹2,500.50');
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
    expect(formatINR('not a number')).toBe('—');
  });
});

describe('formatINRCompact', () => {
  it('uses Cr at/above a crore and L at/above a lakh', () => {
    expect(formatINRCompact(15000000)).toBe('₹1.50 Cr');
    expect(formatINRCompact(10000000)).toBe('₹1.00 Cr');
    expect(formatINRCompact(250000)).toBe('₹2.50 L');
    expect(formatINRCompact(100000)).toBe('₹1.00 L');
  });

  it('falls back to full format below a lakh', () => {
    expect(formatINRCompact(99999)).toBe('₹99,999.00');
    expect(formatINRCompact(50000)).toBe('₹50,000.00');
  });

  it('handles negatives and placeholders', () => {
    expect(formatINRCompact(-12000000)).toBe('-₹1.20 Cr');
    expect(formatINRCompact(null)).toBe('—');
  });
});

describe('parseAmount', () => {
  it('parses grouped, symbol-bearing and plain amounts', () => {
    expect(parseAmount('₹1,00,000')).toBe(100000);
    expect(parseAmount('1,00,000.50')).toBe(100000.5);
    expect(parseAmount('100000')).toBe(100000);
    expect(parseAmount('  ₹ 75,000 ')).toBe(75000);
    expect(parseAmount(42000)).toBe(42000);
    expect(parseAmount('-5000')).toBe(-5000);
  });

  it('parses Indian magnitude suffixes', () => {
    expect(parseAmount('2.5L')).toBe(250000);
    expect(parseAmount('2.5 lakh')).toBe(250000);
    expect(parseAmount('1.2 Cr')).toBe(12000000);
    expect(parseAmount('1.2crore')).toBe(12000000);
    expect(parseAmount('50k')).toBe(50000);
  });

  it('returns NaN for unparseable input', () => {
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('₹')).toBeNaN();
    expect(parseAmount('12.5.3')).toBeNaN();
    expect(parseAmount(null)).toBeNaN();
    expect(parseAmount(undefined)).toBeNaN();
    expect(parseAmount(Number.POSITIVE_INFINITY)).toBeNaN();
  });
});

describe('roundToPaise', () => {
  it('rounds to 2 decimals, half-up', () => {
    expect(roundToPaise(1.005)).toBe(1.01);
    expect(roundToPaise(8884.8788)).toBe(8884.88);
    expect(roundToPaise(100)).toBe(100);
  });
});
