// Manager Bridge Service
// Connects manager sections to managerService and real DB engine
import { managerService } from './managerService';
import { getDb, saveDb, appendAuditLog } from './api';

export const PERMISSION_CATALOGUE = [
  { code: 'customers.read', label: 'View customer directory', module: 'Customers' },
  { code: 'customers.update', label: 'Edit customer records', module: 'Customers' },
  { code: 'kyc.read', label: 'View KYC queue', module: 'KYC Operations' },
  { code: 'kyc.review', label: 'Decide KYC cases', module: 'KYC Operations' },
  { code: 'accounts.review', label: 'Decide account applications', module: 'Account Operations' },
  { code: 'loans.read', label: 'View loan applications', module: 'Loan Operations' },
  { code: 'loans.review', label: 'Decide loan applications', module: 'Loan Operations' },
  { code: 'loans.disburse', label: 'Disburse approved loans', module: 'Loan Operations' },
  { code: 'cards.issue', label: 'Issue and decline cards', module: 'Card Operations' },
  { code: 'support.reply', label: 'Reply to support tickets', module: 'Support' },
  { code: 'staff.manage', label: 'Manage staff accounts', module: 'Staff Administration' },
  { code: 'roles.manage', label: 'Change role permissions', module: 'Roles & Governance' },
  { code: 'audit.read', label: 'View audit log', module: 'Audit & Compliance' },
  { code: 'reports.read', label: 'Export reports', module: 'Audit & Compliance' },
];

export const ROLE_TEMPLATES = {
  OFFICER: ['customers.read', 'kyc.read', 'kyc.review', 'accounts.review', 'loans.read', 'loans.review', 'cards.issue', 'support.reply'],
  MANAGER: ['customers.read', 'customers.update', 'kyc.read', 'kyc.review', 'accounts.review', 'loans.read', 'loans.review', 'loans.disburse', 'cards.issue', 'support.reply', 'audit.read', 'reports.read'],
  ADMIN: PERMISSION_CATALOGUE.map((p) => p.code),
  AUDITOR: ['customers.read', 'kyc.read', 'loans.read', 'audit.read', 'reports.read'],
};

export async function listCustomers({ query = '' } = {}) {
  const list = await managerService.getCustomers();
  const arr = Array.isArray(list) ? list : list?.data || [];
  if (!query) return arr;
  const q = query.toLowerCase();
  return arr.filter(c =>
    (c.fullName || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.customerId || c.id || '').toLowerCase().includes(q) ||
    (c.mobileNumber || '').includes(q)
  );
}

export async function getCustomerDetail(customerId) {
  const db = getDb();
  const customer = (db.customers || []).find(c => (c.customerId || c.id) === customerId);
  return {
    customer,
    accounts: (db.accounts || []).filter(a => a.customerId === customerId),
    loans: (db.loans || []).filter(l => l.customerId === customerId),
    cards: (db.cards || []).filter(c => c.customerId === customerId),
    tickets: (db.supportTickets || []).filter(t => t.customerId === customerId)
  };
}

export async function listKycCases({ status = '', query = '' } = {}) {
  try {
    const res = await managerService.getKycApplications();
    let list = Array.isArray(res) ? res : res?.data || [];
    if (status && status !== 'ALL') {
      list = list.filter(k => (k.status || '').toUpperCase() === status.toUpperCase());
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(k =>
        (k.applicantName || k.fullName || '').toLowerCase().includes(q) ||
        (k.caseId || k.applicationId || k.id || '').toLowerCase().includes(q) ||
        (k.customerId || '').toLowerCase().includes(q)
      );
    }
    return list;
  } catch {
    const db = getDb();
    return db.kycApplications || [];
  }
}

export async function getKycCase(caseId) {
  const db = getDb();
  return (db.kycApplications || []).find(k => (k.caseId || k.applicationId || k.id) === caseId);
}

export async function decideKycCase(caseId, { decision, reasonCode, note, actor = 'Senior KYC Officer', actorRole = 'SENIOR_KYC_OFFICER' }) {
  if (decision === 'APPROVED') {
    return managerService.approveKyc(caseId, { remarks: note || 'KYC approved by officer' });
  } else {
    return managerService.rejectKyc(caseId, { remarks: note || reasonCode || 'Documents failed statutory checks' });
  }
}

export async function listAccountApplications({ status } = {}) {
  try {
    const res = await managerService.getAccountApplications();
    let list = Array.isArray(res) ? res : res?.data || [];
    if (status && status !== 'ALL') {
      list = list.filter(a => (a.status || '').toUpperCase() === status.toUpperCase());
    }
    return list;
  } catch {
    const db = getDb();
    return db.accountApplications || [];
  }
}

export async function decideAccountApplication(appId, { decision, reasonCode, note, actor = 'Ops Officer' }) {
  if (decision === 'APPROVED') {
    return managerService.approveAccountApplication(appId);
  } else {
    return managerService.rejectAccountApplication(appId, { remarks: note || reasonCode || 'Application rejected' });
  }
}

export async function openAccount(appId, { actor, actorRole, openingBalance = 10000 }) {
  return managerService.approveAccountApplication(appId);
}

export async function listCardApplications({ status, query } = {}) {
  try {
    const res = await managerService.getCardApplications();
    let list = Array.isArray(res) ? res : res?.data || [];
    if (status && status !== 'ALL') {
      list = list.filter(c => (c.status || '').toUpperCase() === status.toUpperCase());
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        (c.applicantName || '').toLowerCase().includes(q) ||
        (c.cardApplicationId || c.id || '').toLowerCase().includes(q)
      );
    }
    return list;
  } catch {
    const db = getDb();
    return db.cardApplications || [];
  }
}

export async function issueCard(appId, { actor = 'Card Ops Officer', limit = 250000 }) {
  return managerService.approveCardApplication(appId);
}

export async function declineCardApplication(appId, { reasonCode, note, actor = 'Card Ops Officer' }) {
  return managerService.rejectCardApplication(appId, { remarks: note || reasonCode || 'Card criteria not met' });
}

export async function listLoanApplications({ status, query } = {}) {
  const db = getDb();
  let list = db.loanApplications || [];
  if (status && status !== 'ALL') {
    list = list.filter(l => (l.status || '').toUpperCase() === status.toUpperCase());
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(l =>
      (l.productName || '').toLowerCase().includes(q) ||
      (l.applicationId || l.id || '').toLowerCase().includes(q)
    );
  }
  return list;
}

export async function decideLoanApplication(appId, { decision, reasonCode, note, actor = 'Branch Manager' }) {
  const db = getDb();
  const app = (db.loanApplications || []).find(l => (l.applicationId || l.id) === appId);
  if (app) {
    app.status = decision === 'APPROVED' ? 'SANCTIONED' : 'REJECTED';
    app.decisionReason = note || reasonCode;
    app.decidedBy = actor;
    app.decidedAt = new Date().toISOString();
    saveDb(db);
    appendAuditLog('manager@finedge.bank', 'BRANCH_MANAGER', `LOAN_${decision}`, appId, 'SUCCESS', note || reasonCode);
  }
  return app;
}

export async function disburseLoan(appId, { actor = 'Branch Manager' }) {
  const db = getDb();
  const app = (db.loanApplications || []).find(l => (l.applicationId || l.id) === appId);
  if (app) {
    app.status = 'DISBURSED';
    app.disbursedAt = new Date().toISOString();
    saveDb(db);
    appendAuditLog('manager@finedge.bank', 'BRANCH_MANAGER', 'LOAN_DISBURSED', appId, 'SUCCESS', 'Sanctioned funds disbursed to operative account');
  }
  return app;
}

export async function listStaff() {
  const res = await managerService.getStaffUsers();
  return Array.isArray(res) ? res : res?.data || [];
}

export async function setStaffActive(staffId, active, { actor = 'Admin', actorRole = 'ADMIN' } = {}) {
  return managerService.toggleStaffStatus(staffId, active ? 'ACTIVE' : 'DISABLED');
}

export async function updateStaffPermissions(staffId, permissions, { actor = 'Admin', actorRole = 'ADMIN', reason = '' } = {}) {
  return managerService.updateStaffPermissions(staffId, permissions);
}

export async function listAudit({ actorQuery, action, outcome } = {}) {
  const res = await managerService.getAuditLogs();
  let rows = Array.isArray(res) ? res : res?.data || [];
  if (actorQuery) {
    const q = actorQuery.toLowerCase();
    rows = rows.filter((r) => (r.actor || r.actorEmail || '').toLowerCase().includes(q) || (r.targetId || '').toLowerCase().includes(q));
  }
  if (action && action !== 'ALL') rows = rows.filter((r) => r.action === action);
  if (outcome && outcome !== 'ALL') rows = rows.filter((r) => r.status === outcome || r.outcome === outcome);
  return rows;
}

export function auditCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    ['Time', 'Actor', 'Role', 'Action', 'Entity', 'Entity ID', 'Outcome', 'Detail'].map(esc).join(','),
    ...rows.map((r) => [r.timestamp || r.at, r.actor || r.actorEmail, r.role || r.actorRole, r.action, r.entity || 'System', r.targetId || r.entityId, r.status || r.outcome, r.details || r.detail].map(esc).join(',')),
  ].join('\n');
}

export async function reportsSummary() {
  const s = getDb();
  const oldest = (rows, key = 'submittedAt') =>
    rows.length ? rows.reduce((a, b) => (a[key] < b[key] ? a : b))[key] : null;
  return {
    customers: (s.customers || []).length,
    accounts: (s.accounts || []).length,
    totalDeposits: Math.round((s.accounts || []).reduce((sum, a) => sum + (typeof a.balance === 'object' ? a.balance.amount : Number(a.balance) || 0), 0) * 100) / 100,
    activeLoans: (s.loans || []).length,
    loanBook: (s.loans || []).reduce((sum, l) => sum + (l.principal || 0), 0),
    cardsIssued: (s.cards || []).length,
    investments: (s.investments || []).length,
    queues: {
      kycPending: { count: (s.kycApplications || []).filter((k) => ['PENDING', 'UNDER_REVIEW'].includes(k.status)).length, oldestAt: oldest((s.kycApplications || []).filter((k) => ['PENDING', 'UNDER_REVIEW'].includes(k.status)), 'submittedAt') },
      accountAppsPending: { count: (s.accountApplications || []).filter((a) => a.status === 'PENDING' || a.status === 'PENDING_REVIEW').length, oldestAt: oldest((s.accountApplications || []).filter((a) => a.status === 'PENDING' || a.status === 'PENDING_REVIEW'), 'submittedAt') },
      loanAppsPending: { count: (s.loanApplications || []).filter((a) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(a.status)).length, oldestAt: oldest((s.loanApplications || []).filter((a) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(a.status)), 'createdAt') },
      cardAppsPending: { count: (s.cardApplications || []).filter((a) => a.status === 'PENDING' || a.status === 'PENDING_REVIEW').length, oldestAt: oldest((s.cardApplications || []).filter((a) => a.status === 'PENDING' || a.status === 'PENDING_REVIEW'), 'submittedAt') },
      ticketsOpen: { count: (s.supportTickets || []).filter((t) => t.status !== 'RESOLVED').length, oldestAt: oldest((s.supportTickets || []).filter((t) => t.status !== 'RESOLVED'), 'createdAt') },
    },
  };
}

export async function listMyDecisions(actorName, limit = 10) {
  const db = getDb();
  return (db.auditLogs || [])
    .filter((r) => (r.actor || r.actorEmail) === actorName && /_(APPROVED|REJECTED|INFO_REQUIRED|DISBURSE|ISSUE|DECLINE)/.test(r.action))
    .slice(0, limit);
}

export async function listAllTickets() {
  const db = getDb();
  return db.supportTickets || [];
}

export async function replyTicket(ticketId, { message, actor = 'Ops Officer' }) {
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    if (!t.messages) t.messages = [];
    t.messages.push({
      sender: actor,
      senderType: 'STAFF',
      message,
      timestamp: new Date().toISOString()
    });
    t.status = 'IN_PROGRESS';
    saveDb(db);
  }
  return t;
}

export async function setTicketStatus(ticketId, status) {
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    t.status = status;
    saveDb(db);
  }
  return t;
}

export const managerBridge = {
  PERMISSION_CATALOGUE,
  ROLE_TEMPLATES,
  listCustomers,
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
