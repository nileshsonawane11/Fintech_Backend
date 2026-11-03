import { describe, expect, it } from 'vitest';
import { ageOf, formatINR, formatSignedINR, maskAccount, maskPan, statusLabel } from './format.js';

describe('format helpers', () => {
  it('formats INR with Indian grouping and paise', () => {
    expect(formatINR(111420.55)).toBe('₹1,11,420.55');
    expect(formatINR(100000)).toBe('₹1,00,000.00');
  });
  it('renders missing money as an em dash, never a fabricated zero', () => {
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
  });
  it('signs ledger amounts', () => {
    expect(formatSignedINR(500)).toContain('+');
    expect(formatSignedINR(-250.5)).toContain('−');
  });
  it('masks account numbers and PANs', () => {
    expect(maskAccount('50100234567890')).toBe('•••• 7890');
    expect(maskPan('ABCDE1234F')).toBe('ABC••1234F');
  });
  it('humanises status enums', () => {
    expect(statusLabel('UNDER_REVIEW')).toBe('Under Review');
    expect(statusLabel(null)).toBe('—');
  });
  it('ages a case', () => {
    const now = new Date('2026-10-30T12:00:00Z');
    expect(ageOf('2026-10-28T06:00:00Z', now)).toBe('2d 06h');
  });
});
