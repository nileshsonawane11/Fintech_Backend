// ============================================================================
// FINEDGE BANK — CENTRAL RATES & PARAMETERS CONFIGURATION
// Single Source of Truth for all rates, charges, slabs, and regulatory terms.
// No numeric rate or fee may be typed outside this configuration.
// ============================================================================

export const FINEDGE_RATES_CONFIG = {
  // Brand & Regulatory Constants
  brand: {
    name: 'FinEdge Bank',
    tagline: 'Precision Banking Engineered for Modern Growth',
    ifscPrefix: 'FNEG0001234',
    ifscCode: 'FNEG0001234',
    micrCode: '400240012',
    demoDisclaimer: 'FinEdge Bank is a simulated digital banking brand engineered for demonstration, training, and functional evaluation.',
    dicgcInsurance: '₹5,00,000 per depositor across branches under RBI DICGC framework',
    regulatoryNote: 'Digital Banking Platform · Simulated Scheduled Commercial Bank Environment',
    headquarters: 'FinEdge Financial Towers, BKC, Bandra East, Mumbai 400051',
    customerCarePhone: '1800 209 4363',
    customerCareEmail: 'support@finedge.in',
    grievanceEmail: 'grievance.officer@finedge.in',
    principalNodalEmail: 'principal.nodal@finedge.in'
  },

  // 1. Savings Account Rates & Slabs
  savings: {
    peakRate: '7.00% p.a.',
    peakRateValue: 7.00,
    creditCycle: '1st of every month',
    creditTimingDescription: 'Calculated daily on end-of-day balances and credited on the 1st of every month',
    slabs: [
      { slab: 'Up to ₹1 Lakh', rate: '3.50% p.a.', value: 3.50 },
      { slab: '> ₹1 Lakh to ₹5 Lakhs', rate: '5.00% p.a.', value: 5.00 },
      { slab: '> ₹5 Lakhs to ₹10 Lakhs', rate: '6.00% p.a.', value: 6.00 },
      { slab: '> ₹10 Lakhs to ₹5 Crores', rate: '7.00% p.a.', value: 7.00 },
      { slab: '> ₹5 Crores', rate: '6.50% p.a.', value: 6.50 }
    ],
    ambRequirements: {
      primeSavings: '₹10,000 Average Monthly Balance (or salary credit)',
      executiveSalary: 'Zero Balance',
      campusYouth: 'Zero Balance',
      juniorStep: '₹1,000 Minimum Balance',
      enterpriseCurrent: '₹25,000 Average Monthly Balance'
    }
  },

  // 2. Fixed & Recurring Deposit Grids
  fixedDeposits: {
    regularPeak: '7.25% p.a.',
    regularPeakValue: 7.25,
    seniorPeak: '7.75% p.a.',
    seniorPeakValue: 7.75,
    seniorDelta: '0.50% p.a.',
    minimumAmount: 10000,
    tenureGrid: [
      { tenure: '7 - 14 Days', regular: '3.00% p.a.', senior: '3.50% p.a.', regularVal: 3.00, seniorVal: 3.50 },
      { tenure: '15 - 45 Days', regular: '3.50% p.a.', senior: '4.00% p.a.', regularVal: 3.50, seniorVal: 4.00 },
      { tenure: '46 - 90 Days', regular: '4.50% p.a.', senior: '5.00% p.a.', regularVal: 4.50, seniorVal: 5.00 },
      { tenure: '91 - 180 Days', regular: '5.75% p.a.', senior: '6.25% p.a.', regularVal: 5.75, seniorVal: 6.25 },
      { tenure: '181 - 364 Days', regular: '6.50% p.a.', senior: '7.00% p.a.', regularVal: 6.50, seniorVal: 7.00 },
      { tenure: '1 Year - 399 Days', regular: '7.25% p.a.', senior: '7.75% p.a.', regularVal: 7.25, seniorVal: 7.75 },
      { tenure: '400 - 500 Days', regular: '7.10% p.a.', senior: '7.60% p.a.', regularVal: 7.10, seniorVal: 7.60 },
      { tenure: '501 Days - 5 Years', regular: '7.00% p.a.', senior: '7.50% p.a.', regularVal: 7.00, seniorVal: 7.50 },
      { tenure: '5 - 10 Years', regular: '6.75% p.a.', senior: '7.25% p.a.', regularVal: 6.75, seniorVal: 7.25 }
    ]
  },

  recurringDeposits: {
    regularPeak: '7.10% p.a.',
    regularPeakValue: 7.10,
    seniorPeak: '7.60% p.a.',
    seniorPeakValue: 7.60,
    minimumMonthlyInstallment: 500
  },

  // 3. Lending Benchmark Rates
  loans: {
    homeLoanStartingRate: '8.45% p.a.',
    homeLoanStartingValue: 8.45,
    homeLoanRange: '8.45% - 9.25% p.a.',
    personalLoanStartingRate: '10.50% p.a.',
    personalLoanStartingValue: 10.50,
    personalLoanRange: '10.50% - 14.50% p.a.',
    businessLoanStartingRate: '11.25% p.a.',
    businessLoanStartingValue: 11.25,
    businessLoanRange: '11.25% - 15.50% p.a.',
    autoLoanStartingRate: '8.90% p.a.',
    autoLoanStartingValue: 8.90,
    autoLoanRange: '8.90% - 10.50% p.a.',
    goldLoanStartingRate: '9.25% p.a.',
    goldLoanStartingValue: 9.25,
    goldLoanRange: '9.25% - 13.50% p.a.',
    educationLoanStartingRate: '9.50% p.a.',
    educationLoanStartingValue: 9.50,
    educationLoanRange: '9.50% - 11.50% p.a.',
    lapStartingRate: '9.00% p.a.',
    lapStartingValue: 9.00,
    lapRange: '9.00% - 10.75% p.a.',
    agriStartingRate: '7.00% p.a.',
    agriStartingValue: 7.00
  },

  // 4. Credit Cards APR & Fee Schedules
  cards: {
    aurumMetal: {
      annualFee: '₹2,999 (Waived on ₹3 Lakh annual spend)',
      joiningFee: '₹2,999',
      annualFeeRenewal: '₹2,999',
      spendWaiverThreshold: '₹3,00,000',
      apr: '1.99% per month (23.88% p.a.)',
      forexMarkup: '0% Zero Forex Markup',
      rewardsRate: '5X points on domestic spends, 10X points on dining & travel'
    },
    regalMetal: {
      annualFee: '₹5,999 (Waived on ₹6 Lakh annual spend)',
      joiningFee: '₹5,999',
      annualFeeRenewal: '₹5,999',
      spendWaiverThreshold: '₹6,00,000',
      apr: '1.75% per month (21.00% p.a.)',
      forexMarkup: '0% Zero Forex Markup',
      rewardsRate: '10X points on all spends, redeemable 1:1 for luxury travel'
    },
    novaRewards: {
      annualFee: 'Lifetime Free',
      joiningFee: 'Zero',
      annualFeeRenewal: 'Zero',
      apr: '2.95% per month (35.40% p.a.)',
      forexMarkup: '1.99%',
      rewardsRate: '6X on online spends, 3X on POS, 10X on spends exceeding ₹25,000'
    },
    secureBuild: {
      annualFee: 'Lifetime Free',
      joiningFee: 'Zero',
      annualFeeRenewal: 'Zero',
      apr: '1.50% per month (18.00% p.a.)',
      forexMarkup: '0.99%',
      rewardsRate: '4X points on every ₹150 spent, backed by Fixed Deposit'
    },
    platinumDebit: {
      annualFee: 'Complimentary with FinEdge Prime Savings',
      dailyAtmLimit: '₹1,00,000',
      dailyPosLimit: '₹4,00,000',
      loungeAccess: '1 complimentary domestic airport lounge access per quarter'
    }
  },

  // 5. Standard Schedule of Charges
  scheduleOfCharges: {
    nonMaintenanceCharges: '₹150 to ₹350 per month based on AMB shortfall',
    chequeBounceCharge: '₹450 per outward bounce / ₹200 inward return',
    stopPaymentCharge: '₹100 per cheque via branch (Free via NetBanking)',
    atmTransactions: 'Unlimited free withdrawals at FinEdge ATMs; 5 free per month at other bank ATMs',
    neftRtgs: 'Zero online charges for all individual retail accounts',
    impsCharges: '₹2.50 to ₹15 depending on transfer slab (Free for Prime and Executive tiers)'
  }
};
