// Account statement PDF — generated entirely in the browser from the
// ledger data the account page already loaded. jsPDF is imported
// dynamically inside the function so it never enters the main bundle;
// only a customer who downloads a statement pays for those bytes.

import { formatDate, formatINR, maskAccount, statusLabel } from './format.js';

const MIDNIGHT = [10, 30, 53];
const PORCELAIN = [250, 248, 244];
const GOLD = [184, 147, 63];
const INK = [19, 26, 31];
const INK_SOFT = [87, 100, 110];
const LINE = [203, 211, 218];
const ROW_ALT = [246, 247, 249];

// jsPDF's built-in fonts have no ₹ glyph — render amounts as "Rs. 1,000.00".
const money = (v) => formatINR(v).replace('₹', 'Rs. ');

const signed = (t) => (t.type === 'CREDIT' ? 1 : -1) * (Number(t.amount) || 0);

/**
 * Build and download a statement PDF for one account.
 * `transactions` may arrive in any order; the statement is chronological.
 */
export async function downloadStatementPdf({ account, transactions, customerName }) {
  if (!account) throw new Error('Account is required to generate a statement.');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const rows = [...(transactions || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const first = rows[0];
  const last = rows[rows.length - 1];
  const opening = first && typeof first.balance === 'number' ? first.balance - signed(first) : null;
  const closing = last && typeof last.balance === 'number' ? last.balance : null;
  const totalDebit = rows.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCredit = rows.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // ---- Header band ----
  doc.setFillColor(...MIDNIGHT);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 26, 210, 0.8, 'F');
  doc.setTextColor(...PORCELAIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FinEdge Bank', 15, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(215, 225, 236);
  doc.text('Account Statement', 15, 19.5);

  // ---- Account summary ----
  let y = 36;
  doc.setTextColor(...INK);
  const line = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK_SOFT);
    doc.text(label.toUpperCase(), 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(String(value), 62, y);
    y += 5.6;
  };
  if (customerName) line('Account holder', customerName);
  line('Account number', `${maskAccount(account.accountNumber)} (${account.accountNumber || '—'})`);
  line('Account type', account.productName || statusLabel(account.type));
  if (account.ifsc) line('IFSC', account.ifsc);
  if (first && last) line('Statement period', `${formatDate(first.date)} to ${formatDate(last.date)}`);
  if (opening !== null) line('Opening balance', money(opening));
  if (closing !== null) line('Closing balance', money(closing));

  // ---- Transactions table ----
  y += 4;
  const cols = { date: 15, desc: 40, ref: 104, debit: 156, credit: 176, balance: 195 };
  const tableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_SOFT);
    doc.text('DATE', cols.date, y);
    doc.text('DESCRIPTION', cols.desc, y);
    doc.text('REFERENCE', cols.ref, y);
    doc.text('DEBIT', cols.debit, y, { align: 'right' });
    doc.text('CREDIT', cols.credit, y, { align: 'right' });
    doc.text('BALANCE', cols.balance, y, { align: 'right' });
    y += 1.8;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 5;
  };
  tableHeader();

  doc.setFontSize(9);
  rows.forEach((t, i) => {
    const descLines = doc.splitTextToSize(String(t.description || '—'), 60);
    const rowH = Math.max(1, descLines.length) * 4.1 + 1.6;
    if (y + rowH > 274) {
      doc.addPage();
      y = 18;
      tableHeader();
      doc.setFontSize(9);
    }
    if (i % 2 === 1) {
      doc.setFillColor(...ROW_ALT);
      doc.rect(15, y - 3.4, 180, rowH, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(formatDate(t.date), cols.date, y);
    doc.text(descLines, cols.desc, y);
    doc.setTextColor(...INK_SOFT);
    doc.text(String(t.reference || '—'), cols.ref, y);
    doc.setTextColor(...INK);
    if (t.type === 'DEBIT') doc.text(money(t.amount), cols.debit, y, { align: 'right' });
    if (t.type === 'CREDIT') doc.text(money(t.amount), cols.credit, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(typeof t.balance === 'number' ? money(t.balance) : '—', cols.balance, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH;
  });

  // ---- Totals ----
  y += 2;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Total debits: ${money(totalDebit)}`, 15, y);
  doc.text(`Total credits: ${money(totalCredit)}`, 80, y);
  if (closing !== null) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Closing balance: ${money(closing)}`, 195, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  // ---- Footer on every page (stamped last, once the page count is known) ----
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.line(15, 284, 195, 284);
    doc.setFontSize(7.5);
    doc.setTextColor(...INK_SOFT);
    doc.text('Generated from the FinEdge Bank demonstration platform — not a real bank statement.', 15, 289);
    doc.text(`Page ${p} of ${pageCount}`, 195, 289, { align: 'right' });
  }

  doc.save(`finedge-statement-${account.accountNumber || 'account'}.pdf`);
}
