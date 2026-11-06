// Manager Bridge Service
// Connects manager sections to managerService and real DB engine with canonical normalization contract
import { managerService } from './managerService.js';
import { getDb, saveDb, appendAuditLog } from './api.js';
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
  ADMIN: ['dashboard', 'kyc', 'accounts', 'loans', 'investments', 'cards', 'tickets', 'customers', 'audit', 'reports', 'staff']
};

export const ROLE_DEFAULT_SECTION = {
  CUSTOMER_SUPPORT: 'tickets',
  KYC_OFFICER: 'kyc',
  ACCOUNT_OPS: 'accounts',
  AUDIT_COMPLIANCE: 'dashboard',
  BANK_MANAGER: 'dashboard'
};

export function getFirstQueueForRole(role) {
  switch (role) {
    case 'CUSTOMER_SUPPORT': return '/manager/support';
    case 'KYC_OFFICER': return '/manager/kyc';
    case 'ACCOUNT_OPS': return '/manager/accounts';
    case 'AUDIT_COMPLIANCE': return '/manager/dashboard';
    case 'BANK_MANAGER': return '/manager/dashboard';
    default: return '/manager/dashboard';
  }
}

export function hasSectionAccess(sectionKey, managerUser) {
  if (!managerUser) return false;
  const role = managerUser.role;
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

  // 1. Resolve from active staff session in db.sessions if token is present
  if (typeof localStorage !== 'undefined') {
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

  // 2. If no active session token in db.sessions, check test caller override
  if (!staffUser && override.actorEmail) {
    staffUser = (db.staffUsers || []).find(st => st.email && st.email.toLowerCase() === override.actorEmail.toLowerCase());
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
  if (actor.role === 'BANK_MANAGER') return actor;

  // Strict role remit checks (Fix 1)
  if (actor.role === 'KYC_OFFICER') {
    if (!requiredPerm.startsWith('kyc.') && requiredPerm !== 'customers.read') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Access Forbidden',
        message: `Senior KYC Officer (${actor.email}) is restricted to KYC decisions only.`,
        detail: `Senior KYC Officer (${actor.email}) is restricted to KYC decisions only.`
      };
    }
  } else if (actor.role === 'ACCOUNT_OPS') {
    if (!requiredPerm.startsWith('accounts.') && !requiredPerm.startsWith('cards.') && requiredPerm !== 'customers.read') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Access Forbidden',
        message: `Account & Card Operations (${actor.email}) is restricted to account and card decisions only.`,
        detail: `Account & Card Operations (${actor.email}) is restricted to account and card decisions only.`
      };
    }
  } else if (actor.role === 'CUSTOMER_SUPPORT') {
    if (!requiredPerm.startsWith('support.') && !requiredPerm.startsWith('tickets.') && requiredPerm !== 'customers.read') {
      throw {
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Access Forbidden',
        message: `Customer Care Lead (${actor.email}) is restricted to ticket replies and status updates only.`,
        detail: `Customer Care Lead (${actor.email}) is restricted to ticket replies and status updates only.`
      };
    }
  }

  const db = getDb();
  let staff = null;
  if (actor.email) {
    staff = (db.staffUsers || []).find(s => s.email && s.email.toLowerCase() === actor.email.toLowerCase());
  }
  if (!staff && actor.staffId) {
    staff = (db.staffUsers || []).find(s => s.staffId && s.staffId === actor.staffId);
  }

  const perms = staff?.permissions || [];
  const effectivePerms = new Set(perms);
  if (effectivePerms.has('kyc.approve')) effectivePerms.add('kyc.review');
  if (effectivePerms.has('accounts.approve')) effectivePerms.add('accounts.review');
  if (effectivePerms.has('cards.approve')) effectivePerms.add('cards.issue');

  if (requiredPerm && !effectivePerms.has(requiredPerm)) {
    throw {
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      title: 'Access Forbidden',
      message: `Staff member ${actor.email} lacks the required '${requiredPerm}' permission to perform this banking operation.`,
      detail: `Staff member ${actor.email} lacks the required '${requiredPerm}' permission to perform this banking operation.`
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
    detail: r.details || r.detail || ''
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
      accountId: a.accountId || a.id
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

  if (decision === 'APPROVED') {
    app.status = 'APPROVED';
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
    app.steps.forEach(s => { s.state = 'done'; });
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
    disbursedAt
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

export async function listStaff() {
  const res = await managerService.getStaffUsers();
  const arr = Array.isArray(res) ? res : res?.data || [];
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


export async function revealCustomerPan(customerId) {
  const actor = assertStaffPermission('customers.read');
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
