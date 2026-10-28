export const ACCOUNTS_DATA = [
  {
    id: 'savings',
    title: 'FIRST Savings Account',
    category: 'Accounts',
    tagline: 'High yield savings with monthly interest compounding',
    interestRate: 'Up to 7.00% p.a.',
    minBalance: '₹10,000 / Zero for salary',
    features: [
      'Monthly interest credit for faster compounding',
      'Zero charges on 28+ everyday banking services',
      'Free higher-tier Platinum Debit Card with lounge access',
      'Unlimited free ATM withdrawals across all domestic banks'
    ],
    eligibility: 'Resident Indian individuals, sole proprietors, 18+ years',
    documents: ['Aadhaar Card with mobile linking', 'PAN Card', 'Proof of Address'],
    themeColor: '#9D1D27'
  },
  {
    id: 'current',
    title: 'Business Current Account',
    category: 'Accounts',
    tagline: 'Tailored for growing enterprises, retailers & MSMEs',
    interestRate: 'Sweep-in FD up to 7.10% p.a.',
    minBalance: '₹25,000 Average Monthly Balance',
    features: [
      'BRAVO Auto-Sweep facility to earn FD interest on surplus balances',
      'Free high cash deposit limits up to ₹15 Lakhs/month',
      'Complimentary bulk payout and vendor payment APIs',
      'Dynamic multi-user maker-checker corporate authorization'
    ],
    eligibility: 'Sole Proprietorship, Partnership, Private/Public Limited, LLP',
    documents: ['Certificate of Incorporation / GST', 'PAN Card of Entity', 'Board Resolution'],
    themeColor: '#1C1B1F'
  },
  {
    id: 'salary',
    title: 'Corporate Salary Account',
    category: 'Accounts',
    tagline: 'Zero balance wealth account packed with executive privileges',
    interestRate: 'Up to 7.00% p.a.',
    minBalance: 'Zero Balance Account',
    features: [
      'Lifetime zero minimum balance requirement with salary credit',
      'Pre-approved instant personal loan & overdraft up to 3x salary',
      'Complimentary domestic airport lounge access every quarter',
      'Comprehensive ₹1 Crore personal air accidental insurance'
    ],
    eligibility: 'Salaried employees of empanelled corporate organizations',
    documents: ['Corporate ID / Offer Letter', 'PAN Card', 'Recent 3 months salary slips'],
    themeColor: '#25243B'
  },
  {
    id: 'student',
    title: 'Student & Youth Account',
    category: 'Accounts',
    tagline: 'Smart digital banking for higher education & student life',
    interestRate: 'Up to 6.50% p.a.',
    minBalance: 'Zero Balance Account',
    features: [
      'Zero balance maintenance until graduation',
      'International contact-less student card with zero forex markup',
      'Special student discounts on test prep, travel & lifestyle brands',
      'Budget tracking & smart automated savings micro-goals'
    ],
    eligibility: 'Students aged 18 to 25 enrolled in recognised college/university',
    documents: ['College Student ID', 'Aadhaar Card', 'PAN Card'],
    themeColor: '#0288D1'
  },
  {
    id: 'minor',
    title: 'Minor Savings Account (FIRST Step)',
    category: 'Accounts',
    tagline: 'Teach sound financial habits to children under guardian supervision',
    interestRate: 'Up to 6.75% p.a.',
    minBalance: '₹1,000 Minimum Balance',
    features: [
      'Personalised debit card with child name and customizable spending limits',
      'Automated recurring deposit piggy bank to build long-term corpus',
      'Real-time SMS transaction alerts sent directly to guardian phone',
      'Seamless conversion to full independent account upon reaching age 18'
    ],
    eligibility: 'Minors from birth up to age 18 represented by Parent/Guardian',
    documents: ['Birth Certificate of Minor', 'Guardian PAN & Aadhaar', 'Minor Photograph'],
    themeColor: '#2E7D32'
  }
];

export const LOANS_DATA = [
  {
    id: 'home-loan',
    title: 'Dream Home Loan',
    category: 'Loans',
    tagline: 'Affordable interest rates with digital sanction in 48 hours',
    interestRate: '8.45% - 9.15% p.a.',
    maxAmount: 'Up to ₹10 Crores',
    tenure: 'Up to 30 Years',
    features: [
      'Minimal paperwork with quick digital processing & in-principle sanction',
      'Flexible balance transfer with lucrative top-up facility',
      'Zero prepayment or foreclosure penalties for floating rate borrowers',
      'Pradhan Mantri Awas Yojana (PMAY) subsidy eligible'
    ],
    eligibility: 'Salaried or Self-Employed individuals with CIBIL score 720+',
    documents: ['Property Title Deeds', 'Last 6 Months Bank Statement', 'ITR for last 2 years'],
    themeColor: '#9D1D27'
  },
  {
    id: 'business-loan',
    title: 'MSME Business Loan',
    category: 'Loans',
    tagline: 'Unsecured capital infusion to expand capacity & inventory',
    interestRate: '11.25% - 16.50% p.a.',
    maxAmount: 'Up to ₹1 Crore Collateral-Free',
    tenure: '12 to 60 Months',
    features: [
      'No collateral or guarantor required for verified creditworthy businesses',
      'Fast sanction within 3 business days of document verification',
      'Dropline overdraft facility to manage seasonal cashflow dips',
      'Flexible repayment options with structured balloon schedules'
    ],
    eligibility: 'Business vintage of 3+ years with minimum annual turnover of ₹40 Lakhs',
    documents: ['GST Returns for last 12 months', 'Audited Financials', 'Business Registration'],
    themeColor: '#1C1B1F'
  },
  {
    id: 'agri-loan',
    title: 'Kisan & Agriculture Loan',
    category: 'Loans',
    tagline: 'Empowering farming communities with crop and machinery finance',
    interestRate: '7.00% p.a. (Subsidized)',
    maxAmount: 'Up to ₹50 Lakhs',
    tenure: 'Aligned with harvesting cycles',
    features: [
      'Interest subvention as per Government of India agricultural guidelines',
      'Repayment schedules mapped directly to crop harvesting seasons',
      'Tractor, drone, and high-efficiency micro-irrigation equipment financing',
      'Quick localized assessment with minimum red-tape'
    ],
    eligibility: 'Farmers, cultivators, dairy owners, and agri-entrepreneurs with land records',
    documents: ['7/12 Land Record Extract / Patta', 'Kisan Credit Card (if existing)', 'Aadhaar Card'],
    themeColor: '#2E7D32'
  },
  {
    id: 'auto-loan',
    title: 'Vehicle & Car Loan',
    category: 'Loans',
    tagline: 'Drive your dream car with up to 100% on-road funding',
    interestRate: '8.75% - 10.50% p.a.',
    maxAmount: 'Up to 100% On-Road Value',
    tenure: 'Up to 84 Months',
    features: [
      'Comprehensive funding including road tax, registration & insurance',
      'Pre-approved instant approvals for existing bank account holders',
      'Covers electric vehicles (EV) with dedicated green discount of 0.25%',
      'Financing available for both brand-new and certified pre-owned vehicles'
    ],
    eligibility: 'Salaried or Self-Employed individuals with stable income source',
    documents: ['Car Proforma Invoice from Dealer', 'Salary Slips / ITR', 'Driving Licence'],
    themeColor: '#0288D1'
  },
  {
    id: 'gold-loan',
    title: 'Instant Gold Loan',
    category: 'Loans',
    tagline: 'Unlock the liquid value of your gold jewellery in 20 minutes',
    interestRate: '9.25% - 14.00% p.a.',
    maxAmount: 'Up to ₹50 Lakhs (75% LTV)',
    tenure: '3 to 24 Months',
    features: [
      'Disbursal directly to bank account in 20 minutes with zero credit score check',
      'Highest per-gram valuation indexed dynamically to live bullion rates',
      'Secure custody in triple-layered bank lockers with 100% insurance',
      'Bullet repayment option: Pay interest monthly and principal at maturity'
    ],
    eligibility: 'Any resident Indian owning gold jewellery (18 to 24 Karats)',
    documents: ['Aadhaar Card', 'PAN Card', 'Physical Gold Jewellery for in-branch appraisal'],
    themeColor: '#C9A227'
  },
  {
    id: 'lap-loan',
    title: 'Loan Against Property (LAP)',
    category: 'Loans',
    tagline: 'Leverage your residential or commercial property for high-ticket capital',
    interestRate: '9.00% - 10.75% p.a.',
    maxAmount: 'Up to ₹25 Crores',
    tenure: 'Up to 15 Years',
    features: [
      'Significantly lower interest rate than unsecured personal or business loans',
      'Loan-to-value (LTV) up to 70% of market property appraisal',
      'Dual facility: Term loan for lump sum and overdraft for working capital',
      'Retain complete possession and productive usage of property during tenure'
    ],
    eligibility: 'Salaried, Professional (Doctor/CA), or Self-Employed property owners',
    documents: ['Registered Property Conveyance Deed', 'Tax Receipts', 'Approved Building Plan'],
    themeColor: '#4A4A6A'
  },
  {
    id: 'education-loan',
    title: 'Global Education Loan',
    category: 'Loans',
    tagline: 'Fund your top university aspirations in India and abroad',
    interestRate: '9.50% - 11.25% p.a.',
    maxAmount: 'Up to ₹1.5 Crores',
    tenure: 'Course duration + 1 year moratorium + 15 years',
    features: [
      'Covers 100% of university tuition fees, living expenses, laptop & airfare',
      'Collateral-free loans available for 200+ premier global universities',
      'Moratorium period during entire study course plus 6 to 12 months buffer',
      'Tax deduction on interest paid under Section 80E of Income Tax Act'
    ],
    eligibility: 'Indian students securing admission to recognized degree/diploma courses',
    documents: ['University Admission Letter with Fee Structure', 'Academic Marksheets', 'Co-borrower KYC'],
    themeColor: '#9D1D27'
  }
];

export const CARDS_DATA = [
  {
    id: 'ashva-metal',
    title: 'Ashva Metal Credit Card',
    category: 'Cards',
    tier: 'Metal Luxury',
    tagline: 'Precision crafted stainless-steel metal card for discerning executives',
    annualFee: '₹2,999 (Waived on ₹3 Lakh annual spend)',
    rewards: '5X points on all spends, 10X points on birthday & incremental spends',
    features: [
      'Zero forex markup on all international online and overseas transactions',
      'Unlimited domestic airport lounge access + 4 complimentary international visits',
      'Low interest APR starting at 0.75% per month (9.0% annualized)',
      'Complimentary golf games and masterclasses across premier Indian greens'
    ],
    cardImage: 'metal-dark',
    themeColor: '#1C1B1F'
  },
  {
    id: 'mayura-metal',
    title: 'Mayura Metal Credit Card',
    category: 'Cards',
    tier: 'Ultra Premium Metal',
    tagline: 'The pinnacle of bespoke hospitality, travel, and concierge luxury',
    annualFee: '₹5,999 (Waived on ₹6 Lakh annual spend)',
    rewards: '10X reward points that never expire, redeemable 1:1 for luxury flights',
    features: [
      'Unlimited complimentary domestic & international lounge access with guest pass',
      'Zero forex markup globally with 24/7 dedicated global lifestyle concierge',
      'Complimentary luxury dining vouchers & cinema tickets (Buy 1 Get 1 free)',
      'Comprehensive ₹2 Crore worldwide travel insurance & medical evacuation'
    ],
    cardImage: 'metal-gold',
    themeColor: '#C9A227'
  },
  {
    id: 'first-millennia',
    title: 'FIRST Millennia Credit Card',
    category: 'Cards',
    tier: 'Lifetime Free',
    tagline: 'India’s most loved lifetime free card with dynamic interest rates',
    annualFee: 'Lifetime Free (Zero joining, Zero annual fee)',
    rewards: '6X on online spends, 3X on offline, 10X on spends exceeding ₹20,000',
    features: [
      'Zero annual maintenance fee forever with no minimum spend conditions',
      'Interest-free cash withdrawal from ATMs across India for up to 48 days',
      'Dynamic low APR starting from 9% to 36% p.a. based on credit score',
      '25% discount on movie tickets up to ₹100 once every calendar month'
    ],
    cardImage: 'classic-red',
    themeColor: '#9D1D27'
  },
  {
    id: 'first-wow',
    title: 'FIRST WOW! FD-Backed Card',
    category: 'Cards',
    tier: 'Guaranteed Approval',
    tagline: '100% guaranteed approval backed by fixed deposit—zero income proof',
    annualFee: 'Lifetime Free',
    rewards: '4X reward points on every ₹150 spent, zero forex markup worldwide',
    features: [
      '100% guaranteed issuance without salary slip or CIBIL credit score check',
      'Credit limit equals 100% of your fixed deposit while FD continues earning up to 7.10%',
      'Absolute zero forex conversion fee on all foreign currency transactions',
      'Ideal springboard to establish and rapidly boost your credit score rating'
    ],
    cardImage: 'wow-blue',
    themeColor: '#0288D1'
  },
  {
    id: 'platinum-debit',
    title: 'FIRST Platinum Debit Card',
    category: 'Cards',
    tier: 'Everyday Banking',
    tagline: 'Contactless chip card bundled with high-yield savings accounts',
    annualFee: 'Complimentary with Savings Account',
    rewards: 'Cashback on fuel, dining, and utility bill payments',
    features: [
      'Daily ATM withdrawal limit of ₹1,00,000 and POS purchase limit of ₹4,00,000',
      'Complimentary domestic airport lounge access once per calendar quarter',
      'Comprehensive ₹50 Lakhs personal accident and air travel insurance cover',
      'Discounts up to 20% across 3,000+ partner restaurants pan-India'
    ],
    cardImage: 'debit-slate',
    themeColor: '#25243B'
  }
];

export const INVESTMENTS_DATA = [
  {
    id: 'fixed-deposit',
    title: 'High-Yield Fixed Deposit',
    category: 'Investments',
    tagline: 'Guaranteed capital safety with attractive quarterly compounded returns',
    rate: 'Up to 7.10% p.a. (7.60% for Seniors)',
    tenure: '7 Days to 10 Years',
    features: [
      'Zero penalty on premature withdrawal after 6 months for added peace of mind',
      'Quarterly compounding interest ensures optimum returns on your capital',
      'Flexible interest payout modes: Monthly, Quarterly, or Cumulative on maturity',
      'Insured up to ₹5 Lakhs per depositor under RBI’s DICGC insurance framework'
    ],
    benefits: ['Guaranteed returns', 'DICGC Insured', 'Overdraft credit up to 90% of FD'],
    themeColor: '#9D1D27'
  },
  {
    id: 'recurring-deposit',
    title: 'Smart Recurring Deposit',
    category: 'Investments',
    tagline: 'Systematically save monthly installments to build disciplined wealth',
    rate: 'Up to 7.10% p.a. (7.60% for Seniors)',
    tenure: '6 Months to 10 Years',
    features: [
      'Start systematic savings with modest installments starting at just ₹500/month',
      'Same competitive interest rate as full fixed deposits locked for entire term',
      'Automated standing instruction debit directly from your savings account',
      'No loss of compounding interest due to scheduled quarterly additions'
    ],
    benefits: ['Small regular contributions', 'High compounding rate', 'Disciplined habit'],
    themeColor: '#25243B'
  },
  {
    id: 'sip',
    title: 'Systematic Investment Plan (SIP)',
    category: 'Investments',
    tagline: 'Harness the power of Indian equity & debt markets through top mutual funds',
    rate: 'Historical 12% - 15% CAGR (Market Linked)',
    tenure: 'Flexible (Open-ended)',
    features: [
      'Zero transaction fees or distributor commissions on direct mutual fund schemes',
      'Curated risk-profile portfolios: Conservative, Balanced, and Aggressive Growth',
      'Automated rupee-cost averaging buffers against market volatility',
      'One-click pause, step-up increment, or full redemption without lock-in'
    ],
    benefits: ['Rupee cost averaging', 'Inflation beating returns', 'Direct zero-commission funds'],
    themeColor: '#0288D1'
  },
  {
    id: 'ssy',
    title: 'Sukanya Samriddhi Yojana (SSY)',
    category: 'Investments',
    tagline: 'Government-backed welfare scheme for the girl child with triple tax benefits',
    rate: '8.20% p.a. (Govt Guaranteed)',
    tenure: '21 Years or until marriage after 18',
    features: [
      'Highest sovereign interest rate among all small savings schemes in India',
      'Triple Tax Exemption (EEE): Investment, Interest earned & Maturity are all 100% tax-free',
      'Annual deposit flexibility ranging from minimum ₹250 up to maximum ₹1,50,000',
      'Partial withdrawal up to 50% permitted after age 18 for higher education fees'
    ],
    benefits: ['Triple Tax Exemption EEE', 'Highest Sovereign Rate', 'Secure girl child future'],
    themeColor: '#2E7D32'
  }
];

export const FAQS_DATA = [
  {
    q: 'How does monthly interest crediting work in the Savings Account?',
    a: 'Unlike traditional banks that credit savings account interest quarterly, FinEdge calculates interest daily on your end-of-day ledger balance and credits it directly to your account on the final day of each calendar month. This gives you faster compounding, as you earn interest on your previously credited interest every single month.'
  },
  {
    q: 'What is the BRAVO Auto-Sweep facility on Current Accounts?',
    a: 'BRAVO Auto-Sweep automatically sweeps idle balances above a threshold (e.g., ₹1,00,000) into short-term Fixed Deposits in denominations of ₹25,000, earning you up to 7.10% interest. Whenever your business issues cheques or makes payouts exceeding the operating balance, the required amount sweeps back instantly with zero penalty.'
  },
  {
    q: 'Can I apply for a credit card without any income proof?',
    a: 'Yes! Our FIRST WOW! Credit Card is backed by a Fixed Deposit. By placing an FD starting at ₹2,000, you are instantly issued a credit card with 100% of your deposit value as credit limit, with zero salary slips, ITRs, or CIBIL credit score requirements.'
  },
  {
    q: 'What are the prepayment charges on retail loans?',
    a: 'As per Reserve Bank of India (RBI) mandates and FinEdge customer-first charter, all floating-rate Home Loans and Personal Loans extended to individuals carry zero prepayment, part-payment, or foreclosure penalties.'
  },
  {
    q: 'Are deposits with FinEdge insured?',
    a: 'Yes. All deposits (Savings, Current, Recurring, and Fixed Deposits) are insured under the Deposit Insurance and Credit Guarantee Corporation (DICGC), a wholly-owned subsidiary of the Reserve Bank of India, up to ₹5,00,000 per depositor.'
  }
];

export const MOCK_TRANSACTIONS = [
  { id: 'TXN-90812', date: '2026-10-14', description: 'Monthly Interest Credited (Compounded)', type: 'credit', amount: 894.20, category: 'Interest' },
  { id: 'TXN-90811', date: '2026-10-12', description: 'Salary Inward - Tech Corp India Ltd', type: 'credit', amount: 125000.00, category: 'Salary' },
  { id: 'TXN-90810', date: '2026-10-10', description: 'Electricity Bill Payment - BESCOM', type: 'debit', amount: 2450.00, category: 'Utilities' },
  { id: 'TXN-90809', date: '2026-10-08', description: 'Grocery Purchase - Nature Basket', type: 'debit', amount: 3820.50, category: 'Shopping' },
  { id: 'TXN-90808', date: '2026-10-05', description: 'UPI Transfer to Ananya Iyer (Split bill)', type: 'debit', amount: 1200.00, category: 'Transfers' },
  { id: 'TXN-90807', date: '2026-10-01', description: 'SIP Mutual Fund Auto-Debit - Axis Bluechip', type: 'debit', amount: 5000.00, category: 'Investments' },
  { id: 'TXN-90806', date: '2026-09-30', description: 'Monthly Interest Credited', type: 'credit', amount: 862.10, category: 'Interest' }
];
