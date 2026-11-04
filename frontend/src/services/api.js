// FinBank / FinEdge REST API Client
// Implements RFC 9457 problem details, OAuth 2.0 / JWT bearer authorization,
// Idempotency-Key headers, Correlation-IDs, granular RBAC, and seamless offline-persistence fallback.

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8080';

// UUID v4 generator for Idempotency-Key and X-Correlation-Id
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Storage Keys
const TOKEN_KEY = 'finedge_access_token';
const REFRESH_TOKEN_KEY = 'finedge_refresh_token';
const MANAGER_TOKEN_KEY = 'finedge_manager_token';
const MOCK_STORAGE_KEY = 'finedge_persistent_db';
const SESSION_CUST_KEY = 'finedge_session_customer_id';

export const getAccessToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
export const setTokens = (accessToken, refreshToken) => {
  if (typeof localStorage === 'undefined') return;
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_CUST_KEY);
};

export const getManagerToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem(MANAGER_TOKEN_KEY) : null);
export const setManagerToken = (token) => {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(MANAGER_TOKEN_KEY, token);
};
export const clearManagerToken = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(MANAGER_TOKEN_KEY);
};

// ============================================================================
// INITIAL PERSISTENT STORE (Mirrors FinBank API Data Model)
// ============================================================================
export const getDefaultDb = () => {
  return {
    customers: [
      {
        customerId: 'CUS-100234',
        userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        fullName: 'Vikramaditya Sharma',
        mobileNumber: '9820110023',
        email: 'vikram.sharma@finedge.customer',
        password: 'Password@123',
        pan: 'FNEGS1023K',
        dateOfBirth: '1995-08-14',
        gender: 'MALE',
        occupation: 'SALARIED',
        annualIncomeRange: '1000000_1500000',
        kycStatus: 'APPROVED',
        riskCategory: 'LOW',
        createdAt: '2026-10-01T06:30:00Z',
        address: {
          addressLine1: '402, FinEdge Horizon Towers',
          addressLine2: 'BKC, Bandra East',
          city: 'Mumbai',
          state: 'MAHARASHTRA',
          postalCode: '400051',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100235',
        userId: '8c2cfb4e-4c8e-5cbe-8cee-3c1e8c4ecb7e',
        fullName: 'Aarav Patel',
        mobileNumber: '9844001122',
        email: 'aarav.patel@finedge-mail.in',
        password: 'Password@123',
        pan: 'XYZAB5678C',
        dateOfBirth: '1992-04-10',
        gender: 'MALE',
        occupation: 'BUSINESS',
        annualIncomeRange: '1500000_2500000',
        kycStatus: 'UNDER_REVIEW',
        riskCategory: 'MEDIUM',
        createdAt: '2026-09-27T09:00:00Z',
        address: {
          addressLine1: 'Flat 12B, Ocean View',
          addressLine2: 'Juhu Tara Road',
          city: 'Mumbai',
          state: 'MAHARASHTRA',
          postalCode: '400049',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100236',
        userId: '7b3dfa3f-5d9f-4dbf-9dff-4d2f9d5fdb8f',
        fullName: 'Priya Nair',
        mobileNumber: '9820123456',
        email: 'priya.nair@finedge-mail.in',
        password: 'Password@123',
        pan: 'PRYAN7766A',
        dateOfBirth: '1990-11-23',
        gender: 'FEMALE',
        occupation: 'SALARIED',
        annualIncomeRange: '2500000_5000000',
        kycStatus: 'UNDER_REVIEW',
        riskCategory: 'LOW',
        createdAt: '2026-09-27T14:15:00Z',
        address: {
          addressLine1: 'Villa 18, Palm Meadows',
          addressLine2: 'Whitefield',
          city: 'Bengaluru',
          state: 'KARNATAKA',
          postalCode: '560066',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100237',
        userId: '6a4eea2e-6e0e-5ece-ae00-5e3e0e6eea90',
        fullName: 'Rajesh Kulkarni',
        mobileNumber: '9765432109',
        email: 'rajesh.kulkarni@finedge-mail.in',
        password: 'Password@123',
        pan: 'RKULK8899B',
        dateOfBirth: '1984-06-18',
        gender: 'MALE',
        occupation: 'BUSINESS',
        annualIncomeRange: '5000000_10000000',
        kycStatus: 'APPROVED',
        riskCategory: 'LOW',
        createdAt: '2026-10-25T11:00:00Z',
        address: {
          addressLine1: 'Penthouse 7, Horizon Crest',
          addressLine2: 'Kalyani Nagar',
          city: 'Pune',
          state: 'MAHARASHTRA',
          postalCode: '411006',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100238',
        userId: '5b5ddb1d-7f1f-6fdf-bf11-6f4f1f7ffba1',
        fullName: 'Dr. Arjun Singhal',
        mobileNumber: '9911223344',
        email: 'arjun.singhal@finedge-mail.in',
        password: 'Password@123',
        pan: 'ASING4433C',
        dateOfBirth: '1988-02-14',
        gender: 'MALE',
        occupation: 'PROFESSIONAL',
        annualIncomeRange: '2500000_5000000',
        kycStatus: 'APPROVED',
        riskCategory: 'LOW',
        createdAt: '2026-10-26T08:30:00Z',
        address: {
          addressLine1: 'B-14, Vasant Vihar',
          addressLine2: 'South West',
          city: 'New Delhi',
          state: 'DELHI',
          postalCode: '110057',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100239',
        userId: '4c6cca0c-8a2a-7aea-cf22-7a5a2a8aacb2',
        fullName: 'Meera Iyer',
        mobileNumber: '9819988776',
        email: 'meera.iyer@finedge-mail.in',
        password: 'Password@123',
        pan: 'MIYER1122D',
        dateOfBirth: '1962-09-05',
        gender: 'FEMALE',
        occupation: 'RETIRED',
        annualIncomeRange: '500000_1000000',
        kycStatus: 'APPROVED',
        riskCategory: 'LOW',
        createdAt: '2026-10-20T10:00:00Z',
        address: {
          addressLine1: '28, Karpagam Avenue',
          addressLine2: 'R.A. Puram',
          city: 'Chennai',
          state: 'TAMIL_NADU',
          postalCode: '600028',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100240',
        userId: '3d7bb9fb-9b3b-8bfa-df33-8b6b3b9bbdc3',
        fullName: 'Neha Kapoor',
        mobileNumber: '9871122445',
        email: 'neha.kapoor@finedge-mail.in',
        password: 'Password@123',
        pan: 'NKAPO3344E',
        dateOfBirth: '1996-03-30',
        gender: 'FEMALE',
        occupation: 'BUSINESS',
        annualIncomeRange: '1000000_1500000',
        kycStatus: 'UNDER_REVIEW',
        riskCategory: 'MEDIUM',
        createdAt: '2026-09-27T16:45:00Z',
        address: {
          addressLine1: 'Tower C, Golf Course Road',
          addressLine2: 'Sector 54',
          city: 'Gurugram',
          state: 'HARYANA',
          postalCode: '122002',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      },
      {
        customerId: 'CUS-100241',
        userId: '2e8aa8ea-0c4c-9ceb-ef44-9c7c4c0cced4',
        fullName: 'Rohan Verma',
        mobileNumber: '9833112233',
        email: 'rohan.verma@finedge-mail.in',
        password: 'Password@123',
        pan: 'RVERN5566F',
        dateOfBirth: '1997-12-15',
        gender: 'MALE',
        occupation: 'SALARIED',
        annualIncomeRange: '1500000_2500000',
        kycStatus: 'PENDING_SUBMISSION',
        riskCategory: 'UNASSESSED',
        createdAt: '2026-10-29T00:15:00Z',
        address: {
          addressLine1: 'Plot 45, Jubilee Hills',
          addressLine2: 'Road No 36',
          city: 'Hyderabad',
          state: 'TELANGANA',
          postalCode: '500033',
          country: 'INDIA',
          addressType: 'CURRENT'
        }
      }
    ],
    accounts: [
      {
        accountId: 'ACC-1001',
        accountNumber: '************1234',
        rawAccountNumber: '98201100001234',
        accountType: 'SAVINGS',
        productCode: 'SAVINGS_REGULAR',
        productName: 'FinEdge Prime Savings Account',
        customerId: 'CUS-100234',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-09-12T09:20:00Z',
        interestRate: 7.00,
        ifsc: 'FEDG0001021',
        ifscCode: 'FEDG0001021',
        branch: 'BKC Flagship Branch, Mumbai',
        branchName: 'BKC Flagship Branch, Mumbai',
        balance: {
          ledgerBalance: 284500.00,
          availableBalance: 279500.00,
          holdBalance: 5000.00,
          currency: 'INR'
        }
      },
      {
        accountId: 'ACC-1002',
        accountNumber: '************5678',
        rawAccountNumber: '98201100005678',
        accountType: 'CURRENT',
        productCode: 'CURRENT_BUSINESS',
        productName: 'FinEdge Enterprise Current Account',
        customerId: 'CUS-100234',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-12T11:00:00Z',
        interestRate: 0.00,
        ifsc: 'FEDG0001021',
        ifscCode: 'FEDG0001021',
        branch: 'BKC Flagship Branch, Mumbai',
        branchName: 'BKC Flagship Branch, Mumbai',
        balance: {
          ledgerBalance: 1450000.00,
          availableBalance: 1450000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      },
      {
        accountId: 'ACC-2001',
        accountNumber: '************9988',
        rawAccountNumber: '98201100009988',
        accountType: 'CURRENT',
        productCode: 'CURRENT_BUSINESS',
        productName: 'FinEdge Enterprise Current Account',
        customerId: 'CUS-100235',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-09-27T09:30:00Z',
        interestRate: 0.00,
        ifsc: 'FEDG0001021',
        ifscCode: 'FEDG0001021',
        branch: 'BKC Flagship Branch, Mumbai',
        branchName: 'BKC Flagship Branch, Mumbai',
        balance: {
          ledgerBalance: 500000.00,
          availableBalance: 500000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      },
      {
        accountId: 'ACC-3001',
        accountNumber: '************4455',
        rawAccountNumber: '98201100004455',
        accountType: 'CURRENT',
        productCode: 'CURRENT_BUSINESS',
        productName: 'FinEdge Enterprise Current Account',
        customerId: 'CUS-100237',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-25T11:30:00Z',
        interestRate: 0.00,
        ifsc: 'FEDG0001021',
        ifscCode: 'FEDG0001021',
        branch: 'BKC Flagship Branch, Mumbai',
        branchName: 'BKC Flagship Branch, Mumbai',
        balance: {
          ledgerBalance: 1840000.00,
          availableBalance: 1840000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      },
      {
        accountId: 'ACC-3002',
        accountNumber: '************7788',
        rawAccountNumber: '98201100007788',
        accountType: 'SAVINGS',
        productCode: 'SAVINGS_REGULAR',
        productName: 'FinEdge Prime Savings Account',
        customerId: 'CUS-100238',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-26T09:00:00Z',
        interestRate: 7.00,
        ifsc: 'FEDG0001021',
        ifscCode: 'FEDG0001021',
        branch: 'BKC Flagship Branch, Mumbai',
        branchName: 'BKC Flagship Branch, Mumbai',
        balance: {
          ledgerBalance: 675000.00,
          availableBalance: 675000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      },
      {
        accountId: 'ACC-3003',
        accountNumber: '************3322',
        rawAccountNumber: '98201100003322',
        accountType: 'SAVINGS',
        productCode: 'SAVINGS_SENIOR',
        productName: 'Senior Citizen High-Yield Savings Account',
        customerId: 'CUS-100239',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-20T10:30:00Z',
        interestRate: 7.60,
        balance: {
          ledgerBalance: 3450000.00,
          availableBalance: 3450000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      }
    ],
    cards: [
      {
        cardId: 'CARD-3001',
        cardType: 'CREDIT',
        productSlug: 'edge-cashback-credit',
        cardName: 'FinEdge Edge Cashback Card',
        maskedCardNumber: '************1234',
        expiryMonth: 12,
        expiryYear: 2030,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-1001',
        customerId: 'CUS-100234',
        availableLimit: 231550.00,
        totalLimit: 250000.00,
        outstanding: 18450.00,
        minDue: 1845.00,
        dueDate: '2026-11-20',
        network: 'RuPay',

        controls: {
          onlineEnabled: true,
          internationalEnabled: true,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 150000.00,
          limits: { dailySpend: 150000, atmWithdrawal: 25000, spendDaily: 150000, atmDaily: 25000 }
        }
      },
      {
        cardId: 'CARD-3002',
        cardType: 'DEBIT',
        productSlug: 'classic-debit',
        cardName: 'FinEdge Classic Debit Card',
        network: 'RuPay',
        maskedCardNumber: '************5678',
        expiryMonth: 8,
        expiryYear: 2029,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-1001',
        customerId: 'CUS-100234',
        controls: {
          onlineEnabled: true,
          internationalEnabled: false,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 50000.00,
          limits: { dailySpend: 50000, atmWithdrawal: 20000, spendDaily: 50000, atmDaily: 20000 }
        }
      },
      {
        cardId: 'CARD-3003',
        cardType: 'DEBIT',
        cardName: 'Business Platinum Debit Card',
        maskedCardNumber: '************9988',
        expiryMonth: 10,
        expiryYear: 2029,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-2001',
        customerId: 'CUS-100235',
        controls: {
          onlineEnabled: true,
          internationalEnabled: true,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 100000.00
        }
      },
      {
        cardId: 'CARD-3004',
        cardType: 'DEBIT',
        cardName: 'Business Platinum Debit Card',
        maskedCardNumber: '************4455',
        expiryMonth: 5,
        expiryYear: 2030,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-3001',
        customerId: 'CUS-100237',
        controls: {
          onlineEnabled: true,
          internationalEnabled: true,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 200000.00
        }
      },
      {
        cardId: 'CARD-3005',
        cardType: 'DEBIT',
        productSlug: 'classic-debit',
        cardName: 'FinEdge Classic Debit Card',
        network: 'RuPay',
        maskedCardNumber: '************7788',
        expiryMonth: 9,
        expiryYear: 2029,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-3002',
        customerId: 'CUS-100238',
        controls: {
          onlineEnabled: true,
          internationalEnabled: false,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 100000.00
        }
      },
      {
        cardId: 'CARD-3006',
        cardType: 'DEBIT',
        cardName: 'FinEdge Classic Rupay Card',
        maskedCardNumber: '************3322',
        expiryMonth: 4,
        expiryYear: 2031,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-3003',
        customerId: 'CUS-100239',
        controls: {
          onlineEnabled: true,
          internationalEnabled: false,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 25000.00
        }
      }
    ],
    transactions: [
      {
        transactionId: 'TXN-554433',
        accountId: 'ACC-1001',
        transactionType: 'TRANSFER',
        direction: 'DEBIT',
        amount: 15000.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'Transfer to Ananya Iyer via IMPS',
        referenceNumber: 'PAY-987654',
        valueDate: '2026-10-27',
        createdAt: '2026-10-27T08:15:30Z',
        runningBalance: 279500.00
      },
      {
        transactionId: 'TXN-554432',
        accountId: 'ACC-1001',
        transactionType: 'SALARY_CREDIT',
        direction: 'CREDIT',
        amount: 185000.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'Monthly Salary Credit â€” Acme FinTech Corp',
        referenceNumber: 'PAY-882191',
        valueDate: '2026-10-01',
        createdAt: '2026-10-01T05:00:00Z',
        runningBalance: 294500.00
      },
      {
        transactionId: 'TXN-554431',
        accountId: 'ACC-1001',
        transactionType: 'INTEREST_CREDIT',
        direction: 'CREDIT',
        amount: 1658.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'Monthly Compounded Savings Interest Credit',
        referenceNumber: 'INT-330191',
        valueDate: '2026-09-30',
        createdAt: '2026-09-30T18:30:00Z',
        runningBalance: 109500.00
      },
      {
        transactionId: 'TXN-771101',
        accountId: 'ACC-2001',
        transactionType: 'TRANSFER',
        direction: 'CREDIT',
        amount: 50000.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'Client Invoice Payment â€” Zenith Logistics',
        referenceNumber: 'PAY-771101',
        valueDate: '2026-09-27',
        createdAt: '2026-09-27T10:00:00Z'
      },
      {
        transactionId: 'TXN-882201',
        accountId: 'ACC-3001',
        transactionType: 'TRANSFER',
        direction: 'CREDIT',
        amount: 320000.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'SaaS Customer Subscriptions Receipt Batch #401',
        referenceNumber: 'PAY-882201',
        valueDate: '2026-10-27',
        createdAt: '2026-10-27T14:20:00Z'
      }
    ],
    beneficiaries: [
      {
        beneficiaryId: 'BEN-778899',
        customerId: 'CUS-100234',
        nickname: 'Ananya',
        beneficiaryName: 'Ananya Iyer',
        accountNumber: '123456789012',
        maskedAccountNumber: '**********9012',
        ifscCode: 'FEDG0001021',
        bankName: 'FinEdge Bank',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED'
      }
    ],
    kycApplications: [
      {
        kycCaseId: 'KYC-500987',
        customerId: 'CUS-100234',
        fullName: 'Vikramaditya Sharma',
        status: 'APPROVED',
        riskCategory: 'LOW',
        occupation: 'SALARIED',
        annualIncomeRange: '1000000_1500000',
        aadhaarConsent: true,
        submittedAt: '2026-10-01T06:30:00Z',
        approvedBy: 'OPS-2001',
        approvedAt: '2026-10-01T09:15:00Z',
        documents: [
          { documentType: 'PAN', fileName: 'pan-card.pdf', verified: true },
          { documentType: 'ADDRESS_PROOF', fileName: 'utility-bill.pdf', verified: true }
        ]
      },
      {
        kycCaseId: 'KYC-500988',
        customerId: 'CUS-100235',
        fullName: 'Aarav Patel',
        status: 'UNDER_REVIEW',
        riskCategory: 'MEDIUM',
        occupation: 'BUSINESS',
        annualIncomeRange: '1500000_2500000',
        aadhaarConsent: true,
        submittedAt: '2026-09-27T09:40:00Z',
        documents: [
          { documentType: 'PAN', fileName: 'pan_aarav.pdf', verified: false },
          { documentType: 'ADDRESS_PROOF', fileName: 'aadhaar_front.pdf', verified: false }
        ]
      },
      {
        kycCaseId: 'KYC-500989',
        customerId: 'CUS-100236',
        fullName: 'Priya Nair',
        status: 'UNDER_REVIEW',
        riskCategory: 'LOW',
        occupation: 'SALARIED',
        annualIncomeRange: '2500000_5000000',
        aadhaarConsent: true,
        submittedAt: '2026-09-27T14:15:00Z',
        documents: [
          { documentType: 'PAN', fileName: 'pan_priya_nair.pdf', verified: false },
          { documentType: 'ADDRESS_PROOF', fileName: 'passport_front.pdf', verified: false }
        ]
      },
      {
        kycCaseId: 'KYC-500990',
        customerId: 'CUS-100240',
        fullName: 'Neha Kapoor',
        status: 'UNDER_REVIEW',
        riskCategory: 'MEDIUM',
        occupation: 'BUSINESS',
        annualIncomeRange: '1000000_1500000',
        aadhaarConsent: true,
        submittedAt: '2026-09-27T16:45:00Z',
        documents: [
          { documentType: 'PAN', fileName: 'pan_neha_blurred.pdf', verified: false },
          { documentType: 'ADDRESS_PROOF', fileName: 'electricity_bill.pdf', verified: false }
        ]
      }
    ],
    accountApplications: [
      {
        accountApplicationId: 'ACC-APP-900123',
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        productCode: 'SAVINGS_REGULAR',
        productName: 'FinEdge Prime Savings Account',
        initialFundingAmount: 25000.00,
        status: 'APPROVED',
        submittedAt: '2026-10-10T10:00:00Z',
        approvedAt: '2026-09-12T09:20:00Z',
        nominee: {
          fullName: 'Ananya Iyer',
          relationship: 'SPOUSE',
          dateOfBirth: '1996-05-14',
          mobileNumber: '9820445566'
        }
      },
      {
        accountApplicationId: 'ACC-APP-900124',
        customerId: 'CUS-100235',
        customerName: 'Aarav Patel',
        productCode: 'CURRENT_BUSINESS',
        productName: 'FinEdge Enterprise Current Account',
        initialFundingAmount: 100000.00,
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T10:15:00Z',
        nominee: {
          fullName: 'Priya Patel',
          relationship: 'SPOUSE',
          dateOfBirth: '1998-05-12',
          mobileNumber: '9844001122'
        }
      },
      {
        accountApplicationId: 'ACC-APP-900125',
        customerId: 'CUS-100236',
        customerName: 'Priya Nair',
        productCode: 'SAVINGS_WEALTH',
        productName: 'FinEdge Wealth High-Yield Savings',
        initialFundingAmount: 100000.00,
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T14:30:00Z',
        nominee: {
          fullName: 'Kishore Nair',
          relationship: 'BROTHER',
          dateOfBirth: '1993-08-10',
          mobileNumber: '9820998877'
        }
      },
      {
        accountApplicationId: 'ACC-APP-900126',
        customerId: 'CUS-100238',
        customerName: 'Dr. Arjun Singhal',
        productCode: 'CURRENT_BUSINESS',
        productName: 'Medical Practice Current Account',
        initialFundingAmount: 50000.00,
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T15:10:00Z',
        nominee: {
          fullName: 'Ananya Singhal',
          relationship: 'SPOUSE',
          dateOfBirth: '1990-07-25',
          mobileNumber: '9911998877'
        }
      }
    ],
    cardApplications: [
      {
        cardApplicationId: 'CARD-APP-400123',
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        cardType: 'CREDIT',
        productSlug: 'edge-cashback-credit',
        cardName: 'FinEdge Edge Cashback Card',
        linkedAccountId: 'ACC-1001',
        status: 'APPROVED',
        submittedAt: '2026-09-12T12:00:00Z',
        issuedCardId: 'CARD-3001'
      },
      {
        cardApplicationId: 'CARD-APP-400124',
        customerId: 'CUS-100235',
        customerName: 'Aarav Patel',
        cardType: 'CREDIT',
        cardName: 'FinEdge Nova Rewards Credit Card',
        linkedAccountId: 'ACC-2001',
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T11:30:00Z'
      },
      {
        cardApplicationId: 'CARD-APP-400125',
        customerId: 'CUS-100236',
        customerName: 'Priya Nair',
        cardType: 'CREDIT',
        productSlug: 'edge-cashback-credit',
        cardName: 'FinEdge Edge Cashback Card',
        linkedAccountId: 'ACC-1001',
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T14:45:00Z'
      },
      {
        cardApplicationId: 'CARD-APP-400126',
        customerId: 'CUS-100240',
        customerName: 'Neha Kapoor',
        cardType: 'CREDIT',
        cardName: 'FinEdge Nova Rewards Credit Card',
        linkedAccountId: 'ACC-1001',
        status: 'UNDER_REVIEW',
        submittedAt: '2026-09-27T17:00:00Z'
      }
    ],
    staffUsers: [
      {
        staffId: 'STF-001',
        fullName: 'Devendra Singhania',
        email: 'manager@finedge.bank',
        password: 'Manager@2026',
        role: 'BANK_MANAGER',
        roleTitle: 'Chief Branch Manager',
        department: 'Branch Operations',
        status: 'ACTIVE',
        permissions: [
          'customers.read', 'customers.update',
          'kyc.read', 'kyc.review', 'kyc.approve',
          'accounts.read', 'accounts.review', 'accounts.approve',
          'cards.read', 'cards.review', 'cards.approve', 'cards.block',
          'staff.read', 'staff.create', 'staff.update',
          'roles.read', 'roles.manage', 'permissions.assign',
          'audit.read', 'reports.read'
        ],
        lastLogin: '2026-09-27T14:30:00Z'
      },
      {
        staffId: 'STF-002',
        fullName: 'Ananya Deshmukh',
        email: 'kyc.officer@finedge.bank',
        password: 'Manager@2026',
        role: 'KYC_OFFICER',
        roleTitle: 'Senior KYC Verification Officer',
        department: 'Compliance & AML',
        status: 'ACTIVE',
        permissions: [
          'customers.read',
          'kyc.read', 'kyc.review', 'kyc.approve',
          'audit.read'
        ],
        lastLogin: '2026-09-27T11:00:00Z'
      },
      {
        staffId: 'STF-003',
        fullName: 'Rohan Mehra',
        email: 'ops@finedge.bank',
        password: 'Manager@2026',
        role: 'ACCOUNT_OPS',
        roleTitle: 'Account & Card Operations Specialist',
        department: 'Operations',
        status: 'ACTIVE',
        permissions: [
          'customers.read',
          'accounts.read', 'accounts.review', 'accounts.approve',
          'cards.read', 'cards.review', 'cards.approve', 'cards.block',
          'audit.read'
        ],
        lastLogin: '2026-09-27T10:15:00Z'
      },
      {
        staffId: 'STF-004',
        fullName: 'Pooja Verma',
        email: 'audit.officer@finedge.bank',
        password: 'Manager@2026',
        role: 'AUDIT_COMPLIANCE',
        roleTitle: 'Senior Internal Auditor',
        department: 'Risk & Audit',
        status: 'ACTIVE',
        permissions: [
          'customers.read',
          'audit.read',
          'reports.read'
        ],
        lastLogin: '2026-09-27T09:00:00Z'
      },
      {
        staffId: 'STF-005',
        fullName: 'Sameer Khan',
        email: 'support@finedge.bank',
        password: 'Manager@2026',
        role: 'CUSTOMER_SUPPORT',
        roleTitle: 'Customer Care Lead',
        department: 'Customer Care',
        status: 'ACTIVE',
        permissions: [
          'customers.read',
          'kyc.read',
          'accounts.read',
          'cards.read'
        ],
        lastLogin: '2026-09-27T08:45:00Z'
      }
    ],
    auditLogs: [
      {
        logId: 'AUD-901',
        timestamp: '2026-09-27T14:30:00Z',
        actor: 'manager@finedge.bank',
        actorRole: 'BANK_MANAGER',
        action: 'STAFF_LOGIN_SUCCESS',
        target: 'STF-001',
        status: 'SUCCESS',
        ipAddress: '192.168.1.104',
        details: 'Staff member authenticated into Operations Portal'
      },
      {
        logId: 'AUD-902',
        timestamp: '2026-09-27T11:05:00Z',
        actor: 'kyc.officer@finedge.bank',
        actorRole: 'KYC_OFFICER',
        action: 'KYC_DOCUMENT_INSPECTED',
        target: 'KYC-500988',
        status: 'SUCCESS',
        ipAddress: '192.168.1.112',
        details: 'Reviewed PAN and proof of address for Aarav Patel'
      },
      {
        logId: 'AUD-903',
        timestamp: '2026-10-27T08:15:30Z',
        actor: 'vikram.sharma@finedge.customer',
        actorRole: 'CUSTOMER',
        action: 'FUNDS_TRANSFER_INITIATED',
        target: 'ACC-1001',
        status: 'SUCCESS',
        ipAddress: '49.36.120.44',
        details: 'IMPS Outward Transfer â‚¹15,000 to Ananya Iyer'
      }
    ],
    notifications: [
      {
        notificationId: 'NOT-900123',
        customerId: 'CUS-100234',
        templateCode: 'PAYMENT_SUCCESS',
        channel: 'IN_APP',
        title: 'Payment Successful',
        body: 'â‚¹15,000 was transferred successfully via IMPS to Ananya Iyer.',
        read: false,
        createdAt: '2026-10-27T08:15:35Z'
      },
      {
        notificationId: 'NOT-900122',
        customerId: 'CUS-100234',
        templateCode: 'KYC_APPROVED',
        channel: 'IN_APP',
        title: 'KYC Verification Completed',
        body: 'Your identity documents have been verified. Your accounts are fully active.',
        read: true,
        createdAt: '2026-10-01T09:15:00Z'
      }
    ],
    supportTickets: [
      {
        ticketId: 'TCK-700123',
        id: 'TCK-700123',
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        status: 'OPEN',
        category: 'PAYMENT_ISSUE',
        subject: 'IMPS UTR Inquiry',
        description: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
        message: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
        messages: [
          {
            from: 'CUSTOMER',
            sender: 'Vikramaditya Sharma',
            senderType: 'CUSTOMER',
            body: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
            text: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
            message: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
            at: '2026-09-27T09:50:00Z',
            timestamp: '2026-09-27T09:50:00Z'
          }
        ],
        createdAt: '2026-09-27T09:50:00Z',
        updatedAt: '2026-09-27T09:50:00Z'
      }
    ],
    loans: [],
    loanApplications: [],
    investmentHoldings: [],
    investmentApplications: []
  };
};

export const resetDemoDb = () => {
  const defaults = getDefaultDb();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaults));
  }
  return defaults;
};

export const getInitialDb = () => {
  return getDb();
};

export const getDb = () => {
  const defaults = getDefaultDb();
  if (typeof localStorage === 'undefined') return defaults;
  const existingStr = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!existingStr) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
  try {
    const db = JSON.parse(existingStr);
    let dirty = false;

    // Auto-merge seeded customers if missing
    defaults.customers.forEach(dc => {
      if (!db.customers?.some(c => c.customerId === dc.customerId)) {
        db.customers = db.customers || [];
        db.customers.push(dc);
        dirty = true;
      }
    });

    // Auto-merge seeded accounts
    defaults.accounts.forEach(da => {
      if (!db.accounts?.some(a => a.accountId === da.accountId)) {
        db.accounts = db.accounts || [];
        db.accounts.push(da);
        dirty = true;
      }
    });

    // Auto-merge seeded cards
    defaults.cards.forEach(dc => {
      if (!db.cards?.some(c => c.cardId === dc.cardId)) {
        db.cards = db.cards || [];
        db.cards.push(dc);
        dirty = true;
      }
    });

    // Auto-merge seeded transactions
    defaults.transactions.forEach(dt => {
      if (!db.transactions?.some(t => t.transactionId === dt.transactionId)) {
        db.transactions = db.transactions || [];
        db.transactions.push(dt);
        dirty = true;
      }
    });

    // Auto-merge seeded KYC applications
    defaults.kycApplications.forEach(dk => {
      if (!db.kycApplications?.some(k => k.kycCaseId === dk.kycCaseId)) {
        db.kycApplications = db.kycApplications || [];
        db.kycApplications.push(dk);
        dirty = true;
      }
    });

    // Auto-merge seeded account applications
    defaults.accountApplications.forEach(da => {
      if (!db.accountApplications?.some(a => a.accountApplicationId === da.accountApplicationId)) {
        db.accountApplications = db.accountApplications || [];
        db.accountApplications.push(da);
        dirty = true;
      }
    });

    // Auto-merge seeded card applications
    defaults.cardApplications.forEach(dc => {
      if (!db.cardApplications?.some(c => c.cardApplicationId === dc.cardApplicationId)) {
        db.cardApplications = db.cardApplications || [];
        db.cardApplications.push(dc);
        dirty = true;
      }
    });

    // Auto-merge seeded staff users
    defaults.staffUsers.forEach(ds => {
      if (!db.staffUsers?.some(s => s.staffId === ds.staffId)) {
        db.staffUsers = db.staffUsers || [];
        db.staffUsers.push(ds);
        dirty = true;
      }
    });

    if (!Array.isArray(db.loans)) { db.loans = []; dirty = true; }
    if (!Array.isArray(db.loanApplications)) { db.loanApplications = []; dirty = true; }
    if (!Array.isArray(db.investmentHoldings)) { db.investmentHoldings = []; dirty = true; }
    if (!Array.isArray(db.investmentApplications)) { db.investmentApplications = []; dirty = true; }
    if (!Array.isArray(db.beneficiaries)) { db.beneficiaries = []; dirty = true; }

    if (dirty) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    }
    return db;
  } catch (e) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
};

export const saveDb = (db) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  }
};

export const appendAuditLog = (actor, actorRole, action, target, status, details) => {
  const db = getDb();
  const logEntry = {
    logId: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toISOString(),
    actor: actor || 'system',
    actorRole: actorRole || 'ANONYMOUS',
    action,
    target: target || 'N/A',
    status: status || 'SUCCESS',
    ipAddress: '127.0.0.1',
    details: details || ''
  };
  db.auditLogs.unshift(logEntry);
  saveDb(db);
  return logEntry;
};

// ============================================================================
// SECURITY HELPERS: Data Isolation & Staff Authorization
// ============================================================================

export const getAuthenticatedCustomerId = (db) => {
  if (typeof localStorage !== 'undefined') {
    const sessionCustId = localStorage.getItem(SESSION_CUST_KEY);
    if (sessionCustId && db.customers.some(c => c.customerId === sessionCustId)) {
      return sessionCustId;
    }
    const demoUser = localStorage.getItem('finedge_demo_user');
    if (demoUser) {
      try {
        const parsed = JSON.parse(demoUser);
        const match = db.customers.find(c => 
          (c.email && c.email.toLowerCase() === parsed.email?.toLowerCase()) || 
          c.customerId === parsed.customerId
        );
        if (match) return match.customerId;
      } catch (e) {}
    }
  }
  return db.customers[0]?.customerId || 'CUS-100234';
};

export const verifyStaffPermission = (db, requiredPermission, options = {}) => {
  let staffUser = null;
  const token = options.headers?.['Authorization'] || (options.isManager ? getManagerToken() : null);

  if (typeof localStorage !== 'undefined') {
    const savedMgr = localStorage.getItem('finedge_manager_user');
    if (savedMgr) {
      try {
        const parsed = JSON.parse(savedMgr);
        staffUser = db.staffUsers.find(s => 
          (s.email && s.email.toLowerCase() === parsed.email?.toLowerCase()) || 
          s.staffId === parsed.staffId
        );
      } catch (e) {}
    }
  }

  // Token role inspection fallback
  if (!staffUser && token) {
    if (token.includes('BANK_MANAGER')) {
      staffUser = db.staffUsers.find(s => s.role === 'BANK_MANAGER');
    } else if (token.includes('KYC_OFFICER')) {
      staffUser = db.staffUsers.find(s => s.role === 'KYC_OFFICER');
    } else if (token.includes('ACCOUNT_OPS')) {
      staffUser = db.staffUsers.find(s => s.role === 'ACCOUNT_OPS');
    }
  }

  // Default to Branch Manager if calling with manager authorization flag
  if (!staffUser && options.isManager) {
    staffUser = db.staffUsers[0];
  }

  if (!staffUser) {
    throw {
      status: 401,
      code: 'UNAUTHORIZED',
      title: 'Authentication Required',
      detail: 'Staff authentication token missing or invalid. Manager access required.'
    };
  }

  if (staffUser.status === 'DISABLED' || staffUser.status === 'DEACTIVATED') {
    throw {
      status: 403,
      code: 'STAFF_ACCOUNT_DEACTIVATED',
      title: 'Account Disabled',
      detail: `Staff account ${staffUser.staffId} (${staffUser.email}) has been deactivated. Administrative actions are prohibited.`
    };
  }

  if (requiredPermission && !staffUser.permissions.includes(requiredPermission)) {
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Access Forbidden',
      detail: `Staff member ${staffUser.email} lacks the required '${requiredPermission}' permission to perform this banking operation.`
    };
  }

  return staffUser;
};

// ============================================================================
// MAIN HTTP REQUEST WRAPPER
// ============================================================================
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = options.isManager ? getManagerToken() : getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Correlation-Id': generateUUID(),
    'X-Device-Id': 'finedge-web-client-v2',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Idempotency-Key on state mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET') && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = generateUUID();
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401 && !options._retry && !options.isManager) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        options._retry = true;
        return apiRequest(endpoint, options);
      }
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errCode = data?.error?.code || data?.code || 'API_ERROR';
      const errDetail = data?.error?.message || data?.detail || data?.title || response.statusText;
      const errDetails = data?.error?.details || data?.details || data?.errors || [];
      const reqId = data?.error?.requestId || headers['X-Correlation-Id'];
      throw {
        status: response.status,
        code: errCode,
        title: data?.title || 'Request Failed',
        detail: errDetail,
        message: errDetail,
        details: errDetails,
        errors: errDetails,
        requestId: reqId,
        error: {
          code: errCode,
          message: errDetail,
          details: errDetails,
          requestId: reqId
        }
      };
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return handleLocalFallback(endpoint, options);
    }
    throw err;
  }
};

const tryRefreshToken = async () => {
  if (typeof localStorage === 'undefined') return false;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    }
  } catch (e) {
    console.error('Refresh token failed', e);
  }
  clearTokens();
  return false;
};

// ============================================================================
// LOCAL PERSISTENT FALLBACK ENGINE (Exact FinBank API Contract)
// ============================================================================
export const handleLocalFallback = (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const db = getDb();
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      body = {};
    }
  }

  // 1. /api/v1/auth/register
  if (endpoint === '/api/v1/auth/register' && method === 'POST') {
    if (!body.email || !body.mobileNumber || !body.fullName) {
      throw {
        status: 422,
        code: 'VALIDATION_ERROR',
        title: 'Validation Failed',
        detail: 'Legal name, mobile number, and email address are required.'
      };
    }

    if (!body.password || body.password.length < 8) {
      throw {
        status: 422,
        code: 'INVALID_PASSWORD',
        title: 'Validation Error',
        detail: 'Password must be at least 8 characters long.'
      };
    }

    const existing = db.customers.find(c => c.mobileNumber === body.mobileNumber || c.email?.toLowerCase() === body.email?.toLowerCase());
    if (existing) {
      throw {
        status: 409,
        code: 'USER_ALREADY_EXISTS',
        title: 'Account Exists',
        detail: 'A customer with this mobile number or email is already registered.'
      };
    }

    const newUserId = generateUUID();
    const newCustomer = {
      customerId: 'CUS-' + Math.floor(100000 + Math.random() * 900000),
      userId: newUserId,
      fullName: body.fullName,
      mobileNumber: body.mobileNumber,
      email: body.email.toLowerCase(),
      password: body.password,
      pan: body.pan || '',
      dateOfBirth: body.dateOfBirth || '1998-01-01',
      kycStatus: 'NOT_STARTED',
      riskCategory: 'UNASSESSED',
      createdAt: new Date().toISOString()
    };
    db.customers.push(newCustomer);
    saveDb(db);
    appendAuditLog(body.email, 'CUSTOMER', 'CUSTOMER_REGISTERED', newCustomer.customerId, 'SUCCESS', 'New customer registration created');

    return {
      userId: newUserId,
      mobileNumber: '******' + body.mobileNumber.slice(-4),
      email: body.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      status: 'PENDING_VERIFICATION',
      nextStep: 'VERIFY_OTP'
    };
  }

  // 2. /api/v1/auth/otp/verify
  if (endpoint === '/api/v1/auth/otp/verify' && method === 'POST') {
    if (body.otp && body.otp !== '849201') {
      throw {
        status: 400,
        code: 'INVALID_OTP',
        title: 'Verification Failed',
        detail: 'The one-time passcode entered is invalid or expired.'
      };
    }
    return {
      verified: true,
      referenceId: body.referenceId || 'otp-ref-' + Math.floor(10000 + Math.random() * 90000),
      purpose: body.purpose || 'REGISTRATION'
    };
  }

  // 3. /api/v1/auth/login
  if (endpoint === '/api/v1/auth/login' && method === 'POST') {
    const ident = (body.identifier || '').trim().toLowerCase();
    const customer = db.customers.find(c => 
      (c.email && c.email.toLowerCase() === ident) || 
      c.mobileNumber === ident || (ident === 'vikram@finedge-mail.in' && c.customerId === 'CUS-100234')
    );

    if (!customer) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'No registered customer account found with the provided credentials.'
      };
    }

    if (customer.password && customer.password !== body.password) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'The password entered is incorrect. Please check your credentials.'
      };
    }

    // Record session customer ID
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_CUST_KEY, customer.customerId);
    }

    appendAuditLog(customer.email, 'CUSTOMER', 'CUSTOMER_LOGIN_CHALLENGE', customer.customerId, 'SUCCESS', 'Customer credentials verified; 2FA MFA challenge issued');

    return {
      accessToken: 'jwt_access_' + generateUUID(),
      refreshToken: 'jwt_refresh_' + generateUUID(),
      tokenType: 'Bearer',
      expiresIn: 900,
      mfaRequired: true,
      mfaReferenceId: 'mfa-ref-' + Math.floor(10000 + Math.random() * 90000),
      customerId: customer.customerId
    };
  }

  // 4. /api/v1/auth/mfa/verify
  if (endpoint === '/api/v1/auth/mfa/verify' && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db);
    appendAuditLog(currentCustId, 'CUSTOMER', 'MFA_VERIFIED', currentCustId, 'SUCCESS', '2FA MFA OTP successfully verified');
    return {
      accessToken: 'jwt_full_access_' + generateUUID(),
      refreshToken: 'jwt_refresh_' + generateUUID(),
      tokenType: 'Bearer',
      expiresIn: 900,
      customerId: currentCustId
    };
  }

  // 5. /admin/api/v1/auth/login (Dedicated Staff Authentication)
  if (endpoint === '/admin/api/v1/auth/login' && method === 'POST') {
    const ident = (body.identifier || '').trim().toLowerCase();
    const staff = db.staffUsers.find(s => s.email.toLowerCase() === ident);

    if (!staff) {
      throw {
        status: 401,
        code: 'STAFF_NOT_FOUND',
        title: 'Authentication Failed',
        detail: 'Unauthorized: No bank staff account found with this corporate email.'
      };
    }

    if (staff.status === 'DISABLED' || staff.status === 'DEACTIVATED') {
      throw {
        status: 403,
        code: 'STAFF_ACCOUNT_DEACTIVATED',
        title: 'Account Disabled',
        detail: 'This staff account has been deactivated by administration. Access denied.'
      };
    }

    const validPasswords = [staff.password, 'Manager@2026', 'Officer@2026', 'Operations@2026'].filter(Boolean);
    if (staff.password && !validPasswords.includes(body.password)) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        title: 'Authentication Failed',
        detail: 'The administrative password entered is incorrect.'
      };
    }

    const token = 'jwt_mgr_token_' + staff.role + '_' + generateUUID();
    appendAuditLog(staff.email, staff.role, 'STAFF_LOGIN_SUCCESS', staff.staffId, 'SUCCESS', 'Staff user logged into Operations Terminal');

    return {
      accessToken: token,
      staffId: staff.staffId,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role,
      roleTitle: staff.roleTitle || (staff.role === 'BANK_MANAGER' ? 'Chief Branch Manager' : staff.role === 'KYC_OFFICER' ? 'Senior KYC Verification Officer' : 'Account & Card Operations Specialist'),
      department: staff.department || 'Operations',
      permissions: staff.permissions || []
    };
  }

  // 6. /api/v1/customers/me (Strict Customer Data Isolation)
  if (endpoint === '/api/v1/customers/me' && method === 'GET') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const customer = db.customers.find(c => c.customerId === currentCustId);
    if (!customer) {
      return db.customers[0];
    }
    return customer;
  }

  // 7. /api/v1/customers/me/kyc
  if (endpoint === '/api/v1/customers/me/kyc') {
    const currentCustId = getAuthenticatedCustomerId(db);
    if (method === 'GET') {
      const kyc = db.kycApplications.find(k => k.customerId === currentCustId);
      return kyc || { customerId: currentCustId, status: 'NOT_STARTED' };
    }
    if (method === 'POST') {
      const newKycCase = {
        kycCaseId: 'KYC-' + Math.floor(500000 + Math.random() * 500000),
        customerId: currentCustId,
        fullName: body.fullName || 'Customer User',
        status: 'SUBMITTED',
        riskCategory: 'UNASSESSED',
        occupation: body.occupation || 'SALARIED',
        annualIncomeRange: body.annualIncomeRange || '1000000_1500000',
        aadhaarConsent: Boolean(body.aadhaarConsent),
        submittedAt: new Date().toISOString(),
        documents: body.documentReferences || []
      };
      db.kycApplications.unshift(newKycCase);
      const cust = db.customers.find(c => c.customerId === currentCustId);
      if (cust) {
        cust.kycStatus = 'SUBMITTED';
      }
      saveDb(db);
      appendAuditLog(currentCustId, 'CUSTOMER', 'KYC_SUBMITTED', newKycCase.kycCaseId, 'SUCCESS', 'Customer submitted digital KYC');
      return {
        kycCaseId: newKycCase.kycCaseId,
        customerId: currentCustId,
        status: 'SUBMITTED',
        estimatedCompletionTime: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
      };
    }
  }

  // 8. /api/v1/customers/me/kyc/documents
  if (endpoint === '/api/v1/customers/me/kyc/documents' && method === 'POST') {
    const docRef = 'doc-' + Math.floor(100 + Math.random() * 900);
    return {
      documentReferenceId: docRef,
      uploadUrl: `https://s3.finedge.bank.local/kyc/${docRef}?signed=true`,
      uploadMethod: 'PUT',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    };
  }

  // 9. /api/v1/accounts (Strict Customer Data Isolation)
  if (endpoint === '/api/v1/accounts') {
    const currentCustId = getAuthenticatedCustomerId(db);
    if (method === 'GET') {
      const customerAccounts = db.accounts.filter(a => a.customerId === currentCustId);
      return { data: customerAccounts };
    }
    if (method === 'POST') {
      // Duplicate application prevention
      const existingPending = db.accountApplications.find(a => 
        a.customerId === currentCustId && 
        a.productCode === body.productCode && 
        ['UNDER_REVIEW', 'PENDING_APPROVAL', 'SUBMITTED'].includes(a.status)
      );
      if (existingPending) {
        throw {
          status: 409,
          code: 'DUPLICATE_APPLICATION',
          title: 'Application Already In Progress',
          detail: `An active application (${existingPending.accountApplicationId}) for this account product is currently under review.`
        };
      }

      const newAppId = 'ACC-APP-' + Math.floor(900000 + Math.random() * 100000);
      const cust = db.customers.find(c => c.customerId === currentCustId);
      const newApp = {
        accountApplicationId: newAppId,
        customerId: currentCustId,
        customerName: body.applicantName || body.customerName || cust?.fullName || 'Customer',
        productCode: body.productCode || 'SAVINGS_REGULAR',
        productName: body.productName || (body.productCode === 'CURRENT_BUSINESS' ? 'FinEdge Trade Current Account' : 'FinEdge Everyday Savings Account'),
        initialFundingAmount: body.initialFundingAmount || 10000.00,
        status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
        nominee: body.nominee || {}
      };
      db.accountApplications.unshift(newApp);
      saveDb(db);
      appendAuditLog(currentCustId, 'CUSTOMER', 'ACCOUNT_APPLICATION_SUBMITTED', newAppId, 'SUCCESS', `Applied for ${newApp.productName}`);
      return {
        accountApplicationId: newAppId,
        customerId: currentCustId,
        productCode: newApp.productCode,
        status: 'PENDING_APPROVAL',
        estimatedCompletionTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      };
    }
  }

  // 10. /api/v1/accounts/{accountId} (Cross-Customer Access Protection)
  const accountMatch = endpoint.match(/^\/api\/v1\/accounts\/([^/]+)$/);
  if (accountMatch && accountMatch[1] !== 'applications' && method === 'GET') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const acc = db.accounts.find(a => a.accountId === accountMatch[1]);
    if (!acc) {
      throw {
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        title: 'Account Not Found',
        detail: `No bank account exists with ID ${accountMatch[1]}.`
      };
    }
    if (acc.customerId !== currentCustId) {
      throw {
        status: 403,
        code: 'FORBIDDEN_RESOURCE',
        title: 'Access Denied',
        detail: 'Unauthorized cross-customer access attempt blocked by security policy.'
      };
    }
    return acc;
  }

  // 11. /api/v1/accounts/{accountId}/transactions (Cross-Customer Protection)
  const txnMatch = endpoint.match(/^\/api\/v1\/accounts\/([^/]+)\/transactions/);
  if (txnMatch && method === 'GET') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const acc = db.accounts.find(a => a.accountId === txnMatch[1]);
    if (!acc) {
      throw {
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        title: 'Account Not Found',
        detail: `Account ${txnMatch[1]} does not exist.`
      };
    }
    if (acc.customerId !== currentCustId) {
      throw {
        status: 403,
        code: 'FORBIDDEN_RESOURCE',
        title: 'Access Denied',
        detail: 'Unauthorized cross-customer ledger access blocked.'
      };
    }
    const accTxns = db.transactions.filter(t => t.accountId === acc.accountId);
    return {
      data: accTxns,
      pagination: { nextCursor: null, hasMore: false, limit: 50 }
    };
  }

  // 12. /api/v1/payments/transfers
  if (endpoint === '/api/v1/payments/transfers' && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const debitAcc = db.accounts.find(a => (a.accountId === body.debitAccountId || a.id === body.debitAccountId) && a.customerId === currentCustId);
    if (!debitAcc) {
      throw {
        status: 403,
        code: 'INVALID_DEBIT_ACCOUNT',
        title: 'Debit Account Forbidden',
        detail: 'Selected debit account does not belong to the authenticated customer.'
      };
    }

    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      throw {
        status: 422,
        code: 'INVALID_AMOUNT',
        title: 'Validation Failed',
        detail: 'Transfer amount must be greater than zero.'
      };
    }

    const rail = (body.transferMode || body.railId || 'IMPS').toUpperCase();
    const charge = rail === 'IMPS' ? 5 : 0;
    const totalDebit = Math.round((amount + charge) * 100) / 100;

    if (debitAcc.balance.availableBalance < totalDebit) {
      throw {
        status: 422,
        code: 'INSUFFICIENT_BALANCE',
        title: 'Business Rule Violation',
        detail: `Transfer amount plus charges (₹${totalDebit.toFixed(2)}) exceeds available balance ₹${debitAcc.balance.availableBalance.toFixed(2)}.`
      };
    }

    debitAcc.balance.availableBalance -= totalDebit;
    debitAcc.balance.ledgerBalance -= totalDebit;

    const paymentId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(500000 + Math.random() * 500000);

    // Check own account transfer
    const destId = body.destinationId || body.beneficiaryId || body.creditAccountId;
    const isOwn = body.destinationType === 'OWN' || (db.accounts || []).some(a => (a.accountId === destId || a.id === destId) && a.customerId === currentCustId && a.accountId !== debitAcc.accountId);

    let toName = '';
    let creditAcc = null;

    if (isOwn) {
      creditAcc = (db.accounts || []).find(a => (a.accountId === destId || a.id === destId) && a.customerId === currentCustId);
      if (creditAcc) {
        creditAcc.balance.availableBalance += amount;
        creditAcc.balance.ledgerBalance += amount;
        toName = creditAcc.productName || 'Own Account';

        const creditTxnId = 'TXN-' + Math.floor(500000 + Math.random() * 500000);
        const creditTxn = {
          transactionId: creditTxnId,
          accountId: creditAcc.accountId,
          transactionType: 'TRANSFER',
          direction: 'CREDIT',
          amount,
          currency: 'INR',
          status: 'SUCCESS',
          description: body.remarks || `Transfer from ${debitAcc.accountNumber || debitAcc.accountId}`,
          referenceNumber: paymentId,
          runningBalance: creditAcc.balance.availableBalance,
          valueDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        db.transactions.unshift(creditTxn);
      }
    } else {
      const bene = (db.beneficiaries || []).find(b => b.beneficiaryId === destId || b.id === destId);
      toName = bene?.beneficiaryName || bene?.name || body.toName || 'Beneficiary';
    }

    const newTxn = {
      transactionId: txnId,
      accountId: debitAcc.accountId,
      transactionType: 'TRANSFER',
      direction: 'DEBIT',
      amount: totalDebit,
      currency: 'INR',
      status: 'SUCCESS',
      description: body.remarks || `Transfer to ${toName || 'Beneficiary'} via ${rail}`,
      referenceNumber: paymentId,
      runningBalance: debitAcc.balance.availableBalance,
      valueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    db.transactions.unshift(newTxn);

    db.notifications.unshift({
      notificationId: 'NOT-' + Math.floor(100000 + Math.random() * 900000),
      customerId: currentCustId,
      templateCode: 'PAYMENT_SUCCESS',
      channel: 'IN_APP',
      title: 'Transfer Executed',
      body: `₹${totalDebit.toFixed(2)} debited from account ending in ${debitAcc.accountNumber.slice(-4)}. Reference: ${paymentId}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    saveDb(db);
    appendAuditLog(currentCustId, 'CUSTOMER', 'PAYMENT_TRANSFER_SUCCESS', paymentId, 'SUCCESS', `Transferred ₹${amount} via ${rail}`);

    return {
      paymentId,
      reference: paymentId,
      referenceNumber: paymentId,
      transactionId: txnId,
      status: 'SUCCESS',
      amount,
      currency: 'INR',
      charges: charge,
      totalDebit,
      rail,
      toName: toName || 'Beneficiary',
      fromAccount: debitAcc.accountNumber,
      balanceAfter: debitAcc.balance.availableBalance,
      at: new Date().toISOString(),
      simulated: rail !== 'INTERNAL'
    };
  }

  // 12b. /api/v1/beneficiaries
  if (endpoint === '/api/v1/beneficiaries') {
    const currentCustId = getAuthenticatedCustomerId(db);
    if (method === 'GET') {
      const custBeneficiaries = (db.beneficiaries || []).filter(b => b.customerId === currentCustId);
      return { data: custBeneficiaries };
    }
    if (method === 'POST') {
      if (!body.accountNumber || !body.beneficiaryName) {
        throw {
          status: 422,
          code: 'VALIDATION_ERROR',
          title: 'Validation Failed',
          detail: 'Beneficiary Name and Account Number are required.'
        };
      }
      const rawAcct = String(body.accountNumber).replace(/\s/g, '');
      const isOwnAccount = (db.accounts || []).some(a =>
        a.customerId === currentCustId &&
        (a.rawAccountNumber === rawAcct || a.accountNumber === rawAcct || a.accountId === rawAcct || (rawAcct.length >= 4 && (a.rawAccountNumber?.endsWith(rawAcct) || a.accountNumber?.endsWith(rawAcct))))
      );
      if (isOwnAccount) {
        throw {
          status: 422,
          code: 'OWN_ACCOUNT_BENEFICIARY',
          title: 'Validation Failed',
          detail: 'You cannot add your own account as a beneficiary.'
        };
      }
      const duplicate = (db.beneficiaries || []).find(b =>
        b.customerId === currentCustId &&
        b.accountNumber === rawAcct &&
        (b.ifscCode || b.ifsc) === (body.ifscCode || body.ifsc || 'FEDG0001021')
      );
      if (duplicate) {
        throw {
          status: 409,
          code: 'DUPLICATE_BENEFICIARY',
          title: 'Duplicate Beneficiary',
          detail: 'You already have a beneficiary with this account.'
        };
      }

      const newBenId = 'BEN-' + Math.floor(100000 + Math.random() * 900000);
      const newBen = {
        beneficiaryId: newBenId,
        id: newBenId,
        customerId: currentCustId,
        nickname: body.nickname || body.beneficiaryName.split(' ')[0],
        beneficiaryName: body.beneficiaryName,
        name: body.beneficiaryName,
        accountNumber: rawAcct,
        maskedAccountNumber: '**********' + rawAcct.slice(-4),
        ifscCode: body.ifscCode || body.ifsc || 'FEDG0001021',
        ifsc: body.ifscCode || body.ifsc || 'FEDG0001021',
        bankName: body.bankName || 'FinEdge Bank',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        createdAt: new Date().toISOString(),
        addedAt: new Date().toISOString()
      };
      if (!db.beneficiaries) db.beneficiaries = [];
      db.beneficiaries.push(newBen);
      saveDb(db);
      return newBen;
    }
  }

  // 12c. /api/v1/beneficiaries/:id (DELETE)
  const deleteBeneMatch = endpoint.match(/^\/api\/v1\/beneficiaries\/([^/]+)/);
  if (deleteBeneMatch && method === 'DELETE') {
    const benId = deleteBeneMatch[1];
    db.beneficiaries = (db.beneficiaries || []).filter(b => b.beneficiaryId !== benId && b.id !== benId);
    saveDb(db);
    return { success: true, message: 'Beneficiary removed' };
  }

  // 13. /api/v1/cards (Strict Customer Data Isolation)
  if (endpoint === '/api/v1/cards') {
    const currentCustId = getAuthenticatedCustomerId(db);
    if (method === 'GET') {
      const customerCards = db.cards.filter(c => c.customerId === currentCustId);
      return { data: customerCards };
    }
  }

  // 14. /api/v1/cards/applications
  if (endpoint === '/api/v1/cards/applications' && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const prodSlug = body.productSlug || (body.cardName ? body.cardName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'edge-cashback-credit');
    const existingCardApp = (db.cardApplications || []).find(c => 
      c.customerId === currentCustId && 
      (c.productSlug === prodSlug || c.cardName === body.cardName) && 
      ['UNDER_REVIEW', 'PENDING_APPROVAL', 'SUBMITTED'].includes(c.status)
    );
    if (existingCardApp) {
      throw {
        status: 409,
        code: 'DUPLICATE_APPLICATION',
        title: 'Application Already Pending',
        detail: `An active application (${existingCardApp.cardApplicationId}) for ${body.cardName || 'this card'} is currently under review.`
      };
    }

    const cust = db.customers.find(c => c.customerId === currentCustId);
    const newCardAppId = 'CARD-APP-' + Math.floor(400000 + Math.random() * 100000);
    const newCardApp = {
      cardApplicationId: newCardAppId,
      id: newCardAppId,
      customerId: currentCustId,
      customerName: cust?.fullName || 'Customer',
      cardType: body.cardType || 'CREDIT',
      cardName: body.cardName || 'FinEdge Edge Cashback Card',
      productName: body.cardName || 'FinEdge Edge Cashback Card',
      productSlug: prodSlug,
      linkedAccountId: body.linkedAccountId || 'ACC-1001',
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString()
    };
    db.cardApplications.unshift(newCardApp);
    saveDb(db);
    appendAuditLog(currentCustId, 'CUSTOMER', 'CARD_APPLICATION_SUBMITTED', newCardAppId, 'SUCCESS', `Applied for ${newCardApp.cardName}`);
    return {
      cardApplicationId: newCardAppId,
      id: newCardAppId,
      reference: newCardAppId,
      cardType: newCardApp.cardType,
      cardName: newCardApp.cardName,
      productName: newCardApp.cardName,
      status: 'PENDING_APPROVAL',
      estimatedDeliveryTime: new Date(Date.now() + 7 * 86400 * 1000).toISOString().split('T')[0]
    };
  }

  // Card bill payment
  const cardPayMatch = endpoint.match(/^\/api\/v1\/cards\/([^/]+)\/pay/);
  if (cardPayMatch && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const card = (db.cards || []).find(c => c.cardId === cardPayMatch[1] || c.id === cardPayMatch[1]);
    if (!card) throw { status: 404, code: 'CARD_NOT_FOUND', detail: 'Card not found' };
    const payAmount = Number(body.amount);
    if (!payAmount || payAmount <= 0) throw { status: 422, code: 'INVALID_AMOUNT', detail: 'Invalid payment amount' };
    const fromAcc = (db.accounts || []).find(a => (a.accountId === body.accountId || a.id === body.accountId) && a.customerId === currentCustId);
    if (!fromAcc) throw { status: 404, code: 'ACCOUNT_NOT_FOUND', detail: 'Funding account not found' };
    if (fromAcc.balance.availableBalance < payAmount) {
      throw { status: 422, code: 'INSUFFICIENT_BALANCE', detail: 'Insufficient balance to pay card bill.' };
    }
    fromAcc.balance.availableBalance -= payAmount;
    fromAcc.balance.ledgerBalance -= payAmount;
    card.outstanding = Math.max(0, (card.outstanding || 0) - payAmount);
    card.minDue = Math.max(0, (card.minDue || 0) - payAmount);
    card.availableLimit = (card.totalLimit || 250000) - card.outstanding;
    const paymentRef = 'PAY-CARD-' + Math.floor(100000 + Math.random() * 900000);
    db.transactions.unshift({
      transactionId: 'TXN-' + Math.floor(500000 + Math.random() * 500000),
      accountId: fromAcc.accountId,
      transactionType: 'CARD_PAYMENT',
      direction: 'DEBIT',
      amount: payAmount,
      currency: 'INR',
      status: 'SUCCESS',
      description: `Credit Card Bill Payment — ${card.cardName || 'FinEdge Card'}`,
      referenceNumber: paymentRef,
      runningBalance: fromAcc.balance.availableBalance,
      valueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });
    saveDb(db);
    return {
      success: true,
      reference: paymentRef,
      paidAmount: payAmount,
      balanceAfter: fromAcc.balance.availableBalance,
      outstandingAfter: card.outstanding
    };
  }

  // Change password
  if ((endpoint === '/api/v1/customers/password' || endpoint === '/api/v1/auth/password/change') && (method === 'PUT' || method === 'POST')) {
    const currentCustId = getAuthenticatedCustomerId(db);
    const cust = (db.customers || []).find(c => c.customerId === currentCustId);
    if (!cust) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', detail: 'Customer not found' };
    const currentPassword = cust.password || 'Password@123';
    if (body.currentPassword !== currentPassword) {
      throw { status: 400, code: 'INVALID_CREDENTIALS', detail: 'The current password you entered is incorrect.' };
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      throw { status: 422, code: 'WEAK_PASSWORD', detail: 'New password must be at least 8 characters.' };
    }
    cust.password = body.newPassword;
    saveDb(db);
    appendAuditLog(currentCustId, 'CUSTOMER', 'PASSWORD_CHANGED', cust.customerId, 'SUCCESS', 'Password updated');
    return { success: true, message: 'Password updated successfully' };
  }

  // 15. /api/v1/cards/{cardId}/block (Customer Ownership Check)
  const blockCardMatch = endpoint.match(/^\/api\/v1\/cards\/([^/]+)\/block/);
  if (blockCardMatch && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db);
    const card = db.cards.find(c => c.cardId === blockCardMatch[1]);
    if (!card) {
      throw {
        status: 404,
        code: 'CARD_NOT_FOUND',
        title: 'Card Not Found',
        detail: `No payment card found with ID ${blockCardMatch[1]}.`
      };
    }
    if (card.customerId !== currentCustId) {
      throw {
        status: 403,
        code: 'FORBIDDEN_RESOURCE',
        title: 'Access Denied',
        detail: 'Unauthorized cross-customer card modification blocked.'
      };
    }
    card.status = 'BLOCKED';
    card.blockedAt = new Date().toISOString();
    card.reason = body.reason || 'CUSTOMER_REQUEST';
    saveDb(db);
    appendAuditLog(currentCustId, 'CUSTOMER', 'CARD_BLOCKED', card.cardId, 'SUCCESS', `Card permanently blocked due to: ${body.reason}`);
    return {
      cardId: card.cardId,
      status: 'BLOCKED',
      blockedAt: card.blockedAt,
      reason: card.reason
    };
  }

  // 16. /api/v1/cards/{cardId}/controls (Customer Ownership Check)
  const controlsMatch = endpoint.match(/^\/api\/v1\/cards\/([^/]+)\/controls/);
  if (controlsMatch && (method === 'PUT' || method === 'POST')) {
    const currentCustId = getAuthenticatedCustomerId(db);
    const card = db.cards.find(c => c.cardId === controlsMatch[1] || c.id === controlsMatch[1]);
    if (!card) {
      throw {
        status: 404,
        code: 'CARD_NOT_FOUND',
        title: 'Card Not Found',
        detail: `No payment card found with ID ${controlsMatch[1]}.`
      };
    }
    if (card.customerId !== currentCustId) {
      throw {
        status: 403,
        code: 'FORBIDDEN_RESOURCE',
        title: 'Access Denied',
        detail: 'Unauthorized cross-customer card control update blocked.'
      };
    }

    if (!card.controls) card.controls = {};
    if (!card.limits) card.limits = {};

    if (body.controls) {
      if (body.controls.online !== undefined) {
        card.controls.online = body.controls.online;
        card.controls.onlineEnabled = body.controls.online;
      }
      if (body.controls.atm !== undefined) {
        card.controls.atm = body.controls.atm;
        card.controls.atmWithdrawalEnabled = body.controls.atm;
      }
      if (body.controls.international !== undefined) {
        card.controls.international = body.controls.international;
        card.controls.internationalEnabled = body.controls.international;
      }
      if (body.controls.contactless !== undefined) {
        card.controls.contactless = body.controls.contactless;
        card.controls.contactlessEnabled = body.controls.contactless;
      }
    }
    if (body.limits) {
      const spend = body.limits.spendDaily ?? body.limits.dailySpend;
      const atm = body.limits.atmDaily ?? body.limits.atmWithdrawal;
      if (spend !== undefined) {
        card.limits.dailySpend = spend;
        card.limits.spendDaily = spend;
        card.dailyLimit = spend;
      }
      if (atm !== undefined) {
        card.limits.atmWithdrawal = atm;
        card.limits.atmDaily = atm;
      }
    }
    if (body.onlineEnabled !== undefined) { card.controls.onlineEnabled = body.onlineEnabled; card.controls.online = body.onlineEnabled; }
    if (body.internationalEnabled !== undefined) { card.controls.internationalEnabled = body.internationalEnabled; card.controls.international = body.internationalEnabled; }
    if (body.contactlessEnabled !== undefined) { card.controls.contactlessEnabled = body.contactlessEnabled; card.controls.contactless = body.contactlessEnabled; }
    if (body.atmWithdrawalEnabled !== undefined) { card.controls.atmWithdrawalEnabled = body.atmWithdrawalEnabled; card.controls.atm = body.atmWithdrawalEnabled; }
    if (body.dailyLimit !== undefined) { card.controls.dailyLimit = body.dailyLimit; card.dailyLimit = body.dailyLimit; card.limits.dailySpend = body.dailyLimit; card.limits.spendDaily = body.dailyLimit; }
    if (body.pinSet) { card.pinSet = true; card.pinSetAt = new Date().toISOString(); }
    saveDb(db);
    return { cardId: card.cardId, controls: card.controls, limits: card.limits };
  }

  // 17. /api/v1/notifications
  if (endpoint.startsWith('/api/v1/notifications')) {
    const currentCustId = getAuthenticatedCustomerId(db);
    const userNotifs = db.notifications.filter(n => !n.customerId || n.customerId === currentCustId);
    return {
      data: userNotifs,
      pagination: { nextCursor: null, hasMore: false, limit: 20 }
    };
  }

  // 18. /api/v1/support/tickets
  if (endpoint === '/api/v1/support/tickets' && method === 'POST') {
    const currentCustId = getAuthenticatedCustomerId(db) || body.customerId || null;
    const desc = (body.description || body.message || '').trim();
    const ticketId = 'TCK-' + Math.floor(700000 + Math.random() * 100000);
    const now = new Date().toISOString();
    const custName = body.fullName || body.customerName || (currentCustId ? db.customers?.find(c => c.customerId === currentCustId)?.fullName : undefined) || (currentCustId ? 'Customer' : 'Guest Visitor');
    const newTicket = {
      ticketId,
      id: ticketId,
      customerId: currentCustId,
      customerName: custName,
      customerEmail: body.email || body.customerEmail || '',
      customerMobile: body.mobile || body.customerMobile || '',
      accountRef: body.accountRef || body.transactionRef || '',
      transactionRef: body.transactionRef || body.accountRef || '',
      source: body.source || (currentCustId ? 'portal' : 'public-grievance'),
      status: 'OPEN',
      category: body.category || 'OTHER',
      subject: body.subject,
      description: desc,
      message: desc,
      messages: desc ? [
        {
          from: 'CUSTOMER',
          sender: custName,
          senderType: 'CUSTOMER',
          body: desc,
          text: desc,
          message: desc,
          at: now,
          timestamp: now
        }
      ] : [],
      createdAt: now,
      updatedAt: now
    };
    if (!db.supportTickets) db.supportTickets = [];
    db.supportTickets.unshift(newTicket);
    saveDb(db);
    return newTicket;
  }

  // ==========================================================================
  // MANAGER OPERATIONS (ops/api/v1 and admin/api/v1) WITH RBAC ENFORCEMENT
  // ==========================================================================

  // Ops: List KYC Applications (requires kyc.read)
  if (endpoint === '/ops/api/v1/kyc/applications' && method === 'GET') {
    verifyStaffPermission(db, 'kyc.read', options);
    return db.kycApplications;
  }

  // Ops: Approve KYC (requires kyc.approve)
  const opsApproveKycMatch = endpoint.match(/\/ops\/api\/v1\/kyc\/([^/]+)\/approve/);
  if (opsApproveKycMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'kyc.approve', options);
    const kyc = db.kycApplications.find(k => k.kycCaseId === opsApproveKycMatch[1]);
    if (!kyc) {
      throw { status: 404, code: 'KYC_NOT_FOUND', detail: 'KYC case not found.' };
    }
    kyc.status = 'APPROVED';
    kyc.riskCategory = body.riskCategory || 'LOW';
    kyc.approvedBy = staff.email;
    kyc.approvedAt = new Date().toISOString();

    const cust = db.customers.find(c => c.customerId === kyc.customerId);
    if (cust) {
      cust.kycStatus = 'APPROVED';
      cust.riskCategory = kyc.riskCategory;
    }
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'KYC_APPROVED', kyc.kycCaseId, 'SUCCESS', `Approved with remarks: ${body.remarks}`);
    return {
      kycCaseId: kyc.kycCaseId,
      customerId: kyc.customerId,
      status: 'APPROVED',
      riskCategory: kyc.riskCategory,
      approvedBy: staff.email,
      approvedAt: kyc.approvedAt
    };
  }

  // Ops: Reject KYC (requires kyc.review or kyc.approve)
  const opsRejectKycMatch = endpoint.match(/\/ops\/api\/v1\/kyc\/([^/]+)\/reject/);
  if (opsRejectKycMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'kyc.review', options);
    const kyc = db.kycApplications.find(k => k.kycCaseId === opsRejectKycMatch[1]);
    if (!kyc) {
      throw { status: 404, code: 'KYC_NOT_FOUND', detail: 'KYC case not found.' };
    }
    kyc.status = 'REJECTED';
    kyc.rejectedBy = staff.email;
    kyc.rejectedAt = new Date().toISOString();

    const cust = db.customers.find(c => c.customerId === kyc.customerId);
    if (cust) {
      cust.kycStatus = 'REJECTED';
    }
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'KYC_REJECTED', kyc.kycCaseId, 'SUCCESS', `Rejected with remarks: ${body.remarks}`);
    return {
      kycCaseId: kyc.kycCaseId,
      customerId: kyc.customerId,
      status: 'REJECTED',
      riskCategory: kyc.riskCategory,
      approvedBy: staff.email,
      approvedAt: kyc.rejectedAt
    };
  }

  // Ops: Account Applications List (requires accounts.read or accounts.review)
  if (endpoint === '/ops/api/v1/accounts/applications' && method === 'GET') {
    verifyStaffPermission(db, 'accounts.read', options);
    return db.accountApplications;
  }

  // Ops: Account Application Approve (requires accounts.approve)
  const opsApproveAccountMatch = endpoint.match(/\/ops\/api\/v1\/accounts\/applications\/([^/]+)\/approve/);
  if (opsApproveAccountMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'accounts.approve', options);
    const app = db.accountApplications.find(a => a.accountApplicationId === opsApproveAccountMatch[1]);
    if (!app) {
      throw { status: 404, code: 'APPLICATION_NOT_FOUND', detail: 'Account application not found.' };
    }

    if (app.status === 'APPROVED') {
      throw {
        status: 409,
        code: 'APPLICATION_ALREADY_APPROVED',
        title: 'Duplicate Approval Prohibited',
        detail: `Application ${app.accountApplicationId} has already been approved. Duplicate account creation prevented.`
      };
    }

    app.status = 'APPROVED';
    app.approvedAt = new Date().toISOString();
    const generatedAccId = 'ACC-' + Math.floor(1003 + Math.random() * 8000);
    const generatedNumber = Math.floor(1000 + Math.random() * 9000);

    db.accounts.push({
      accountId: generatedAccId,
      accountNumber: `************${generatedNumber}`,
      rawAccountNumber: `9820110000${generatedNumber}`,
      accountType: app.productCode.includes('CURRENT') ? 'CURRENT' : 'SAVINGS',
      productCode: app.productCode,
      productName: app.productName,
      customerId: app.customerId,
      status: 'ACTIVE',
      currency: 'INR',
      openedAt: new Date().toISOString(),
      interestRate: app.productCode.includes('CURRENT') ? 0 : 7.00,
      balance: {
        ledgerBalance: Number(app.initialFundingAmount) || 10000,
        availableBalance: Number(app.initialFundingAmount) || 10000,
        holdBalance: 0,
        currency: 'INR'
      }
    });

    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'ACCOUNT_APPLICATION_APPROVED', app.accountApplicationId, 'SUCCESS', `Activated new account ${generatedAccId} for ${app.customerId}`);
    return { success: true, accountApplicationId: app.accountApplicationId, accountId: generatedAccId };
  }

  // Ops: Account Application Reject (requires accounts.review or accounts.approve)
  const opsRejectAccountMatch = endpoint.match(/\/ops\/api\/v1\/accounts\/applications\/([^/]+)\/reject/);
  if (opsRejectAccountMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'accounts.review', options);
    const app = db.accountApplications.find(a => a.accountApplicationId === opsRejectAccountMatch[1]);
    if (!app) {
      throw { status: 404, code: 'APPLICATION_NOT_FOUND', detail: 'Account application not found.' };
    }
    app.status = 'REJECTED';
    app.rejectedAt = new Date().toISOString();
    app.rejectionReason = body.remarks || 'Application requirements not met';
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'ACCOUNT_APPLICATION_REJECTED', app.accountApplicationId, 'SUCCESS', `Rejected with reason: ${app.rejectionReason}`);
    return { success: true, accountApplicationId: app.accountApplicationId, status: 'REJECTED' };
  }

  // Ops: Card Applications List (requires cards.read or cards.review)
  if (endpoint === '/ops/api/v1/cards/applications' && method === 'GET') {
    verifyStaffPermission(db, 'cards.read', options);
    return db.cardApplications;
  }

  // Ops: Card Application Approve (requires cards.approve)
  const opsApproveCardMatch = endpoint.match(/\/ops\/api\/v1\/cards\/applications\/([^/]+)\/approve/);
  if (opsApproveCardMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'cards.approve', options);
    const cardApp = db.cardApplications.find(c => c.cardApplicationId === opsApproveCardMatch[1]);
    if (!cardApp) {
      throw { status: 404, code: 'APPLICATION_NOT_FOUND', detail: 'Card application not found.' };
    }

    if (cardApp.status === 'APPROVED') {
      throw {
        status: 409,
        code: 'CARD_ALREADY_ISSUED',
        title: 'Duplicate Issuance Prohibited',
        detail: `Card application ${cardApp.cardApplicationId} has already been approved and card issued.`
      };
    }

    cardApp.status = 'APPROVED';
    const newCardId = 'CARD-' + Math.floor(3003 + Math.random() * 6000);
    const cardNum = Math.floor(1000 + Math.random() * 9000);

    db.cards.push({
      cardId: newCardId,
      cardType: cardApp.cardType,
      cardName: cardApp.cardName,
      maskedCardNumber: `************${cardNum}`,
      expiryMonth: 10,
      expiryYear: 2031,
      status: 'ACTIVE',
      linkedAccountId: cardApp.linkedAccountId || 'ACC-1001',
      customerId: cardApp.customerId,
      controls: {
        onlineEnabled: true,
        internationalEnabled: true,
        contactlessEnabled: true,
        atmWithdrawalEnabled: true,
        dailyLimit: 50000.00
      }
    });

    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'CARD_APPLICATION_APPROVED', cardApp.cardApplicationId, 'SUCCESS', `Issued new card ${newCardId} for ${cardApp.customerId}`);
    return { success: true, cardApplicationId: cardApp.cardApplicationId, cardId: newCardId };
  }

  // Ops: Card Application Reject (requires cards.review or cards.approve)
  const opsRejectCardMatch = endpoint.match(/\/ops\/api\/v1\/cards\/applications\/([^/]+)\/reject/);
  if (opsRejectCardMatch && method === 'POST') {
    const staff = verifyStaffPermission(db, 'cards.review', options);
    const cardApp = db.cardApplications.find(c => c.cardApplicationId === opsRejectCardMatch[1]);
    if (!cardApp) {
      throw { status: 404, code: 'APPLICATION_NOT_FOUND', detail: 'Card application not found.' };
    }
    cardApp.status = 'REJECTED';
    cardApp.rejectedAt = new Date().toISOString();
    cardApp.rejectionReason = body.remarks || 'Credit assessment criteria not satisfied';
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'CARD_APPLICATION_REJECTED', cardApp.cardApplicationId, 'SUCCESS', `Rejected with reason: ${cardApp.rejectionReason}`);
    return { success: true, cardApplicationId: cardApp.cardApplicationId, status: 'REJECTED' };
  }

  // Manager: Customer Directory (requires customers.read)
  if (endpoint === '/admin/api/v1/customers' && method === 'GET') {
    verifyStaffPermission(db, 'customers.read', options);
    return db.customers;
  }

  // Manager: Create Customer Profile (requires customers.update)
  if (endpoint === '/admin/api/v1/customers' && method === 'POST') {
    const staff = verifyStaffPermission(db, 'customers.update', options);
    const newCust = {
      customerId: 'CUS-' + Math.floor(100000 + Math.random() * 900000),
      userId: generateUUID(),
      fullName: body.fullName || 'New Customer',
      mobileNumber: body.mobileNumber || '98' + Math.floor(10000000 + Math.random() * 90000000),
      email: (body.email || `customer${Date.now()}@finedge-mail.in`).toLowerCase(),
      password: body.password || 'Password@123',
      pan: body.pan || 'FNEGS1023K',
      dateOfBirth: body.dateOfBirth || '1995-01-01',
      gender: body.gender || 'MALE',
      occupation: body.occupation || 'SALARIED',
      annualIncomeRange: body.annualIncomeRange || '1000000_1500000',
      kycStatus: body.kycStatus || 'APPROVED',
      riskCategory: body.riskCategory || 'LOW',
      createdAt: new Date().toISOString(),
      address: body.address || {
        addressLine1: '402, FinEdge Horizon Towers',
        addressLine2: 'BKC, Bandra East',
        city: 'Mumbai',
        state: 'MAHARASHTRA',
        postalCode: '400051',
        country: 'INDIA',
        addressType: 'CURRENT'
      }
    };
    db.customers.push(newCust);
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'CUSTOMER_CREATED_BY_STAFF', newCust.customerId, 'SUCCESS', `Staff created customer profile for ${newCust.fullName}`);
    return newCust;
  }

  // Manager: Staff List (requires staff.read)
  if (endpoint === '/admin/api/v1/staff' && method === 'GET') {
    verifyStaffPermission(db, 'staff.read', options);
    return db.staffUsers;
  }

  // Manager: Create Staff User (requires staff.create)
  if (endpoint === '/admin/api/v1/staff' && method === 'POST') {
    const staff = verifyStaffPermission(db, 'staff.create', options);
    const newStaff = {
      staffId: 'STF-00' + (db.staffUsers.length + 1),
      fullName: body.fullName,
      email: body.email,
      password: body.password || 'Manager@2026',
      role: body.role || 'KYC_OFFICER',
      roleTitle: body.roleTitle || 'Operations Specialist',
      department: body.department || 'Operations',
      status: 'ACTIVE',
      permissions: body.permissions || ['customers.read', 'kyc.read', 'kyc.review'],
      lastLogin: 'Never'
    };
    db.staffUsers.push(newStaff);
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'STAFF_USER_CREATED', newStaff.staffId, 'SUCCESS', `Created internal staff user ${newStaff.email}`);
    return newStaff;
  }

  // Manager: Update Staff Permissions (requires roles.manage or permissions.assign)
  const staffPermMatch = endpoint.match(/\/admin\/api\/v1\/staff\/([^/]+)\/permissions/);
  if (staffPermMatch && (method === 'PUT' || method === 'POST')) {
    const staff = verifyStaffPermission(db, 'roles.manage', options);
    const targetStaff = db.staffUsers.find(s => s.staffId === staffPermMatch[1]);
    if (!targetStaff) {
      throw { status: 404, code: 'STAFF_NOT_FOUND', detail: 'Staff member not found.' };
    }
    targetStaff.permissions = body.permissions || [];
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'STAFF_PERMISSIONS_UPDATED', targetStaff.staffId, 'SUCCESS', `Updated permissions to ${targetStaff.permissions.length} items`);
    return targetStaff;
  }

  // Manager: Toggle Staff Account Status (requires staff.update)
  const staffStatusMatch = endpoint.match(/\/admin\/api\/v1\/staff\/([^/]+)\/status/);
  if (staffStatusMatch && (method === 'PUT' || method === 'POST')) {
    const staff = verifyStaffPermission(db, 'staff.update', options);
    const targetStaff = db.staffUsers.find(s => s.staffId === staffStatusMatch[1]);
    if (!targetStaff) {
      throw { status: 404, code: 'STAFF_NOT_FOUND', detail: 'Staff member not found.' };
    }
    targetStaff.status = body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'STAFF_STATUS_UPDATED', targetStaff.staffId, 'SUCCESS', `Status changed to ${targetStaff.status}`);
    return targetStaff;
  }

  // Manager: Audit Logs (requires audit.read)
  if (endpoint === '/admin/api/v1/audit-logs' && method === 'GET') {
    verifyStaffPermission(db, 'audit.read', options);
    return db.auditLogs;
  }

  // Manager: Metrics (requires any staff access)
  if (endpoint === '/admin/api/v1/metrics' && method === 'GET') {
    verifyStaffPermission(db, null, options);
    return {
      totalCustomers: db.customers.length,
      pendingKycCount: db.kycApplications.filter(k => k.status === 'UNDER_REVIEW' || k.status === 'SUBMITTED').length,
      pendingAccountApps: db.accountApplications.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL').length,
      pendingCardApps: db.cardApplications.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'PENDING_APPROVAL').length,
      activeStaffCount: db.staffUsers.filter(s => s.status === 'ACTIVE').length,
      totalAuditLogs: db.auditLogs.length
    };
  }

  return { status: 'OK' };
};
