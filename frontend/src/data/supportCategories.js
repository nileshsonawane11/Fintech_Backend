// Shared Support & Grievance Categories Mapping

export const SUPPORT_CATEGORIES = [
  { code: 'ACCOUNT_STATEMENTS', label: 'Account & Statements' },
  { code: 'PAYMENTS_TRANSFERS', label: 'Payments & Transfers' },
  { code: 'CARDS', label: 'Cards' },
  { code: 'LOANS', label: 'Loans' },
  { code: 'DIGITAL_BANKING', label: 'Digital Banking Access' },
  { code: 'CHARGES_FEES', label: 'Charges & Fees' },
  { code: 'STAFF_CONDUCT', label: 'Staff Conduct' },
  { code: 'PRIVACY_DATA', label: 'Privacy & Data' },
  { code: 'OTHER', label: 'Other' },
];

export const CATEGORY_MAP = Object.fromEntries(
  SUPPORT_CATEGORIES.map((c) => [c.code, c.label]),
);

export const LEGACY_CATEGORY_MAP = {
  'Payment Issue': 'Payments & Transfers',
  'PAYMENT_ISSUE': 'Payments & Transfers',
  'Card Dispute': 'Cards',
  'CARD_DISPUTE': 'Cards',
  'Account': 'Account & Statements',
  'ACCOUNT': 'Account & Statements',
  'KYC': 'Account & Statements',
  'KYC_QUERY': 'Account & Statements',
  'GENERAL_QUERY': 'Other',
  'GENERAL': 'Other',
};

/** Convert code or legacy string to human category label */
export function getCategoryLabel(category) {
  if (!category) return 'Other';
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  if (LEGACY_CATEGORY_MAP[category]) return LEGACY_CATEGORY_MAP[category];
  const found = SUPPORT_CATEGORIES.find(
    (c) => c.label.toLowerCase() === String(category).trim().toLowerCase(),
  );
  if (found) return found.label;
  return category;
}

/** Convert label or code to standardized category code */
export function getCategoryCode(category) {
  if (!category) return 'OTHER';
  const found = SUPPORT_CATEGORIES.find(
    (c) => c.label.toLowerCase() === String(category).trim().toLowerCase() || c.code === category,
  );
  if (found) return found.code;
  return 'OTHER';
}
