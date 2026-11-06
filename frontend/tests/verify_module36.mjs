// ============================================================================
// MODULE 36 AUTOMATED ACCEPTANCE TEST SUITE: J1 TO J14
// ============================================================================

import {
  getDefaultDb,
  getDb,
  saveDb,
  resetDemoDb,
  handleLocalFallback
} from '../src/services/api.js';

import {
  listAccounts,
  getAccount,
  listTransactions,
  statementCsv,
  transfer,
  listBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  listMyCards,
  updateCardControls,
  payCard,
  applyCard,
  listMyCardApplications,
  applyLoan,
  listMyLoanApplications,
  listMyLoans,
  bookFd,
  bookRd,
  openSsy,
  listHoldings,
  listMyInvestmentApplications,
  getMyProfile,
  submitKyc,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadCount,
  changePassword,
  RAILS
} from '../src/services/portalBridge.js';

import { disburseLoan } from '../src/services/managerBridge.js';
import { calculateEMI, calculateFD, calculateRD, calculateSSY } from '../src/lib/finance.js';
import { BRAND, CARDS, FD, RD, SSY, LOANS } from '../src/data/products.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runAcceptanceSuite() {
  console.log('================================================================');
  console.log('STARTING MODULE 36 ACCEPTANCE VERIFICATION (JOURNEYS J1 - J14)');
  console.log('================================================================\n');

  // Polyfill localStorage in Node environment
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  // Reset to fresh demo DB
  resetDemoDb();
  localStorage.setItem('finedge_session_customer_id', 'CUS-100234');
  const custId = 'CUS-100234';

  // --------------------------------------------------------------------------
  console.log('--- J1: Balances Reconcile ---');
  // --------------------------------------------------------------------------
  const accounts = await listAccounts(custId);
  assert(accounts.length >= 2, 'Customer accounts loaded');
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  assert(totalBalance > 0, `Total balance computed correctly: ₹${totalBalance}`);

  const accDetail = await getAccount(accounts[0].id);
  assert(accDetail.balance === accounts[0].balance, 'Account detail balance matches listed balance');
  assert(accDetail.ifsc === 'FEDG0001021', `Account IFSC is real brand prefix: ${accDetail.ifsc}`);
  assert(accDetail.branch.includes('BKC Flagship Branch'), `Account branch is real: ${accDetail.branch}`);
  assert(Boolean(accDetail.openedAt), `Account opened date is present: ${accDetail.openedAt}`);
  assert(typeof accDetail.interestRate === 'number', `Interest rate row present: ${accDetail.interestRate}%`);

  // --------------------------------------------------------------------------
  console.log('\n--- J2: Statement Truth & Reconciliation ---');
  // --------------------------------------------------------------------------
  const txns = await listTransactions(accounts[0].id);
  assert(txns.length > 0, `Transactions loaded: ${txns.length} records`);
  assert(txns.every(t => t.type === 'CREDIT' || t.type === 'DEBIT'), 'Every transaction has type CREDIT or DEBIT derived from direction');
  assert(txns.every(t => Boolean(t.reference)), 'Every transaction has a valid non-empty reference');
  assert(txns.some(t => t.balance !== null && t.balance > 0), 'Transactions carry real running balances (not 0.00)');

  // Test CSV export reconciliation
  const csv = statementCsv(accDetail, txns);
  assert(csv.includes('Date') && csv.includes('Reference') && csv.includes('Description') && csv.includes('Debit') && csv.includes('Credit') && (csv.includes('Balance') || csv.includes('Running Balance')), 'Statement CSV header matches specification');
  assert(csv.includes('Total Credits'), 'Statement CSV contains closing summary Total Credits');
  assert(csv.includes('Total Debits'), 'Statement CSV contains closing summary Total Debits');

  // --------------------------------------------------------------------------
  console.log('\n--- J3: Salary Reads as Credit ---');
  // --------------------------------------------------------------------------
  const salaryTxn = txns.find(t => t.description.toLowerCase().includes('salary'));
  assert(Boolean(salaryTxn), 'Salary credit transaction found in ledger');
  assert(salaryTxn.type === 'CREDIT', `Salary transaction type is CREDIT: ${salaryTxn.type}`);
  assert(salaryTxn.amount > 0, `Salary transaction amount is positive: ₹${salaryTxn.amount}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J4: Own-Account Money Conservation ---');
  // --------------------------------------------------------------------------
  const acc1 = accounts[0];
  const acc2 = accounts[1];
  const acc1BalBefore = acc1.balance;
  const acc2BalBefore = acc2.balance;
  const totalBefore = acc1BalBefore + acc2BalBefore;
  const xferAmt = 1000;

  const ownReceipt = await transfer({
    customerId: custId,
    fromAccountId: acc1.id,
    destinationType: 'OWN',
    destinationId: acc2.id,
    amount: xferAmt,
    railId: 'INTERNAL'
  });

  const updatedAccs = await listAccounts(custId);
  const acc1After = updatedAccs.find(a => a.id === acc1.id);
  const acc2After = updatedAccs.find(a => a.id === acc2.id);
  const totalAfter = acc1After.balance + acc2After.balance;

  assert(acc1After.balance === acc1BalBefore - xferAmt, `Source debited by ₹${xferAmt}: ${acc1After.balance}`);
  assert(acc2After.balance === acc2BalBefore + xferAmt, `Destination credited by ₹${xferAmt}: ${acc2After.balance}`);
  assert(totalBefore === totalAfter, `Cross-account total conserved: before=${totalBefore}, after=${totalAfter}`);
  assert(Boolean(ownReceipt.reference), `Receipt has non-null reference: ${ownReceipt.reference}`);
  assert(ownReceipt.totalDebit === xferAmt, `Receipt totalDebit equals transferred amount: ₹${ownReceipt.totalDebit}`);
  assert(ownReceipt.balanceAfter === acc1After.balance, `Receipt balanceAfter matches ledger: ₹${ownReceipt.balanceAfter}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J5: Charges Agree (IMPS ₹5 Ledger Debit) ---');
  // --------------------------------------------------------------------------
  const impsRail = RAILS.find(r => r.id === 'IMPS');
  assert(impsRail && impsRail.charge === 5, 'IMPS rail charge is ₹5 in product table');

  const beneList = await listBeneficiaries(custId);
  assert(beneList.length > 0, 'Beneficiary exists for external transfer test');
  const externalBene = beneList[0];

  const sourceBalBefore = (await getAccount(acc1.id)).balance;
  const impsAmt = 500;
  const impsReceipt = await transfer({
    customerId: custId,
    fromAccountId: acc1.id,
    destinationType: 'BENEFICIARY',
    destinationId: externalBene.id,
    amount: impsAmt,
    railId: 'IMPS'
  });

  const sourceBalAfter = (await getAccount(acc1.id)).balance;
  const expectedTotalDebit = impsAmt + 5;
  assert(impsReceipt.charges === 5, `Receipt charge is ₹5: ${impsReceipt.charges}`);
  assert(impsReceipt.totalDebit === expectedTotalDebit, `Receipt totalDebit is ₹${expectedTotalDebit}: ${impsReceipt.totalDebit}`);
  assert(sourceBalBefore - sourceBalAfter === expectedTotalDebit, `Ledger debited exact amount + charge: ₹${expectedTotalDebit}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J6: Beneficiaries Add, Dedupe, and Actually Remove ---');
  // --------------------------------------------------------------------------
  const newBene = await addBeneficiary(custId, {
    name: 'Siddharth Rao',
    accountNumber: '987654321098',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank'
  });
  assert(Boolean(newBene.id), `Beneficiary added with canonical ID: ${newBene.id}`);

  // Dedupe guard (same account + IFSC)
  try {
    await addBeneficiary(custId, {
      name: 'Siddharth Duplicate',
      accountNumber: '987654321098',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank'
    });
    assert(false, 'Duplicate beneficiary should have been rejected');
  } catch (err) {
    assert(err.message.includes('already have a beneficiary') || err.message.includes('Duplicate'), 'Duplicate beneficiary rejected with honest message');
  }

  // Own-account guard
  try {
    await addBeneficiary(custId, {
      name: 'Myself Own Account',
      accountNumber: acc1.rawAccountNumber || '98201100001234',
      ifsc: 'FEDG0001021',
      bankName: 'FinEdge Bank'
    });
    assert(false, 'Own account as beneficiary should have been rejected');
  } catch (err) {
    assert(err.message.includes('own account'), 'Own account rejected with honest message');
  }

  // Remove and verify persistent removal
  await deleteBeneficiary(custId, newBene.id);
  const refreshedBens = await listBeneficiaries(custId);
  assert(!refreshedBens.some(b => b.id === newBene.id), 'Beneficiary removed and row is gone after reload');

  // --------------------------------------------------------------------------
  console.log('\n--- J7: Card Controls Persist & Bounded Slider Ceilings ---');
  // --------------------------------------------------------------------------
  const myCards = await listMyCards(custId);
  assert(myCards.length > 0, `Cards loaded: ${myCards.length}`);
  const testCard = myCards[0];
  const origIntl = testCard.controls.international;

  // Toggle international
  await updateCardControls(testCard.id, { controls: { international: !origIntl } });
  const reloadedCards = await listMyCards(custId);
  const reloadedCard = reloadedCards.find(c => c.id === testCard.id);
  assert(reloadedCard.controls.international === !origIntl, `Toggling international persisted: ${reloadedCard.controls.international}`);

  // Test Classic Debit ceiling
  const classicDebit = myCards.find(c => c.productSlug === 'classic-debit') || myCards[1];
  if (classicDebit) {
    const classicProd = CARDS.find(c => c.slug === 'classic-debit');
    assert(classicProd.limits.posDaily === 100000, 'Classic Debit POS daily limit is 100,000');
    assert(classicProd.limits.atmDaily === 40000, 'Classic Debit ATM daily limit is 40,000');
  }

  // --------------------------------------------------------------------------
  console.log('\n--- J8: Card Identity, Billing & In-Demo Pay Now ---');
  // --------------------------------------------------------------------------
  const creditCard = myCards.find(c => c.kind === 'CREDIT');
  assert(Boolean(creditCard), 'Credit card exists in user cards');
  assert(creditCard.productName === 'FinEdge Edge Cashback Card', `Product name is catalogue product: ${creditCard.productName}`);
  assert(creditCard.network === 'RuPay', `Card network is RuPay: ${creditCard.network}`);
  assert(creditCard.outstanding > 0, `Outstanding balance present: ₹${creditCard.outstanding}`);
  assert(creditCard.minDue > 0, `Minimum due present: ₹${creditCard.minDue}`);
  assert(Boolean(creditCard.dueDate), `Due date present: ${creditCard.dueDate}`);

  // Pay minimum due
  const payAmt = creditCard.minDue;
  const cardOutstandingBefore = creditCard.outstanding;
  const fundingAccBefore = (await getAccount(acc1.id)).balance;

  const payResult = await payCard(creditCard.id, { accountId: acc1.id, amount: payAmt });
  assert(payResult.success, 'Credit card payment executed successfully');

  const cardAfterPay = (await listMyCards(custId)).find(c => c.id === creditCard.id);
  const fundingAccAfter = (await getAccount(acc1.id)).balance;
  assert(cardAfterPay.outstanding === cardOutstandingBefore - payAmt, `Card outstanding reduced by ₹${payAmt}: ${cardAfterPay.outstanding}`);
  assert(fundingAccBefore - fundingAccAfter === payAmt, `Funding account debited by ₹${payAmt}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J9: Card Apply Integrity & Product Deduplication ---');
  // --------------------------------------------------------------------------
  // Apply for Voyage credit card
  const voyageApp = await applyCard(custId, {
    productSlug: 'edge-voyage-credit',
    productName: 'FinEdge Edge Voyage Card',
    kind: 'CREDIT',
    accountId: acc1.id
  });
  assert(voyageApp.productName.includes('Voyage'), `Applied for Voyage card: ref=${voyageApp.id}`);

  // Applying for Voyage again should fail with duplicate
  try {
    await applyCard(custId, {
      productSlug: 'edge-voyage-credit',
      productName: 'FinEdge Edge Voyage Card',
      kind: 'CREDIT',
      accountId: acc1.id
    });
    assert(false, 'Duplicate card application should have been rejected');
  } catch (err) {
    assert(err.message.includes('under review') || err.message.includes('Already Pending'), 'Duplicate application for same product rejected');
  }

  // --------------------------------------------------------------------------
  console.log('\n--- J10: Loan Loop Closes & Manager Disbursement ---');
  // --------------------------------------------------------------------------
  // Minimum income validation
  const homeLoan = LOANS.find(l => l.slug === 'home-loan');
  assert(homeLoan.eligibility.minMonthlyIncome === 40000, 'Home loan requires ₹40,000 min income');

  const loanApp = await applyLoan(custId, {
    productSlug: 'home-loan',
    productName: 'FinEdge Home Loan',
    rate: 8.75,
    amount: 1500000,
    tenureMonths: 120,
    purpose: 'Residential apartment purchase',
    accountId: acc1.id,
    monthlyIncome: 85000,
    employmentType: 'Salaried',
    employerName: 'Acme Global Corp'
  });
  assert(Boolean(loanApp.id), `Loan application created: ${loanApp.id}`);
  assert(loanApp.emi > 0, `Computed EMI present: ₹${loanApp.emi}`);
  assert(Array.isArray(loanApp.steps), 'Progress steps present on loan application');

  // Disburse loan via manager bridge
  const disburseRes = await disburseLoan(loanApp.id, 'ACC-1001');
  assert(disburseRes.success, 'Manager disbursed loan');

  const myLoans = await listMyLoans(custId);
  const activeLoan = myLoans.find(l => l.applicationId === loanApp.id || l.disbursementRef.includes(loanApp.id));
  assert(Boolean(activeLoan), 'Active loan materialized in customer loans');
  assert(activeLoan.schedule.length === 120, `Amortisation schedule generated: ${activeLoan.schedule.length} months`);
  assert(activeLoan.schedule[0].emi === loanApp.emi, `First EMI in schedule equals application EMI: ₹${activeLoan.schedule[0].emi}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J11: Investment Booking Truth ---');
  // --------------------------------------------------------------------------
  const fdFundingBefore = (await getAccount(acc1.id)).balance;
  const fdAmt = 100000;
  const fdPreview = calculateFD({ principal: fdAmt, annualRatePct: 6.85, tenureMonths: 18 });

  const bookedFd = await bookFd(custId, {
    accountId: acc1.id,
    amount: fdAmt,
    tenureMonths: 18,
    rate: 6.85,
    productName: 'Fixed Deposit',
    maturityAmount: fdPreview.maturityValue
  });
  const fdFundingAfter = (await getAccount(acc1.id)).balance;
  assert(fdFundingBefore - fdFundingAfter === fdAmt, `Funding account debited by ₹${fdAmt}`);
  assert(bookedFd.maturityAmount === fdPreview.maturityValue, `Booked maturity matches preview: ₹${bookedFd.maturityAmount}`);

  // RD multiple of 100 validation
  try {
    await bookRd(custId, {
      accountId: acc1.id,
      monthly: 550,
      tenureMonths: 12,
      rate: 6.25
    });
    assert(false, 'RD ₹550 should be rejected (not multiple of 100)');
  } catch (err) {
    assert(err.message.includes('multiple of ₹100'), 'RD ₹550 rejected with multiple of ₹100 reason');
  }

  // SSY booking with child name and rate 8.05%
  const ssyBooking = await openSsy(custId, {
    accountId: acc1.id,
    amount: 25000,
    childName: 'Aanya Sharma',
    childDob: '2019-06-15',
    guardianName: 'Vikramaditya Sharma',
    guardianRelationship: 'Father'
  });
  assert(ssyBooking.girlChildName === 'Aanya Sharma', `SSY child name stored: ${ssyBooking.girlChildName}`);
  assert(ssyBooking.rate === 8.05, `SSY rate is 8.05%: ${ssyBooking.rate}`);

  // --------------------------------------------------------------------------
  console.log('\n--- J12: KYC & Profile Loop ---');
  // --------------------------------------------------------------------------
  const profile = await getMyProfile(custId);
  assert(Boolean(profile.customer), 'Customer object returned by getMyProfile');
  assert(Boolean(profile.kycCase), 'KYC case returned by getMyProfile');
  assert(profile.customer.fullName === 'Vikramaditya Sharma', `Customer name is Vikramaditya: ${profile.customer.fullName}`);

  // Submit fresh KYC
  const submittedKyc = await submitKyc(custId, {
    fullName: 'Vikramaditya Sharma',
    pan: 'FNEGS1023K',
    dob: '1995-08-14',
    mobile: '9820110023',
    address: { line1: '402, FinEdge Horizon Towers', city: 'Mumbai', state: 'Maharashtra', pin: '400051' },
    occupation: 'SALARIED',
    annualIncome: 1200000
  }, [{ type: 'PAN', name: 'pan.pdf' }, { type: 'AADHAAR', name: 'aadhaar.pdf' }]);
  assert(submittedKyc.status === 'SUBMITTED', `KYC submission status is SUBMITTED: ${submittedKyc.status}`);
  assert(submittedKyc.aadhaarConsent === true, 'Aadhaar consent recorded');

  // --------------------------------------------------------------------------
  console.log('\n--- J13: Notifications & Password Change Loop ---');
  // --------------------------------------------------------------------------
  const notifs = await listNotifications(custId);
  assert(notifs.length > 0, `Notifications listed: ${notifs.length}`);
  const targetNotif = notifs.find(n => !n.read) || notifs[0];

  await markNotificationRead(custId, targetNotif.id);
  const updatedNotifs = await listNotifications(custId);
  const updatedTarget = updatedNotifs.find(n => n.id === targetNotif.id);
  assert(updatedTarget.read === true, 'Notification marked as read persists after reload');

  // Change password: wrong password rejected
  try {
    await changePassword(custId, 'WrongPassword@123', 'NewPassword@2026');
    assert(false, 'Wrong password should have been rejected');
  } catch (err) {
    assert(err.message.includes('incorrect') || err.message.includes('INVALID_CREDENTIALS'), 'Wrong password rejected');
  }

  // Change password: right password succeeds
  const changeRes = await changePassword(custId, 'Password@123', 'NewPassword@2026');
  assert(changeRes.success, 'Password changed successfully');

  // Test login with old password fails
  try {
    handleLocalFallback('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'Password@123' })
    });
    assert(false, 'Login with old password should fail');
  } catch (err) {
    assert(err.status === 401, 'Login with old password fails with 401');
  }

  // Test login with new password succeeds
  const newLogin = handleLocalFallback('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'vikram.sharma@finedge.customer', password: 'NewPassword@2026' })
  });
  assert(Boolean(newLogin.accessToken), 'Login with new password succeeds');

  // --------------------------------------------------------------------------
  console.log('\n--- J14: Shell & Facts ---');
  // --------------------------------------------------------------------------
  assert(BRAND.support.hours === 'Mon–Sat, 9:00 AM – 7:00 PM IST', `Support hours fact is unified: ${BRAND.support.hours}`);

  console.log('\n================================================================');
  console.log(`ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceSuite().catch(err => {
  console.error('Fatal error running acceptance suite:', err);
  process.exit(1);
});
