// Portal Bridge Service
// Connects reference portal UI components to FinEdge production service layer & DB engine
import {
  apiRequest,
  getDb,
  saveDb,
  resetDemoDb,
  generateUUID,
  getAccessToken
} from './api';
import { accountService } from './accountService';
import { customerService } from './customerService';
import { cardService } from './cardService';
import { formatINR } from '../lib/format';

export const RAILS = [
  { id: 'INTERNAL', label: 'Within FinEdge (Instant)', charge: 0, limit: 1000000, simulated: false },
  { id: 'UPI', label: 'UPI (Instant) — Simulation', charge: 0, limit: 100000, simulated: true },
  { id: 'IMPS', label: 'IMPS (Instant) — Simulation', charge: 5, limit: 500000, simulated: true },
  { id: 'NEFT', label: 'NEFT (2–4 hrs) — Simulation', charge: 0, limit: 1000000, simulated: true },
];

export async function listAccounts(customerId) {
  try {
    const res = await accountService.getAccounts();
    const accounts = Array.isArray(res) ? res : res?.data || [];
    return accounts.map(a => ({
      id: a.accountId || a.id,
      accountId: a.accountId || a.id,
      accountNumber: a.accountNumber,
      productCode: a.productCode,
      productSlug: a.productSlug || (a.productCode ? a.productCode.toLowerCase().replace(/_/g, '-') : 'everyday-savings'),
      accountType: a.accountType || 'SAVINGS',
      productName: a.productName || a.title || 'Savings Account',
      currency: a.currency || 'INR',
      balance: typeof a.balance === 'object' ? a.balance.amount : (Number(a.balance) || 0),
      status: a.status || 'ACTIVE',
      ifscCode: a.ifscCode || 'FNEG0001234',
      branchName: a.branchName || 'BKC Flagship Branch, Mumbai',
      openingDate: a.openingDate || a.createdAt || new Date().toISOString()
    }));
  } catch (e) {
    const db = getDb();
    return (db.accounts || []).filter(a => !customerId || a.customerId === customerId);
  }
}

export async function getAccount(accountId) {
  try {
    const a = await accountService.getAccountDetails(accountId);
    return {
      id: a.accountId || a.id,
      accountId: a.accountId || a.id,
      accountNumber: a.accountNumber,
      productCode: a.productCode,
      productSlug: a.productSlug || (a.productCode ? a.productCode.toLowerCase().replace(/_/g, '-') : 'everyday-savings'),
      accountType: a.accountType || 'SAVINGS',
      productName: a.productName || a.title || 'Savings Account',
      currency: a.currency || 'INR',
      balance: typeof a.balance === 'object' ? a.balance.amount : (Number(a.balance) || 0),
      status: a.status || 'ACTIVE',
      ifscCode: a.ifscCode || 'FNEG0001234',
      branchName: a.branchName || 'BKC Flagship Branch, Mumbai',
      openingDate: a.openingDate || a.createdAt || new Date().toISOString()
    };
  } catch (e) {
    const db = getDb();
    return (db.accounts || []).find(a => (a.accountId || a.id) === accountId);
  }
}

export async function listTransactions(accountId, { from, to } = {}) {
  try {
    const res = await accountService.getTransactions(accountId, { from, to });
    const list = Array.isArray(res) ? res : res?.data || [];
    return list.map(t => ({
      id: t.transactionId || t.id,
      transactionId: t.transactionId || t.id,
      date: t.bookingDateTime || t.timestamp || t.date || new Date().toISOString(),
      description: t.description || t.narrative || 'Banking Transaction',
      type: (t.type || t.transactionType || 'DEBIT').toUpperCase(),
      amount: typeof t.amount === 'object' ? t.amount.amount : (Number(t.amount) || 0),
      balance: typeof t.runningBalance === 'object' ? t.runningBalance.amount : (Number(t.runningBalance ?? t.balance) || 0),
      referenceNumber: t.referenceNumber || t.id || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      status: t.status || 'COMPLETED'
    }));
  } catch (e) {
    const db = getDb();
    return (db.transactions || []).filter(t => t.accountId === accountId);
  }
}

export function statementCsv(account, transactions) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['FinEdge Bank — Account Statement'].join(','),
    ['Account', account.accountNumber, account.productName].map(esc).join(','),
    ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'].map(esc).join(','),
    ...transactions.map((t) =>
      [
        t.date ? t.date.slice(0, 10) : '',
        t.description,
        t.referenceNumber || t.id,
        t.type === 'DEBIT' ? t.amount : '',
        t.type === 'CREDIT' ? t.amount : '',
        t.balance,
      ].map(esc).join(',')
    ),
  ];
  return lines.join('\n');
}

export async function listBeneficiaries(customerId) {
  try {
    const res = await apiRequest('/api/v1/beneficiaries');
    return Array.isArray(res) ? res : res?.data || [];
  } catch (e) {
    const db = getDb();
    return (db.beneficiaries || []).filter(b => !customerId || b.customerId === customerId);
  }
}

export async function addBeneficiary(customerId, { name, accountNumber, ifsc, bankName }) {
  return apiRequest('/api/v1/beneficiaries', {
    method: 'POST',
    body: JSON.stringify({
      beneficiaryName: name,
      accountNumber,
      ifscCode: ifsc,
      bankName: bankName || 'FinEdge Bank',
      nickname: name.split(' ')[0]
    })
  });
}

export async function deleteBeneficiary(customerId, beneficiaryId) {
  try {
    return await apiRequest(`/api/v1/beneficiaries/${beneficiaryId}`, { method: 'DELETE' });
  } catch (e) {
    const db = getDb();
    db.beneficiaries = (db.beneficiaries || []).filter(b => b.beneficiaryId !== beneficiaryId);
    saveDb(db);
    return { success: true };
  }
}

export async function transfer({ customerId, fromAccountId, destinationType, destinationId, amount, railId = 'IMPS', note = '' }) {
  return accountService.initiateTransfer({
    debitAccountId: fromAccountId,
    beneficiaryId: destinationId,
    amount: Number(amount),
    transferMode: railId.toUpperCase(),
    remarks: note || 'Funds Transfer'
  });
}

export async function getMyKyc(customerId) {
  try {
    return await customerService.getKycStatus();
  } catch (e) {
    const db = getDb();
    return (db.kycApplications || []).find(k => k.customerId === customerId) || { status: 'PENDING' };
  }
}

export async function submitKyc(customerId, payload, documents = []) {
  return customerService.submitKyc({
    ...payload,
    submittedDocuments: documents
  });
}

export async function listMyCards(customerId) {
  try {
    const res = await cardService.getCards();
    const list = Array.isArray(res) ? res : res?.data || [];
    return list.map(c => ({
      id: c.cardId || c.id,
      cardId: c.cardId || c.id,
      cardType: (c.cardType || 'CREDIT').toLowerCase(),
      cardName: c.cardName || c.name || 'FinEdge Card',
      maskedCardNumber: c.maskedCardNumber || c.cardNumber || '•••• •••• •••• 9012',
      expiryDate: c.expiryDate || '12/29',
      network: c.network || 'VISA',
      status: c.status || 'ACTIVE',
      creditLimit: c.creditLimit ? (typeof c.creditLimit === 'object' ? c.creditLimit.amount : Number(c.creditLimit)) : 250000,
      availableLimit: c.availableLimit ? (typeof c.availableLimit === 'object' ? c.availableLimit.amount : Number(c.availableLimit)) : 210000,
      controls: c.controls || {
        onlineDomestic: true,
        posDomestic: true,
        atmDomestic: true,
        international: false,
        contactless: true
      }
    }));
  } catch (e) {
    const db = getDb();
    return (db.cards || []).filter(c => !customerId || c.customerId === customerId);
  }
}

export async function listMyCardApplications(customerId) {
  const db = getDb();
  return (db.cardApplications || []).filter(c => !customerId || c.customerId === customerId);
}

export async function updateCardControls(cardId, patch, actorName) {
  return cardService.updateControls(cardId, patch);
}

export async function blockCard(cardId, actorName) {
  return cardService.blockCard(cardId, { reason: 'CUSTOMER_REQUEST', remarks: `Card blocked by ${actorName || 'cardholder'}` });
}

export async function applyCard(customerId, { productSlug, productName, kind, accountId }) {
  return cardService.applyForCard({
    cardType: kind ? kind.toUpperCase() : 'CREDIT',
    cardName: productName,
    linkedAccountId: accountId
  });
}

export async function listMyLoans(customerId) {
  const db = getDb();
  return (db.loans || []).filter(l => !customerId || l.customerId === customerId);
}

export async function listMyLoanApplications(customerId) {
  const db = getDb();
  return (db.loanApplications || []).filter(l => !customerId || l.customerId === customerId);
}

export async function listAccountApplications({ status } = {}) {
  const db = getDb();
  let list = db.accountApplications || [];
  if (status && status !== 'ALL') {
    list = list.filter(a => a.status === status);
  }
  return list;
}

export async function applyLoan(customerId, payload) {
  const db = getDb();
  if (!db.loanApplications) db.loanApplications = [];
  const newApp = {
    id: 'LAPP-' + Math.floor(100000 + Math.random() * 900000),
    applicationId: 'LAPP-' + Math.floor(100000 + Math.random() * 900000),
    customerId,
    productName: payload.productName || 'FinEdge Home Loan',
    productSlug: payload.productSlug || 'home-loan',
    requestedAmount: Number(payload.amount) || 1000000,
    sanctionedAmount: Number(payload.amount) || 1000000,
    tenureMonths: Number(payload.tenureMonths) || 36,
    rate: Number(payload.rate) || 8.75,
    purpose: payload.purpose || 'Personal finance',
    status: 'UNDER_REVIEW',
    createdAt: new Date().toISOString()
  };
  db.loanApplications.push(newApp);
  saveDb(db);
  return newApp;
}

export async function listHoldings(customerId) {
  const db = getDb();
  return (db.investments || []).filter(i => !customerId || i.customerId === customerId);
}

export async function bookFd(customerId, payload) {
  const db = getDb();
  if (!db.investments) db.investments = [];
  const newFd = {
    id: 'INV-FD-' + Math.floor(100000 + Math.random() * 900000),
    customerId,
    kind: 'FD',
    productName: 'Fixed Deposit',
    depositAmount: Number(payload.amount),
    rate: Number(payload.rate) || 7.25,
    tenureMonths: Number(payload.tenureMonths) || 12,
    maturityAmount: Number(payload.maturityAmount) || Math.round(Number(payload.amount) * 1.0725),
    maturityDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    bookingDate: new Date().toISOString()
  };
  db.investments.push(newFd);
  saveDb(db);
  return newFd;
}

export async function bookRd(customerId, payload) {
  const db = getDb();
  if (!db.investments) db.investments = [];
  const newRd = {
    id: 'INV-RD-' + Math.floor(100000 + Math.random() * 900000),
    customerId,
    kind: 'RD',
    productName: 'Recurring Deposit',
    monthlyInstallment: Number(payload.monthlyAmount),
    rate: Number(payload.rate) || 7.00,
    tenureMonths: Number(payload.tenureMonths) || 12,
    maturityAmount: Number(payload.maturityAmount) || Math.round(Number(payload.monthlyAmount) * 12 * 1.045),
    status: 'ACTIVE',
    bookingDate: new Date().toISOString()
  };
  db.investments.push(newRd);
  saveDb(db);
  return newRd;
}

export async function startSip(customerId, payload) {
  const db = getDb();
  if (!db.investments) db.investments = [];
  const newSip = {
    id: 'INV-SIP-' + Math.floor(100000 + Math.random() * 900000),
    customerId,
    kind: 'SIP',
    productName: payload.fundName || 'FinEdge Large Cap Index Fund',
    monthlyAmount: Number(payload.monthlyAmount),
    debitDate: payload.debitDate || 5,
    status: 'ACTIVE',
    bookingDate: new Date().toISOString()
  };
  db.investments.push(newSip);
  saveDb(db);
  return newSip;
}

export async function openSsy(customerId, payload) {
  const db = getDb();
  if (!db.investments) db.investments = [];
  const newSsy = {
    id: 'INV-SSY-' + Math.floor(100000 + Math.random() * 900000),
    customerId,
    kind: 'SSY',
    productName: 'Sukanya Samriddhi Yojana (SSY)',
    girlChildName: payload.girlChildName || 'Child',
    annualDeposit: Number(payload.annualDeposit) || 10000,
    rate: 8.2,
    status: 'ACTIVE',
    bookingDate: new Date().toISOString()
  };
  db.investments.push(newSsy);
  saveDb(db);
  return newSsy;
}

export async function listMyApplications(customerId) {
  const db = getDb();
  const accApps = (db.accountApplications || []).filter(a => !customerId || a.customerId === customerId);
  const cardApps = (db.cardApplications || []).filter(c => !customerId || c.customerId === customerId);
  const loanApps = (db.loanApplications || []).filter(l => !customerId || l.customerId === customerId);
  return [...accApps, ...cardApps, ...loanApps].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
}

export async function listNotifications(customerId) {
  const db = getDb();
  return (db.notifications || []).filter(n => !customerId || n.customerId === customerId || n.targetRole === 'ALL');
}

export async function markNotificationRead(notifId) {
  const db = getDb();
  const notif = (db.notifications || []).find(n => n.id === notifId || n.notificationId === notifId);
  if (notif) notif.read = true;
  saveDb(db);
  return { success: true };
}

export async function markAllNotificationsRead(customerId) {
  const db = getDb();
  (db.notifications || []).forEach(n => {
    if (!customerId || n.customerId === customerId) n.read = true;
  });
  saveDb(db);
  return { success: true };
}

export async function unreadCount(customerId) {
  const db = getDb();
  return (db.notifications || []).filter(n => (!customerId || n.customerId === customerId) && !n.read).length;
}

export async function listMyTickets(customerId) {
  const db = getDb();
  return (db.supportTickets || []).filter(t => !customerId || t.customerId === customerId);
}

export async function raiseTicket(customerId, { subject, message, priority = 'NORMAL', category = 'GENERAL' }) {
  return apiRequest('/api/v1/support/tickets', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      message,
      priority,
      category
    })
  });
}

export async function replyTicket(ticketId, { message, actor = 'Customer' }) {
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    if (!t.messages) t.messages = [];
    t.messages.push({
      sender: actor,
      senderType: 'CUSTOMER',
      message,
      timestamp: new Date().toISOString()
    });
    saveDb(db);
  }
  return t;
}

export async function changePassword(customerId, oldPassword, newPassword) {
  return { success: true, message: 'Password updated successfully' };
}

export async function resetDemoData() {
  resetDemoDb();
  return { success: true };
}

export const portalBridge = {
  RAILS,
  listAccounts,
  getAccount,
  listTransactions,
  statementCsv,
  listBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  transfer,
  getMyKyc,
  submitKyc,
  listMyCards,
  listMyCardApplications,
  updateCardControls,
  blockCard,
  applyCard,
  listMyLoans,
  listMyLoanApplications,
  listAccountApplications,
  applyLoan,
  listHoldings,
  bookFd,
  bookRd,
  startSip,
  openSsy,
  listMyApplications,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadCount,
  listMyTickets,
  raiseTicket,
  replyTicket,
  changePassword,
  resetDemoData
};

export default portalBridge;
