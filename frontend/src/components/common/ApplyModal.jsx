import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge } from '../ui.jsx';
import { CheckCircle2, X, AlertCircle, Info, CreditCard, Landmark, Check, TrendingUp, Sprout, ScrollText, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { shortProductName, formatINRWhole, formatINR } from '../../lib/format.js';
import { calculateEMI, calculateBulletRepayment, calculateFD, calculateRD, calculateSIP, calculateSSY } from '../../lib/finance.js';
import { getProductBySlug, getProductsByCategory, FD, RD, SIP, SSY } from '../../data/products.js';
import { InvestmentFormFields } from './InvestmentFormFields.jsx';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh'
];

const LOAN_PURPOSES = {
  'home-loan': [
    'Purchase of ready-to-move property',
    'Under-construction residential unit',
    'Self-construction on own plot',
    'Home improvement or major renovation',
    'Balance transfer of existing home loan'
  ],
  'vehicle-loan': [
    'New personal 4-wheeler purchase',
    'Pre-owned / certified used car purchase',
    'Two-wheeler purchase (scooter/motorcycle)',
    'Commercial light vehicle purchase'
  ],
  'education-loan': [
    'Undergraduate degree program',
    'Postgraduate / Master degree program',
    'Professional diploma / certification',
    'Doctoral / Research fellowship program',
    'Overseas university education'
  ],
  'business-loan': [
    'Working capital and operating expenses',
    'Raw material and inventory bulk purchase',
    'Machinery, tools, and plant equipment',
    'Retail outlet or office branch expansion',
    'Receivables financing & gap funding'
  ],
  'agriculture-loan': [
    'Kharif / Rabi seasonal crop cultivation',
    'Farm mechanization & tractor purchase',
    'Drip irrigation & borewell installation',
    'Dairy, livestock & cattle farming',
    'Horticulture, poultry & allied agro-projects'
  ],
  'gold-loan': [
    'Immediate personal liquidity need',
    'Agricultural working capital',
    'Small business funding requirement',
    'Emergency medical expenses',
    'Education fee payment'
  ],
  'loan-against-property': [
    'Business expansion and capital infusion',
    'Debt consolidation & high-cost loan closure',
    'Higher education for family members',
    'Major medical treatments and procedures',
    'Lawful personal financial requirement'
  ]
};

function maskAadhaar(str) {
  if (!str) return 'XXXX-XXXX-••••';
  const clean = str.replace(/\D/g, '');
  const last4 = clean.slice(-4) || '••••';
  return `XXXX-XXXX-${last4}`;
}

function calculateAge(dobString) {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const ApplyModal = ({ isOpen, open, onClose, product: initialProduct, initialAmount, initialTenure, initialCategory }) => {
  const isModalOpen = open ?? isOpen;
  const { submitApplication, user, accounts = [] } = useAuth();
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Active product can be switched (e.g. debit card path b transitions to account product)
  const [activeProduct, setActiveProduct] = useState(initialProduct);
  const [cardRequestedNote, setCardRequestedNote] = useState('');

  useEffect(() => {
    setActiveProduct(initialProduct);
    setCardRequestedNote('');
  }, [initialProduct, isModalOpen]);

  const product = activeProduct || initialProduct;
  const slug = product?.slug || '';
  const category = product?.category || 'account';

  // Category Flags
  const isCard = category === 'card';
  const isLoan = category === 'loan';
  const isInvestment = category === 'investment';
  const isAccount = !isCard && !isLoan && !isInvestment;

  const isCreditCard = isCard && product?.cardType === 'credit';
  const isDebitCard = isCard && product?.cardType === 'debit';
  const isAssured = isCard && slug === 'edge-assured-credit';
  const isStandardCredit = isCreditCard && !isAssured;

  // Investment specific product kinds (Fix 0)
  const isFD = isInvestment && (product?.kind === 'FD' || slug === 'fixed-deposit');
  const isRD = isInvestment && (product?.kind === 'RD' || slug === 'recurring-deposit');
  const isSIP = isInvestment && (product?.kind === 'SIP' || slug === 'systematic-investment-plan');
  const isSSY = isInvestment && (product?.kind === 'SSY' || slug === 'sukanya-samriddhi');

  // Account specific product types
  const isMinor = isAccount && slug === 'sprout-minor';
  const isCurrent = isAccount && slug === 'trade-current';
  const isSalary = isAccount && slug === 'payroll-salary';
  const isStudent = isAccount && slug === 'campus-student';
  const isSavings = isAccount && slug === 'everyday-savings';

  // Loan specific product types
  const isHomeLoan = isLoan && slug === 'home-loan';
  const isBusinessLoan = isLoan && slug === 'business-loan';
  const isAgriLoan = isLoan && slug === 'agriculture-loan';
  const isVehicleLoan = isLoan && slug === 'vehicle-loan';
  const isGoldLoan = isLoan && slug === 'gold-loan';
  const isLapLoan = isLoan && slug === 'loan-against-property';
  const isEducationLoan = isLoan && slug === 'education-loan';

  // Fix 0: Clean initial state — empty for logged out; only name/email/mobile for logged in
  const getInitialFormData = () => ({
    // Personal details (Module 06 Fix 1: clean open)
    fullName: user?.fullName || user?.name || '',
    dob: '',
    gender: '',
    mobile: user?.mobileNumber || user?.phone || '',
    email: user?.email || '',

    // Student & Minor specifics (Accounts)
    guardianRelationship: '',
    childName: '',
    childDob: '',
    college: '',
    courseYear: '',
    studentGuardianName: '',
    studentGuardianDob: '',
    studentGuardianMobile: '',
    studentGuardianRelationship: '',

    // Business details (Trade Current Account)
    businessName: '',
    constitution: '',
    businessPan: '',
    annualTurnover: '',
    gstin: '',
    requestOverdraft: false,

    // Address & KYC
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    panNumber: '',
    aadhaarNumber: '',

    // Employment & Income (Credit Cards / Accounts / Loans)
    employmentType: isAgriLoan ? 'Agriculturist' : '',
    employerName: '',
    monthlyIncome: '',
    annualIncome: '',
    annualIncomeBracket: '',
    employmentVintage: '',
    existingEmi: '0',

    // Card preferences (Credit cards)
    nameOnCard: user?.fullName || user?.name || '',
    requestedLimit: '',

    // Security deposit (Edge Assured)
    fdChoice: 'new', // 'new' | 'existing'
    depositAmount: '',
    existingFdId: '',

    // Debit card linking (Debit cards)
    debitLinkType: 'account', // 'account' | 'new'
    linkedAccountId: accounts[0]?.accountId || '',
    linkedAccountNumber: '',
    newAccountProductId: 'everyday-savings',

    // Nominee (Accounts only - excluded for Cards and Loans)
    nomineeName: '',
    nomineeRelationship: '',
    nomineeDob: '',

    // Account preferences
    initialFunding: '',
    requestDebitCard: isSavings,

    // Loan Core (Loans only)
    loanAmount: initialAmount ? String(initialAmount) : (isHomeLoan ? '5000000' : isVehicleLoan ? '800000' : isGoldLoan ? '200000' : isLapLoan ? '3000000' : isBusinessLoan ? '1500000' : isEducationLoan ? '1000000' : isAgriLoan ? '200000' : ''),
    tenureMonths: initialTenure ? String(initialTenure) : (product?.tenureMinMonths ? String(product.tenureMinMonths) : '60'),
    loanPurpose: LOAN_PURPOSES[slug]?.[0] || 'General Purpose',
    loanDisbursalType: (user && accounts.length > 0) ? 'account' : 'entry',
    loanDisbursalAccountId: accounts[0]?.accountId || '',
    loanDisbursalAccountNumber: '',
    noFinEdgeAccountYet: false,

    // Per-Loan: Home Loan
    homePropertyStatus: 'Ready to move',
    homePropertyCity: '',
    homePropertyAddress: '',
    homePropertyValue: '',
    homeHasCoApplicant: false,
    homeCoApplicantName: '',
    homeCoApplicantRelationship: 'Spouse',
    homeCoApplicantIncome: '',

    // Per-Loan: Vehicle Loan
    vehicleType: 'New Car',
    vehicleMakeModel: '',
    vehicleOnRoadPrice: '',
    vehicleDownPayment: '',
    vehicleDealerName: '',

    // Per-Loan: Education Loan
    eduApplicantRole: 'Student',
    eduStudentName: '',
    eduStudentRelationship: 'Self',
    eduCourseName: '',
    eduInstitute: '',
    eduAdmissionStatus: 'Confirmed',
    eduCourseFee: '',
    eduCoApplicantName: '',
    eduCoApplicantRelationship: 'Father',
    eduCoApplicantIncome: '',
    eduCollateralType: 'Residential / Commercial Property',
    eduCollateralValue: '',

    // Per-Loan: Business Growth Loan
    bizBusinessName: '',
    bizConstitution: 'Sole Proprietorship',
    bizApplicantRole: 'Proprietor',
    bizGstin: '',
    bizYearsInBusiness: '',
    bizAnnualTurnover: '',
    bizAddress: '',

    // Per-Loan: Krishi Agriculture Loan
    agriLandArea: '',
    agriSurveyKhata: '',
    agriVillageTaluk: '',
    agriCropType: '',
    agriSeason: 'Kharif',
    agriIrrigation: 'Canal Irrigation',

    // Per-Loan: Gold Loan
    goldRepaymentMode: 'bullet', // 'bullet' | 'emi'
    goldWeight: '',
    goldPurity: '22K (91.6% purity)',
    goldType: 'Gold Jewellery / Ornaments',

    // Per-Loan: Loan Against Property (LAP)
    lapPropertyType: 'Residential (Self-occupied)',
    lapPropertyAddress: '',
    lapPropertyValue: '',
    lapOwnership: 'Sole Ownership',
    lapHasExistingLoan: 'No',
    lapExistingLender: '',
    lapExistingBalance: '',
    // Investment Core (Fix 1 - Fix 6)
    fundingAccountType: (user && accounts.length > 0) ? 'existing' : 'entry',
    fundingAccountId: accounts[0]?.accountId || '',
    fundingAccountNumber: '',
    noFinEdgeAccountYet: false,

    // Fixed Deposit (FD)
    fdDepositAmount: initialAmount ? String(initialAmount) : '',
    fdTenureBand: (isFD && initialTenure) ? initialTenure : '2 – 3 years',
    fdPayoutOption: 'Cumulative (paid at maturity)',
    fdAutoRenew: false,
    fdConsentTerms: false,

    // Recurring Deposit (RD)
    rdMonthlyAmount: initialAmount ? String(initialAmount) : '',
    rdTenureBand: (isRD && initialTenure) ? initialTenure : '25 – 60 months',
    rdDebitDate: '5',
    rdConsentStandingInstruction: false,
    rdConsentTerms: false,

    // SIP
    sipFundCategory: initialCategory || 'Large-cap equity',
    sipMonthlyAmount: initialAmount ? String(initialAmount) : '',
    sipDate: '5',
    sipDurationYears: (isSIP && initialTenure) ? String(initialTenure) : '10',
    sipStepUp: 'None',
    sipDeclRisk: false,
    sipDeclKycPan: false,
    sipConsentMandate: false,
    sipDeclFatca: false,

    // SSY
    ssyGuardianName: user?.fullName || user?.name || '',
    ssyGuardianRelationship: 'Father',
    ssyGuardianDob: '',
    ssyChildName: '',
    ssyChildDob: '',
    ssyAnnualDeposit: initialAmount ? String(initialAmount) : '',
    ssyDeclSingleAccount: false,
    ssyDeclMaxTwo: false,
    ssyDeclDuration: false,

    // Consents & Declarations
    declTaxResident: false,
    declNotPep: false,
    consentKycTerms: false,
    consentCicBureau: false,
    consentCardTerms: false,
    consentFdLien: false,
    consentDebitTerms: false,
    consentMitc: false,
    consentNach: false,
    optInMarketing: false,
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);

  // Focus management and Esc key handling
  useEffect(() => {
    if (!isModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);

    setTimeout(() => {
      if (firstInputRef.current) firstInputRef.current.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isModalOpen]);

  // Reset form when modal opens or product changes
  useEffect(() => {
    if (isModalOpen) {
      setSubmittedApp(null);
      setErrors({});
      setFormData(getInitialFormData());
    }
  }, [isModalOpen, product?.slug]);

  if (!isModalOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Keep Name on Card in sync with Full Name if not manually diverged
      if (field === 'fullName' && (!prev.nameOnCard || prev.nameOnCard === prev.fullName)) {
        next.nameOnCard = value.slice(0, 21);
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Derived applicant age calculation
  const applicantAge = formData.dob ? calculateAge(formData.dob) : null;
  const isStudentMinor = isStudent && applicantAge !== null && applicantAge >= 16 && applicantAge < 18;

  // Live computed credit limit for Edge Assured (85% of deposit)
  const assuredLimitPct = 85;
  const computedAssuredLimit = Math.floor((Number(formData.depositAmount) || 0) * (assuredLimitPct / 100));

  // Live computed Indicative EMI for loans
  const loanRate = product?.rateMin || 8.35;
  const numLoanAmount = Number(formData.loanAmount) || 0;
  const numLoanTenure = Number(formData.tenureMonths) || 0;
  let computedEmi = 0;
  if (numLoanAmount > 0 && numLoanTenure > 0) {
    try {
      computedEmi = calculateEMI(numLoanAmount, loanRate, numLoanTenure).emi;
    } catch {
      computedEmi = 0;
    }
  }

  let computedBullet = null;
  if (isGoldLoan && numLoanAmount > 0 && numLoanTenure > 0) {
    try {
      computedBullet = calculateBulletRepayment(numLoanAmount, loanRate, numLoanTenure);
    } catch {
      computedBullet = null;
    }
  }

  // Required checkbox checks for gating Submit button per category
  const isRequiredConsentMet = isInvestment
    ? (isFD
        ? Boolean(formData.fdConsentTerms)
        : isRD
        ? Boolean(formData.rdConsentStandingInstruction && formData.rdConsentTerms)
        : isSIP
        ? Boolean(formData.sipDeclRisk && formData.sipDeclKycPan && formData.sipConsentMandate && formData.sipDeclFatca)
        : Boolean(formData.ssyDeclSingleAccount && formData.ssyDeclMaxTwo && formData.ssyDeclDuration))
    : isLoan
    ? formData.declTaxResident && formData.declNotPep && formData.consentCicBureau && formData.consentMitc && formData.consentNach
    : isDebitCard
    ? formData.consentDebitTerms
    : isAssured
    ? formData.declTaxResident && formData.declNotPep && formData.consentFdLien && formData.consentCardTerms
    : isCreditCard
    ? formData.declTaxResident && formData.declNotPep && formData.consentCicBureau && formData.consentCardTerms
    : formData.declTaxResident && formData.declNotPep && formData.consentKycTerms && (!formData.requestOverdraft || formData.consentCicBureau);

  const validate = () => {
    const errs = {};

    // -------------------------------------------------------------
    // Category 0: Investments (FD, RD, SIP, SSY) - Fix 0 - Fix 6
    // -------------------------------------------------------------
    if (isInvestment) {
      const isExpress = Boolean(user);

      if (!isExpress) {
        if (!isSSY) {
          if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
          if (!formData.dob) {
            errs.dob = 'Date of birth is required';
          } else if (calculateAge(formData.dob) < 18) {
            errs.dob = 'Applicant must be at least 18 years of age';
          }
        }
        if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber)) errs.panNumber = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';

        if (!formData.noFinEdgeAccountYet) {
          if (!formData.fundingAccountNumber.trim()) {
            errs.fundingAccountNumber = 'Enter your 14-digit FinEdge funding account number';
          } else if (!/^\d{10,16}$/.test(formData.fundingAccountNumber.replace(/\D/g, ''))) {
            errs.fundingAccountNumber = 'Enter a valid account number (14 digits)';
          }
        }
      }

      if (isFD) {
        const amt = Number(formData.fdDepositAmount);
        const minAmt = product?.minAmount || 5000;
        if (!formData.fdDepositAmount || isNaN(amt)) {
          errs.fdDepositAmount = 'Deposit amount is required';
        } else if (amt < minAmt) {
          errs.fdDepositAmount = `Minimum deposit amount is ${formatINRWhole(minAmt)}`;
        }
        if (!formData.fdTenureBand) {
          errs.fdTenureBand = 'Please select a tenure band';
        }
        if (!formData.fdConsentTerms) {
          errs.fdConsentTerms = 'You must accept the deposit terms to continue';
        }
      } else if (isRD) {
        const amt = Number(formData.rdMonthlyAmount);
        const minM = product?.minMonthly || 500;
        const stepM = product?.monthlyStep || 100;
        if (!formData.rdMonthlyAmount || isNaN(amt)) {
          errs.rdMonthlyAmount = 'Monthly deposit amount is required';
        } else if (amt < minM) {
          errs.rdMonthlyAmount = `Monthly deposit must be at least ${formatINRWhole(minM)}`;
        } else if (amt % stepM !== 0) {
          errs.rdMonthlyAmount = `Monthly deposit must be in multiples of ${formatINRWhole(stepM)}`;
        }
        if (!formData.rdTenureBand) {
          errs.rdTenureBand = 'Please select a tenure band';
        }
        if (!formData.rdConsentStandingInstruction) {
          errs.rdConsentStandingInstruction = 'Standing instruction authorization is mandatory';
        }
        if (!formData.rdConsentTerms) {
          errs.rdConsentTerms = 'You must accept the deposit terms to continue';
        }
      } else if (isSIP) {
        if (!formData.sipFundCategory) {
          errs.sipFundCategory = 'Please select a fund category';
        }
        const amt = Number(formData.sipMonthlyAmount);
        const minM = product?.minMonthly || 500;
        if (!formData.sipMonthlyAmount || isNaN(amt)) {
          errs.sipMonthlyAmount = 'Monthly investment amount is required';
        } else if (amt < minM) {
          errs.sipMonthlyAmount = `Minimum monthly investment is ${formatINRWhole(minM)}`;
        }
        if (!formData.sipDeclRisk) {
          errs.sipDeclRisk = 'You must acknowledge the market risk declaration';
        }
        if (!formData.sipDeclKycPan) {
          errs.sipDeclKycPan = 'KYC and PAN confirmation is required';
        }
        if (!formData.sipConsentMandate) {
          errs.sipConsentMandate = 'Auto-debit mandate authorization is required';
        }
        if (!formData.sipDeclFatca) {
          errs.sipDeclFatca = 'Tax residency / FATCA declaration is required';
        }
      } else if (isSSY) {
        if (!formData.ssyGuardianName?.trim()) {
          errs.ssyGuardianName = 'Guardian full legal name is required';
        }
        if (!formData.ssyGuardianRelationship) {
          errs.ssyGuardianRelationship = 'Please select guardian relationship';
        }
        if (!formData.ssyGuardianDob) {
          errs.ssyGuardianDob = 'Guardian date of birth is required';
        } else if (calculateAge(formData.ssyGuardianDob) < 18) {
          errs.ssyGuardianDob = 'Guardian must be at least 18 years of age';
        }

        if (!formData.ssyChildName?.trim()) {
          errs.ssyChildName = 'Girl child full name is required';
        }
        if (!formData.ssyChildDob) {
          errs.ssyChildDob = 'Child date of birth is required';
        } else if (calculateAge(formData.ssyChildDob) >= 10) {
          errs.ssyChildDob = 'Under scheme rules, the girl child must be below 10 years of age at the time of account opening.';
        }

        const amt = Number(formData.ssyAnnualDeposit);
        const minD = product?.minDepositYearly || 250;
        const maxD = product?.maxDepositYearly || 150000;
        if (!formData.ssyAnnualDeposit || isNaN(amt)) {
          errs.ssyAnnualDeposit = 'Annual deposit amount is required';
        } else if (amt < minD) {
          errs.ssyAnnualDeposit = `Minimum annual deposit is ${formatINRWhole(minD)} as per Government scheme rules.`;
        } else if (amt > maxD) {
          errs.ssyAnnualDeposit = `Maximum annual deposit is ${formatINRWhole(maxD)} per financial year under Government scheme rules.`;
        }

        if (!formData.ssyDeclSingleAccount) {
          errs.ssyDeclSingleAccount = 'Single account confirmation is required';
        }
        if (!formData.ssyDeclMaxTwo) {
          errs.ssyDeclMaxTwo = 'Family limit confirmation is required';
        }
        if (!formData.ssyDeclDuration) {
          errs.ssyDeclDuration = 'Scheme term confirmation is required';
        }
      }

      return errs;
    }

    // -------------------------------------------------------------
    // Category 1: Debit Cards (Request form)
    // -------------------------------------------------------------
    if (isDebitCard) {
      if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
      if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber)) errs.panNumber = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';

      if (formData.debitLinkType === 'account') {
        if (!user && !formData.linkedAccountNumber.trim()) {
          errs.linkedAccountNumber = 'Account number is required';
        } else if (!user && !/^\d{10,16}$/.test(formData.linkedAccountNumber.replace(/\D/g, ''))) {
          errs.linkedAccountNumber = 'Enter your 14-digit FinEdge account number';
        }
      } else if (formData.debitLinkType === 'new') {
        if (!formData.newAccountProductId) {
          errs.newAccountProductId = 'Please select an account product to open';
        }
      }

      if (!formData.consentDebitTerms) {
        errs.consentDebitTerms = 'You must agree to the debit card terms and Schedule of Charges';
      }

      return errs;
    }

    // -------------------------------------------------------------
    // Category 2: Credit Cards (Cashback, Voyage, Assured)
    // -------------------------------------------------------------
    if (isCreditCard) {
      // Security deposit for Assured
      if (isAssured) {
        const depositNum = Number(formData.depositAmount);
        if (!formData.depositAmount) {
          errs.depositAmount = 'Fixed deposit amount is required';
        } else if (isNaN(depositNum) || depositNum < 10000) {
          errs.depositAmount = 'Minimum fixed deposit is ₹10,000';
        }
        if (formData.fdChoice === 'existing' && !formData.existingFdId) {
          errs.existingFdId = 'Please select an existing fixed deposit';
        }
        if (!formData.consentFdLien) {
          errs.consentFdLien = 'You must authorize the lien on your fixed deposit';
        }
      }

      // Personal details
      if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      } else if (applicantAge < 21) {
        errs.dob = 'Primary cardholders must be at least 21 years old';
      } else if (applicantAge > 65) {
        errs.dob = 'Applicant age exceeds 65 years';
      }
      if (!formData.gender) errs.gender = 'Please select a gender';
      if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';

      // Address & KYC
      if (!formData.addressLine.trim()) errs.addressLine = 'Street address is required';
      if (!formData.city.trim()) errs.city = 'City is required';
      if (!formData.state) errs.state = 'State is required';
      if (!/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code';
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber)) errs.panNumber = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';
      if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\D/g, ''))) errs.aadhaarNumber = 'Enter a valid 12-digit Aadhaar number';

      // Employment & Income
      if (!formData.employmentType) errs.employmentType = 'Please select an employment type';
      if (!formData.employerName.trim()) errs.employerName = 'Employer or business name is required';
      if (!formData.annualIncomeBracket) errs.annualIncomeBracket = 'Annual income bracket is required';

      if (isStandardCredit) {
        const incomeNum = Number(formData.monthlyIncome);
        if (!formData.monthlyIncome) {
          errs.monthlyIncome = 'Net monthly income is required';
        } else if (isNaN(incomeNum) || incomeNum <= 0) {
          errs.monthlyIncome = 'Enter a valid monthly income';
        } else if (slug === 'edge-cashback-credit' && incomeNum < 25000) {
          errs.monthlyIncome = 'Minimum monthly income for Edge Cashback is ₹25,000';
        } else if (slug === 'edge-voyage-credit' && incomeNum < 50000) {
          errs.monthlyIncome = 'Minimum monthly income for Edge Voyage is ₹50,000';
        }
      }

      // Card preferences
      if (!formData.nameOnCard.trim()) {
        errs.nameOnCard = 'Name on card is required';
      } else if (formData.nameOnCard.length > 21) {
        errs.nameOnCard = 'Name on card cannot exceed 21 characters';
      }

      if (formData.requestedLimit) {
        const lim = Number(formData.requestedLimit);
        if (product?.creditLimitRange) {
          if (lim < product.creditLimitRange.min || lim > product.creditLimitRange.max) {
            errs.requestedLimit = `Requested limit must be between ${formatINRWhole(product.creditLimitRange.min)} and ${formatINRWhole(product.creditLimitRange.max)}`;
          }
        }
      }

      // Consents
      if (!formData.declTaxResident) errs.declTaxResident = 'Tax residency declaration is required';
      if (!formData.declNotPep) errs.declNotPep = 'PEP declaration is required';
      if (!formData.consentCardTerms) errs.consentCardTerms = 'You must accept the Most Important Terms & Conditions (MITC)';
      if (isStandardCredit && !formData.consentCicBureau) {
        errs.consentCicBureau = 'Credit bureau inquiry consent is mandatory for unsecured credit cards';
      }

      return errs;
    }

    // -------------------------------------------------------------
    // Category 3: Loans (All 7 Loans - Module 17)
    // -------------------------------------------------------------
    if (isLoan) {
      // 1. Personal details
      if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      } else {
        const minAge = product?.eligibility?.ageMin || 18;
        const maxAge = product?.eligibility?.ageMax || 70;
        if (applicantAge < minAge) {
          errs.dob = `Applicant must be at least ${minAge} years old for ${shortProductName(product?.name || '')}`;
        } else if (applicantAge > maxAge) {
          errs.dob = `Applicant age cannot exceed ${maxAge} years for ${shortProductName(product?.name || '')}`;
        }
      }
      if (!formData.gender) errs.gender = 'Please select a gender';
      if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';

      // 2. Address & KYC
      if (!formData.addressLine.trim()) errs.addressLine = 'Street address is required';
      if (!formData.city.trim()) errs.city = 'City is required';
      if (!formData.state) errs.state = 'State is required';
      if (!/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code';
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber)) {
        errs.panNumber = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';
      }
      if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\D/g, ''))) {
        errs.aadhaarNumber = 'Enter a valid 12-digit Aadhaar number';
      }

      // 3. Employment & Income
      if (!isAgriLoan) {
        if (!formData.employmentType) errs.employmentType = 'Please select employment type';
        if (!formData.employerName.trim()) {
          errs.employerName = formData.employmentType?.includes('Self') ? 'Business / practice name is required' : 'Employer name is required';
        }
      }
      if (!isGoldLoan) {
        const incomeNum = Number(formData.monthlyIncome);
        if (!formData.monthlyIncome) {
          errs.monthlyIncome = 'Monthly net income is required';
        } else if (isNaN(incomeNum) || incomeNum <= 0) {
          errs.monthlyIncome = 'Enter a valid monthly income';
        } else if (product?.eligibility?.minMonthlyIncome && incomeNum < product.eligibility.minMonthlyIncome) {
          errs.monthlyIncome = `Minimum monthly income for this loan is ${formatINRWhole(product.eligibility.minMonthlyIncome)}`;
        }
      }

      // 4. Loan Request
      const loanAmt = Number(formData.loanAmount);
      const minAmt = product?.minAmount || 25000;
      const maxAmt = product?.maxAmount || 50000000;
      if (!formData.loanAmount) {
        errs.loanAmount = 'Loan amount is required';
      } else if (isNaN(loanAmt) || loanAmt < minAmt || loanAmt > maxAmt) {
        errs.loanAmount = `Loan amount must be between ${formatINRWhole(minAmt)} and ${formatINRWhole(maxAmt)}`;
      }

      const tenure = Number(formData.tenureMonths);
      const minTenure = product?.tenureMinMonths || 12;
      const maxTenure = product?.tenureMaxMonths || 360;
      if (!formData.tenureMonths) {
        errs.tenureMonths = 'Loan tenure is required';
      } else if (isNaN(tenure) || tenure < minTenure || tenure > maxTenure) {
        errs.tenureMonths = `Tenure must be between ${minTenure} and ${maxTenure} months`;
      }
      if (!formData.loanPurpose) errs.loanPurpose = 'Loan purpose is required';

      // 5. Per-Loan Validations (Fix 3)
      if (isHomeLoan) {
        if (!formData.homePropertyStatus) errs.homePropertyStatus = 'Property status is required';
        if (!formData.homePropertyCity.trim()) errs.homePropertyCity = 'Property city is required';
        if (!formData.homePropertyAddress.trim()) errs.homePropertyAddress = 'Property address is required';
        const pVal = Number(formData.homePropertyValue);
        if (!formData.homePropertyValue || isNaN(pVal) || pVal <= 0) {
          errs.homePropertyValue = 'Estimated property value is required';
        } else if (loanAmt > 0) {
          const ltv = (loanAmt / pVal) * 100;
          const maxLtv = product?.maxLtvPct || 85;
          if (ltv > maxLtv) {
            errs.homePropertyValue = `Loan amount exceeds ${maxLtv}% of property value (max loan ${formatINRWhole(pVal * (maxLtv / 100))})`;
          }
        }
        if (formData.homeHasCoApplicant) {
          if (!formData.homeCoApplicantName.trim()) errs.homeCoApplicantName = 'Co-applicant name is required';
          if (!formData.homeCoApplicantIncome || isNaN(Number(formData.homeCoApplicantIncome))) {
            errs.homeCoApplicantIncome = 'Co-applicant monthly income is required';
          }
        }
      } else if (isVehicleLoan) {
        if (!formData.vehicleType) errs.vehicleType = 'Vehicle type is required';
        if (!formData.vehicleMakeModel.trim()) errs.vehicleMakeModel = 'Vehicle make and model is required';
        const onRoad = Number(formData.vehicleOnRoadPrice);
        const dp = Number(formData.vehicleDownPayment || 0);
        if (!formData.vehicleOnRoadPrice || isNaN(onRoad) || onRoad <= 0) {
          errs.vehicleOnRoadPrice = 'On-road price is required';
        }
        if (formData.vehicleDownPayment === '' || isNaN(dp) || dp < 0) {
          errs.vehicleDownPayment = 'Valid down payment amount is required';
        }
        if (onRoad > 0 && !isNaN(dp)) {
          const maxFinance = onRoad - dp;
          if (loanAmt > maxFinance) {
            errs.loanAmount = `Loan amount exceeds maximum financeable amount (Price ${formatINRWhole(onRoad)} − Down payment ${formatINRWhole(dp)} = ${formatINRWhole(maxFinance)})`;
          }
        }
      } else if (isEducationLoan) {
        if (!formData.eduApplicantRole) errs.eduApplicantRole = 'Applicant role is required';
        if (formData.eduApplicantRole === 'Parent / Guardian' && !formData.eduStudentName.trim()) {
          errs.eduStudentName = 'Student full legal name is required';
        }
        if (!formData.eduCourseName.trim()) errs.eduCourseName = 'Course name is required';
        if (!formData.eduInstitute.trim()) errs.eduInstitute = 'Institute name & location is required';
        if (!formData.eduAdmissionStatus) errs.eduAdmissionStatus = 'Admission status is required';
        const cFee = Number(formData.eduCourseFee);
        if (!formData.eduCourseFee || isNaN(cFee) || cFee <= 0) {
          errs.eduCourseFee = 'Total course fee is required';
        }
        // Mandatory Co-applicant
        if (!formData.eduCoApplicantName.trim()) errs.eduCoApplicantName = 'Co-applicant / guarantor name is required';
        if (!formData.eduCoApplicantRelationship) errs.eduCoApplicantRelationship = 'Co-applicant relationship is required';
        const coInc = Number(formData.eduCoApplicantIncome);
        if (!formData.eduCoApplicantIncome || isNaN(coInc) || coInc <= 0) {
          errs.eduCoApplicantIncome = 'Co-applicant monthly net income is required';
        }

        // Conditional Collateral for Education Loan above threshold (₹7.5 Lakh)
        const collateralThreshold = product?.collateralThresholdAmount || 750000;
        if (loanAmt > collateralThreshold) {
          if (!formData.eduCollateralType?.trim()) {
            errs.eduCollateralType = 'Collateral type is required for loans above ₹7.5 Lakh';
          }
          const cVal = Number(formData.eduCollateralValue);
          if (!formData.eduCollateralValue || isNaN(cVal) || cVal <= 0) {
            errs.eduCollateralValue = 'Estimated collateral value is required for loans above ₹7.5 Lakh';
          }
        }
      } else if (isBusinessLoan) {
        if (!formData.bizBusinessName.trim()) errs.bizBusinessName = 'Business name is required';
        if (!formData.bizConstitution) errs.bizConstitution = 'Constitution is required';
        if (!formData.bizApplicantRole) errs.bizApplicantRole = 'Role in business is required';
        const isNonProp = formData.bizConstitution !== 'Sole Proprietorship';
        if (isNonProp && !formData.bizGstin.trim()) {
          errs.bizGstin = 'GSTIN is required for partnerships, LLPs, and companies';
        } else if (formData.bizGstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.bizGstin.trim())) {
          errs.bizGstin = 'Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5)';
        }
        const vintage = Number(formData.bizYearsInBusiness);
        if (!formData.bizYearsInBusiness || isNaN(vintage) || vintage < 2) {
          errs.bizYearsInBusiness = 'Minimum 2 years of business vintage is required';
        }
        const turnover = Number(formData.bizAnnualTurnover);
        if (!formData.bizAnnualTurnover || isNaN(turnover) || turnover < 2500000) {
          errs.bizAnnualTurnover = 'Minimum annual turnover of ₹25,00,000 (₹25 Lakh) is required';
        }
        if (!formData.bizAddress.trim()) errs.bizAddress = 'Business operating address is required';
      } else if (isAgriLoan) {
        const area = Number(formData.agriLandArea);
        if (!formData.agriLandArea || isNaN(area) || area <= 0) {
          errs.agriLandArea = 'Land area in acres is required';
        }
        if (!formData.agriSurveyKhata.trim()) errs.agriSurveyKhata = 'Survey / Khata number is required';
        if (!formData.agriVillageTaluk.trim()) errs.agriVillageTaluk = 'Village & Taluk is required';
        if (!formData.agriCropType.trim()) errs.agriCropType = 'Crop type / agricultural activity is required';
        if (!formData.agriSeason) errs.agriSeason = 'Cropping season is required';
        if (!formData.agriIrrigation) errs.agriIrrigation = 'Irrigation source is required';
      } else if (isGoldLoan) {
        const gWeight = Number(formData.goldWeight);
        if (!formData.goldWeight || isNaN(gWeight) || gWeight <= 0) {
          errs.goldWeight = 'Total gold weight in grams is required';
        }
        if (!formData.goldPurity) errs.goldPurity = 'Gold purity is required';
        if (!formData.goldType) errs.goldType = 'Gold item type is required';
      } else if (isLapLoan) {
        if (!formData.lapPropertyType) errs.lapPropertyType = 'Property type is required';
        if (!formData.lapPropertyAddress.trim()) errs.lapPropertyAddress = 'Property address is required';
        const pVal = Number(formData.lapPropertyValue);
        if (!formData.lapPropertyValue || isNaN(pVal) || pVal <= 0) {
          errs.lapPropertyValue = 'Estimated property market value is required';
        } else if (loanAmt > 0) {
          const ltv = (loanAmt / pVal) * 100;
          const maxLtv = product?.maxLtvPct || 60;
          if (ltv > maxLtv) {
            errs.lapPropertyValue = `Loan amount exceeds ${maxLtv}% of property value (max loan ${formatINRWhole(pVal * (maxLtv / 100))})`;
          }
        }
        if (formData.lapHasExistingLoan === 'Yes') {
          if (!formData.lapExistingLender.trim()) errs.lapExistingLender = 'Existing lender name is required';
          if (!formData.lapExistingBalance || isNaN(Number(formData.lapExistingBalance))) {
            errs.lapExistingBalance = 'Outstanding loan balance is required';
          }
        }
        if (!formData.lapEndUse) errs.lapEndUse = 'End-use declaration is required';
      }

      // 6. Disbursal & Repayment
      if (!formData.noFinEdgeAccountYet) {
        if (formData.loanDisbursalType === 'entry' || !user || accounts.length === 0) {
          const cleanAcc = formData.loanDisbursalAccountNumber.replace(/\D/g, '');
          if (!cleanAcc) {
            errs.loanDisbursalAccountNumber = 'FinEdge account number is required';
          } else if (cleanAcc.length !== 14) {
            errs.loanDisbursalAccountNumber = 'Enter a valid 14-digit FinEdge account number';
          }
        } else if (formData.loanDisbursalType === 'account' && !formData.loanDisbursalAccountId) {
          errs.loanDisbursalAccountId = 'Please select a disbursal account';
        }
      }
      if (!formData.consentNach) {
        errs.consentNach = 'You must authorize the NACH auto-debit mandate for EMI repayment';
      }

      // 7. Consents
      if (!formData.declTaxResident) errs.declTaxResident = 'Tax residency declaration is required';
      if (!formData.declNotPep) errs.declNotPep = 'PEP declaration is required';
      if (!formData.consentCicBureau) errs.consentCicBureau = 'Credit bureau inquiry consent is mandatory for credit evaluation';
      if (!formData.consentMitc) errs.consentMitc = 'You must accept the Most Important Terms & Conditions (MITC)';

      return errs;
    }

    // -------------------------------------------------------------
    // Category 4: Account Applications (Savings, Current, Salary, Minor, Student)
    // -------------------------------------------------------------
    if (isMinor) {
      if (!formData.fullName.trim()) errs.fullName = 'Guardian full legal name is required';
      if (!formData.dob) {
        errs.dob = 'Guardian date of birth is required';
      } else if (applicantAge < 18) {
        errs.dob = 'Operating guardian must be an adult (18 years or older)';
      }
      if (!formData.childName.trim()) errs.childName = 'Child full legal name is required';
      if (!formData.childDob) {
        errs.childDob = 'Child date of birth is required';
      } else {
        const childAge = calculateAge(formData.childDob);
        if (childAge >= 18) {
          errs.childDob = 'Sprout account is only for minors under 18 years old';
        }
      }
      if (!formData.guardianRelationship) errs.guardianRelationship = 'Please select relationship to the child';
    } else if (isCurrent) {
      if (!formData.businessName.trim()) errs.businessName = 'Business or trading name is required';
      if (!formData.constitution) errs.constitution = 'Please select business constitution';
      if (!formData.businessPan.trim()) {
        errs.businessPan = 'Entity PAN is required';
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.businessPan)) {
        errs.businessPan = 'Enter a valid 10-character business PAN';
      }
      if (!formData.annualTurnover) errs.annualTurnover = 'Please select annual turnover bracket';
      if (formData.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.gstin)) {
        errs.gstin = 'Enter a valid 15-character GSTIN';
      }
      if (!formData.fullName.trim()) errs.fullName = 'Signatory full name is required';
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      } else if (applicantAge < 18) {
        errs.dob = 'Authorized signatory must be 18 years or older';
      }
    } else if (isStudent) {
      if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      } else if (applicantAge < 16) {
        errs.dob = 'Campus Student Account is for students aged 16 to 25';
      } else if (applicantAge > 25) {
        errs.dob = 'Campus Student Account eligibility capped at age 25';
      }
      if (!formData.college.trim()) errs.college = 'College or university name is required';
      if (!formData.courseYear.trim()) errs.courseYear = 'Course & year of study is required';

      if (isStudentMinor) {
        if (!formData.studentGuardianName.trim()) errs.studentGuardianName = 'Guardian full name is required for minor applicants';
        if (!formData.studentGuardianDob) {
          errs.studentGuardianDob = 'Guardian date of birth is required';
        } else if (calculateAge(formData.studentGuardianDob) < 18) {
          errs.studentGuardianDob = 'Guardian must be an adult (18+)';
        }
        if (!/^[6-9]\d{9}$/.test(formData.studentGuardianMobile)) errs.studentGuardianMobile = 'Valid 10-digit guardian mobile is required';
        if (!formData.studentGuardianRelationship) errs.studentGuardianRelationship = 'Please select guardian relationship';
      }
    } else {
      if (!formData.fullName.trim()) errs.fullName = 'Full legal name is required';
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      } else if (applicantAge < 18) {
        errs.dob = 'Applicant must be at least 18 years old';
      }
    }

    if (!formData.gender) errs.gender = 'Please select a gender';
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';

    if (!formData.addressLine.trim()) errs.addressLine = 'Street address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state) errs.state = 'State is required';
    if (!/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code';

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber)) {
      errs.panNumber = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';
    }
    if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\D/g, ''))) {
      errs.aadhaarNumber = 'Enter a valid 12-digit Aadhaar number';
    }

    if (isSalary) {
      if (!formData.employerName.trim()) errs.employerName = 'Corporate employer name is required';
      if (!formData.monthlyIncome || isNaN(Number(formData.monthlyIncome))) errs.monthlyIncome = 'Monthly net salary is required';
    }

    // Nominee validation (Accounts only)
    if (!formData.nomineeName.trim()) errs.nomineeName = 'Nominee full name is required';
    if (!formData.nomineeDob) errs.nomineeDob = 'Nominee date of birth is required';
    if (!formData.nomineeRelationship) errs.nomineeRelationship = 'Please select nominee relationship';

    // Account Consents
    if (!formData.declTaxResident) errs.declTaxResident = 'Tax residency declaration is required';
    if (!formData.declNotPep) errs.declNotPep = 'PEP declaration is required';
    if (!formData.consentKycTerms) errs.consentKycTerms = 'You must accept the FinEdge Digital Account terms and KYC verification';
    if (formData.requestOverdraft && !formData.consentCicBureau) {
      errs.consentCicBureau = 'Credit bureau pull consent is required when requesting an overdraft limit';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) el.focus();
      return;
    }

    setLoading(true);
    try {
      if (isInvestment) {
        const isSenior = isFD && formData.dob && calculateAge(formData.dob) >= 60;
        const fdBand = isFD ? (product?.rateGrid || []).find((r) => r.tenure === formData.fdTenureBand) || product?.rateGrid?.[4] : null;
        const fdRate = fdBand ? (isSenior ? fdBand.senior : fdBand.general) : 6.95;

        const rdBand = isRD ? (product?.rateBands || []).find((r) => r.tenure === formData.rdTenureBand) || product?.rateBands?.[2] : null;
        const rdRate = rdBand ? (rdBand.rate ?? rdBand.general ?? 6.55) : 6.55;

        let investmentDetails = {};
        if (isFD) {
          const numAmt = Number(formData.fdDepositAmount) || 0;
          const tenureMonths = fdBand?.tenure === '7 – 45 days' ? 1
            : fdBand?.tenure === '46 – 179 days' ? 4
            : fdBand?.tenure === '180 – 364 days' ? 9
            : fdBand?.tenure === '1 – 2 years' ? 24
            : fdBand?.tenure === '2 – 3 years' ? 36
            : fdBand?.tenure === '3 – 5 years' ? 48
            : 60;
          const fdCalc = calculateFD({ principal: numAmt, annualRatePct: fdRate, tenureMonths });
          investmentDetails = {
            depositAmount: numAmt,
            tenureBand: formData.fdTenureBand,
            appliedRate: fdRate,
            isSeniorCitizen: isSenior,
            payoutOption: formData.fdPayoutOption || 'Cumulative (paid at maturity)',
            autoRenew: Boolean(formData.fdAutoRenew),
            maturityValue: fdCalc.maturityValue,
            interestEarned: fdCalc.interestEarned,
          };
        } else if (isRD) {
          const numAmt = Number(formData.rdMonthlyAmount) || 0;
          const tenureMonths = rdBand?.tenure === '6 – 12 months' ? 12
            : rdBand?.tenure === '13 – 24 months' ? 24
            : rdBand?.tenure === '25 – 60 months' ? 60
            : 120;
          const rdCalc = calculateRD({ monthlyDeposit: numAmt, annualRatePct: rdRate, tenureMonths });
          investmentDetails = {
            monthlyDeposit: numAmt,
            tenureBand: formData.rdTenureBand,
            appliedRate: rdRate,
            debitDate: Number(formData.rdDebitDate) || 5,
            totalDeposited: rdCalc.totalDeposited,
            maturityValue: rdCalc.maturityValue,
            interestEarned: rdCalc.interestEarned,
          };
        } else if (isSIP) {
          const numAmt = Number(formData.sipMonthlyAmount) || 0;
          const numYears = Number(formData.sipDurationYears) || 10;
          const selectedCat = (product?.fundCategories || []).find((c) => c.name === formData.sipFundCategory) || product?.fundCategories?.[0];
          investmentDetails = {
            fundCategory: formData.sipFundCategory,
            riskLevel: selectedCat?.riskLevel || 'Moderate to High',
            monthlyInvestment: numAmt,
            sipDate: Number(formData.sipDate) || 5,
            durationYears: numYears,
            stepUp: formData.sipStepUp || 'None',
          };
        } else if (isSSY) {
          const numAmt = Number(formData.ssyAnnualDeposit) || 0;
          const ssyCalc = calculateSSY({ annualDeposit: numAmt, annualRatePct: product?.rate || 8.05 });
          investmentDetails = {
            guardianName: formData.ssyGuardianName,
            guardianRelationship: formData.ssyGuardianRelationship,
            guardianDob: formData.ssyGuardianDob,
            childName: formData.ssyChildName,
            childDob: formData.ssyChildDob,
            annualDeposit: numAmt,
            statutoryRate: `${product?.rate || 8.05}% p.a. (Illustrative)`,
            maturityValue: ssyCalc.maturityValue,
            totalDeposited: ssyCalc.totalDeposited,
          };
        }

        const isExpress = Boolean(user);
        const investmentPayload = {
          category: 'investment',
          kind: isFD ? 'FD' : isRD ? 'RD' : isSIP ? 'SIP' : 'SSY',
          productSlug: slug,
          productName: product?.name || 'FinEdge Investment',
          applicant: {
            fullName: isSSY ? formData.ssyGuardianName : (isExpress ? (user?.fullName || user?.name) : formData.fullName.trim()),
            dob: isSSY ? formData.ssyGuardianDob : (isExpress ? user?.dob : formData.dob),
            mobileNumber: isExpress ? (user?.mobileNumber || user?.phone) : formData.mobile.trim(),
            email: isExpress ? user?.email : formData.email.trim(),
            panNumber: isExpress ? (user?.pan || 'ABCDE1234F') : formData.panNumber.trim().toUpperCase(),
          },
          fundingAccount: {
            type: formData.noFinEdgeAccountYet ? 'NO_ACCOUNT_YET' : (isExpress ? 'FINEDGE_ACCOUNT' : 'ACCOUNT_NUMBER'),
            accountId: isExpress ? (formData.fundingAccountId || accounts[0]?.accountId) : '',
            accountNumber: !isExpress ? formData.fundingAccountNumber.trim() : '',
            noFinEdgeAccountYet: Boolean(formData.noFinEdgeAccountYet),
          },
          investmentDetails,
          nominee: (!isSSY && (formData.nomineeName?.trim() || formData.nomineeRelationship)) ? {
            fullName: formData.nomineeName.trim(),
            relationship: formData.nomineeRelationship,
            dateOfBirth: formData.nomineeDob,
          } : undefined,
          consents: {
            fdConsentTerms: formData.fdConsentTerms,
            rdConsentStandingInstruction: formData.rdConsentStandingInstruction,
            rdConsentTerms: formData.rdConsentTerms,
            sipDeclRisk: formData.sipDeclRisk,
            sipDeclKycPan: formData.sipDeclKycPan,
            sipConsentMandate: formData.sipConsentMandate,
            sipDeclFatca: formData.sipDeclFatca,
            ssyDeclSingleAccount: formData.ssyDeclSingleAccount,
            ssyDeclMaxTwo: formData.ssyDeclMaxTwo,
            ssyDeclDuration: formData.ssyDeclDuration,
            optInMarketing: formData.optInMarketing,
          }
        };

        const res = await submitApplication(investmentPayload);
        setSubmittedApp(res.data || res);
        return;
      }

      if (isDebitCard) {
        if (formData.debitLinkType === 'new') {
          const targetAccount = getProductBySlug(formData.newAccountProductId);
          setActiveProduct(targetAccount);
          setCardRequestedNote(`${product.name} requested with this account.`);
          setFormData((prev) => ({
            ...prev,
            requestDebitCard: true,
            consentDebitTerms: false
          }));
          setLoading(false);
          return;
        }

        const debitPayload = {
          category: 'card',
          cardType: 'DEBIT',
          cardName: product?.name || 'FinEdge Gold Debit Card',
          productSlug: slug,
          fullName: formData.fullName.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          panNumber: formData.panNumber.trim().toUpperCase(),
          linkedAccountId: user ? formData.linkedAccountId : formData.linkedAccountNumber.trim(),
          deliveryAddress: user ? 'Registered account address' : 'Address on file for this account',
          consents: { debitTermsAccepted: formData.consentDebitTerms }
        };

        const res = await submitApplication(debitPayload);
        setSubmittedApp(res.data || res);
        return;
      }

      if (isLoan) {
        const loanPayload = {
          category: 'loan',
          productSlug: slug,
          productName: product?.name || 'FinEdge Loan',
          applicantName: formData.fullName.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          dob: formData.dob,
          gender: formData.gender,
          addressLine: formData.addressLine.trim(),
          city: formData.city.trim(),
          state: formData.state,
          pincode: formData.pincode.trim(),
          panNumber: formData.panNumber.trim().toUpperCase(),
          aadhaarNumber: maskAadhaar(formData.aadhaarNumber),
          employmentType: isAgriLoan ? 'Agriculturist' : formData.employmentType,
          employerName: isAgriLoan ? undefined : formData.employerName.trim(),
          monthlyIncome: formData.monthlyIncome ? Number(formData.monthlyIncome) : undefined,
          employmentVintageYears: formData.employmentVintage ? Number(formData.employmentVintage) : undefined,
          existingMonthlyEmi: Number(formData.existingEmi || 0),
          loanAmount: Number(formData.loanAmount),
          amount: Number(formData.loanAmount),
          tenureMonths: Number(formData.tenureMonths),
          tenure: Number(formData.tenureMonths),
          rate: product?.rateMin || 8.35,
          emi: computedEmi,
          purpose: formData.loanPurpose,
          accountId: formData.noFinEdgeAccountYet ? 'PENDING_SANCTION' : (formData.loanDisbursalType === 'account' ? formData.loanDisbursalAccountId : formData.loanDisbursalAccountNumber.trim() || 'ACC-OPERATIVE'),
          noAccountYet: formData.noFinEdgeAccountYet,
          loanDetails: {
            ...(isHomeLoan && {
              propertyStatus: formData.homePropertyStatus,
              propertyCity: formData.homePropertyCity.trim(),
              propertyAddress: formData.homePropertyAddress.trim(),
              propertyValue: Number(formData.homePropertyValue),
              ltvPercent: Number(((Number(formData.loanAmount) / Number(formData.homePropertyValue)) * 100).toFixed(1)),
              hasCoApplicant: formData.homeHasCoApplicant,
              ...(formData.homeHasCoApplicant && {
                coApplicantName: formData.homeCoApplicantName.trim(),
                coApplicantRelationship: formData.homeCoApplicantRelationship,
                coApplicantMonthlyIncome: Number(formData.homeCoApplicantIncome)
              })
            }),
            ...(isVehicleLoan && {
              vehicleType: formData.vehicleType,
              makeAndModel: formData.vehicleMakeModel.trim(),
              onRoadPrice: Number(formData.vehicleOnRoadPrice),
              downPayment: Number(formData.vehicleDownPayment),
              netFinancedAmount: Number(formData.vehicleOnRoadPrice) - Number(formData.vehicleDownPayment),
              dealerName: formData.vehicleDealerName.trim() || undefined
            }),
            ...(isEducationLoan && {
              applicantRole: formData.eduApplicantRole,
              studentName: formData.eduApplicantRole === 'Student' ? formData.fullName.trim() : formData.eduStudentName.trim(),
              studentRelationship: formData.eduApplicantRole === 'Student' ? 'Self' : formData.eduStudentRelationship,
              courseName: formData.eduCourseName.trim(),
              institute: formData.eduInstitute.trim(),
              admissionStatus: formData.eduAdmissionStatus,
              totalCourseFee: Number(formData.eduCourseFee),
              coApplicantName: formData.eduCoApplicantName.trim(),
              coApplicantRelationship: formData.eduCoApplicantRelationship,
              coApplicantMonthlyIncome: Number(formData.eduCoApplicantIncome),
              moratoriumPeriod: 'Course duration + 12 months',
              ...(Number(formData.loanAmount) > (product?.collateralThresholdAmount || 750000) && {
                collateralType: formData.eduCollateralType,
                collateralValue: Number(formData.eduCollateralValue),
              }),
            }),
            ...(isBusinessLoan && {
              businessName: formData.bizBusinessName.trim(),
              constitution: formData.bizConstitution,
              applicantRole: formData.bizApplicantRole,
              gstin: formData.bizGstin.trim().toUpperCase() || undefined,
              yearsInBusiness: Number(formData.bizYearsInBusiness),
              annualTurnover: Number(formData.bizAnnualTurnover),
              businessAddress: formData.bizAddress.trim()
            }),
            ...(isAgriLoan && {
              landAreaAcres: Number(formData.agriLandArea),
              surveyKhataNumber: formData.agriSurveyKhata.trim(),
              villageTaluk: formData.agriVillageTaluk.trim(),
              cropType: formData.agriCropType.trim(),
              croppingSeason: formData.agriSeason,
              irrigationSource: formData.agriIrrigation
            }),
            ...(isGoldLoan && {
              repaymentMode: formData.goldRepaymentMode,
              goldWeightGrams: Number(formData.goldWeight),
              goldPurity: formData.goldPurity,
              goldItemType: formData.goldType,
              maxStatutoryLtv: `${product?.maxLtvPct || 75}%`,
              fulfilmentMode: 'Branch Valuation & Disbursal'
            }),
            ...(isLapLoan && {
              propertyType: formData.lapPropertyType,
              propertyAddress: formData.lapPropertyAddress.trim(),
              propertyMarketValue: Number(formData.lapPropertyValue),
              ownershipStructure: formData.lapOwnership,
              hasExistingMortgage: formData.lapHasExistingLoan === 'Yes',
              ...(formData.lapHasExistingLoan === 'Yes' && {
                existingLender: formData.lapExistingLender.trim(),
                existingOutstandingBalance: Number(formData.lapExistingBalance)
              }),
              declaredEndUse: formData.lapEndUse,
              ltvPercent: Number(((Number(formData.loanAmount) / Number(formData.lapPropertyValue)) * 100).toFixed(1))
            })
          },
          consents: {
            taxResidentDeclaration: formData.declTaxResident,
            notPoliticallyExposed: formData.declNotPep,
            creditBureauPullAuthorized: formData.consentCicBureau,
            mitcTermsAccepted: formData.consentMitc,
            autoDebitNachMandateAccepted: formData.consentNach,
            optInMarketing: formData.optInMarketing
          }
        };

        const res = await submitApplication(loanPayload);
        setSubmittedApp(res.data || res);
        return;
      }

      // Credit Cards
      if (isCreditCard) {
        const cardPayload = {
          category: 'card',
          cardType: isAssured ? 'SECURED_CREDIT' : 'UNSECURED_CREDIT',
          cardName: product?.name || 'FinEdge Credit Card',
          productSlug: slug,
          fullName: formData.fullName.trim(),
          dob: formData.dob,
          gender: formData.gender,
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          addressLine: formData.addressLine.trim(),
          city: formData.city.trim(),
          state: formData.state,
          pincode: formData.pincode.trim(),
          panNumber: formData.panNumber.trim().toUpperCase(),
          aadhaarNumber: maskAadhaar(formData.aadhaarNumber),
          employmentType: formData.employmentType,
          employerName: formData.employerName.trim(),
          monthlyIncome: isStandardCredit ? Number(formData.monthlyIncome) : undefined,
          annualIncomeBracket: formData.annualIncomeBracket,
          nameOnCard: formData.nameOnCard.trim().toUpperCase(),
          requestedLimit: formData.requestedLimit ? Number(formData.requestedLimit) : undefined,
          ...(isAssured && {
            securityDeposit: {
              type: formData.fdChoice,
              depositAmount: Number(formData.depositAmount),
              existingFdId: formData.fdChoice === 'existing' ? formData.existingFdId : undefined,
              computedCreditLimit: computedAssuredLimit
            }
          }),
          consents: {
            taxResidentDeclaration: formData.declTaxResident,
            notPoliticallyExposed: formData.declNotPep,
            mitcTermsAccepted: formData.consentCardTerms,
            creditBureauPullAuthorized: isStandardCredit ? formData.consentCicBureau : false,
            fdLienAuthorized: isAssured ? formData.consentFdLien : false,
            optInMarketing: formData.optInMarketing
          }
        };

        const res = await submitApplication(cardPayload);
        setSubmittedApp(res.data || res);
        return;
      }

      // Account Applications
      const accountPayload = {
        category: 'account',
        productSlug: slug,
        productName: product?.name || 'FinEdge Account',
        fullName: formData.fullName.trim(),
        dob: formData.dob,
        gender: formData.gender,
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        addressLine: formData.addressLine.trim(),
        city: formData.city.trim(),
        state: formData.state,
        pincode: formData.pincode.trim(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        aadhaarNumber: maskAadhaar(formData.aadhaarNumber),
        ...(isMinor && {
          minorDetails: {
            childName: formData.childName.trim(),
            childDob: formData.childDob,
            guardianRelationship: formData.guardianRelationship
          }
        }),
        ...(isCurrent && {
          businessDetails: {
            businessName: formData.businessName.trim(),
            constitution: formData.constitution,
            businessPan: formData.businessPan.trim().toUpperCase(),
            annualTurnover: formData.annualTurnover,
            gstin: formData.gstin.trim().toUpperCase() || undefined,
            requestOverdraft: formData.requestOverdraft
          }
        }),
        ...(isStudent && {
          studentDetails: {
            college: formData.college.trim(),
            courseYear: formData.courseYear.trim(),
            ...(isStudentMinor && {
              guardian: {
                name: formData.studentGuardianName.trim(),
                dob: formData.studentGuardianDob,
                mobile: formData.studentGuardianMobile.trim(),
                relationship: formData.studentGuardianRelationship
              }
            })
          }
        }),
        nominee: {
          name: formData.nomineeName.trim(),
          relationship: formData.nomineeRelationship,
          dob: formData.nomineeDob
        },
        preferences: {
          requestDebitCard: formData.requestDebitCard || Boolean(cardRequestedNote)
        },
        consents: {
          taxResidentDeclaration: formData.declTaxResident,
          notPoliticallyExposed: formData.declNotPep,
          kycTermsAccepted: formData.consentKycTerms,
          creditBureauPullAuthorized: formData.consentCicBureau,
          optInMarketing: formData.optInMarketing
        }
      };

      const res = await submitApplication(accountPayload);
      setSubmittedApp(res.data || res);
    } catch (err) {
      setErrors({ form: err?.message || 'Application submission failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmittedApp(null);
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-midnight-950/70 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[720px] max-h-[90vh] bg-white rounded-2xl shadow-modal overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 id="apply-modal-title" className="font-display text-lg font-bold text-midnight-950">
              {product ? `Apply for ${shortProductName(product.name)}` : 'Product Application'}
            </h2>
            {isLoan ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-ink-100 bg-porcelain-50 px-3 py-1.5 text-xs text-ink-700">
                <div>
                  <span className="text-ink-500 font-medium">Interest:</span>{' '}
                  <span className="font-semibold text-midnight-950">{product.rateMin?.toFixed(2)}% – {product.rateMax?.toFixed(2)}% p.a.</span>
                </div>
                <div className="h-3 w-px bg-ink-200" aria-hidden />
                <div>
                  <span className="text-ink-500 font-medium">Amount:</span>{' '}
                  <span className="font-semibold text-midnight-950">
                    {product.minAmount ? `${formatINRWhole(product.minAmount)}` : '₹25,000'} – {product.maxAmount ? `${formatINRWhole(product.maxAmount)}` : '—'}
                  </span>
                </div>
                <div className="h-3 w-px bg-ink-200" aria-hidden />
                <div>
                  <span className="text-ink-500 font-medium">Tenure:</span>{' '}
                  <span className="font-semibold text-midnight-950">
                    {product.tenureMinMonths % 12 === 0 && product.tenureMaxMonths % 12 === 0
                      ? `${product.tenureMinMonths / 12} – ${product.tenureMaxMonths / 12} yrs`
                      : `${product.tenureMinMonths} – ${product.tenureMaxMonths} mos`}
                  </span>
                </div>
                <div className="h-3 w-px bg-ink-200" aria-hidden />
                <div>
                  <span className="text-ink-500 font-medium">Processing fee:</span>{' '}
                  <span className="font-semibold text-midnight-950">
                    {product.processingFee?.pct}%
                    {product.processingFee?.min !== null && product.processingFee?.min !== undefined
                      ? ` (min ${product.processingFee.min === 0 ? 'Nil' : `${formatINRWhole(product.processingFee.min)}`}${product.processingFee.max ? `, max ${formatINRWhole(product.processingFee.max)}` : ''})`
                      : ''}
                  </span>
                </div>
              </div>
            ) : isInvestment ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-ink-100 bg-porcelain-50 px-3 py-1.5 text-xs text-ink-700">
                {isFD && (
                  <>
                    <div>
                      <span className="text-ink-500 font-medium">Interest:</span>{' '}
                      <span className="font-semibold text-midnight-950">Up to 6.95% p.a.</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Senior Citizens:</span>{' '}
                      <span className="font-semibold text-midnight-950">+0.50% extra</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Protection:</span>{' '}
                      <span className="font-semibold text-midnight-950">DICGC insured up to ₹5 Lakh</span>
                    </div>
                  </>
                )}
                {isRD && (
                  <>
                    <div>
                      <span className="text-ink-500 font-medium">Interest:</span>{' '}
                      <span className="font-semibold text-midnight-950">Up to 6.55% p.a.</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Minimum:</span>{' '}
                      <span className="font-semibold text-midnight-950">₹500 / month</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Tenure:</span>{' '}
                      <span className="font-semibold text-midnight-950">6 – 120 months</span>
                    </div>
                  </>
                )}
                {isSIP && (
                  <>
                    <div>
                      <span className="text-ink-500 font-medium">Categories:</span>{' '}
                      <span className="font-semibold text-midnight-950">5 Fund Categories</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Minimum:</span>{' '}
                      <span className="font-semibold text-midnight-950">₹500 / month</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Tenure:</span>{' '}
                      <span className="font-semibold text-midnight-950">Flexible Duration</span>
                    </div>
                  </>
                )}
                {isSSY && (
                  <>
                    <div>
                      <span className="text-ink-500 font-medium">Interest:</span>{' '}
                      <span className="font-semibold text-midnight-950">8.05% p.a.</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Security:</span>{' '}
                      <span className="font-semibold text-midnight-950">Sovereign Guarantee</span>
                    </div>
                    <div className="h-3 w-px bg-ink-200" aria-hidden />
                    <div>
                      <span className="text-ink-500 font-medium">Tax Status:</span>{' '}
                      <span className="font-semibold text-midnight-950">Triple Tax-Exempt (EEE)</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-ink-500">
                FinEdge Bank Digital Onboarding · Secure 256-bit encrypted application
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submittedApp ? (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="flex flex-col items-center text-center space-y-2 py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-midnight-950">
                Application Successfully Submitted
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 max-w-md">
                Your application for <strong className="text-midnight-900">{product?.name || 'FinEdge Product'}</strong> has been registered in the FinEdge banking system.
              </p>
            </div>

            {isInvestment ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Service Reference</span>
                    <span className="font-mono font-bold text-midnight-950">{submittedApp.applicationId || submittedApp.reference || submittedApp.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Investment Product</span>
                    <span className="font-semibold text-midnight-950">{product?.name || submittedApp.productName}</span>
                  </div>
                  {isFD && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Deposit Amount</span>
                        <span className="font-semibold text-midnight-950">₹{formatINRWhole(formData.fdDepositAmount || submittedApp.investmentDetails?.depositAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Tenure</span>
                        <span className="font-semibold text-midnight-950">{formData.fdTenureBand || submittedApp.investmentDetails?.tenureBand}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Estimated Maturity</span>
                        <span className="font-semibold text-emerald-700">₹{formatINRWhole(submittedApp.investmentDetails?.maturityAmount || 0)}</span>
                      </div>
                    </>
                  )}
                  {isRD && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Monthly Instalment</span>
                        <span className="font-semibold text-midnight-950">₹{formatINRWhole(formData.rdMonthlyAmount || submittedApp.investmentDetails?.monthlyAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Tenure</span>
                        <span className="font-semibold text-midnight-950">{formData.rdTenureMonths || submittedApp.investmentDetails?.tenureMonths} Months</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Estimated Maturity</span>
                        <span className="font-semibold text-emerald-700">₹{formatINRWhole(submittedApp.investmentDetails?.maturityAmount || 0)}</span>
                      </div>
                    </>
                  )}
                  {isSIP && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Fund Category</span>
                        <span className="font-semibold text-midnight-950">{formData.sipFundCategory || submittedApp.investmentDetails?.fundCategory}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Monthly Contribution</span>
                        <span className="font-semibold text-midnight-950">₹{formatINRWhole(formData.sipMonthlyAmount || submittedApp.investmentDetails?.monthlyAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Investment Horizon</span>
                        <span className="font-semibold text-midnight-950">{formData.sipDurationYears || submittedApp.investmentDetails?.durationYears} Years</span>
                      </div>
                    </>
                  )}
                  {isSSY && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Child Name</span>
                        <span className="font-semibold text-midnight-950">{formData.ssyChildName || submittedApp.investmentDetails?.childName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Annual Deposit</span>
                        <span className="font-semibold text-midnight-950">₹{formatINRWhole(formData.ssyAnnualDeposit || submittedApp.investmentDetails?.yearlyAmount || 0)} / year</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-500">Projected Maturity (21 yrs)</span>
                        <span className="font-semibold text-emerald-700">₹{formatINRWhole(submittedApp.investmentDetails?.projectedMaturity || 0)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Initial Queue Status</span>
                    <span className="font-semibold text-warning-600 bg-warning-50 px-2 py-0.5 rounded border border-warning-600/20">
                      SUBMITTED · VERIFICATION
                    </span>
                  </div>
                </div>

                {formData.noFinEdgeAccountYet ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2">
                    <p className="font-semibold">Important: Operative Account Required</p>
                    <p className="text-amber-800 leading-relaxed">
                      Your investment application is recorded, but investments cannot be debited or booked until you hold an operative FinEdge savings or current account.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        window.location.href = '/accounts';
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-800 text-white font-medium hover:bg-amber-900 transition-colors"
                    >
                      Open your account first <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-ink-100 bg-porcelain-50 p-3.5 text-xs text-ink-700 space-y-1">
                    <p className="font-semibold text-midnight-950">What happens next?</p>
                    <p className="text-ink-600 leading-relaxed">
                      Your funding account will be debited upon operational verification; your deposit advice / folio allotment will appear in your portal under Investments.
                    </p>
                  </div>
                )}
              </div>
            ) : isLoan ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Service Reference</span>
                    <span className="font-mono font-bold text-midnight-950">{submittedApp.applicationId || submittedApp.reference || submittedApp.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Loan Product</span>
                    <span className="font-semibold text-midnight-950">{product?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Requested Amount</span>
                    <span className="font-semibold text-midnight-950">₹{formatINRWhole(formData.loanAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Tenure</span>
                    <span className="font-semibold text-midnight-950">{formData.tenureMonths} Months</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">{isGoldLoan && formData.goldRepaymentMode === 'bullet' ? 'Indicative Settlement at Maturity' : 'Indicative EMI'}</span>
                    <span className="font-semibold text-emerald-700">
                      {isGoldLoan && formData.goldRepaymentMode === 'bullet'
                        ? `₹${formatINRWhole(computedBullet?.totalPayment || 0)} (Maturity)`
                        : `₹${formatINRWhole(computedEmi)}/month`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Initial Queue Status</span>
                    <span className="font-semibold text-warning-600 bg-warning-50 px-2 py-0.5 rounded border border-warning-600/20">
                      SUBMITTED · UNDER_REVIEW
                    </span>
                  </div>
                </div>

                {isGoldLoan ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">Next Step: Branch Gold Appraisal & Valuation</p>
                    <p className="text-amber-800 leading-relaxed">
                      Your loan request is booked. Bring your gold ({formData.goldWeight}g, {formData.goldPurity}) to your nearest FinEdge branch. Our authorized assayer will perform ultrasonic karatage testing in your presence and release instant funds.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-ink-100 bg-porcelain-50 p-3.5 text-xs text-ink-700 space-y-1">
                    <p className="font-semibold text-midnight-950">What happens next?</p>
                    <p className="text-ink-600 leading-relaxed">
                      Your application has moved into the Branch Operations review queue. You can track document verification and sanction progress in your portal.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-500">Application Reference</span>
                  <span className="font-mono font-bold text-midnight-900">
                    {submittedApp.accountApplicationId || submittedApp.cardApplicationId || submittedApp.applicationId || submittedApp.id || 'APP-SAVED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Applicant Name</span>
                  <span className="font-semibold text-midnight-900">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Product Category</span>
                  <span className="font-semibold text-midnight-900">{isCard ? 'Card Operations' : 'Account Onboarding'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Initial Queue Status</span>
                  <span className="font-semibold text-warning-600 bg-warning-50 px-2 py-0.5 rounded border border-warning-600/20">
                    {submittedApp.status || 'UNDER_REVIEW'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose} variant="primary">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form id="apply-product-form" onSubmit={handleSubmit} noValidate className="overflow-y-auto p-6 space-y-6 flex-1">
            {errors.form && (
              <div className="flex items-center gap-2 rounded-lg border border-danger-600/30 bg-danger-50 p-3 text-xs text-danger-600" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {isInvestment ? (
              <InvestmentFormFields
                product={product}
                formData={formData}
                handleChange={handleChange}
                errors={errors}
                user={user}
                accounts={accounts}
                isExpressMode={Boolean(user)}
                isFD={isFD}
                isRD={isRD}
                isSIP={isSIP}
                isSSY={isSSY}
              />
            ) : (
              <>
                {/* Note banner when card was preselected into account form */}
            {cardRequestedNote && (
              <div className="rounded-lg bg-gold-50/80 p-3 border border-gold-200/60 text-xs font-semibold text-midnight-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gold-600" />
                  <span>{cardRequestedNote}</span>
                </div>
                <span className="text-[11px] font-normal text-ink-600">Preselected with this account</span>
              </div>
            )}

            {/* Explainer line for Debit Cards */}
            {isDebitCard && (
              <div className="rounded-lg bg-porcelain-100 p-3.5 border border-ink-100 text-xs text-ink-700 flex items-start gap-2">
                <Info className="h-4 w-4 text-midnight-700 shrink-0 mt-0.5" />
                <span>Debit cards are issued with a FinEdge account. Link an account you hold, or open one with this card.</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Security deposit (Edge Assured Secured Card Only) */}
            {/* ------------------------------------------------------------- */}
            {isAssured && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Security deposit
                </h3>
                <div className="rounded-lg bg-porcelain-100 p-3 text-xs text-ink-700 mb-4 flex items-start gap-2">
                  <Info className="h-4 w-4 text-gold-600 shrink-0 mt-0.5" />
                  <span>No credit-history check — your limit is secured by your deposit.</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-2 block">
                      Deposit Option<span className="text-danger-600"> *</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.fdChoice === 'new' ? 'border-gold-500 bg-gold-50/20' : 'border-ink-200 hover:border-ink-300'
                      }`}>
                        <input
                          type="radio"
                          name="fdChoice"
                          value="new"
                          checked={formData.fdChoice === 'new'}
                          onChange={() => handleChange('fdChoice', 'new')}
                          className="mt-0.5 text-midnight-900 focus:ring-gold-500"
                        />
                        <span className="text-xs text-ink-800 font-medium">
                          Open a new fixed deposit with this application
                        </span>
                      </label>

                      {user ? (
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.fdChoice === 'existing' ? 'border-gold-500 bg-gold-50/20' : 'border-ink-200 hover:border-ink-300'
                        }`}>
                          <input
                            type="radio"
                            name="fdChoice"
                            value="existing"
                            checked={formData.fdChoice === 'existing'}
                            onChange={() => handleChange('fdChoice', 'existing')}
                            className="mt-0.5 text-midnight-900 focus:ring-gold-500"
                          />
                          <span className="text-xs text-ink-800 font-medium">
                            Link my existing FinEdge FD
                          </span>
                        </label>
                      ) : null}
                    </div>
                  </div>

                  {formData.fdChoice === 'existing' && user && (
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Select Existing Fixed Deposit<span className="text-danger-600"> *</span>
                      </label>
                      <select
                        name="existingFdId"
                        value={formData.existingFdId}
                        onChange={(e) => handleChange('existingFdId', e.target.value)}
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                      >
                        <option value="">Select FD...</option>
                        <option value="FD-88219">FD-88219 (₹50,000 · 6.95% p.a. · Matures Dec 2027)</option>
                        <option value="FD-73012">FD-73012 (₹25,000 · 6.75% p.a. · Matures Jun 2028)</option>
                      </select>
                      {errors.existingFdId && <p className="text-xs text-danger-600 mt-1">{errors.existingFdId}</p>}
                    </div>
                  )}

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Fixed Deposit Amount (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="depositAmount"
                      type="number"
                      min="10000"
                      step="1000"
                      value={formData.depositAmount}
                      onChange={(e) => handleChange('depositAmount', e.target.value)}
                      placeholder="e.g. 25000"
                      className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    <p className="text-xs text-ink-500 mt-1">Minimum fixed deposit is ₹10,000</p>
                    {errors.depositAmount && <p className="text-xs text-danger-600 mt-1">{errors.depositAmount}</p>}

                    {Number(formData.depositAmount) > 0 && (
                      <div className="mt-3 rounded-lg bg-gold-50/60 p-2.5 border border-gold-200/60 text-xs font-medium text-midnight-950">
                        Your credit limit will be <span className="font-bold text-midnight-900">{formatINRWhole(computedAssuredLimit)}</span> — {assuredLimitPct}% of your deposit
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: Personal Details */}
            {/* ------------------------------------------------------------- */}
            <div className="border-b border-ink-100 pb-6">
              <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                {isDebitCard
                  ? 'Your details'
                  : isMinor
                  ? 'Guardian details'
                  : isCurrent
                  ? 'Personal details (Authorized Signatory)'
                  : 'Personal details'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                    Full Legal Name<span className="text-danger-600"> *</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                  {errors.fullName && <p className="text-xs text-danger-600 mt-1">{errors.fullName}</p>}
                </div>

                {!isDebitCard && (
                  <>
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Date of Birth<span className="text-danger-600"> *</span>
                      </label>
                      <input
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleChange('dob', e.target.value)}
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                      />
                      <p className="text-xs text-ink-500 mt-1">
                        {isLoan && product?.eligibility
                          ? `Applicant age: ${product.eligibility.ageMin || 18} to ${product.eligibility.ageMax || 70} years`
                          : isStudent
                          ? 'Campus Student Account is for ages 16–25'
                          : 'Applicant must be at least 18 years of age'}
                      </p>
                      {errors.dob && <p className="text-xs text-danger-600 mt-1">{errors.dob}</p>}
                    </div>

                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Gender<span className="text-danger-600"> *</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      {errors.gender && <p className="text-xs text-danger-600 mt-1">{errors.gender}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                    Mobile Number<span className="text-danger-600"> *</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">+91</span>
                    <input
                      name="mobile"
                      type="tel"
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-12 pr-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                  {errors.mobile && <p className="text-xs text-danger-600 mt-1">{errors.mobile}</p>}
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                    Email Address<span className="text-danger-600"> *</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. priya.sharma@example.com"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                  {errors.email && <p className="text-xs text-danger-600 mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: Address & KYC */}
            {/* ------------------------------------------------------------- */}
            {!isDebitCard && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  {isMinor ? 'Guardian address & KYC' : isCurrent ? 'Operating address & KYC' : 'Address & KYC'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Residential Street Address<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="addressLine"
                      type="text"
                      value={formData.addressLine}
                      onChange={(e) => handleChange('addressLine', e.target.value)}
                      placeholder="Flat / House No., Building Name, Street"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.addressLine && <p className="text-xs text-danger-600 mt-1">{errors.addressLine}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      City<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.city && <p className="text-xs text-danger-600 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      State<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.state && <p className="text-xs text-danger-600 mt-1">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      PIN Code<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="pincode"
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 400001"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.pincode && <p className="text-xs text-danger-600 mt-1">{errors.pincode}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Permanent Account Number (PAN)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="panNumber"
                      type="text"
                      maxLength={10}
                      value={formData.panNumber}
                      onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors uppercase"
                    />
                    <p className="text-xs text-ink-500 mt-1">Format: 5 letters, 4 digits, 1 letter</p>
                    {errors.panNumber && <p className="text-xs text-danger-600 mt-1">{errors.panNumber}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Aadhaar Number (12 digits)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="aadhaarNumber"
                      type="password"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={(e) => handleChange('aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="•••• •••• ••••"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors tracking-widest"
                    />
                    <div className="flex items-center justify-between mt-1 text-xs text-ink-500">
                      <span>Masked view: <strong className="font-mono text-ink-700">{maskAadhaar(formData.aadhaarNumber)}</strong></span>
                      <span>Demonstration notice: No actual UIDAI lookup performed</span>
                    </div>
                    {errors.aadhaarNumber && <p className="text-xs text-danger-600 mt-1">{errors.aadhaarNumber}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: Employment & Income (Credit Cards, Accounts, and Loans) */}
            {/* ------------------------------------------------------------- */}
            {(isCreditCard || isSalary || isCurrent || isLoan) && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Employment & income
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Employment Type<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      disabled={isAgriLoan}
                      onChange={(e) => handleChange('employmentType', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors disabled:bg-porcelain-100 disabled:text-ink-600"
                    >
                      {isAgriLoan ? (
                        <option value="Agriculturist">Agriculturist / Farmer</option>
                      ) : (
                        <>
                          <option value="">Select employment type</option>
                          <option value="Salaried">Salaried</option>
                          <option value="Self-employed Business">Self-employed Business</option>
                          <option value="Self-employed Professional">Self-employed Professional (Doctor/CA/Lawyer)</option>
                          <option value="Agriculturist">Agriculturist</option>
                          <option value="Retired">Retired</option>
                        </>
                      )}
                    </select>
                    {errors.employmentType && <p className="text-xs text-danger-600 mt-1">{errors.employmentType}</p>}
                  </div>

                  {!isAgriLoan && (
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        {formData.employmentType?.includes('Self') ? 'Business / Practice Name' : 'Employer Name'}
                        <span className="text-danger-600"> *</span>
                      </label>
                      <input
                        name="employerName"
                        type="text"
                        value={formData.employerName}
                        onChange={(e) => handleChange('employerName', e.target.value)}
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                      />
                      {errors.employerName && <p className="text-xs text-danger-600 mt-1">{errors.employerName}</p>}
                    </div>
                  )}

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Monthly Net Income (₹){!isGoldLoan && !isAssured && <span className="text-danger-600"> *</span>}
                    </label>
                    <input
                      name="monthlyIncome"
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => handleChange('monthlyIncome', e.target.value)}
                      placeholder={isGoldLoan ? 'Optional (secured loan)' : 'e.g. 75000'}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {isGoldLoan && <p className="text-xs text-ink-500 mt-1">Optional for FinEdge Gold Loan (fully secured by pledged ornaments)</p>}
                    {errors.monthlyIncome && <p className="text-xs text-danger-600 mt-1">{errors.monthlyIncome}</p>}
                  </div>

                  {isLoan ? (
                    <>
                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Total Work Experience (Years)
                        </label>
                        <input
                          name="employmentVintage"
                          type="number"
                          min="0"
                          value={formData.employmentVintage}
                          onChange={(e) => handleChange('employmentVintage', e.target.value)}
                          placeholder="e.g. 5"
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Existing Monthly EMIs (₹) <span className="text-xs font-normal text-ink-500">(Enter 0 if none)</span>
                        </label>
                        <input
                          name="existingEmi"
                          type="number"
                          min="0"
                          value={formData.existingEmi}
                          onChange={(e) => handleChange('existingEmi', e.target.value)}
                          placeholder="0"
                          className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Annual Income Bracket<span className="text-danger-600"> *</span>
                      </label>
                      <select
                        name="annualIncomeBracket"
                        value={formData.annualIncomeBracket}
                        onChange={(e) => handleChange('annualIncomeBracket', e.target.value)}
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                      >
                        <option value="">Select annual income bracket</option>
                        <option value="BELOW_5L">Below ₹5 Lakhs</option>
                        <option value="5L_10L">₹5 Lakhs – ₹10 Lakhs</option>
                        <option value="10L_25L">₹10 Lakhs – ₹25 Lakhs</option>
                        <option value="ABOVE_25L">Above ₹25 Lakhs</option>
                      </select>
                      {errors.annualIncomeBracket && <p className="text-xs text-danger-600 mt-1">{errors.annualIncomeBracket}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: Loan Request (Loans Only) */}
            {/* ------------------------------------------------------------- */}
            {isLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Loan request
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Loan Amount (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="loanAmount"
                      type="number"
                      value={formData.loanAmount}
                      onChange={(e) => handleChange('loanAmount', e.target.value)}
                      placeholder={product?.minAmount ? `e.g. ${product.minAmount}` : 'e.g. 500000'}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    <p className="text-xs text-ink-500 mt-1">
                      Allowable range: ₹{product?.minAmount ? formatINRWhole(product.minAmount) : '25,000'} to ₹{product?.maxAmount ? formatINRWhole(product.maxAmount) : '—'}
                    </p>
                    {errors.loanAmount && <p className="text-xs text-danger-600 mt-1">{errors.loanAmount}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Tenure (Months)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="tenureMonths"
                      type="number"
                      min={product?.tenureMinMonths || 12}
                      max={product?.tenureMaxMonths || 360}
                      value={formData.tenureMonths}
                      onChange={(e) => handleChange('tenureMonths', e.target.value)}
                      placeholder={product?.tenureMinMonths ? `e.g. ${product.tenureMinMonths}` : '60'}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    <p className="text-xs text-ink-500 mt-1">
                      Tenure range: {product?.tenureMinMonths || 12} to {product?.tenureMaxMonths || 360} months
                      {product?.tenureMinMonths && product?.tenureMaxMonths && product.tenureMinMonths % 12 === 0 && product.tenureMaxMonths % 12 === 0
                        ? ` (${product.tenureMinMonths / 12} – ${product.tenureMaxMonths / 12} years)`
                        : ''}
                    </p>
                    {errors.tenureMonths && <p className="text-xs text-danger-600 mt-1">{errors.tenureMonths}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Loan Purpose<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="loanPurpose"
                      value={formData.loanPurpose}
                      onChange={(e) => handleChange('loanPurpose', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    >
                      {(LOAN_PURPOSES[slug] || ['General Financing', 'Business Expansion', 'Personal Needs']).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {errors.loanPurpose && <p className="text-xs text-danger-600 mt-1">{errors.loanPurpose}</p>}
                  </div>

                  {/* Indicative EMI / Repayment line */}
                  <div className="sm:col-span-2 rounded-lg border border-ink-100 bg-porcelain-50 p-3.5">
                    {isGoldLoan ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2.5">
                          <span className="text-xs font-semibold text-midnight-950">Repayment Structure</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-ink-700">
                              <input
                                type="radio"
                                name="goldRepaymentMode"
                                value="bullet"
                                checked={formData.goldRepaymentMode === 'bullet'}
                                onChange={(e) => handleChange('goldRepaymentMode', e.target.value)}
                                className="h-3.5 w-3.5 text-midnight-900 focus:ring-gold-500"
                              />
                              Bullet Repayment (At maturity)
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-ink-700">
                              <input
                                type="radio"
                                name="goldRepaymentMode"
                                value="emi"
                                checked={formData.goldRepaymentMode === 'emi'}
                                onChange={(e) => handleChange('goldRepaymentMode', e.target.value)}
                                className="h-3.5 w-3.5 text-midnight-900 focus:ring-gold-500"
                              />
                              Monthly Reducing EMI
                            </label>
                          </div>
                        </div>

                        {numLoanAmount > 0 && numLoanTenure > 0 ? (
                          formData.goldRepaymentMode === 'bullet' && computedBullet ? (
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-xs font-medium text-ink-700">
                                Indicative Settlement at Maturity:{' '}
                                <strong className="text-sm font-bold text-midnight-950">₹{formatINRWhole(computedBullet.totalPayment)}</strong>{' '}
                                (Principal ₹{formatINRWhole(numLoanAmount)} + Simple Interest ₹{formatINRWhole(computedBullet.totalInterest)} at {loanRate}% p.a.)
                              </span>
                              <span className="text-[11px] text-ink-500 italic">
                                Bullet repayment: entire principal and accrued interest paid at end of {numLoanTenure} months.
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-xs font-medium text-ink-700">
                                Indicative Monthly EMI:{' '}
                                <strong className="text-sm font-bold text-midnight-950">₹{formatINRWhole(computedEmi)}/month</strong>{' '}
                                at {loanRate}% p.a. (reducing balance)
                              </span>
                              <span className="text-[11px] text-ink-500 italic">
                                Labelled indicative — final rate confirmed upon physical branch assay.
                              </span>
                            </div>
                          )
                        ) : (
                          <p className="text-xs text-ink-500">
                            Enter loan amount and tenure to view indicative repayment figures at {loanRate}% p.a.
                          </p>
                        )}
                      </div>
                    ) : (
                      numLoanAmount > 0 && numLoanTenure > 0 && computedEmi > 0 ? (
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-ink-700">
                            Indicative EMI:{' '}
                            <strong className="text-sm font-bold text-midnight-950">₹{formatINRWhole(computedEmi)}/month</strong>{' '}
                            at {loanRate}% p.a. (starting rate)
                          </span>
                          <span className="text-[11px] text-ink-500 italic">
                            Labelled indicative — final rate confirmed after assessment.
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-500">
                          Enter loan amount and tenure to view indicative monthly EMI. Rates start from {loanRate}% p.a. (reducing balance).
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: Per-Loan Specific Details (Fix 3) */}
            {/* ------------------------------------------------------------- */}

            {/* Home Loan: Property & Co-applicant */}
            {isHomeLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Property & co-applicant
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Property Status<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="homePropertyStatus"
                      value={formData.homePropertyStatus}
                      onChange={(e) => handleChange('homePropertyStatus', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    >
                      <option value="Ready to move">Ready to move</option>
                      <option value="Under construction">Under construction</option>
                      <option value="Resale">Resale property</option>
                      <option value="Self-construction plot">Plot + Self construction</option>
                    </select>
                    {errors.homePropertyStatus && <p className="text-xs text-danger-600 mt-1">{errors.homePropertyStatus}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Property City<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="homePropertyCity"
                      type="text"
                      value={formData.homePropertyCity}
                      onChange={(e) => handleChange('homePropertyCity', e.target.value)}
                      placeholder="e.g. Pune"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.homePropertyCity && <p className="text-xs text-danger-600 mt-1">{errors.homePropertyCity}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Property Address<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="homePropertyAddress"
                      type="text"
                      value={formData.homePropertyAddress}
                      onChange={(e) => handleChange('homePropertyAddress', e.target.value)}
                      placeholder="Project Name, Wing/Unit Number, Locality"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.homePropertyAddress && <p className="text-xs text-danger-600 mt-1">{errors.homePropertyAddress}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Estimated Property Value (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="homePropertyValue"
                      type="number"
                      value={formData.homePropertyValue}
                      onChange={(e) => handleChange('homePropertyValue', e.target.value)}
                      placeholder="e.g. 7500000"
                      className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.homePropertyValue && <p className="text-xs text-danger-600 mt-1">{errors.homePropertyValue}</p>}

                    {/* Live LTV check against 85% */}
                    {Number(formData.homePropertyValue) > 0 && numLoanAmount > 0 && (
                      <div className="mt-2 text-xs">
                        {(() => {
                          const ltv = (numLoanAmount / Number(formData.homePropertyValue)) * 100;
                          const maxLtv = product?.maxLtvPct || 85;
                          if (ltv <= maxLtv) {
                            return (
                              <span className="text-emerald-700 font-medium">
                                Loan is {ltv.toFixed(1)}% of property value — within the {maxLtv}% LTV limit.
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-danger-600 font-medium">
                                Loan is {ltv.toFixed(1)}% of property value — exceeds the {maxLtv}% limit (max loan: ₹{formatINRWhole(Number(formData.homePropertyValue) * (maxLtv / 100))}).
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Optional Co-applicant */}
                  <div className="sm:col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="homeHasCoApplicant"
                        checked={formData.homeHasCoApplicant}
                        onChange={(e) => handleChange('homeHasCoApplicant', e.target.checked)}
                        className="h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                      />
                      <span className="text-xs font-semibold text-ink-800">
                        Add a co-applicant to enhance loan eligibility (optional)
                      </span>
                    </label>

                    {formData.homeHasCoApplicant && (
                      <div className="mt-3 p-4 rounded-xl border border-ink-100 bg-porcelain-50 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Co-applicant Name<span className="text-danger-600"> *</span>
                          </label>
                          <input
                            name="homeCoApplicantName"
                            type="text"
                            value={formData.homeCoApplicantName}
                            onChange={(e) => handleChange('homeCoApplicantName', e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          />
                          {errors.homeCoApplicantName && <p className="text-xs text-danger-600 mt-1">{errors.homeCoApplicantName}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Relationship<span className="text-danger-600"> *</span>
                          </label>
                          <select
                            name="homeCoApplicantRelationship"
                            value={formData.homeCoApplicantRelationship}
                            onChange={(e) => handleChange('homeCoApplicantRelationship', e.target.value)}
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Child">Child</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Monthly Income (₹)<span className="text-danger-600"> *</span>
                          </label>
                          <input
                            name="homeCoApplicantIncome"
                            type="number"
                            value={formData.homeCoApplicantIncome}
                            onChange={(e) => handleChange('homeCoApplicantIncome', e.target.value)}
                            placeholder="e.g. 50000"
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          />
                          {errors.homeCoApplicantIncome && <p className="text-xs text-danger-600 mt-1">{errors.homeCoApplicantIncome}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Loan: Vehicle Details */}
            {isVehicleLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Vehicle details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Vehicle Type<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={(e) => handleChange('vehicleType', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    >
                      <option value="New Car">New Passenger Car</option>
                      <option value="Used Car">Pre-owned / Used Car</option>
                      <option value="Two Wheeler">Two Wheeler</option>
                      <option value="Commercial Vehicle">Commercial Vehicle</option>
                    </select>
                    {errors.vehicleType && <p className="text-xs text-danger-600 mt-1">{errors.vehicleType}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Make & Model<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="vehicleMakeModel"
                      type="text"
                      value={formData.vehicleMakeModel}
                      onChange={(e) => handleChange('vehicleMakeModel', e.target.value)}
                      placeholder="e.g. Tata Nexon EV Empowered"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.vehicleMakeModel && <p className="text-xs text-danger-600 mt-1">{errors.vehicleMakeModel}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      On-road Quotation Price (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="vehicleOnRoadPrice"
                      type="number"
                      value={formData.vehicleOnRoadPrice}
                      onChange={(e) => handleChange('vehicleOnRoadPrice', e.target.value)}
                      placeholder="e.g. 1500000"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.vehicleOnRoadPrice && <p className="text-xs text-danger-600 mt-1">{errors.vehicleOnRoadPrice}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Customer Down Payment (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="vehicleDownPayment"
                      type="number"
                      value={formData.vehicleDownPayment}
                      onChange={(e) => handleChange('vehicleDownPayment', e.target.value)}
                      placeholder="e.g. 300000"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.vehicleDownPayment && <p className="text-xs text-danger-600 mt-1">{errors.vehicleDownPayment}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Dealer / Showroom Name <span className="text-xs font-normal text-ink-500">(Optional)</span>
                    </label>
                    <input
                      name="vehicleDealerName"
                      type="text"
                      value={formData.vehicleDealerName}
                      onChange={(e) => handleChange('vehicleDealerName', e.target.value)}
                      placeholder="e.g. Wasan Motors, Chembur"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Education Loan: Student & Course */}
            {isEducationLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Student & course details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Applicant Is<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="eduApplicantRole"
                      value={formData.eduApplicantRole}
                      onChange={(e) => handleChange('eduApplicantRole', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    >
                      <option value="Student">Student (Primary Applicant)</option>
                      <option value="Parent / Guardian">Parent / Guardian (Co-applicant Led)</option>
                    </select>
                  </div>

                  {formData.eduApplicantRole === 'Parent / Guardian' ? (
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Student Full Legal Name<span className="text-danger-600"> *</span>
                      </label>
                      <input
                        name="eduStudentName"
                        type="text"
                        value={formData.eduStudentName}
                        onChange={(e) => handleChange('eduStudentName', e.target.value)}
                        placeholder="e.g. Rohan Sharma"
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                      />
                      {errors.eduStudentName && <p className="text-xs text-danger-600 mt-1">{errors.eduStudentName}</p>}
                    </div>
                  ) : (
                    <div>
                      <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                        Admission Status<span className="text-danger-600"> *</span>
                      </label>
                      <select
                        name="eduAdmissionStatus"
                        value={formData.eduAdmissionStatus}
                        onChange={(e) => handleChange('eduAdmissionStatus', e.target.value)}
                        className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                      >
                        <option value="Confirmed">Confirmed Admission Offer</option>
                        <option value="Applied / Awaiting result">Applied / Awaiting Entrance Result</option>
                        <option value="Shortlisted">Shortlisted for Counseling</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Course Name<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="eduCourseName"
                      type="text"
                      value={formData.eduCourseName}
                      onChange={(e) => handleChange('eduCourseName', e.target.value)}
                      placeholder="e.g. Master of Science in Data Science"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.eduCourseName && <p className="text-xs text-danger-600 mt-1">{errors.eduCourseName}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Institute & City / Country<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="eduInstitute"
                      type="text"
                      value={formData.eduInstitute}
                      onChange={(e) => handleChange('eduInstitute', e.target.value)}
                      placeholder="e.g. University of Toronto, Canada"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.eduInstitute && <p className="text-xs text-danger-600 mt-1">{errors.eduInstitute}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Total Course Fee (Tuition + Living) (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="eduCourseFee"
                      type="number"
                      value={formData.eduCourseFee}
                      onChange={(e) => handleChange('eduCourseFee', e.target.value)}
                      placeholder="e.g. 2500000"
                      className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.eduCourseFee && <p className="text-xs text-danger-600 mt-1">{errors.eduCourseFee}</p>}
                  </div>

                  {/* Mandatory Co-applicant for Education Loan */}
                  <div className="sm:col-span-2 pt-2">
                    <div className="p-4 rounded-xl border border-ink-100 bg-porcelain-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-midnight-950 uppercase tracking-wide">
                          Co-applicant / Financial Guarantor (Mandatory)
                        </h4>
                        <span className="text-[11px] text-ink-500">Parent / Legal Guardian</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Full Name<span className="text-danger-600"> *</span>
                          </label>
                          <input
                            name="eduCoApplicantName"
                            type="text"
                            value={formData.eduCoApplicantName}
                            onChange={(e) => handleChange('eduCoApplicantName', e.target.value)}
                            placeholder="e.g. Suresh Sharma"
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          />
                          {errors.eduCoApplicantName && <p className="text-xs text-danger-600 mt-1">{errors.eduCoApplicantName}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Relationship<span className="text-danger-600"> *</span>
                          </label>
                          <select
                            name="eduCoApplicantRelationship"
                            value={formData.eduCoApplicantRelationship}
                            onChange={(e) => handleChange('eduCoApplicantRelationship', e.target.value)}
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          >
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Legal Guardian">Legal Guardian</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-ink-700 mb-1 block">
                            Monthly Income (₹)<span className="text-danger-600"> *</span>
                          </label>
                          <input
                            name="eduCoApplicantIncome"
                            type="number"
                            value={formData.eduCoApplicantIncome}
                            onChange={(e) => handleChange('eduCoApplicantIncome', e.target.value)}
                            placeholder="e.g. 85000"
                            className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                          />
                          {errors.eduCoApplicantIncome && <p className="text-xs text-danger-600 mt-1">{errors.eduCoApplicantIncome}</p>}
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-600 leading-relaxed pt-1">
                        Education loans are assessed primarily on the co-applicant’s income profile. Full EMIs begin after the moratorium period (course duration + 12 months).
                      </p>
                    </div>
                  </div>

                  {/* Conditional Collateral Details for loans > ₹7.5 Lakh */}
                  {Number(formData.loanAmount) > (product?.collateralThresholdAmount || 750000) && (
                    <div className="sm:col-span-2 pt-2">
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-midnight-950 uppercase tracking-wide">
                            Collateral Details (Required for loans exceeding ₹7.5 Lakh)
                          </h4>
                          <span className="text-[11px] font-medium text-amber-800">Tangible Security Required</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-ink-700 mb-1 block">
                              Collateral Type<span className="text-danger-600"> *</span>
                            </label>
                            <select
                              name="eduCollateralType"
                              value={formData.eduCollateralType}
                              onChange={(e) => handleChange('eduCollateralType', e.target.value)}
                              className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                            >
                              <option value="Residential / Commercial Property">Residential / Commercial Property</option>
                              <option value="Fixed Deposit (FinEdge or Scheduled Bank)">Fixed Deposit (Bank Term Deposit)</option>
                              <option value="Government Securities / NSC / LIC Policy">Government Securities / NSC / LIC Surrender Value</option>
                            </select>
                            {errors.eduCollateralType && <p className="text-xs text-danger-600 mt-1">{errors.eduCollateralType}</p>}
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-ink-700 mb-1 block">
                              Estimated Collateral Value (₹)<span className="text-danger-600"> *</span>
                            </label>
                            <input
                              name="eduCollateralValue"
                              type="number"
                              value={formData.eduCollateralValue}
                              onChange={(e) => handleChange('eduCollateralValue', e.target.value)}
                              placeholder="e.g. 1500000"
                              className="h-[38px] w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-gold-500"
                            />
                            {errors.eduCollateralValue && <p className="text-xs text-danger-600 mt-1">{errors.eduCollateralValue}</p>}
                          </div>
                        </div>
                        <p className="text-[11px] text-ink-600 leading-relaxed">
                          Under FinEdge lending policy and IBA model guidelines, education loans up to ₹7.5 Lakh require zero collateral (only co-obligation of parent/guardian). Loans above ₹7.5 Lakh require tangible collateral security covering 100% of the loan amount.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business Growth Loan: Business Details */}
            {isBusinessLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Business details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Registered Business Name<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="bizBusinessName"
                      type="text"
                      value={formData.bizBusinessName}
                      onChange={(e) => handleChange('bizBusinessName', e.target.value)}
                      placeholder="e.g. Apex Industrial Solutions LLP"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.bizBusinessName && <p className="text-xs text-danger-600 mt-1">{errors.bizBusinessName}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Constitution<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="bizConstitution"
                      value={formData.bizConstitution}
                      onChange={(e) => handleChange('bizConstitution', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="Partnership">Partnership Firm</option>
                      <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                      <option value="Private Limited Company">Private Limited Company</option>
                    </select>
                    {errors.bizConstitution && <p className="text-xs text-danger-600 mt-1">{errors.bizConstitution}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Applicant's Role in Business<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="bizApplicantRole"
                      value={formData.bizApplicantRole}
                      onChange={(e) => handleChange('bizApplicantRole', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Proprietor">Proprietor</option>
                      <option value="Managing Partner">Managing Partner</option>
                      <option value="Director">Director</option>
                      <option value="Promoter">Promoter</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      GSTIN {formData.bizConstitution !== 'Sole Proprietorship' && <span className="text-danger-600"> *</span>}
                    </label>
                    <input
                      name="bizGstin"
                      type="text"
                      maxLength={15}
                      value={formData.bizGstin}
                      onChange={(e) => handleChange('bizGstin', e.target.value.toUpperCase())}
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500 uppercase"
                    />
                    {errors.bizGstin && <p className="text-xs text-danger-600 mt-1">{errors.bizGstin}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Years in Business (Vintage)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="bizYearsInBusiness"
                      type="number"
                      min="2"
                      value={formData.bizYearsInBusiness}
                      onChange={(e) => handleChange('bizYearsInBusiness', e.target.value)}
                      placeholder="e.g. 4"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    <p className="text-xs text-ink-500 mt-1">Minimum 2 years of operation required</p>
                    {errors.bizYearsInBusiness && <p className="text-xs text-danger-600 mt-1">{errors.bizYearsInBusiness}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Annual Business Turnover (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="bizAnnualTurnover"
                      type="number"
                      value={formData.bizAnnualTurnover}
                      onChange={(e) => handleChange('bizAnnualTurnover', e.target.value)}
                      placeholder="e.g. 5000000"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    <p className="text-xs text-ink-500 mt-1">Minimum annual turnover: ₹25,00,000</p>
                    {errors.bizAnnualTurnover && <p className="text-xs text-danger-600 mt-1">{errors.bizAnnualTurnover}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Business Operating Address<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="bizAddress"
                      type="text"
                      value={formData.bizAddress}
                      onChange={(e) => handleChange('bizAddress', e.target.value)}
                      placeholder="Registered Office / Manufacturing Unit Address"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.bizAddress && <p className="text-xs text-danger-600 mt-1">{errors.bizAddress}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Krishi Agriculture Loan: Land & Crop */}
            {isAgriLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Land & crop details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Cultivated Land Area (Acres)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="agriLandArea"
                      type="number"
                      step="0.5"
                      value={formData.agriLandArea}
                      onChange={(e) => handleChange('agriLandArea', e.target.value)}
                      placeholder="e.g. 4.5"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.agriLandArea && <p className="text-xs text-danger-600 mt-1">{errors.agriLandArea}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Survey / Khata / 7-12 Number<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="agriSurveyKhata"
                      type="text"
                      value={formData.agriSurveyKhata}
                      onChange={(e) => handleChange('agriSurveyKhata', e.target.value)}
                      placeholder="e.g. 142/3A"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.agriSurveyKhata && <p className="text-xs text-danger-600 mt-1">{errors.agriSurveyKhata}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Village & Taluk / District<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="agriVillageTaluk"
                      type="text"
                      value={formData.agriVillageTaluk}
                      onChange={(e) => handleChange('agriVillageTaluk', e.target.value)}
                      placeholder="e.g. Baramati, Pune District"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.agriVillageTaluk && <p className="text-xs text-danger-600 mt-1">{errors.agriVillageTaluk}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Crop Type / Allied Activity<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="agriCropType"
                      type="text"
                      value={formData.agriCropType}
                      onChange={(e) => handleChange('agriCropType', e.target.value)}
                      placeholder="e.g. Sugarcane & Soybean"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.agriCropType && <p className="text-xs text-danger-600 mt-1">{errors.agriCropType}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Cropping Season<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="agriSeason"
                      value={formData.agriSeason}
                      onChange={(e) => handleChange('agriSeason', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Kharif">Kharif Season (Monsoon)</option>
                      <option value="Rabi">Rabi Season (Winter)</option>
                      <option value="Perennial / Commercial">Perennial / Commercial</option>
                      <option value="Horticulture / Allied">Horticulture / Dairy / Allied</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Irrigation Source<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="agriIrrigation"
                      value={formData.agriIrrigation}
                      onChange={(e) => handleChange('agriIrrigation', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Canal Irrigation">Canal Irrigation</option>
                      <option value="Borewell / Tube well">Borewell / Tube well</option>
                      <option value="Drip / Sprinkler">Drip / Micro-sprinkler</option>
                      <option value="Rain-fed">Rain-fed</option>
                      <option value="River / Lift">River / Lift Irrigation</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Gold Loan: Gold Details */}
            {isGoldLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Gold details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Total Weight of Gold (Grams)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="goldWeight"
                      type="number"
                      step="0.1"
                      min="1"
                      value={formData.goldWeight}
                      onChange={(e) => handleChange('goldWeight', e.target.value)}
                      placeholder="e.g. 50"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.goldWeight && <p className="text-xs text-danger-600 mt-1">{errors.goldWeight}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Gold Purity<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="goldPurity"
                      value={formData.goldPurity}
                      onChange={(e) => handleChange('goldPurity', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="22K (91.6% purity)">22K (91.6% purity) — Standard Ornaments</option>
                      <option value="20K (83.3% purity)">20K (83.3% purity)</option>
                      <option value="18K (75.0% purity)">18K (75.0% purity)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Gold Item Type<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="goldType"
                      value={formData.goldType}
                      onChange={(e) => handleChange('goldType', e.target.value)}
                      className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Gold Jewellery / Ornaments">Gold Jewellery / Ornaments</option>
                      <option value="Specially minted gold coins (up to 50g per customer)">Specially minted gold coins (up to 50g per customer)</option>
                    </select>
                    <p className="text-xs text-ink-500 mt-1">
                      Per RBI master directions, 24K bullion / bars and gold coins exceeding 50g are not accepted. Only hallmarked 18K–22K jewellery and bank-minted coins (≤ 50g) are eligible.
                    </p>
                  </div>

                  <div className="sm:col-span-2 rounded-lg border border-ink-100 bg-porcelain-50 p-3.5 text-xs text-ink-700 space-y-1">
                    <p className="font-semibold text-midnight-950">Statutory RBI Guideline</p>
                    <p className="text-ink-600 leading-relaxed">
                      Up to {product?.maxLtvPct || 75}% of the assessed gold value is financeable. Gold rate appraisal occurs at the branch during physical assay. No illustrative per-gram rates are hard-coded in this portal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loan Against Property: Property & End-use */}
            {isLapLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Property & end-use details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Property Type<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="lapPropertyType"
                      value={formData.lapPropertyType}
                      onChange={(e) => handleChange('lapPropertyType', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Residential (Self-occupied)">Residential (Self-occupied)</option>
                      <option value="Residential (Rented out)">Residential (Rented out)</option>
                      <option value="Commercial Office / Retail">Commercial Office / Retail Unit</option>
                      <option value="Industrial">Industrial Property</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Ownership Structure<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="lapOwnership"
                      value={formData.lapOwnership}
                      onChange={(e) => handleChange('lapOwnership', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Sole Ownership">Sole Ownership</option>
                      <option value="Joint Ownership">Joint Ownership</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Property Address<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="lapPropertyAddress"
                      type="text"
                      value={formData.lapPropertyAddress}
                      onChange={(e) => handleChange('lapPropertyAddress', e.target.value)}
                      placeholder="Complete Postal Address of Property Offered as Security"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.lapPropertyAddress && <p className="text-xs text-danger-600 mt-1">{errors.lapPropertyAddress}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Estimated Market Value (₹)<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="lapPropertyValue"
                      type="number"
                      value={formData.lapPropertyValue}
                      onChange={(e) => handleChange('lapPropertyValue', e.target.value)}
                      placeholder="e.g. 10000000"
                      className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.lapPropertyValue && <p className="text-xs text-danger-600 mt-1">{errors.lapPropertyValue}</p>}

                    {/* Live LTV check against 60% */}
                    {Number(formData.lapPropertyValue) > 0 && numLoanAmount > 0 && (
                      <div className="mt-2 text-xs">
                        {(() => {
                          const ltv = (numLoanAmount / Number(formData.lapPropertyValue)) * 100;
                          const maxLtv = product?.maxLtvPct || 60;
                          if (ltv <= maxLtv) {
                            return (
                              <span className="text-emerald-700 font-medium">
                                Loan is {ltv.toFixed(1)}% of property market value — within the {maxLtv}% LTV policy limit.
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-danger-600 font-medium">
                                Loan is {ltv.toFixed(1)}% of property market value — exceeds the {maxLtv}% limit (max loan: ₹{formatINRWhole(Number(formData.lapPropertyValue) * (maxLtv / 100))}).
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Existing Loan on Property?<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="lapHasExistingLoan"
                      value={formData.lapHasExistingLoan}
                      onChange={(e) => handleChange('lapHasExistingLoan', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="No">No — Property is Debt-Free</option>
                      <option value="Yes">Yes — Existing Mortgage / Loan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      End-use Declaration<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="lapEndUse"
                      value={formData.lapEndUse}
                      onChange={(e) => handleChange('lapEndUse', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="Business expansion">Business expansion</option>
                      <option value="Working capital">Working capital</option>
                      <option value="Debt consolidation">Debt consolidation & loan buyout</option>
                      <option value="Higher education">Higher education of children</option>
                      <option value="Medical expenses">Medical expenses</option>
                      <option value="Other personal lawful use">Other lawful personal use</option>
                    </select>
                    {errors.lapEndUse && <p className="text-xs text-danger-600 mt-1">{errors.lapEndUse}</p>}
                  </div>

                  {formData.lapHasExistingLoan === 'Yes' && (
                    <>
                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Existing Lender Name<span className="text-danger-600"> *</span>
                        </label>
                        <input
                          name="lapExistingLender"
                          type="text"
                          value={formData.lapExistingLender}
                          onChange={(e) => handleChange('lapExistingLender', e.target.value)}
                          placeholder="e.g. HDFC Bank"
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                        />
                        {errors.lapExistingLender && <p className="text-xs text-danger-600 mt-1">{errors.lapExistingLender}</p>}
                      </div>

                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Outstanding Loan Balance (₹)<span className="text-danger-600"> *</span>
                        </label>
                        <input
                          name="lapExistingBalance"
                          type="number"
                          value={formData.lapExistingBalance}
                          onChange={(e) => handleChange('lapExistingBalance', e.target.value)}
                          placeholder="e.g. 1200000"
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                        />
                        {errors.lapExistingBalance && <p className="text-xs text-danger-600 mt-1">{errors.lapExistingBalance}</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: Disbursal & Repayment (Loans Only) */}
            {/* ------------------------------------------------------------- */}
            {isLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Disbursal & repayment
                </h3>
                <div className="space-y-4">
                  <p className="text-xs text-ink-600 leading-relaxed">
                    Loan proceeds will be disbursed into your FinEdge operative account, and monthly EMIs will be automatically debited from the same account.
                  </p>

                  <div className="space-y-3">
                    {user && accounts.length > 0 && !formData.noFinEdgeAccountYet && (
                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Select FinEdge Operative Account<span className="text-danger-600"> *</span>
                        </label>
                        <select
                          name="loanDisbursalAccountId"
                          value={formData.loanDisbursalAccountId}
                          onChange={(e) => handleChange('loanDisbursalAccountId', e.target.value)}
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                        >
                          {accounts.map((a) => (
                            <option key={a.accountId} value={a.accountId}>
                              {a.accountType} · {a.accountNumber} (Available: ₹{formatINRWhole(a.balance)})
                            </option>
                          ))}
                        </select>
                        {errors.loanDisbursalAccountId && <p className="text-xs text-danger-600 mt-1">{errors.loanDisbursalAccountId}</p>}
                      </div>
                    )}

                    {(!user || accounts.length === 0) && !formData.noFinEdgeAccountYet && (
                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          FinEdge 14-digit Account Number<span className="text-danger-600"> *</span>
                        </label>
                        <input
                          name="loanDisbursalAccountNumber"
                          type="text"
                          maxLength={14}
                          value={formData.loanDisbursalAccountNumber}
                          onChange={(e) => handleChange('loanDisbursalAccountNumber', e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 10023412001928"
                          className="h-[42px] w-full sm:w-1/2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                        />
                        {errors.loanDisbursalAccountNumber && <p className="text-xs text-danger-600 mt-1">{errors.loanDisbursalAccountNumber}</p>}
                      </div>
                    )}

                    <div>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.noFinEdgeAccountYet}
                          onChange={(e) => handleChange('noFinEdgeAccountYet', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                        />
                        <span className="text-xs text-ink-700">
                          <strong className="font-semibold text-midnight-950">I don't have a FinEdge account yet</strong> — proceed with this loan application. An operative savings/current account will be opened for you alongside loan sanction.
                        </span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name="consentNach"
                          checked={formData.consentNach}
                          onChange={(e) => handleChange('consentNach', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                        />
                        <span className="text-xs text-ink-700">
                          <strong className="font-semibold text-midnight-950">NACH / e-Mandate Authorization:</strong> I authorize FinEdge Bank to set up an automated monthly debit (NACH mandate) on the designated account for scheduled EMI repayment.<span className="text-danger-600"> *</span>
                        </span>
                      </label>
                      {errors.consentNach && <p className="text-xs text-danger-600 mt-1">{errors.consentNach}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Card Preferences (Credit Cards Only) */}
            {/* ------------------------------------------------------------- */}
            {isCreditCard && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Card preferences
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Name on Card<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="nameOnCard"
                      type="text"
                      maxLength={21}
                      value={formData.nameOnCard}
                      onChange={(e) => handleChange('nameOnCard', e.target.value.toUpperCase())}
                      placeholder="e.g. PRIYA SHARMA"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors uppercase"
                    />
                    <p className="text-xs text-ink-500 mt-1">Printed on the card exactly as entered (max 21 characters)</p>
                    {errors.nameOnCard && <p className="text-xs text-danger-600 mt-1">{errors.nameOnCard}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Requested Credit Limit (₹) <span className="text-xs font-normal text-ink-500">(Optional)</span>
                    </label>
                    <input
                      name="requestedLimit"
                      type="number"
                      value={formData.requestedLimit}
                      onChange={(e) => handleChange('requestedLimit', e.target.value)}
                      placeholder={product?.creditLimitRange ? `e.g. ${product.creditLimitRange.min}` : 'e.g. 50000'}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                    {errors.requestedLimit && <p className="text-xs text-danger-600 mt-1">{errors.requestedLimit}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Child Details (Sprout Minor Only) */}
            {/* ------------------------------------------------------------- */}
            {isMinor && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Child details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Child Full Legal Name<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="childName"
                      type="text"
                      value={formData.childName}
                      onChange={(e) => handleChange('childName', e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.childName && <p className="text-xs text-danger-600 mt-1">{errors.childName}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Child Date of Birth<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="childDob"
                      type="date"
                      value={formData.childDob}
                      onChange={(e) => handleChange('childDob', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    />
                    <p className="text-xs text-ink-500 mt-1">Must be under 18 years of age</p>
                    {errors.childDob && <p className="text-xs text-danger-600 mt-1">{errors.childDob}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Relationship to the Child<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="guardianRelationship"
                      value={formData.guardianRelationship}
                      onChange={(e) => handleChange('guardianRelationship', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="">Select relationship</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Legal Guardian">Court-Appointed Legal Guardian</option>
                    </select>
                    {errors.guardianRelationship && <p className="text-xs text-danger-600 mt-1">{errors.guardianRelationship}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Student Details (Campus Student Only) */}
            {/* ------------------------------------------------------------- */}
            {isStudent && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Student details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      College / University Name<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="college"
                      type="text"
                      value={formData.college}
                      onChange={(e) => handleChange('college', e.target.value)}
                      placeholder="e.g. St. Xavier's College"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.college && <p className="text-xs text-danger-600 mt-1">{errors.college}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Course & Year<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="courseYear"
                      type="text"
                      value={formData.courseYear}
                      onChange={(e) => handleChange('courseYear', e.target.value)}
                      placeholder="e.g. B.Tech Computer Science - Year 2"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.courseYear && <p className="text-xs text-danger-600 mt-1">{errors.courseYear}</p>}
                  </div>
                </div>

                {isStudentMinor && (
                  <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50/30 p-4 space-y-4">
                    <h4 className="text-[13px] font-semibold text-midnight-950">
                      Parent / Guardian details (Required for age 16–17)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Guardian Full Name<span className="text-danger-600"> *</span>
                        </label>
                        <input
                          name="studentGuardianName"
                          type="text"
                          value={formData.studentGuardianName}
                          onChange={(e) => handleChange('studentGuardianName', e.target.value)}
                          placeholder="e.g. Rajesh Sharma"
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                        />
                        {errors.studentGuardianName && <p className="text-xs text-danger-600 mt-1">{errors.studentGuardianName}</p>}
                      </div>

                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Guardian Date of Birth<span className="text-danger-600"> *</span>
                        </label>
                        <input
                          name="studentGuardianDob"
                          type="date"
                          value={formData.studentGuardianDob}
                          onChange={(e) => handleChange('studentGuardianDob', e.target.value)}
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                        />
                        {errors.studentGuardianDob && <p className="text-xs text-danger-600 mt-1">{errors.studentGuardianDob}</p>}
                      </div>

                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Guardian Mobile Number<span className="text-danger-600"> *</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">+91</span>
                          <input
                            name="studentGuardianMobile"
                            type="tel"
                            maxLength={10}
                            value={formData.studentGuardianMobile}
                            onChange={(e) => handleChange('studentGuardianMobile', e.target.value.replace(/\D/g, ''))}
                            placeholder="10-digit mobile number"
                            className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-12 pr-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                          />
                        </div>
                        {errors.studentGuardianMobile && <p className="text-xs text-danger-600 mt-1">{errors.studentGuardianMobile}</p>}
                      </div>

                      <div>
                        <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                          Guardian Relationship<span className="text-danger-600"> *</span>
                        </label>
                        <select
                          name="studentGuardianRelationship"
                          value={formData.studentGuardianRelationship}
                          onChange={(e) => handleChange('studentGuardianRelationship', e.target.value)}
                          className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                        >
                          <option value="">Select relationship</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                        </select>
                        {errors.studentGuardianRelationship && <p className="text-xs text-danger-600 mt-1">{errors.studentGuardianRelationship}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Nominee Details (Accounts Only - Excluded for Cards and Loans) */}
            {/* ------------------------------------------------------------- */}
            {!isCard && !isLoan && (
              <div className="border-b border-ink-100 pb-6">
                <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
                  Nominee details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Nominee Full Name<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="nomineeName"
                      type="text"
                      value={formData.nomineeName}
                      onChange={(e) => handleChange('nomineeName', e.target.value)}
                      placeholder="e.g. Sunita Sharma"
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500"
                    />
                    {errors.nomineeName && <p className="text-xs text-danger-600 mt-1">{errors.nomineeName}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Nominee Relationship<span className="text-danger-600"> *</span>
                    </label>
                    <select
                      name="nomineeRelationship"
                      value={formData.nomineeRelationship}
                      onChange={(e) => handleChange('nomineeRelationship', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    >
                      <option value="">Select relationship</option>
                      <option value="SPOUSE">Spouse</option>
                      <option value="PARENT">Parent</option>
                      <option value="CHILD">Child</option>
                      <option value="SIBLING">Sibling</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {errors.nomineeRelationship && <p className="text-xs text-danger-600 mt-1">{errors.nomineeRelationship}</p>}
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                      Nominee Date of Birth<span className="text-danger-600"> *</span>
                    </label>
                    <input
                      name="nomineeDob"
                      type="date"
                      value={formData.nomineeDob}
                      onChange={(e) => handleChange('nomineeDob', e.target.value)}
                      className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500"
                    />
                    {errors.nomineeDob && <p className="text-xs text-danger-600 mt-1">{errors.nomineeDob}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Fulfilment Note for Gold Loan */}
            {/* ------------------------------------------------------------- */}
            {isGoldLoan && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Branch Appraisal & Physical Disbursal</p>
                  <p className="text-amber-800 leading-relaxed">
                    Gold loans complete at a branch: your gold is valued and the final amount confirmed there. This application books your request and branch appointment.
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION: Consents & Declarations */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              <h3 className="text-[13px] font-semibold text-midnight-900">
                Consents & declarations
              </h3>

              {/* Tax Residency & PEP (Shared across Accounts, Credit Cards, and Loans) */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declTaxResident"
                    checked={formData.declTaxResident}
                    onChange={(e) => handleChange('declTaxResident', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I declare that I am an Indian citizen and an Indian tax resident and not a tax resident of any other jurisdiction.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {errors.declTaxResident && <p className="text-xs text-danger-600 pl-7">{errors.declTaxResident}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declNotPep"
                    checked={formData.declNotPep}
                    onChange={(e) => handleChange('declNotPep', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I confirm that I am not a Politically Exposed Person (PEP) or related to one, per RBI master directions.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {errors.declNotPep && <p className="text-xs text-danger-600 pl-7">{errors.declNotPep}</p>}

                {/* CIC Credit Bureau Consent (All Loans and Unsecured Credit Cards) */}
                {(isLoan || isStandardCredit || (isCurrent && formData.requestOverdraft)) && (
                  <>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentCicBureau"
                        checked={formData.consentCicBureau}
                        onChange={(e) => handleChange('consentCicBureau', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                      />
                      <span className="text-xs leading-relaxed text-ink-700">
                        I authorize FinEdge Bank to pull and assess my credit information report from CIBIL, Experian, Equifax, or CRIF High Mark for credit underwriting.<span className="text-danger-600"> *</span>
                      </span>
                    </label>
                    {errors.consentCicBureau && <p className="text-xs text-danger-600 pl-7">{errors.consentCicBureau}</p>}
                  </>
                )}

                {/* Loan MITC Consent (Loans Only) */}
                {isLoan && (
                  <>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentMitc"
                        checked={formData.consentMitc}
                        onChange={(e) => handleChange('consentMitc', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                      />
                      <span className="text-xs leading-relaxed text-ink-700">
                        I have read and agree to the Most Important Terms & Conditions (MITC) for the <strong className="text-midnight-950">{product?.name}</strong>: interest rates {product?.rateMin?.toFixed(2)}% – {product?.rateMax?.toFixed(2)}% p.a., processing fee {product?.processingFee?.pct}% (min {product?.processingFee?.min === 0 ? 'Nil' : `${formatINRWhole(product?.processingFee?.min || 0)}`}). Floating-rate loans carry zero prepayment penalty.<span className="text-danger-600"> *</span>
                      </span>
                    </label>
                    {errors.consentMitc && <p className="text-xs text-danger-600 pl-7">{errors.consentMitc}</p>}
                  </>
                )}

                {/* Account Opening Terms (Accounts Only - Deleted from Loans and Cards) */}
                {!isCard && !isLoan && (
                  <>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentKycTerms"
                        checked={formData.consentKycTerms}
                        onChange={(e) => handleChange('consentKycTerms', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                      />
                      <span className="text-xs leading-relaxed text-ink-700">
                        I agree to the FinEdge Bank General Terms and Conditions, Schedule of Charges, and privacy policy for opening this account.<span className="text-danger-600"> *</span>
                      </span>
                    </label>
                    {errors.consentKycTerms && <p className="text-xs text-danger-600 pl-7">{errors.consentKycTerms}</p>}
                  </>
                )}

                {/* Credit Card MITC */}
                {isCreditCard && (
                  <>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentCardTerms"
                        checked={formData.consentCardTerms}
                        onChange={(e) => handleChange('consentCardTerms', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                      />
                      <span className="text-xs leading-relaxed text-ink-700">
                        I have read and agree to the Most Important Terms & Conditions (MITC) and cardholder agreement for the <strong className="text-midnight-950">{product?.name}</strong>.<span className="text-danger-600"> *</span>
                      </span>
                    </label>
                    {errors.consentCardTerms && <p className="text-xs text-danger-600 pl-7">{errors.consentCardTerms}</p>}
                  </>
                )}

                {/* Marketing Opt-in (Optional, unticked) */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="optInMarketing"
                    checked={formData.optInMarketing}
                    onChange={(e) => handleChange('optInMarketing', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-600">
                    I would like to receive product updates, offers and newsletters from FinEdge Bank.
                  </span>
                </label>
              </div>
            </div>
              </>
            )}

            {/* Sticky Modal Footer */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-ink-100 bg-white/95 px-6 py-4 backdrop-blur-sm -mx-6 -mb-6 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !isRequiredConsentMet}
              >
                {loading
                  ? 'Submitting...'
                  : isDebitCard && formData.debitLinkType === 'new'
                  ? 'Continue to Account Opening'
                  : 'Submit Application'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApplyModal;
