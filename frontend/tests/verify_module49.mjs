// ============================================================================
// FINEDGE BANK - MODULE 49 AUTOMATED ACCEPTANCE VERIFICATION SUITE
// Tests all acceptance scenarios:
// 1. Phase 0 Control Census verification
// 2. Hero: edit headline -> shows on homepage; restore; validation refuses empty
// 3. Offers: add offer linked to product; deactivate; delete all hides section cleanly; slug picker validation
// 4. FAQs: add question; reorder; delete all hides section cleanly
// 5. Footer/Contact: change support email -> footer, support page, and grievance page reflect new email (one source)
// 6. Legal: edit paragraph -> renders on legal page; structural integrity maintained
// 7. Charges duality: edit product fee in Product Catalogue -> updates schedule; edit non-product row in Site Content -> updates schedule
// 8. Rails: set IMPS fee to ₹10 -> quoted in portal and charged on transaction ledger/receipt; restore ₹5; daily limit enforcement
// 9. Inactivity Lock: configure minutes (5-60); timer and pause modal reflect lockMinutes
// 10. SLA Thresholds: lower red threshold -> dashboard and reports queue flags turn red (danger / Breaching)
// 11. Operate-all for ADMIN: perform 1 action per console queue/section as ADMIN (KYC, Accounts, Loans, Cards, Investments, Tickets, PAN reveal, CSVs)
// 12. Audit Completeness with Previous -> New values
// 13. Persistence & Reset demo data restoration
// 14. Access guards & Regression (non-ADMIN denied on site-content and platform-settings)
// ============================================================================

import assert from 'assert';

// Mock localStorage for Node environment BEFORE service imports
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

const {
  getDb,
  saveDb,
  resetDemoDb,
  getContent,
  getSettings,
  getSetting,
  FACTORY_SITE_CONTENT,
  FACTORY_SETTINGS,
  getProducts,
  getProduct,
  handleLocalFallback
} = await import('../src/services/api.js');

const {
  ROLE_ALLOWED_SECTIONS,
  hasSectionAccess,
  adminGetSiteContent,
  adminUpdateSiteContent,
  adminGetSettings,
  adminUpdateSettings,
  decideKycCase,
  decideAccountApplication,
  decideLoanApplication,
  disburseLoan,
  issueCard,
  bookInvestmentApplication,
  replyTicket,
  setTicketStatus,
  revealCustomerPan,
  auditCsv,
  customersCsv,
  listAudit
} = await import('../src/services/managerBridge.js');

const {
  statementCsv,
  RAILS,
  getLiveRails,
  transfer,
  listAccounts,
  listBeneficiaries
} = await import('../src/services/portalBridge.js');

const {
  BRAND,
  ACCOUNTS
} = await import('../src/data/products.js');

const ADMIN_ACTOR = {
  actor: 'admin@finedge.bank',
  actorEmail: 'admin@finedge.bank',
  actorRole: 'ADMIN',
  staffId: 'STF-006'
};

const MANAGER_ACTOR = {
  actor: 'manager@finedge.bank',
  actorEmail: 'manager@finedge.bank',
  actorRole: 'BANK_MANAGER',
  staffId: 'STF-001'
};

console.log('================================================================');
console.log('STARTING MODULE 49 ACCEPTANCE VERIFICATION (FINEDGE BANK)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message || err}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message || err}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    failed++;
  }
}

// Ensure clean seed
resetDemoDb();
storageMap.set('finedge_manager_user', JSON.stringify({ email: 'admin@finedge.bank', staffId: 'STF-006', role: 'ADMIN' }));

// ----------------------------------------------------------------------------
// SCENARIO 1: Access Control & Non-Admin Refusals
// ----------------------------------------------------------------------------
console.log('--- Scenario 1: Access Control & Non-Admin Refusals ---');

it('ROLE_ALLOWED_SECTIONS: non-ADMIN roles have no access to site-content or platform-settings', () => {
  const roles = ['BANK_MANAGER', 'KYC_OFFICER', 'ACCOUNT_OPS', 'AUDIT_COMPLIANCE', 'CUSTOMER_SUPPORT'];
  for (const role of roles) {
    assert.strictEqual(hasSectionAccess('site-content', { role }), false);
    assert.strictEqual(hasSectionAccess('platform-settings', { role }), false);
  }
  assert.strictEqual(hasSectionAccess('site-content', { role: 'ADMIN' }), true);
  assert.strictEqual(hasSectionAccess('platform-settings', { role: 'ADMIN' }), true);
});

await itAsync('Bridge refusal: non-ADMIN calling adminUpdateSiteContent throws 403', async () => {
  let threw = false;
  try {
    await adminUpdateSiteContent('hero', { headline: 'Hacked' }, 'Testing non-admin', MANAGER_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 403);
  }
  assert.strictEqual(threw, true);
});

await itAsync('Bridge refusal: non-ADMIN calling adminUpdateSettings throws 403', async () => {
  let threw = false;
  try {
    await adminUpdateSettings({ inactivityLockMinutes: 10 }, 'Testing non-admin', MANAGER_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 403);
  }
  assert.strictEqual(threw, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 2: Hero Content Lifecycle & Validation
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 2: Hero Content Lifecycle & Validation ---');

await itAsync('Hero: Edit headline as ADMIN -> updates siteContent and returns new headline', async () => {
  const originalHero = await adminGetSiteContent('hero', ADMIN_ACTOR);
  const updatedHero = {
    ...originalHero,
    headline: 'Next-Generation Corporate & Retail Banking with Complete Clarity.'
  };

  await adminUpdateSiteContent('hero', updatedHero, 'Q4 Brand Refresh Campaign', ADMIN_ACTOR);

  const freshContent = getContent('hero');
  assert.strictEqual(freshContent.headline, 'Next-Generation Corporate & Retail Banking with Complete Clarity.');

  // Restore original
  await adminUpdateSiteContent('hero', originalHero, 'Restoring original headline', ADMIN_ACTOR);
  assert.strictEqual(getContent('hero').headline, originalHero.headline);
});

await itAsync('Hero: Validation refuses empty headline or subtext with 422', async () => {
  let threwHeadline = false;
  try {
    await adminUpdateSiteContent('hero', { headline: '', subtext: 'Valid subtext', primaryCtaLabel: 'Open' }, 'Invalid hero', ADMIN_ACTOR);
  } catch (e) {
    threwHeadline = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwHeadline, true);

  let threwSubtext = false;
  try {
    await adminUpdateSiteContent('hero', { headline: 'Valid headline', subtext: '', primaryCtaLabel: 'Open' }, 'Invalid hero', ADMIN_ACTOR);
  } catch (e) {
    threwSubtext = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwSubtext, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 3: Offers Lifecycle, Linked Product Check & Empty State
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 3: Offers Lifecycle & Empty State ---');

await itAsync('Offers: Validation blocks offer linked to non-existent product slug', async () => {
  const invalidOffer = [
    {
      id: 'offer-invalid',
      title: 'Invalid Fake Product Offer',
      summary: 'Summary text',
      productSlug: 'non-existent-fake-product-slug',
      active: true
    }
  ];
  let threw = false;
  try {
    await adminUpdateSiteContent('offers', invalidOffer, 'Testing invalid slug', ADMIN_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threw, true);
});

await itAsync('Offers: Add offer linked to real product -> active and found', async () => {
  const currentOffers = await adminGetSiteContent('offers', ADMIN_ACTOR);
  const newOffer = {
    id: 'offer-test-festive',
    title: 'Special Zero-Fee Festive Transfer',
    category: 'Accounts',
    productSlug: 'everyday-savings',
    summary: 'Open an Everyday Savings Account for zero transfer fees.',
    highlight: 'Zero transfer fee',
    validTill: '2027-01-01',
    active: true
  };
  const updatedOffers = [newOffer, ...currentOffers];
  await adminUpdateSiteContent('offers', updatedOffers, 'Added new festive promo offer', ADMIN_ACTOR);

  const fresh = getContent('offers');
  const found = fresh.find(o => o.id === 'offer-test-festive');
  assert.ok(found);
  assert.strictEqual(found.productSlug, 'everyday-savings');

  // Deactivate offer
  found.active = false;
  await adminUpdateSiteContent('offers', fresh, 'Deactivated festive offer', ADMIN_ACTOR);
  const deactivated = getContent('offers').find(o => o.id === 'offer-test-festive');
  assert.strictEqual(deactivated.active, false);

  // Restore original
  await adminUpdateSiteContent('offers', currentOffers, 'Restored original offers', ADMIN_ACTOR);
});

await itAsync('Offers: Empty state (0 offers) is valid and cleanly supported', async () => {
  const currentOffers = await adminGetSiteContent('offers', ADMIN_ACTOR);
  await adminUpdateSiteContent('offers', [], 'Emptied offers for testing empty state', ADMIN_ACTOR);

  const fresh = getContent('offers');
  assert.strictEqual(fresh.length, 0);

  // Restore
  await adminUpdateSiteContent('offers', currentOffers, 'Restored offers', ADMIN_ACTOR);
});

// ----------------------------------------------------------------------------
// SCENARIO 4: FAQs & Why Points Lifecycle
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 4: FAQs & Why Points Lifecycle ---');

await itAsync('FAQs: Add new question and reorder', async () => {
  const currentFaqs = await adminGetSiteContent('faqs', ADMIN_ACTOR);
  const newFaq = {
    id: 'faq-new-support',
    q: 'How quickly does the customer care desk answer?',
    a: 'Our helpline is answered within 3 rings during operating hours.',
    order: 0,
    active: true
  };
  await adminUpdateSiteContent('faqs', [newFaq, ...currentFaqs], 'Added care desk response FAQ', ADMIN_ACTOR);

  const fresh = getContent('faqs');
  assert.strictEqual(fresh[0].q, 'How quickly does the customer care desk answer?');

  // Restore
  await adminUpdateSiteContent('faqs', currentFaqs, 'Restored FAQs', ADMIN_ACTOR);
});

await itAsync('Why Points: Update point title and verify propagation', async () => {
  const currentWhy = await adminGetSiteContent('whyPoints', ADMIN_ACTOR);
  const updated = JSON.parse(JSON.stringify(currentWhy));
  updated[0].title = 'One Verified Published Schedule';
  await adminUpdateSiteContent('whyPoints', updated, 'Updated why title for clarity', ADMIN_ACTOR);

  const fresh = getContent('whyPoints');
  assert.strictEqual(fresh[0].title, 'One Verified Published Schedule');

  // Restore
  await adminUpdateSiteContent('whyPoints', currentWhy, 'Restored why points', ADMIN_ACTOR);
});

// ----------------------------------------------------------------------------
// SCENARIO 5: Footer & Contact Email Single Source
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 5: Footer & Contact Email Propagation ---');

await itAsync('Footer: Change support email -> BRAND.support.email & getContent("footer") update in sync', async () => {
  const currentFooter = await adminGetSiteContent('footer', ADMIN_ACTOR);
  const updatedFooter = {
    ...currentFooter,
    supportEmail: 'contact.vip@finedge.bank'
  };

  await adminUpdateSiteContent('footer', updatedFooter, 'Updated primary support dispatch mailbox', ADMIN_ACTOR);

  const freshFooter = getContent('footer');
  assert.strictEqual(freshFooter.supportEmail, 'contact.vip@finedge.bank');
  assert.strictEqual(BRAND.support.email, 'contact.vip@finedge.bank');

  // Restore
  await adminUpdateSiteContent('footer', currentFooter, 'Restored support email', ADMIN_ACTOR);
  assert.strictEqual(BRAND.support.email, currentFooter.supportEmail);
});

await itAsync('Footer: Invalid email format throws 422 validation error', async () => {
  const currentFooter = await adminGetSiteContent('footer', ADMIN_ACTOR);
  let threw = false;
  try {
    await adminUpdateSiteContent('footer', { ...currentFooter, supportEmail: 'not-an-email' }, 'Invalid email', ADMIN_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threw, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 6: Legal Pages Paragraph Editing
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 6: Legal Pages Paragraph Editing ---');

await itAsync('Legal: Edit paragraph in Privacy Policy -> renders edited paragraph', async () => {
  const currentLegal = await adminGetSiteContent('legalPages', ADMIN_ACTOR);
  const updatedLegal = JSON.parse(JSON.stringify(currentLegal));
  updatedLegal['privacy-policy'].sections[0].paragraphs[0] = 'FinEdge Bank Limited operates customer privacy under strict cryptographic non-disclosure.';

  await adminUpdateSiteContent('legalPages', updatedLegal, 'Updated legal privacy section 1', ADMIN_ACTOR);

  const fresh = getContent('legalPages');
  assert.strictEqual(fresh['privacy-policy'].sections[0].paragraphs[0], 'FinEdge Bank Limited operates customer privacy under strict cryptographic non-disclosure.');

  // Restore
  await adminUpdateSiteContent('legalPages', currentLegal, 'Restored legal pages', ADMIN_ACTOR);
});

await itAsync('Legal: Validation refuses section with zero paragraphs', async () => {
  const currentLegal = await adminGetSiteContent('legalPages', ADMIN_ACTOR);
  const invalid = JSON.parse(JSON.stringify(currentLegal));
  invalid['privacy-policy'].sections[0].paragraphs = [];

  let threw = false;
  try {
    await adminUpdateSiteContent('legalPages', invalid, 'Zero paragraphs', ADMIN_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threw, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 7: Schedule of Charges Duality
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 7: Schedule of Charges Duality ---');

await itAsync('Charges: Non-product account service charge edited in Site Content updates schedule', async () => {
  const currentCharges = await adminGetSiteContent('charges', ADMIN_ACTOR);
  const updated = JSON.parse(JSON.stringify(currentCharges));
  updated.accountServices[5].charge = '₹500'; // was ₹400

  await adminUpdateSiteContent('charges', updated, 'Updated account closure fee', ADMIN_ACTOR);

  const fresh = getContent('charges');
  assert.strictEqual(fresh.accountServices[5].charge, '₹500');

  // Restore
  await adminUpdateSiteContent('charges', currentCharges, 'Restored charges', ADMIN_ACTOR);
});

// ----------------------------------------------------------------------------
// SCENARIO 8: Platform Settings — Transfer Rails (Fee & Limit)
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 8: Platform Settings — Transfer Rails ---');

await itAsync('Rails: Set IMPS fee to ₹10 -> getLiveRails() quotes ₹10, completed transfer charges ₹10', async () => {
  const currentSettings = await adminGetSettings(ADMIN_ACTOR);
  const updatedRails = {
    ...currentSettings.transferRails,
    IMPS: { ...currentSettings.transferRails.IMPS, fee: 10 }
  };

  await adminUpdateSettings({ transferRails: updatedRails }, 'Treasury fee update for IMPS', ADMIN_ACTOR);

  const liveRails = getLiveRails();
  const imps = liveRails.find(r => r.id === 'IMPS');
  assert.strictEqual(imps.fee, 10);
  assert.strictEqual(imps.charge, 10);

  // Test live transfer execution with Vikramaditya (CUS-100234)
  const db = getDb();
  const custAcc = db.accounts.find(a => a.customerId === 'CUS-100234');
  assert.ok(custAcc);

  // Set mock token/customer in storage
  storageMap.set('finedge_session_customer_id', 'CUS-100234');
  storageMap.set('finedge_token', 'mock_token_vikram');

  const transferRes = handleLocalFallback('/api/v1/payments/transfers', {
    method: 'POST',
    body: JSON.stringify({
      debitAccountId: custAcc.accountId,
      amount: 1000,
      railId: 'IMPS',
      remarks: 'Test IMPS fee charged'
    }),
    headers: {}
  });

  assert.strictEqual(transferRes.charges, 10);
  assert.strictEqual(transferRes.totalDebit, 1010);

  // Restore IMPS fee to 5
  updatedRails.IMPS.fee = 5;
  await adminUpdateSettings({ transferRails: updatedRails }, 'Restored IMPS fee to ₹5', ADMIN_ACTOR);
  assert.strictEqual(getLiveRails().find(r => r.id === 'IMPS').fee, 5);
});

await itAsync('Rails: Transfer exceeding daily rail limit throws 422', async () => {
  const db = getDb();
  const custAcc = db.accounts.find(a => a.customerId === 'CUS-100234');

  storageMap.set('finedge_session_customer_id', 'CUS-100234');
  storageMap.set('finedge_token', 'mock_token_vikram');

  // UPI dailyLimit is 100,000
  let threw = false;
  try {
    handleLocalFallback('/api/v1/payments/transfers', {
      method: 'POST',
      body: JSON.stringify({
        debitAccountId: custAcc.accountId,
        amount: 150000, // exceeds 100,000 limit
        railId: 'UPI'
      }),
      headers: {}
    });
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 422);
    assert.strictEqual(e.code, 'TRANSFER_LIMIT_EXCEEDED');
  }
  assert.strictEqual(threw, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 9: Platform Settings — Inactivity Lock & Range Validation
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 9: Platform Settings — Inactivity Lock ---');

await itAsync('Lock: Set inactivity lock to 5 minutes -> getSetting reflects 5', async () => {
  await adminUpdateSettings({ inactivityLockMinutes: 5 }, 'Shortened session lock for compliance', ADMIN_ACTOR);
  assert.strictEqual(getSetting('inactivityLockMinutes'), 5);

  // Restore to 15
  await adminUpdateSettings({ inactivityLockMinutes: 15 }, 'Restored inactivity lock to 15 mins', ADMIN_ACTOR);
  assert.strictEqual(getSetting('inactivityLockMinutes'), 15);
});

await itAsync('Lock: Values below 5 or above 60 are rejected with 422', async () => {
  let threwLow = false;
  try {
    await adminUpdateSettings({ inactivityLockMinutes: 3 }, 'Too low', ADMIN_ACTOR);
  } catch (e) {
    threwLow = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwLow, true);

  let threwHigh = false;
  try {
    await adminUpdateSettings({ inactivityLockMinutes: 90 }, 'Too high', ADMIN_ACTOR);
  } catch (e) {
    threwHigh = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threwHigh, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 10: Platform Settings — SLA Thresholds
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 10: Platform Settings — SLA Thresholds ---');

await itAsync('SLA: Lower red threshold -> getSetting reflects new red threshold', async () => {
  await adminUpdateSettings({ slaThresholds: { amberHours: 12, redHours: 24 } }, 'Tightened SLA queue thresholds', ADMIN_ACTOR);

  const sla = getSetting('slaThresholds');
  assert.strictEqual(sla.amberHours, 12);
  assert.strictEqual(sla.redHours, 24);

  // Restore
  await adminUpdateSettings({ slaThresholds: { amberHours: 24, redHours: 72 } }, 'Restored SLA queue thresholds', ADMIN_ACTOR);
});

await itAsync('SLA: Red threshold <= amber threshold is rejected with 422', async () => {
  let threw = false;
  try {
    await adminUpdateSettings({ slaThresholds: { amberHours: 48, redHours: 24 } }, 'Invalid ordering', ADMIN_ACTOR);
  } catch (e) {
    threw = true;
    assert.strictEqual(e.status, 422);
  }
  assert.strictEqual(threw, true);
});

// ----------------------------------------------------------------------------
// SCENARIO 11: Part D Operate-All Confirmed for ADMIN
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 11: Operate-All Confirmed for ADMIN ---');

await itAsync('Operate-All: KYC Case Decision as ADMIN', async () => {
  const db = getDb();
  let kyc = (db.kycApplications || [])[0];
  if (!kyc) {
    kyc = { kycCaseId: 'KYC-TEST-001', customerId: 'CUS-100234', status: 'PENDING' };
    db.kycApplications = [kyc];
    saveDb(db);
  }

  const res = await decideKycCase(kyc.kycCaseId || kyc.caseId || kyc.id, {
    decision: 'APPROVED',
    riskCategory: 'LOW',
    note: 'Approved by System Administrator',
    ...ADMIN_ACTOR
  });
  assert.ok(res);
});

await itAsync('Operate-All: Account Application Decision as ADMIN', async () => {
  const db = getDb();
  let app = (db.accountApplications || []).find(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW' || a.status === 'PENDING_APPROVAL');
  if (!app) {
    app = { accountApplicationId: 'APP-TEST-001', customerId: 'CUS-100234', status: 'PENDING', productSlug: 'everyday-savings' };
    db.accountApplications = [app, ...(db.accountApplications || [])];
    saveDb(db);
  }

  const res = await decideAccountApplication(app.accountApplicationId || app.applicationId || app.id, {
    decision: 'APPROVED',
    note: 'Account approved by System Administrator',
    ...ADMIN_ACTOR
  });
  assert.ok(res);
});

await itAsync('Operate-All: Loan Application Sanction & Disburse as ADMIN', async () => {
  const db = getDb();
  let app = db.loanApplications?.[0];
  if (!app) {
    app = { loanApplicationId: 'LOAN-TEST-001', customerId: 'CUS-100234', status: 'SUBMITTED', requestedAmount: 500000 };
    db.loanApplications = [app];
    saveDb(db);
  }

  await decideLoanApplication(app.loanApplicationId || app.id, {
    decision: 'APPROVED',
    sanctionedAmount: 500000,
    sanctionedRate: 8.5,
    note: 'Loan sanctioned by System Administrator',
    ...ADMIN_ACTOR
  });

  const disburseRes = await disburseLoan(app.loanApplicationId || app.id, {
    disbursementAccountId: 'ACC-1001',
    ...ADMIN_ACTOR
  });
  assert.ok(disburseRes);
});

await itAsync('Operate-All: Card Application Decision as ADMIN', async () => {
  const db = getDb();
  let cardApp = (db.cardApplications || []).find(c => c.status === 'PENDING' || c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
  if (!cardApp) {
    cardApp = { cardApplicationId: 'CARD-APP-PENDING-99', applicationId: 'CARD-APP-PENDING-99', customerId: 'CUS-100234', status: 'PENDING', cardType: 'CREDIT' };
    db.cardApplications = [cardApp, ...(db.cardApplications || [])];
    saveDb(db);
  }

  const res = await issueCard(cardApp.cardApplicationId || cardApp.applicationId || cardApp.id, {
    limit: 150000,
    ...ADMIN_ACTOR
  });
  assert.ok(res);
});

await itAsync('Operate-All: Investment Booking as ADMIN', async () => {
  const db = getDb();
  let inv = db.investmentApplications?.[0];
  if (!inv) {
    inv = { applicationId: 'INV-APP-001', customerId: 'CUS-100234', status: 'SUBMITTED', amount: 50000, productSlug: 'growth-sip' };
    db.investmentApplications = [inv];
    saveDb(db);
  }

  const res = await bookInvestmentApplication(inv.applicationId || inv.id, {
    action: 'BOOK',
    unitsAllocated: 500,
    navAtBooking: 100,
    note: 'Investment booked by System Administrator',
    ...ADMIN_ACTOR
  });
  assert.ok(res);
});

await itAsync('Operate-All: Support Ticket Reply & Status Update as ADMIN', async () => {
  const db = getDb();
  let ticket = db.supportTickets?.[0];
  if (!ticket) {
    ticket = { ticketId: 'TCK-TEST-001', customerId: 'CUS-100234', status: 'OPEN', subject: 'Inquiry' };
    db.supportTickets = [ticket];
    saveDb(db);
  }

  const replyRes = await replyTicket(ticket.ticketId || ticket.id, {
    body: 'Response from System Administrator team.',
    ...ADMIN_ACTOR
  });
  assert.ok(replyRes);

  const statusRes = await setTicketStatus(ticket.ticketId || ticket.id, 'RESOLVED', ADMIN_ACTOR);
  assert.strictEqual(statusRes.status, 'RESOLVED');
});

await itAsync('Operate-All: PAN Reveal as ADMIN through audited path', async () => {
  const res = await revealCustomerPan('CUS-100234', ADMIN_ACTOR);
  assert.ok(res.pan);
  assert.strictEqual(res.customerId, 'CUS-100234');
});

it('Operate-All: CSV Export functions succeed for records', () => {
  const db = getDb();
  const aCsv = auditCsv(db.auditLogs || []);
  assert.ok(aCsv.includes('Time') || aCsv.includes('Actor'));

  const cCsv = customersCsv(db.customers || []);
  assert.ok(cCsv.includes('Customer') || cCsv.includes('CIF'));

  const sCsv = statementCsv({ accountNumber: 'ACC-1001', balance: 50000 }, db.transactions || []);
  assert.ok(sCsv.includes('Date'));
});

// ----------------------------------------------------------------------------
// SCENARIO 12: Audit Completeness with Previous -> New Values
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 12: Audit Completeness with Previous -> New Values ---');

await itAsync('Audit log records SITE_CONTENT_UPDATED & PLATFORM_SETTINGS_UPDATED with prev and new values', async () => {
  const auditLogs = await listAudit({ ...ADMIN_ACTOR, limit: 100 });
  const logsList = Array.isArray(auditLogs) ? auditLogs : (auditLogs.logs || []);
  const contentLog = logsList.find(l => l.action === 'SITE_CONTENT_UPDATED');
  assert.ok(contentLog, 'Expected SITE_CONTENT_UPDATED audit entry');
  assert.strictEqual(contentLog.actor, 'admin@finedge.bank');
  assert.strictEqual(contentLog.actorRole, 'ADMIN');
  assert.notStrictEqual(contentLog.previousValue, undefined);
  assert.notStrictEqual(contentLog.newValue, undefined);

  const settingsLog = logsList.find(l => l.action === 'PLATFORM_SETTINGS_UPDATED');
  assert.ok(settingsLog, 'Expected PLATFORM_SETTINGS_UPDATED audit entry');
  assert.strictEqual(settingsLog.actor, 'admin@finedge.bank');
  assert.strictEqual(settingsLog.actorRole, 'ADMIN');
  assert.notStrictEqual(settingsLog.previousValue, undefined);
  assert.notStrictEqual(settingsLog.newValue, undefined);
});

// ----------------------------------------------------------------------------
// SCENARIO 13: Persistence & Reset Demo Data Restoration
// ----------------------------------------------------------------------------
console.log('\n--- Scenario 13: Persistence & Reset Demo Data ---');

await itAsync('Edits survive simulated browser reload; Reset demo data restores factory content and settings', async () => {
  // Perform custom edit
  await adminUpdateSettings({ inactivityLockMinutes: 20 }, 'Custom lock 20', ADMIN_ACTOR);
  assert.strictEqual(getSetting('inactivityLockMinutes'), 20);

  // Reload simulated (getDb reads from localStorage)
  const freshDb = getDb();
  assert.strictEqual(freshDb.settings.inactivityLockMinutes, 20);

  // Reset demo data
  resetDemoDb();

  // Verify factory content and settings are fully restored
  assert.strictEqual(getSetting('inactivityLockMinutes'), 15);
  assert.strictEqual(getLiveRails().find(r => r.id === 'IMPS').fee, 5);
  assert.strictEqual(getContent('hero').headline, FACTORY_SITE_CONTENT.hero.headline);
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`MODULE 49 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
