
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
import { loanService } from './loanService.js';
import { notificationService } from './notificationService.js';
import { getMode } from '../lib/serverMode.js';

function decodeJwtSubject(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const clean = token.startsWith('Bearer ') ? token.slice(7) : token;
    const parts = clean.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload?.sub || payload?.customerId || null;
  } catch {
    return null;
  }
}

function isJwtToken(token) {
  if (!token || typeof token !== 'string') return false;
  const clean = token.startsWith('Bearer ') ? token.slice(7) : token;
  return clean.split('.').length === 3 && !clean.startsWith('demo_');
}

function isLiveBackendActive() {
  if (getMode() === 'demo') return false;
  if (getMode() === 'server') return true;
  if (typeof localStorage !== 'undefined') {
    return isJwtToken(localStorage.getItem('finedge_access_token'));
  }
  return false;
}

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
      if (isJwtToken(clean) || getMode() === 'server') {
        const storedId = localStorage.getItem('finedge_session_customer_id');
        return customerId || storedId || decodeJwtSubject(clean);
      }
    }
    return null;
  }
  if (customerId) {
    const cust = (db.customers || []).find(c => c.customerId === customerId);
    if (cust) return customerId;
  }
  return null;
}
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
    blockType: c.blockType || (c.status === 'BLOCKED' ? 'PERMANENT' : null),
    linkedAccountId: c.linkedAccountId || 'ACC-1001',
    customerId: c.customerId,
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
      atmWithdrawal: atmDaily,
      atm: rawLimits.atm ?? atmDaily,
      pos: rawLimits.pos ?? spendDaily,
      ecommerce: rawLimits.ecommerce ?? (product?.limits?.onlineDaily || (isCredit ? 150000 : 100000)),
      contactless: rawLimits.contactless ?? (product?.limits?.contactlessDaily || 5000),
      ...rawLimits
    }
  };
}

export async function listAccounts(customerId) {
  try {
    const res = await accountService.getAccounts();
    const accounts = Array.isArray(res) ? res : res?.data || res?.content || [];
    if (isLiveBackendActive()) {
      return accounts.map(canonicalAccount);
    }
    const filtered = accounts.filter(a => !customerId || !a.customerId || a.customerId === customerId);
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
    const list = Array.isArray(res) ? res : res?.data || res?.content || [];
    if (isLiveBackendActive()) {
      return list.map(canonicalBeneficiary);
    }
    const filtered = list.filter(b => !customerId || !b.customerId || b.customerId === customerId);
    return filtered.map(canonicalBeneficiary);
  } catch {
    const db = getDb();
    const list = (db.beneficiaries || []).filter(b => !customerId || b.customerId === customerId);
    return list.map(canonicalBeneficiary);
  }
}

export async function addBeneficiary(customerId, { name, accountNumber, ifsc, bankName, nickname }) {
  try {
    const cleanAcct = String(accountNumber || '').replace(/\s/g, '');
    const res = await apiRequest('/api/v1/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        beneficiaryName: name,
        accountNumber: cleanAcct,
        confirmAccountNumber: cleanAcct,
        ifscCode: String(ifsc || '').trim().toUpperCase(),
        bankName: bankName || 'FinBank',
        nickname: (nickname || name || 'Payee').trim().slice(0, 50)
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
    if (isLiveBackendActive()) {
      throw normaliseError(err);
    }
    const db = getDb();
    db.beneficiaries = (db.beneficiaries || []).filter(b => b.beneficiaryId !== beneficiaryId && b.id !== beneficiaryId);
    saveDb(db);
    return { success: true };
  }
}

export async function transfer({ customerId, fromAccountId, destinationType, destinationId, amount, railId = 'IMPS', note = '', toName }) {
  try {
    const mode = String(railId || 'IMPS').toUpperCase();
    // Stale destination pre-check if destination is beneficiary
    if (destinationType === 'BENEFICIARY') {
      const bens = await listBeneficiaries(customerId);
      const exists = bens.some(b => b.id === destinationId || b.beneficiaryId === destinationId);
      if (!exists) {
        throw new Error('Selected beneficiary no longer exists. Please choose a valid beneficiary.');
      }
    }

    let res;
    if (isLiveBackendActive() && (mode === 'INTERNAL' || destinationType === 'OWN_ACCOUNT')) {
      res = await accountService.initiateInternalTransfer({
        sourceAccountId: fromAccountId,
        destinationAccountId: destinationId,
        amount: Number(amount),
        remarks: note || 'Internal Funds Transfer'
      });
    } else if (isLiveBackendActive() && mode === 'UPI') {
      res = await accountService.initiateUpiTransfer({
        debitAccountId: fromAccountId,
        beneficiaryId: destinationId,
        amount: Number(amount),
        remarks: note || 'UPI Transfer'
      });
    } else {
      res = await accountService.initiateTransfer({
        debitAccountId: fromAccountId,
        beneficiaryId: destinationId,
        destinationId,
        destinationType,
        amount: Number(amount),
        transferMode: mode,
        remarks: note || 'Funds Transfer',
        toName
      });
    }

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

function mapIncomeRangeEnum(val) {
  if (!val) return '500000_1000000';
  const s = String(val).toUpperCase();
  if (['BELOW_500000', '500000_1000000', '1000000_2500000', 'ABOVE_2500000'].includes(s)) return s;
  const num = Number(val);
  if (!isNaN(num)) {
    if (num < 500000) return 'BELOW_500000';
    if (num <= 1000000) return '500000_1000000';
    if (num <= 2500000) return '1000000_2500000';
    return 'ABOVE_2500000';
  }
  return '500000_1000000';
}

export async function getMyProfile(customerId) {
  if (isLiveBackendActive()) {
    try {
      const [prof, kyc, docsRes] = await Promise.all([
        customerService.getProfile().catch((e) => (e?.status === 404 ? null : Promise.reject(e))),
        customerService.getKycStatus().catch(() => null),
        customerService.getKycDocuments().catch(() => [])
      ]);

      let fallbackUser = null;
      if (typeof localStorage !== 'undefined') {
        try { fallbackUser = JSON.parse(localStorage.getItem('finedge_demo_user') || 'null'); } catch {}
      }

      if (prof) {
        const primaryAddr = Array.isArray(prof.customerAddress) && prof.customerAddress.length > 0
          ? prof.customerAddress[0]
          : null;
        const rawDocs = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
        const customer = {
          customerId: prof.customerId || customerId || fallbackUser?.customerId,
          fullName: prof.fullName || fallbackUser?.name || 'FinBank Customer',
          email: prof.email || fallbackUser?.email || '',
          mobile: prof.mobileNumber || fallbackUser?.mobile || '',
          dob: prof.dateOfBirth || '',
          gender: prof.gender || 'MALE',
          pan: prof.pan || '',
          aadhar: prof.aadhar || '',
          occupation: kyc?.occupation || 'SALARIED',
          annualIncome: kyc?.annualIncomeRange || '',
          address: primaryAddr ? {
            line1: primaryAddr.addressLine1 || '',
            line2: primaryAddr.addressLine2 || '',
            city: primaryAddr.city || '',
            state: primaryAddr.state || '',
            pin: primaryAddr.postalCode || ''
          } : { line1: '', city: '', state: '', pin: '' },
          kycStatus: (prof.kycStatus && prof.kycStatus !== 'NOT_STARTED' ? prof.kycStatus : kyc?.status) || prof.kycStatus || 'NOT_STARTED'
        };
        const kycCase = {
          id: kyc?.kycCaseId || kyc?.id || null,
          kycCaseId: kyc?.kycCaseId || kyc?.id || null,
          status: (prof.kycStatus && prof.kycStatus !== 'NOT_STARTED' ? prof.kycStatus : kyc?.status) || prof.kycStatus || 'NOT_STARTED',
          submittedAt: kyc?.submittedAt || kyc?.createdAt || prof.createdAt || null,
          rejectionReason: kyc?.rejectionReason || kyc?.decisionReason || null,
          documents: rawDocs.map(d => {
            const rawType = String(d.documentType || d.type || '').toUpperCase();
            const fn = String(d.fileName || d.name || '').toLowerCase();
            const uiType = rawType === 'IDENTITY_PROOF' ? (fn.includes('photo') || fn.includes('selfie') ? 'PHOTO' : 'AADHAAR') : rawType;
            return {
              documentReferenceId: d.documentReferenceId,
              type: uiType,
              documentType: rawType,
              name: d.fileName || d.name || 'document.pdf',
              state: d.status || d.state || 'UPLOADED',
              dataUrl: d.dataUrl || null,
              size: d.contentSizeBytes || d.size || null
            };
          })
        };
        return { customer, kycCase };
      }

      if (fallbackUser) {
        const rawDocs = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
        return {
          customer: {
            customerId: fallbackUser.customerId || customerId,
            fullName: fallbackUser.name || 'FinBank Customer',
            email: fallbackUser.email || '',
            mobile: fallbackUser.mobile || '',
            kycStatus: kyc?.status || 'NOT_STARTED',
            address: { line1: '', city: '', state: '', pin: '' }
          },
          kycCase: {
            id: kyc?.kycCaseId || null,
            kycCaseId: kyc?.kycCaseId || null,
            status: kyc?.status || 'NOT_STARTED',
            documents: rawDocs.map(d => ({
              documentReferenceId: d.documentReferenceId,
              type: d.documentType,
              name: d.fileName,
              state: d.status || 'UPLOADED'
            }))
          }
        };
      }
    } catch (err) {
      if (getMode() === 'server') {
        throw normaliseError(err);
      }
    }
  }

  const effCustId = getEffectiveCustomerId(customerId) || customerId;
  if (!effCustId) {
    return { customer: null, kyc: null, kycCase: null };
  }
  const db = getDb();
  let cust = (db.customers || []).find(c => c.customerId === effCustId);
  if (!cust) {
    return { customer: null, kyc: null, kycCase: null };
  }
  const targetCustId = cust.customerId;
  const kyc = (db.kycApplications || []).find(k => k.customerId === targetCustId) || {
    id: null,
    kycCaseId: null,
    status: cust?.kycStatus || 'NOT_STARTED',
    documents: []
  };

  const customer = {
    customerId: cust?.customerId || targetCustId,
    fullName: cust?.fullName || cust?.name || '',
    email: cust?.email || '',
    mobile: cust?.mobileNumber || cust?.mobile || cust?.phone || '',
    dob: cust?.dateOfBirth || cust?.dob || '',
    gender: cust?.gender || 'MALE',
    pan: cust?.pan || cust?.panNumber || '',
    occupation: cust?.occupation || 'SALARIED',
    annualIncome: cust?.annualIncome || '',
    address: cust?.address ? {
      line1: cust.address.addressLine1 || cust.address.line1 || '',
      city: cust.address.city || '',
      state: cust.address.state || '',
      pin: cust.address.postalCode || cust.address.pin || ''
    } : {
      line1: '',
      city: '',
      state: '',
      pin: ''
    },
    kycStatus: kyc?.status || cust?.kycStatus || 'NOT_STARTED'
  };

  const rawDocs = kyc.documents || kyc.submittedDocuments || [];
  const kycCase = {
    id: kyc.kycCaseId || kyc.id || null,
    kycCaseId: kyc.kycCaseId || kyc.id || null,
    status: kyc.status || 'NOT_STARTED',
    submittedAt: kyc.submittedAt || kyc.createdAt || null,
    documents: rawDocs.map(d => ({
      type: d.documentType || d.type,
      name: d.fileName || d.name || 'document.pdf',
      state: d.state || 'UPLOADED',
      dataUrl: d.dataUrl || d.url || null,
      size: d.size || null
    }))
  };

  return { customer, kycCase };
}

export async function getMyKyc(customerId) {
  const profile = await getMyProfile(customerId);
  return profile;
}

export async function submitKyc(customerId, payload, documents = []) {
  if (isLiveBackendActive()) {
    try {
      const existingDocs = await customerService.getKycDocuments().catch(() => []);
      const docList = Array.isArray(existingDocs) ? existingDocs : existingDocs?.data || [];
      const docReferences = [];

      for (const d of (documents || [])) {
        const mappedType = customerService.mapDocumentType(d.type);
        if (d.documentReferenceId) {
          docReferences.push({ documentType: mappedType, documentReferenceId: d.documentReferenceId });
        } else {
          const matched = docList.find(ed => (ed.documentType || ed.type) === mappedType || (ed.fileName && d.name && ed.fileName === d.name));
          if (matched?.documentReferenceId) {
            docReferences.push({ documentType: mappedType, documentReferenceId: matched.documentReferenceId });
          } else if (d.file || d.dataUrl) {
            const uploaded = await uploadKycDocument(customerId, d);
            if (uploaded?.documentReferenceId) {
              docReferences.push({ documentType: mappedType, documentReferenceId: uploaded.documentReferenceId });
            }
          }
        }
      }
      if (docReferences.length === 0 && docList.length > 0) {
        docList.forEach(ed => {
          docReferences.push({ documentType: customerService.mapDocumentType(ed.documentType), documentReferenceId: ed.documentReferenceId });
        });
      }

      const addr = payload.address || {};
      const kycBody = {
        fullName: (payload.fullName || '').trim(),
        dateOfBirth: payload.dob || payload.dateOfBirth,
        gender: String(payload.gender || 'MALE').toUpperCase(),
        pan: String(payload.pan || '').trim().toUpperCase(),
        aadhaarConsent: Boolean(payload.aadhaarConsent ?? true),
        occupation: String(payload.occupation || 'SALARIED').toUpperCase().replace(/[\s-]+/g, '_'),
        annualIncomeRange: mapIncomeRangeEnum(payload.annualIncomeRange || payload.annualIncome),
        address: {
          addressLine1: (addr.line1 || addr.addressLine1 || '').trim(),
          addressLine2: (addr.line2 || addr.addressLine2 || '').trim() || undefined,
          city: (addr.city || '').trim(),
          state: (addr.state || '').trim(),
          postalCode: String(addr.pin || addr.postalCode || '').trim(),
          country: 'INDIA',
          addressType: String(addr.addressType || 'CURRENT').toUpperCase() === 'PERMANENT' ? 'PERMANENT' : 'CURRENT'
        },
        documentReferences: docReferences
      };
      return await customerService.submitKyc(kycBody);
    } catch (err) {
      throw normaliseError(err);
    }
  }

  const db = getDb();
  if (!db.kycApplications) db.kycApplications = [];
  const effCustId = getEffectiveCustomerId(customerId) || customerId;
  const existingKyc = (db.kycApplications || []).find(k => k.customerId === effCustId);
  const kycId = existingKyc ? (existingKyc.kycCaseId || existingKyc.id) : ('KYC-' + Math.floor(500000 + Math.random() * 100000));
  const newCase = {
    kycCaseId: kycId,
    id: kycId,
    customerId: effCustId,
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
    documents: documents.map(d => {
      const existingDoc = (existingKyc?.documents || []).find(ed => (ed.documentType || ed.type) === d.type);
      return {
        documentType: d.type,
        type: d.type,
        fileName: d.name,
        name: d.name,
        dataUrl: d.dataUrl || existingDoc?.dataUrl || null,
        size: d.size || existingDoc?.size || null,
        state: 'UPLOADED'
      };
    }),
    submittedDocuments: documents.map(d => {
      const existingDoc = (existingKyc?.documents || []).find(ed => (ed.documentType || ed.type) === d.type);
      return {
        documentType: d.type,
        type: d.type,
        fileName: d.name,
        name: d.name,
        dataUrl: d.dataUrl || existingDoc?.dataUrl || null,
        size: d.size || existingDoc?.size || null,
        state: 'UPLOADED'
      };
    })
  };

  const existingIdx = db.kycApplications.findIndex(k => k.customerId === effCustId);
  if (existingIdx !== -1) {
    db.kycApplications[existingIdx] = newCase;
  } else {
    db.kycApplications.unshift(newCase);
  }

  const cust = (db.customers || []).find(c => c.customerId === effCustId);
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
    const list = Array.isArray(res) ? res : res?.data || res?.cards || [];
    if (isLiveBackendActive()) {
      return list.map(canonicalCard);
    }
    const filtered = list.filter(c => !customerId || !c.customerId || c.customerId === customerId);
    return filtered.map(canonicalCard);
  } catch {
    const db = getDb();
    const list = (db.cards || []).filter(c => !customerId || c.customerId === customerId);
    return list.map(canonicalCard);
  }
}

export async function listMyCardApplications(customerId) {
  if (isLiveBackendActive()) {
    try {
      const res = await cardService.getCardApplications();
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.map(c => {
        const rawKind = (c.cardType || 'CREDIT').toUpperCase();
        const kind = rawKind === 'REPLACEMENT' ? 'Replacement' : rawKind.includes('DEBIT') ? 'Debit' : 'Credit';
        const id = c.cardApplicationId || c.applicationId || c.id;
        return {
          id,
          cardApplicationId: id,
          productName: c.cardName || c.productName || 'FinBank Card',
          cardName: c.cardName || c.productName || 'FinBank Card',
          productSlug: c.productSlug,
          kind,
          cardType: kind,
          status: c.status || 'UNDER_REVIEW',
          submittedAt: c.submittedAt || c.appliedAt || c.createdAt || new Date().toISOString(),
          linkedAccountId: c.linkedAccountId
        };
      });
    } catch (err) {
      if (getMode() === 'server') {
        return [];
      }
    }
  }

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

export async function blockCard(cardId, optionsOrActor, actorName) {
  const isObj = typeof optionsOrActor === 'object' && optionsOrActor !== null;
  const blockType = isObj ? (optionsOrActor.blockType || 'TEMPORARY') : 'TEMPORARY';
  const reason = isObj ? (optionsOrActor.reason || 'CUSTOMER_REQUEST') : 'CUSTOMER_REQUEST';
  const remarks = isObj ? (optionsOrActor.remarks || `Card blocked by ${actorName || 'cardholder'}`) : `Card blocked by ${optionsOrActor || 'cardholder'}`;
  try {
    return await cardService.blockCard(cardId, { blockType, reason, remarks });
  } catch (e) {
    const db = getDb();
    const card = (db.cards || []).find(c => c.cardId === cardId || c.id === cardId);
    if (card) {
      card.status = 'BLOCKED';
      card.blockType = blockType;
      card.blockedAt = new Date().toISOString();
      card.reason = reason;
      saveDb(db);
      return { cardId: card.cardId, status: 'BLOCKED', blockType };
    }
    throw e;
  }
}

export async function unblockCard(cardId, actorName) {
  try {
    return await cardService.unblockCard(cardId);
  } catch (e) {
    const db = getDb();
    const card = (db.cards || []).find(c => c.cardId === cardId || c.id === cardId);
    if (card) {
      if (card.blockType === 'PERMANENT') {
        const err = new Error('This card was permanently blocked and cannot be unblocked. Please apply for a replacement card.');
        err.status = 422;
        err.code = 'UNBLOCK_NOT_ALLOWED';
        err.title = 'UNBLOCK_NOT_ALLOWED';
        err.detail = 'This card was permanently blocked and cannot be unblocked. Please apply for a replacement card.';
        throw err;
      }
      card.status = 'ACTIVE';
      card.blockType = null;
      card.unblockedAt = new Date().toISOString();
      saveDb(db);
      return { cardId: card.cardId, status: 'ACTIVE' };
    }
    throw e;
  }
}

export async function applyCard(customerId, { productSlug, productName, kind, accountId, requestedLimit }) {
  const effCustId = getEffectiveCustomerId(customerId);
  if (!effCustId) {
    throw {
      status: 401,
      code: 'UNAUTHENTICATED',
      title: 'Authentication Required',
      detail: 'Active customer session required to apply for a card.'
    };
  }
  let customerAccounts = [];
  if (isLiveBackendActive()) {
    customerAccounts = await listAccounts(effCustId);
  } else {
    const db = getDb();
    customerAccounts = (db.accounts || []).filter(a => a.customerId === effCustId);
  }
  if (customerAccounts.length === 0 && !accountId) {
    throw {
      status: 400,
      code: 'ACCOUNT_REQUIRED',
      title: 'Account Required',
      detail: 'An existing account is required before you can apply for a card.'
    };
  }
  try {
    const res = await cardService.applyForCard({
      cardType: kind ? kind.toUpperCase() : 'CREDIT',
      cardName: productName,
      productSlug,
      linkedAccountId: accountId || customerAccounts[0]?.id || customerAccounts[0]?.accountId,
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
  let effPayload = payload;
  let rawCustId = customerId;
  if (typeof customerId === 'object' && customerId !== null) {
    effPayload = customerId;
    rawCustId = effPayload.customerId || null;
  }
  const effCustId = getEffectiveCustomerId(rawCustId);
  if (!effCustId) {
    const err = new Error('Authentication required: a valid customer session is required to apply for a loan.');
    err.status = 401;
    throw err;
  }
  if (isLiveBackendActive()) {
    try {
      const principal = Number(effPayload.amount != null ? effPayload.amount : effPayload.loanAmount != null ? effPayload.loanAmount : effPayload.principal);
      const isHome = String(effPayload.productSlug || effPayload.productName || '').toLowerCase().includes('home');
      const res = await loanService.applyForLoan({
        productCode: effPayload.productCode || (isHome ? 'HL_001' : 'PL_SALARIED_001'),
        requestedAmount: principal,
        tenureMonths: Number(effPayload.tenureMonths) || (isHome ? 120 : 36),
        purpose: effPayload.purpose || 'Personal requirement',
        employmentType: effPayload.employmentType || 'SALARIED',
        monthlyIncome: effPayload.monthlyIncome || 75000,
        employerName: effPayload.employerName || 'Enterprise',
        creditBureauConsent: Boolean(effPayload.cicConsent ?? effPayload.creditBureauConsent ?? true)
      });
      const appId = res.loanApplicationId || res.applicationId || res.id;
      return {
        ...res,
        id: appId,
        applicationId: appId,
        loanApplicationId: appId,
        productName: effPayload.productName || 'FinBank Loan',
        amount: principal,
        requestedAmount: principal,
        tenureMonths: Number(effPayload.tenureMonths) || 36,
        submittedAt: new Date().toISOString()
      };
    } catch (err) {
      throw normaliseError(err);
    }
  }
  const db = getDb();
  if (!db.loanApplications) db.loanApplications = [];
  if (!db.idempotencyKeys) db.idempotencyKeys = {};

  const idemKey = effPayload.idempotencyKey;
  if (idemKey && db.idempotencyKeys[`${effCustId}:${idemKey}`]) {
    return db.idempotencyKeys[`${effCustId}:${idemKey}`].response;
  }

  const principal = Number(effPayload.amount != null ? effPayload.amount : effPayload.loanAmount != null ? effPayload.loanAmount : effPayload.principal);
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('Loan amount must be a finite positive number.');
  }
  if (principal < 25000 || principal > 50000000) {
    throw new Error('Requested loan amount is outside allowable product limits (₹25,000 – ₹5,00,00,000).');
  }

  const custAccts = (db.accounts || []).filter(a => a.customerId === effCustId);
  const disbId = effPayload.disbursementAccountId || effPayload.accountId || (custAccts[0]?.accountId || 'DISBURSE-ON-APPROVAL');
  const tenure = Number(effPayload.tenureMonths) || 36;
  const rate = Number(effPayload.rate) || 8.75;
  const emiCalc = calculateEMI(principal, rate, tenure);
  const appId = 'LAPP-' + Math.floor(100000 + Math.random() * 900000);

  const newApp = {
    id: appId,
    applicationId: appId,
    customerId: effCustId,
    applicantName: effPayload.applicantName || effPayload.fullName || effPayload.customerName || 'Loan Applicant',
    productName: effPayload.productName || 'FinEdge Loan',
    productSlug: effPayload.productSlug || 'home-loan',
    requestedAmount: principal,
    sanctionedAmount: principal,
    amount: principal,
    tenureMonths: tenure,
    rate,
    emi: emiCalc.emi,
    purpose: effPayload.purpose || 'Personal / Business growth',
    employerName: effPayload.employerName || 'Acme Corp',
    employmentType: effPayload.employmentType || 'Salaried',
    monthlyIncome: Number(effPayload.monthlyIncome) || 85000,
    existingEmis: Number(effPayload.existingEmis) || 0,
    disbursementAccountId: disbId,
    cicConsent: Boolean(effPayload.cicConsent),
    mitcConsent: Boolean(effPayload.mitcConsent),
    status: 'UNDER_REVIEW',
    steps: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED'],
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  db.loanApplications.unshift(newApp);
  if (idemKey) {
    db.idempotencyKeys[`${effCustId}:${idemKey}`] = { response: newApp, timestamp: new Date().toISOString() };
  }
  saveDb(db);
  return newApp;
}

export async function listHoldings(customerId) {
  const db = getDb();
  const effCustId = getEffectiveCustomerId(customerId) || customerId;
  const invs = (db.investments || []).filter(i => !effCustId || i.customerId === effCustId);
  const holdings = (db.investmentHoldings || []).filter(h => !effCustId || h.customerId === effCustId);
  const seen = new Set();
  const combined = [];
  for (const item of [...invs, ...holdings]) {
    const id = item.investmentId || item.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      combined.push(item);
    }
  }
  return combined;
}

export async function bookFd(customerId, payload = {}) {
  let effPayload = payload;
  let rawCustId = customerId;
  if (typeof customerId === 'object' && customerId !== null) {
    effPayload = customerId;
    rawCustId = effPayload.customerId || null;
  }
  const effCustId = getEffectiveCustomerId(rawCustId);
  if (!effCustId) {
    const err = new Error('Authentication required: a valid customer session is required to invest.');
    err.status = 401;
    throw err;
  }
  const db = getDb();
  if (!db.idempotencyKeys) db.idempotencyKeys = {};

  const idemKey = effPayload.idempotencyKey;
  if (idemKey && db.idempotencyKeys[`${effCustId}:${idemKey}`]) {
    return db.idempotencyKeys[`${effCustId}:${idemKey}`].response;
  }

  const details = effPayload.investmentDetails || {};
  const amt = Number(effPayload.amount != null ? effPayload.amount : effPayload.depositAmount != null ? effPayload.depositAmount : (details.depositAmount != null ? details.depositAmount : 25000));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error('Deposit amount must be a finite positive number.');
  }
  if (amt < 5000) {
    throw new Error('Fixed deposit minimum amount is ₹5,000.');
  }

  const tenureMonths = Number(effPayload.tenureMonths || details.tenureMonths || (effPayload.tenureDays ? Math.round(effPayload.tenureDays / 30) : 36));
  const tenureDays = Number(effPayload.tenureDays || details.tenureDays || tenureMonths * 30);
  const isSenior = Boolean(effPayload.seniorCitizen || effPayload.isSenior || details.isSeniorCitizen);

  let rate = effPayload.rate != null ? Number(effPayload.rate) : (effPayload.appliedRate != null ? Number(effPayload.appliedRate) : (details.appliedRate != null ? Number(details.appliedRate) : null));
  if (!rate) {
    const days = tenureMonths * 30.4167;
    const match = (FD.rateGrid || []).find(r => days >= r.minDays && days <= r.maxDays);
    rate = match ? (isSenior ? match.senior : match.general) : 6.95;
  }

  const fdCalc = calculateFD({ principal: amt, annualRatePct: rate, tenureMonths });
  const maturityAmount = fdCalc.maturityValue;
  const tenureBand = effPayload.tenureBand || details.tenureBand || `${tenureMonths} months`;
  const fdId = 'INV-FD-' + Math.floor(100000 + Math.random() * 900000);

  const calcMaturityDate = () => {
    if (effPayload.maturityDate) return effPayload.maturityDate;
    if (details.maturityDate) return details.maturityDate;
    const d = new Date();
    d.setMonth(d.getMonth() + tenureMonths);
    return d.toISOString();
  };
  const maturityDate = calcMaturityDate();

  const fundingAcct = (db.accounts || []).find(a => (a.accountId || a.id) === (effPayload.accountId || effPayload.sourceAccountId));
  if (fundingAcct) {
    if (typeof fundingAcct.balance === 'object' && fundingAcct.balance !== null) {
      fundingAcct.balance.availableBalance = (fundingAcct.balance.availableBalance || 0) - amt;
      fundingAcct.balance.ledgerBalance = (fundingAcct.balance.ledgerBalance || 0) - amt;
    } else {
      fundingAcct.balance = (Number(fundingAcct.balance) || 0) - amt;
    }
  }

  const nowIso = new Date().toISOString();
  const newFd = {
    id: fdId,
    investmentId: fdId,
    applicationId: fdId,
    customerId: effCustId,
    applicantName: effPayload.applicantName || effPayload.fullName || effPayload.applicant?.fullName || 'Investment Applicant',
    kind: 'FD',
    productName: effPayload.productName || 'FinEdge Fixed Deposit',
    productSlug: effPayload.productSlug || 'fixed-deposit',
    amount: amt,
    principal: amt,
    depositAmount: amt,
    tenureMonths,
    tenureDays,
    tenureBand,
    interestRate: rate,
    rate,
    appliedRate: rate,
    annualRatePct: rate,
    maturityAmount,
    maturityValue: maturityAmount,
    maturityDate,
    interestEarned: fdCalc.interestEarned,
    status: 'ACTIVE',
    investmentDetails: {
      principal: amt,
      depositAmount: amt,
      tenureMonths,
      tenureBand,
      appliedRate: rate,
      interestRate: rate,
      rate,
      annualRatePct: rate,
      maturityAmount,
      maturityValue: maturityAmount,
      maturityDate,
      interestEarned: fdCalc.interestEarned,
      isSeniorCitizen: isSenior
    },
    startDate: nowIso,
    bookingDate: nowIso,
    submittedAt: nowIso,
    createdAt: nowIso
  };
  if (!db.investments) db.investments = [];
  db.investments.unshift(newFd);
  if (!db.investmentHoldings) db.investmentHoldings = [];
  db.investmentHoldings.unshift(newFd);
  if (!db.investmentApplications) db.investmentApplications = [];
  db.investmentApplications.unshift(newFd);
  if (idemKey) {
    db.idempotencyKeys[`${effCustId}:${idemKey}`] = { response: newFd, timestamp: nowIso };
  }
  saveDb(db);
  return newFd;
}

export async function bookRd(customerId, payload = {}) {
  let effPayload = payload;
  let rawCustId = customerId;
  if (typeof customerId === 'object' && customerId !== null) {
    effPayload = customerId;
    rawCustId = effPayload.customerId || null;
  }
  const effCustId = getEffectiveCustomerId(rawCustId);
  if (!effCustId) {
    const err = new Error('Authentication required: a valid customer session is required to invest.');
    err.status = 401;
    throw err;
  }
  const db = getDb();
  const details = effPayload.investmentDetails || {};
  const amt = Number(effPayload.monthlyInstallment ?? effPayload.monthly ?? effPayload.amount ?? details.monthlyDeposit ?? 5000);
  if (amt % 100 !== 0) {
    throw new Error('RD monthly installment must be a multiple of ₹100.');
  }
  const tenureMonths = Number(effPayload.tenureMonths || details.tenureMonths || 12);
  let rate = effPayload.rate != null ? Number(effPayload.rate) : (effPayload.appliedRate != null ? Number(effPayload.appliedRate) : (details.appliedRate != null ? Number(details.appliedRate) : null));
  if (!rate) {
    const match = (RD.rateBands || []).find(r => tenureMonths >= (r.minMonths || 0) && tenureMonths <= (r.maxMonths || 120));
    rate = match ? match.rate : 6.85;
  }
  const rdCalc = calculateRD({ monthlyDeposit: amt, annualRatePct: rate, tenureMonths });
  const maturityAmount = rdCalc.maturityValue;
  const d = new Date();
  d.setMonth(d.getMonth() + tenureMonths);
  const maturityDate = effPayload.maturityDate || details.maturityDate || d.toISOString();

  const fundingAcct = (db.accounts || []).find(a => (a.accountId || a.id) === (effPayload.accountId || effPayload.sourceAccountId));
  if (fundingAcct) {
    if (typeof fundingAcct.balance === 'object' && fundingAcct.balance !== null) {
      fundingAcct.balance.availableBalance = (fundingAcct.balance.availableBalance || 0) - amt;
      fundingAcct.balance.ledgerBalance = (fundingAcct.balance.ledgerBalance || 0) - amt;
    } else {
      fundingAcct.balance = (Number(fundingAcct.balance) || 0) - amt;
    }
  }

  const nowIso = new Date().toISOString();
  const rdId = 'INV-RD-' + Math.floor(100000 + Math.random() * 900000);
  const newRd = {
    id: rdId,
    investmentId: rdId,
    applicationId: rdId,
    customerId: effCustId,
    applicantName: effPayload.applicantName || effPayload.fullName || effPayload.applicant?.fullName || 'Investment Applicant',
    kind: 'RD',
    productName: effPayload.productName || RD.name || 'Recurring Deposit (RD)',
    amount: amt,
    monthlyInstallment: amt,
    monthly: amt,
    monthlyAmount: amt,
    tenureMonths,
    rate,
    appliedRate: rate,
    annualRatePct: rate,
    interestRate: rate,
    maturityAmount,
    maturityValue: maturityAmount,
    maturityDate,
    interestEarned: rdCalc.interestEarned,
    totalDeposited: rdCalc.totalDeposited,
    status: 'ACTIVE',
    investmentDetails: {
      monthlyDeposit: amt,
      tenureMonths,
      appliedRate: rate,
      rate,
      maturityAmount,
      maturityValue: maturityAmount,
      maturityDate,
      interestEarned: rdCalc.interestEarned,
      totalDeposited: rdCalc.totalDeposited,
    },
    startDate: nowIso,
    bookingDate: nowIso,
    submittedAt: nowIso,
    createdAt: nowIso
  };
  if (!db.investments) db.investments = [];
  db.investments.unshift(newRd);
  if (!db.investmentHoldings) db.investmentHoldings = [];
  db.investmentHoldings.unshift(newRd);
  if (!db.investmentApplications) db.investmentApplications = [];
  db.investmentApplications.unshift(newRd);
  saveDb(db);
  return newRd;
}

export async function startSip(customerId, payload = {}) {
  let effPayload = payload;
  let rawCustId = customerId;
  if (typeof customerId === 'object' && customerId !== null) {
    effPayload = customerId;
    rawCustId = effPayload.customerId || null;
  }
  const effCustId = getEffectiveCustomerId(rawCustId);
  if (!effCustId) {
    const err = new Error('Authentication required: a valid customer session is required to invest.');
    err.status = 401;
    throw err;
  }
  const db = getDb();
  const details = effPayload.investmentDetails || {};
  const amt = Number(effPayload.monthly ?? effPayload.monthlyAmount ?? details.monthlyInvestment ?? 2000);
  const tenureMonths = Number(effPayload.tenureMonths || (details.durationYears ? details.durationYears * 12 : 12));
  const rate = Number(effPayload.rate || effPayload.expectedReturnPct || 12);
  const sipCalc = calculateSIP({ monthlyInvestment: amt, expectedReturnPct: rate, tenureMonths });
  const sipId = 'INV-SIP-' + Math.floor(100000 + Math.random() * 900000);

  const fundingAcct = (db.accounts || []).find(a => (a.accountId || a.id) === (effPayload.accountId || effPayload.sourceAccountId));
  if (fundingAcct) {
    if (typeof fundingAcct.balance === 'object' && fundingAcct.balance !== null) {
      fundingAcct.balance.availableBalance = (fundingAcct.balance.availableBalance || 0) - amt;
      fundingAcct.balance.ledgerBalance = (fundingAcct.balance.ledgerBalance || 0) - amt;
    } else {
      fundingAcct.balance = (Number(fundingAcct.balance) || 0) - amt;
    }
  }

  const nowIso = new Date().toISOString();
  const newSip = {
    id: sipId,
    investmentId: sipId,
    applicationId: sipId,
    customerId: effCustId,
    kind: 'SIP',
    productName: effPayload.productName || effPayload.fundName || 'FinEdge Large Cap Index Fund',
    fundName: effPayload.fundName || 'FinEdge Large Cap Index Fund',
    monthly: amt,
    monthlyAmount: amt,
    debitDate: Number(effPayload.debitDate || details.sipDate) || 5,
    tenureMonths,
    rate,
    maturityAmount: sipCalc.maturityValue,
    maturityValue: sipCalc.maturityValue,
    estimatedGain: sipCalc.estimatedGain,
    totalInvested: sipCalc.totalInvested,
    status: 'ACTIVE',
    investmentDetails: {
      monthlyInvestment: amt,
      tenureMonths,
      rate,
      maturityAmount: sipCalc.maturityValue,
      maturityValue: sipCalc.maturityValue,
      estimatedGain: sipCalc.estimatedGain,
      totalInvested: sipCalc.totalInvested
    },
    startDate: nowIso,
    bookingDate: nowIso,
    submittedAt: nowIso,
    createdAt: nowIso
  };
  if (!db.investments) db.investments = [];
  db.investments.unshift(newSip);
  if (!db.investmentHoldings) db.investmentHoldings = [];
  db.investmentHoldings.unshift(newSip);
  if (!db.investmentApplications) db.investmentApplications = [];
  db.investmentApplications.unshift(newSip);
  saveDb(db);
  return newSip;
}

export async function openSsy(customerId, payload = {}) {
  let effPayload = payload;
  let rawCustId = customerId;
  if (typeof customerId === 'object' && customerId !== null) {
    effPayload = customerId;
    rawCustId = effPayload.customerId || null;
  }
  const effCustId = getEffectiveCustomerId(rawCustId);
  if (!effCustId) {
    const err = new Error('Authentication required: a valid customer session is required to invest.');
    err.status = 401;
    throw err;
  }
  const db = getDb();
  const details = effPayload.investmentDetails || {};
  const amt = Number(effPayload.amount || effPayload.annualDeposit || details.annualDeposit || 10000);
  const rate = effPayload.rate != null ? Number(effPayload.rate) : (SSY.rate || 8.05);
  const ssyCalc = calculateSSY({ annualDeposit: amt, annualRatePct: rate });
  const ssyId = 'INV-SSY-' + Math.floor(100000 + Math.random() * 900000);
  const d = new Date();
  d.setFullYear(d.getFullYear() + (SSY.tenureYears || 21));
  const maturityDate = effPayload.maturityDate || details.maturityDate || d.toISOString();

  const fundingAcct = (db.accounts || []).find(a => (a.accountId || a.id) === (effPayload.accountId || effPayload.sourceAccountId));
  if (fundingAcct) {
    if (typeof fundingAcct.balance === 'object' && fundingAcct.balance !== null) {
      fundingAcct.balance.availableBalance = (fundingAcct.balance.availableBalance || 0) - amt;
      fundingAcct.balance.ledgerBalance = (fundingAcct.balance.ledgerBalance || 0) - amt;
    } else {
      fundingAcct.balance = (Number(fundingAcct.balance) || 0) - amt;
    }
  }

  const nowIso = new Date().toISOString();
  const newSsy = {
    id: ssyId,
    investmentId: ssyId,
    applicationId: ssyId,
    customerId: effCustId,
    kind: 'SSY',
    productName: effPayload.productName || SSY.name || 'Sukanya Samriddhi Yojana (SSY)',
    childName: effPayload.childName || effPayload.girlChildName || details.childName || 'Child',
    girlChildName: effPayload.childName || effPayload.girlChildName || details.childName || 'Child',
    guardianName: effPayload.guardianName || details.guardianName || '',
    guardianRelationship: effPayload.guardianRelationship || details.guardianRelationship || 'Father',
    rate,
    appliedRate: rate,
    annualDeposit: amt,
    depositAmount: amt,
    principal: amt,
    maturityAmount: ssyCalc.maturityValue,
    maturityValue: ssyCalc.maturityValue,
    maturityDate,
    interestEarned: ssyCalc.interestEarned,
    status: 'ACTIVE',
    investmentDetails: {
      annualDeposit: amt,
      rate,
      maturityAmount: ssyCalc.maturityValue,
      maturityValue: ssyCalc.maturityValue,
      maturityDate,
      interestEarned: ssyCalc.interestEarned
    },
    startDate: nowIso,
    bookingDate: nowIso,
    submittedAt: nowIso,
    createdAt: nowIso
  };
  if (!db.investments) db.investments = [];
  db.investments.unshift(newSsy);
  if (!db.investmentHoldings) db.investmentHoldings = [];
  db.investmentHoldings.unshift(newSsy);
  if (!db.investmentApplications) db.investmentApplications = [];
  db.investmentApplications.unshift(newSsy);
  saveDb(db);
  return newSsy;
}

export async function listAccountApplications({ status } = {}) {
  if (isLiveBackendActive()) {
    try {
      const params = status && status !== 'ALL' ? { status } : {};
      const res = await accountService.getApplications(params);
      const list = Array.isArray(res) ? res : res?.items || res?.data || res?.content || [];
      return list.map(a => ({
        ...a,
        id: a.applicationNumber || a.accountApplicationId || a.applicationId || a.id,
        productName: a.productName || a.productCode || 'FinBank Account',
        submittedAt: a.createdAt || a.submittedAt || new Date().toISOString()
      }));
    } catch {
      if (getMode() === 'server') return [];
    }
  }
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
  if (isLiveBackendActive()) {
    const [accAppsRaw, cardAppsRaw] = await Promise.all([
      listAccountApplications().catch(() => []),
      listMyCardApplications(customerId).catch(() => [])
    ]);
    const accApps = (accAppsRaw || []).map(a => ({
      ...a,
      id: a.applicationNumber || a.accountApplicationId || a.applicationId || a.id,
      kind: 'Account',
      amount: a.initialFundingAmount || a.initialFunding || 0,
      submittedAt: a.createdAt || a.submittedAt || new Date().toISOString()
    }));
    const cardApps = (cardAppsRaw || []).map(c => ({
      ...c,
      id: c.cardApplicationId || c.id,
      kind: `${c.kind || 'Credit'} Card`,
      productName: c.cardName || c.productName || 'FinBank Card',
      amount: c.requestedLimit || 0,
      submittedAt: c.submittedAt || c.createdAt || new Date().toISOString()
    }));
    return [...accApps, ...cardApps].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }
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
  if (isLiveBackendActive()) {
    try {
      const res = await notificationService.getNotifications({ limit: 50 });
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.map(n => ({
        ...n,
        id: n.notificationId || n.id,
        notificationId: n.notificationId || n.id,
        type: n.templateCode || n.type || 'GENERAL',
        createdAt: n.createdAt || new Date().toISOString()
      }));
    } catch {
      if (getMode() === 'server') return [];
    }
  }
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
  if (isLiveBackendActive()) {
    try {
      const res = await notificationService.getNotifications({ unreadOnly: true, limit: 50 });
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.filter(n => !n.read).length;
    } catch {
      if (getMode() === 'server') return 0;
    }
  }
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
    return await apiRequest('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword,
        confirmPassword: newPassword
      })
    });
  } catch (err) {
    throw normaliseError(err);
  }
}

export async function applyAccount(customerId, { accountType, productCode, productName, initialFunding, initialFundingAmount, branch, nominee } = {}) {
  const effCustId = getEffectiveCustomerId(customerId);
  if (!effCustId) {
    throw {
      status: 401,
      code: 'UNAUTHENTICATED',
      title: 'Authentication Required',
      detail: 'Active customer session required to apply for an account.'
    };
  }
  if (isLiveBackendActive()) {
    try {
      const res = await accountService.applyForAccount({
        productCode,
        productName: productName || accountType,
        initialFundingAmount: initialFundingAmount ?? initialFunding ?? 5000,
        nominee
      });
      const appId = res.applicationNumber || res.applicationId || res.accountApplicationId || res.id;
      return {
        ...res,
        id: appId,
        applicationId: appId,
        accountApplicationId: appId,
        productName: productName || res.productName || accountType || 'FinBank Account',
        status: res.status || 'SUBMITTED'
      };
    } catch (err) {
      throw normaliseError(err);
    }
  }
  const db = getDb();
  const newAppId = 'ACC-APP-' + Math.floor(900000 + Math.random() * 100000);
  const cust = (db.customers || []).find(c => c.customerId === effCustId);
  const newApp = {
    id: newAppId,
    accountApplicationId: newAppId,
    applicationId: newAppId,
    customerId: effCustId,
    customerName: cust?.fullName || 'FinEdge Customer',
    email: cust?.email || '',
    mobileNumber: cust?.mobileNumber || '',
    pan: cust?.pan || '',
    accountType: accountType || 'Everyday Savings',
    productCode: productCode || 'SAVINGS_REGULAR',
    productName: productName || accountType || 'FinEdge Everyday Savings Account',
    initialFunding: Number(initialFunding) || 10000,
    initialFundingAmount: Number(initialFunding) || 10000,
    branch: branch || 'FinEdge Digital Branch, Mumbai',
    nominee: nominee || { fullName: 'Nominee on file', relationship: 'Spouse' },
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  if (!Array.isArray(db.accountApplications)) db.accountApplications = [];
  db.accountApplications.unshift(newApp);
  saveDb(db);
  return newApp;
}

export async function uploadKycDocument(customerId, { type, name, file, dataUrl, size } = {}) {
  if (isLiveBackendActive() && (file || dataUrl)) {
    try {
      let uploadFile = file;
      if (!uploadFile && dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        uploadFile = new File([blob], name || `${String(type || 'doc').toLowerCase()}.png`, { type: blob.type || 'image/png' });
      }
      if (uploadFile) {
        const docRes = await customerService.uploadDocumentMultipart({
          file: uploadFile,
          documentType: customerService.mapDocumentType(type),
          documentName: name || uploadFile.name
        });
        return {
          documentReferenceId: docRes.documentReferenceId,
          documentType: docRes.documentType || type,
          type: docRes.documentType || type,
          fileName: docRes.fileName || name,
          name: docRes.fileName || name,
          dataUrl: dataUrl || null,
          size: docRes.contentSizeBytes || size || uploadFile.size,
          state: docRes.status || 'VALIDATED'
        };
      }
    } catch (err) {
      throw normaliseError(err);
    }
  }
  const effCustId = getEffectiveCustomerId(customerId) || customerId;
  const db = getDb();
  if (!db.kycApplications) db.kycApplications = [];
  let kyc = db.kycApplications.find(k => k.customerId === effCustId);
  if (!kyc) {
    const kycId = 'KYC-' + Math.floor(500000 + Math.random() * 100000);
    kyc = {
      id: kycId,
      kycCaseId: kycId,
      customerId: effCustId,
      status: 'APPROVED',
      submittedAt: new Date().toISOString(),
      documents: [
        { documentType: 'PAN', type: 'PAN', fileName: 'pan-card.pdf', name: 'pan-card.pdf', verified: true, state: 'UPLOADED' },
        { documentType: 'ADDRESS_PROOF', type: 'ADDRESS_PROOF', fileName: 'utility-bill.pdf', name: 'utility-bill.pdf', verified: true, state: 'UPLOADED' }
      ]
    };
    db.kycApplications.unshift(kyc);
  }
  if (!kyc.documents) kyc.documents = [];
  kyc.documents = kyc.documents.filter(d => (d.documentType || d.type) !== type);
  const docObj = {
    documentType: type,
    type,
    fileName: name,
    name,
    dataUrl: dataUrl || null,
    size: size || null,
    state: 'UPLOADED',
    uploadedAt: new Date().toISOString()
  };
  kyc.documents.push(docObj);
  saveDb(db);
  return docObj;
}

export async function deleteKycDocument(customerId, type) {
  if (isLiveBackendActive()) {
    try {
      const docsRes = await customerService.getKycDocuments().catch(() => []);
      const docList = Array.isArray(docsRes) ? docsRes : docsRes?.data || [];
      const mappedType = customerService.mapDocumentType(type);
      const match = docList.find(d => d.documentReferenceId === type || d.documentType === mappedType || d.documentType === type);
      if (match?.documentReferenceId) {
        await customerService.deleteKycDocument(match.documentReferenceId);
        return true;
      }
      if (String(type || '').startsWith('DOC-')) {
        await customerService.deleteKycDocument(type);
        return true;
      }
    } catch (err) {
      throw normaliseError(err);
    }
  }
  const effCustId = getEffectiveCustomerId(customerId) || customerId;
  const db = getDb();
  if (!db.kycApplications) db.kycApplications = [];
  let kyc = db.kycApplications.find(k => k.customerId === effCustId);
  if (!kyc) {
    const kycId = 'KYC-' + Math.floor(500000 + Math.random() * 100000);
    kyc = {
      id: kycId,
      kycCaseId: kycId,
      customerId: effCustId,
      status: 'APPROVED',
      submittedAt: new Date().toISOString(),
      documents: [
        { documentType: 'PAN', type: 'PAN', fileName: 'pan-card.pdf', name: 'pan-card.pdf', verified: true, state: 'UPLOADED' },
        { documentType: 'ADDRESS_PROOF', type: 'ADDRESS_PROOF', fileName: 'utility-bill.pdf', name: 'utility-bill.pdf', verified: true, state: 'UPLOADED' }
      ]
    };
    db.kycApplications.unshift(kyc);
  }
  if (kyc && kyc.documents) {
    kyc.documents = kyc.documents.filter(d => (d.documentType || d.type) !== type);
    saveDb(db);
  }
  return true;
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
  applyAccount,
  listTransactions,
  statementCsv,
  listBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  transfer,
  getMyProfile,
  getMyKyc,
  submitKyc,
  uploadKycDocument,
  deleteKycDocument,
  listMyCards,
  listMyCardApplications,
  updateCardControls,
  blockCard,
  unblockCard,
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

if (typeof window !== 'undefined') {
  window.__portalBridge = portalBridge;
  window.__applyCard = applyCard;
}

export default portalBridge;
