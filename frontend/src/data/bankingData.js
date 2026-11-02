import { FINEDGE_RATES_CONFIG } from './ratesConfig.js';

export { FINEDGE_RATES_CONFIG };

export const ACCOUNTS_DATA = [
  {
    id: 'savings',
    slug: 'prime-savings',
    title: 'FinEdge Prime Savings Account',
    category: 'Accounts',
    tagline: 'High yield digital savings with tiered monthly interest compounding',
    interestRate: `Up to ${FINEDGE_RATES_CONFIG.savings.peakRate}`,
    minBalance: FINEDGE_RATES_CONFIG.savings.ambRequirements.primeSavings,
    overview: 'Engineered for individuals seeking superior returns on liquidity. Offers automated tiered interest calculation computed daily on end-of-day balances and credited on the 1st of every month.',
    features: [
      `Tiered interest up to ${FINEDGE_RATES_CONFIG.savings.peakRate} credited on the ${FINEDGE_RATES_CONFIG.savings.creditCycle}`,
      'Zero maintenance fees on qualifying average monthly balances or regular salary credits',
      'Complimentary FinEdge Platinum Debit Card with domestic airport lounge access',
      'Unlimited free digital fund transfers across NEFT, RTGS, and IMPS'
    ],
    keyBenefits: [
      { title: 'Monthly Compounding', desc: `Interest computed daily and credited directly to your account on the ${FINEDGE_RATES_CONFIG.savings.creditCycle}.` },
      { title: 'Complimentary Card', desc: 'Comes with contactless FinEdge Platinum Debit Card with high ATM and POS limits.' },
      { title: 'Zero Hidden Fees', desc: 'Zero charges on digital IMPS, NEFT, RTGS, and doorstep banking requests.' },
      { title: 'Deposit Insurance', desc: FINEDGE_RATES_CONFIG.brand.dicgcInsurance }
    ],
    rateSlabs: FINEDGE_RATES_CONFIG.savings.slabs,
    eligibility: {
      entityType: 'Resident Indian individuals & sole proprietors',
      minimumAge: '18 years and above',
      initialFunding: '₹10,000 for regular account; zero for corporate salary conversion',
      cibilRequired: 'No minimum credit score required for savings opening'
    },
    documents: [
      'Aadhaar Card (with linked mobile number for e-KYC)',
      'Permanent Account Number (PAN) Card or Form 60',
      'Recent passport-size photograph (captured digitally via Video KYC)'
    ],
    feesAndCharges: [
      { item: 'Average Monthly Balance (AMB)', fee: '₹10,000 (Metro/Urban), ₹5,000 (Semi-Urban)' },
      { item: 'Non-maintenance Penalty', fee: '5% of shortfall or max ₹350/month' },
      { item: 'Debit Card Annual Fee', fee: 'Complimentary for Year 1; ₹250 p.a. thereafter' },
      { item: 'ATM Withdrawals', fee: 'Unlimited at FinEdge ATMs; 5 free per month at other banks' }
    ],
    howToApply: [
      'Enter basic mobile and PAN details for instant identity pre-fill',
      'Complete instant Video KYC verification in under 5 minutes',
      'Fund your account digitally via UPI, NetBanking, or debit card',
      'Instant access to NetBanking and virtual debit card generation'
    ],
    faqs: [
      {
        q: 'When is interest calculated and credited?',
        a: `Interest is calculated on the daily closing balance and credited on the ${FINEDGE_RATES_CONFIG.savings.creditCycle}.`
      },
      {
        q: 'What is the required Average Monthly Balance?',
        a: 'The account requires an AMB of ₹10,000 in metro and urban locations. This charge is waived entirely with recurring monthly salary credit.'
      }
    ],
    themeColor: '#0A2540'
  },
  {
    id: 'current',
    slug: 'enterprise-current',
    title: 'FinEdge Enterprise Current Account',
    category: 'Accounts',
    tagline: 'Tailored for growing enterprises, retailers, startups, and MSMEs',
    interestRate: `Smart-Sweep FD yield up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak}`,
    minBalance: FINEDGE_RATES_CONFIG.savings.ambRequirements.enterpriseCurrent,
    overview: 'High-volume business current account featuring automated smart-sweep liquidity to convert idle operating balances into interest-earning deposits with zero prepayment friction.',
    features: [
      `FinEdge Smart-Sweep facility to earn FD returns up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak} on surplus balances`,
      'Generous free cash deposit allowances up to ₹15 Lakhs every month across branches',
      'Bulk payout APIs and automated vendor payment management suite',
      'Configurable multi-user maker-checker corporate authorization workflows'
    ],
    keyBenefits: [
      { title: 'Smart-Sweep Liquidity', desc: 'Idle balances over threshold sweep automatically into short-term deposits and reverse on demand.' },
      { title: 'High Cash Limits', desc: 'Free cash deposit limits matched to your monthly business turnover.' },
      { title: 'Corporate Portal', desc: 'Granular role-based controls for accountants, approvers, and directors.' }
    ],
    eligibility: {
      entityType: 'Sole Proprietorship, Partnership, Private/Public Limited, LLP, Trusts',
      minimumAge: 'Authorized signatory must be 18+ years',
      initialFunding: '₹25,000 minimum opening deposit'
    },
    documents: [
      'Certificate of Incorporation / Partnership Deed / Udyam Registration',
      'Entity PAN Card and GSTIN Registration Certificate',
      'Board Resolution / Authorization letter for designated operators',
      'KYC documents of all Beneficial Owners and Key Managerial Personnel'
    ],
    feesAndCharges: [
      { item: 'Average Monthly Balance (AMB)', fee: '₹25,000' },
      { item: 'Cash Deposit Limit', fee: 'Free up to ₹15 Lakhs/month or 10x AMB, ₹3.50/₹1,000 thereafter' },
      { item: 'Bulk Payout API Integration', fee: 'Free with active corporate account' }
    ],
    howToApply: [
      'Upload business registration and entity documents online',
      'Designate authorized signatories and directors for digital signing',
      'Schedule on-site biometric verification or doorstep document collection',
      'Account active with custom corporate portal credentials within 24 hours'
    ],
    faqs: [
      {
        q: 'How does the Smart-Sweep facility work on Current Accounts?',
        a: 'Smart-Sweep automatically transfers idle balances above ₹1,00,000 into short-term term deposits in increments of ₹25,000. When payments or cheques are presented exceeding your balance, funds sweep back seamlessly with zero penalty.'
      }
    ],
    themeColor: '#1C1B1F'
  },
  {
    id: 'salary',
    slug: 'executive-salary',
    title: 'FinEdge Executive Salary Account',
    category: 'Accounts',
    tagline: 'Zero balance wealth account packed with executive privileges',
    interestRate: `Up to ${FINEDGE_RATES_CONFIG.savings.peakRate}`,
    minBalance: FINEDGE_RATES_CONFIG.savings.ambRequirements.executiveSalary,
    overview: 'Created for working professionals whose employers have corporate tie-ups with FinEdge Bank. Offers complete zero-balance freedom with elevated reward points and personal overdraft facilities.',
    features: [
      'Lifetime zero minimum balance requirement with regular monthly salary credit',
      `Pre-approved instant personal loan & overdraft facility at ${FINEDGE_RATES_CONFIG.loans.personalLoanStartingRate}`,
      'Complimentary airport lounge access every calendar quarter',
      'Comprehensive ₹1 Crore personal air accidental insurance coverage'
    ],
    keyBenefits: [
      { title: 'Zero Balance Forever', desc: 'No balance penalties as long as monthly salary continues to credit.' },
      { title: 'Preferential Loan Rates', desc: '0.50% interest concession across personal and auto loans.' },
      { title: 'Airport Lounge Access', desc: 'Complimentary domestic lounge access via your premium debit card.' }
    ],
    eligibility: {
      entityType: 'Salaried employees of empanelled corporate organizations and institutions',
      minimumAge: '21 to 60 years',
      minimumMonthlySalary: '₹25,000 per month net salary credit'
    },
    documents: [
      'Official Corporate ID Card or Appointment Letter',
      'PAN Card and Aadhaar Card',
      'Recent 3 months salary slips or bank statements'
    ],
    feesAndCharges: [
      { item: 'Minimum Balance', fee: 'Zero balance with regular salary credit' },
      { item: 'Debit Card Annual Fee', fee: 'Lifetime Free Executive Platinum Card' },
      { item: 'NEFT / RTGS / IMPS', fee: '100% Free digital transfers' }
    ],
    howToApply: [
      'Verify corporate email and employee ID',
      'Submit Aadhaar and PAN for instant verification',
      'Corporate HR notifies FinEdge for automated corporate tag binding',
      'Instant account dispatch and salary routing details generated'
    ],
    faqs: [
      {
        q: 'What happens if I change my job?',
        a: 'You can continue using the account as a zero-balance account for 3 months. If salary credits cease permanently, it can be seamlessly converted to a FinEdge Prime Savings Account.'
      }
    ],
    themeColor: '#25243B'
  },
  {
    id: 'student',
    slug: 'campus-youth',
    title: 'FinEdge Campus Youth Account',
    category: 'Accounts',
    tagline: 'Smart digital banking for university students and early-career builders',
    interestRate: 'Up to 6.50% p.a.',
    minBalance: FINEDGE_RATES_CONFIG.savings.ambRequirements.campusYouth,
    overview: 'Tailored for students aged 18 to 25. Delivers fee-free digital transactions, zero forex markup on global educational tests and subscriptions, and budgeting intelligence.',
    features: [
      'Lifetime zero balance maintenance until completion of graduation',
      'International contactless virtual & physical student card with zero foreign exchange markup',
      'Special student discounts across test prep, electronics, travel, and campus essentials',
      'Automated micro-savings and weekly spending analytics'
    ],
    keyBenefits: [
      { title: 'Zero Balance', desc: 'No balance maintenance charges throughout collegiate tenure.' },
      { title: 'Global Student Card', desc: 'Zero currency markup on overseas online testing and admissions fees.' }
    ],
    eligibility: {
      entityType: 'Students aged 18 to 25 years currently enrolled in recognised college/university',
      minimumAge: '18 years'
    },
    documents: [
      'Valid College / University Student Identity Card or Admission Letter',
      'Aadhaar Card with mobile linking',
      'PAN Card'
    ],
    feesAndCharges: [
      { item: 'Account Maintenance', fee: 'Zero' },
      { item: 'Debit Card Issuance', fee: 'Complimentary Student Card' }
    ],
    howToApply: [
      'Upload College Student ID and college email address',
      'Complete Aadhaar e-KYC on your mobile',
      'Account activates instantly with virtual card details'
    ],
    faqs: [
      {
        q: 'Do I need income proof to open a Campus Youth Account?',
        a: 'No income proof is required. Only valid student enrollment proof and personal KYC documents are needed.'
      }
    ],
    themeColor: '#0288D1'
  },
  {
    id: 'minor',
    slug: 'junior-step',
    title: 'FinEdge Junior Step Account',
    category: 'Accounts',
    tagline: 'Teach sound financial habits to children under guardian supervision',
    interestRate: 'Up to 6.75% p.a.',
    minBalance: FINEDGE_RATES_CONFIG.savings.ambRequirements.juniorStep,
    overview: 'A supervised savings account designed for minors under age 18. Enables parents and guardians to instill financial literacy while maintaining comprehensive transaction controls.',
    features: [
      'Personalised debit card with child name and parent-customisable daily limits',
      'Automated recurring deposit piggy bank to build long-term educational funds',
      'Real-time SMS alerts delivered directly to guardian phone for every transaction',
      'Automatic conversion to independent account upon reaching age 18'
    ],
    keyBenefits: [
      { title: 'Supervised Spending', desc: 'Guardians control daily withdrawal and POS spending caps via NetBanking.' },
      { title: 'High Yield', desc: 'Earn up to 6.75% p.a. to help college funds grow faster.' }
    ],
    eligibility: {
      entityType: 'Minors from birth up to 18 years represented by natural or legal guardian',
      guardianRequirement: 'Parent or court-appointed legal guardian must have valid KYC'
    },
    documents: [
      'Birth Certificate of Minor child',
      'Guardian PAN Card and Aadhaar Card',
      'Recent passport-size photograph of minor and guardian'
    ],
    feesAndCharges: [
      { item: 'Minimum Balance', fee: '₹1,000' },
      { item: 'Debit Card', fee: 'Free personalised junior card' }
    ],
    howToApply: [
      'Parent or guardian logs into FinEdge portal or visits nearest branch',
      'Submit child birth certificate and guardian KYC',
      'Account opens with linked guardian supervisory access'
    ],
    faqs: [
      {
        q: 'Can the child withdraw money from ATMs?',
        a: 'Yes, if the guardian enables ATM privileges, with daily spending caps set by the guardian.'
      }
    ],
    themeColor: '#2E7D32'
  }
];

export const LOANS_DATA = [
  {
    id: 'home-loan',
    slug: 'home-loan',
    title: 'FinEdge Home Loan',
    category: 'Loans',
    tagline: 'Affordable interest rates with digital sanction in 48 hours',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.homeLoanStartingRate} onwards`,
    maxAmount: 'Up to ₹10 Crores',
    tenure: 'Up to 30 Years',
    overview: 'Competitive home financing with transparent floating benchmark rates, zero prepayment penalties for individual borrowers, and quick digital in-principle sanction.',
    features: [
      `Transparent benchmark starting at ${FINEDGE_RATES_CONFIG.loans.homeLoanStartingRate}`,
      'Minimal paperwork with rapid digital processing & in-principle approval',
      'Flexible balance transfer with attractive top-up loan options',
      'Zero prepayment or foreclosure charges on all floating-rate retail loans'
    ],
    keyBenefits: [
      { title: 'Lowest Starting Rates', desc: `Starting at ${FINEDGE_RATES_CONFIG.loans.homeLoanStartingRate} based on applicant credit profile.` },
      { title: 'Long Repayment Tenure', desc: 'Flexible loan tenures up to 30 years to keep EMIs comfortable.' },
      { title: 'Zero Foreclosure Penalty', desc: 'Prepay partial or full amounts anytime without additional fees.' }
    ],
    eligibility: {
      entityType: 'Salaried or Self-Employed individuals',
      minimumAge: '21 to 65 years at maturity',
      minimumIncome: '₹35,000/month (Salaried) or ₹4,00,000/year (Self-Employed)',
      cibilRequired: 'CIBIL score 720 and above preferred'
    },
    documents: [
      'Property Title Deeds, Chain of Title, and Approved Municipal Plan',
      'Last 6 months operative bank statements showing salary/business credits',
      'Last 2 years Income Tax Returns with computation of income and Form 16'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '0.25% to 0.50% of loan amount (Min ₹5,000, Max ₹25,000)' },
      { item: 'Foreclosure / Prepayment', fee: 'Nil for individual borrowers on floating rate' },
      { item: 'Legal & Technical Valuation', fee: 'At actuals charged by empanelled advocates/engineers' }
    ],
    howToApply: [
      'Check eligibility and calculate monthly EMI with the interactive calculator',
      'Submit identity, income, and property preliminary details online',
      'Receive instant digital sanction letter with approved eligibility amount',
      'Complete legal and technical appraisal for rapid disbursal into builder/seller account'
    ],
    faqs: [
      {
        q: 'Can I prepay my home loan early without penalty?',
        a: 'Yes. In strict accordance with RBI regulations, individual floating-rate home loans carry zero prepayment or foreclosure penalties.'
      }
    ],
    themeColor: '#0A2540'
  },
  {
    id: 'personal-loan',
    slug: 'personal-loan',
    title: 'FinEdge Express Personal Loan',
    category: 'Loans',
    tagline: 'Instant collateral-free funds for life milestones and emergency liquidity',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.personalLoanStartingRate} onwards`,
    maxAmount: 'Up to ₹25 Lakhs',
    tenure: '12 to 60 Months',
    overview: 'Unsecured personal loan featuring instant digital underwriting, paperless verification, and immediate disbursal directly into your verified bank account.',
    features: [
      `Affordable interest rates starting at ${FINEDGE_RATES_CONFIG.loans.personalLoanStartingRate}`,
      '100% paperless digital process with sanction in under 10 minutes',
      'Zero collateral or third-party guarantor requirement',
      'Flexible tenures from 12 to 60 months with predictable monthly EMIs'
    ],
    keyBenefits: [
      { title: 'Instant Disbursal', desc: 'Approved funds transferred directly to your bank account within minutes.' },
      { title: 'No Collateral', desc: 'Completely unsecured credit based on your financial strength.' },
      { title: 'Transparent Charges', desc: 'Clear schedule of processing fees and repayment schedules with zero surprises.' }
    ],
    eligibility: {
      entityType: 'Salaried professionals and self-employed consultants',
      minimumAge: '21 to 58 years',
      minimumIncome: '₹30,000 per month net credited salary',
      cibilRequired: 'CIBIL score 700 and above'
    },
    documents: [
      'PAN Card and Aadhaar Card',
      'Last 3 months salary slips or professional fee receipts',
      'Last 6 months operative bank statements'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '1.0% to 2.0% of loan amount + GST' },
      { item: 'Prepayment Charges', fee: 'Nil after 12 successful EMI payments' },
      { item: 'Late Payment Fee', fee: '₹500 per missed payment + statutory interest' }
    ],
    howToApply: [
      'Select required loan amount and tenure on the personal loan calculator',
      'Authenticate identity via Aadhaar and upload recent salary slips',
      'Complete automated credit underwriting check in real time',
      'E-sign loan agreement and receive instant loan disbursal'
    ],
    faqs: [
      {
        q: 'How fast is the disbursal for FinEdge Express Personal Loans?',
        a: 'Existing FinEdge account holders receive instant disbursal within 10 minutes of digital e-sign. Non-customers typically receive funds within 4 business hours.'
      }
    ],
    themeColor: '#4A4A6A'
  },
  {
    id: 'business-loan',
    slug: 'business-loan',
    title: 'FinEdge Business Growth Loan',
    category: 'Loans',
    tagline: 'Collateral-free working capital infusion to expand business inventory and scale',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.businessLoanStartingRate} onwards`,
    maxAmount: 'Up to ₹1 Crore Collateral-Free',
    tenure: '12 to 60 Months',
    overview: 'Designed for established enterprises, retailers, and MSMEs looking to invest in machinery, inventory, or seasonal business opportunities without pledging hard property assets.',
    features: [
      'No collateral or guarantor required for verified creditworthy enterprises',
      'Sanction within 3 business days of digital document verification',
      'Dropline overdraft facility to manage cyclic working capital fluctuations',
      'Structured balloon and bullet repayment schedules available'
    ],
    keyBenefits: [
      { title: 'Unsecured Capital', desc: 'Expand without putting commercial or residential property on the line.' },
      { title: 'Overdraft Option', desc: 'Pay interest only on the exact funds utilized on a daily basis.' }
    ],
    eligibility: {
      entityType: 'Sole Proprietorship, Partnership, Private Limited, LLP with 3+ years operational history',
      minimumTurnover: 'Minimum annual GST-reported turnover of ₹40 Lakhs'
    },
    documents: [
      'GST returns for the last 12 months',
      'Audited balance sheet and P&L statements for the last 2 financial years',
      'Entity business registration and promoter KYC documents'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '1.5% to 2.5% of sanctioned facility' },
      { item: 'Annual Facility Renewal', fee: '0.50% of sanction limit for overdrafts' }
    ],
    howToApply: [
      'Submit entity GSTIN and PAN details for automated revenue analysis',
      'Upload audited financials and 12-month business bank statements',
      'Credit team issues term sheet within 48 hours',
      'Execution of loan agreement and capital credit to current account'
    ],
    faqs: [
      {
        q: 'Can startups apply for FinEdge Business Growth Loans?',
        a: 'We require a minimum operational vintage of 2 to 3 years with verified GST filings to qualify for unsecured business lending.'
      }
    ],
    themeColor: '#1C1B1F'
  },
  {
    id: 'agri-loan',
    slug: 'agri-loan',
    title: 'FinEdge Agri Krishi Loan',
    category: 'Loans',
    tagline: 'Empowering farming communities with crop, dairy, and machinery finance',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.agriStartingRate} (Subsidized Priority)`,
    maxAmount: 'Up to ₹50 Lakhs',
    tenure: 'Aligned with harvesting cycles',
    overview: 'Specialized priority sector lending for cultivators, dairy farmers, and agri-entrepreneurs with seasonal repayment structures aligned to crop harvest calendars.',
    features: [
      'Interest subvention as per Government of India agricultural guidelines',
      'Repayment schedules mapped directly to seasonal crop harvesting cycles',
      'Financing for tractors, solar pump sets, drones, and micro-irrigation systems',
      'Simplified localized assessment with minimal paperwork'
    ],
    keyBenefits: [
      { title: 'Harvest-Mapped EMI', desc: 'Repay when crops sell; no monthly pressure during non-harvest months.' },
      { title: 'Machinery Finance', desc: 'Up to 90% funding on modern mechanized agricultural implements.' }
    ],
    eligibility: {
      entityType: 'Farmers, cultivators, dairy owners, and agri-entrepreneurs with verified land records',
      cibilRequired: 'Satisfactory credit history on Kisan Credit Card or existing rural credit'
    },
    documents: [
      '7/12 Land Record Extract / Patta documents',
      'Kisan Credit Card (if currently held)',
      'Aadhaar Card and land ownership proof'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: 'Nil for crop loans up to ₹3 Lakhs; 0.50% thereafter' }
    ],
    howToApply: [
      'Visit nearest rural branch or submit digital application via portal',
      'Submit land ownership records for valuation',
      'Disbursal directly to agri-vendor or savings account'
    ],
    faqs: [
      {
        q: 'Is interest subvention available on this loan?',
        a: 'Yes, eligible prompt-paying farmers receive central interest subvention as per priority sector lending guidelines.'
      }
    ],
    themeColor: '#2E7D32'
  },
  {
    id: 'auto-loan',
    slug: 'auto-loan',
    title: 'FinEdge Drive Auto Loan',
    category: 'Loans',
    tagline: 'Finance your new or pre-owned car with up to 100% on-road funding',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.autoLoanStartingRate} onwards`,
    maxAmount: 'Up to 100% On-Road Value',
    tenure: 'Up to 84 Months',
    overview: 'Competitive car financing covering vehicle invoice, road tax, and registration. Includes special green discounts for zero-emission electric vehicles.',
    features: [
      'Comprehensive funding including road tax, registration, and comprehensive insurance',
      'Pre-approved instant offers for existing FinEdge banking customers',
      'Special 0.25% interest concession for electric vehicles (EV)',
      'Financing available for both brand-new and certified pre-owned vehicles'
    ],
    keyBenefits: [
      { title: '100% On-Road Funding', desc: 'Drive home without heavy upfront down-payment requirements.' },
      { title: 'Green EV Concession', desc: 'Support sustainability with discounted electric mobility interest rates.' }
    ],
    eligibility: {
      entityType: 'Salaried or self-employed individuals with stable regular income',
      minimumAge: '21 to 65 years'
    },
    documents: [
      'Car Proforma Invoice from authorized dealership',
      'Salary slips / ITR returns for last 2 years',
      'Valid driving license and KYC documents'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '₹3,500 to ₹7,500 flat based on vehicle segment' }
    ],
    howToApply: [
      'Upload dealer quotation and vehicle model details',
      'Select loan tenure and verify identity',
      'Delivery order issued to dealership within 24 hours'
    ],
    faqs: [
      {
        q: 'Do you finance pre-owned certified vehicles?',
        a: 'Yes, we finance certified pre-owned vehicles up to 7 years of age.'
      }
    ],
    themeColor: '#0288D1'
  },
  {
    id: 'gold-loan',
    slug: 'gold-loan',
    title: 'FinEdge Sovereign Gold Loan',
    category: 'Loans',
    tagline: 'Access liquidity against gold jewellery in 20 minutes',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.goldLoanStartingRate} onwards`,
    maxAmount: 'Up to ₹50 Lakhs (75% LTV)',
    tenure: '3 to 24 Months',
    overview: 'Immediate liquidity backed by physical gold ornaments. Fast, transparent per-gram valuation and bullet repayment flexibility.',
    features: [
      'Disbursal in under 20 minutes with zero credit score requirements',
      'Highest per-gram valuation indexed dynamically to live bullion rates',
      'Triple-layered secure locker custody with 100% complimentary insurance',
      'Bullet repayment option: pay interest periodically and principal at maturity'
    ],
    keyBenefits: [
      { title: 'No Credit Score Barrier', desc: 'Approvals based solely on purity and weight of physical gold.' },
      { title: 'Bank Locker Safety', desc: 'Your gold remains safely locked in our secure vaults until release.' }
    ],
    eligibility: {
      entityType: 'Any resident Indian owning gold ornaments (18 to 24 Karats)',
      minimumAge: '18 years'
    },
    documents: [
      'Aadhaar Card and PAN Card',
      'Physical gold jewellery for in-branch appraisal'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '₹250 to ₹1,000 depending on loan ticket' },
      { item: 'Appraiser Valuation Fee', fee: '₹250 flat' }
    ],
    howToApply: [
      'Walk into nearest FinEdge branch with your gold jewellery',
      'Certified appraiser evaluates purity and weight in your presence',
      'Immediate cash or account transfer disbursal within 20 minutes'
    ],
    faqs: [
      {
        q: 'Is my gold safe with FinEdge?',
        a: 'Yes. All pledged gold is sealed in tamper-proof packets and stored in high-security vaults with 100% insurance coverage.'
      }
    ],
    themeColor: '#C59B27'
  },
  {
    id: 'lap-loan',
    slug: 'lap-loan',
    title: 'FinEdge Property Equity Loan',
    category: 'Loans',
    tagline: 'Leverage residential or commercial property for high-ticket capital',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.lapStartingRate} onwards`,
    maxAmount: 'Up to ₹25 Crores',
    tenure: 'Up to 15 Years',
    overview: 'High-ticket secured loan against clear residential or commercial real estate for business expansion or debt consolidation.',
    features: [
      'Substantially lower interest rates compared to unsecured business financing',
      'Loan-to-value (LTV) up to 70% of market property valuation',
      'Dual facility: Term loan for lump sum and overdraft for working capital',
      'Retain complete possession and productive usage of property during tenure'
    ],
    keyBenefits: [
      { title: 'Substantial Capital', desc: 'Access high funding limits up to ₹25 Crores against property.' },
      { title: 'Lower Interest', desc: 'Secure collateral gives you significantly cheaper interest rates.' }
    ],
    eligibility: {
      entityType: 'Salaried, Professional (Doctor/CA), or Self-Employed property owners',
      minimumAge: '25 to 65 years'
    },
    documents: [
      'Registered Property Conveyance Deed and Chain Deeds',
      'Municipal tax receipts and approved structural plans',
      'Financial statements / ITR for last 3 years'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: '0.75% to 1.0% of loan amount' }
    ],
    howToApply: [
      'Submit property ownership documents and income records',
      'Legal verification and technical valuation conducted',
      'Loan sanction issued and mortgage deed executed'
    ],
    faqs: [
      {
        q: 'Can commercial properties be mortgaged?',
        a: 'Yes, both residential and commercial properties with clear titles can be pledged.'
      }
    ],
    themeColor: '#4A4A6A'
  },
  {
    id: 'education-loan',
    slug: 'education-loan',
    title: 'FinEdge Global Scholar Education Loan',
    category: 'Loans',
    tagline: 'Fund top university aspirations in India and premier global institutions',
    interestRate: `${FINEDGE_RATES_CONFIG.loans.educationLoanStartingRate} onwards`,
    maxAmount: 'Up to ₹1.5 Crores',
    tenure: 'Course duration + 1 year moratorium + up to 15 years',
    overview: 'Comprehensive education financing covering tuition fees, accommodation, living expenses, and airfare for accredited domestic and international universities.',
    features: [
      'Covers 100% of university tuition fees, living expenses, laptop, and travel',
      'Collateral-free options available for 200+ premier global universities',
      'Moratorium period during entire study course plus 6 to 12 months buffer',
      'Tax deduction on interest paid under Section 80E of Income Tax Act'
    ],
    keyBenefits: [
      { title: 'Full Cost Coverage', desc: 'Covers living expenses, books, and international health insurance.' },
      { title: 'Moratorium Grace', desc: 'Begin repayments only after graduating and securing employment.' }
    ],
    eligibility: {
      entityType: 'Indian students securing admission to recognized university courses',
      coBorrower: 'Parent, spouse, or sibling required as co-applicant'
    },
    documents: [
      'University Admission Letter with detailed fee breakdown',
      'Academic marksheets and entrance test scores (GRE/GMAT/IELTS)',
      'Co-borrower KYC and income documents'
    ],
    feesAndCharges: [
      { item: 'Processing Fee', fee: 'Nil for domestic premier institutes; ₹10,000 for overseas' }
    ],
    howToApply: [
      'Submit university admission letter and course details',
      'Upload co-borrower income documents',
      'Disbursal directly to university foreign exchange remittance desk'
    ],
    faqs: [
      {
        q: 'Is there a tax benefit on education loan interest?',
        a: 'Yes, under Section 80E of the Income Tax Act, 100% of the interest paid is deductible without an upper limit for up to 8 years.'
      }
    ],
    themeColor: '#0A2540'
  }
];

export const CARDS_DATA = [
  {
    id: 'aurum-metal',
    slug: 'aurum-metal',
    title: 'FinEdge Aurum Metal Credit Card',
    category: 'Cards',
    type: 'credit',
    tier: 'Metal Luxury',
    tagline: 'Precision crafted stainless-steel metal card for discerning executives',
    annualFee: FINEDGE_RATES_CONFIG.cards.aurumMetal.annualFee,
    joiningFee: FINEDGE_RATES_CONFIG.cards.aurumMetal.joiningFee,
    rewards: FINEDGE_RATES_CONFIG.cards.aurumMetal.rewardsRate,
    apr: FINEDGE_RATES_CONFIG.cards.aurumMetal.apr,
    forexMarkup: FINEDGE_RATES_CONFIG.cards.aurumMetal.forexMarkup,
    overview: 'Hand-crafted from aerospace-grade stainless steel. Engineered for global travelers and senior executives requiring zero forex markup, dedicated concierge services, and elevated lounge privileges.',
    features: [
      'Zero forex markup on all overseas transactions and international e-commerce',
      'Unlimited domestic airport lounge access + 4 complimentary international visits per year',
      'Low interest APR starting at 1.99% per month (23.88% annualized)',
      'Complimentary golf games and masterclasses across premier greens in India'
    ],
    keyBenefits: [
      { title: '0% Forex Markup', desc: 'Save 3.5% on every foreign currency transaction and international travel.' },
      { title: 'Lounge Privileges', desc: 'Unlimited domestic lounge visits for primary cardholder.' },
      { title: 'Concierge Desk', desc: '24/7 dedicated lifestyle assistance for dining and travel.' }
    ],
    eligibility: {
      entityType: 'Resident Indian individuals',
      minimumAge: '23 to 60 years',
      minimumAnnualIncome: '₹18,00,000 net annual income or existing relationship balance',
      cibilRequired: 'CIBIL score 750+'
    },
    documents: [
      'PAN Card and Aadhaar Card',
      'Latest 3 months salary slips or ITR with computation of income',
      'Last 6 months bank statements'
    ],
    feesAndCharges: [
      { item: 'Joining Fee', fee: '₹2,999 (Offset with welcome reward points)' },
      { item: 'Annual Renewal Fee', fee: '₹2,999 (Waived on annual spends exceeding ₹3,00,000)' },
      { item: 'Finance Charges', fee: '1.99% per month (23.88% p.a.)' },
      { item: 'Cash Advance Fee', fee: '2.5% or ₹500, whichever is higher' }
    ],
    howToApply: [
      'Verify mobile number and personal PAN',
      'Confirm pre-approved credit limit or upload income proofs',
      'Complete video verification and card delivery tracking'
    ],
    faqs: [
      {
        q: 'How does the annual fee waiver work?',
        a: 'The annual renewal fee of ₹2,999 is automatically waived if you spend ₹3,00,000 or more in the preceding anniversary year.'
      }
    ],
    cardImage: 'metal-dark',
    themeColor: '#1C1B1F'
  },
  {
    id: 'regal-metal',
    slug: 'regal-metal',
    title: 'FinEdge Regal Metal Credit Card',
    category: 'Cards',
    type: 'credit',
    tier: 'Ultra Premium Metal',
    tagline: 'The pinnacle of bespoke hospitality, travel, and concierge luxury',
    annualFee: FINEDGE_RATES_CONFIG.cards.regalMetal.annualFee,
    joiningFee: FINEDGE_RATES_CONFIG.cards.regalMetal.joiningFee,
    rewards: FINEDGE_RATES_CONFIG.cards.regalMetal.rewardsRate,
    apr: FINEDGE_RATES_CONFIG.cards.regalMetal.apr,
    forexMarkup: FINEDGE_RATES_CONFIG.cards.regalMetal.forexMarkup,
    overview: 'Our flagship ultra-premium credit card finished with bespoke matte-gold plating. Features unrestricted worldwide lounge access with guest passes, zero currency conversion markup, and premier travel insurance.',
    features: [
      'Unlimited complimentary domestic and international lounge access with guest passes',
      'Zero forex markup globally with 24/7 dedicated global lifestyle concierge',
      'Complimentary luxury dining vouchers and cinema privileges (Buy 1 Get 1 free)',
      'Comprehensive ₹2 Crore worldwide travel insurance and emergency medical evacuation'
    ],
    keyBenefits: [
      { title: 'Global Lounge & Guest Pass', desc: 'Access 1,200+ airport lounges worldwide with companion privileges.' },
      { title: '1:1 Airline Miles', desc: 'Transfer points 1:1 to leading international airline loyalty programs.' },
      { title: 'Dining Collection', desc: 'Up to 25% discount across 4,000+ luxury dining partner venues.' }
    ],
    eligibility: {
      entityType: 'Resident Indian individuals',
      minimumAge: '25 to 65 years',
      minimumAnnualIncome: '₹36,00,000 net annual income or equivalent wealth relationship',
      cibilRequired: 'CIBIL score 780+'
    },
    documents: [
      'PAN Card and Aadhaar Card',
      'Latest 2 years audited ITR or salary records',
      'Proof of current residence'
    ],
    feesAndCharges: [
      { item: 'Joining Fee', fee: '₹5,999 (Offset with luxury welcome gift voucher)' },
      { item: 'Annual Renewal Fee', fee: '₹5,999 (Waived on annual spends exceeding ₹6,00,000)' },
      { item: 'Finance Charges', fee: '1.75% per month (21.00% p.a.)' }
    ],
    howToApply: [
      'Bespoke invitation or online application for high-net-worth applicants',
      'Relationship manager assigned for priority document verification',
      'Hand-delivered in luxury presentation box within 48 hours'
    ],
    faqs: [
      {
        q: 'Do reward points have an expiration date on Regal Metal?',
        a: 'No. Reward points earned on FinEdge Regal Metal Credit Cards never expire and can be accumulated indefinitely.'
      }
    ],
    cardImage: 'metal-gold',
    themeColor: '#C59B27'
  },
  {
    id: 'nova-rewards',
    slug: 'nova-rewards',
    title: 'FinEdge Nova Rewards Credit Card',
    category: 'Cards',
    type: 'credit',
    tier: 'Lifetime Free',
    tagline: 'Modern rewards credit card with accelerated points on online shopping',
    annualFee: FINEDGE_RATES_CONFIG.cards.novaRewards.annualFee,
    joiningFee: 'Zero',
    rewards: FINEDGE_RATES_CONFIG.cards.novaRewards.rewardsRate,
    apr: FINEDGE_RATES_CONFIG.cards.novaRewards.apr,
    forexMarkup: FINEDGE_RATES_CONFIG.cards.novaRewards.forexMarkup,
    overview: 'Engineered for online shoppers and young professionals. Offers zero joining fee, zero annual renewal fee, and accelerated reward points on popular e-commerce, food delivery, and travel apps.',
    features: [
      'Lifetime Free card with zero joining fee and zero annual renewal fee forever',
      '6X reward points on all online purchases, 3X on POS transactions',
      '10X reward points on incremental spends exceeding ₹25,000 in a billing cycle',
      '25% discount on movie tickets up to ₹100 once every calendar month'
    ],
    keyBenefits: [
      { title: 'Lifetime Free', desc: 'No annual fees or minimum spending clauses ever.' },
      { title: 'Accelerated Rewards', desc: '6X points on top shopping, grocery, and ride-hailing apps.' },
      { title: 'Movie Perks', desc: 'Monthly discounts on leading cinema booking portals.' }
    ],
    eligibility: {
      entityType: 'Resident Indian individuals',
      minimumAge: '21 to 55 years',
      minimumAnnualIncome: '₹3,60,000 net annual salary',
      cibilRequired: 'CIBIL score 710+'
    },
    documents: [
      'PAN Card and Aadhaar Card',
      'Last 2 months salary slips or bank statements'
    ],
    feesAndCharges: [
      { item: 'Joining Fee', fee: 'Zero' },
      { item: 'Annual Renewal Fee', fee: 'Zero' },
      { item: 'Finance Charges', fee: '2.95% per month (35.40% p.a.)' }
    ],
    howToApply: [
      'Instant online application with PAN verification',
      'Aadhaar OTP verification',
      'Virtual card generated immediately for instant online spending'
    ],
    faqs: [
      {
        q: 'Is this card genuinely free for life?',
        a: 'Yes. FinEdge Nova Rewards Credit Card carries zero joining fee and zero annual maintenance fee unconditionally.'
      }
    ],
    cardImage: 'classic-red',
    themeColor: '#0A2540'
  },
  {
    id: 'secure-build',
    slug: 'secure-build',
    title: 'FinEdge Secure Build Credit Card',
    category: 'Cards',
    type: 'credit',
    tier: 'Guaranteed Approval',
    tagline: 'Guaranteed credit card backed by Fixed Deposit to build and boost credit score',
    annualFee: FINEDGE_RATES_CONFIG.cards.secureBuild.annualFee,
    joiningFee: 'Zero',
    rewards: FINEDGE_RATES_CONFIG.cards.secureBuild.rewardsRate,
    apr: FINEDGE_RATES_CONFIG.cards.secureBuild.apr,
    forexMarkup: FINEDGE_RATES_CONFIG.cards.secureBuild.forexMarkup,
    overview: 'An inclusive credit card backed 100% by a FinEdge Fixed Deposit. Requires zero salary slips or prior credit history, allowing students, homemakers, and credit builders to earn FD returns while building a solid CIBIL score.',
    features: [
      '100% guaranteed approval with zero income proof or prior credit score check',
      `Credit limit assigned up to 90% of your deposit while your FD earns up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak}`,
      'Low forex markup of just 0.99% for cost-effective overseas e-commerce',
      'Automated monthly bureau reporting to rapidly establish and boost your credit profile'
    ],
    keyBenefits: [
      { title: 'Guaranteed Approval', desc: 'No income documents, salary slips, or credit history required.' },
      { title: 'Dual Benefit', desc: `Earn up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak} interest on your FD while enjoying card credit privileges.` },
      { title: 'Credit Score Builder', desc: 'Fast-track your CIBIL profile with disciplined monthly repayments.' }
    ],
    eligibility: {
      entityType: 'Any resident Indian with a FinEdge Fixed Deposit',
      minimumAge: '18 years and above',
      depositRequirement: 'Minimum Fixed Deposit of ₹10,000',
      cibilRequired: 'No minimum score required'
    },
    documents: [
      'Aadhaar Card and PAN Card',
      'Active FinEdge Fixed Deposit receipt (opened digitally during application)'
    ],
    feesAndCharges: [
      { item: 'Joining Fee', fee: 'Zero' },
      { item: 'Annual Fee', fee: 'Zero' },
      { item: 'Finance Charges', fee: '1.50% per month (18.00% p.a.)' }
    ],
    howToApply: [
      'Select deposit amount starting at ₹10,000',
      'Fund the Fixed Deposit online via UPI or NetBanking',
      'Card issued instantly with credit limit matching 90% of deposit'
    ],
    faqs: [
      {
        q: 'Does my Fixed Deposit continue to earn interest?',
        a: `Yes. Your underlying Fixed Deposit earns full interest up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak} compounding quarterly while acting as security.`
      }
    ],
    cardImage: 'wow-blue',
    themeColor: '#0288D1'
  },
  {
    id: 'platinum-debit',
    slug: 'platinum-debit',
    title: 'FinEdge Platinum Debit Card',
    category: 'Cards',
    type: 'debit',
    tier: 'Everyday Banking',
    tagline: 'Contactless chip debit card bundled with Prime Savings accounts',
    annualFee: FINEDGE_RATES_CONFIG.cards.platinumDebit.annualFee,
    joiningFee: 'Complimentary',
    rewards: 'Cashback points on fuel, utility bills, and merchant point-of-sale spends',
    apr: 'N/A (Debit Card)',
    forexMarkup: '2.50%',
    overview: 'High-limit everyday debit card provided with FinEdge Prime Savings. Offers advanced biometric in-app security controls, domestic airport lounge visits, and comprehensive personal accident insurance.',
    features: [
      `Daily ATM cash withdrawal limit of ${FINEDGE_RATES_CONFIG.cards.platinumDebit.dailyAtmLimit} and POS limit of ${FINEDGE_RATES_CONFIG.cards.platinumDebit.dailyPosLimit}`,
      'Complimentary domestic airport lounge access once per calendar quarter',
      'Comprehensive ₹50 Lakhs personal accident and air travel insurance cover',
      'Instant card controls to toggle ATM, POS, and online transactions in real time'
    ],
    keyBenefits: [
      { title: 'High Limits', desc: 'Comfortable daily ATM and point-of-sale purchasing limits.' },
      { title: 'Airport Lounge', desc: '1 complimentary domestic airport lounge visit every quarter.' },
      { title: 'Insurance Cover', desc: 'Complimentary ₹50 Lakhs personal accident insurance.' }
    ],
    eligibility: {
      entityType: 'All FinEdge Prime Savings and Executive Salary account holders',
      minimumAge: '18 years'
    },
    documents: [
      'Included automatically with FinEdge account opening'
    ],
    feesAndCharges: [
      { item: 'Annual Maintenance Fee', fee: 'Complimentary with Prime Savings; ₹250 p.a. otherwise' },
      { item: 'Card Replacement Fee', fee: '₹200 for physical card re-issuance' }
    ],
    howToApply: [
      'Dispatched automatically upon opening a FinEdge Prime Savings Account',
      'Virtual card available immediately inside the customer portal'
    ],
    faqs: [
      {
        q: 'Can I control card limits from the app?',
        a: 'Yes. You can freeze the card, set custom daily limits, and toggle international or online transactions instantly from the customer portal.'
      }
    ],
    cardImage: 'debit-slate',
    themeColor: '#25243B'
  }
];

export const INVESTMENTS_DATA = [
  {
    id: 'fixed-deposit',
    slug: 'fixed-deposit',
    title: 'FinEdge Guaranteed Fixed Deposit',
    category: 'Investments',
    investmentType: 'guaranteed',
    tagline: 'Guaranteed capital safety with attractive quarterly compounded returns',
    rate: `Up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak} (${FINEDGE_RATES_CONFIG.fixedDeposits.seniorPeak} for Seniors)`,
    tenure: '7 Days to 10 Years',
    overview: 'Secure term deposit offering guaranteed capital growth. Interest compounded quarterly with options for monthly, quarterly, or cumulative payouts.',
    features: [
      `Competitive rates up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak} (${FINEDGE_RATES_CONFIG.fixedDeposits.seniorPeak} for senior citizens)`,
      'Zero penalty on premature withdrawal after 6 months for added peace of mind',
      'Quarterly compounding interest ensures optimum returns on your capital',
      `Insured up to ${FINEDGE_RATES_CONFIG.brand.dicgcInsurance}`
    ],
    keyBenefits: [
      { title: 'Guaranteed Returns', desc: 'Returns are locked at booking and unaffected by market fluctuations.' },
      { title: 'DICGC Insured', desc: FINEDGE_RATES_CONFIG.brand.dicgcInsurance },
      { title: 'Overdraft Liquidity', desc: 'Instant credit line up to 90% of deposit value without breaking your FD.' }
    ],
    tenureGrid: FINEDGE_RATES_CONFIG.fixedDeposits.tenureGrid,
    eligibility: {
      entityType: 'Resident Indian individuals, HUFs, NRIs, and corporate entities',
      minimumAge: '18 years (or minors through guardians)',
      minimumDeposit: '₹10,000 minimum booking amount'
    },
    documents: [
      'Aadhaar Card and PAN Card (Instant verification for existing customers)'
    ],
    feesAndCharges: [
      { item: 'Booking Charges', fee: 'Nil' },
      { item: 'Premature Closure', fee: '0.50% interest delta if closed prior to 6 months; zero penalty thereafter' }
    ],
    howToApply: [
      'Select deposit tenure and payout frequency (Cumulative or Periodic)',
      'Enter deposit amount starting at ₹10,000',
      'Confirm nominee details and book deposit instantly'
    ],
    faqs: [
      {
        q: 'Are deposits with FinEdge insured?',
        a: `Yes. All deposits are insured under the Deposit Insurance and Credit Guarantee Corporation (DICGC), a subsidiary of the RBI, up to ${FINEDGE_RATES_CONFIG.brand.dicgcInsurance}.`
      },
      {
        q: 'What is the additional rate for senior citizens?',
        a: `Senior citizens (aged 60 and above) receive an additional interest rate of ${FINEDGE_RATES_CONFIG.fixedDeposits.seniorDelta} across all tenures, reaching up to ${FINEDGE_RATES_CONFIG.fixedDeposits.seniorPeak}.`
      }
    ],
    themeColor: '#0A2540'
  },
  {
    id: 'recurring-deposit',
    slug: 'recurring-deposit',
    title: 'FinEdge Smart Recurring Deposit',
    category: 'Investments',
    investmentType: 'guaranteed',
    tagline: 'Systematically save monthly installments to build disciplined wealth',
    rate: `Up to ${FINEDGE_RATES_CONFIG.recurringDeposits.regularPeak} (${FINEDGE_RATES_CONFIG.recurringDeposits.seniorPeak} for Seniors)`,
    tenure: '6 Months to 10 Years',
    overview: 'Systematic monthly savings plan allowing you to invest small recurring amounts at the same competitive rates as full fixed deposits.',
    features: [
      `Start systematic savings with modest installments starting at ₹${FINEDGE_RATES_CONFIG.recurringDeposits.minimumMonthlyInstallment}/month`,
      'Same competitive interest rate as full fixed deposits locked for the entire term',
      'Automated standing instruction debit directly from your savings account',
      `Insured up to ${FINEDGE_RATES_CONFIG.brand.dicgcInsurance}`
    ],
    keyBenefits: [
      { title: 'Small Regular Contributions', desc: 'Build significant wealth through disciplined monthly habits.' },
      { title: 'Compounding Power', desc: 'Quarterly compounding boosts your long-term corpus.' }
    ],
    eligibility: {
      entityType: 'Resident Indian individuals and minors through guardians',
      minimumMonthlyInstallment: `₹${FINEDGE_RATES_CONFIG.recurringDeposits.minimumMonthlyInstallment}`
    },
    documents: [
      'Aadhaar and PAN (Instant booking for existing savings account holders)'
    ],
    feesAndCharges: [
      { item: 'Account Opening', fee: 'Nil' }
    ],
    howToApply: [
      'Choose monthly savings amount and tenure',
      'Set automated debit date from your savings account',
      'Recurring deposit activates instantly'
    ],
    faqs: [
      {
        q: 'What happens if I miss a monthly installment?',
        a: 'A nominal grace period of 5 days is provided. Missed installments can be paid up in the subsequent month with minimal interest adjustment.'
      }
    ],
    themeColor: '#25243B'
  },
  {
    id: 'sip',
    slug: 'direct-sip',
    title: 'FinEdge Direct SIP & Wealth',
    category: 'Investments',
    investmentType: 'market-linked',
    tagline: 'Harness the growth of Indian equity & debt markets through direct zero-commission mutual funds',
    rate: 'Historical 12% - 15% CAGR (Market Linked · Returns Not Guaranteed)',
    tenure: 'Flexible (Open-ended)',
    overview: 'Direct mutual fund investment platform offering zero distributor commissions, automated rupee-cost averaging, and customized goal-based portfolios. Mutual fund investments are subject to market risks; read all scheme related documents carefully.',
    features: [
      'Zero transaction fees and zero distributor commissions on 100% direct mutual fund schemes',
      'Curated risk portfolios: Conservative Debt, Balanced Hybrid, and Aggressive Growth',
      'Automated rupee-cost averaging buffers against market volatility',
      'One-click pause, step-up increment, or full redemption without lock-in periods'
    ],
    keyBenefits: [
      { title: 'Direct Zero Commission', desc: 'Earn up to 1.5% higher annual returns by investing in direct plans.' },
      { title: 'Rupee Cost Averaging', desc: 'Mitigate equity volatility with automated regular investments.' }
    ],
    regulatoryDisclaimer: 'Mutual Fund investments are subject to market risks, read all scheme related documents carefully. Past performance does not guarantee future returns. Mutual funds are not bank deposits and are not insured by DICGC.',
    eligibility: {
      entityType: 'KYC-compliant Indian residents and NRIs',
      minimumAge: '18 years',
      minimumSipAmount: '₹500 per month'
    },
    documents: [
      'PAN Card (Mandatory for mutual fund investment)',
      'Verified Bank Account for NACH mandate'
    ],
    feesAndCharges: [
      { item: 'Platform Fee', fee: 'Zero' },
      { item: 'Transaction Charges', fee: 'Zero on direct plans' }
    ],
    howToApply: [
      'Complete risk profiling questionnaire',
      'Select curated scheme or fund category',
      'Set SIP date and authorize one-time bank mandate'
    ],
    faqs: [
      {
        q: 'Are mutual funds insured by DICGC?',
        a: 'No. Mutual funds are market-linked securities and are not bank deposits. They are not covered by DICGC deposit insurance.'
      }
    ],
    themeColor: '#0288D1'
  },
  {
    id: 'ssy',
    slug: 'samriddhi-sovereign',
    title: 'FinEdge Samriddhi Sovereign Deposit',
    category: 'Investments',
    investmentType: 'guaranteed',
    tagline: 'Government-backed welfare scheme for the girl child with triple tax benefits',
    rate: '8.20% p.a. (Govt Guaranteed Sovereign Rate)',
    tenure: '21 Years or until marriage after 18',
    overview: 'Special small savings welfare scheme engineered to build an educational and marriage fund for girl children. Offers sovereign safety and triple tax exemption (EEE).',
    features: [
      'Highest sovereign interest rate among small savings schemes in India',
      'Triple Tax Exemption (EEE): Investment, interest earned, and maturity are 100% tax-free',
      'Annual deposit flexibility ranging from minimum ₹250 up to ₹1,50,000 per financial year',
      'Partial withdrawal up to 50% permitted after age 18 for accredited higher education'
    ],
    keyBenefits: [
      { title: 'Triple Tax Free (EEE)', desc: 'Exempt at investment, exempt on accrual, and exempt on withdrawal.' },
      { title: 'Sovereign Guarantee', desc: '100% backed by Government of India sovereign guarantee.' }
    ],
    eligibility: {
      entityType: 'Girl child resident Indian from birth up to 10 years of age',
      guardianRequirement: 'Account opened and operated by natural or legal guardian'
    },
    documents: [
      'Birth Certificate of girl child',
      'Guardian PAN Card and Aadhaar Card',
      'Photograph of guardian and child'
    ],
    feesAndCharges: [
      { item: 'Account Opening Fee', fee: 'Zero' },
      { item: 'Minimum Annual Deposit', fee: '₹250 per financial year' }
    ],
    howToApply: [
      'Submit child birth certificate and guardian KYC online or at any branch',
      'Initial deposit of ₹250 or higher',
      'Passbook issued with standing instruction configuration'
    ],
    faqs: [
      {
        q: 'Can more than two accounts be opened by a family?',
        a: 'Generally up to two accounts can be opened per family for two girl children, with exceptions for twins/triplets.'
      }
    ],
    themeColor: '#2E7D32'
  }
];

export const FAQS_DATA = [
  {
    q: 'How does monthly interest crediting work on FinEdge Prime Savings?',
    a: `Unlike traditional banks that credit savings interest quarterly, FinEdge calculates interest daily on your end-of-day ledger balance and credits it directly to your account on the ${FINEDGE_RATES_CONFIG.savings.creditCycle}. This ensures compounding on a monthly basis.`
  },
  {
    q: 'What is the Smart-Sweep facility on FinEdge Current Accounts?',
    a: `Smart-Sweep automatically transfers idle operational balances above a threshold into short-term deposits earning up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak}. When business payments or cheques are presented exceeding your balance, funds sweep back seamlessly with zero penalty.`
  },
  {
    q: 'Can I apply for a credit card without prior credit history?',
    a: `Yes. Our FinEdge Secure Build Credit Card is backed 100% by a Fixed Deposit. By placing a deposit starting at ₹10,000, you are instantly issued a credit card with up to 90% credit limit while your deposit continues earning up to ${FINEDGE_RATES_CONFIG.fixedDeposits.regularPeak}.`
  },
  {
    q: 'What are the prepayment charges on retail loans?',
    a: 'As per Reserve Bank of India (RBI) mandates, all floating-rate retail Home Loans and Personal Loans extended to individuals carry zero prepayment, part-payment, or foreclosure penalties.'
  },
  {
    q: 'Are deposits with FinEdge insured?',
    a: `Yes. All retail deposits (Savings, Current, Recurring, and Fixed Deposits) are insured under the Deposit Insurance and Credit Guarantee Corporation (DICGC), a subsidiary of the Reserve Bank of India, up to ${FINEDGE_RATES_CONFIG.brand.dicgcInsurance}.`
  }
];

export const MOCK_TRANSACTIONS = [
  { id: 'TXN-90812', date: '2026-10-01', description: 'Monthly Interest Credited (Compounded)', type: 'credit', amount: 894.20, category: 'Interest' },
  { id: 'TXN-90811', date: '2026-09-30', description: 'Salary Inward - Apex Infotech India Ltd', type: 'credit', amount: 125000.00, category: 'Salary' },
  { id: 'TXN-90810', date: '2026-09-28', description: 'Electricity Bill Payment - Tata Power', type: 'debit', amount: 2450.00, category: 'Utilities' },
  { id: 'TXN-90809', date: '2026-09-25', description: 'Grocery Purchase - SmartBazaar BKC', type: 'debit', amount: 3820.50, category: 'Shopping' },
  { id: 'TXN-90808', date: '2026-09-22', description: 'UPI Transfer to Ananya Iyer (Lunch split)', type: 'debit', amount: 1200.00, category: 'Transfers' },
  { id: 'TXN-90807', date: '2026-09-15', description: 'SIP Mutual Fund Auto-Debit - Bluechip Equity', type: 'debit', amount: 5000.00, category: 'Investments' },
  { id: 'TXN-90806', date: '2026-09-01', description: 'Monthly Interest Credited', type: 'credit', amount: 862.10, category: 'Interest' }
];
