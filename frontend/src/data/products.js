// ============================================================================
// FinEdge Bank — product catalogue (single source of truth for the public site)
//
// ILLUSTRATIVE DATA: every rate, fee and limit in this file is an original,
// illustrative figure created for this demonstration platform. Figures do not
// belong to, and are not copied from, any real bank. Where a figure appears in
// more than one place on the site it must be read from this file — never
// re-typed — so a rate can never be shown with two different values.
//
// Conventions (shared with src/lib and src/api):
//   - Money amounts are plain numbers in rupees (e.g. 10000 = ₹10,000).
//   - Rates are percentages per annum unless a field name says otherwise.
//   - Tenures for loans are in MONTHS; deposit tenures are day/year ranges.
//   - Every product carries: slug (unique across the whole catalogue),
//     category ('account' | 'loan' | 'card' | 'investment') and name.
// ============================================================================

/**
 * Brand identity. The coordinator may rename the bank by changing ONLY this
 * constant — every page, branch and document string reads from here.
 */
export const BRAND = {
  name: 'FinEdge Bank',
  shortName: 'FinEdge',
  legalName: 'FinEdge Bank Limited',
  tagline: 'Banking with a finer edge',
  ifscPrefix: 'FEDG',
  identity: {
    midnight: '#0A1E35',
    midnightDeep: '#050F1D',
    porcelain: '#FAF8F4',
    gold: '#B8933F',
    ink: '#131A1F',
  },
  support: {
    phone: '1800 267 4100 (toll-free, demo)',
    email: 'care@finedgebank.example',
    hours: '24 x 7 phone support; branches Mon–Sat, 9:30 am – 4:30 pm',
  },
};

export const BRAND_NAME = BRAND.name;

/** Shown wherever rates are displayed on the public site. */
export const RATE_DISCLAIMER =
  'Rates shown are illustrative figures for this demonstration platform and are not an offer of any real financial product.';

// ---------------------------------------------------------------------------
// Shared deposit slabs — referenced (not copied) by every deposit-style
// account, so the savings rate exists in exactly one place.
// ---------------------------------------------------------------------------

/** Interest slabs for savings-style balances, % p.a., on daily balances. */
export const SAVINGS_SLABS = [
  { min: 0, max: 100000, rate: 3.25, label: 'Up to ₹1 lakh' },
  { min: 100000, max: 1000000, rate: 5.5, label: '₹1 lakh to ₹10 lakh' },
  { min: 1000000, max: null, rate: 6.75, label: 'Above ₹10 lakh' },
];

/** Highest savings slab rate, derived — never re-type this number. */
export const SAVINGS_TOP_RATE = Math.max(...SAVINGS_SLABS.map((s) => s.rate));

/** Derived account rate fact — single source of truth for rate copy across all surfaces. */
export function accountRateFact(account) {
  if (!account) return '—';
  if (account.rateSlabs && account.rateSlabs.length > 0) {
    const top = Math.max(...account.rateSlabs.map((s) => s.rate));
    return `Up to ${top.toFixed(2)}% p.a.`;
  }
  if (account.overdraftRate) {
    return `Overdraft at ${account.overdraftRate.toFixed(2)}% p.a.`;
  }
  return 'No interest';
}

/** Derived account AMB display. */
export function accountAmbFact(account) {
  if (!account || !account.amb) return '—';
  return account.amb.amount === 0 ? 'Zero balance' : `₹${account.amb.amount.toLocaleString('en-IN')}`;
}

/** Derived account non-maintenance penalty display. */
export function accountPenaltyFact(account) {
  if (!account || !account.amb) return '—';
  return account.amb.penaltyPerMonth ? `₹${account.amb.penaltyPerMonth.toLocaleString('en-IN')}/month` : 'Nil';
}

/** Derived debit card annual fee display. */
export function accountCardFeeFact(account) {
  if (!account || !account.fees || account.fees.debitCardAnnual === undefined) return '—';
  return account.fees.debitCardAnnual === 0 ? 'Nil' : `₹${account.fees.debitCardAnnual.toLocaleString('en-IN')}/yr`;
}

const STANDARD_KYC_DOCS = [
  'PAN card',
  'Aadhaar card (or passport / driving licence / voter ID as address proof)',
  'Recent passport-size photograph',
];

export const STANDARD_APPLY_STEPS = [
  'Choose the product and start your application online',
  'Fill in your details and submit the application',
  'Upload/submit KYC and product documents for verification',
  'Track the application in your FinEdge account until disbursement',
];

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------

export const ACCOUNTS = [
  {
    slug: 'everyday-savings',
    category: 'account',
    accountType: 'SAVINGS',
    name: 'FinEdge Everyday Savings Account',
    tagline: 'Slab-wise interest on daily balances, credited every quarter',
    overview:
      'Our standard savings account for individuals. Interest is calculated on daily balances using the slab table below and credited quarterly. Comes with a free virtual debit card, UPI (simulated on this platform) and full access to FinEdge net-banking and the mobile app.',
    interestNote: 'Interest is paid slab-wise: each portion of your balance earns the rate of its slab.',
    rateSlabs: SAVINGS_SLABS,
    amb: {
      amount: 10000,
      label: 'Average monthly balance of ₹10,000 (₹5,000 for non-metro branches)',
      nonMetroAmount: 5000,
      penaltyPerMonth: 300,
    },
    eligibility: [
      'Resident Indian individual, 18 years or above',
      'Valid PAN and Aadhaar-based KYC',
      'Can be opened singly or jointly',
    ],
    documents: [...STANDARD_KYC_DOCS, 'Signature specimen (captured digitally during onboarding)'],
    features: [
      'Slab-wise interest up to 6.75% p.a. on daily balances',
      'Free virtual debit card; physical card on request',
      'Free NEFT/IMPS transfers within FinEdge net-banking (simulated rails in this demo)',
      'Quarterly interest credit and free e-statements',
      'Nomination facility available at opening',
    ],
    fees: {
      accountOpening: 0,
      debitCardIssuance: 0,
      debitCardAnnual: 199,
      smsAlertsAnnual: 0,
      chequeBook25Leaves: 100,
      duplicateStatement: 50,
    },
    charges: [
      { service: 'Average balance non-maintenance', fee: '₹300 per month' },
      { service: 'Debit card annual fee (physical card)', fee: '₹199 per year' },
      { service: 'Cheque book (25 leaves)', fee: '₹100' },
      { service: 'Duplicate paper statement', fee: '₹50 per statement' },
      { service: 'Cash deposit at branch', fee: 'Free up to ₹2 lakh per month; ₹3 per ₹1,000 thereafter' },
    ],
    faqs: [
      {
        q: 'How is savings interest calculated?',
        a: 'Interest is calculated on the balance you hold each day. Each slab of the balance earns its own rate — for example, the first ₹1 lakh earns 3.25% p.a. and only the portion above ₹10 lakh earns 6.75% p.a. Interest is credited quarterly.',
      },
      {
        q: 'What happens if I miss the average balance for one month?',
        a: 'A flat ₹300 charge applies for that month. There is no charge in the first month after account opening.',
      },
      {
        q: 'Is my deposit insured?',
        a: 'This is a demonstration platform, so deposits here are simulated records, not real money. The product is modelled on standard deposit-insurance norms applicable to scheduled banks in India.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'trade-current',
    category: 'account',
    lifePhoto: {
      src: '/images/detail-trade-shopkeeper-1200.webp',
      srcSet: '/images/detail-trade-shopkeeper-400.webp 400w, /images/detail-trade-shopkeeper-800.webp 800w, /images/detail-trade-shopkeeper-1200.webp 1200w',
      alt: 'A shop owner at the transaction counter with a card payment terminal',
      caption: 'A shop, mid-morning.',
      width: 1200,
      height: 800,
    },
    accountType: 'CURRENT',
    name: 'FinEdge Trade Current Account',
    cashDepositFreeLimitMonthly: 1000000,
    tagline: 'Built for business cash flow, with an optional overdraft line',
    overview:
      'A current account for proprietors, firms, companies and traders who move money frequently. No interest is paid on current account balances (as per banking norms); instead you get high transaction limits, cash-handling allowances and an optional overdraft facility priced separately.',
    interestNote: 'No interest is payable on current account balances.',
    rateSlabs: [],
    overdraftRate: 11.5,
    amb: {
      amount: 25000,
      label: 'Average monthly balance of ₹25,000',
      nonMetroAmount: 25000,
      penaltyPerMonth: 750,
    },
    eligibility: [
      'Sole proprietors, partnership firms, LLPs, companies, trusts and societies',
      'Valid business registration / GSTIN where applicable',
      'All partners/directors to complete KYC',
    ],
    documents: [
      'PAN of the entity and of authorised signatories',
      'Certificate of incorporation / partnership deed / proprietorship proof',
      'GST registration certificate (if applicable)',
      'Address proof of the business premises',
      'Board resolution / authorisation letter for account operation',
    ],
    features: [
      'Optional overdraft line priced at 11.50% p.a. on utilisation only',
      'Free NEFT/RTGS collections within FinEdge channels (simulated in this demo)',
      'Multi-user access with maker–checker controls in the staff portal model',
      'Cash deposit allowance of ₹10 lakh per month included',
      'Doorstep banking and bulk payment file upload (roadmap features in this demo)',
    ],
    fees: {
      accountOpening: 0,
      debitCardIssuance: 0,
      debitCardAnnual: 299,
      debitCardProduct: 'FinEdge Business Debit Card',
      smsAlertsAnnual: 0,
      chequeBook50Leaves: 150,
      duplicateStatement: 100,
    },
    charges: [
      { service: 'Average balance non-maintenance', fee: '₹750 per month' },
      { service: 'Business Debit Card annual fee', fee: '₹299 per year' },
      { service: 'Cash deposit free limit', fee: 'Free up to ₹10 Lakh per month' },
      { service: 'Cash deposit beyond free limit', fee: '₹2.50 per ₹1,000' },
      { service: 'Cheque book (50 leaves)', fee: '₹150' },
      { service: 'Outstation cheque collection', fee: '₹50 + actual courier/postal cost' },
    ],
    faqs: [
      {
        q: 'Why does this account pay no interest?',
        a: 'Current accounts are transaction accounts; banking regulations do not permit interest on them. Surplus business funds can be swept into a fixed deposit instead.',
      },
      {
        q: 'How is the overdraft priced?',
        a: 'If you opt for the overdraft line, interest at 11.50% p.a. is charged only on the amount actually used, for the days it is used. There is no fee for an unused limit in this illustrative model.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'payroll-salary',
    category: 'account',
    lifePhoto: {
      src: '/images/detail-payroll-professional-1200.webp',
      srcSet: '/images/detail-payroll-professional-400.webp 400w, /images/detail-payroll-professional-800.webp 800w, /images/detail-payroll-professional-1200.webp 1200w',
      alt: 'A professional at her workplace desk working through paperwork and digital records',
      caption: 'Payday paperwork, done at her desk.',
      width: 1200,
      height: 800,
    },
    accountType: 'SALARY',
    name: 'FinEdge Payroll Salary Account',
    minMonthlySalary: 20000,
    tagline: 'Zero-balance salary account with the full savings slab table',
    overview:
      'For employees of organisations with a FinEdge payroll arrangement. No average-balance requirement while salary is credited monthly, and your balance earns the same slab-wise interest as the Everyday Savings Account.',
    interestNote: 'Interest is paid slab-wise, identical to the Everyday Savings Account.',
    rateSlabs: SAVINGS_SLABS,
    amb: {
      amount: 0,
      label: 'Zero balance — no average balance requirement while salary credits continue',
      nonMetroAmount: 0,
      penaltyPerMonth: 0,
    },
    eligibility: [
      'Employee of an organisation onboarded with FinEdge payroll services',
      'Monthly net salary credit of ₹20,000 or more',
      'If no salary is credited for 3 consecutive months, the account converts to an Everyday Savings Account with its balance rules',
    ],
    documents: [...STANDARD_KYC_DOCS, 'Latest salary slip or employer-issued ID card'],
    features: [
      'Zero-balance account — no AMB charges while employed',
      'Slab-wise interest up to 6.75% p.a.',
      'Free physical debit card with no annual fee for payroll customers',
      'Preferential processing-fee pricing on FinEdge personal-category loans (see Offers)',
      'Family (add-on) savings accounts at zero balance for spouse/parents',
    ],
    fees: {
      accountOpening: 0,
      debitCardIssuance: 0,
      debitCardAnnual: 0,
      smsAlertsAnnual: 0,
      chequeBook25Leaves: 100,
      duplicateStatement: 50,
    },
    charges: [
      { service: 'Average balance non-maintenance', fee: 'Nil while salary credits continue' },
      { service: 'Cheque book (25 leaves)', fee: '₹100' },
      { service: 'Duplicate paper statement', fee: '₹50 per statement' },
    ],
    faqs: [
      {
        q: 'What if I change jobs?',
        a: 'Keep using the account. If salary credits stop for 3 consecutive months it converts to an Everyday Savings Account, and we notify you before the balance rules change.',
      },
      {
        q: 'Is the debit card really free?',
        a: 'Yes — for payroll customers there is no issuance or annual fee on the standard physical debit card in this illustrative schedule.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'campus-student',
    category: 'account',
    lifePhoto: {
      src: '/images/detail-campus-student-1200.webp',
      srcSet: '/images/detail-campus-student-400.webp 400w, /images/detail-campus-student-800.webp 800w, /images/detail-campus-student-1200.webp 1200w',
      alt: 'A university student between academic lectures working on a laptop on campus',
      caption: 'A student between lectures.',
      width: 1200,
      height: 800,
    },
    accountType: 'STUDENT',
    name: 'FinEdge Campus Student Account',
    tagline: 'A first bank account for students — zero balance, no frills, no traps',
    overview:
      'Designed for students aged 16 to 25. Zero balance, a debit card with sensible default limits, and the standard savings slabs on whatever you save. Students below 18 open the account with a parent or guardian.',
    interestNote: 'Interest is paid slab-wise, identical to the Everyday Savings Account.',
    rateSlabs: SAVINGS_SLABS,
    amb: {
      amount: 0,
      label: 'Zero balance — no average balance requirement',
      nonMetroAmount: 0,
      penaltyPerMonth: 0,
    },
    eligibility: [
      'Students aged 16 to 25 years enrolled in a recognised institution',
      'Below 18: account opened and operated with a parent/guardian',
      'At age 25 the account converts to an Everyday Savings Account (with prior notice)',
    ],
    documents: [
      ...STANDARD_KYC_DOCS,
      'Bonafide student certificate or current institution ID card',
      'Guardian KYC documents (for applicants below 18)',
    ],
    features: [
      'Zero-balance account with slab-wise interest up to 6.75% p.a.',
      'Free debit card with a default daily spend limit of ₹25,000 (adjustable by the account holder/guardian)',
      'Free UPI and internal transfers (simulated in this demo)',
      'Goal-based savings pockets inside net-banking (illustrative feature)',
    ],
    fees: {
      accountOpening: 0,
      debitCardIssuance: 0,
      debitCardAnnual: 0,
      smsAlertsAnnual: 0,
      chequeBook25Leaves: 0,
      duplicateStatement: 0,
    },
    charges: [
      { service: 'Average balance non-maintenance', fee: 'Nil' },
      { service: 'Debit card annual fee', fee: 'Nil' },
      { service: 'Card replacement (lost card)', fee: '₹150' },
    ],
    faqs: [
      {
        q: 'Can I open this account at 17?',
        a: 'Yes, with a parent or guardian as joint holder/guardian. You operate the account; the guardian can view activity and set limits.',
      },
      {
        q: 'What happens when I graduate?',
        a: 'Nothing changes until age 25. After that the account converts to an Everyday Savings Account and its balance rules apply, with notice given in advance.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'sprout-minor',
    category: 'account',
    accountType: 'MINOR',
    name: 'FinEdge Sprout Minor Account',
    annualCreditCap: 1000000,
    tagline: 'A savings start for children, operated by a parent or guardian',
    overview:
      'For children below 18, opened and operated by a parent or natural/legal guardian. The standard savings slabs apply. On turning 18, the account converts to a regular savings account after fresh KYC.',
    interestNote: 'Interest is paid slab-wise, identical to the Everyday Savings Account.',
    rateSlabs: SAVINGS_SLABS,
    amb: {
      amount: 1000,
      label: 'Average monthly balance of ₹1,000',
      nonMetroAmount: 1000,
      penaltyPerMonth: 0,
    },
    eligibility: [
      'Child below 18 years of age',
      'Opened by a parent or court-appointed guardian',
      'Guardian must hold (or open) a FinEdge savings account',
      'Total credits to the account capped at ₹10 lakh per financial year',
    ],
    documents: [
      'Birth certificate of the minor (or passport / school certificate with date of birth)',
      'PAN and Aadhaar of the guardian',
      'Recent photograph of the minor and the guardian',
      'Guardianship proof, if the guardian is not a parent',
    ],
    features: [
      'Low ₹1,000 average balance with NO penalty for non-maintenance',
      'Slab-wise interest up to 6.75% p.a.',
      'Optional debit card for children above 10, with guardian-set limits (default ₹5,000 per month)',
      'Standing-instruction gifting from the guardian’s FinEdge account',
      'Automatic conversion to a savings account at 18, after fresh KYC',
    ],
    fees: {
      accountOpening: 0,
      debitCardIssuance: 0,
      debitCardAnnual: 0,
      smsAlertsAnnual: 0,
      chequeBook25Leaves: 0,
      duplicateStatement: 0,
    },
    charges: [
      { service: 'Average balance non-maintenance', fee: 'Nil' },
      { service: 'Debit card (child above 10)', fee: 'Nil' },
    ],
    faqs: [
      {
        q: 'Who can withdraw money from a minor account?',
        a: 'Only the operating guardian, for the benefit of the minor. In this demonstration the guardian’s linked account is used for all movements.',
      },
      {
        q: 'What happens on the child’s 18th birthday?',
        a: 'Withdrawals pause until the now-adult account holder completes fresh KYC, after which the account converts to an Everyday Savings Account in their own name.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
];

// ---------------------------------------------------------------------------
// LOANS — rates are ranges (% p.a., reducing balance). Tenures in months.
// processingFee: { pct } is a % of the sanctioned amount, bounded by min/max.
// ---------------------------------------------------------------------------

export const LOANS = [
  {
    slug: 'home-loan',
    category: 'loan',
    loanType: 'HOME',
    name: 'FinEdge Home Loan',
    tagline: 'For purchase, construction or extension of a home',
    overview:
      'A long-tenure mortgage loan for buying a ready property, constructing on your own plot, or extending an existing home. Interest is on a monthly reducing balance, with no prepayment charge on floating-rate loans.',
    rateMin: 8.35,
    rateMax: 10.15,
    minAmount: 500000,
    maxAmount: 50000000,
    tenureMinMonths: 60,
    tenureMaxMonths: 360,
    maxLtvPct: 85,
    fundingBasis: 'asset / property value',
    processingFee: { pct: 0.4, min: 5000, max: 25000, note: 'Plus applicable taxes' },
    charges: [
      { service: 'Processing fee', fee: '0.40% of the sanctioned amount (minimum ₹5,000, maximum ₹25,000)' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil (floating-rate loans to individual borrowers)' },
      { service: 'Late EMI payment', fee: '2% per month on overdue EMI amount (penal charge)' },
      { service: 'Cheque / EMI bounce', fee: '₹400 per instance' },
    ],
    eligibility: {
      ageMin: 21,
      ageMax: 65,
      minMonthlyIncome: 40000,
      creditScoreMin: 700,
      employment: ['Salaried', 'Self-employed professional', 'Self-employed business'],
      note: 'Loan must close by age 70 or retirement age, whichever is earlier.',
    },
    documents: [
      'PAN and Aadhaar of all applicants',
      'Last 6 months’ bank statements',
      'Salary slips (3 months) or ITRs (2 years) for self-employed',
      'Property documents: agreement to sell, title deed, approved plan',
      'Photographs of all applicants',
    ],
    features: [
      'Up to 85% of the property value',
      'Tenure up to 30 years with step-up EMI options in the first 5 years',
      'Balance transfer from another lender with top-up facility',
      'No prepayment or foreclosure charge on floating-rate loans',
    ],
    faqs: [
      {
        q: 'How is my EMI calculated?',
        a: 'EMI is calculated on the monthly reducing balance at your sanctioned rate. Use the EMI calculator on this site — it uses the standard amortisation formula.',
      },
      {
        q: 'Can I prepay part of the loan?',
        a: 'Yes. Part-prepayments of any amount are allowed on floating-rate loans without charge, and your tenure (or EMI, if you choose) reduces accordingly.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'business-loan',
    category: 'loan',
    loanType: 'BUSINESS',
    name: 'FinEdge Business Growth Loan',
    tagline: 'Unsecured working capital and expansion funding for SMEs',
    overview:
      'An unsecured term loan for established businesses — inventory, equipment, a new outlet, or bridging a receivables gap. Pricing depends on turnover, vintage and credit profile.',
    rateMin: 10.9,
    rateMax: 15.5,
    minAmount: 100000,
    maxAmount: 20000000,
    tenureMinMonths: 12,
    tenureMaxMonths: 84,
    maxLtvPct: null,
    fundingBasis: null,
    processingFee: { pct: 1.0, min: 10000, max: null, note: 'Plus applicable taxes (no upper cap)' },
    charges: [
      { service: 'Processing fee', fee: '1.00% of the sanctioned amount (minimum ₹10,000, no upper cap)' },
      { service: 'Prepayment / Foreclosure', fee: '2.00% of outstanding principal + applicable taxes' },
      { service: 'Late EMI payment', fee: '2% per month on overdue EMI amount' },
      { service: 'Cheque / EMI bounce', fee: '₹400 per instance' },
    ],
    eligibility: {
      ageMin: 21,
      ageMax: 65,
      minMonthlyIncome: null,
      minAnnualTurnover: 2500000,
      minBusinessVintageYears: 2,
      creditScoreMin: 700,
      employment: ['Self-employed business', 'Partnership firm', 'Private limited company'],
      note: 'Applicant business must show profit in at least one of the last two financial years.',
    },
    documents: [
      'PAN of the business and promoters',
      'GST returns for the last 12 months',
      'ITRs and audited financials for 2 years',
      'Bank statements for the last 12 months',
      'Business registration and address proof',
    ],
    features: [
      'Unsecured — no collateral for eligible profiles',
      'Disbursal against a simple digital agreement flow',
      'Transparent annual turnover and vintage-based underwriting',
    ],
    faqs: [
      {
        q: 'Does my business need to be profitable?',
        a: 'It must show profit in at least one of the last two financial years.',
      },
      {
        q: 'How fast is approval?',
        a: 'Applications move through an officer review queue; decisions are typically communicated within 3 to 5 business days.',
      },
      {
        q: 'Is an overdraft or revolving facility available?',
        a: 'An overdraft-style revolving drawdown facility for repeat borrowers with established repayment track records is available upon separate credit assessment.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'agriculture-loan',
    category: 'loan',
    loanType: 'AGRICULTURE',
    name: 'FinEdge Krishi Agriculture Loan',
    tagline: 'Crop, equipment and allied-activity finance for farmers',
    overview:
      'Seasonal crop loans, farm-equipment finance and allied activities such as dairy, poultry and fisheries. Crop-loan pricing follows the concessional band, with interest subvention for prompt repayment as noted below.',
    rateMin: 6.85,
    rateMax: 9.25,
    minAmount: 25000,
    maxAmount: 5000000,
    tenureMinMonths: 12,
    tenureMaxMonths: 84,
    maxLtvPct: null,
    fundingBasis: null,
    processingFee: { pct: 0.25, min: 0, max: 2500, note: 'Waived for crop loans up to ₹3 lakh' },
    charges: [
      { service: 'Processing fee', fee: '0.25% of the sanctioned amount (minimum Nil, maximum ₹2,500)' },
      { service: 'Processing fee waiver', fee: 'Nil for crop loans up to ₹3,00,000' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil' },
      { service: 'Late payment / Overdue interest', fee: '2% per month on overdue amount after due date' },
      { service: 'Cheque / Mandate bounce', fee: '₹250 per instance' },
    ],
    eligibility: {
      ageMin: 18,
      ageMax: 70,
      minMonthlyIncome: null,
      creditScoreMin: null,
      employment: ['Individual farmers', 'Self-help groups', 'Joint liability groups', 'Farmer producer organisations'],
      note: 'Land records or a tenancy agreement for the cultivated land are required.',
    },
    documents: [
      'Land records (Khata / 7-12 extract or state equivalent)',
      'Aadhaar and PAN of the applicant',
      'Crop sown / activity certificate from the local authority, where applicable',
      'Quotation for equipment, if financing machinery',
      'Bank statements or passbook for the last 12 months',
    ],
    features: [
      'Crop loans up to ₹3 lakh in the concessional 6.85% band',
      'Prompt-repayment interest subvention of 2% p.a.',
      'Repayment schedules aligned to harvest cycles for crop loans',
      'Kisan-style revolving limit for repeat seasonal borrowing',
    ],
    faqs: [
      {
        q: 'What is the interest subvention?',
        a: 'Farmers who repay crop loans on time receive a 2% p.a. interest subvention, bringing the effective crop-loan rate down from 6.85%.',
      },
      {
        q: 'Can tenant farmers apply?',
        a: 'Yes — a registered tenancy agreement or local-authority certificate for the cultivated land is accepted.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'vehicle-loan',
    category: 'loan',
    loanType: 'VEHICLE',
    name: 'FinEdge Vehicle Loan',
    tagline: 'New and used cars and two-wheelers, up to 90% on-road funding',
    overview:
      'Finance for new and pre-owned cars (up to 5 years old) and two-wheelers. The vehicle is hypothecated to the bank until the loan closes.',
    rateMin: 8.9,
    rateMax: 11.75,
    minAmount: 100000,
    maxAmount: 10000000,
    tenureMinMonths: 12,
    tenureMaxMonths: 84,
    maxLtvPct: 90,
    fundingBasis: 'on-road price',
    processingFee: { pct: 0.5, min: 2500, max: 15000, note: 'Plus applicable taxes' },
    charges: [
      { service: 'Processing fee', fee: '0.50% of the sanctioned amount (minimum ₹2,500, maximum ₹15,000)' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil for floating-rate individual borrowers' },
      { service: 'Late EMI payment', fee: '2% per month on overdue EMI amount' },
      { service: 'Cheque / EMI bounce', fee: '₹400 per instance' },
    ],
    eligibility: {
      ageMin: 21,
      ageMax: 65,
      minMonthlyIncome: 30000,
      creditScoreMin: 680,
      employment: ['Salaried', 'Self-employed professional', 'Self-employed business'],
      note: 'Used vehicles must be under 5 years old at application and under 10 years at loan end.',
    },
    documents: [
      'PAN and Aadhaar',
      'Income proof: salary slips (3 months) or ITR (1 year)',
      'Bank statements for the last 6 months',
      'Proforma invoice / valuation report for the vehicle',
    ],
    features: [
      'Up to 90% of on-road price for new vehicles',
      'Tenure up to 7 years',
      'Optional bundled insurance financing in the loan amount',
    ],
    faqs: [
      {
        q: 'Can I sell the car before the loan ends?',
        a: 'The vehicle is hypothecated to the bank; you would first close or transfer the loan so the hypothecation can be removed from the registration.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'gold-loan',
    category: 'loan',
    lifePhoto: {
      src: '/images/detail-gold-loan-family-1200.webp',
      srcSet: '/images/detail-gold-loan-family-400.webp 400w, /images/detail-gold-loan-family-800.webp 800w, /images/detail-gold-loan-family-1200.webp 1200w',
      alt: 'A family sitting together at home reviewing documents',
      caption: 'Documents reviewed at home, together.',
      width: 1200,
      height: 800,
    },
    loanType: 'GOLD',
    name: 'FinEdge Gold Loan',
    tagline: 'Instant liquidity against gold jewellery, up to 75% of value',
    overview:
      'A secured loan against pledged gold jewellery or ornaments. Valuation is done at the branch, the gold is stored in the bank’s vault, and the loan is repayable as a bullet payment or in instalments within the tenure.',
    rateMin: 8.6,
    rateMax: 11.0,
    minAmount: 10000,
    maxAmount: 7500000,
    tenureMinMonths: 3,
    tenureMaxMonths: 36,
    maxLtvPct: 75,
    fundingBasis: 'appraised gold value',
    processingFee: { pct: 0.3, min: 500, max: 5000, note: 'Valuation charges included' },
    charges: [
      { service: 'Processing fee', fee: '0.30% of the sanctioned amount (minimum ₹500, maximum ₹5,000)' },
      { service: 'Valuation & assay charges', fee: 'Nil (included in processing fee)' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil (no penalty for early closure)' },
      { service: 'Overdue interest', fee: '2% per month on overdue interest/principal after maturity' },
      { service: 'Renewal fee', fee: 'Nil' },
    ],
    acceptedKaratRange: { min: 18, max: 22 },
    acceptedPurities: ['22K (91.6% purity)', '20K (83.3% purity)', '18K (75.0% purity)'],
    acceptedItemTypes: ['Jewellery / Ornaments', 'Minted Coins (up to 50g)'],
    eligibility: {
      ageMin: 18,
      ageMax: 75,
      minMonthlyIncome: null,
      creditScoreMin: null,
      employment: ['Any individual who owns the gold pledged'],
      note: 'Only gold jewellery/ornaments of 18–22 karat purity are accepted; gold coins above 50 g and bullion are not accepted.',
    },
    documents: [
      'Aadhaar and PAN (PAN required for loans above ₹5 lakh)',
      'Two passport-size photographs',
      'The gold jewellery being pledged, for valuation',
    ],
    features: [
      'Up to 75% of the appraised gold value',
      'No income or credit-score requirement',
      'Bullet repayment or EMI options; part-release of gold against part-payment',
      'Vault storage with insurance cover while pledged',
    ],
    faqs: [
      {
        q: 'How is my gold valued?',
        a: 'A trained appraiser weighs and tests the jewellery at the branch in your presence, and the value is computed at the day’s reference rate for the measured purity.',
      },
      {
        q: 'What if I cannot repay on time?',
        a: 'You can renew the loan by paying accrued interest before maturity. Unpaid loans eventually lead to auction of the pledged gold after due notice, as per the loan agreement.',
      },
      {
        q: 'Can I choose bullet repayment?',
        a: 'Yes. You can choose bullet repayment (pay principal + interest at the end) or regular monthly EMIs. Partial release of ornaments is permitted upon proportionate principal repayment.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'loan-against-property',
    category: 'loan',
    loanType: 'LAP',
    name: 'FinEdge Loan Against Property',
    tagline: 'Borrow against your residential or commercial property',
    overview:
      'A secured term loan or overdraft against a self-owned residential or commercial property, for business expansion, education, medical needs or debt consolidation.',
    rateMin: 9.15,
    rateMax: 12.4,
    minAmount: 500000,
    maxAmount: 30000000,
    tenureMinMonths: 12,
    tenureMaxMonths: 180,
    maxLtvPct: 60,
    fundingBasis: 'asset / property value',
    processingFee: { pct: 0.75, min: 10000, max: 50000, note: 'Plus legal and valuation charges at actuals' },
    charges: [
      { service: 'Processing fee', fee: '0.75% of the sanctioned amount (minimum ₹10,000, maximum ₹50,000)' },
      { service: 'Legal & valuation charges', fee: 'At actuals (typically ₹5,000 – ₹10,000 based on property location)' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil for individual floating-rate borrowers; 2% on outstanding for business entities' },
      { service: 'Late EMI payment', fee: '2% per month on overdue EMI amount' },
      { service: 'Cheque / EMI bounce', fee: '₹400 per instance' },
    ],
    eligibility: {
      ageMin: 24,
      ageMax: 65,
      minMonthlyIncome: 50000,
      creditScoreMin: 700,
      employment: ['Salaried', 'Self-employed professional', 'Self-employed business'],
      note: 'Property must have a clear, marketable title; loan closes by age 70.',
    },
    documents: [
      'PAN and Aadhaar of all applicants',
      'Income proof: salary slips / ITRs as applicable',
      'Complete title-deed chain of the property (13 years)',
      'Approved building plan and latest property-tax receipt',
      'Bank statements for the last 12 months',
    ],
    features: [
      'Up to 60% of the property value',
      'Long tenure up to 15 years',
      'Overdraft variant available for business owners',
      'Top-up facility on existing LAP after 12 months of clean repayment',
    ],
    faqs: [
      {
        q: 'Can I use the money for any purpose?',
        a: 'Yes, for any lawful purpose other than speculation. The end-use declaration in the application is part of the loan agreement.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
  {
    slug: 'education-loan',
    category: 'loan',
    loanType: 'EDUCATION',
    name: 'FinEdge Education Loan',
    tagline: 'For studies in India and abroad — repay after your course',
    overview:
      'Covers tuition, hostel, travel and equipment for approved courses in India and overseas. A moratorium covering the course period plus 12 months applies before EMIs begin.',
    rateMin: 9.4,
    rateMax: 12.85,
    minAmount: 100000,
    maxAmount: 15000000,
    tenureMinMonths: 12,
    tenureMaxMonths: 180,
    maxLtvPct: null,
    fundingBasis: null,
    collateralThresholdAmount: 750000,
    processingFee: { pct: 0.5, min: 0, max: 10000, note: 'No processing fee for loans up to ₹20 lakh' },
    charges: [
      { service: 'Processing fee', fee: '0.50% of the sanctioned amount (maximum ₹10,000)' },
      { service: 'Processing fee waiver', fee: 'Nil for all loans up to ₹20,00,000' },
      { service: 'Prepayment / Foreclosure', fee: 'Nil (no prepayment penalty anytime)' },
      { service: 'Late payment charge', fee: '2% per month on overdue amount after moratorium period' },
      { service: 'Cheque / EMI bounce', fee: '₹400 per instance' },
    ],
    eligibility: {
      ageMin: 16,
      ageMax: 35,
      minMonthlyIncome: null,
      creditScoreMin: null,
      employment: ['Students with a confirmed admission offer', 'Co-applicant (parent/guardian) with regular income'],
      note: 'Collateral is required above ₹7.5 lakh; a parent/guardian co-applicant is mandatory.',
    },
    documents: [
      'Admission letter and fee structure from the institution',
      'Academic records of the student',
      'PAN and Aadhaar of student and co-applicant',
      'Co-applicant income proof and bank statements',
      'Collateral documents, where applicable',
    ],
    features: [
      'Moratorium: course period + 12 months before EMI starts',
      'Covers tuition, living expenses, travel and a laptop/equipment allowance',
      'Interest during moratorium can be serviced monthly or capitalised (your choice at sanction)',
      'No prepayment charge',
    ],
    faqs: [
      {
        q: 'When do I start repaying?',
        a: 'EMIs begin after the moratorium — your course duration plus 12 months — or 6 months after you start working, whichever is earlier.',
      },
      {
        q: 'Is collateral always needed?',
        a: 'No. Loans up to ₹7.5 lakh are collateral-free with a co-applicant; above that, collateral or a third-party guarantee is required.',
      },
    ],
    howToApply: STANDARD_APPLY_STEPS,
  },
];
export const CARDS = [
  {
    slug: 'edge-cashback-credit',
    category: 'card',
    cardType: 'credit',
    artVariant: 'cashback',
    network: 'RuPay',
    name: 'FinEdge Edge Cashback Card',
    tagline: 'Everyday cashback on online spends, credited monthly',
    overview:
      'An entry-level cashback credit card for everyday spending. Cashback is credited as statement credit each month — no points, no conversion maths.',
    joiningFee: 499,
    annualFee: 499,
    annualFeeWaiver: 'Annual fee waived on spends of ₹2,00,000 or more in the previous year',
    financeChargeMonthlyPct: 3.3,
    aprPct: 39.6,
    creditLimitRange: { min: 30000, max: 300000 },
    interestFreeDays: 45,
    rewards: [
      '5% cashback on online spends (capped at ₹500 per month)',
      '1% cashback on all other spends',
      'Cashback credited automatically as statement credit',
    ],
    eligibility: {
      ageMin: 21,
      ageMax: 60,
      minMonthlyIncome: 35000,
      creditScoreMin: 720,
      note: 'Salaried or self-employed with at least 1 year of income history.',
    },
    fees: {
      latePayment: '₹300 (due up to ₹5,000) / ₹750 (due ₹5,001–₹25,000) / ₹1,200 (above ₹25,000)',
      forexMarkupPct: 3.5,
      cashAdvanceFee: '2.5% of the amount withdrawn (min ₹500)',
      overLimitFee: 500,
      cardReplacement: 200,
    },
    limits: { atmDaily: 25000, posDaily: 150000, onlineDaily: 150000 },
  },
  {
    slug: 'edge-voyage-credit',
    category: 'card',
    cardType: 'credit',
    artVariant: 'voyage',
    network: 'Visa',
    name: 'FinEdge Edge Voyage Card',
    tagline: 'Lounge access and low forex markup for frequent travellers',
    overview:
      'A travel-focused credit card with airport lounge access, accelerated rewards on travel bookings and a low foreign-exchange markup for international use.',
    joiningFee: 2999,
    annualFee: 2999,
    annualFeeWaiver: 'Annual fee waived on spends of ₹6,00,000 or more in the previous year',
    financeChargeMonthlyPct: 3.1,
    aprPct: 37.2,
    creditLimitRange: { min: 200000, max: 1500000 },
    interestFreeDays: 50,
    rewards: [
      '4 reward points per ₹150 on travel spends; 2 per ₹150 elsewhere (1 point = ₹0.50 on travel redemption)',
      '8 complimentary domestic lounge visits per year (2 per quarter)',
      '2 complimentary international lounge visits per year',
      'Complimentary travel insurance cover up to ₹50 lakh (illustrative)',
    ],
    eligibility: {
      ageMin: 24,
      ageMax: 60,
      minMonthlyIncome: 85000,
      creditScoreMin: 760,
      note: 'Existing premium cardholders with a clean repayment record are fast-tracked.',
    },
    fees: {
      latePayment: '₹500 (due up to ₹10,000) / ₹1,000 (due ₹10,001–₹50,000) / ₹1,500 (above ₹50,000)',
      forexMarkupPct: 1.99,
      cashAdvanceFee: '2.5% of the amount withdrawn (min ₹500)',
      overLimitFee: 600,
      cardReplacement: 300,
    },
    limits: { atmDaily: 50000, posDaily: 500000, onlineDaily: 500000 },
  },
  {
    slug: 'edge-assured-credit',
    category: 'card',
    cardType: 'credit',
    artVariant: 'assured',
    limitBasis: 'Up to 85% of linked fixed deposit',
    network: 'RuPay',
    name: 'FinEdge Edge Assured Card',
    tagline: 'Build a credit history, secured against your fixed deposit',
    overview:
      'A credit card issued against a FinEdge fixed deposit — designed for first-time cardholders and anyone rebuilding a credit history. Your limit is set at 85% of the linked FD, which keeps earning interest.',
    joiningFee: 0,
    annualFee: 0,
    annualFeeWaiver: 'Not applicable — this card carries no joining or annual fee',
    financeChargeMonthlyPct: 2.85,
    aprPct: 34.2,
    creditLimitRange: { min: 10200, max: 425000 },
    interestFreeDays: 45,
    rewards: [
      '1% cashback on all spends, credited monthly',
      'Timely repayments reported to credit bureaus to build your score',
      'FD continues to earn the full deposit rate while it secures the card',
    ],
    eligibility: {
      ageMin: 18,
      ageMax: 70,
      minMonthlyIncome: null,
      creditScoreMin: null,
      note: 'Requires a FinEdge fixed deposit of at least ₹12,000; limit is 85% of the FD value. No income or credit-history requirement.',
    },
    fees: {
      latePayment: '₹250 (due up to ₹5,000) / ₹600 (due ₹5,001–₹25,000) / ₹1,000 (above ₹25,000)',
      forexMarkupPct: 3.5,
      cashAdvanceFee: '2.5% of the amount withdrawn (min ₹400)',
      overLimitFee: 400,
      cardReplacement: 150,
    },
    limits: { atmDaily: 15000, posDaily: 100000, onlineDaily: 100000 },
  },
  {
    slug: 'classic-debit',
    category: 'card',
    cardType: 'debit',
    artVariant: 'classic',
    network: 'RuPay',
    name: 'FinEdge Classic Debit Card',
    tagline: 'The standard card issued with every FinEdge account',
    overview:
      'A contactless debit card linked directly to your account balance, for ATM withdrawals, in-store and online purchases.',
    joiningFee: 0,
    annualFee: 199,
    annualFeeWaiver: 'Free for Payroll Salary, Campus Student, Sprout Minor and first-year Everyday Savings customers',
    financeChargeMonthlyPct: null,
    aprPct: null,
    creditLimitRange: null,
    interestFreeDays: null,
    rewards: [
      'Contactless tap-to-pay up to ₹5,000 per transaction without a PIN',
      'Free withdrawals at FinEdge ATMs; 5 free transactions per month at other-bank ATMs (metro)',
    ],
    eligibility: {
      ageMin: 10,
      ageMax: null,
      minMonthlyIncome: null,
      creditScoreMin: null,
      note: 'Issued with any FinEdge savings or current account; minors above 10 get a guardian-controlled card.',
    },
    fees: {
      latePayment: 'Not applicable to debit cards',
      forexMarkupPct: 3.5,
      cashAdvanceFee: 'Not applicable — ATM withdrawals beyond free limits cost ₹21 per transaction',
      overLimitFee: 0,
      cardReplacement: 200,
    },
    limits: { atmDaily: 40000, posDaily: 100000, onlineDaily: 100000 },
  },
  {
    slug: 'edge-gold-debit',
    category: 'card',
    cardType: 'debit',
    artVariant: 'gold',
    network: 'Visa',
    name: 'FinEdge Edge Gold Debit Card',
    tagline: 'Higher limits and lounge access on your own money',
    overview:
      'A premium debit card for high-balance customers: higher daily limits, airport lounge access and a lower forex markup, all spending directly from your account.',
    joiningFee: 0,
    annualFee: 599,
    annualFeeWaiver: 'Free while you maintain an average balance of ₹2,00,000 or more',
    financeChargeMonthlyPct: null,
    aprPct: null,
    creditLimitRange: null,
    interestFreeDays: null,
    rewards: [
      '2 complimentary domestic lounge visits per year',
      '1 reward point per ₹200 spent (1 point = ₹0.25 statement value on partner offers)',
      'Free withdrawals at any ATM in India in this illustrative schedule',
    ],
    eligibility: {
      ageMin: 18,
      ageMax: null,
      minMonthlyIncome: null,
      creditScoreMin: null,
      note: 'Available on Everyday Savings, Payroll Salary and Trade Current accounts.',
    },
    fees: {
      latePayment: 'Not applicable to debit cards',
      forexMarkupPct: 2.5,
      cashAdvanceFee: 'Not applicable — no ATM transaction fee in this schedule',
      overLimitFee: 0,
      cardReplacement: 300,
    },
    limits: { atmDaily: 100000, posDaily: 300000, onlineDaily: 300000 },
  },
];

export const CREDIT_CARDS = CARDS.filter((c) => c.cardType === 'credit');
export const DEBIT_CARDS = CARDS.filter((c) => c.cardType === 'debit');

// ---------------------------------------------------------------------------
// INVESTMENTS — guaranteed (deposit) products and market-linked products are
// deliberately separated: deposits carry rate grids; SIP carries NO rate,
// only a risk disclosure.
// ---------------------------------------------------------------------------

/** Senior-citizen premium applied uniformly across the FD grid, in % p.a. */
export const FD_SENIOR_DELTA = 0.5;

export const FD = {
  slug: 'fixed-deposit',
  category: 'investment',
  kind: 'FD',
  riskClass: 'guaranteed',
  name: 'FinEdge Fixed Deposit',
  tagline: 'Lock in a rate for a chosen tenure — guaranteed returns',
  overview:
    'A term deposit with a rate fixed at booking for the whole tenure. Interest can be taken as cumulative (paid at maturity) or as regular payouts. Premature withdrawal is allowed with a 1% p.a. rate reduction for the period actually run.',
  compoundingNote: 'Interest compounded quarterly',
  prematureNote: 'Premature withdrawal is allowed with a 1% p.a. rate reduction for the period actually run.',
  rateGrid: [
    { tenure: '7 – 45 days', minDays: 7, maxDays: 45, general: 3.9, senior: 4.4 },
    { tenure: '46 – 179 days', minDays: 46, maxDays: 179, general: 5.1, senior: 5.6 },
    { tenure: '180 – 364 days', minDays: 180, maxDays: 364, general: 6.05, senior: 6.55 },
    { tenure: '1 – 2 years', minDays: 365, maxDays: 730, general: 6.85, senior: 7.35 },
    { tenure: '2 – 3 years', minDays: 731, maxDays: 1095, general: 6.95, senior: 7.45 },
    { tenure: '3 – 5 years', minDays: 1096, maxDays: 1825, general: 6.9, senior: 7.4 },
    { tenure: '5 – 10 years', minDays: 1826, maxDays: 3650, general: 6.75, senior: 7.25 },
  ],
  seniorDelta: FD_SENIOR_DELTA,
  minAmount: 5000,
  eligibility: [
    'Any FinEdge savings/current account holder',
    'Senior-citizen rates apply from age 60 (on the first holder)',
    'Minors can hold FDs through their guardian-operated accounts',
  ],
  features: [
    'Rate locked at booking for the full tenure',
    'Cumulative or monthly/quarterly payout options',
    'Loan/overdraft against FD up to 90% of the deposit value',
    'Auto-renewal option at maturity',
  ],
  disclosure:
    'Returns are guaranteed by the deposit contract, subject to the premature-withdrawal terms above. Deposit figures on this platform are simulated.',
  howToApply: [
    'Choose your amount and tenure and start your application online',
    'Fill in your details and submit the application',
    'We verify your KYC and application details',
    'Track the application in your FinEdge account until your deposit is booked',
  ],
};

export const RD = {
  slug: 'recurring-deposit',
  category: 'investment',
  kind: 'RD',
  riskClass: 'guaranteed',
  name: 'FinEdge Recurring Deposit',
  tagline: 'A fixed monthly deposit that builds a lump sum, quarter by quarter',
  overview:
    'Deposit a fixed amount every month for a chosen tenure. Interest is compounded quarterly at the rate applicable to your tenure band, fixed at the start of the RD.',
  compoundingNote: 'Interest compounded quarterly',
  missedInstalmentNote: 'One missed instalment per year is tolerated without penalty; later misses cost ₹10 per ₹1,000 of instalment.',
  rateBands: [
    { tenure: '6 – 12 months', minMonths: 6, maxMonths: 12, rate: 6.25 },
    { tenure: '13 – 24 months', minMonths: 13, maxMonths: 24, rate: 6.45 },
    { tenure: '25 – 60 months', minMonths: 25, maxMonths: 60, rate: 6.55 },
    { tenure: '61 – 120 months', minMonths: 61, maxMonths: 120, rate: 6.45 },
  ],
  minMonthly: 500,
  monthlyStep: 100,
  eligibility: ['Any FinEdge savings account holder', 'Standing instruction from your FinEdge account is mandatory'],
  features: [
    'Start with ₹500 per month, in multiples of ₹100',
    'Interest compounded quarterly',
    'One missed instalment per year tolerated without penalty; later misses cost ₹10 per ₹1,000 of instalment',
    'Premature closure allowed; interest paid at the rate for the period actually run, minus 1% p.a.',
  ],
  disclosure: 'Returns are as per the deposit contract. Deposit figures on this platform are simulated.',
  howToApply: [
    'Choose your amount and tenure and start your application online',
    'Fill in your details and submit the application',
    'We verify your KYC and application details',
    'Track the application in your FinEdge account until your deposit is booked',
  ],
};

export const SIP = {
  slug: 'systematic-investment-plan',
  category: 'investment',
  kind: 'SIP',
  riskClass: 'market-linked',
  name: 'FinEdge SIP (Mutual Fund Investments)',
  tagline: 'Invest monthly in mutual funds — market-linked, long-horizon',
  overview:
    'A systematic investment plan invests a fixed amount every month into a mutual fund scheme you choose. FinEdge distributes schemes from partner asset-management companies; the bank does not manage the funds and does not set or assure any return.',
  // NOTE: no rate field exists here on purpose. SIP returns are market-linked
  // and must never be presented as a deposit-style rate.
  fundCategories: [
    { name: 'Large-cap equity', riskLevel: 'Moderate to High', note: 'Established large companies; suitable for 5+ year goals.' },
    { name: 'Flexi-cap equity', riskLevel: 'High', note: 'Across company sizes; suitable for 7+ year goals.' },
    { name: 'Hybrid (balanced advantage)', riskLevel: 'Moderate', note: 'Mix of equity and debt; suitable for 3+ year goals.' },
    { name: 'ELSS (tax-saving)', riskLevel: 'High', note: 'Equity with a 3-year lock-in per instalment; tax treatment as per prevailing law.' },
    { name: 'Liquid / overnight debt', riskLevel: 'Low to Moderate', note: 'Short-term parking of money; still market-linked, not a deposit.' },
  ],
  minMonthly: 500,
  eligibility: [
    'Any FinEdge account holder with completed KYC and a valid PAN',
    'A risk-profile assessment is completed before the first investment',
  ],
  features: [
    'Start with ₹500 per month; pause or modify on any date',
    'Step-up SIP: increase the monthly amount automatically every year',
    'Money is invested with the AMC — it is NOT a bank deposit and is NOT insured as a deposit',
  ],
  disclosure:
    'MARKET-LINKED — RETURNS NOT GUARANTEED. Mutual fund investments are subject to market risks. Past performance is not indicative of future returns. The values shown by any SIP calculator on this site are hypothetical illustrations based on an assumed growth rate you select; they are not a promise or projection of actual returns. Please read all scheme documents carefully before investing.',
  howToApply: [
    'Choose your fund category and monthly amount and start your application online',
    'Fill in your details and submit the application',
    'We verify your KYC and application details',
    'Track the application in your FinEdge account until your first instalment is set up',
  ],
};

export const SSY = {
  slug: 'sukanya-samriddhi',
  category: 'investment',
  lifePhoto: {
    src: '/images/detail-sukanya-father-daughter-1200.webp',
    srcSet: '/images/detail-sukanya-father-daughter-400.webp 400w, /images/detail-sukanya-father-daughter-800.webp 800w, /images/detail-sukanya-father-daughter-1200.webp 1200w',
    alt: 'A father and young daughter reading together at home',
    caption: 'A father and daughter, planning ahead.',
    width: 1200,
    height: 800,
  },
  kind: 'SSY',
  riskClass: 'guaranteed',
  name: 'Sukanya Samriddhi Yojana (SSY)',
  tagline: 'A government-backed savings scheme for a girl child’s future',
  overview:
    'A Government of India savings scheme for the future of a girl child, offered here through the bank channel. The interest rate is notified by the Government and revised from time to time; the rate below is the illustrative rate used by this platform.',
  rate: 8.05,
  rateNote: 'Illustrative rate for this platform. The actual SSY rate is set by the Government of India and revised periodically.',
  minDepositYearly: 250,
  maxDepositYearly: 150000,
  tenureYears: 21,
  depositYears: 15,
  eligibility: [
    'One account per girl child, for a child below the age of 10 at opening',
    'Maximum two accounts per family (exceptions for twin/triplet girls as per scheme rules)',
    'Opened and operated by a parent or legal guardian',
    'Deposits for 15 years; account matures after 21 years or at the girl’s marriage after age 18, per scheme rules',
  ],
  features: [
    'Deposits from ₹250 to ₹1,50,000 per financial year',
    'Partial withdrawal up to 50% of the balance for the girl’s higher education, per scheme rules',
    'Tax treatment as per prevailing law (EEE status under the scheme)',
    'Transferable anywhere in India if the family relocates',
  ],
  disclosure:
    'SSY is a Government of India scheme; terms follow the official scheme rules. Figures on this platform are simulated for demonstration.',
  howToApply: [
    'Start the application with the girl child\'s and guardian\'s details',
    'Fill in your details and submit the application',
    'We verify your KYC and application details',
    'Track the application in your FinEdge account until the SSY account is opened',
  ],
};

export const INVESTMENTS = [FD, RD, SIP, SSY];

// ---------------------------------------------------------------------------
// Derived views + lookup helpers. RATES_AT_A_GLANCE is COMPUTED from the
// product definitions above — values are never re-typed, so the home page
// can never disagree with the product pages.
// ---------------------------------------------------------------------------

export const ALL_PRODUCTS = [...ACCOUNTS, ...LOANS, ...CARDS, ...INVESTMENTS];

const fdTopGeneral = Math.max(...FD.rateGrid.map((r) => r.general));
const fdTopSenior = Math.max(...FD.rateGrid.map((r) => r.senior));
const rdTopRate = Math.max(...RD.rateBands.map((b) => b.rate));
const loanFrom = (slug) => LOANS.find((l) => l.slug === slug).rateMin;

/** Headline rates for the home page / rates table. Values are % p.a. */
export const RATES_AT_A_GLANCE = [
  { label: 'Savings account (highest slab)', value: SAVINGS_TOP_RATE, display: `Up to ${SAVINGS_TOP_RATE.toFixed(2)}% p.a.`, productSlug: 'everyday-savings' },
  { label: 'Fixed deposit (up to)', value: fdTopGeneral, display: `Up to ${fdTopGeneral.toFixed(2)}% p.a.`, productSlug: 'fixed-deposit' },
  { label: 'Fixed deposit — senior citizens (up to)', value: fdTopSenior, display: `Up to ${fdTopSenior.toFixed(2)}% p.a.`, productSlug: 'fixed-deposit' },
  { label: 'Recurring deposit (up to)', value: rdTopRate, display: `Up to ${rdTopRate.toFixed(2)}% p.a.`, productSlug: 'recurring-deposit' },
  { label: 'Sukanya Samriddhi Yojana', value: SSY.rate, display: `${SSY.rate.toFixed(2)}% p.a.`, productSlug: 'sukanya-samriddhi' },
  { label: 'Home loan (from)', value: loanFrom('home-loan'), display: `From ${loanFrom('home-loan').toFixed(2)}% p.a.`, productSlug: 'home-loan' },
  { label: 'Gold loan (from)', value: loanFrom('gold-loan'), display: `From ${loanFrom('gold-loan').toFixed(2)}% p.a.`, productSlug: 'gold-loan' },
  { label: 'Vehicle loan (from)', value: loanFrom('vehicle-loan'), display: `From ${loanFrom('vehicle-loan').toFixed(2)}% p.a.`, productSlug: 'vehicle-loan' },
  { label: 'Education loan (from)', value: loanFrom('education-loan'), display: `From ${loanFrom('education-loan').toFixed(2)}% p.a.`, productSlug: 'education-loan' },
  { label: 'Loan against property (from)', value: loanFrom('loan-against-property'), display: `From ${loanFrom('loan-against-property').toFixed(2)}% p.a.`, productSlug: 'loan-against-property' },
];

/**
 * Find any product in the catalogue by its slug.
 * Returns the product object (with its `category`) or null.
 */
export function getProductBySlug(slug) {
  if (!slug) return null;
  return ALL_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/** All products of one category: 'account' | 'loan' | 'card' | 'investment'. */
export function getProductsByCategory(category) {
  return ALL_PRODUCTS.filter((p) => p.category === category);
}

export function getAccountBySlug(slug) {
  return ACCOUNTS.find((a) => a.slug === slug) ?? null;
}

export function getLoanBySlug(slug) {
  return LOANS.find((l) => l.slug === slug) ?? null;
}

export function getCardBySlug(slug) {
  return CARDS.find((c) => c.slug === slug) ?? null;
}

export function getInvestmentBySlug(slug) {
  return INVESTMENTS.find((i) => i.slug === slug) ?? null;
}
