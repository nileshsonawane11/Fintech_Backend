import React, { useState, useEffect } from 'react';
import {
  ScrollText, Landmark, TrendingUp, Sprout, ShieldCheck,
  AlertTriangle, Check, Info, Calendar, Percent, Shield
} from 'lucide-react';
import { calculateFD, calculateRD, calculateSIP, calculateSSY } from '../../lib/finance.js';
import { FD, RD, SIP, SSY, RATE_DISCLAIMER } from '../../data/products.js';
import { formatINR, formatINRWhole } from '../../lib/format.js';
import { Badge } from '../ui.jsx';
import { getMyProfile } from '../../services/portalBridge.js';

function calculateAge(dobString) {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function maskPan(pan) {
  if (!pan || typeof pan !== 'string' || pan.length < 10) return 'PAN on file';
  return `${pan.slice(0, 5)}••••${pan.slice(-1)}`;
}

export const InvestmentFormFields = ({
  product,
  formData,
  handleChange,
  errors,
  user,
  accounts = [],
  isExpressMode,
  isFD,
  isRD,
  isSIP,
  isSSY,
}) => {
  const [customerRecord, setCustomerRecord] = useState(null);

  useEffect(() => {
    if (user && isExpressMode) {
      getMyProfile(user.customerId).then(res => {
        if (res?.customer) setCustomerRecord(res.customer);
      }).catch(() => {});
    }
  }, [isExpressMode, user]);

  const applicantAge = formData.dob ? calculateAge(formData.dob) : null;
  const isSenior = isFD && applicantAge !== null && applicantAge >= 60;

  // FD derived calculations
  const fdBand = isFD
    ? (product?.rateGrid || []).find((r) => r.tenure === formData.fdTenureBand) || product?.rateGrid?.[4] || null
    : null;
  const fdRate = fdBand ? (isSenior ? fdBand.senior : fdBand.general) : 6.95;
  const fdNumAmount = Number(formData.fdDepositAmount) || 0;
  const fdTenureMonths = fdBand?.tenure === '7 – 45 days' ? 1
    : fdBand?.tenure === '46 – 179 days' ? 4
    : fdBand?.tenure === '180 – 364 days' ? 9
    : fdBand?.tenure === '1 – 2 years' ? 24
    : fdBand?.tenure === '2 – 3 years' ? 36
    : fdBand?.tenure === '3 – 5 years' ? 48
    : 60;

  let fdResult = null;
  if (fdNumAmount > 0) {
    try {
      fdResult = calculateFD({ principal: fdNumAmount, annualRatePct: fdRate, tenureMonths: fdTenureMonths });
    } catch {
      fdResult = null;
    }
  }

  // Indicative payout for FD regular payout options
  const fdIndicativeMonthly = fdNumAmount > 0 ? (fdNumAmount * (fdRate / 100)) / 12 : 0;
  const fdIndicativeQuarterly = fdNumAmount > 0 ? (fdNumAmount * (fdRate / 100)) / 4 : 0;

  // RD derived calculations
  const rdBand = isRD
    ? (product?.rateBands || []).find((r) => r.tenure === formData.rdTenureBand) || product?.rateBands?.[2] || null
    : null;
  const rdRate = rdBand ? (rdBand.rate ?? rdBand.general ?? 6.55) : 6.55;
  const rdNumAmount = Number(formData.rdMonthlyAmount) || 0;
  const rdTenureMonths = rdBand?.tenure === '6 – 12 months' ? 12
    : rdBand?.tenure === '13 – 24 months' ? 24
    : rdBand?.tenure === '25 – 60 months' ? 60
    : 120;

  let rdResult = null;
  if (rdNumAmount > 0) {
    try {
      rdResult = calculateRD({ monthlyDeposit: rdNumAmount, annualRatePct: rdRate, tenureMonths: rdTenureMonths });
    } catch {
      rdResult = null;
    }
  }

  // SIP derived calculations
  const sipNumAmount = Number(formData.sipMonthlyAmount) || 0;
  const sipNumYears = Number(formData.sipDurationYears) || 10;
  const sipReturnPct = Number(formData.sipAssumedReturn) || 10;
  const selectedSipCategory = (product?.fundCategories || []).find(
    (c) => c.name === formData.sipFundCategory
  ) || product?.fundCategories?.[0] || { name: 'Large-cap equity', riskLevel: 'Moderate to High' };

  let sipResult = null;
  if (sipNumAmount > 0) {
    try {
      sipResult = calculateSIP({
        monthlyInvestment: sipNumAmount,
        expectedReturnPct: sipReturnPct,
        tenureMonths: sipNumYears * 12,
      });
    } catch {
      sipResult = null;
    }
  }

  // SSY derived calculations
  const ssyNumAmount = Number(formData.ssyAnnualDeposit) || 0;
  let ssyResult = null;
  if (ssyNumAmount > 0) {
    try {
      ssyResult = calculateSSY({
        annualDeposit: ssyNumAmount,
        annualRatePct: product?.rate || 8.05,
      });
    } catch {
      ssyResult = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. APPLICANT IDENTITY (EXPRESS VS LOGGED-OUT APPLICATION)     */}
      {/* ------------------------------------------------------------- */}
      {(user && isExpressMode && (customerRecord || user)) ? (
        <div className="rounded-xl border border-midnight-200 bg-midnight-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-midnight-800">
              Customer Identity (Session Verified)
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded border border-success-600/20">
              <ShieldCheck className="h-3.5 w-3.5" /> KYC On File
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-ink-500">Applicant Name</span>
              <p className="font-semibold text-midnight-950 mt-0.5">{customerRecord?.fullName || user?.fullName || user?.name || 'Customer'}</p>
            </div>
            <div>
              <span className="text-ink-500">Permanent Account Number (PAN)</span>
              <p className="font-mono font-semibold text-midnight-950 mt-0.5">{maskPan(customerRecord?.pan || user?.pan)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500 border-t border-midnight-100 pt-2">
            Existing customer profile detected. Booking proceeds directly to investment parameters without re-collecting address or Aadhaar details.
          </p>
        </div>
      ) : (
        <div className="border-b border-ink-100 pb-6">
          <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
            Applicant Personal Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isSSY && (
              <>
                <div>
                  <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                    Full Legal Name<span className="text-danger-600"> *</span>
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="As printed on your PAN card"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                  {errors.fullName && <p className="text-xs text-danger-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                    Date of Birth<span className="text-danger-600"> *</span>
                  </label>
                  <input
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                  <p className="text-xs text-ink-500 mt-1">Drives eligibility and senior citizen rate (60+).</p>
                  {errors.dob && <p className="text-xs text-danger-600 mt-1">{errors.dob}</p>}
                </div>
              </>
            )}

            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Mobile Number<span className="text-danger-600"> *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">+91</span>
                <input
                  name="mobile"
                  type="tel"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-12 pr-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                />
              </div>
              {errors.mobile && <p className="text-xs text-danger-600 mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Email Address<span className="text-danger-600"> *</span>
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="name@domain.com"
                className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              />
              {errors.email && <p className="text-xs text-danger-600 mt-1">{errors.email}</p>}
            </div>

            <div className={isSSY ? 'sm:col-span-2' : ''}>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                PAN Number<span className="text-danger-600"> *</span>
              </label>
              <input
                name="panNumber"
                type="text"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="h-[42px] w-full uppercase rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-mono text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              />
              <p className="text-xs text-ink-500 mt-1">10-character alphanumeric PAN format.</p>
              {errors.panNumber && <p className="text-xs text-danger-600 mt-1">{errors.panNumber}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. FUNDING ACCOUNT SECTION                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-ink-100 pb-6">
        <h3 className="text-[13px] font-semibold text-midnight-900 mb-2">
          Funding Account
        </h3>
        <p className="text-xs text-ink-600 mb-3">
          Term deposits and monthly investment plans are funded from a FinEdge operative account.
        </p>

        {isExpressMode && accounts.length > 0 ? (
          <div>
            <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
              Select Debit Account<span className="text-danger-600"> *</span>
            </label>
            <select
              name="fundingAccountId"
              value={formData.fundingAccountId || accounts[0]?.accountId}
              onChange={(e) => handleChange('fundingAccountId', e.target.value)}
              className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
            >
              {accounts.map((acc) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.accountType || 'Savings Account'} — {acc.accountNumber || acc.accountId} (Balance: {formatINR(acc.balance || 0)})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                FinEdge 14-Digit Account Number
                {!formData.noFinEdgeAccountYet && <span className="text-danger-600"> *</span>}
              </label>
              <input
                type="text"
                name="fundingAccountNumber"
                maxLength={16}
                disabled={formData.noFinEdgeAccountYet}
                value={formData.fundingAccountNumber}
                onChange={(e) => handleChange('fundingAccountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="14-digit operative account number"
                className={`h-[42px] w-full rounded-lg border px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors ${
                  formData.noFinEdgeAccountYet ? 'bg-ink-50/80 text-ink-400 border-ink-200 cursor-not-allowed' : 'bg-white border-ink-200'
                }`}
              />
              {errors.fundingAccountNumber && !formData.noFinEdgeAccountYet && (
                <p className="text-xs text-danger-600 mt-1">{errors.fundingAccountNumber}</p>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                name="noFinEdgeAccountYet"
                checked={formData.noFinEdgeAccountYet}
                onChange={(e) => handleChange('noFinEdgeAccountYet', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700 font-medium">
                I don't have a FinEdge account yet — I want to apply now and open an Everyday Savings Account before booking completes.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FIXED DEPOSIT FORM (FIX 3)                                 */}
      {/* ------------------------------------------------------------- */}
      {isFD && (
        <div className="space-y-6">
          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
              Fixed Deposit Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Deposit Amount (₹)<span className="text-danger-600"> *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 font-medium">₹</span>
                  <input
                    name="fdDepositAmount"
                    type="number"
                    min={product?.minAmount || 5000}
                    step={1000}
                    value={formData.fdDepositAmount}
                    onChange={(e) => handleChange('fdDepositAmount', e.target.value)}
                    placeholder="e.g. 100000"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3.5 py-2 text-sm font-semibold text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  Minimum booking amount is {formatINRWhole(product?.minAmount || 5000)}.
                </p>
                {errors.fdDepositAmount && <p className="text-xs text-danger-600 mt-1">{errors.fdDepositAmount}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Tenure Band<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="fdTenureBand"
                  value={formData.fdTenureBand}
                  onChange={(e) => handleChange('fdTenureBand', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {(product?.rateGrid || []).map((band) => (
                    <option key={band.tenure} value={band.tenure}>
                      {band.tenure} — {band.general}% p.a. {isSenior ? `(Senior: ${band.senior}% p.a.)` : ''}
                    </option>
                  ))}
                </select>
                {errors.fdTenureBand && <p className="text-xs text-danger-600 mt-1">{errors.fdTenureBand}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Interest Payout Mode<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="fdPayoutOption"
                  value={formData.fdPayoutOption || 'Cumulative'}
                  onChange={(e) => handleChange('fdPayoutOption', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {(product?.payoutOptions || ['Cumulative (paid at maturity)', 'Monthly payout', 'Quarterly payout']).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2.5 cursor-pointer h-[42px]">
                  <input
                    type="checkbox"
                    name="fdAutoRenew"
                    checked={formData.fdAutoRenew}
                    onChange={(e) => handleChange('fdAutoRenew', e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs font-medium text-ink-800">
                    Auto-renew principal and interest at maturity
                  </span>
                </label>
              </div>
            </div>

            {/* Senior Citizen Indicator */}
            {isSenior && (
              <div className="mt-4 rounded-lg bg-success-50 border border-success-600/30 p-3 text-xs text-success-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success-600 shrink-0" />
                <span>Senior citizen rate applied (60+) — +0.50% p.a. added automatically to the chosen tenure band.</span>
              </div>
            )}

            {/* Live Maturity Panel */}
            <div className="mt-5 rounded-xl border border-midnight-100 bg-midnight-900 text-porcelain-50 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-porcelain-300">
                  Estimated Maturity Returns
                </span>
                <span className="text-xs text-gold-400 font-semibold">{fdRate.toFixed(2)}% p.a. applied</span>
              </div>

              {fdResult ? (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Deposit Amount</span>
                    <span className="font-semibold text-white">{formatINR(fdResult.principal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Tenure Band</span>
                    <span className="text-white">{fdBand?.tenure}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Total Interest Earned</span>
                    <span className="font-semibold text-emerald-400">+{formatINR(fdResult.interestEarned)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 text-gold-300">
                    <span>Maturity Value</span>
                    <span>{formatINR(fdResult.maturityValue)}</span>
                  </div>

                  {formData.fdPayoutOption?.includes('Monthly') && (
                    <div className="mt-2 text-xs border-t border-white/10 pt-2 text-porcelain-200 flex justify-between">
                      <span>Indicative monthly payout:</span>
                      <span className="font-semibold text-white">{formatINR(fdIndicativeMonthly)}</span>
                    </div>
                  )}
                  {formData.fdPayoutOption?.includes('Quarterly') && (
                    <div className="mt-2 text-xs border-t border-white/10 pt-2 text-porcelain-200 flex justify-between">
                      <span>Indicative quarterly payout:</span>
                      <span className="font-semibold text-white">{formatINR(fdIndicativeQuarterly)}</span>
                    </div>
                  )}
                  {formData.fdPayoutOption && !formData.fdPayoutOption.includes('Cumulative') && (
                    <p className="text-xs text-porcelain-400 italic">Paid-out interest does not compound.</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-porcelain-300 italic">Enter a valid deposit amount to view calculated maturity returns.</p>
              )}

              {/* Amendment C: Tax Information Line */}
              <div className="mt-3 border-t border-white/10 pt-2.5 flex items-start gap-2 text-xs leading-relaxed text-porcelain-300">
                <Info className="h-3.5 w-3.5 text-gold-400 shrink-0 mt-0.5" />
                <span>Interest is taxable as per your slab; the bank deducts TDS when interest exceeds the threshold prescribed under the Income-tax Act.</span>
              </div>
            </div>
          </div>

          {/* Consents */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="fdConsentTerms"
                checked={formData.fdConsentTerms}
                onChange={(e) => handleChange('fdConsentTerms', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I agree to the Fixed Deposit Terms & Conditions. Premature withdrawal is allowed with a 1% p.a. rate reduction for the period actually run. Deposits are insured by the DICGC up to ₹5,00,000 per depositor per bank.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.fdConsentTerms && <p className="text-xs text-danger-600 pl-7 mt-1">{errors.fdConsentTerms}</p>}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. RECURRING DEPOSIT FORM (FIX 4)                             */}
      {/* ------------------------------------------------------------- */}
      {isRD && (
        <div className="space-y-6">
          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
              Recurring Deposit Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Monthly Deposit (₹)<span className="text-danger-600"> *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 font-medium">₹</span>
                  <input
                    name="rdMonthlyAmount"
                    type="number"
                    min={product?.minMonthly || 500}
                    step={product?.monthlyStep || 100}
                    value={formData.rdMonthlyAmount}
                    onChange={(e) => handleChange('rdMonthlyAmount', e.target.value)}
                    placeholder="e.g. 5000"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3.5 py-2 text-sm font-semibold text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  Start with {formatINRWhole(product?.minMonthly || 500)}/mo, in multiples of {formatINRWhole(product?.monthlyStep || 100)}.
                </p>
                {errors.rdMonthlyAmount && <p className="text-xs text-danger-600 mt-1">{errors.rdMonthlyAmount}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Tenure Band<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="rdTenureBand"
                  value={formData.rdTenureBand}
                  onChange={(e) => handleChange('rdTenureBand', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {(product?.rateBands || []).map((band) => (
                    <option key={band.tenure} value={band.tenure}>
                      {band.tenure} — {(band.rate ?? band.general ?? 6.55)}% p.a.
                    </option>
                  ))}
                </select>
                {errors.rdTenureBand && <p className="text-xs text-danger-600 mt-1">{errors.rdTenureBand}</p>}
              </div>
            </div>

            {/* Standing Instruction & Missed Instalment Box */}
            <div className="mt-4 rounded-xl border border-ink-100 bg-porcelain-50 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rdConsentStandingInstruction"
                    checked={formData.rdConsentStandingInstruction}
                    onChange={(e) => handleChange('rdConsentStandingInstruction', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-800 font-medium">
                    Debit {formData.rdMonthlyAmount ? formatINR(Number(formData.rdMonthlyAmount)) : 'instalment'} from my funding account every month on day:
                  </span>
                </label>
                <select
                  name="rdDebitDate"
                  value={formData.rdDebitDate || '5'}
                  onChange={(e) => handleChange('rdDebitDate', e.target.value)}
                  className="h-[34px] rounded border border-ink-200 bg-white px-2.5 text-xs text-ink-900 font-semibold"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}th of the month
                    </option>
                  ))}
                </select>
              </div>
              {errors.rdConsentStandingInstruction && (
                <p className="text-xs text-danger-600 pl-6">{errors.rdConsentStandingInstruction}</p>
              )}

              <p className="text-xs text-ink-600 border-t border-ink-200/50 pt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 text-midnight-700 shrink-0 mt-0.5" />
                <span>One missed instalment per year is tolerated without penalty; later misses cost ₹10 per ₹1,000 of instalment.</span>
              </p>
            </div>

            {/* Live Maturity Panel */}
            <div className="mt-5 rounded-xl border border-midnight-100 bg-midnight-900 text-porcelain-50 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-porcelain-300">
                  Estimated Maturity Returns
                </span>
                <span className="text-xs text-gold-400 font-semibold">{(rdRate ?? 6.55).toFixed(2)}% p.a. applied</span>
              </div>

              {rdResult ? (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Monthly Deposit</span>
                    <span className="font-semibold text-white">{formatINR(rdNumAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Total Deposited ({rdTenureMonths} months)</span>
                    <span className="font-semibold text-white">{formatINR(rdResult.totalDeposited)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Total Interest Earned</span>
                    <span className="font-semibold text-emerald-400">+{formatINR(rdResult.interestEarned)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 text-gold-300">
                    <span>Maturity Value</span>
                    <span>{formatINR(rdResult.maturityValue)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-porcelain-300 italic">Enter a monthly instalment amount to view calculated maturity returns.</p>
              )}

              {/* Amendment C: Tax Information Line */}
              <div className="mt-3 border-t border-white/10 pt-2.5 flex items-start gap-2 text-xs leading-relaxed text-porcelain-300">
                <Info className="h-3.5 w-3.5 text-gold-400 shrink-0 mt-0.5" />
                <span>Interest is taxable as per your slab; the bank deducts TDS when interest exceeds the threshold prescribed under the Income-tax Act.</span>
              </div>
            </div>
          </div>

          {/* Consents */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="rdConsentTerms"
                checked={formData.rdConsentTerms}
                onChange={(e) => handleChange('rdConsentTerms', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I agree to the Recurring Deposit Terms & Conditions. Premature closure is permitted with interest calculated for the period actually run minus a 1% p.a. rate reduction.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.rdConsentTerms && <p className="text-xs text-danger-600 pl-7 mt-1">{errors.rdConsentTerms}</p>}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. SYSTEMATIC INVESTMENT PLAN (SIP) FORM (FIX 5)             */}
      {/* ------------------------------------------------------------- */}
      {isSIP && (
        <div className="space-y-6">
          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-2">
              Select Fund Category<span className="text-danger-600"> *</span>
            </h3>
            <p className="text-xs text-ink-500 mb-3">Choose the asset allocation strategy for your monthly mutual fund mandate.</p>

            {/* Fund Categories Radio Cards */}
            <div className="space-y-2.5">
              {(product?.fundCategories || []).map((cat) => {
                const isSelected = formData.sipFundCategory === cat.name;
                return (
                  <label
                    key={cat.name}
                    className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-midnight-800 bg-midnight-50/70'
                        : 'border-ink-200 hover:border-ink-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="sipFundCategory"
                        value={cat.name}
                        checked={isSelected}
                        onChange={() => handleChange('sipFundCategory', cat.name)}
                        className="mt-0.5 h-4 w-4 text-midnight-900 focus:ring-gold-500"
                      />
                      <div>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-midnight-950">{cat.name}</span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-warning-700">
                            Risk: {cat.riskLevel}
                          </span>
                        </div>
                        <p className="text-xs text-ink-600 mt-0.5">{cat.note}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.sipFundCategory && <p className="text-xs text-danger-600 mt-1">{errors.sipFundCategory}</p>}

            {/* Investment Parameters */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Monthly Amount (₹)<span className="text-danger-600"> *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 font-medium">₹</span>
                  <input
                    name="sipMonthlyAmount"
                    type="number"
                    min={product?.minMonthly || 500}
                    step={500}
                    value={formData.sipMonthlyAmount}
                    onChange={(e) => handleChange('sipMonthlyAmount', e.target.value)}
                    placeholder="e.g. 10000"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3.5 py-2 text-sm font-semibold text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1">Starts at {formatINRWhole(product?.minMonthly || 500)}/mo.</p>
                {errors.sipMonthlyAmount && <p className="text-xs text-danger-600 mt-1">{errors.sipMonthlyAmount}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  SIP Debit Date<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="sipDate"
                  value={formData.sipDate || '5'}
                  onChange={(e) => handleChange('sipDate', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}th of the month
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Duration (Years)<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="sipDurationYears"
                  value={formData.sipDurationYears || '10'}
                  onChange={(e) => handleChange('sipDurationYears', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {[1, 2, 3, 5, 7, 10, 15, 20, 25, 30].map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? 'year' : 'years'} ({y * 12} mos)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step-up option */}
            <div className="mt-4">
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Annual Step-up (Optional)
              </label>
              <select
                name="sipStepUp"
                value={formData.sipStepUp || 'None'}
                onChange={(e) => handleChange('sipStepUp', e.target.value)}
                className="h-[42px] w-full sm:w-64 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              >
                {(product?.stepUpOptions || ['None', '5% per year', '10% per year']).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {formData.sipStepUp && formData.sipStepUp !== 'None' && (
                <p className="text-xs text-ink-500 mt-1 italic">
                  Note: The projection panel below computes returns based on the baseline instalment and excludes annual step-up.
                </p>
              )}
            </div>

            {/* Illustration Panel (VERBATIM copy from Calculators page) */}
            <div className="mt-5 rounded-xl border border-midnight-100 bg-midnight-900 text-porcelain-50 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-porcelain-300">
                  Projected value (illustration only)
                </span>
                <span className="text-xs text-gold-400 font-semibold">{sipReturnPct}% p.a. assumed growth</span>
              </div>

              {/* Assumed Return Slider */}
              <div className="mt-3 bg-white/5 rounded-lg p-3 border border-white/10 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-porcelain-300 font-medium">Assumed annual return:</span>
                  <span className="font-semibold text-gold-300 font-mono">{sipReturnPct}% p.a.</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={sipReturnPct}
                  onChange={(e) => handleChange('sipAssumedReturn', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-midnight-800 rounded-lg appearance-none cursor-pointer accent-gold-400"
                />
                <p className="text-xs text-porcelain-400 leading-snug">
                  An assumption you choose for this illustration — not a rate the bank offers or expects.
                </p>
              </div>

              {sipResult ? (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Monthly Investment</span>
                    <span className="font-semibold text-white">{formatINR(sipNumAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Total Invested ({sipNumYears} years)</span>
                    <span className="font-semibold text-white">{formatINR(sipResult.totalInvested)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 text-gold-300">
                    <span>Projected Value</span>
                    <span>{formatINR(sipResult.maturityValue)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-porcelain-300 italic">Enter a monthly investment amount to view calculated illustration.</p>
              )}

              <p className="mt-3 text-xs text-porcelain-400 border-t border-white/10 pt-2 leading-relaxed">
                What the deposits above would grow to IF markets returned exactly the assumed rate every year. They will not.
              </p>
            </div>
          </div>

          {/* Declarations (Mandatory) */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="sipDeclRisk"
                checked={formData.sipDeclRisk}
                onChange={(e) => handleChange('sipDeclRisk', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I understand <strong className="text-midnight-950">{selectedSipCategory.name}</strong> is a <strong className="text-midnight-950">{selectedSipCategory.riskLevel}</strong> risk, market-linked investment. Returns are not guaranteed, this is not a bank deposit, and it is not covered by deposit insurance.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.sipDeclRisk && <p className="text-xs text-danger-600 pl-7">{errors.sipDeclRisk}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="sipDeclKycPan"
                checked={formData.sipDeclKycPan}
                onChange={(e) => handleChange('sipDeclKycPan', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I confirm I have completed KYC and hold a valid Permanent Account Number (PAN).<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.sipDeclKycPan && <p className="text-xs text-danger-600 pl-7">{errors.sipDeclKycPan}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="sipConsentMandate"
                checked={formData.sipConsentMandate}
                onChange={(e) => handleChange('sipConsentMandate', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I authorise auto-debit of {formData.sipMonthlyAmount ? formatINR(Number(formData.sipMonthlyAmount)) : 'the instalment'} from my funding account on the {formData.sipDate || 5}th of every month. I understand I can pause or modify this mandate anytime.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.sipConsentMandate && <p className="text-xs text-danger-600 pl-7">{errors.sipConsentMandate}</p>}

            {/* Amendment E: FATCA in BOTH modes */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="sipDeclFatca"
                checked={formData.sipDeclFatca}
                onChange={(e) => handleChange('sipDeclFatca', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I confirm that I am a tax resident of India and not a tax resident of any other country under FATCA/CRS.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.sipDeclFatca && <p className="text-xs text-danger-600 pl-7">{errors.sipDeclFatca}</p>}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. SUKANYA SAMRIDDHI ACCOUNT (SSY) FORM (FIX 6)               */}
      {/* ------------------------------------------------------------- */}
      {isSSY && (
        <div className="space-y-6">
          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
              Guardian Details (Applicant)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Guardian Full Name<span className="text-danger-600"> *</span>
                </label>
                <input
                  name="ssyGuardianName"
                  type="text"
                  value={formData.ssyGuardianName}
                  onChange={(e) => handleChange('ssyGuardianName', e.target.value)}
                  placeholder="Guardian's legal name"
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                {errors.ssyGuardianName && <p className="text-xs text-danger-600 mt-1">{errors.ssyGuardianName}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Relationship to Child<span className="text-danger-600"> *</span>
                </label>
                <select
                  name="ssyGuardianRelationship"
                  value={formData.ssyGuardianRelationship || 'Father'}
                  onChange={(e) => handleChange('ssyGuardianRelationship', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                </select>
                {errors.ssyGuardianRelationship && (
                  <p className="text-xs text-danger-600 mt-1">{errors.ssyGuardianRelationship}</p>
                )}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Guardian Date of Birth<span className="text-danger-600"> *</span>
                </label>
                <input
                  name="ssyGuardianDob"
                  type="date"
                  value={formData.ssyGuardianDob}
                  onChange={(e) => handleChange('ssyGuardianDob', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <p className="text-xs text-ink-500 mt-1">Must be 18+ years of age.</p>
                {errors.ssyGuardianDob && <p className="text-xs text-danger-600 mt-1">{errors.ssyGuardianDob}</p>}
              </div>
            </div>
          </div>

          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
              Girl Child Beneficiary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Girl Child Full Name<span className="text-danger-600"> *</span>
                </label>
                <input
                  name="ssyChildName"
                  type="text"
                  value={formData.ssyChildName}
                  onChange={(e) => handleChange('ssyChildName', e.target.value)}
                  placeholder="As per birth certificate"
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                {errors.ssyChildName && <p className="text-xs text-danger-600 mt-1">{errors.ssyChildName}</p>}
              </div>

              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Child Date of Birth<span className="text-danger-600"> *</span>
                </label>
                <input
                  name="ssyChildDob"
                  type="date"
                  value={formData.ssyChildDob}
                  onChange={(e) => handleChange('ssyChildDob', e.target.value)}
                  className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                />
                <p className="text-xs text-ink-500 mt-1">
                  Scheme rule: Girl child must be under 10 years of age at account opening.
                </p>
                {errors.ssyChildDob && <p className="text-xs text-danger-600 mt-1">{errors.ssyChildDob}</p>}
              </div>
            </div>

            {/* Amendment D: SSY Documents Note */}
            <div className="mt-4 rounded-lg bg-porcelain-100 p-3 text-xs text-ink-700 flex items-start gap-2 border border-ink-200/60">
              <Info className="h-4 w-4 text-midnight-700 shrink-0 mt-0.5" />
              <span>The child's birth certificate and the guardian's KYC documents are verified during ops review.</span>
            </div>
          </div>

          <div className="border-b border-ink-100 pb-6">
            <h3 className="text-[13px] font-semibold text-midnight-900 mb-4">
              Scheme Deposit & Projection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Annual Deposit Amount (₹)<span className="text-danger-600"> *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 font-medium">₹</span>
                  <input
                    name="ssyAnnualDeposit"
                    type="number"
                    min={product?.minDepositYearly || 250}
                    max={product?.maxDepositYearly || 150000}
                    step={250}
                    value={formData.ssyAnnualDeposit}
                    onChange={(e) => handleChange('ssyAnnualDeposit', e.target.value)}
                    placeholder="e.g. 150000"
                    className="h-[42px] w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3.5 py-2 text-sm font-semibold text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  Scheme range: {formatINRWhole(product?.minDepositYearly || 250)} to {formatINRWhole(product?.maxDepositYearly || 150000)} per financial year.
                </p>
                {errors.ssyAnnualDeposit && <p className="text-xs text-danger-600 mt-1">{errors.ssyAnnualDeposit}</p>}
              </div>

              <div>
                <span className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                  Scheme Tenure Facts
                </span>
                <div className="rounded-lg border border-ink-200 bg-porcelain-50 p-2.5 text-xs text-ink-700 space-y-1">
                  <p><strong>Deposits:</strong> 15 years from account opening</p>
                  <p><strong>Maturity:</strong> 21 years (or marriage after age 18)</p>
                </div>
              </div>
            </div>

            {/* Projection Panel */}
            <div className="mt-5 rounded-xl border border-midnight-100 bg-midnight-900 text-porcelain-50 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-porcelain-300">
                  Maturity value at 21 years (projection)
                </span>
                <span className="text-xs text-gold-400 font-semibold">{product?.rate || 8.05}% p.a.</span>
              </div>

              {ssyResult ? (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Deposit applied per year</span>
                    <span className="font-semibold text-white">{formatINR(ssyResult.appliedAnnualDeposit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Total deposited (15 years)</span>
                    <span className="font-semibold text-white">{formatINR(ssyResult.totalDeposited)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-porcelain-300">Interest earned (projected)</span>
                    <span className="font-semibold text-emerald-400">+{formatINR(ssyResult.interestEarned)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 text-gold-300">
                    <span>Maturity value (21 years)</span>
                    <span>{formatINR(ssyResult.maturityValue)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-porcelain-300 italic">Enter an annual deposit amount to view calculated scheme projection.</p>
              )}

              <p className="mt-3 text-xs text-porcelain-400 border-t border-white/10 pt-2 leading-relaxed">
                {product?.rateNote || 'Illustrative rate for this platform. The actual SSY rate is set by the Government of India and revised periodically.'}
              </p>
            </div>
          </div>

          {/* Scheme Declarations */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ssyDeclSingleAccount"
                checked={formData.ssyDeclSingleAccount}
                onChange={(e) => handleChange('ssyDeclSingleAccount', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I confirm this is the only Sukanya Samriddhi account for this child.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.ssyDeclSingleAccount && <p className="text-xs text-danger-600 pl-7">{errors.ssyDeclSingleAccount}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ssyDeclMaxTwo"
                checked={formData.ssyDeclMaxTwo}
                onChange={(e) => handleChange('ssyDeclMaxTwo', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I confirm there are not more than two SSY accounts opened across my family.<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.ssyDeclMaxTwo && <p className="text-xs text-danger-600 pl-7">{errors.ssyDeclMaxTwo}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ssyDeclDuration"
                checked={formData.ssyDeclDuration}
                onChange={(e) => handleChange('ssyDeclDuration', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
              />
              <span className="text-xs leading-relaxed text-ink-700">
                I understand deposits are made for 15 years and the account matures after 21 years (or upon marriage after age 18).<span className="text-danger-600"> *</span>
              </span>
            </label>
            {errors.ssyDeclDuration && <p className="text-xs text-danger-600 pl-7">{errors.ssyDeclDuration}</p>}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. NOMINEE SECTION (FD, RD, SIP ONLY - NOT SSY) (AMENDMENT B) */}
      {/* ------------------------------------------------------------- */}
      {!isSSY && (
        <div className="border-b border-ink-100 pb-6">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[13px] font-semibold text-midnight-900">
              Nominee (optional)
            </h3>
            <span className="text-xs font-medium text-ink-500">Optional</span>
          </div>
          <p className="text-xs text-ink-500 mb-4">
            Person who receives the deposit proceeds if the holder dies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Nominee Name
              </label>
              <input
                name="nomineeName"
                type="text"
                value={formData.nomineeName}
                onChange={(e) => handleChange('nomineeName', e.target.value)}
                placeholder="Full legal name"
                className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Relationship
              </label>
              <select
                name="nomineeRelationship"
                value={formData.nomineeRelationship}
                onChange={(e) => handleChange('nomineeRelationship', e.target.value)}
                className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              >
                <option value="">Select relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-ink-800 mb-1.5 block">
                Nominee Date of Birth
              </label>
              <input
                name="nomineeDob"
                type="date"
                value={formData.nomineeDob}
                onChange={(e) => handleChange('nomineeDob', e.target.value)}
                className="h-[42px] w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MARKETING OPT-IN (OPTIONAL, LAST)                          */}
      {/* ------------------------------------------------------------- */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="optInMarketing"
            checked={formData.optInMarketing}
            onChange={(e) => handleChange('optInMarketing', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
          />
          <span className="text-xs leading-relaxed text-ink-600">
            I would like to receive product updates, market insights and notifications from FinEdge Bank.
          </span>
        </label>
      </div>
    </div>
  );
};

export default InvestmentFormFields;
