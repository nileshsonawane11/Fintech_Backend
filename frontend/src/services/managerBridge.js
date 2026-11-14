// Manager Bridge Service
// Connects manager sections to managerService and real DB engine with canonical normalization contract
import { managerService } from './managerService.js';
import {
  getDb,
  saveDb,
  appendAuditLog,
  computeEffectivePermissions,
  getContent,
  getSettings,
  FACTORY_SITE_CONTENT,
  FACTORY_SETTINGS,
  getProducts,
  apiRequest
} from './api.js';
import { calculateEMI } from '../lib/finance.js';
import { maskPan } from '../lib/format.js';

export const PERMISSION_CATALOGUE = [
  { code: 'customers.read', label: 'View customer directory', module: 'Customers' },
  { code: 'customers.update', label: 'Edit customer records', module: 'Customers' },
  { code: 'kyc.read', label: 'View KYC queue', module: 'KYC Operations' },
  { code: 'kyc.review', label: 'Decide KYC cases', module: 'KYC Operations' },
  { code: 'kyc.approve', label: 'Approve KYC cases', module: 'KYC Operations' },
  { code: 'accounts.read', label: 'View account applications', module: 'Account Operations' },
  { code: 'accounts.review', label: 'Decide account applications', module: 'Account Operations' },
  { code: 'accounts.approve', label: 'Approve account applications', module: 'Account Operations' },
  { code: 'loans.read', label: 'View loan applications', module: 'Loan Operations' },
  { code: 'loans.review', label: 'Decide loan applications', module: 'Loan Operations' },
  { code: 'loans.disburse', label: 'Disburse approved loans', module: 'Loan Operations' },
  { code: 'cards.read', label: 'View card applications', module: 'Card Operations' },
  { code: 'cards.issue', label: 'Issue and decline cards', module: 'Card Operations' },
  { code: 'cards.approve', label: 'Approve card applications', module: 'Card Operations' },
  { code: 'cards.block', label: 'Block cards', module: 'Card Operations' },
  { code: 'investments.read', label: 'View investment applications', module: 'Investment Operations' },
  { code: 'investments.review', label: 'Decide investment applications', module: 'Investment Operations' },
  { code: 'investments.book', label: 'Book approved investments', module: 'Investment Operations' },
  { code: 'support.reply', label: 'Reply to support tickets', module: 'Support' },
  { code: 'staff.manage', label: 'Manage staff accounts', module: 'Staff Administration' },
  { code: 'roles.manage', label: 'Change role permissions', module: 'Roles & Governance' },
  { code: 'audit.read', label: 'View audit log', module: 'Audit & Compliance' },
  { code: 'reports.read', label: 'Export reports', module: 'Audit & Compliance' },
];

export const ROLE_TEMPLATES = {
  BANK_MANAGER: PERMISSION_CATALOGUE.map((p) => p.code),
  KYC_OFFICER: ['customers.read', 'kyc.read', 'kyc.review', 'kyc.approve', 'audit.read'],
  ACCOUNT_OPS: [
    'customers.read',
    'accounts.read', 'accounts.review', 'accounts.approve',
    'cards.read', 'cards.issue', 'cards.approve', 'cards.block',
    'audit.read'
  ],
  AUDIT_COMPLIANCE: [
    'customers.read',
    'audit.read',
    'reports.read'
  ],
  CUSTOMER_SUPPORT: [
    'customers.read',
    'support.reply'
  ],
  // Legacy aliases
  AUDITOR: ['customers.read', 'audit.read', 'reports.read'],
  OFFICER: ['customers.read', 'kyc.read', 'kyc.review', 'kyc.approve', 'audit.read'],
  MANAGER: PERMISSION_CATALOGUE.map((p) => p.code),
  ADMIN: PERMISSION_CATALOGUE.map((p) => p.code),
};

export const ROLE_ALLOWED_SECTIONS = {
  BANK_MANAGER: ['dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff'],
  KYC_OFFICER: ['dashboard', 'kyc', 'customers', 'audit'],
  ACCOUNT_OPS: ['dashboard', 'accounts', 'cards', 'customers', 'audit'],
  AUDIT_COMPLIANCE: ['dashboard', 'customers', 'audit', 'reports'],
  CUSTOMER_SUPPORT: ['dashboard', 'tickets', 'customers'],
  // Legacy aliases
  AUDITOR: ['dashboard', 'customers', 'audit', 'reports'],
  OFFICER: ['dashboard', 'kyc', 'customers', 'audit'],
  MANAGER: ['dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff'],
  ADMIN: ['dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff', 'user-management', 'roles-permissions', 'product-catalogue']
};

export const ROLE_DEFAULT_SECTION = {
  CUSTOMER_SUPPORT: 'tickets',
  KYC_OFFICER: 'kyc',
  ACCOUNT_OPS: 'accounts',
  AUDIT_COMPLIANCE: 'dashboard',
  BANK_MANAGER: 'dashboard',
  ADMIN: 'dashboard'
};

export function getFirstQueueForRole(role) {
  switch (role) {
    case 'CUSTOMER_SUPPORT': return '/manager/support';
    case 'KYC_OFFICER': return '/manager/kyc';
    case 'ACCOUNT_OPS': return '/manager/accounts';
    case 'AUDIT_COMPLIANCE': return '/manager/dashboard';
    case 'BANK_MANAGER': return '/manager/dashboard';
    case 'ADMIN': return '/manager/dashboard';
    default: return '/manager/dashboard';
  }
}

export function hasSectionAccess(sectionKey, managerUser) {
  if (!managerUser) return false;
  const role = managerUser.role;
  if (role === 'ADMIN' && (sectionKey === 'site-content' || sectionKey === 'platform-settings')) {
    return true;
  }
  const allowed = ROLE_ALLOWED_SECTIONS[role];
  if (allowed) {
    return allowed.includes(sectionKey);
  }
  return false;
}

// ============================================================================
// IDENTITY & RBAC RESOLUTION HELPERS
// ============================================================================

export function getCurrentStaffActor(override = {}) {
  const db = getDb();
  let staffUser = null;

  // 1. Check test caller override first if provided
  if (override.actorEmail) {
    staffUser = (db.staffUsers || []).find(st => st.email && st.email.toLowerCase() === override.actorEmail.toLowerCase());
  } else if (override.actorStaffId || override.staffId) {
    staffUser = (db.staffUsers || []).find(st => st.staffId === (override.actorStaffId || override.staffId));
  }

  // 2. Resolve from active staff session in db.sessions if token is present
  if (!staffUser && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('finedge_manager_token');
    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const session = (db.sessions || []).find(s => s.sessionId === cleanToken && s.type === 'STAFF');
      if (session) {
        const now = Date.now();
        if (new Date(session.expiresAt).getTime() > now) {
          staffUser = (db.staffUsers || []).find(st => st.staffId === session.staffId || (st.email && st.email.toLowerCase() === session.email?.toLowerCase()));
        }
      }
    }
  }

  // 3. Compatibility with saved manager user in storage
  if (!staffUser && typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('finedge_manager_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        staffUser = (db.staffUsers || []).find(st =>
          (st.email && st.email.toLowerCase() === parsed.email?.toLowerCase()) ||
          st.staffId === (parsed.staffId || parsed.id)
        );
      } catch {}
    }
  }

  if (!staffUser) {
    throw new Error('no staff session');
  }

  return {
    email: staffUser.email,
    role: staffUser.role,
    name: staffUser.fullName,
    staffId: staffUser.staffId
  };
}

export function assertAdminOnly(actorOverride = {}, actionLabel = 'This operation') {
  const actor = getCurrentStaffActor(actorOverride);
  if (actor.role !== 'ADMIN') {
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Admin Clearance Required',
      message: `${actionLabel} requires System Administrator clearance.`,
      detail: `${actionLabel} requires System Administrator clearance.`
    };
  }
  return actor;
}

export function assertStaffPermission(requiredPerm, actorOverride = {}) {
  const actor = getCurrentStaffActor(actorOverride);
  if (actor.role === 'AUDIT_COMPLIANCE' || actor.role === 'AUDITOR') {
    throw {
      status: 403,
      code: 'AUDITOR_READ_ONLY',
      title: 'Auditor Read-Only',
      message: 'Auditors have read-only clearance. Operational mutations and decisions are prohibited.',
      detail: 'Auditors have read-only clearance. Operational mutations and decisions are prohibited.'
    };
  }

  const db = getDb();
  let staff = null;
  if (actor.email) {
    staff = (db.staffUsers || []).find(s => s.email && s.email.toLowerCase() === actor.email.toLowerCase());
  }
  if (!staff && actor.staffId) {
    staff = (db.staffUsers || []).find(s => s.staffId && s.staffId === actor.staffId);
  }

  const effective = computeEffectivePermissions(staff || { role: actor.role, permissions: [] }, db);
  const effectivePerms = new Set(effective);
  if (effectivePerms.has('kyc.approve')) effectivePerms.add('kyc.review');
  if (effectivePerms.has('accounts.approve')) effectivePerms.add('accounts.review');
  if (effectivePerms.has('cards.approve')) effectivePerms.add('cards.issue');

  if (requiredPerm && !effectivePerms.has(requiredPerm)) {
    let msg = `Staff member ${actor.email} lacks the required '${requiredPerm}' permission to perform this banking operation.`;
    if (actor.role === 'KYC_OFFICER' && !requiredPerm.startsWith('kyc.') && requiredPerm !== 'customers.read') {
      msg = `Senior KYC Officer (${actor.email}) is restricted to KYC decisions only.`;
    } else if (actor.role === 'ACCOUNT_OPS' && !requiredPerm.startsWith('accounts.') && !requiredPerm.startsWith('cards.') && requiredPerm !== 'customers.read') {
      msg = `Account & Card Operations (${actor.email}) is restricted to account and card decisions only.`;
    } else if (actor.role === 'CUSTOMER_SUPPORT' && !requiredPerm.startsWith('support.') && !requiredPerm.startsWith('tickets.') && requiredPerm !== 'customers.read') {
      msg = `Customer Care Lead (${actor.email}) is restricted to ticket replies and status updates only.`;
    }
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Access Forbidden',
      message: msg,
      detail: msg
    };
  }
  return actor;
}

// ============================================================================
// CANONICAL RECORD NORMALIZERS (Fix 0 Contract)
// ============================================================================

export function normalizeAuditEntry(r) {
  const action = r.action || '';
  let outcome = 'SUCCESS';
  if (action.endsWith('_APPROVED')) outcome = 'APPROVED';
  else if (action.endsWith('_REJECTED')) outcome = 'REJECTED';
  else if (action.endsWith('_INFO_REQUIRED') || action.endsWith('_REQUEST_DOCS') || action === 'KYC_INFO_REQUIRED') outcome = 'INFO REQUIRED';
  else if (action.endsWith('_DISBURSED') || action.endsWith('_BOOKED')) outcome = 'COMPLETED';
  else if (action === 'STAFF_LOGIN_SUCCESS') outcome = 'SUCCESS';
  else if (action === 'STAFF_LOGIN_FAILED' || r.status === 'FAILED' || r.status === 'FAILURE') outcome = 'FAILED';
  else if (r.status === 'SUCCESS') outcome = 'SUCCESS';

  const target = r.target || r.targetId || r.entityId || '';
  let entity = 'System';
  if (target.startsWith('ACC-APP') || action.includes('ACCOUNT_APPLICATION')) entity = 'Account Application';
  else if (target.startsWith('ACC') || action.includes('ACCOUNT')) entity = 'Account';
  else if (target.startsWith('CARD-APP') || action.includes('CARD_APPLICATION')) entity = 'Card Application';
  else if (target.startsWith('CARD') || action.includes('CARD')) entity = 'Card';
  else if (target.startsWith('KYC') || action.includes('KYC')) entity = 'KYC Case';
  else if (target.startsWith('LAPP') || target.startsWith('LN') || action.includes('LOAN')) entity = 'Loan Application';
  else if (target.startsWith('INV') || action.includes('INVESTMENT')) entity = 'Investment Application';
  else if (target.startsWith('STF') || action.includes('STAFF')) entity = 'Staff Member';
  else if (target.startsWith('CUS') || action.includes('CUSTOMER')) entity = 'Customer';
  else if (target.startsWith('TCK') || action.includes('SUPPORT') || action.includes('TICKET')) entity = 'Support Ticket';

  return {
    id: r.logId || r.id,
    logId: r.logId || r.id,
    at: r.timestamp || r.at || new Date().toISOString(),
    timestamp: r.timestamp || r.at || new Date().toISOString(),
    actor: r.actor || r.actorEmail || 'ops.session@finedge.bank',
    actorEmail: r.actor || r.actorEmail || 'ops.session@finedge.bank',
    actorRole: r.actorRole || r.role || 'STAFF',
    role: r.actorRole || r.role || 'STAFF',
    action: r.action,
    entity,
    entityType: entity,
    entityId: target,
    target,
    outcome,
    status: r.status || 'SUCCESS',
    detail: r.details || r.detail || '',
    previousValue: r.previousValue !== undefined ? r.previousValue : (r.prevValue !== undefined ? r.prevValue : null),
    newValue: r.newValue !== undefined ? r.newValue : null
  };
}

export function normalizeKycCase(k, db) {
  const cust = (db?.customers || []).find(c => c.customerId === k.customerId);
  const id = k.kycCaseId || k.caseId || k.id;
  const custObj = cust ? {
    id: cust.customerId,
    customerId: cust.customerId,
    fullName: cust.fullName || cust.name || '—',
    name: cust.fullName || cust.name || '—',
    email: cust.email || '',
    pan: cust.pan || '',
    mobile: cust.mobileNumber || cust.mobile || '',
    dob: cust.dateOfBirth || cust.dob || '',
    address: cust.address || {},
    occupation: cust.occupation || 'SALARIED',
    annualIncome: cust.annualIncome || cust.annualIncomeRange || '1000000_1500000',
    riskCategory: k.riskCategory || cust.riskCategory || 'LOW'
  } : null;

  return {
    id,
    caseId: id,
    kycCaseId: id,
    customerId: k.customerId,
    customerName: cust?.fullName || k.customerName || k.applicantName || k.fullName || '—',
    applicantName: cust?.fullName || k.customerName || k.applicantName || k.fullName || '—',
    customer: custObj,
    email: cust?.email || k.email || '',
    pan: cust?.pan || k.pan || '',
    mobile: cust?.mobileNumber || k.mobile || '',
    dob: cust?.dateOfBirth || k.dob || '',
    address: cust?.address || k.address || {},
    submittedAt: k.submittedAt || k.createdAt || new Date().toISOString(),
    status: k.status || 'UNDER_REVIEW',
    risk: k.riskCategory || k.risk || 'UNASSESSED',
    riskCategory: k.riskCategory || k.risk || 'UNASSESSED',
    documents: (k.documents || []).map(d => ({
      type: d.documentType || d.type || 'DOCUMENT',
      name: d.fileName || d.name || 'document.pdf',
      verified: Boolean(d.verified ?? (k.status === 'APPROVED')),
      state: (k.status === 'APPROVED' || d.verified) ? 'VERIFIED' : 'PENDING'
    })),
    history: (db?.auditLogs || []).filter(a => a.target === id).map(normalizeAuditEntry),
    annualIncomeRange: cust?.annualIncomeRange || k.annualIncomeRange || '1000000_1500000',
    occupation: cust?.occupation || k.occupation || 'SALARIED'
  };
}

export function normalizeAccountApplication(a, db) {
  const cust = (db?.customers || []).find(c => c.customerId === a.customerId);
  const id = a.accountApplicationId || a.id;
  const custObj = cust ? {
    id: cust.customerId,
    customerId: cust.customerId,
    fullName: cust.fullName || cust.name || '—',
    email: cust.email || '',
    pan: cust.pan || '',
    mobile: cust.mobileNumber || cust.mobile || '',
    dob: cust.dateOfBirth || cust.dob || '',
    address: cust.address || {},
    kycStatus: cust.kycStatus || 'NOT_STARTED'
  } : null;

  return {
    id,
    accountApplicationId: id,
    customerId: a.customerId,
    customerName: cust?.fullName || a.customerName || a.fullName || '—',
    applicantName: cust?.fullName || a.customerName || a.fullName || '—',
    customer: custObj,
    productName: a.productName,
    productCode: a.productCode,
    productSlug: a.productSlug,
    initialFunding: Number(a.initialFundingAmount ?? a.initialFunding ?? 10000),
    kycStatus: cust?.kycStatus || a.kycStatus || 'NOT_STARTED',
    submittedAt: a.submittedAt || a.createdAt || new Date().toISOString(),
    status: a.status || 'UNDER_REVIEW',
    createdAccountId: a.createdAccountId || null,
    nomineeName: a.nomineeName || a.nominee?.fullName || null
  };
}

export function normalizeCardApplication(c, db) {
  const cust = (db?.customers || []).find(custRecord => (c.customerId && (custRecord.customerId === c.customerId || custRecord.id === c.customerId)));
  const id = c.cardApplicationId || c.id;
  const custObj = cust ? {
    id: cust.customerId,
    customerId: cust.customerId,
    fullName: cust.fullName || cust.name || '—',
    email: cust.email || '',
    pan: cust.pan || '',
    mobile: cust.mobileNumber || cust.mobile || '',
    dob: cust.dateOfBirth || cust.dob || '',
    address: cust.address || {}
  } : null;

  return {
    id,
    cardApplicationId: id,
    customerId: c.customerId,
    customerName: cust?.fullName || c.customerName || c.fullName || '—',
    applicantName: cust?.fullName || c.customerName || c.fullName || '—',
    customer: custObj,
    cardName: c.cardName,
    productName: c.productName || c.cardName,
    productSlug: c.productSlug,
    cardType: c.cardType || 'CREDIT',
    kind: c.cardType || 'CREDIT',
    linkedAccountId: c.linkedAccountId || 'ACC-1001',
    requestedLimit: c.requestedLimit != null ? Number(c.requestedLimit) : (c.limit != null ? Number(c.limit) : null),
    approvedLimit: c.approvedLimit != null ? Number(c.approvedLimit) : null,
    submittedAt: c.submittedAt || c.createdAt || new Date().toISOString(),
    status: c.status || 'UNDER_REVIEW'
  };
}

export function normalizeLoanApplication(l, db) {
  const cust = (db?.customers || []).find(c => c.customerId === l.customerId);
  const id = l.loanApplicationId || l.applicationId || l.id;
  const status = l.status === 'SANCTIONED' ? 'APPROVED' : (l.status || 'UNDER_REVIEW');
  const amount = Number(l.requestedAmount ?? l.amount ?? 1000000);
  const rate = Number(l.rate ?? l.interestRate ?? 8.75);

  return {
    id,
    loanApplicationId: id,
    applicationId: id,
    customerId: l.customerId,
    customerName: cust?.fullName || l.applicantName || l.fullName || '—',
    applicantName: cust?.fullName || l.applicantName || l.fullName || '—',
    customer: cust ? { fullName: cust.fullName, email: cust.email, mobile: cust.mobileNumber } : (l.customer || null),
    productName: l.productName,
    productSlug: l.productSlug,
    amount,
    requestedAmount: amount,
    sanctionedAmount: l.sanctionedAmount != null ? Number(l.sanctionedAmount) : null,
    rate,
    sanctionedRate: l.sanctionedRate != null ? Number(l.sanctionedRate) : null,
    tenureMonths: Number(l.tenureMonths || 36),
    emi: Number(l.emi || l.monthlyEmi || 0),
    monthlyIncome: Number(l.monthlyIncome || 0),
    employmentType: l.employmentType,
    purpose: l.purpose,
    accountId: l.accountId || l.disbursementAccountId || 'ACC-1001',
    disbursementAccountId: l.disbursementAccountId || l.accountId || 'ACC-1001',
    submittedAt: l.submittedAt || l.createdAt || new Date().toISOString(),
    status,
    steps: l.steps || [],
    timeline: l.timeline || [],
    loanDetails: l.loanDetails || {}
  };
}

export function normalizeInvestmentApplication(i, db) {
  const cust = (db?.customers || []).find(c => c.customerId === i.customerId);
  const id = i.applicationId || i.id;
  const nominee = i.nominee ? {
    fullName: i.nominee.fullName || i.nominee.name || '',
    relationship: i.nominee.relationship || 'Spouse',
    dob: i.nominee.dob || i.nominee.dateOfBirth || ''
  } : null;

  return {
    ...i,
    id,
    applicationId: id,
    customerId: i.customerId,
    customerName: cust?.fullName || i.applicant?.fullName || i.applicantName || i.fullName || '—',
    applicantName: cust?.fullName || i.applicant?.fullName || i.applicantName || i.fullName || '—',
    productName: i.productName || 'FinEdge Term Deposit',
    kind: i.kind || 'FD',
    amount: Number(i.amount ?? i.monthlyAmount ?? 50000),
    depositAmount: Number(i.amount ?? i.monthlyAmount ?? 50000),
    rate: Number(i.rate ?? i.interestRate ?? 7.25),
    interestRate: Number(i.rate ?? i.interestRate ?? 7.25),
    tenureMonths: Number(i.tenureMonths || (i.tenureYears ? i.tenureYears * 12 : 12)),
    maturityAmount: i.maturityAmount != null ? Number(i.maturityAmount) : null,
    submittedAt: i.submittedAt || i.createdAt || new Date().toISOString(),
    status: i.status || 'SUBMITTED',
    holdingId: i.holdingId || null,
    nominee
  };
}

// ============================================================================
// CUSTOMERS & RECORDS DIRECTORY
// ============================================================================

export async function listCustomers({ query = '' } = {}) {
  const list = await managerService.getCustomers();
  const arr = Array.isArray(list) ? list : list?.data || [];
  const db = getDb();
  const normalized = arr.map(c => {
    const realCust = (db.customers || []).find(x => x.customerId === (c.customerId || c.id));
    const rawPan = c.pan || realCust?.pan || '';
    return {
      id: c.customerId || c.id,
      customerId: c.customerId || c.id,
      fullName: c.fullName || c.name || '—',
      name: c.fullName || c.name || '—',
      email: c.email || '',
      mobile: c.mobileNumber || c.mobile || '',
      dob: c.dateOfBirth || c.dob || '',
      pan: rawPan,
      panMasked: c.panMasked || maskPan(rawPan),
      kycStatus: c.kycStatus || 'NOT_STARTED',
      riskCategory: c.riskCategory || 'UNASSESSED',
      createdAt: c.createdAt || new Date().toISOString(),
      address: c.address || {}
    };
  });

  if (!query) return normalized;
  const q = query.toLowerCase().trim();
  return normalized.filter(c =>
    (c.fullName || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.id || '').toLowerCase().includes(q) ||
    (c.pan || '').toLowerCase().includes(q) ||
    (c.panMasked || '').toLowerCase().includes(q) ||
    (c.mobile || '').includes(q)
  );
}

export async function getCustomerDetail(customerId) {
  const db = getDb();
  const customer = (db.customers || []).find(c => (c.customerId || c.id) === customerId);
  const normCustomer = customer ? {
    id: customer.customerId || customer.id,
    customerId: customer.customerId || customer.id,
    fullName: customer.fullName || customer.name || '—',
    email: customer.email || '',
    mobile: customer.mobileNumber || customer.mobile || '',
    dob: customer.dateOfBirth || customer.dob || '',
    pan: customer.pan || '',
    kycStatus: customer.kycStatus || 'NOT_STARTED',
    riskCategory: customer.riskCategory || 'UNASSESSED',
    createdAt: customer.createdAt || new Date().toISOString(),
    address: customer.address || {}
  } : null;

  return {
    customer: normCustomer,
    accounts: (db.accounts || []).filter(a => (a.customerId || a.id) === customerId).map(a => ({
      ...a,
      id: a.accountId || a.id,
      accountId: a.accountId || a.id,
      balance: typeof a.balance === 'object' && a.balance !== null ? (a.balance.availableBalance ?? a.balance.ledgerBalance ?? 0) : (a.availableBalance ?? a.balance ?? 0),
      ledgerBalance: typeof a.balance === 'object' && a.balance !== null ? a.balance.ledgerBalance : (a.ledgerBalance ?? a.balance ?? 0),
      availableBalance: typeof a.balance === 'object' && a.balance !== null ? a.balance.availableBalance : (a.availableBalance ?? a.balance ?? 0)
    })),
    loans: (db.loans || []).filter(l => l.customerId === customerId).map(l => ({
      ...l,
      id: l.loanId || l.id,
      loanId: l.loanId || l.id
    })),
    cards: (db.cards || []).filter(c => c.customerId === customerId).map(c => ({
      ...c,
      id: c.cardId || c.id,
      cardId: c.cardId || c.id
    })),
    tickets: (db.supportTickets || []).filter(t => t.customerId === customerId).map(t => ({
      ...t,
      id: t.ticketId || t.id,
      ticketId: t.ticketId || t.id
    }))
  };
}

// ============================================================================
// KYC QUEUE
// ============================================================================

export async function listKycCases({ status = '', query = '' } = {}) {
  const db = getDb();
  let list = db.kycApplications || [];
  const normalized = list.map(k => normalizeKycCase(k, db));

  let filtered = normalized;
  if (status && status !== 'ALL') {
    filtered = filtered.filter(k => (k.status || '').toUpperCase() === status.toUpperCase());
  }
  if (query) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(k =>
      (k.customerName || '').toLowerCase().includes(q) ||
      (k.id || '').toLowerCase().includes(q) ||
      (k.pan || '').toLowerCase().includes(q) ||
      (k.email || '').toLowerCase().includes(q) ||
      (k.customerId || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

export async function getKycCase(caseId) {
  const db = getDb();
  const kyc = (db.kycApplications || []).find(k => (k.kycCaseId || k.caseId || k.id) === caseId);
  return kyc ? normalizeKycCase(kyc, db) : null;
}

export async function decideKycCase(caseId, { decision, reasonCode, note, actor, actorRole, actorEmail }) {
  const staff = assertStaffPermission('kyc.review', { actor, actorRole, actorEmail });
  const db = getDb();
  const kyc = (db.kycApplications || []).find(k => (k.kycCaseId || k.caseId || k.id) === caseId);
  if (!kyc) throw { status: 404, message: 'KYC case not found' };

  if (decision === 'APPROVED') {
    kyc.status = 'APPROVED';
    kyc.approvedBy = staff.email;
    kyc.approvedAt = new Date().toISOString();
    const cust = (db.customers || []).find(c => c.customerId === kyc.customerId);
    if (cust) {
      cust.kycStatus = 'APPROVED';
      cust.riskCategory = 'LOW';
    }
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'KYC_APPROVED', kyc.kycCaseId, 'SUCCESS', note || 'Approved with remarks: All documents verified');
    return normalizeKycCase(kyc, db);
  } else if (decision === 'INFO_REQUIRED') {
    kyc.status = 'INFO_REQUIRED';
    kyc.infoRequiredAt = new Date().toISOString();
    kyc.decisionReason = note || reasonCode || 'Additional documents required';
    const cust = (db.customers || []).find(c => c.customerId === kyc.customerId);
    if (cust) {
      cust.kycStatus = 'INFO_REQUIRED';
    }
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'KYC_INFO_REQUIRED', kyc.kycCaseId, 'SUCCESS', `Marked Info Required: ${note || reasonCode || 'Documents missing'}`);
    return normalizeKycCase(kyc, db);
  } else {
    kyc.status = 'REJECTED';
    kyc.rejectedBy = staff.email;
    kyc.rejectedAt = new Date().toISOString();
    kyc.decisionReason = note || reasonCode || 'Documents failed statutory checks';
    const cust = (db.customers || []).find(c => c.customerId === kyc.customerId);
    if (cust) {
      cust.kycStatus = 'REJECTED';
    }
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'KYC_REJECTED', kyc.kycCaseId, 'SUCCESS', `Rejected with remarks: ${note || reasonCode}`);
    return normalizeKycCase(kyc, db);
  }
}

// ============================================================================
// ACCOUNT APPLICATIONS
// ============================================================================

export async function listAccountApplications({ status } = {}) {
  const db = getDb();
  const list = db.accountApplications || [];
  const normalized = list.map(a => normalizeAccountApplication(a, db));
  if (!status || status === 'ALL') return normalized;

  const target = status.toUpperCase();
  if (target === 'PENDING' || target === 'UNDER_REVIEW') {
    return normalized.filter(a => ['UNDER_REVIEW', 'PENDING', 'PENDING_APPROVAL', 'PENDING_REVIEW'].includes(a.status));
  }
  return normalized.filter(a => a.status === target);
}

export async function decideAccountApplication(appId, { decision, reasonCode, note, overrideReason, actor, actorRole, actorEmail } = {}) {
  const staff = assertStaffPermission('accounts.review', { actor, actorRole, actorEmail });
  if (decision === 'APPROVED') {
    return managerService.approveAccountApplication(appId, { actor: staff.name, actorRole: staff.role, actorEmail: staff.email });
  } else if (decision === 'INFO_REQUIRED') {
    return managerService.requestInfoAccountApplication(appId, { remarks: note || reasonCode || 'Additional information required', actor: staff.name, actorRole: staff.role, actorEmail: staff.email });
  } else {
    return managerService.rejectAccountApplication(appId, { remarks: note || reasonCode || 'Application rejected', actor: staff.name, actorRole: staff.role, actorEmail: staff.email });
  }
}

export async function openAccount(appId, options = {}) {
  assertStaffPermission('accounts.review', options);
  return managerService.approveAccountApplication(appId);
}

// ============================================================================
// CARD APPLICATIONS
// ============================================================================

export async function listCardApplications({ status, query } = {}) {
  const db = getDb();
  const list = db.cardApplications || [];
  const normalized = list.map(c => normalizeCardApplication(c, db));

  let filtered = normalized;
  if (status && status !== 'ALL') {
    const target = status.toUpperCase();
    if (target === 'PENDING_ISSUANCE' || target === 'UNDER_REVIEW') {
      filtered = filtered.filter(c => ['UNDER_REVIEW', 'PENDING', 'PENDING_APPROVAL', 'PENDING_REVIEW'].includes(c.status));
    } else if (target === 'ISSUED' || target === 'APPROVED') {
      filtered = filtered.filter(c => ['APPROVED', 'ISSUED'].includes(c.status));
    } else if (target === 'DECLINED' || target === 'REJECTED') {
      filtered = filtered.filter(c => ['REJECTED', 'DECLINED'].includes(c.status));
    } else {
      filtered = filtered.filter(c => c.status === target);
    }
  }

  if (query) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(c =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.cardName || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      (c.customerId || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

export async function issueCard(appId, { actor, actorRole, actorEmail, limit = 250000 } = {}) {
  const staff = assertStaffPermission('cards.issue', { actor, actorRole, actorEmail });
  return managerService.approveCardApplication(appId, { limit, actor: staff.name, actorRole: staff.role, actorEmail: staff.email });
}

export async function declineCardApplication(appId, { reasonCode, note, actor, actorRole, actorEmail } = {}) {
  assertStaffPermission('cards.issue', { actor, actorRole, actorEmail });
  return managerService.rejectCardApplication(appId, { remarks: note || reasonCode || 'Card criteria not met' });
}

// ============================================================================
// LOAN APPLICATIONS & DISBURSEMENT
// ============================================================================

export async function listLoanApplications({ status, query } = {}) {
  const db = getDb();
  let list = db.loanApplications || [];
  const normalized = list.map(l => normalizeLoanApplication(l, db));

  let filtered = normalized;
  if (status && status !== 'ALL') {
    const target = status.toUpperCase();
    if (target === 'APPROVED') {
      filtered = filtered.filter(l => l.status === 'APPROVED' || l.status === 'SANCTIONED');
    } else if (target === 'INFO_REQUIRED' || target === 'DOCS_REQUESTED') {
      filtered = filtered.filter(l => l.status === 'INFO_REQUIRED' || l.status === 'DOCS_REQUESTED');
    } else {
      filtered = filtered.filter(l => l.status === target);
    }
  }
  if (query) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(l =>
      (l.customerName || '').toLowerCase().includes(q) ||
      (l.productName || '').toLowerCase().includes(q) ||
      (l.id || '').toLowerCase().includes(q) ||
      (l.customerId || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

export async function decideLoanApplication(appId, { decision, reasonCode, note, actor, actorRole, actorEmail, sanctionedAmount, sanctionedRate }) {
  const staff = assertStaffPermission('loans.review', { actor, actorRole, actorEmail });
  const db = getDb();
  const app = (db.loanApplications || []).find(l => (l.loanApplicationId || l.applicationId || l.id) === appId);
  if (!app) throw { status: 404, message: 'Loan application not found.' };

  const sAmount = sanctionedAmount != null ? Number(sanctionedAmount) : (app.sanctionedAmount || app.requestedAmount || app.amount);
  const sRate = sanctionedRate != null ? Number(sanctionedRate) : (app.sanctionedRate || app.rate || 8.75);

  if (decision === 'APPROVED' || decision === 'SANCTIONED') {
    app.status = decision === 'SANCTIONED' ? 'SANCTIONED' : 'APPROVED';
    app.sanctionedAmount = sAmount;
    app.sanctionedRate = sRate;
    app.decidedBy = staff.email;
    app.decidedAt = new Date().toISOString();
    app.decisionReason = note || 'Loan sanctioned and approved by manager';
    if (Array.isArray(app.steps)) {
      app.steps = app.steps.map(s => {
        if (s.key === 'VERIFICATION' || s.key === 'SUBMITTED') return { ...s, state: 'done', date: s.date || new Date().toISOString() };
        if (s.key === 'APPROVAL' || s.key === 'APPROVED' || s.key === 'SANCTION') return { ...s, state: 'done', date: new Date().toISOString() };
        if (s.key === 'DISBURSEMENT' || s.key === 'DISBURSED') return { ...s, state: 'current' };
        return s;
      });
    }
    if (!Array.isArray(app.timeline)) app.timeline = [];
    app.timeline.push({
      stage: 'APPROVED',
      at: new Date().toISOString(),
      by: staff.email,
      note: `Approved: Sanctioned ₹${sAmount} at ${sRate}% p.a.`
    });
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'LOAN_APPROVED', appId, 'SUCCESS', note || `Sanctioned ₹${sAmount} at ${sRate}% p.a.`);
  } else if (decision === 'REQUEST_DOCS') {
    app.status = 'DOCS_REQUESTED';
    app.decidedBy = staff.email;
    app.decidedAt = new Date().toISOString();
    app.decisionReason = note || reasonCode || 'Additional documentation requested';
    if (Array.isArray(app.steps)) {
      app.steps = app.steps.map(s => {
        if (s.key === 'DOCUMENT_VERIFICATION' || s.key === 'VERIFICATION') {
          return { ...s, state: 'current', label: 'Docs Requested', note: note || reasonCode };
        }
        return s;
      });
    }
    if (!Array.isArray(app.timeline)) app.timeline = [];
    app.timeline.push({
      stage: 'DOCS_REQUESTED',
      at: new Date().toISOString(),
      by: staff.email,
      note: note || reasonCode || 'Additional documents requested'
    });
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'LOAN_REQUEST_DOCS', appId, 'SUCCESS', note || reasonCode);
  } else {
    app.status = 'REJECTED';
    app.decidedBy = staff.email;
    app.decidedAt = new Date().toISOString();
    app.decisionReason = note || reasonCode || 'Loan credit assessment criteria not met';
    if (Array.isArray(app.steps)) {
      app.steps = app.steps.map(s => {
        if (s.key === 'APPROVAL' || s.key === 'APPROVED') return { ...s, state: 'rejected', label: 'Rejected' };
        return s;
      });
    }
    if (!Array.isArray(app.timeline)) app.timeline = [];
    app.timeline.push({
      stage: 'REJECTED',
      at: new Date().toISOString(),
      by: staff.email,
      note: note || reasonCode || 'Loan rejected'
    });
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'LOAN_REJECTED', appId, 'SUCCESS', note || reasonCode);
  }
  return normalizeLoanApplication(app, db);
}

export async function disburseLoan(appId, options = {}) {
  const optObj = typeof options === 'string' ? { disbursementAccountId: options, actorEmail: 'manager@finedge.bank' } : options;
  const staff = assertStaffPermission('loans.disburse', optObj);
  const db = getDb();
  const app = (db.loanApplications || []).find(l => (l.loanApplicationId || l.applicationId || l.id) === appId);
  if (!app) throw { status: 404, message: 'Loan application not found.' };

  if (app.status === 'DISBURSED') {
    throw {
      status: 409,
      code: 'LOAN_ALREADY_DISBURSED',
      title: 'Already Disbursed',
      detail: `Loan application ${appId} has already been disbursed.`
    };
  }

  if (!db.loans) db.loans = [];
  const existingLoan = db.loans.find(l => l.applicationId === appId || l.loanApplicationId === appId);
  if (existingLoan) {
    throw {
      status: 409,
      code: 'LOAN_ALREADY_DISBURSED',
      title: 'Already Disbursed',
      detail: `Loan ${existingLoan.loanId} is already materialized for application ${appId}.`
    };
  }

  const principal = Number(app.sanctionedAmount || app.requestedAmount || app.amount || 1000000);
  const rate = Number(app.sanctionedRate || app.rate || 8.75);
  const tenureMonths = Number(app.tenureMonths || 36);
  const emiCalc = calculateEMI(principal, rate, tenureMonths);
  const emi = emiCalc.emi;
  const schedule = emiCalc.schedule || [];

  const loanId = 'LN-' + Math.floor(100000 + Math.random() * 900000);
  const disbursementRef = 'DISB-' + Math.floor(100000 + Math.random() * 900000);
  const disbursedAt = new Date().toISOString();

  let disbursementAccountId = app.disbursementAccountId || app.accountId;
  let targetAcc = (db.accounts || []).find(a => (a.accountId === disbursementAccountId || a.id === disbursementAccountId));
  if (!targetAcc) {
    targetAcc = (db.accounts || []).find(a => a.customerId === app.customerId) || db.accounts[0];
    disbursementAccountId = targetAcc?.accountId || 'ACC-1001';
  }

  const newLoan = {
    id: loanId,
    loanId,
    applicationId: appId,
    loanApplicationId: appId,
    disbursementRef,
    customerId: app.customerId,
    productName: app.productName || 'FinEdge Home Loan',
    productSlug: app.productSlug || 'home-loan',
    principal,
    sanctionedAmount: principal,
    outstandingPrincipal: principal,
    rate,
    interestRate: rate,
    tenureMonths,
    emi,
    monthlyEmi: emi,
    disbursementAccountId,
    disbursedAccountId: disbursementAccountId,
    disbursedAt,
    startDate: disbursedAt,
    nextEmiDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    schedule
  };
  db.loans.push(newLoan);

  // Credit operative account
  if (targetAcc) {
    targetAcc.balance.availableBalance += principal;
    targetAcc.balance.ledgerBalance += principal;
    const txnId = 'TXN-' + Math.floor(500000 + Math.random() * 500000);
    db.transactions.unshift({
      transactionId: txnId,
      id: txnId,
      accountId: targetAcc.accountId,
      transactionType: 'LOAN_DISBURSEMENT',
      direction: 'CREDIT',
      type: 'CREDIT',
      amount: principal,
      currency: 'INR',
      status: 'SUCCESS',
      description: `Loan Disbursement — ${app.productName || 'FinEdge Loan'} (${loanId})`,
      referenceNumber: disbursementRef,
      runningBalance: targetAcc.balance.availableBalance,
      valueDate: new Date().toISOString().split('T')[0],
      createdAt: disbursedAt
    });
  }

  app.status = 'DISBURSED';
  app.disbursedAt = disbursedAt;
  app.loanId = loanId;
  app.disbursementRef = disbursementRef;
  if (Array.isArray(app.steps)) {
    app.steps = app.steps.map(s => (typeof s === 'object' && s !== null ? { ...s, state: 'done' } : { name: s, state: 'done' }));
  }
  if (!Array.isArray(app.timeline)) app.timeline = [];
  app.timeline.push({
    stage: 'DISBURSED',
    at: disbursedAt,
    by: staff.email,
    note: `Disbursed ₹${principal} to account ${targetAcc?.accountNumber || disbursementAccountId}. Reference: ${disbursementRef}`
  });

  saveDb(db);
  appendAuditLog(staff.email, staff.role, 'LOAN_DISBURSED', appId, 'SUCCESS', `Disbursed ₹${principal} to ${disbursementAccountId}`);

  return {
    success: true,
    id: loanId,
    loanId,
    disbursementRef,
    principal,
    sanctionedAmount: principal,
    creditedAccountLast4: targetAcc?.accountNumber?.slice(-4) || '1001',
    accountId: targetAcc?.accountId || disbursementAccountId,
    disbursedAt,
    status: 'DISBURSED'
  };
}

// ============================================================================
// INVESTMENT APPLICATIONS & BOOKING
// ============================================================================

export async function listInvestmentApplications({ status, query } = {}) {
  const db = getDb();
  let list = db.investmentApplications || [];
  const normalized = list.map(i => normalizeInvestmentApplication(i, db));

  let filtered = normalized;
  if (status && status !== 'ALL') {
    filtered = filtered.filter(i => (i.status || '').toUpperCase() === status.toUpperCase());
  }
  if (query) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(i =>
      (i.customerName || '').toLowerCase().includes(q) ||
      (i.productName || '').toLowerCase().includes(q) ||
      (i.kind || '').toLowerCase().includes(q) ||
      (i.id || '').toLowerCase().includes(q) ||
      (i.customerId || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

export async function decideInvestmentApplication(appId, { decision, reasonCode, note, actor, actorRole, actorEmail }) {
  const staff = assertStaffPermission('investments.review', { actor, actorRole, actorEmail });
  const db = getDb();
  const app = (db.investmentApplications || []).find(i => (i.applicationId || i.id) === appId);
  if (!app) throw { status: 404, message: 'Investment application not found.' };

  app.status = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  app.decisionReason = note || reasonCode;
  app.decidedBy = staff.email;
  app.decidedAt = new Date().toISOString();
  if (Array.isArray(app.steps)) {
    app.steps = app.steps.map(s => {
      if (decision === 'APPROVED') {
        if (s.key === 'VERIFICATION') return { ...s, state: 'COMPLETE', date: new Date().toISOString() };
        if (s.key === 'APPROVED') return { ...s, state: 'COMPLETE', date: new Date().toISOString() };
        if (s.key === 'BOOKED') return { ...s, state: 'CURRENT' };
      } else {
        if (s.key === 'VERIFICATION') return { ...s, state: 'COMPLETE', date: new Date().toISOString() };
        if (s.key === 'APPROVED') return { ...s, state: 'REJECTED', label: 'Rejected' };
      }
      return s;
    });
  }
  saveDb(db);
  appendAuditLog(staff.email, staff.role, `INVESTMENT_${decision}`, appId, 'SUCCESS', note || reasonCode || `Decision: ${decision}`);
  return normalizeInvestmentApplication(app, db);
}

export async function bookInvestmentApplication(appId, options = {}) {
  const staff = assertStaffPermission('investments.book', options);
  const db = getDb();
  const app = (db.investmentApplications || []).find(i => (i.applicationId || i.id) === appId);
  if (!app) throw { status: 404, message: 'Investment application not found.' };

  if (app.status === 'BOOKED' && app.holdingId) {
    return normalizeInvestmentApplication(app, db);
  }

  const holdingId = 'INV-' + Math.floor(100000 + Math.random() * 900000);
  const bookedAt = new Date().toISOString();
  const depAmt = Number(app.amount || app.depositAmount || app.monthlyAmount || 50000);
  const intRate = Number(app.interestRate || app.rate || 7.25);
  const tenure = Number(app.tenureMonths || (app.tenureYears ? app.tenureYears * 12 : 12));
  const maturityAmt = Number(app.maturityAmount || (depAmt * (1 + (intRate / 100) * (tenure / 12))));

  const newHolding = {
    holdingId,
    id: holdingId,
    customerId: app.customerId,
    productName: app.productName || 'FinEdge Term Deposit',
    productSlug: app.productSlug || 'fixed-deposit',
    kind: app.kind || 'FD',
    depositAmount: depAmt,
    currentValue: depAmt,
    interestRate: intRate,
    tenureMonths: tenure,
    maturityAmount: maturityAmt,
    maturityDate: app.maturityDate || new Date(Date.now() + tenure * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startDate: bookedAt,
    status: 'ACTIVE'
  };

  if (!db.investmentHoldings) db.investmentHoldings = [];
  if (!db.investments) db.investments = [];
  db.investmentHoldings.push(newHolding);
  db.investments.push(newHolding);

  app.holdingId = holdingId;
  app.status = 'BOOKED';
  app.bookedAt = bookedAt;
  if (Array.isArray(app.steps)) {
    app.steps = app.steps.map(s => (s.key === 'BOOKED' ? { ...s, state: 'COMPLETE', date: bookedAt } : s));
  }

  saveDb(db);
  appendAuditLog(staff.email, staff.role, 'INVESTMENT_BOOKED', appId, 'SUCCESS', `Formally booked holding ${holdingId} in core banking records`);

  return {
    ...normalizeInvestmentApplication(app, db),
    holdingId,
    success: true
  };
}

// ============================================================================
// STAFF & ROLES ADMINISTRATION
// ============================================================================

export async function listStaff(options = {}) {
  const res = await managerService.getStaffUsers();
  let arr = Array.isArray(res) ? res : res?.data || [];
  if (!options?.includeAdmin) {
    arr = arr.filter(s => s.role !== 'ADMIN');
  }
  return arr.map(s => ({
    id: s.staffId || s.id,
    staffId: s.staffId || s.id,
    name: s.fullName || s.name || 'Staff Member',
    fullName: s.fullName || s.name || 'Staff Member',
    email: s.email,
    role: s.role,
    roleTitle: s.roleTitle || s.role,
    department: s.department || 'Operations',
    status: s.status || 'ACTIVE',
    active: s.status === 'ACTIVE',
    permissions: s.permissions || [],
    lastLogin: s.lastLogin || 'Never'
  }));
}

export async function setStaffActive(staffId, active, options = {}) {
  assertStaffPermission('staff.manage', options);
  return managerService.toggleStaffStatus(staffId, active ? 'ACTIVE' : 'DISABLED');
}

export async function updateStaffPermissions(staffId, permissions, options = {}) {
  assertStaffPermission('roles.manage', options);
  const reason = options.reason || 'Staff permissions updated via Management Console';
  return managerService.updateStaffPermissions(staffId, permissions, { reason });
}

// ============================================================================
// AUDIT LOG & REPORTING
// ============================================================================

export async function listAudit({ actorQuery, action, outcome } = {}) {
  const res = await managerService.getAuditLogs();
  const arr = Array.isArray(res) ? res : res?.data || [];
  let rows = arr.map(normalizeAuditEntry);

  if (actorQuery) {
    const q = actorQuery.toLowerCase().trim();
    rows = rows.filter((r) =>
      (r.actor || '').toLowerCase().includes(q) ||
      (r.entityId || '').toLowerCase().includes(q) ||
      (r.entity || '').toLowerCase().includes(q) ||
      (r.detail || '').toLowerCase().includes(q)
    );
  }
  if (action && action !== 'ALL') {
    rows = rows.filter((r) => r.action === action);
  }
  if (outcome && outcome !== 'ALL') {
    const targetOutcome = outcome.toUpperCase();
    rows = rows.filter((r) => {
      const o = (r.outcome || '').toUpperCase();
      if (targetOutcome === 'SUCCESS') return o === 'SUCCESS';
      if (targetOutcome === 'FAILED') return o === 'FAILED';
      return o === targetOutcome;
    });
  }
  return rows;
}

export function auditCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    ['Time', 'Actor', 'Role', 'Action', 'Entity', 'Entity ID', 'Outcome', 'Detail'].map(esc).join(','),
    ...rows.map((r) => {
      const norm = normalizeAuditEntry(r);
      return [
        norm.at,
        norm.actor,
        norm.actorRole,
        norm.action,
        norm.entity,
        norm.entityId,
        norm.outcome,
        norm.detail
      ].map(esc).join(',');
    }),
  ].join('\n');
}

export async function reportsSummary() {
  const s = getDb();
  const oldest = (rows, key = 'submittedAt') =>
    rows.length ? rows.reduce((a, b) => ((a[key] || '') < (b[key] || '') ? a : b))[key] : null;

  const accBal = (a) => (typeof a.balance === 'object' ? (a.balance.availableBalance ?? a.balance.amount ?? 0) : (Number(a.balance) || 0));
  const totalDeposits = Math.round((s.accounts || []).reduce((sum, a) => sum + accBal(a), 0) * 100) / 100;
  const activeLoans = (s.loans || []).filter(l => l.status === 'ACTIVE' || !l.status).length;
  const loanBook = (s.loans || []).reduce((sum, l) => sum + (Number(l.principal ?? l.sanctionedAmount ?? l.amount) || 0), 0);
  const cardsIssued = (s.cards || []).length;
  const investments = (s.investmentHoldings || s.investments || []).length;

  const kycPendingRows = (s.kycApplications || []).filter((k) => ['PENDING', 'UNDER_REVIEW', 'SUBMITTED'].includes((k.status || '').toUpperCase()));
  const accountPendingRows = (s.accountApplications || []).filter((a) => ['PENDING', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'PENDING_REVIEW'].includes((a.status || '').toUpperCase()));
  const loanPendingRows = (s.loanApplications || []).filter((a) => ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_VERIFICATION', 'PENDING'].includes((a.status || '').toUpperCase()));
  const cardPendingRows = (s.cardApplications || []).filter((a) => ['PENDING', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'PENDING_REVIEW', 'PENDING_ISSUANCE'].includes((a.status || '').toUpperCase()));
  const ticketPendingRows = (s.supportTickets || []).filter((t) => (t.status || '').toUpperCase() !== 'RESOLVED' && (t.status || '').toUpperCase() !== 'CLOSED');

  return {
    customers: (s.customers || []).length,
    accounts: (s.accounts || []).length,
    totalDeposits,
    activeLoans,
    loanBook,
    cardsIssued,
    investments,
    queues: {
      kycPending: { count: kycPendingRows.length, oldestAt: oldest(kycPendingRows, 'submittedAt') },
      accountAppsPending: { count: accountPendingRows.length, oldestAt: oldest(accountPendingRows, 'submittedAt') },
      loanAppsPending: { count: loanPendingRows.length, oldestAt: oldest(loanPendingRows, 'createdAt') || oldest(loanPendingRows, 'submittedAt') },
      cardAppsPending: { count: cardPendingRows.length, oldestAt: oldest(cardPendingRows, 'submittedAt') },
      ticketsOpen: { count: ticketPendingRows.length, oldestAt: oldest(ticketPendingRows, 'createdAt') },
    },
  };
}

export async function listMyDecisions(emailOrName, fallbackName, limit = 10) {
  const db = getDb();
  const ident = (emailOrName || '').toLowerCase().trim();
  const alt = (fallbackName || '').toLowerCase().trim();
  const logs = (db.auditLogs || []).filter((r) => {
    const actorEmail = (r.actor || r.actorEmail || '').toLowerCase().trim();
    const actorName = (r.actorName || '').toLowerCase().trim();
    const matchesActor = (ident && (actorEmail === ident || actorName === ident)) ||
                         (alt && (actorEmail === alt || actorName === alt));
    const isDecision = /_(APPROVED|REJECTED|INFO_REQUIRED|REQUEST_DOCS|DISBURSED|BOOKED|ISSUED|DECLINED)/i.test(r.action);
    return matchesActor && isDecision;
  });
  return logs.map(normalizeAuditEntry).slice(0, limit);
}

// ============================================================================
// SUPPORT TICKETS
// ============================================================================

export async function listAllTickets() {
  const db = getDb();
  const customers = db.customers || [];
  return (db.supportTickets || []).map(t => {
    const cust = customers.find(c => c.customerId === t.customerId || c.id === t.customerId);
    const fullName = t.customerName || t.fullName || cust?.fullName || cust?.name || (t.customerId === 'guest' || !t.customerId ? 'Guest Visitor' : t.customerId);
    return {
      ...t,
      id: t.id || t.ticketId,
      ticketId: t.ticketId || t.id,
      customer: {
        fullName: t.customer?.fullName || fullName,
        email: t.customerEmail || t.email || cust?.email || '',
        mobile: t.customerMobile || t.mobile || cust?.phone || cust?.mobileNumber || '',
      }
    };
  });
}

export async function replyTicket(ticketId, payload = {}) {
  const content = (payload.body || payload.message || payload.text || '').trim();
  const staff = assertStaffPermission('support.reply', payload);
  const now = new Date().toISOString();
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    if (!t.messages) t.messages = [];
    t.messages.push({
      from: 'STAFF',
      sender: staff.name,
      senderType: 'STAFF',
      body: content,
      text: content,
      message: content,
      at: now,
      timestamp: now
    });
    t.status = 'IN_PROGRESS';
    t.updatedAt = now;
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'SUPPORT_TICKET_REPLIED', ticketId, 'SUCCESS', `Replied to ticket: ${content.slice(0, 50)}`);
  }
  return t;
}

export async function setTicketStatus(ticketId, status, options = {}) {
  const staff = assertStaffPermission('support.reply', options);
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    t.status = status;
    t.updatedAt = new Date().toISOString();
    saveDb(db);
    appendAuditLog(staff.email, staff.role, 'SUPPORT_TICKET_STATUS_UPDATED', ticketId, 'SUCCESS', `Ticket status updated to ${status}`);
  }
  return t;
}


export function customersCsv(rows = []) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    ['Customer', 'CIF', 'Email', 'Mobile', 'PAN', 'KYC Status', 'Risk', 'Created'].map(esc).join(','),
    ...rows.map((c) => [
      c.fullName || c.name || '',
      c.id || c.customerId || '',
      c.email || '',
      c.mobile || c.mobileNumber || '',
      maskPan(c.panMasked || c.pan),
      c.kycStatus || 'NOT_STARTED',
      c.riskCategory || 'UNASSESSED',
      c.createdAt || ''
    ].map(esc).join(',')),
  ].join('\n');
}


export async function revealCustomerPan(customerId, actorOverride = {}) {
  const actor = assertStaffPermission('customers.read', actorOverride);
  const db = getDb();
  const cust = (db.customers || []).find(c => (c.customerId || c.id) === customerId);
  if (!cust) throw new Error('Customer not found');
  appendAuditLog(actor.email, actor.role, 'CUSTOMER_PAN_REVEALED', cust.customerId, 'SUCCESS', `Revealed full PAN for CIF ${cust.customerId}`);
  return {
    customerId: cust.customerId,
    pan: cust.pan
  };
}

export const managerBridge = {
  ROLE_ALLOWED_SECTIONS,
  ROLE_DEFAULT_SECTION,
  getFirstQueueForRole,
  customersCsv,
  hasSectionAccess,
  PERMISSION_CATALOGUE,
  ROLE_TEMPLATES,
  getCurrentStaffActor,
  assertStaffPermission,
  normalizeAuditEntry,
  normalizeKycCase,
  normalizeAccountApplication,
  normalizeCardApplication,
  normalizeLoanApplication,
  normalizeInvestmentApplication,
  listCustomers,
  revealCustomerPan,
  getCustomerDetail,
  listKycCases,
  getKycCase,
  decideKycCase,
  listAccountApplications,
  decideAccountApplication,
  openAccount,
  listCardApplications,
  issueCard,
  declineCardApplication,
  listLoanApplications,
  decideLoanApplication,
  disburseLoan,
  listInvestmentApplications,
  decideInvestmentApplication,
  bookInvestmentApplication,
  listStaff,
  setStaffActive,
  updateStaffPermissions,
  listAudit,
  auditCsv,
  reportsSummary,
  listMyDecisions,
  listAllTickets,
  replyTicket,
  setTicketStatus
};

export default managerBridge;


// ============================================================================
// PART C: UNIFIED USER MANAGEMENT BRIDGE FUNCTIONS
// ============================================================================

export async function listUnifiedUsers(options = {}, actorOverride = {}) {
  assertAdminOnly(actorOverride, 'Viewing the unified user directory');
  const db = getDb();
  const customers = (db.customers || []).map(c => ({
    id: c.customerId,
    customerId: c.customerId,
    type: 'CUSTOMER',
    name: c.fullName || 'Customer',
    email: c.email,
    mobile: c.mobileNumber || '—',
    pan: c.pan || '—',
    role: 'CUSTOMER',
    roles: ['CUSTOMER'],
    roleTitle: 'Retail Customer',
    status: c.status || 'ACTIVE',
    kycStatus: c.kycStatus || 'PENDING',
    riskCategory: c.riskCategory || 'LOW',
    createdAt: c.createdAt || '2026-01-01T00:00:00Z',
    cif: c.customerId
  }));

  const staff = (db.staffUsers || []).map(s => ({
    id: s.staffId,
    staffId: s.staffId,
    type: 'STAFF',
    name: s.fullName || 'Staff Member',
    email: s.email,
    mobile: s.mobileNumber || s.phone || '—',
    role: s.role,
    roles: s.roles || [s.role],
    roleTitle: s.roleTitle || s.role,
    department: s.department || 'Operations',
    status: s.status || 'ACTIVE',
    kycStatus: '—',
    employeeCode: s.employeeCode || (s.role !== 'BANK_MANAGER' && s.role !== 'ADMIN' ? s.staffId : null),
    managerCode: s.managerCode || (s.role === 'BANK_MANAGER' ? s.staffId : null),
    adminCode: s.adminCode || (s.role === 'ADMIN' ? s.staffId : null),
    reportingManager: s.reportingManager || (s.role === 'BANK_MANAGER' || s.role === 'ADMIN' ? null : 'Devendra Singhania (STF-001)'),
    designation: s.roleTitle || s.designation || 'Staff',
    permissionOverrides: s.permissionOverrides || {},
    permissions: s.permissions || [],
    effectivePermissions: computeEffectivePermissions(s, db),
    lastLogin: s.lastLogin || 'Never',
    createdAt: s.createdAt || '2026-01-01T00:00:00Z'
  }));

  return [...customers, ...staff];
}

export async function getUserDetail(id, type, actorOverride = {}) {
  assertAdminOnly(actorOverride, 'Viewing user details');
  const db = getDb();
  let user = null;
  const normType = (type || '').toUpperCase();
  if (normType === 'CUSTOMER' || (!type && id.startsWith('CUS'))) {
    const c = (db.customers || []).find(cust => cust.customerId === id);
    if (!c) throw { status: 404, code: 'USER_NOT_FOUND', detail: 'Customer not found.' };
    user = {
      id: c.customerId,
      customerId: c.customerId,
      type: 'CUSTOMER',
      name: c.fullName,
      email: c.email,
      mobile: c.mobileNumber,
      pan: c.pan,
      role: 'CUSTOMER',
      roles: ['CUSTOMER'],
      roleTitle: 'Retail Customer',
      permissions: ['transfers.execute', 'cards.issue', 'accounts.read'],
      permissionOverrides: c.permissionOverrides || {},
      status: c.status || 'ACTIVE',
      kycStatus: c.kycStatus || 'PENDING',
      riskCategory: c.riskCategory || 'LOW',
      cif: c.customerId,
      createdAt: c.createdAt
    };
  } else {
    const s = (db.staffUsers || []).find(st => st.staffId === id);
    if (!s) throw { status: 404, code: 'USER_NOT_FOUND', detail: 'Staff member not found.' };
    user = {
      id: s.staffId,
      staffId: s.staffId,
      type: 'STAFF',
      name: s.fullName,
      email: s.email,
      mobile: s.mobileNumber || s.phone || '—',
      role: s.role,
      roles: s.roles || [s.role],
      roleTitle: s.roleTitle || s.role,
      department: s.department || 'Operations',
      status: s.status || 'ACTIVE',
      kycStatus: '—',
      employeeCode: s.employeeCode || s.staffId,
      managerCode: s.managerCode,
      adminCode: s.adminCode,
      reportingManager: s.reportingManager,
      designation: s.roleTitle || s.designation,
      permissionOverrides: s.permissionOverrides || {},
      permissions: s.permissions || [],
      effectivePermissions: computeEffectivePermissions(s, db),
      lastLogin: s.lastLogin
    };
  }

  const auditTrail = (db.auditLogs || []).filter(a =>
    a.target === id || a.entityId === id || (user.email && a.target === user.email) || (user.email && a.actor === user.email)
  ).map(normalizeAuditEntry);

  return { user, auditTrail };
}

export async function createInternalUser(payload, actorOverride = {}) {
  const actor = getCurrentStaffActor(actorOverride);
  const db = getDb();
  
  const roleType = (payload.roleType || payload.role || '').toUpperCase();
  
  if (roleType === 'ADMIN') {
    if (actor.role !== 'ADMIN') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Admin Clearance Required',
        message: 'Only System Administrators can create Administrator accounts.',
        detail: 'Only System Administrators can create Administrator accounts.'
      };
    }
  } else if (roleType === 'BANK_MANAGER' || roleType === 'MANAGER') {
    if (actor.role !== 'ADMIN') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Admin Clearance Required',
        message: 'Branch managers cannot create manager accounts. System Administrator clearance required.',
        detail: 'Branch managers cannot create manager accounts. System Administrator clearance required.'
      };
    }
  } else {
    if (actor.role !== 'ADMIN' && actor.role !== 'BANK_MANAGER') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Access Forbidden',
        message: 'Administrative clearance required to create internal staff.',
        detail: 'Administrative clearance required to create internal staff.'
      };
    }
  }

  if (!payload.fullName || !payload.email) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Full name and email are required.' };
  }

  if ((db.staffUsers || []).some(s => s.email.toLowerCase() === payload.email.toLowerCase())) {
    throw { status: 409, code: 'EMAIL_EXISTS', detail: 'A staff user with this corporate email already exists.' };
  }

  const newStaffId = 'STF-' + String(db.staffUsers.length + 1).padStart(3, '0');
  let role = 'ACCOUNT_OPS';
  let roleTitle = 'Operations Specialist';
  let department = payload.department || 'Operations';
  let permissions = ROLE_TEMPLATES.ACCOUNT_OPS;

  if (roleType === 'ADMIN') {
    role = 'ADMIN';
    roleTitle = 'System Administrator';
    department = payload.department || 'Platform Administration';
    permissions = PERMISSION_CATALOGUE.map(p => p.code);
  } else if (roleType === 'BANK_MANAGER' || roleType === 'MANAGER') {
    role = 'BANK_MANAGER';
    roleTitle = payload.designation || 'Branch Manager';
    department = payload.department || 'Branch Operations';
    permissions = PERMISSION_CATALOGUE.map(p => p.code);
  } else if (payload.specificRole && ROLE_TEMPLATES[payload.specificRole]) {
    role = payload.specificRole;
    roleTitle = payload.designation || role.replace('_', ' ');
    permissions = ROLE_TEMPLATES[payload.specificRole];
  }

  const newStaffUser = {
    staffId: newStaffId,
    fullName: payload.fullName,
    email: payload.email,
    password: payload.password || 'Staff@2026#Sec',
    role,
    roleTitle,
    department,
    status: 'ACTIVE',
    employeeCode: payload.employeeCode || (role !== 'ADMIN' && role !== 'BANK_MANAGER' ? 'EMP-' + Math.floor(1000 + Math.random() * 9000) : null),
    managerCode: payload.managerCode || (role === 'BANK_MANAGER' ? 'MGR-' + Math.floor(1000 + Math.random() * 9000) : null),
    adminCode: payload.adminCode || (role === 'ADMIN' ? 'ADM-' + Math.floor(100 + Math.random() * 900) : null),
    reportingManager: payload.reportingManager || (role === 'BANK_MANAGER' || role === 'ADMIN' ? null : 'Devendra Singhania (STF-001)'),
    designation: payload.designation || roleTitle,
    permissions,
    permissionOverrides: {},
    lastLogin: 'Never',
    createdAt: new Date().toISOString()
  };

  db.staffUsers.push(newStaffUser);
  saveDb(db);
  appendAuditLog(actor.email, actor.role, 'STAFF_USER_CREATED', newStaffUser.staffId, 'SUCCESS', `Created internal staff user ${newStaffUser.fullName} (${newStaffUser.email}) with role ${newStaffUser.role}`, null, newStaffUser);

  return newStaffUser;
}

export async function updateUserStatus(id, type, status, reason, actorOverride = {}) {
  const actor = getCurrentStaffActor(actorOverride);
  const db = getDb();
  
  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A reason is required to change user status.' };
  }

  let targetUser = null;
  if (type === 'CUSTOMER' || (!type && id.startsWith('CUS'))) {
    targetUser = (db.customers || []).find(c => c.customerId === id);
  } else {
    targetUser = (db.staffUsers || []).find(s => s.staffId === id);
  }

  if (!targetUser) throw { status: 404, code: 'USER_NOT_FOUND', detail: 'User not found.' };

  if (actor.staffId === id || (actor.email && targetUser.email && actor.email.toLowerCase() === targetUser.email.toLowerCase())) {
    throw {
      status: 403,
      code: 'SELF_MODIFICATION_PROHIBITED',
      title: 'Self-Modification Prohibited',
      message: 'You cannot deactivate your own account.',
      detail: 'You cannot deactivate your own account.'
    };
  }

  if (targetUser.role === 'ADMIN' && actor.role !== 'ADMIN') {
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Admin Account Protected',
      message: 'Branch managers cannot modify System Administrator accounts.',
      detail: 'Branch managers cannot modify System Administrator accounts.'
    };
  }

  const prevStatus = targetUser.status || 'ACTIVE';
  targetUser.status = status;
  saveDb(db);

  const action = status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
  appendAuditLog(actor.email, actor.role, action, id, 'SUCCESS', reason.trim(), prevStatus, status);
  return targetUser;
}

export async function updateUserOverrides(id, overrides, reason, actorOverride = {}) {
  const actor = getCurrentStaffActor(actorOverride);
  const db = getDb();

  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A reason is required to update permission overrides.' };
  }

  let target = (db.staffUsers || []).find(s => s.staffId === id);
  if (!target) {
    target = (db.customers || []).find(c => c.customerId === id);
  }
  if (!target) throw { status: 404, code: 'USER_NOT_FOUND', detail: 'User not found.' };

  if (actor.staffId === id || (actor.email && target.email && actor.email.toLowerCase() === target.email.toLowerCase())) {
    throw {
      status: 403,
      code: 'SELF_ESCALATION_PROHIBITED',
      title: 'Self-Escalation Prohibited',
      message: 'Nobody can modify their own roles or permissions. Privileges must be changed by another administrator.',
      detail: 'Nobody can modify their own roles or permissions. Privileges must be changed by another administrator.'
    };
  }

  if (actor.role !== 'ADMIN') {
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Admin Clearance Required',
      message: 'Only System Administrators can manage user-level permission overrides.',
      detail: 'Only System Administrators can manage user-level permission overrides.'
    };
  }

  const prevOverrides = JSON.parse(JSON.stringify(target.permissionOverrides || {}));
  target.permissionOverrides = overrides;
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'USER_OVERRIDES_UPDATED', id, 'SUCCESS', reason.trim(), prevOverrides, overrides);
  return target;
}

export async function updateUserRoles(id, newRoles, reason, actorOverride = {}) {
  const actor = getCurrentStaffActor(actorOverride);
  const db = getDb();

  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A reason is required to change roles.' };
  }

  let target = (db.staffUsers || []).find(s => s.staffId === id);
  let isCustomer = false;
  if (!target) {
    target = (db.customers || []).find(c => c.customerId === id);
    if (target) isCustomer = true;
  }
  if (!target) throw { status: 404, code: 'USER_NOT_FOUND', detail: 'User not found.' };

  if (actor.staffId === id || (actor.email && target.email && actor.email.toLowerCase() === target.email.toLowerCase())) {
    throw {
      status: 403,
      code: 'SELF_ESCALATION_PROHIBITED',
      title: 'Self-Escalation Prohibited',
      message: 'Nobody can modify their own roles or permissions.',
      detail: 'Nobody can modify their own roles or permissions.'
    };
  }

  if (actor.role !== 'ADMIN') {
    const rolesArr = Array.isArray(newRoles) ? newRoles : [newRoles];
    if (rolesArr.includes('ADMIN') || rolesArr.includes('BANK_MANAGER') || target.role === 'ADMIN') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Admin Clearance Required',
        message: 'Branch managers cannot assign Administrator or Manager roles, nor modify Admin accounts.',
        detail: 'Branch managers cannot assign Administrator or Manager roles, nor modify Admin accounts.'
      };
    }
  }

  const prevRole = target.role || (isCustomer ? 'CUSTOMER' : 'STAFF');
  const primaryRole = Array.isArray(newRoles) ? newRoles[0] : newRoles;
  target.role = primaryRole;
  target.roles = Array.isArray(newRoles) ? newRoles : [newRoles];
  if (!isCustomer && ROLE_TEMPLATES[primaryRole]) {
    target.permissions = [...ROLE_TEMPLATES[primaryRole]];
  }
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'USER_ROLE_UPDATED', id, 'SUCCESS', reason.trim(), prevRole, primaryRole);
  return target;
}

// ============================================================================
// PART D: ROLES & PERMISSIONS BRIDGE FUNCTIONS
// ============================================================================

export async function listRoles(actorOverride = {}) {
  assertAdminOnly(actorOverride, 'Viewing role governance');
  const db = getDb();
  const overrides = db.systemRoleOverrides || {};

  const systemRoles = [
    {
      id: 'CUSTOMER',
      name: 'Customer',
      description: 'Retail banking customer with self-service portal clearance',
      isSystem: true,
      permissions: overrides.CUSTOMER || ['customers.read']
    },
    {
      id: 'KYC_OFFICER',
      name: 'KYC Verification Officer',
      description: 'Senior KYC verification, document compliance, and AML assessment',
      isSystem: true,
      permissions: overrides.KYC_OFFICER || ROLE_TEMPLATES.KYC_OFFICER
    },
    {
      id: 'ACCOUNT_OPS',
      name: 'Account & Card Operations Specialist',
      description: 'Account origination decisions and debit/credit card issuance clearance',
      isSystem: true,
      permissions: overrides.ACCOUNT_OPS || ROLE_TEMPLATES.ACCOUNT_OPS
    },
    {
      id: 'AUDIT_COMPLIANCE',
      name: 'Senior Internal Auditor',
      description: 'Independent risk oversight, compliance reporting, and read-only audit log inspection',
      isSystem: true,
      permissions: overrides.AUDIT_COMPLIANCE || ROLE_TEMPLATES.AUDIT_COMPLIANCE
    },
    {
      id: 'CUSTOMER_SUPPORT',
      name: 'Customer Care Lead',
      description: 'Support ticket resolution, inquiry handling, and customer communications',
      isSystem: true,
      permissions: overrides.CUSTOMER_SUPPORT || ROLE_TEMPLATES.CUSTOMER_SUPPORT
    },
    {
      id: 'BANK_MANAGER',
      name: 'Chief Branch Manager',
      description: 'Operational supervisory authority across lending, accounts, cards, and staff',
      isSystem: true,
      permissions: overrides.BANK_MANAGER || ROLE_TEMPLATES.BANK_MANAGER
    },
    {
      id: 'ADMIN',
      name: 'System Administrator',
      description: 'Full platform administration, security roles governance, and product catalogue management',
      isSystem: true,
      permissions: overrides.ADMIN || PERMISSION_CATALOGUE.map(p => p.code)
    }
  ];

  const customRoles = (db.customRoles || []).map(r => ({ ...r, isSystem: false }));
  return [...systemRoles, ...customRoles];
}

export async function createRole(roleData, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Creating custom roles');
  const db = getDb();

  if (!roleData.name || !roleData.name.trim()) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Role name is required.' };
  }

  const roleId = roleData.id || 'ROLE_' + roleData.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if ((db.customRoles || []).some(r => r.id === roleId) || ['CUSTOMER', 'KYC_OFFICER', 'ACCOUNT_OPS', 'AUDIT_COMPLIANCE', 'CUSTOMER_SUPPORT', 'BANK_MANAGER', 'ADMIN'].includes(roleId)) {
    throw { status: 409, code: 'ROLE_EXISTS', detail: 'A role with this identifier already exists.' };
  }

  const newRole = {
    id: roleId,
    name: roleData.name.trim(),
    description: roleData.description || '',
    permissions: Array.isArray(roleData.permissions) ? roleData.permissions : [],
    isSystem: false,
    createdAt: new Date().toISOString()
  };

  db.customRoles = db.customRoles || [];
  db.customRoles.push(newRole);
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'ROLE_CREATED', newRole.id, 'SUCCESS', `Created custom role ${newRole.name}`, null, newRole);
  return newRole;
}

export async function updateRole(roleId, updates, reason, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Modifying role permissions');
  const db = getDb();

  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A reason is required to update role permissions.' };
  }

  const systemRoleIds = ['CUSTOMER', 'KYC_OFFICER', 'ACCOUNT_OPS', 'AUDIT_COMPLIANCE', 'CUSTOMER_SUPPORT', 'BANK_MANAGER', 'ADMIN'];
  const isSystem = systemRoleIds.includes(roleId);

  let prevPermissions = [];
  let nextPermissions = updates.permissions || [];

  if (isSystem) {
    prevPermissions = db.systemRoleOverrides?.[roleId] || (ROLE_TEMPLATES[roleId] ? [...ROLE_TEMPLATES[roleId]] : (roleId === 'ADMIN' ? PERMISSION_CATALOGUE.map(p => p.code) : []));
    ROLE_TEMPLATES[roleId] = [...nextPermissions];
    db.systemRoleOverrides = db.systemRoleOverrides || {};
    db.systemRoleOverrides[roleId] = [...nextPermissions];
    saveDb(db);
  } else {
    const custom = (db.customRoles || []).find(r => r.id === roleId);
    if (!custom) throw { status: 404, code: 'ROLE_NOT_FOUND', detail: 'Custom role not found.' };
    prevPermissions = [...(custom.permissions || [])];
    custom.permissions = [...nextPermissions];
    if (updates.name && !isSystem) custom.name = updates.name;
    if (updates.description) custom.description = updates.description;
    saveDb(db);
  }

  appendAuditLog(actor.email, actor.role, 'ROLE_PERMISSIONS_UPDATED', roleId, 'SUCCESS', reason.trim(), prevPermissions, nextPermissions);
  return { roleId, permissions: nextPermissions };
}

export async function deleteRole(roleId, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Deleting custom roles');
  const db = getDb();

  const systemRoleIds = ['CUSTOMER', 'KYC_OFFICER', 'ACCOUNT_OPS', 'AUDIT_COMPLIANCE', 'CUSTOMER_SUPPORT', 'BANK_MANAGER', 'ADMIN'];
  if (systemRoleIds.includes(roleId)) {
    throw {
      status: 403,
      code: 'SYSTEM_ROLE_IMMUTABLE',
      title: 'System Role Protected',
      detail: 'System roles are foundational and cannot be deleted.'
    };
  }

  const role = (db.customRoles || []).find(r => r.id === roleId);
  if (!role) throw { status: 404, code: 'ROLE_NOT_FOUND', detail: 'Custom role not found.' };

  const assignedUsers = (db.staffUsers || []).filter(s => s.role === roleId || (Array.isArray(s.roles) && s.roles.includes(roleId)));
  if (assignedUsers.length > 0) {
    throw {
      status: 409,
      code: 'ROLE_IN_USE',
      title: 'Role Assigned to Users',
      detail: `Cannot delete role "${role.name}": ${assignedUsers.length} staff member(s) hold this role (${assignedUsers.map(u => u.fullName || u.email).join(', ')}). Revoke the role before deleting.`
    };
  }

  db.customRoles = db.customRoles.filter(r => r.id !== roleId);
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'ROLE_DELETED', roleId, 'SUCCESS', `Deleted custom role ${role.name}`, role, null);
  return { success: true, deletedRoleId: roleId };
}

// ============================================================================
// PART E: PRODUCT CATALOGUE BRIDGE FUNCTIONS
// ============================================================================

export async function adminListProducts(category = null, actorOverride = {}) {
  // assertAdminOnly(actorOverride, 'Viewing product catalogue administration');
  let list = await apiRequest("/api/v1/account-products",{
    method: 'GET'
  }) || [];
  if (category) {
    list = list.filter(p => p.category === category);
  }
  return list.data;
}

export async function adminCreateProduct(productData, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Creating product');
  const db = getDb();

  if (!productData.name || !productData.name.trim()) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Product name is required.' };
  }
  if (!productData.category) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Product category is required.' };
  }

  const slug = productData.slug || productData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug) throw { status: 422, code: 'VALIDATION_ERROR', detail: 'A valid slug could not be derived from the product name.' };

  if ((db.products || []).some(p => p.slug === slug)) {
    throw { status: 409, code: 'PRODUCT_EXISTS', detail: `A product with slug "${slug}" already exists.` };
  }

  if (productData.rateMin !== undefined && (productData.rateMin < 0 || productData.rateMin > 30)) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Interest rate must be between 0% and 30% p.a.' };
  }
  if (productData.rateMax !== undefined && (productData.rateMax < 0 || productData.rateMax > 30)) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Interest rate must be between 0% and 30% p.a.' };
  }
  if (productData.rateMin !== undefined && productData.rateMax !== undefined && productData.rateMin > productData.rateMax) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Minimum rate cannot exceed maximum rate.' };
  }
  if (productData.amountMin !== undefined && productData.amountMax !== undefined && productData.amountMin > productData.amountMax) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Minimum amount cannot exceed maximum amount.' };
  }
  if (productData.annualFee !== undefined && productData.annualFee < 0) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Annual fee cannot be negative.' };
  }
  if (productData.joiningFee !== undefined && productData.joiningFee < 0) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Joining fee cannot be negative.' };
  }
  if (Array.isArray(productData.rateSlabs)) {
    for (const s of productData.rateSlabs) {
      if (s.rate < 0 || s.rate > 30) throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Slab rate must be between 0% and 30%.' };
      if (s.min != null && s.max != null && s.min > s.max) throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Slab minimum balance cannot exceed maximum balance.' };
    }
  }

  const newProduct = {
    ...productData,
    slug,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  db.products = db.products || [];
  db.products.push(newProduct);
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'PRODUCT_CREATED', newProduct.slug, 'SUCCESS', `Created product "${newProduct.name}" (${newProduct.slug}) in category ${newProduct.category}`, null, newProduct);
  return newProduct;
}

export async function adminUpdateProduct(slug, updates, reason, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Editing product');
  const db = getDb();

  const product = (db.products || []).find(p => p.slug === slug);
  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', detail: 'Product not found.' };

  if (updates.rateMin !== undefined && (updates.rateMin < 0 || updates.rateMin > 30)) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Interest rate must be between 0% and 30% p.a.' };
  }
  if (updates.rateMax !== undefined && (updates.rateMax < 0 || updates.rateMax > 30)) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Interest rate must be between 0% and 30% p.a.' };
  }
  if (updates.rateMin !== undefined && updates.rateMax !== undefined && updates.rateMin > updates.rateMax) {
    throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Minimum rate cannot exceed maximum rate.' };
  }
  if (Array.isArray(updates.rateSlabs)) {
    for (const s of updates.rateSlabs) {
      if (s.rate < 0 || s.rate > 30) throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Slab rate must be between 0% and 30%.' };
    }
  }

  const prevVal = JSON.parse(JSON.stringify(product));
  delete updates.slug; // Slug is immutable
  Object.assign(product, updates, { updatedAt: new Date().toISOString() });
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'PRODUCT_UPDATED', slug, 'SUCCESS', reason || `Updated product attributes for ${slug}`, prevVal, product);
  return product;
}

export async function adminSetProductStatus(slug, status, reason, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Changing product status');
  const db = getDb();

  const product = (db.products || []).find(p => p.slug === slug);
  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', detail: 'Product not found.' };

  const prevStatus = product.status || 'ACTIVE';
  product.status = (status === 'INACTIVE' || status === 'DEACTIVATED') ? status : 'ACTIVE';
  product.updatedAt = new Date().toISOString();
  saveDb(db);

  const action = product.status === 'ACTIVE' ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED';
  appendAuditLog(actor.email, actor.role, action, slug, 'SUCCESS', reason || `Product ${slug} marked ${product.status}`, prevStatus, product.status);
  return product;
}

export async function adminDeleteProduct(slug, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Deleting product');
  const db = getDb();

  const product = (db.products || []).find(p => p.slug === slug);
  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', detail: 'Product not found.' };

  const accountsCount = (db.accounts || []).filter(a => a.accountTypeSlug === slug || a.productSlug === slug).length;
  const accountAppsCount = (db.accountApplications || []).filter(a => a.accountTypeSlug === slug || a.productSlug === slug).length;
  const cardsCount = (db.cards || []).filter(c => c.cardTypeSlug === slug || c.productSlug === slug).length;
  const cardAppsCount = (db.cardApplications || []).filter(c => c.cardTypeSlug === slug || c.cardSlug === slug || c.productSlug === slug).length;
  const loansCount = (db.loans || []).filter(l => l.loanTypeSlug === slug || l.loanType === slug || l.productSlug === slug).length;
  const loanAppsCount = (db.loanApplications || []).filter(l => l.loanTypeSlug === slug || l.loanType === slug || l.productSlug === slug).length;
  const invCount = (db.investmentHoldings || []).filter(i => i.schemeSlug === slug || i.productSlug === slug).length;
  const invAppsCount = (db.investmentApplications || []).filter(i => i.schemeSlug === slug || i.productSlug === slug).length;
  
  const totalRefs = accountsCount + accountAppsCount + cardsCount + cardAppsCount + loansCount + loanAppsCount + invCount + invAppsCount;

  if (totalRefs > 0) {
    const details = [];
    if (accountsCount > 0) details.push(`${accountsCount} account(s)`);
    if (accountAppsCount > 0) details.push(`${accountAppsCount} account application(s)`);
    if (cardsCount > 0) details.push(`${cardsCount} card(s)`);
    if (cardAppsCount > 0) details.push(`${cardAppsCount} card application(s)`);
    if (loansCount > 0) details.push(`${loansCount} loan(s)`);
    if (loanAppsCount > 0) details.push(`${loanAppsCount} loan application(s)`);
    if (invCount > 0) details.push(`${invCount} holding(s)`);
    if (invAppsCount > 0) details.push(`${invAppsCount} investment application(s)`);

    throw {
      status: 409,
      code: 'PRODUCT_IN_USE',
      title: 'Product In Use',
      message: `Cannot delete product "${product.name}": ${totalRefs} active records reference it (${details.join(', ')}). Deactivate the product instead to discontinue new offerings.`,
      detail: `Cannot delete product "${product.name}": ${totalRefs} active records reference it (${details.join(', ')}). Deactivate the product instead to discontinue new offerings.`
    };
  }

  db.products = db.products.filter(p => p.slug !== slug);
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'PRODUCT_DELETED', slug, 'SUCCESS', `Deleted unused product ${product.name}`, product, null);
  return { success: true, deletedSlug: slug };
}


// ============================================================================
// MODULE 49: SITE CONTENT & PLATFORM SETTINGS ADMINISTRATION (ADMIN ONLY)
// ============================================================================

export async function adminGetSiteContent(key = null, actorOverride = {}) {
  assertAdminOnly(actorOverride, 'Viewing site content administration');
  const db = getDb();
  const siteContent = db.siteContent || FACTORY_SITE_CONTENT;
  if (!key) return siteContent;
  return siteContent[key] ?? FACTORY_SITE_CONTENT[key] ?? null;
}

export async function adminUpdateSiteContent(key, content, reason, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Updating site content');
  const db = getDb();

  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A justification reason is required to update site content.' };
  }

  db.siteContent = db.siteContent || JSON.parse(JSON.stringify(FACTORY_SITE_CONTENT));
  const prevVal = JSON.parse(JSON.stringify(db.siteContent[key] ?? FACTORY_SITE_CONTENT[key] ?? null));

  // Validations per content block type (Part B2)
  if (key === 'hero') {
    if (!content || typeof content !== 'object') {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Hero content must be an object.' };
    }
    if (!content.headline || !content.headline.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Homepage hero headline cannot be saved empty.' };
    }
    if (!content.subtext || !content.subtext.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Homepage hero subtext cannot be saved empty.' };
    }
    if (!content.primaryCtaLabel || !content.primaryCtaLabel.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Primary CTA label cannot be empty.' };
    }
  } else if (key === 'offers') {
    if (!Array.isArray(content)) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Offers content must be an array of offer blocks.' };
    }
    const allProducts = getProducts({ includeInactive: true });
    const productSlugs = new Set(allProducts.map(p => p.slug));
    for (const offer of content) {
      if (!offer.title || !offer.title.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'All seasonal offers must have a title.' };
      }
      if (!offer.summary || !offer.summary.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'All seasonal offers must have a summary.' };
      }
      const slug = offer.productSlug || offer.linkedProductSlug;
      if (slug && !productSlugs.has(slug)) {
        throw {
          status: 422,
          code: 'VALIDATION_ERROR',
          detail: `Linked product slug "${slug}" does not exist in the Product Catalogue. Select an existing product from the catalogue picker.`
        };
      }
    }
  } else if (key === 'faqs') {
    if (!Array.isArray(content)) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'FAQs content must be an array.' };
    }
    for (const faq of content) {
      if (!faq.q || !faq.q.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'FAQ question text is required.' };
      }
      if (!faq.a || !faq.a.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'FAQ answer text is required.' };
      }
    }
  } else if (key === 'whyPoints') {
    if (!Array.isArray(content)) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Why Points content must be an array.' };
    }
    for (const pt of content) {
      if (!pt.title || !pt.title.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Why FinEdge points must have a title.' };
      }
      if (!pt.body || !pt.body.trim()) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Why FinEdge points must have body copy.' };
      }
    }
  } else if (key === 'footer') {
    if (content.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.supportEmail.trim())) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Support email must be a valid email address.' };
    }
    if (content.grievanceOfficerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.grievanceOfficerEmail.trim())) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Grievance Officer email must be a valid email address.' };
    }
    if (!content.supportPhone || !content.supportPhone.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Support phone number is required.' };
    }
  } else if (key === 'legalPages') {
    if (typeof content !== 'object' || !content) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Legal pages content must be an object of page definitions.' };
    }
    for (const [slug, page] of Object.entries(content)) {
      if (!Array.isArray(page.sections) || page.sections.length === 0) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: `Legal page "${slug}" must retain at least one section.` };
      }
      for (const sec of page.sections) {
        if (!Array.isArray(sec.paragraphs) || sec.paragraphs.length === 0 || !sec.paragraphs.some(p => p && p.trim())) {
          throw { status: 422, code: 'VALIDATION_ERROR', detail: `Section "${sec.heading || sec.id}" on page "${slug}" must contain at least one non-empty paragraph.` };
        }
      }
    }
  }

  db.siteContent[key] = content;
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'SITE_CONTENT_UPDATED', key, 'SUCCESS', reason.trim(), prevVal, content);
  return db.siteContent[key];
}

export async function adminGetSettings(actorOverride = {}) {
  assertAdminOnly(actorOverride, 'Viewing platform settings administration');
  const db = getDb();
  return db.settings || FACTORY_SETTINGS;
}

export async function adminUpdateSettings(updates, reason, actorOverride = {}) {
  const actor = assertAdminOnly(actorOverride, 'Updating platform settings');
  const db = getDb();

  if (!reason || !reason.trim()) {
    throw { status: 422, code: 'REASON_REQUIRED', detail: 'A justification reason is required to update platform settings.' };
  }

  db.settings = db.settings || JSON.parse(JSON.stringify(FACTORY_SETTINGS));
  const prevVal = JSON.parse(JSON.stringify(db.settings));

  // Validations per Part C2
  if (updates.transferRails) {
    for (const [railId, railConfig] of Object.entries(updates.transferRails)) {
      if (railConfig.fee !== undefined && railConfig.fee < 0) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: `Transfer rail fee for ${railId} must be greater than or equal to ?0.` };
      }
      if (railConfig.dailyLimit !== undefined && railConfig.dailyLimit <= 0) {
        throw { status: 422, code: 'VALIDATION_ERROR', detail: `Transfer rail daily limit for ${railId} must be greater than ₹0.` };
      }
    }
  }

  if (updates.inactivityLockMinutes !== undefined) {
    const mins = Number(updates.inactivityLockMinutes);
    if (isNaN(mins) || mins < 1 || mins > 60) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Portal inactivity lock must be configured between 1 and 60 minutes.' };
    }
  }

  if (updates.slaThresholds) {
    const amber = Number(updates.slaThresholds.amberHours);
    const red = Number(updates.slaThresholds.redHours);
    if (isNaN(amber) || amber <= 0) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Amber SLA threshold must be greater than 0 hours.' };
    }
    if (isNaN(red) || red <= amber) {
      throw { status: 422, code: 'VALIDATION_ERROR', detail: 'Red SLA threshold must be strictly greater than the Amber threshold.' };
    }
  }

  Object.assign(db.settings, updates);
  saveDb(db);

  appendAuditLog(actor.email, actor.role, 'PLATFORM_SETTINGS_UPDATED', 'settings', 'SUCCESS', reason.trim(), prevVal, db.settings);
  return db.settings;
}
