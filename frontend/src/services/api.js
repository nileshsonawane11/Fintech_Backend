// FinBank / FinEdge REST API Client
// Implements RFC 9457 problem details, OAuth 2.0 / JWT bearer authorization,
// Idempotency-Key headers, Correlation-IDs, and seamless offline-persistence fallback.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getManagerToken = () => localStorage.getItem(MANAGER_TOKEN_KEY);
export const setManagerToken = (token) => {
  if (token) localStorage.setItem(MANAGER_TOKEN_KEY, token);
};
export const clearManagerToken = () => {
  localStorage.removeItem(MANAGER_TOKEN_KEY);
};

// ============================================================================
// INITIAL PERSISTENT STORE (Mirrors FinBank API Data Model)
// ============================================================================
const getInitialDb = () => {
  const existing = localStorage.getItem(MOCK_STORAGE_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.error('Error parsing existing DB, resetting to defaults', e);
    }
  }

  const defaultDb = {
    customers: [
      {
        customerId: 'CUS-100234',
        userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        fullName: 'Vikramaditya Sharma',
        mobileNumber: '9876543210',
        email: 'vikram@example.com',
        pan: 'ABCDE1234F',
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
      }
    ],
    accounts: [
      {
        accountId: 'ACC-1001',
        accountNumber: '************1234',
        rawAccountNumber: '98201100001234',
        accountType: 'SAVINGS',
        productCode: 'SAVINGS_REGULAR',
        productName: 'FIRST High-Yield Savings Account',
        customerId: 'CUS-100234',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-11T09:20:00Z',
        interestRate: 7.00,
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
        productName: 'BRAVO Business Current Account',
        customerId: 'CUS-100234',
        status: 'ACTIVE',
        currency: 'INR',
        openedAt: '2026-10-12T11:00:00Z',
        interestRate: 0.00,
        balance: {
          ledgerBalance: 1450000.00,
          availableBalance: 1450000.00,
          holdBalance: 0.00,
          currency: 'INR'
        }
      }
    ],
    cards: [
      {
        cardId: 'CARD-3001',
        cardType: 'METAL_CREDIT',
        cardName: 'Ashva Metal Credit Card',
        maskedCardNumber: '************1234',
        expiryMonth: 12,
        expiryYear: 2030,
        status: 'ACTIVE',
        linkedAccountId: 'ACC-1001',
        customerId: 'CUS-100234',
        availableLimit: 425000.00,
        totalLimit: 500000.00,
        controls: {
          onlineEnabled: true,
          internationalEnabled: true,
          contactlessEnabled: true,
          atmWithdrawalEnabled: true,
          dailyLimit: 75000.00
        }
      },
      {
        cardId: 'CARD-3002',
        cardType: 'DEBIT',
        cardName: 'FinEdge Platinum Contactless Debit Card',
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
          dailyLimit: 50000.00
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
        description: 'Transfer to Sunita Sharma via IMPS',
        referenceNumber: 'PAY-987654',
        valueDate: '2026-10-27',
        createdAt: '2026-10-27T08:15:30Z'
      },
      {
        transactionId: 'TXN-554432',
        accountId: 'ACC-1001',
        transactionType: 'SALARY_CREDIT',
        direction: 'CREDIT',
        amount: 185000.00,
        currency: 'INR',
        status: 'SUCCESS',
        description: 'Monthly Salary Credit — Acme FinTech Corp',
        referenceNumber: 'PAY-882191',
        valueDate: '2026-10-01',
        createdAt: '2026-10-01T05:00:00Z'
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
        createdAt: '2026-09-30T18:30:00Z'
      }
    ],
    beneficiaries: [
      {
        beneficiaryId: 'BEN-778899',
        customerId: 'CUS-100234',
        nickname: 'Sunita',
        beneficiaryName: 'Sunita Sharma',
        accountNumber: '123456789012',
        maskedAccountNumber: '**********9012',
        ifscCode: 'IDFB0041234',
        bankName: 'FinEdge Core Branch',
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
        submittedAt: '2026-10-28T09:40:00Z',
        documents: [
          { documentType: 'PAN', fileName: 'pan_aarav.pdf', verified: false },
          { documentType: 'ADDRESS_PROOF', fileName: 'aadhaar_front.pdf', verified: false }
        ]
      }
    ],
    accountApplications: [
      {
        accountApplicationId: 'ACC-APP-900123',
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        productCode: 'SAVINGS_REGULAR',
        productName: 'FIRST High-Yield Savings Account',
        initialFundingAmount: 25000.00,
        status: 'APPROVED',
        submittedAt: '2026-10-10T10:00:00Z',
        approvedAt: '2026-10-11T09:20:00Z',
        nominee: {
          fullName: 'Sunita Sharma',
          relationship: 'SPOUSE',
          dateOfBirth: '1997-03-21',
          mobileNumber: '9812345678'
        }
      },
      {
        accountApplicationId: 'ACC-APP-900124',
        customerId: 'CUS-100235',
        customerName: 'Aarav Patel',
        productCode: 'CURRENT_BUSINESS',
        productName: 'BRAVO Business Current Account',
        initialFundingAmount: 100000.00,
        status: 'UNDER_REVIEW',
        submittedAt: '2026-10-28T10:15:00Z',
        nominee: {
          fullName: 'Priya Patel',
          relationship: 'SPOUSE',
          dateOfBirth: '1998-05-12',
          mobileNumber: '9844001122'
        }
      }
    ],
    cardApplications: [
      {
        cardApplicationId: 'CARD-APP-400123',
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        cardType: 'METAL_CREDIT',
        cardName: 'Ashva Metal Credit Card',
        linkedAccountId: 'ACC-1001',
        status: 'APPROVED',
        submittedAt: '2026-10-11T12:00:00Z',
        issuedCardId: 'CARD-3001'
      },
      {
        cardApplicationId: 'CARD-APP-400124',
        customerId: 'CUS-100235',
        customerName: 'Aarav Patel',
        cardType: 'CREDIT',
        cardName: 'FinEdge Millennia Cashback Card',
        linkedAccountId: 'ACC-1002',
        status: 'UNDER_REVIEW',
        submittedAt: '2026-10-28T11:30:00Z'
      }
    ],
    staffUsers: [
      {
        staffId: 'STF-001',
        fullName: 'Devendra Singhania',
        email: 'manager@finedge.bank',
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
        lastLogin: '2026-10-28T14:30:00Z'
      },
      {
        staffId: 'STF-002',
        fullName: 'Ananya Deshmukh',
        email: 'kyc.officer@finedge.bank',
        role: 'KYC_OFFICER',
        roleTitle: 'Senior KYC Verification Officer',
        department: 'Compliance & AML',
        status: 'ACTIVE',
        permissions: [
          'customers.read',
          'kyc.read', 'kyc.review', 'kyc.approve',
          'audit.read'
        ],
        lastLogin: '2026-10-28T11:00:00Z'
      },
      {
        staffId: 'STF-003',
        fullName: 'Rohan Mehra',
        email: 'ops@finedge.bank',
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
        lastLogin: '2026-10-28T10:15:00Z'
      }
    ],
    auditLogs: [
      {
        logId: 'AUD-901',
        timestamp: '2026-10-28T14:30:00Z',
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
        timestamp: '2026-10-28T11:05:00Z',
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
        actor: 'vikram@example.com',
        actorRole: 'CUSTOMER',
        action: 'FUNDS_TRANSFER_INITIATED',
        target: 'ACC-1001',
        status: 'SUCCESS',
        ipAddress: '49.36.120.44',
        details: 'IMPS Outward Transfer ₹15,000 to Sunita Sharma'
      }
    ],
    notifications: [
      {
        notificationId: 'NOT-900123',
        templateCode: 'PAYMENT_SUCCESS',
        channel: 'IN_APP',
        title: 'Payment Successful',
        body: '₹15,000 was transferred successfully via IMPS to Sunita Sharma.',
        read: false,
        createdAt: '2026-10-27T08:15:35Z'
      },
      {
        notificationId: 'NOT-900122',
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
        status: 'OPEN',
        category: 'PAYMENT_ISSUE',
        subject: 'IMPS UTR Inquiry',
        description: 'Need confirmation receipt for transfer TXN-554433 to tax authority.',
        createdAt: '2026-10-28T09:50:00Z'
      }
    ]
  };

  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultDb));
  return defaultDb;
};

export const getDb = () => {
  const existing = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!existing) return getInitialDb();
  try {
    return JSON.parse(existing);
  } catch (e) {
    return getInitialDb();
  }
};

export const saveDb = (db) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
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
    // Attempt actual live network call to Spring Boot API Gateway
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401 && !options._retry && !options.isManager) {
      // Automatic token refresh attempt
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
      throw {
        status: response.status,
        code: data?.code || 'API_ERROR',
        title: data?.title || 'Request Failed',
        detail: data?.detail || response.statusText,
        errors: data?.errors || []
      };
    }

    return data;
  } catch (err) {
    // If backend connection fails (network error, CORS, offline, or demo mode),
    // Route seamlessly through the RFC-compliant local database engine!
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn(`[FinEdge Client API] Live gateway unreachable at ${url}. Executing request via local persistent engine: ${options.method || 'GET'} ${endpoint}`);
      return handleLocalFallback(endpoint, options);
    }
    throw err;
  }
};

const tryRefreshToken = async () => {
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
const handleLocalFallback = (endpoint, options = {}) => {
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
    const existing = db.customers.find(c => c.mobileNumber === body.mobileNumber || c.email === body.email);
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
      fullName: body.fullName || 'New Customer',
      mobileNumber: body.mobileNumber,
      email: body.email,
      pan: body.pan || '',
      dateOfBirth: body.dateOfBirth || '1998-01-01',
      kycStatus: 'NOT_STARTED',
      riskCategory: 'UNASSESSED',
      createdAt: new Date().toISOString()
    };
    db.customers.push(newCustomer);
    saveDb(db);
    appendAuditLog(body.email, 'CUSTOMER', 'CUSTOMER_REGISTERED', newCustomer.customerId, 'SUCCESS', 'New user registered');

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
    return {
      verified: true,
      referenceId: body.referenceId || 'otp-ref-' + Math.floor(10000 + Math.random() * 90000),
      purpose: body.purpose || 'REGISTRATION'
    };
  }

  // 3. /api/v1/auth/login
  if (endpoint === '/api/v1/auth/login' && method === 'POST') {
    return {
      accessToken: 'jwt_access_' + generateUUID(),
      refreshToken: 'jwt_refresh_' + generateUUID(),
      tokenType: 'Bearer',
      expiresIn: 900,
      mfaRequired: true,
      mfaReferenceId: 'mfa-ref-' + Math.floor(10000 + Math.random() * 90000)
    };
  }

  // 4. /api/v1/auth/mfa/verify
  if (endpoint === '/api/v1/auth/mfa/verify' && method === 'POST') {
    return {
      accessToken: 'jwt_full_access_' + generateUUID(),
      refreshToken: 'jwt_refresh_' + generateUUID(),
      tokenType: 'Bearer',
      expiresIn: 900,
      customerId: 'CUS-100234'
    };
  }

  // 5. /api/v1/customers/me
  if (endpoint === '/api/v1/customers/me' && method === 'GET') {
    return db.customers[0];
  }

  // 6. /api/v1/customers/me/kyc
  if (endpoint === '/api/v1/customers/me/kyc') {
    if (method === 'GET') {
      const kyc = db.kycApplications.find(k => k.customerId === 'CUS-100234') || db.kycApplications[0];
      return kyc;
    }
    if (method === 'POST') {
      const newKycCase = {
        kycCaseId: 'KYC-' + Math.floor(500000 + Math.random() * 500000),
        customerId: 'CUS-100234',
        fullName: body.fullName || 'Vikramaditya Sharma',
        status: 'SUBMITTED',
        riskCategory: 'UNASSESSED',
        occupation: body.occupation || 'SALARIED',
        annualIncomeRange: body.annualIncomeRange || '1000000_1500000',
        aadhaarConsent: Boolean(body.aadhaarConsent),
        submittedAt: new Date().toISOString(),
        documents: body.documentReferences || []
      };
      db.kycApplications.unshift(newKycCase);
      // update customer profile
      db.customers[0].kycStatus = 'SUBMITTED';
      saveDb(db);
      appendAuditLog('CUS-100234', 'CUSTOMER', 'KYC_SUBMITTED', newKycCase.kycCaseId, 'SUCCESS', 'Customer submitted digital KYC');
      return {
        kycCaseId: newKycCase.kycCaseId,
        customerId: 'CUS-100234',
        status: 'SUBMITTED',
        estimatedCompletionTime: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
      };
    }
  }

  // 7. /api/v1/customers/me/kyc/documents
  if (endpoint === '/api/v1/customers/me/kyc/documents' && method === 'POST') {
    const docRef = 'doc-' + Math.floor(100 + Math.random() * 900);
    return {
      documentReferenceId: docRef,
      uploadUrl: `https://s3.finedge.bank.local/kyc/${docRef}?signed=true`,
      uploadMethod: 'PUT',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    };
  }

  // 8. /api/v1/accounts
  if (endpoint === '/api/v1/accounts') {
    if (method === 'GET') {
      return { data: db.accounts };
    }
    if (method === 'POST') {
      const newAppId = 'ACC-APP-' + Math.floor(900000 + Math.random() * 100000);
      const newApp = {
        accountApplicationId: newAppId,
        customerId: 'CUS-100234',
        customerName: 'Vikramaditya Sharma',
        productCode: body.productCode || 'SAVINGS_REGULAR',
        productName: body.productCode === 'CURRENT_BUSINESS' ? 'BRAVO Business Current Account' : 'FIRST High-Yield Savings Account',
        initialFundingAmount: body.initialFundingAmount || 10000.00,
        status: 'UNDER_REVIEW',
        submittedAt: new Date().toISOString(),
        nominee: body.nominee || {}
      };
      db.accountApplications.unshift(newApp);
      saveDb(db);
      appendAuditLog('CUS-100234', 'CUSTOMER', 'ACCOUNT_APPLICATION_SUBMITTED', newAppId, 'SUCCESS', `Applied for ${newApp.productName}`);
      return {
        accountApplicationId: newAppId,
        customerId: 'CUS-100234',
        productCode: newApp.productCode,
        status: 'PENDING_APPROVAL',
        estimatedCompletionTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      };
    }
  }

  // 9. /api/v1/accounts/{accountId}
  const accountMatch = endpoint.match(/\/api\/v1\/accounts\/([^/]+)$/);
  if (accountMatch && method === 'GET') {
    const acc = db.accounts.find(a => a.accountId === accountMatch[1]) || db.accounts[0];
    return acc;
  }

  // 10. /api/v1/accounts/{accountId}/transactions
  const txnMatch = endpoint.match(/\/api\/v1\/accounts\/([^/]+)\/transactions/);
  if (txnMatch && method === 'GET') {
    const accTxns = db.transactions.filter(t => t.accountId === txnMatch[1]);
    return {
      data: accTxns.length ? accTxns : db.transactions,
      pagination: {
        nextCursor: null,
        hasMore: false,
        limit: 50
      }
    };
  }

  // 11. /api/v1/payments/transfers
  if (endpoint === '/api/v1/payments/transfers' && method === 'POST') {
    const debitAcc = db.accounts.find(a => a.accountId === body.debitAccountId) || db.accounts[0];
    const amount = Number(body.amount);

    if (debitAcc.balance.availableBalance < amount) {
      throw {
        status: 422,
        code: 'INSUFFICIENT_BALANCE',
        title: 'Business rule violation',
        detail: `The transfer amount ₹${amount.toLocaleString()} exceeds available balance ₹${debitAcc.balance.availableBalance.toLocaleString()}.`
      };
    }

    // Deduct balance
    debitAcc.balance.availableBalance -= amount;
    debitAcc.balance.ledgerBalance -= amount;

    const paymentId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(500000 + Math.random() * 500000);

    const newTxn = {
      transactionId: txnId,
      accountId: debitAcc.accountId,
      transactionType: 'TRANSFER',
      direction: 'DEBIT',
      amount,
      currency: 'INR',
      status: 'SUCCESS',
      description: body.remarks || 'Electronic Fund Transfer',
      referenceNumber: paymentId,
      valueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    db.transactions.unshift(newTxn);

    // Push notification
    db.notifications.unshift({
      notificationId: 'NOT-' + Math.floor(100000 + Math.random() * 900000),
      templateCode: 'PAYMENT_SUCCESS',
      channel: 'IN_APP',
      title: 'Transfer Executed',
      body: `₹${amount.toLocaleString()} debited from account ending in ${debitAcc.accountNumber.slice(-4)}. Reference: ${paymentId}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    saveDb(db);
    appendAuditLog('CUS-100234', 'CUSTOMER', 'PAYMENT_TRANSFER_SUCCESS', paymentId, 'SUCCESS', `Transferred ₹${amount} via ${body.transferMode || 'IMPS'}`);

    return {
      paymentId,
      transactionId: txnId,
      status: 'SUCCESS',
      amount,
      currency: 'INR',
      charges: [{ chargeType: 'TRANSFER_FEE', amount: 0.00, currency: 'INR' }],
      estimatedCompletionTime: new Date().toISOString(),
      links: { self: `/api/v1/payments/${paymentId}` }
    };
  }

  // 12. /api/v1/cards
  if (endpoint === '/api/v1/cards') {
    if (method === 'GET') {
      return { data: db.cards };
    }
  }

  // 13. /api/v1/cards/applications
  if (endpoint === '/api/v1/cards/applications' && method === 'POST') {
    const newCardAppId = 'CARD-APP-' + Math.floor(400000 + Math.random() * 100000);
    const newCardApp = {
      cardApplicationId: newCardAppId,
      customerId: 'CUS-100234',
      customerName: 'Vikramaditya Sharma',
      cardType: body.cardType || 'METAL_CREDIT',
      cardName: body.cardName || 'FinEdge Ashva Metal Card',
      linkedAccountId: body.linkedAccountId || 'ACC-1001',
      status: 'UNDER_REVIEW',
      submittedAt: new Date().toISOString()
    };
    db.cardApplications.unshift(newCardApp);
    saveDb(db);
    appendAuditLog('CUS-100234', 'CUSTOMER', 'CARD_APPLICATION_SUBMITTED', newCardAppId, 'SUCCESS', `Applied for ${newCardApp.cardName}`);
    return {
      cardApplicationId: newCardAppId,
      cardType: body.cardType,
      status: 'PENDING_APPROVAL',
      estimatedDeliveryTime: new Date(Date.now() + 7 * 86400 * 1000).toISOString().split('T')[0]
    };
  }

  // 14. /api/v1/cards/{cardId}/block
  const blockCardMatch = endpoint.match(/\/api\/v1\/cards\/([^/]+)\/block/);
  if (blockCardMatch && method === 'POST') {
    const card = db.cards.find(c => c.cardId === blockCardMatch[1]);
    if (card) {
      card.status = 'BLOCKED';
      card.blockedAt = new Date().toISOString();
      card.reason = body.reason || 'CUSTOMER_REQUEST';
      saveDb(db);
      appendAuditLog('CUS-100234', 'CUSTOMER', 'CARD_BLOCKED', card.cardId, 'SUCCESS', `Card permanently blocked due to: ${body.reason}`);
      return {
        cardId: card.cardId,
        status: 'BLOCKED',
        blockedAt: card.blockedAt,
        reason: card.reason
      };
    }
  }

  // 15. /api/v1/cards/{cardId}/controls
  const controlsMatch = endpoint.match(/\/api\/v1\/cards\/([^/]+)\/controls/);
  if (controlsMatch && (method === 'PUT' || method === 'POST')) {
    const card = db.cards.find(c => c.cardId === controlsMatch[1]);
    if (card) {
      card.controls = { ...card.controls, ...body };
      saveDb(db);
      return { cardId: card.cardId, controls: card.controls };
    }
  }

  // 16. /api/v1/notifications
  if (endpoint.startsWith('/api/v1/notifications')) {
    return {
      data: db.notifications,
      pagination: { nextCursor: null, hasMore: false, limit: 20 }
    };
  }

  // 17. /api/v1/support/tickets
  if (endpoint === '/api/v1/support/tickets' && method === 'POST') {
    const newTicket = {
      ticketId: 'TCK-' + Math.floor(700000 + Math.random() * 100000),
      status: 'OPEN',
      category: body.category || 'GENERAL_QUERY',
      subject: body.subject,
      description: body.description,
      createdAt: new Date().toISOString()
    };
    db.supportTickets.unshift(newTicket);
    saveDb(db);
    return newTicket;
  }

  // ==========================================================================
  // MANAGER OPERATIONS (ops/api/v1 and admin/api/v1)
  // ==========================================================================

  // Ops: Approve KYC
  const opsApproveKycMatch = endpoint.match(/\/ops\/api\/v1\/kyc\/([^/]+)\/approve/);
  if (opsApproveKycMatch && method === 'POST') {
    const kyc = db.kycApplications.find(k => k.kycCaseId === opsApproveKycMatch[1]);
    if (kyc) {
      kyc.status = 'APPROVED';
      kyc.riskCategory = body.riskCategory || 'LOW';
      kyc.approvedBy = 'manager@finedge.bank';
      kyc.approvedAt = new Date().toISOString();

      const cust = db.customers.find(c => c.customerId === kyc.customerId);
      if (cust) {
        cust.kycStatus = 'APPROVED';
        cust.riskCategory = kyc.riskCategory;
      }
      saveDb(db);
      appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'KYC_APPROVED', kyc.kycCaseId, 'SUCCESS', `Approved with remarks: ${body.remarks}`);
      return {
        kycCaseId: kyc.kycCaseId,
        customerId: kyc.customerId,
        status: 'APPROVED',
        riskCategory: kyc.riskCategory,
        approvedBy: 'manager@finedge.bank',
        approvedAt: kyc.approvedAt
      };
    }
  }

  // Ops: Reject KYC
  const opsRejectKycMatch = endpoint.match(/\/ops\/api\/v1\/kyc\/([^/]+)\/reject/);
  if (opsRejectKycMatch && method === 'POST') {
    const kyc = db.kycApplications.find(k => k.kycCaseId === opsRejectKycMatch[1]);
    if (kyc) {
      kyc.status = 'REJECTED';
      kyc.rejectedBy = 'manager@finedge.bank';
      kyc.rejectedAt = new Date().toISOString();

      const cust = db.customers.find(c => c.customerId === kyc.customerId);
      if (cust) {
        cust.kycStatus = 'REJECTED';
      }
      saveDb(db);
      appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'KYC_REJECTED', kyc.kycCaseId, 'SUCCESS', `Rejected with remarks: ${body.remarks}`);
      return {
        kycCaseId: kyc.kycCaseId,
        customerId: kyc.customerId,
        status: 'REJECTED',
        riskCategory: kyc.riskCategory,
        approvedBy: 'manager@finedge.bank',
        approvedAt: kyc.rejectedAt
      };
    }
  }

  // Ops: List KYC Applications
  if (endpoint === '/ops/api/v1/kyc/applications' && method === 'GET') {
    return db.kycApplications;
  }

  // Ops: Account Applications
  if (endpoint === '/ops/api/v1/accounts/applications' && method === 'GET') {
    return db.accountApplications;
  }

  const opsApproveAccountMatch = endpoint.match(/\/ops\/api\/v1\/accounts\/applications\/([^/]+)\/approve/);
  if (opsApproveAccountMatch && method === 'POST') {
    const app = db.accountApplications.find(a => a.accountApplicationId === opsApproveAccountMatch[1]);
    if (app) {
      app.status = 'APPROVED';
      app.approvedAt = new Date().toISOString();
      const generatedAccId = 'ACC-' + Math.floor(1003 + Math.random() * 8000);
      const generatedNumber = Math.floor(1000 + Math.random() * 9000);

      // Materialize live active account in customer accounts
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
      appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'ACCOUNT_APPLICATION_APPROVED', app.accountApplicationId, 'SUCCESS', `Activated new account ${generatedAccId}`);
      return { success: true, accountApplicationId: app.accountApplicationId, accountId: generatedAccId };
    }
  }

  // Ops: Card Applications
  if (endpoint === '/ops/api/v1/cards/applications' && method === 'GET') {
    return db.cardApplications;
  }

  const opsApproveCardMatch = endpoint.match(/\/ops\/api\/v1\/cards\/applications\/([^/]+)\/approve/);
  if (opsApproveCardMatch && method === 'POST') {
    const cardApp = db.cardApplications.find(c => c.cardApplicationId === opsApproveCardMatch[1]);
    if (cardApp) {
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
      appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'CARD_APPLICATION_APPROVED', cardApp.cardApplicationId, 'SUCCESS', `Issued new card ${newCardId}`);
      return { success: true, cardApplicationId: cardApp.cardApplicationId, cardId: newCardId };
    }
  }

  // Manager: Staff Management
  if (endpoint === '/admin/api/v1/staff' && method === 'GET') {
    return db.staffUsers;
  }

  if (endpoint === '/admin/api/v1/staff' && method === 'POST') {
    const newStaff = {
      staffId: 'STF-00' + (db.staffUsers.length + 1),
      fullName: body.fullName,
      email: body.email,
      role: body.role || 'KYC_OFFICER',
      roleTitle: body.roleTitle || 'Operations Specialist',
      department: body.department || 'Operations',
      status: 'ACTIVE',
      permissions: body.permissions || ['customers.read', 'kyc.read', 'kyc.review'],
      lastLogin: 'Never'
    };
    db.staffUsers.push(newStaff);
    saveDb(db);
    appendAuditLog('manager@finedge.bank', 'BANK_MANAGER', 'STAFF_USER_CREATED', newStaff.staffId, 'SUCCESS', `Created internal staff user ${newStaff.email}`);
    return newStaff;
  }

  // Manager: Audit Logs
  if (endpoint === '/admin/api/v1/audit-logs' && method === 'GET') {
    return db.auditLogs;
  }

  // Manager: Metrics
  if (endpoint === '/admin/api/v1/metrics' && method === 'GET') {
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
