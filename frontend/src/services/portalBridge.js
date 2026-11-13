
export function getEffectiveCustomerId(customerId) {
  const db = getDb();
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('finedge_access_token');
    if (token) {
      const clean = token.startsWith('Bearer ') ? token.slice(7) : token;
      const sess = (db.sessions || []).find(s => s.sessionId === clean && s.type === 'CUSTOMER');
      if (sess && new Date(sess.expiresAt).getTime() > Date.now()) {
        return sess.customerId;
      }
    }
    const sessionCust = localStorage.getItem('finedge_session_customer_id');
    if (sessionCust && db.customers?.some(c => c.customerId === sessionCust)) {
      return sessionCust;
    }
  }
  return customerId;
}

// Portal Bridge Service
// Connects reference portal UI components to FinEdge production service layer & DB engine
import {
  apiRequest,
  getDb,
  saveDb,
  resetDemoDb,
  generateUUID,
  getAccessToken,
  getSetting,
  FACTORY_SETTINGS
} from './api.js';
import { accountService } from './accountService.js';
import { customerService } from './customerService.js';
import { cardService } from './cardService.js';
import { maskAccount } from '../lib/format.js';
import { calculateEMI, calculateFD, calculateRD, calculateSSY, calculateSIP } from '../lib/finance.js';
import { CARDS, getCardBySlug, SSY, RD, FD, SIP } from '../data/products.js';

export function getLiveRails() {
  let settingsRails = null;
  try {
    settingsRails = getSetting('transferRails');
  } catch {}
  if (!settingsRails) {
    settingsRails = FACTORY_SETTINGS.transferRails;
  }
  const order = ['INTERNAL', 'UPI', 'IMPS', 'NEFT'];
  return order.map((key) => {
    const r = settingsRails[key] || FACTORY_SETTINGS.transferRails[key];
    const feeVal = r.fee !== undefined ? Number(r.fee) : (r.charge !== undefined ? Number(r.charge) : 0);
    const limitVal = r.dailyLimit !== undefined ? Number(r.dailyLimit) : (r.limit !== undefined ? Number(r.limit) : 1000000);
    return {
      ...r,
      fee: feeVal,
      charge: feeVal,
      dailyLimit: limitVal,
      limit: limitVal,
    };
  });
}

export const RAILS = new Proxy([], {
  get(target, prop, receiver) {
    const live = getLiveRails();
    if (prop === 'length') return live.length;
    if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
    if (typeof prop === 'string' && !isNaN(prop)) return live[Number(prop)];
    const val = live[prop];
    if (typeof val === 'function') return val.bind(live);
    return Reflect.get(live, prop, receiver);
  }
});

function normaliseError(e) {
  if (!e) return new Error('An unexpected error occurred.');
  if (typeof e === 'string') return new Error(e);
  if (e.detail) return new Error(e.detail);
  if (e.message) return new Error(e.message);
  if (e.title) return new Error(e.title);
  return new Error('An unexpected error occurred.');
}

export function canonicalAccount(a) {
  if (!a) return null;
  const id = a.accountId || a.id;
  const rawBal = typeof a.balance === 'object' && a.balance !== null
    ? (a.balance.availableBalance ?? a.balance.amount ?? 0)
    : (Number(a.balance) || 0);
  const ledgerBal = typeof a.balance === 'object' && a.balance !== null
    ? (a.balance.ledgerBalance ?? rawBal)
    : rawBal;
  const acctType = (a.accountType || a.type || 'SAVINGS').toUpperCase();
  const rawAcct = a.rawAccountNumber || a.accountNumber || id;
  const accNum = a.accountNumber || maskAccount(rawAcct);

  return {
    id,
    accountId: id,
    accountNumber: accNum,
    rawAccountNumber: rawAcct,
    type: acctType,
    accountType: acctType,
    productCode: a.productCode,
    productSlug: a.productSlug || (a.productCode ? a.productCode.toLowerCase().replace(/_/g, '-') : 'everyday-savings'),
    productName: a.productName || a.title || 'FinEdge Account',
    balance: Number(rawBal),
    ledgerBalance: Number(ledgerBal),
    currency: a.currency || 'INR',
    status: a.status || 'ACTIVE',
    ifsc: a.ifsc || a.ifscCode || null,
    ifscCode: a.ifsc || a.ifscCode || null,
    branch: a.branch || a.branchName || null,
    branchName: a.branch || a.branchName || null,
    openedAt: a.openedAt || a.openingDate || a.createdAt || null,
    openingDate: a.openedAt || a.openingDate || a.createdAt || null,
    interestRate: a.interestRate !== undefined && a.interestRate !== null ? Number(a.interestRate) : (acctType === 'SAVINGS' ? 7.00 : 0.00),
  };
}

export function canonicalTransaction(t) {
  if (!t) return null;
  const id = t.transactionId || t.id;
  const dir = (t.direction || t.type || t.transactionType || 'DEBIT').toUpperCase();
  const txType = dir.includes('CREDIT') ? 'CREDIT' : 'DEBIT';

  const rawAmt = typeof t.amount === 'object' && t.amount !== null
    ? (t.amount.amount ?? 0)
    : (Number(t.amount) || 0);
  const amt = Math.abs(rawAmt);

  let runBal = null;
  if (t.runningBalance !== undefined && t.runningBalance !== null) {
    runBal = typeof t.runningBalance === 'object' ? t.runningBalance.amount : Number(t.runningBalance);
  } else if (t.balance !== undefined && t.balance !== null) {
    runBal = typeof t.balance === 'object' ? t.balance.amount : Number(t.balance);
  }

  const dateStr = t.valueDate || t.createdAt || t.bookingDateTime || t.timestamp || t.date || new Date().toISOString();
  const ref = t.referenceNumber || t.reference || t.id || id;

  return {
    id,
    transactionId: id,
    date: dateStr,
    description: t.description || t.narrative || 'Banking Transaction',
    type: txType,
    amount: amt,
    balance: runBal,
    runningBalance: runBal,
    reference: ref,
    referenceNumber: ref,
    status: t.status || 'COMPLETED',
    accountId: t.accountId
  };
}

export function canonicalBeneficiary(b) {
  if (!b) return null;
  const id = b.beneficiaryId || b.id;
  const name = b.beneficiaryName || b.name || b.nickname || 'Beneficiary';
  const ifsc = b.ifsc || b.ifscCode || null;
  const rawAcct = b.accountNumber || b.rawAccountNumber || '';
  return {
    id,
    beneficiaryId: id,
    name,
    beneficiaryName: name,
    accountNumber: rawAcct,
    maskedAccountNumber: b.maskedAccountNumber || (rawAcct ? maskAccount(rawAcct) : '—'),
    ifsc,
    ifscCode: ifsc,
    bankName: b.bankName || 'FinEdge Bank',
    nickname: b.nickname || name.split(' ')[0],
    addedAt: b.addedAt || b.createdAt || new Date().toISOString(),
    createdAt: b.addedAt || b.createdAt || new Date().toISOString(),
  };
}

export function canonicalCard(c) {
  if (!c) return null;
  const id = c.cardId || c.id;
  const rawType = (c.cardType || c.type || (c.kind ? c.kind.toLowerCase() : 'credit')).toLowerCase();
  const isCredit = rawType.includes('credit');
  const kind = isCredit ? 'CREDIT' : 'DEBIT';

  const slug = c.productSlug || (isCredit ? 'edge-cashback-credit' : 'classic-debit');
  const product = getCardBySlug(slug) || CARDS.find(card => card.slug === slug || card.name === c.cardName) || null;

  const rawControls = c.controls || {};
  const online = rawControls.online ?? rawControls.onlineEnabled ?? true;
  const atm = rawControls.atm ?? rawControls.atmWithdrawalEnabled ?? true;
  const international = rawControls.international ?? rawControls.internationalEnabled ?? false;
  const contactless = rawControls.contactless ?? rawControls.contactlessEnabled ?? true;

  const rawLimits = c.limits || {};
  const spendDaily = rawLimits.spendDaily ?? rawLimits.dailySpend ?? c.dailyLimit ?? (product?.limits?.posDaily || (isCredit ? 150000 : 100000));
  const atmDaily = rawLimits.atmDaily ?? rawLimits.atmWithdrawal ?? (product?.limits?.atmDaily || (isCredit ? 25000 : 40000));

  const totalLimit = isCredit ? (c.totalLimit ? Number(c.totalLimit) : (product?.creditLimitRange?.max || 250000)) : null;
  const outstanding = isCredit ? (c.outstanding !== undefined ? Number(c.outstanding) : 18450) : null;
  const minDue = isCredit ? (c.minDue !== undefined ? Number(c.minDue) : 1845) : null;
  const dueDate = isCredit ? (c.dueDate || '2026-11-20') : null;

  return {
    id,
    cardId: id,
    productName: c.cardName || product?.name || (isCredit ? 'FinEdge Edge Cashback Card' : 'FinEdge Classic Debit Card'),
    cardName: c.cardName || product?.name || (isCredit ? 'FinEdge Edge Cashback Card' : 'FinEdge Classic Debit Card'),
    productSlug: slug,
    kind,
    cardType: kind,
    network: c.network || product?.network || 'RuPay',
    maskedCardNumber: c.maskedCardNumber || c.cardNumber || '************1234',
    number: c.maskedCardNumber || c.cardNumber || '************1234',
    expiryDate: c.expiryDate || (c.expiryMonth && c.expiryYear ? `${String(c.expiryMonth).padStart(2, '0')}/${String(c.expiryYear).slice(-2)}` : '12/30'),
    status: c.status || 'ACTIVE',
    creditLimit: totalLimit,
    limit: totalLimit,
    outstanding,
    minDue,
    dueDate,
    controls: {
      online,
      atm,
      international,
      contactless,
      onlineEnabled: online,
      atmWithdrawalEnabled: atm,
      internationalEnabled: international,
      contactlessEnabled: contactless
    },
    limits: {
      spendDaily,
      dailySpend: spendDaily,
      atmDaily,
      atmWithdrawal: atmDaily
    }
  };
}

export async function listAccounts(customerId) {
  try {
    const res = await accountService.getAccounts();
    const accounts = Array.isArray(res) ? res : res?.data || [];
    const filtered = accounts.filter(a => !customerId || a.customerId === customerId);
    return filtered.map(canonicalAccount);
  } catch {
    const db = getDb();
    const accounts = (db.accounts || []).filter(a => !customerId || a.customerId === customerId);
    return accounts.map(canonicalAccount);
  }
}

export async function getAccount(accountId) {
  try {
    const a = await accountService.getAccountDetails(accountId);
    return canonicalAccount(a);
  } catch {
    const db = getDb();
    const a = (db.accounts || []).find(ac => (ac.accountId || ac.id) === accountId);
    return canonicalAccount(a);
  }
}

export async function listTransactions(accountId, { from, to } = {}) {
  try {
    const res = await accountService.getTransactions(accountId, { from, to });
    const list = Array.isArray(res) ? res : res?.data || [];
    let rows = list.map(canonicalTransaction);
    // Apply client-side from/to filter so date range presets work reliably
    if (from) {
      const fromStr = String(from).slice(0, 10);
      rows = rows.filter(r => String(r.date).slice(0, 10) >= fromStr);
    }
    if (to) {
      const toStr = String(to).slice(0, 10);
      rows = rows.filter(r => String(r.date).slice(0, 10) <= toStr);
    }
    return rows;
  } catch {
    const db = getDb();
    let txns = (db.transactions || []).filter(t => t.accountId === accountId);
    let rows = txns.map(canonicalTransaction);
    if (from) {
      const fromStr = String(from).slice(0, 10);
      rows = rows.filter(r => String(r.date).slice(0, 10) >= fromStr);
    }
    if (to) {
      const toStr = String(to).slice(0, 10);
      rows = rows.filter(r => String(r.date).slice(0, 10) <= toStr);
    }
    return rows;
  }
}

export function statementCsv(account, transactions) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [...(transactions || [])];
  const totalDebit = rows.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCredit = rows.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const last = rows[rows.length - 1];
  const closingBalance = last && typeof last.balance === 'number' ? last.balance : (account?.balance ?? 0);

  const lines = [
    ['FinEdge Bank — Account Statement'].join(','),
    ['Account', account?.accountNumber || '', account?.productName || ''].map(esc).join(','),
    ['Date', 'Reference', 'Description', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)'].map(esc).join(','),
    ...rows.map((t) =>
      [
        t.date ? String(t.date).slice(0, 10) : '',
        t.reference || t.referenceNumber || t.id,
        t.description,
        t.type === 'DEBIT' ? t.amount : '',
        t.type === 'CREDIT' ? t.amount : '',
        t.balance !== null && t.balance !== undefined ? t.balance : '',
      ].map(esc).join(',')
    ),
    ['Summary', '', '', '', '', ''],
    ['Total Debits', '', '', totalDebit, '', ''],
    ['Total Credits', '', '', '', totalCredit, ''],
    ['Closing Balance', '', '', '', '', closingBalance],
  ];
  return lines.join('\n');
}

export async function listBeneficiaries(customerId) {
  try {
    const res = await apiRequest('/api/v1/beneficiaries');
    const list = Array.isArray(res) ? res : res?.data || [];
    const filtered = list.filter(b => !customerId || b.customerId === customerId);
    return filtered.map(canonicalBeneficiary);
  } catch {
    const db = getDb();
    const list = (db.beneficiaries || []).filter(b => !customerId || b.customerId === customerId);
    return list.map(canonicalBeneficiary);
  }
}

export async function addBeneficiary(customerId, { name, accountNumber, ifsc, bankName }) {
  try {
    const res = await apiRequest('/api/v1/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        beneficiaryName: name,
        accountNumber: String(accountNumber).replace(/\s/g, ''),
        ifscCode: ifsc,
        bankName: bankName || 'FinEdge Bank',
        nickname: name.split(' ')[0]
      })
    });
    return canonicalBeneficiary(res);
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function deleteBeneficiary(customerId, beneficiaryId) {
  try {
    await apiRequest(`/api/v1/beneficiaries/${beneficiaryId}`, { method: 'DELETE' });
    const db = getDb();
    db.beneficiaries = (db.beneficiaries || []).filter(b => b.beneficiaryId !== beneficiaryId && b.id !== beneficiaryId);
    saveDb(db);
    return { success: true };
  } catch (err) {
    const db = getDb();
    db.beneficiaries = (db.beneficiaries || []).filter(b => b.beneficiaryId !== beneficiaryId && b.id !== beneficiaryId);
    saveDb(db);
    return { success: true };
  }
}

export async function transfer({ customerId, fromAccountId, destinationType, destinationId, amount, railId = 'IMPS', note = '', toName }) {
  try {
    // Stale destination pre-check if destination is beneficiary
    if (destinationType === 'BENEFICIARY') {
      const bens = await listBeneficiaries(customerId);
      const exists = bens.some(b => b.id === destinationId || b.beneficiaryId === destinationId);
      if (!exists) {
        throw new Error('Selected beneficiary no longer exists. Please choose a valid beneficiary.');
      }
    }

    const res = await accountService.initiateTransfer({
      debitAccountId: fromAccountId,
      beneficiaryId: destinationId,
      destinationId,
      destinationType,
      amount: Number(amount),
      transferMode: railId.toUpperCase(),
      remarks: note || 'Funds Transfer',
      toName
    });

    const rail = railId.toUpperCase();
    const liveRails = getLiveRails();
    const railObj = liveRails.find(r => r.id === rail) || liveRails[0];
    const fallbackCharge = railObj ? railObj.fee : (rail === 'IMPS' ? 5 : 0);
    const charge = res.charges !== undefined ? Number(res.charges) : (res.charge !== undefined ? Number(res.charge) : fallbackCharge);
    const totalDebit = res.totalDebit !== undefined ? Number(res.totalDebit) : Math.round((Number(amount) + charge) * 100) / 100;

    return {
      reference: res.reference || res.referenceNumber || res.paymentId || 'PAY-' + Math.floor(100000 + Math.random() * 900000),
      referenceNumber: res.reference || res.referenceNumber || res.paymentId,
      amount: Number(amount),
      toName: res.toName || toName || 'Beneficiary',
      fromAccount: res.fromAccount || fromAccountId,
      rail: res.rail || rail,
      charges: res.charges !== undefined ? res.charges : charge,
      totalDebit: res.totalDebit || totalDebit,
      balanceAfter: res.balanceAfter !== undefined ? res.balanceAfter : null,
      at: res.at || new Date().toISOString(),
      simulated: rail !== 'INTERNAL'
    };
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function getMyProfile(customerId) {
  const effCustId = getEffectiveCustomerId(customerId);
  const db = getDb();
  let cust = (db.customers || []).find(c => c.customerId === effCustId);
  if (!cust && customerId) {
    cust = (db.customers || []).find(c => c.customerId === customerId);
  }
  if (!cust && !customerId) {
    cust = (db.customers || [])[0];
  }
  const targetCustId = cust?.customerId || effCustId || customerId || 'CUS-100234';
  const kyc = (db.kycApplications || []).find(k => k.customerId === targetCustId) || {
    id: 'KYC-500987',
    kycCaseId: 'KYC-500987',
    status: 'APPROVED',
    documents: [
      { documentType: 'PAN', fileName: 'pan-card.pdf', verified: true },
      { documentType: 'ADDRESS_PROOF', fileName: 'utility-bill.pdf', verified: true }
    ]
  };

  const customer = {
    customerId: cust?.customerId || targetCustId,
    fullName: cust?.fullName || cust?.name || 'Vikramaditya Sharma',
    email: cust?.email || 'vikram.sharma@finedge.customer',
    mobile: cust?.mobileNumber || cust?.mobile || cust?.phone || '9820110023',
    dob: cust?.dateOfBirth || cust?.dob || '1995-08-14',
    gender: cust?.gender || 'MALE',
    pan: cust?.pan || cust?.panNumber || '',
    occupation: cust?.occupation || 'SALARIED',
    annualIncome: cust?.annualIncome || 1200000,
    address: cust?.address ? {
      line1: cust.address.addressLine1 || cust.address.line1 || '402, FinEdge Horizon Towers',
      city: cust.address.city || 'Mumbai',
      state: cust.address.state || 'Maharashtra',
      pin: cust.address.postalCode || cust.address.pin || '400051'
    } : {
      line1: '402, FinEdge Horizon Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400051'
    },
    kycStatus: kyc?.status || cust?.kycStatus || 'APPROVED'
  };

  const rawDocs = kyc.documents || kyc.submittedDocuments || [];
  const kycCase = {
    id: kyc.kycCaseId || kyc.id || 'KYC-500987',
    kycCaseId: kyc.kycCaseId || kyc.id || 'KYC-500987',
    status: kyc.status || 'APPROVED',
    submittedAt: kyc.submittedAt || kyc.createdAt || '2026-10-01T06:30:00Z',
    documents: rawDocs.map(d => ({
      type: d.documentType || d.type,
      name: d.fileName || d.name || 'document.pdf',
      state: d.state || 'UPLOADED'
    }))
  };

  return { customer, kycCase };
}

export async function getMyKyc(customerId) {
  const profile = await getMyProfile(customerId);
  return profile;
}

export async function submitKyc(customerId, payload, documents = []) {
  const db = getDb();
  if (!db.kycApplications) db.kycApplications = [];
  const kycId = 'KYC-' + Math.floor(500000 + Math.random() * 100000);
  const newCase = {
    kycCaseId: kycId,
    id: kycId,
    customerId,
    fullName: payload.fullName || 'Customer',
    pan: payload.pan,
    dateOfBirth: payload.dob,
    mobileNumber: payload.mobile,
    address: payload.address,
    occupation: payload.occupation,
    annualIncomeRange: payload.annualIncomeRange || payload.annualIncome,
    aadhaarConsent: true,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    documents: documents.map(d => ({
      documentType: d.type,
      type: d.type,
      fileName: d.name,
      name: d.name,
      state: 'UPLOADED'
    })),
    submittedDocuments: documents.map(d => ({
      documentType: d.type,
      type: d.type,
      fileName: d.name,
      name: d.name,
      state: 'UPLOADED'
    }))
  };

  const existingIdx = db.kycApplications.findIndex(k => k.customerId === customerId);
  if (existingIdx !== -1) {
    db.kycApplications[existingIdx] = newCase;
  } else {
    db.kycApplications.unshift(newCase);
  }

  const cust = (db.customers || []).find(c => c.customerId === customerId);
  if (cust) {
    cust.kycStatus = 'SUBMITTED';
    if (payload.pan) cust.pan = payload.pan;
    if (payload.dob) cust.dateOfBirth = payload.dob;
    if (payload.mobile) cust.mobileNumber = payload.mobile;
  }
  saveDb(db);
  return newCase;
}

export async function listMyCards(customerId) {
  try {
    const res = await cardService.getCards();
    const list = Array.isArray(res) ? res : res?.data || [];
    const filtered = list.filter(c => !customerId || c.customerId === customerId);
    return filtered.map(canonicalCard);
  } catch {
    const db = getDb();
    const list = (db.cards || []).filter(c => !customerId || c.customerId === customerId);
    return list.map(canonicalCard);
  }
}

export async function listMyCardApplications(customerId) {
  const db = getDb();
  const list = (db.cardApplications || []).filter(c => !customerId || c.customerId === customerId);
  return list.map(c => {
    const rawKind = (c.cardType || 'CREDIT').toUpperCase();
    const kind = rawKind === 'REPLACEMENT' ? 'Replacement' : rawKind.includes('DEBIT') ? 'Debit' : 'Credit';
    const id = c.cardApplicationId || c.id;
    return {
      id,
      cardApplicationId: id,
      productName: c.cardName || c.productName || 'FinEdge Card',
      cardName: c.cardName || c.productName || 'FinEdge Card',
      productSlug: c.productSlug,
      kind,
      cardType: kind,
      status: c.status || 'UNDER_REVIEW',
      submittedAt: c.submittedAt || c.appliedAt || c.createdAt || new Date().toISOString(),
      linkedAccountId: c.linkedAccountId
    };
  });
}

export async function updateCardControls(cardId, patch, actorName) {
  return cardService.updateControls(cardId, patch);
}

export async function blockCard(cardId, actorName) {
  return cardService.blockCard(cardId, { reason: 'CUSTOMER_REQUEST', remarks: `Card blocked by ${actorName || 'cardholder'}` });
}

export async function applyCard(customerId, { productSlug, productName, kind, accountId, requestedLimit }) {
  try {
    const res = await cardService.applyForCard({
      cardType: kind ? kind.toUpperCase() : 'CREDIT',
      cardName: productName,
      productSlug,
      linkedAccountId: accountId,
      requestedLimit: requestedLimit != null ? Number(requestedLimit) : undefined
    });
    return {
      id: res.cardApplicationId || res.reference || res.id,
      cardApplicationId: res.cardApplicationId || res.reference,
      productName: productName || res.cardName || 'FinEdge Card',
      status: res.status || 'UNDER_REVIEW',
      reference: res.reference || res.cardApplicationId
    };
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function payCard(cardId, { accountId, amount }) {
  try {
    return await apiRequest(`/api/v1/cards/${cardId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ accountId, amount })
    });
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function listMyLoans(customerId) {
  const db = getDb();
  return (db.loans || []).filter(l => !customerId || l.customerId === customerId);
}

export async function listMyLoanApplications(customerId) {
  const db = getDb();
  return (db.loanApplications || []).filter(l => !customerId || l.customerId === customerId);
}

export async function applyLoan(customerId, payload = {}) {
  const err = new Error('Server not connected — bypassed for now');
  err.code = 'SERVER_NOT_CONNECTED';
  err.status = 503;
  throw err;
}

export async function listHoldings(customerId) {
  const db = getDb();
  return (db.investments || []).filter(i => !customerId || i.customerId === customerId);
}

export async function bookFd(customerId, payload = {}) {
  const err = new Error('Server not connected — bypassed for now');
  err.code = 'SERVER_NOT_CONNECTED';
  err.status = 503;
  throw err;
}

export async function bookRd(customerId, payload) {
  const err = new Error('Server not connected — bypassed for now');
  err.code = 'SERVER_NOT_CONNECTED';
  err.status = 503;
  throw err;
}

export async function startSip(customerId, payload = {}) {
  const err = new Error('Server not connected — bypassed for now');
  err.code = 'SERVER_NOT_CONNECTED';
  err.status = 503;
  throw err;
}

export async function openSsy(customerId, payload) {
  const err = new Error('Server not connected — bypassed for now');
  err.code = 'SERVER_NOT_CONNECTED';
  err.status = 503;
  throw err;
}

export async function listAccountApplications({ status } = {}) {
  const db = getDb();
  let list = db.accountApplications || [];
  if (status && status !== 'ALL') {
    list = list.filter(a => a.status === status);
  }
  return list.map(a => ({
    ...a,
    id: a.id || a.accountApplicationId || a.applicationId
  }));
}

export async function listMyInvestmentApplications(customerId) {
  const db = getDb();
  return (db.investmentApplications || []).filter(i => !customerId || i.customerId === customerId);
}

export async function listMyApplications(customerId) {
  const db = getDb();
  const accApps = (db.accountApplications || []).filter(a => !customerId || a.customerId === customerId).map(a => ({
    ...a,
    id: a.applicationId || a.accountApplicationId || a.id,
    kind: 'Account',
    amount: a.initialFunding || 0,
    submittedAt: a.createdAt || a.submittedAt || new Date().toISOString()
  }));

  const cardApps = (db.cardApplications || []).filter(c => !customerId || c.customerId === customerId).map(c => {
    const rawKind = (c.cardType || 'CREDIT').toUpperCase();
    const kind = rawKind === 'REPLACEMENT' ? 'Replacement' : rawKind.includes('DEBIT') ? 'Debit' : 'Credit';
    return {
      ...c,
      id: c.cardApplicationId || c.id,
      kind: `${kind} Card`,
      productName: c.cardName || c.productName || 'FinEdge Card',
      amount: c.requestedLimit || 0,
      submittedAt: c.submittedAt || c.appliedAt || c.createdAt || new Date().toISOString()
    };
  });

  const loanApps = (db.loanApplications || []).filter(l => !customerId || l.customerId === customerId).map(l => ({
    ...l,
    id: l.applicationId || l.id,
    kind: 'Loan',
    amount: l.amount || l.sanctionedAmount || l.requestedAmount || 0,
    submittedAt: l.submittedAt || l.createdAt || new Date().toISOString()
  }));

  const invApps = (db.investmentApplications || []).filter(i => !customerId || i.customerId === customerId).map(i => ({
    ...i,
    id: i.applicationId || i.id,
    kind: i.kind || 'Investment',
    amount: i.amount || 0,
    submittedAt: i.submittedAt || i.createdAt || new Date().toISOString()
  }));

  return [...accApps, ...cardApps, ...loanApps, ...invApps].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

export async function listNotifications(customerId) {
  const db = getDb();
  const notifs = (db.notifications || []).filter(n => !customerId || n.customerId === customerId || n.targetRole === 'ALL');
  return notifs.map(n => ({
    ...n,
    id: n.notificationId || n.id,
    notificationId: n.notificationId || n.id,
    type: n.templateCode || n.type || 'GENERAL',
    createdAt: n.createdAt || new Date().toISOString()
  }));
}

export async function markNotificationRead(arg1, arg2) {
  const notifId = arg2 !== undefined ? arg2 : arg1;
  const db = getDb();
  const notif = (db.notifications || []).find(n => (n.notificationId || n.id) === notifId);
  if (notif) {
    notif.read = true;
    saveDb(db);
  }
  return { success: true };
}

export async function markAllNotificationsRead(customerId) {
  const db = getDb();
  (db.notifications || []).forEach(n => {
    if (!customerId || n.customerId === customerId || n.targetRole === 'ALL') {
      n.read = true;
    }
  });
  saveDb(db);
  return { success: true };
}

export async function unreadCount(customerId) {
  const db = getDb();
  return (db.notifications || []).filter(n => (!customerId || n.customerId === customerId || n.targetRole === 'ALL') && !n.read).length;
}

export async function listMyTickets(customerId) {
  const db = getDb();
  const tickets = (db.supportTickets || []).filter(t => !customerId || t.customerId === customerId);
  return tickets.map(t => ({
    ...t,
    id: t.id || t.ticketId,
    ticketId: t.ticketId || t.id,
  }));
}

export async function raiseTicket(customerId, payload = {}) {
  const desc = (payload.description || payload.message || '').trim();
  return apiRequest('/api/v1/support/tickets', {
    method: 'POST',
    body: JSON.stringify({
      customerId: customerId || payload.customerId,
      subject: payload.subject,
      description: desc,
      message: desc,
      priority: payload.priority || 'NORMAL',
      category: payload.category || 'GENERAL',
      transactionRef: payload.transactionRef || payload.accountRef || '',
      accountRef: payload.accountRef || payload.transactionRef || '',
      fullName: payload.fullName || payload.customerName,
      customerName: payload.fullName || payload.customerName,
      email: payload.email || payload.customerEmail,
      customerEmail: payload.email || payload.customerEmail,
      mobile: payload.mobile || payload.customerMobile,
      customerMobile: payload.mobile || payload.customerMobile,
      source: payload.source || (customerId ? 'PORTAL' : 'PUBLIC_GRIEVANCE')
    })
  });
}

export async function replyTicket(ticketId, payload = {}) {
  const content = (payload.body || payload.message || payload.text || '').trim();
  const actor = payload.actor || 'Customer';
  const from = payload.from || 'CUSTOMER';
  const now = new Date().toISOString();
  const db = getDb();
  const t = (db.supportTickets || []).find(tk => (tk.ticketId || tk.id) === ticketId);
  if (t) {
    if (!t.messages) t.messages = [];
    t.messages.push({
      from,
      sender: actor,
      senderType: from === 'STAFF' ? 'STAFF' : 'CUSTOMER',
      body: content,
      text: content,
      message: content,
      at: now,
      timestamp: now
    });
    t.updatedAt = now;
    saveDb(db);
  }
  return t;
}

export async function changePassword(customerId, oldPassword, newPassword) {
  try {
    return await apiRequest('/api/v1/customers/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: oldPassword, newPassword })
    });
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function resetDemoData() {
  resetDemoDb();
  return { success: true };
}

export const portalBridge = {
  RAILS,
  canonicalAccount,
  canonicalTransaction,
  canonicalBeneficiary,
  canonicalCard,
  listAccounts,
  getAccount,
  listTransactions,
  statementCsv,
  listBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  transfer,
  getMyProfile,
  getMyKyc,
  submitKyc,
  listMyCards,
  listMyCardApplications,
  updateCardControls,
  blockCard,
  applyCard,
  payCard,
  listMyLoans,
  listMyLoanApplications,
  applyLoan,
  listHoldings,
  bookFd,
  bookRd,
  startSip,
  openSsy,
  listAccountApplications,
  listMyInvestmentApplications,
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
