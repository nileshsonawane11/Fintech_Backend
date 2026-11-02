// ============================================================================
// FinEdge Bank — site content: offers, branches and general FAQs.
//
// ILLUSTRATIVE DATA: offers, branch details and timelines in this file are
// original, fictional content created for this demonstration platform. They
// are not copied from any real bank. Product rates and fees live ONLY in
// products.js — offers below refer to products by slug and never restate a
// rate or fee figure, so the two files can never disagree.
// ============================================================================

import { BRAND } from './products.js';

// ---------------------------------------------------------------------------
// OFFERS — promotional layer only. `productSlug` links to products.js.
// ---------------------------------------------------------------------------

export const OFFERS = [
  {
    id: 'offer-travel-card-joining-waiver',
    title: 'Edge Voyage Card: joining fee credited back',
    category: 'Cards',
    productSlug: 'edge-voyage-credit',
    summary:
      'Apply for the Edge Voyage Card and spend ₹25,000 within the first 60 days — the joining fee is credited back to your card account in the next statement cycle.',
    terms: [
      'Valid for applications submitted on or before 31 December 2026',
      'Cashback of the joining fee appears as statement credit within 30 days of meeting the spend condition',
      'FinEdge Payroll Salary account holders are eligible without the spend condition',
    ],
    validTill: '2026-12-31',
    highlight: 'Joining fee back on ₹25,000 spends in 60 days',
  },
  {
    id: 'offer-home-loan-processing',
    title: 'Home loan processing fee at half price',
    category: 'Loans',
    productSlug: 'home-loan',
    summary:
      'Festive-season offer: 50% off the standard processing fee on FinEdge Home Loan applications, including balance transfers from other lenders.',
    terms: [
      'Valid for applications submitted on or before 31 January 2027',
      'The discount applies to the processing fee in the product schedule; taxes and third-party charges are unaffected',
      'One offer per application; cannot be combined with staff or payroll pricing',
    ],
    validTill: '2027-01-31',
    highlight: '50% off processing fee',
  },
  {
    id: 'offer-sip-first-year',
    title: 'Start a SIP: zero distribution charges for the first year',
    category: 'Investments',
    productSlug: 'systematic-investment-plan',
    summary:
      'New SIP registrations through FinEdge carry no distribution or transaction charge for the first 12 months. Investments remain market-linked — see the SIP product page for the full risk disclosure before you invest.',
    terms: [
      'Valid for SIPs registered on or before 31 March 2027',
      'AMC expense ratios and exit loads of the chosen scheme still apply, as per the scheme documents',
      'This offer does not change the risk profile of any scheme',
    ],
    validTill: '2027-03-31',
    highlight: 'Zero distribution charges, year one',
  },
  {
    id: 'offer-savings-welcome',
    title: 'New Everyday Savings account: ₹250 welcome credit',
    category: 'Accounts',
    productSlug: 'everyday-savings',
    summary:
      'Open an Everyday Savings Account online and make your first debit-card purchase of ₹2,000 or more within 45 days to receive a ₹250 welcome credit.',
    terms: [
      'Valid for accounts opened on or before 31 December 2026',
      'Welcome credit is paid within 15 days of the qualifying purchase',
      'One welcome credit per customer across all FinEdge accounts',
    ],
    validTill: '2026-12-31',
    highlight: '₹250 welcome credit',
  },
  {
    id: 'offer-gold-loan-appraisal',
    title: 'Gold loan: appraisal and valuation charges waived',
    category: 'Loans',
    productSlug: 'gold-loan',
    summary:
      'Branch gold-loan applications this quarter carry no separate appraisal or valuation charge — it is absorbed within the processing fee shown in the product schedule.',
    terms: [
      'Valid for applications submitted on or before 31 December 2026',
      'Applies at all FinEdge branches listed on this site',
      'Safe-custody and insurance terms of the loan agreement are unchanged',
    ],
    validTill: '2026-12-31',
    highlight: 'No separate valuation charge',
  },
  {
    id: 'offer-education-processing',
    title: 'Education loans up to ₹20 lakh: no processing fee',
    category: 'Loans',
    productSlug: 'education-loan',
    summary:
      'Supporting students this admission season: education loan applications up to ₹20 lakh carry no processing fee at all — this is already reflected in the product schedule.',
    terms: [
      'Valid for applications submitted on or before 28 February 2027',
      'Standard eligibility and co-applicant requirements of the product apply',
    ],
    validTill: '2027-02-28',
    highlight: 'Nil processing fee up to ₹20 lakh',
  },
];

/** Offers linked to one product slug (for product detail pages). */
export function getOffersForProduct(productSlug) {
  return OFFERS.filter((o) => o.productSlug === productSlug);
}

// ---------------------------------------------------------------------------
// BRANCHES — fictional demonstration branches in real Indian cities.
// IFSCs use the BRAND prefix from products.js (FEDG).
// ---------------------------------------------------------------------------

const ifsc = (n) => `${BRAND.ifscPrefix}000${n}`;

export const BRANCHES = [
  {
    id: 'branch-mumbai-andheri',
    name: 'Andheri West Branch',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Ground Floor, Crystal Arc, Veera Desai Road, Andheri West',
    pincode: '400053',
    ifsc: ifsc(1021),
    phone: '022 4890 2211',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Gold loan vault', 'Forex desk', 'Locker facility'],
  },
  {
    id: 'branch-delhi-cp',
    name: 'Connaught Place Branch',
    city: 'New Delhi',
    state: 'Delhi',
    address: '2nd Floor, Mercantile House, Kasturba Gandhi Marg, Connaught Place',
    pincode: '110001',
    ifsc: ifsc(2043),
    phone: '011 4890 3345',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Trade services', 'NRI desk', 'Locker facility'],
  },
  {
    id: 'branch-bengaluru-koramangala',
    name: 'Koramangala Branch',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'No. 418, 80 Feet Road, 4th Block, Koramangala',
    pincode: '560034',
    ifsc: ifsc(3077),
    phone: '080 4890 5519',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Startup & payroll desk', 'Wealth desk'],
  },
  {
    id: 'branch-pune-kothrud',
    name: 'Kothrud Branch',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Shop 3–5, Greenfield Plaza, Paud Road, Kothrud',
    pincode: '411038',
    ifsc: ifsc(4092),
    phone: '020 4890 6612',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Gold loan vault', 'Education loan desk'],
  },
  {
    id: 'branch-hyderabad-banjara',
    name: 'Banjara Hills Branch',
    city: 'Hyderabad',
    state: 'Telangana',
    address: '8-2-616, Road No. 11, Banjara Hills',
    pincode: '500034',
    ifsc: ifsc(5118),
    phone: '040 4890 7730',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Forex desk', 'Locker facility'],
  },
  {
    id: 'branch-chennai-anna-nagar',
    name: 'Anna Nagar Branch',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Plot 112, 2nd Avenue, Anna Nagar',
    pincode: '600040',
    ifsc: ifsc(6135),
    phone: '044 4890 8841',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'SSY & government schemes desk', 'Senior citizen desk'],
  },
  {
    id: 'branch-kolkata-salt-lake',
    name: 'Salt Lake Branch',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'DC 27, Sector I, Salt Lake City',
    pincode: '700064',
    ifsc: ifsc(7159),
    phone: '033 4890 9924',
    hours: 'Mon–Sat, 9:30 am – 4:30 pm',
    services: ['Accounts', 'Loans', 'Trade services', 'Locker facility'],
  },
];

// ---------------------------------------------------------------------------
// GENERAL FAQS — site-level questions (product-specific FAQs live with each
// product in products.js).
// ---------------------------------------------------------------------------

export const GENERAL_FAQS = [
  {
    q: 'Is FinEdge Bank a real bank?',
    a: 'No. FinEdge Bank is a demonstration brand built for an industry training project. Accounts, balances and transactions on this platform are simulated records — no real money is held, moved or invested.',
  },
  {
    q: 'How do I open an account?',
    a: 'Pick the account that fits you on the Accounts page, start the application, verify your mobile number, and submit your KYC documents. Your application appears in your account tracker, and a bank officer reviews it — on this platform you can watch it move through the staff queue in real time.',
  },
  {
    q: 'What documents do I need for KYC?',
    a: 'A PAN card and one address proof (Aadhaar, passport, driving licence or voter ID) cover most products. Loans and business accounts need additional income or business documents — each product page lists exactly what it requires.',
  },
  {
    q: 'How are transfer charges and limits handled?',
    a: 'Transfers between FinEdge accounts are instant in this simulation. External transfers are modelled on NEFT, IMPS and UPI rails and are labelled "simulated" wherever they appear, because this platform is not connected to real payment networks.',
  },
  {
    q: 'Is my data safe on this platform?',
    a: 'This demonstration runs entirely in your browser with locally stored demo data. Do not enter real passwords, real card numbers or real identity documents — use the demo accounts described in the project README.',
  },
  {
    q: 'How do I raise a complaint or a service request?',
    a: 'Once signed in, raise a support ticket from your account — it goes to the staff support queue and you can track its status. The Grievance Redressal page explains the escalation levels and illustrative response timelines.',
  },
  {
    q: 'Where can I see all rates and charges together?',
    a: 'The Rates & Charges section brings together the headline rates from every product, and the Schedule of Charges page lists service fees. Both are generated from the same product data, so they always match the product pages.',
  },
];
