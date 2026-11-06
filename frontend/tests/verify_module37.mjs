// ============================================================================
// MODULE 37 AUTOMATED ACCEPTANCE TEST SUITE: JOURNEYS M1 TO M10
// FinEdge Bank Staff Console: Verification & Operational Honesty
// ============================================================================

import {
  getDb,
  saveDb,
  resetDemoDb,
  handleLocalFallback
} from '../src/services/api.js';

import {
  managerBridge,
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
} from '../src/services/managerBridge.js';

import { maskPan, formatINR } from '../src/lib/format.js';
import { LOANS, CARDS } from '../src/data/products.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Mock localStorage if in node environment
if (typeof localStorage === 'undefined') {
  const store = new Map();
  global.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

console.log('================================================================');
console.log('STARTING MODULE 37 ACCEPTANCE VERIFICATION (JOURNEYS M1 - M10)');
console.log('================================================================\n');

// Initialize a fresh clean demo DB
resetDemoDb();
const initialDb = getDb();

// Seed KYC queue with a third case if needed for testing Request Info
if ((initialDb.kycApplications || []).length < 3) {
  initialDb.kycApplications.push({
    kycCaseId: 'KYC-500989',
    customerId: 'CUS-200902',
    fullName: 'Rahul Verma',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-10-04T14:15:00Z',
    documents: [{ documentType: 'DRIVING_LICENCE', fileName: 'dl_front.pdf', verified: false }]
  });
  saveDb(initialDb);
}

// ============================================================================
// JOURNEY M1: KYC Loop
// ============================================================================
console.log('--- Journey M1: KYC Loop ---');
try {
  // 1. Sign in as KYC Officer
  const kycOfficerSession = {
    staffId: 'STF-002',
    fullName: 'Ananya Deshmukh',
    email: 'kyc.officer@finedge.bank',
    role: 'KYC_OFFICER',
    permissions: ['customers.read', 'kyc.read', 'kyc.review', 'kyc.approve', 'audit.read']
  };
  localStorage.setItem('finedge_manager_user', JSON.stringify(kycOfficerSession));

  // 2. Open KYC Queue
  const kycList = await listKycCases({});
  assert(kycList.length >= 2, `KYC queue loaded with ${kycList.length} cases`);

  // 3. Click the SECOND case in the list
  const secondCaseRow = kycList[1];
  assert(Boolean(secondCaseRow.id), `Second case row Ref is populated: ${secondCaseRow.id}`);

  // Fetch full case detail by canonical id
  const secondCaseDetail = await getKycCase(secondCaseRow.id);
  assert(secondCaseDetail.id === secondCaseRow.id, `getKycCase returned exact second case: ${secondCaseDetail.id}`);
  assert(secondCaseDetail.customerId === secondCaseRow.customerId, `Second case belongs to ${secondCaseRow.customerId}`);
  assert(Boolean(secondCaseDetail.customerName), `Customer name correctly resolved: ${secondCaseDetail.customerName}`);
  assert(secondCaseDetail.documents.length >= 1, `Documents list populated with ${secondCaseDetail.documents.length} docs`);
  assert(Boolean(secondCaseDetail.documents[0].name), `Document name present: ${secondCaseDetail.documents[0].name}`);

  // 4. Approve second case
  const approveRes = await decideKycCase(secondCaseDetail.id, {
    decision: 'APPROVED',
    note: 'All identity documents verified against CKYC registry',
    actor: kycOfficerSession.fullName,
    actorRole: kycOfficerSession.role,
    actorEmail: kycOfficerSession.email
  });

  assert(approveRes.status === 'APPROVED', `Case status updated to APPROVED: ${approveRes.status}`);

  // Customer KYC band in customer record
  const dbAfterKycApprove = getDb();
  const targetCust = dbAfterKycApprove.customers.find(c => c.customerId === secondCaseDetail.customerId);
  assert(targetCust?.kycStatus === 'APPROVED', `Customer kycStatus is APPROVED: ${targetCust?.kycStatus}`);

  // Audit entry exists under officer email with outcome APPROVED
  const auditEntries = await listAudit({ action: 'KYC_APPROVED' });
  const kycAudit = auditEntries.find(a => a.entityId === secondCaseDetail.id);
  assert(Boolean(kycAudit), 'Audit log entry found for KYC_APPROVED');
  assert(kycAudit?.actor === 'kyc.officer@finedge.bank', `Audit actor is officer email: ${kycAudit?.actor}`);
  assert(kycAudit?.outcome === 'APPROVED', `Audit outcome is APPROVED: ${kycAudit?.outcome}`);

  // 5. Request Info on third case (never route through reject)
  const thirdCaseRow = kycList[2] || { id: 'KYC-500989', customerId: 'CUS-200902' };
  const infoReqRes = await decideKycCase(thirdCaseRow.id, {
    decision: 'INFO_REQUIRED',
    reasonCode: 'DOCUMENT_ILLEGIBLE',
    note: 'Address proof scan is blurred. Re-upload clear PDF.',
    actor: kycOfficerSession.fullName,
    actorRole: kycOfficerSession.role,
    actorEmail: kycOfficerSession.email
  });

  assert(infoReqRes.status === 'INFO_REQUIRED', `Case status is INFO_REQUIRED: ${infoReqRes.status}`);
  const thirdCaseDb = getDb().kycApplications.find(k => k.kycCaseId === thirdCaseRow.id);
  assert(thirdCaseDb?.status === 'INFO_REQUIRED', `Stored status in DB is INFO_REQUIRED (not REJECTED): ${thirdCaseDb?.status}`);

  const infoReqAudit = (await listAudit({})).find(a => a.entityId === thirdCaseRow.id && a.action === 'KYC_INFO_REQUIRED');
  assert(Boolean(infoReqAudit), 'Separate KYC_INFO_REQUIRED audit entry was recorded');
  assert(infoReqAudit?.outcome === 'INFO REQUIRED', `Audit outcome is INFO REQUIRED: ${infoReqAudit?.outcome}`);
} catch (e) {
  console.error(e);
  assert(false, `Journey M1 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M2: Account Approval Loop
// ============================================================================
console.log('\n--- Journey M2: Account Approval Loop ---');
try {
  // Set session as Ops Officer
  const opsSession = {
    staffId: 'STF-003',
    fullName: 'Rohan Mehra',
    email: 'ops@finedge.bank',
    role: 'ACCOUNT_OPS',
    permissions: [
      'customers.read',
      'accounts.read', 'accounts.review', 'accounts.approve',
      'cards.read', 'cards.review', 'cards.approve', 'cards.issue', 'cards.block',
      'loans.read', 'loans.review',
      'investments.read', 'investments.review',
      'audit.read'
    ]
  };
  localStorage.setItem('finedge_manager_user', JSON.stringify(opsSession));

  // 1. Create a fresh Savings Plus application to test dynamic interest rate
  const db = getDb();
  const savingsApp = {
    accountApplicationId: 'ACC-APP-881234',
    customerId: 'CUS-100234',
    productCode: 'SAV-PLUS',
    productName: 'FinEdge Savings Plus Account',
    productSlug: 'savings-plus',
    initialFundingAmount: 25000,
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString()
  };
  if (!db.accountApplications) db.accountApplications = [];
  db.accountApplications.unshift(savingsApp);
  saveDb(db);

  // 2. Open Account Applications queue
  const accountApps = await listAccountApplications({});
  assert(accountApps.length > 0, `Account applications list returned ${accountApps.length} rows`);

  const targetApp = accountApps.find(a => a.id === savingsApp.accountApplicationId);
  assert(Boolean(targetApp), `Target application found in queue: ${targetApp.id}`);
  assert(targetApp.customerName === 'Vikramaditya Sharma', `Applicant name resolved: ${targetApp.customerName}`);
  assert(targetApp.initialFunding === 25000, `Initial funding canonical figure: ₹${targetApp.initialFunding}`);

  // 3. Approve application
  const approveResult = await decideAccountApplication(targetApp.id, {
    decision: 'APPROVED',
    actor: opsSession.fullName,
    actorRole: opsSession.role,
    actorEmail: opsSession.email
  });

  assert(approveResult.success === true, 'Account approval succeeded');
  assert(Boolean(approveResult.createdAccountId), `Created account ID materialized: ${approveResult.createdAccountId}`);

  // 4. Verify created account in database
  const dbAfterAcc = getDb();
  const createdAcc = dbAfterAcc.accounts.find(a => a.accountId === approveResult.createdAccountId);
  assert(Boolean(createdAcc), `New bank account ${approveResult.createdAccountId} found in db.accounts`);
  assert(createdAcc.balance.availableBalance === 25000, `Account available balance matches funding: ₹${createdAcc.balance.availableBalance}`);
  assert(createdAcc.interestRate === 7.25, `Dynamic interest rate applied for Savings Plus: ${createdAcc.interestRate}%`);

  // 5. Verify initial funding CREDIT transaction
  const initialTxn = dbAfterAcc.transactions.find(t => t.accountId === approveResult.createdAccountId);
  assert(Boolean(initialTxn), 'First line in statement ledger is initial funding transaction');
  assert(initialTxn.direction === 'CREDIT' || initialTxn.type === 'CREDIT', `Transaction is CREDIT: ${initialTxn.direction}`);
  assert(initialTxn.amount === 25000, `Funding amount credited: ₹${initialTxn.amount}`);

  // 6. Verify createdAccountId is stored on application
  const storedApp = dbAfterAcc.accountApplications.find(a => a.accountApplicationId === targetApp.id);
  assert(storedApp.createdAccountId === approveResult.createdAccountId, `createdAccountId stored on application: ${storedApp.createdAccountId}`);
} catch (e) {
  console.error(e);
  assert(false, `Journey M2 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M3: Decision Honesty (Toast Words Agree With Stored Status & Audit)
// ============================================================================
console.log('\n--- Journey M3: Decision Honesty ---');
try {
  const db = getDb();
  const infoApp = {
    accountApplicationId: 'ACC-APP-998811',
    customerId: 'CUS-100234',
    productCode: 'SAV-PLUS',
    productName: 'FinEdge Savings Plus Account',
    initialFundingAmount: 10000,
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString()
  };
  db.accountApplications.push(infoApp);
  saveDb(db);

  await decideAccountApplication(infoApp.accountApplicationId, {
    decision: 'INFO_REQUIRED',
    reasonCode: 'NEED_KYC_DOCUMENTS',
    note: 'Submit latest electricity bill',
    actor: 'Rohan Mehra',
    actorRole: 'ACCOUNT_OPS',
    actorEmail: 'ops@finedge.bank'
  });

  const updatedApp = getDb().accountApplications.find(a => a.accountApplicationId === infoApp.accountApplicationId);
  assert(updatedApp.status === 'INFO_REQUIRED', `Requested Info stores status INFO_REQUIRED: ${updatedApp.status}`);
  assert(updatedApp.status !== 'REJECTED', 'Status is NOT REJECTED');

  const auditEntry = (await listAudit({})).find(a => a.entityId === infoApp.accountApplicationId);
  assert(auditEntry.action === 'ACCOUNT_APPLICATION_INFO_REQUIRED', `Audit action is ACCOUNT_APPLICATION_INFO_REQUIRED: ${auditEntry.action}`);
  assert(auditEntry.outcome === 'INFO REQUIRED', `Audit outcome is INFO REQUIRED: ${auditEntry.outcome}`);
} catch (e) {
  console.error(e);
  assert(false, `Journey M3 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M4: Card Issuance Loop
// ============================================================================
console.log('\n--- Journey M4: Card Issuance Loop ---');
try {
  const db = getDb();
  let cardApp = db.cardApplications.find(c => c.status === 'UNDER_REVIEW' || c.status === 'PENDING');
  if (!cardApp) {
    cardApp = {
      cardApplicationId: 'CARD-APP-339900',
      customerId: 'CUS-100234',
      cardType: 'CREDIT',
      cardName: 'FinEdge Nova Rewards Credit Card',
      productSlug: 'nova-credit',
      requestedLimit: 150000,
      status: 'UNDER_REVIEW',
      submittedAt: new Date().toISOString()
    };
    db.cardApplications.push(cardApp);
    saveDb(db);
  }

  // 1. Issue card with manager-edited approved limit (e.g. 175,000)
  const issueRes = await issueCard(cardApp.cardApplicationId, {
    limit: 175000,
    actor: 'Rohan Mehra',
    actorRole: 'ACCOUNT_OPS',
    actorEmail: 'ops@finedge.bank'
  });

  assert(issueRes.success === true, 'Card issuance succeeded');
  assert(issueRes.limit === 175000, `Returned limit matches manager approval: ₹${issueRes.limit}`);
  assert(Boolean(issueRes.dispatchRef), `Dispatch ref returned: ${issueRes.dispatchRef}`);
  assert(Boolean(issueRes.cardId), `New card ID returned: ${issueRes.cardId}`);

  // 2. Verify issued card in db.cards
  const dbAfterCard = getDb();
  const issuedCard = dbAfterCard.cards.find(c => c.cardId === issueRes.cardId);
  assert(Boolean(issuedCard), 'Card materialized in db.cards');
  assert(issuedCard.totalLimit === 175000, `Card totalLimit is ₹${issuedCard.totalLimit}`);
  assert(issuedCard.pinSet === false, `Card pinSet is false: ${issuedCard.pinSet}`);
  assert(Boolean(issuedCard.network), `Card network populated from product: ${issuedCard.network}`);

  // 3. Decline another card application
  const declineApp = {
    cardApplicationId: 'CARD-APP-339901',
    customerId: 'CUS-100234',
    cardType: 'CREDIT',
    cardName: 'FinEdge Voyage Ultra Credit Card',
    requestedLimit: 500000,
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString()
  };
  dbAfterCard.cardApplications.push(declineApp);
  saveDb(dbAfterCard);

  await declineCardApplication(declineApp.cardApplicationId, {
    reasonCode: 'CREDIT_SCORE',
    note: 'CIBIL score below policy cutoff',
    actor: 'Rohan Mehra',
    actorRole: 'ACCOUNT_OPS',
    actorEmail: 'ops@finedge.bank'
  });

  const storedDeclined = getDb().cardApplications.find(c => c.cardApplicationId === declineApp.cardApplicationId);
  assert(storedDeclined.status === 'REJECTED', `Stored status is REJECTED: ${storedDeclined.status}`);

  // Canonical presentation map maps REJECTED to Declined tab
  const declinedList = await listCardApplications({ status: 'DECLINED' });
  assert(declinedList.some(c => c.id === declineApp.cardApplicationId), 'Declined application visible under Declined tab');
} catch (e) {
  console.error(e);
  assert(false, `Journey M4 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M5: Loan Chain (Sanction Terms, Disbursement & Amortisation)
// ============================================================================
console.log('\n--- Journey M5: Loan Chain ---');
try {
  // Sign in as Branch Manager
  const mgrSession = {
    staffId: 'STF-001',
    fullName: 'Devendra Singhania',
    email: 'manager@finedge.bank',
    role: 'BANK_MANAGER',
    permissions: PERMISSION_CATALOGUE.map(p => p.code)
  };
  localStorage.setItem('finedge_manager_user', JSON.stringify(mgrSession));

  const db = getDb();
  const loanApp = {
    loanApplicationId: 'LAPP-551122',
    customerId: 'CUS-100234',
    productName: 'FinEdge Home Loan',
    productSlug: 'home-loan',
    requestedAmount: 5000000,
    amount: 5000000,
    rate: 8.75,
    tenureMonths: 120,
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString(),
    steps: [
      { key: 'SUBMITTED', label: 'Submitted', state: 'done' },
      { key: 'DOCUMENT_VERIFICATION', label: 'Document Verification', state: 'current' },
      { key: 'APPROVAL', label: 'Approval', state: 'upcoming' },
      { key: 'DISBURSEMENT', label: 'Disbursement', state: 'upcoming' }
    ]
  };
  if (!db.loanApplications) db.loanApplications = [];
  db.loanApplications.push(loanApp);
  saveDb(db);

  // 1. Approve loan with sanctioned terms (₹4,800,000 at 8.65%)
  const approvedLoan = await decideLoanApplication(loanApp.loanApplicationId, {
    decision: 'APPROVED',
    sanctionedAmount: 4800000,
    sanctionedRate: 8.65,
    note: 'Sanctioned with corporate preferred discount',
    actor: mgrSession.fullName,
    actorRole: mgrSession.role,
    actorEmail: mgrSession.email
  });

  assert(approvedLoan.status === 'APPROVED', `Loan status is APPROVED (not SANCTIONED): ${approvedLoan.status}`);
  assert(approvedLoan.sanctionedAmount === 4800000, `Sanctioned amount stored: ₹${approvedLoan.sanctionedAmount}`);
  assert(approvedLoan.sanctionedRate === 8.65, `Sanctioned rate stored: ${approvedLoan.sanctionedRate}%`);

  // Progress stepper updated
  const stepApproval = approvedLoan.steps.find(s => s.key === 'APPROVAL');
  assert(stepApproval?.state === 'done', 'Approval step advanced to done');
  const stepDisburse = approvedLoan.steps.find(s => s.key === 'DISBURSEMENT');
  assert(stepDisburse?.state === 'current', 'Disbursement step advanced to current');

  // 2. Disburse loan
  const targetAccount = getDb().accounts.find(a => a.customerId === 'CUS-100234');
  const balanceBefore = targetAccount.balance.availableBalance;
  const disbResult = await disburseLoan(loanApp.loanApplicationId, {
    actor: mgrSession.fullName,
    actorRole: mgrSession.role,
    actorEmail: mgrSession.email
  });

  assert(disbResult.success === true, 'Disbursement succeeded');
  assert(disbResult.principal === 4800000, `Disbursed principal matches sanction: ₹${disbResult.principal}`);
  assert(Boolean(disbResult.disbursementRef), `Disbursement reference: ${disbResult.disbursementRef}`);
  assert(Boolean(disbResult.creditedAccountLast4), `Credited account last 4: ${disbResult.creditedAccountLast4}`);

  // 3. Verify loan materialized in db.loans
  const dbAfterDisb = getDb();
  const materializedLoan = dbAfterDisb.loans.find(l => l.loanId === disbResult.id || l.applicationId === loanApp.loanApplicationId);
  assert(Boolean(materializedLoan), 'Active loan record created in db.loans');
  assert(materializedLoan.principal === 4800000, `Loan principal is ₹${materializedLoan.principal}`);
  assert(materializedLoan.schedule.length === 120, `Amortisation schedule generated for 120 months: ${materializedLoan.schedule.length}`);

  // 4. Verify disbursement credit in account
  const balanceAfter = dbAfterDisb.accounts.find(a => a.customerId === 'CUS-100234').balance.availableBalance;
  assert(balanceAfter === balanceBefore + 4800000, `Account balance increased by ₹4,800,000 (before: ${balanceBefore}, after: ${balanceAfter})`);

  // 5. Guard double disburse
  let doubleDisburseBlocked = false;
  try {
    await disburseLoan(loanApp.loanApplicationId, {
      actor: mgrSession.fullName,
      actorRole: mgrSession.role,
      actorEmail: mgrSession.email
    });
  } catch (err) {
    doubleDisburseBlocked = true;
  }
  assert(doubleDisburseBlocked, 'Double-disburse attempt correctly guarded and blocked');

  // 6. Request Documents on another loan application
  const docApp = {
    loanApplicationId: 'LAPP-551123',
    customerId: 'CUS-100234',
    productName: 'FinEdge Auto Loan',
    productSlug: 'auto-loan',
    requestedAmount: 1200000,
    amount: 1200000,
    rate: 9.25,
    tenureMonths: 60,
    status: 'UNDER_REVIEW',
    submittedAt: new Date().toISOString(),
    steps: [{ key: 'DOCUMENT_VERIFICATION', label: 'Document Verification', state: 'current' }]
  };
  dbAfterDisb.loanApplications.push(docApp);
  saveDb(dbAfterDisb);

  const docRes = await decideLoanApplication(docApp.loanApplicationId, {
    decision: 'REQUEST_DOCS',
    reasonCode: 'NEED_INCOME_PROOF',
    note: 'Provide last 3 months salary slips',
    actor: mgrSession.fullName,
    actorRole: mgrSession.role,
    actorEmail: mgrSession.email
  });

  assert(docRes.status === 'DOCS_REQUESTED', `Application status is DOCS_REQUESTED: ${docRes.status}`);
  assert(docRes.status !== 'REJECTED', 'Application status is NOT REJECTED');
} catch (e) {
  console.error(e);
  assert(false, `Journey M5 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M6: Investment Booking Loop
// ============================================================================
console.log('\n--- Journey M6: Investment Booking Loop ---');
try {
  const db = getDb();
  const invApp = {
    applicationId: 'INV-APP-772211',
    customerId: 'CUS-100234',
    productName: 'FinEdge Fixed Deposit',
    productSlug: 'fixed-deposit',
    kind: 'FD',
    amount: 100000,
    depositAmount: 100000,
    rate: 7.50,
    interestRate: 7.50,
    tenureMonths: 24,
    maturityAmount: 116118.41,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    steps: [
      { key: 'SUBMITTED', label: 'Submitted', state: 'done' },
      { key: 'VERIFICATION', label: 'Verification', state: 'current' },
      { key: 'APPROVED', label: 'Approved', state: 'upcoming' },
      { key: 'BOOKED', label: 'Booked', state: 'upcoming' }
    ]
  };
  if (!db.investmentApplications) db.investmentApplications = [];
  db.investmentApplications.push(invApp);
  saveDb(db);

  // 1. Approve
  const approvedInv = await decideInvestmentApplication(invApp.applicationId, {
    decision: 'APPROVED',
    note: 'Mandate and funding verified',
    actor: 'Devendra Singhania',
    actorRole: 'BANK_MANAGER',
    actorEmail: 'manager@finedge.bank'
  });
  assert(approvedInv.status === 'APPROVED', `Investment status moved to APPROVED: ${approvedInv.status}`);

  // 2. Book
  const bookedInv = await bookInvestmentApplication(invApp.applicationId, {
    actor: 'Devendra Singhania',
    actorRole: 'BANK_MANAGER',
    actorEmail: 'manager@finedge.bank'
  });

  assert(bookedInv.status === 'BOOKED', `Investment status is BOOKED: ${bookedInv.status}`);
  assert(Boolean(bookedInv.holdingId), `holdingId assigned: ${bookedInv.holdingId}`);

  // 3. Verify holding in db.investmentHoldings
  const dbAfterInv = getDb();
  const holding = (dbAfterInv.investmentHoldings || []).find(h => h.holdingId === bookedInv.holdingId);
  assert(Boolean(holding), 'Holding created in core bank ledger (db.investmentHoldings)');
  assert(holding.depositAmount === 100000, `Holding deposit amount verbatim: ₹${holding.depositAmount}`);
  assert(holding.interestRate === 7.50, `Holding interest rate verbatim: ${holding.interestRate}%`);
  assert(holding.maturityAmount === 116118.41, `Holding maturity amount verbatim: ₹${holding.maturityAmount}`);
} catch (e) {
  console.error(e);
  assert(false, `Journey M6 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M7: Audit Integrity
// ============================================================================
console.log('\n--- Journey M7: Audit Integrity ---');
try {
  // Test failed login auditing
  let failedLoginThrown = false;
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'manager@finedge.bank', password: 'WrongPassword@999' })
    });
  } catch (err) {
    failedLoginThrown = true;
  }
  assert(failedLoginThrown, 'Failed login attempt threw authentication error');

  // Verify STAFF_LOGIN_FAILED audit entry exists
  const allLogs = await listAudit({});
  const failedEntry = allLogs.find(a => a.action === 'STAFF_LOGIN_FAILED');
  assert(Boolean(failedEntry), 'STAFF_LOGIN_FAILED audit entry was recorded in audit log');
  assert(failedEntry.outcome === 'FAILED', `Failed entry outcome is FAILED: ${failedEntry.outcome}`);

  // Verify decisions have entity, outcome and detail populated
  const sampleDecisionAudit = allLogs.find(a => a.action === 'KYC_APPROVED' || a.action === 'LOAN_APPROVED');
  assert(Boolean(sampleDecisionAudit), 'Found decision audit record');
  assert(sampleDecisionAudit.entity !== 'System' && Boolean(sampleDecisionAudit.entity), `Entity is honest canonical name: ${sampleDecisionAudit.entity}`);
  assert(sampleDecisionAudit.outcome === 'APPROVED', `Outcome is decision outcome: ${sampleDecisionAudit.outcome}`);
  assert(Boolean(sampleDecisionAudit.detail), `Detail populated: ${sampleDecisionAudit.detail}`);
  assert(sampleDecisionAudit.actor.includes('@finedge.bank'), `Actor is real staff email: ${sampleDecisionAudit.actor}`);

  // Test outcome filter
  const rejectedLogs = await listAudit({ outcome: 'REJECTED' });
  assert(rejectedLogs.every(r => r.outcome === 'REJECTED'), 'Outcome filter for REJECTED returned only rejections');

  // Test CSV export integrity
  const csv = auditCsv(allLogs.slice(0, 5));
  assert(!csv.includes('"System"'), 'Audit CSV contains no literal "System" placeholders');
  const headerLine = csv.split('\n')[0];
  assert(headerLine.includes('Time') && headerLine.includes('Actor') && headerLine.includes('Outcome') && headerLine.includes('Entity ID'), 'CSV header matches specification columns');
} catch (e) {
  console.error(e);
  assert(false, `Journey M7 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M8: Staff Admin Loop
// ============================================================================
console.log('\n--- Journey M8: Staff Admin Loop ---');
try {
  // Set current user as Branch Manager
  const mgrUser = {
    staffId: 'STF-001',
    id: 'STF-001',
    fullName: 'Devendra Singhania',
    name: 'Devendra Singhania',
    email: 'manager@finedge.bank',
    role: 'BANK_MANAGER'
  };
  localStorage.setItem('finedge_manager_user', JSON.stringify(mgrUser));

  // 1. List staff - all 5 accounts present with names
  const staffList = await listStaff();
  assert(staffList.length === 5, `Staff list returned all 5 seeded staff members: ${staffList.length}`);
  assert(staffList.every(s => Boolean(s.name) && s.name !== '—'), 'Every staff member has a real name populated');

  // Exactly one self
  const isSelf = (s) => Boolean(mgrUser && ((s.id && (mgrUser.id === s.id || mgrUser.staffId === s.id)) || (s.email && mgrUser.email && s.email.toLowerCase() === mgrUser.email.toLowerCase())));
  const selfCount = staffList.filter(isSelf).length;
  assert(selfCount === 1, `Exactly one row is identified as (you): count=${selfCount}`);

  // 2. Select Support member (STF-005)
  const supportStaff = staffList.find(s => s.id === 'STF-005');
  assert(Boolean(supportStaff), 'Support staff member found (STF-005)');
  assert(supportStaff.name === 'Sameer Khan', `Support member name is Sameer Khan: ${supportStaff.name}`);

  // 3. Update permissions with a reason
  const newPerms = [...supportStaff.permissions, 'tickets.manage'];
  const updateRes = await updateStaffPermissions(supportStaff.id, newPerms, {
    reason: 'Granted tickets escalation permission per Q4 rotation',
    actor: mgrUser.name,
    actorRole: mgrUser.role,
    actorEmail: mgrUser.email
  });
  assert(updateRes.permissions.includes('tickets.manage'), 'New permission returned in update response');

  // Verify persistence across reload
  const reloadedStaff = (await listStaff()).find(s => s.id === 'STF-005');
  assert(reloadedStaff.permissions.includes('tickets.manage'), 'Permission change persisted in storage');

  // Audit entry exists with reason
  const permAudit = (await listAudit({})).find(a => a.action === 'STAFF_PERMISSIONS_UPDATED' && a.entityId === 'STF-005');
  assert(Boolean(permAudit), 'STAFF_PERMISSIONS_UPDATED audit entry exists');
  assert(permAudit.detail.includes('Granted tickets escalation permission'), `Audit detail includes reason: ${permAudit.detail}`);

  // 4. Deactivate Support account
  await setStaffActive(supportStaff.id, false, {
    actor: mgrUser.name,
    actorRole: mgrUser.role,
    actorEmail: mgrUser.email,
    reason: 'Temporary leave of absence'
  });

  const deactivatedStaff = (await listStaff()).find(s => s.id === 'STF-005');
  assert(deactivatedStaff.status === 'DISABLED', `Staff account status is DISABLED: ${deactivatedStaff.status}`);

  // Deactivated login refused
  let deactLoginRefused = false;
  try {
    handleLocalFallback('/admin/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'support@finedge.bank', password: 'Manager@2026' })
    });
  } catch (err) {
    if (err.code === 'STAFF_ACCOUNT_DEACTIVATED') {
      deactLoginRefused = true;
    }
  }
  assert(deactLoginRefused, 'Deactivated staff login refused with 403 STAFF_ACCOUNT_DEACTIVATED');

  // Reactivate Support account
  await setStaffActive(supportStaff.id, true, {
    actor: mgrUser.name,
    actorRole: mgrUser.role,
    actorEmail: mgrUser.email
  });
  const reactivatedStaff = (await listStaff()).find(s => s.id === 'STF-005');
  assert(reactivatedStaff.status === 'ACTIVE', `Staff account reactivated: ${reactivatedStaff.status}`);
} catch (e) {
  console.error(e);
  assert(false, `Journey M8 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M9: Granular Role-Based Access Control (RBAC)
// ============================================================================
console.log('\n--- Journey M9: RBAC Gating ---');
try {
  const kycOfficer = {
    staffId: 'STF-002',
    role: 'KYC_OFFICER',
    permissions: ['customers.read', 'kyc.read', 'kyc.review', 'kyc.approve', 'audit.read']
  };

  // 1. NAV gating: KYC Officer has access to KYC and Customers, but NOT loans or staff
  assert(hasSectionAccess('kyc', kycOfficer) === true, 'KYC Officer has access to KYC Queue');
  assert(hasSectionAccess('customers', kycOfficer) === true, 'KYC Officer has access to Customers');
  assert(hasSectionAccess('loans', kycOfficer) === false, 'KYC Officer does NOT have access to Loans');
  assert(hasSectionAccess('staff', kycOfficer) === false, 'KYC Officer does NOT have access to Staff & Roles');
  assert(hasSectionAccess('accounts', kycOfficer) === false, 'KYC Officer does NOT have access to Account Applications');

  // 2. Direct action blocked: KYC Officer attempting loan decision
  let loanBlocked = false;
  try {
    assertStaffPermission('loans.review', {
      actorRole: kycOfficer.role,
      actorEmail: 'kyc.officer@finedge.bank'
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_PERMISSIONS') loanBlocked = true;
  }
  assert(loanBlocked, 'Direct loan decision by KYC Officer blocked with INSUFFICIENT_PERMISSIONS');

  // 3. Auditor Read-Only Mode: Auditor attempting mutation blocked
  const auditor = {
    staffId: 'STF-004',
    role: 'AUDIT_COMPLIANCE',
    permissions: ['customers.read', 'kyc.read', 'audit.read', 'reports.read']
  };
  let auditorBlocked = false;
  try {
    assertStaffPermission('kyc.review', {
      actorRole: auditor.role,
      actorEmail: 'audit.officer@finedge.bank'
    });
  } catch (err) {
    if (err.code === 'AUDITOR_READ_ONLY') auditorBlocked = true;
  }
  assert(auditorBlocked, 'Auditor mutation blocked with AUDITOR_READ_ONLY');
} catch (e) {
  console.error(e);
  assert(false, `Journey M9 encountered unexpected error: ${e.message}`);
}

// ============================================================================
// JOURNEY M10: Totals & Exports Reconcile
// ============================================================================
console.log('\n--- Journey M10: Totals & Exports Reconcile ---');
try {
  const summary = await reportsSummary();

  // Hand-sum available balances across all active accounts
  const db = getDb();
  const handSum = Math.round(db.accounts.reduce((sum, a) => {
    const bal = typeof a.balance === 'object' ? (a.balance.availableBalance ?? a.balance.amount) : Number(a.balance);
    return sum + (bal || 0);
  }, 0) * 100) / 100;

  assert(!isNaN(summary.totalDeposits), `Total deposits is valid number (not NaN): ${summary.totalDeposits}`);
  assert(summary.totalDeposits === handSum, `Total deposits matches exact hand-sum: ₹${summary.totalDeposits} === ₹${handSum}`);
  assert(summary.activeLoans >= 1, `Active loans count >= 1: ${summary.activeLoans}`);
  assert(summary.loanBook > 0, `Loan book value > ₹0: ₹${summary.loanBook}`);

  // Test customers CSV masking
  const custRows = await listCustomers({});
  const custFirst = custRows[0];
  assert(Boolean(custFirst.pan), 'Customer has PAN');
  assert(custFirst.pan !== maskPan(custFirst.pan), 'Raw PAN is different from masked PAN');

  const csvLine = `"${custFirst.fullName}","${custFirst.id}","${custFirst.email}","${custFirst.mobile}","${maskPan(custFirst.pan)}"`;
  assert(!csvLine.includes(custFirst.pan), 'Customer CSV line does NOT leak unmasked PAN');
  assert(csvLine.includes(maskPan(custFirst.pan)), `Customer CSV contains properly masked PAN: ${maskPan(custFirst.pan)}`);

  // Verify reports CSV has no NaN
  const summaryCsvRows = [
    ['Metric', 'Value'],
    ['Total deposits (INR)', summary.totalDeposits],
    ['Loan book (INR)', summary.loanBook]
  ];
  const renderedCsv = summaryCsvRows.map(r => r.join(',')).join('\n');
  assert(!renderedCsv.includes('NaN'), 'Reports summary CSV does not contain literal NaN');
} catch (e) {
  console.error(e);
  assert(false, `Journey M10 encountered unexpected error: ${e.message}`);
}

console.log('\n================================================================');
console.log(`MODULE 37 ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
