import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Landmark,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Input,
  PageLoading,
  SectionHeader,
  Select,
  StatusChip,
  Stepper,
  Table,
  useToast,
} from '../../../components/ui.jsx';
import { formatDate, formatINR, formatINRWhole, maskAccount } from '../../../lib/format.js';
import { LOANS, getLoanBySlug } from '../../../data/products.js';
import { calculateEMI } from '../../../lib/finance.js';
import { applyLoan, listMyLoanApplications, listMyLoans } from '../../../services/portalBridge.js';
import { listAccounts } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const EMPLOYMENT_TYPES = [
  'Salaried',
  'Self-employed professional',
  'Self-employed business',
  'Retired',
  'Other',
];

function feeLine(product) {
  const fee = product?.processingFee;
  if (!fee) return null;
  const parts = [`${fee.pct}% of the sanctioned amount`];
  if (fee.min != null) parts.push(`minimum ${fee.min === 0 ? 'Nil' : formatINRWhole(fee.min)}`);
  if (fee.max != null) parts.push(`maximum ${formatINRWhole(fee.max)}`);
  return `Processing fee: ${parts.join(', ')}${fee.note ? ` · ${fee.note}` : ''}. Rates are illustrative for this demonstration platform.`;
}

function accountLabel(account) {
  const type = account.type ? account.type.charAt(0) + account.type.slice(1).toLowerCase() : 'Account';
  return `${type} · ${maskAccount(account.accountNumber)} · ${formatINR(account.balance)}`;
}

export default function LoansPage() {
  const { user } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const customerId = user?.customerId;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const dataKeyRef = useRef('');

  // Form default product is Home Loan (catalogue lead)
  const [productSlug, setProductSlug] = useState('home-loan');
  const [amount, setAmount] = useState('2500000');
  const [tenure, setTenure] = useState('120');
  const [purpose, setPurpose] = useState('Residential apartment purchase');
  const [monthlyIncome, setMonthlyIncome] = useState('95000');
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);
  const [employerName, setEmployerName] = useState('Tata Consultancy Services');
  const [existingEmis, setExistingEmis] = useState('0');
  const [accountId, setAccountId] = useState('');

  // Mandatory consents
  const [cicConsent, setCicConsent] = useState(false);
  const [mitcConsent, setMitcConsent] = useState(false);
  const [taxResidentIndia, setTaxResidentIndia] = useState(true);
  const [notPep, setNotPep] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successApp, setSuccessApp] = useState(null);

  // ---- loan schedule expansion ----
  const [expandedLoanId, setExpandedLoanId] = useState(null);

  const product = useMemo(
    () => LOANS.find((l) => l.slug === productSlug) || LOANS[0],
    [productSlug],
  );

  useEffect(() => {
    let live = true;
    if (!customerId) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      traceData('PortalLoans');
      try {
        const [accs, apps, myLoans] = await Promise.all([
          listAccounts(customerId),
          listMyLoanApplications(customerId),
          listMyLoans(customerId),
        ]);
        if (!live) return;
        const key = JSON.stringify([accs, apps, myLoans]);
        if (key !== dataKeyRef.current) {
          dataKeyRef.current = key;
          setAccounts(accs);
          setApplications(apps);
          setLoans(myLoans);
          setAccountId((prev) => {
            if (prev && accs.some((a) => a.id === prev)) return prev;
            const active = accs.find((a) => a.status === 'ACTIVE') || accs[0];
            return active ? active.id : '';
          });
        }
        setLoadError('');
      } catch (err) {
        if (live) setLoadError(err?.message || 'We could not load your loans. Please try again.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  });

  // When the product changes, keep the tenure inside its allowed range.
  useEffect(() => {
    if (!product) return;
    setTenure((prev) => {
      const n = Number(prev);
      if (!prev || Number.isNaN(n)) return String(Math.min(120, product.tenureMaxMonths));
      const clamped = Math.max(product.tenureMinMonths, Math.min(product.tenureMaxMonths, Math.round(n)));
      return String(clamped);
    });
    setFieldErrors((prev) => ({ ...prev, amount: undefined, tenure: undefined, monthlyIncome: undefined }));
  }, [productSlug]);

  const emiPreview = useMemo(() => {
    if (!product) return null;
    const principal = Number(amount);
    const months = Number(tenure);
    if (!Number.isFinite(principal) || principal <= 0) return null;
    if (!Number.isInteger(months) || months <= 0) return null;
    try {
      return calculateEMI(principal, product.rateMin, months);
    } catch {
      return null;
    }
  }, [product, amount, tenure]);

  function validate() {
    const errors = {};
    const amt = Number(amount);
    const months = Number(tenure);
    const income = Number(monthlyIncome);

    if (!product) errors.product = 'Choose a loan product.';
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      errors.amount = 'Enter the amount you want to borrow.';
    } else if (product && amt > product.maxAmount) {
      errors.amount = `This product supports up to ${formatINR(product.maxAmount)}.`;
    }

    if (!tenure || Number.isNaN(months) || !Number.isInteger(months)) {
      errors.tenure = 'Enter the tenure in whole months.';
    } else if (product && (months < product.tenureMinMonths || months > product.tenureMaxMonths)) {
      errors.tenure = `Tenure for this product is ${product.tenureMinMonths}–${product.tenureMaxMonths} months.`;
    }

    if (!purpose.trim()) errors.purpose = 'Tell us what the loan is for.';

    if (!monthlyIncome || Number.isNaN(income) || income <= 0) {
      errors.monthlyIncome = 'Enter your monthly income.';
    } else if (product?.eligibility?.minMonthlyIncome && income < product.eligibility.minMonthlyIncome) {
      errors.monthlyIncome = `Minimum monthly income for ${product.name} is ${formatINR(product.eligibility.minMonthlyIncome)}.`;
    }

    if (!employmentType) errors.employmentType = 'Choose your employment type.';
    if (!employerName.trim()) errors.employerName = 'Enter employer or business name.';
    if (!accountId) errors.accountId = 'Choose the account to credit on disbursement.';

    if (!cicConsent) {
      errors.cicConsent = 'Credit bureau authorization is required to apply.';
    }
    if (!mitcConsent) {
      errors.mitcConsent = 'You must agree to the Most Important Terms & Conditions (MITC).';
    }
    if (!taxResidentIndia) {
      errors.taxResidentIndia = 'Confirmation of Indian tax residency is required.';
    }
    if (!notPep) {
      errors.notPep = 'Confirmation of non-PEP status is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate() || !product || !customerId) return;
    traceForm('LoanApplication', {
      productSlug: product.slug,
      productName: product.name,
      amount: Number(amount),
      tenureMonths: Number(tenure),
      purpose: purpose.trim(),
      accountId,
      monthlyIncome: Number(monthlyIncome),
      employmentType,
      employerName: employerName.trim(),
    });
    setSubmitting(true);
    try {
      const app = await applyLoan(customerId, {
        productSlug: product.slug,
        productName: product.name,
        rate: product.rateMin,
        amount: Number(amount),
        tenureMonths: Number(tenure),
        purpose: purpose.trim(),
        accountId,
        disbursementAccountId: accountId,
        monthlyIncome: Number(monthlyIncome),
        employmentType,
        employerName: employerName.trim(),
        existingEmis: Number(existingEmis) || 0,
        cicConsent: true,
        mitcConsent: true,
      });
      setSuccessApp(app);
      setApplications((prev) => [app, ...prev.filter((a) => a.id !== app.id)]);
      toast({
        tone: 'success',
        title: 'Loan application submitted',
        body: `Reference ${app.id}. You can track it below while our team reviews it.`,
      });
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Server not connected — bypassed for now');
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToTracker() {
    document.getElementById('loan-applications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-10">
      <SectionHeader titleAs="h1"
        eyebrow="Borrow"
        title="Loans"
        description="Apply for a FinEdge loan, track your applications through review, and view the EMI schedule for every active loan. Rates shown are illustrative for this demonstration platform."
      />

      {loadError && <FormError message={loadError} />}

      {/* ---------------- (a) Apply ---------------- */}
      <section aria-labelledby="loan-apply-heading">
        <h3 id="loan-apply-heading" className="mb-4 font-display text-xl font-semibold text-midnight-950">
          Apply for a loan
        </h3>
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-midnight-200 bg-midnight-50 px-3.5 py-2.5 text-xs text-midnight-800">
            <ShieldCheck className="h-4 w-4 shrink-0 text-midnight-700" />
            <span>Express loan application — verified KYC records on file for your logged-in customer account are applied automatically.</span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Loan product" required error={fieldErrors.product}>
                <Select
                  value={productSlug}
                  onChange={(e) => setProductSlug(e.target.value)}
                  error={fieldErrors.product}
                >
                  {LOANS.map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {l.name} — {l.rateMin.toFixed(2)}%–{l.rateMax.toFixed(2)}% p.a.
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Employment type" required error={fieldErrors.employmentType}>
                <Select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  error={fieldErrors.employmentType}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Employer / Business name" required error={fieldErrors.employerName}>
                <Input
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  error={fieldErrors.employerName}
                />
              </Field>

              <Field
                label="Monthly income (₹)"
                required
                error={fieldErrors.monthlyIncome}
                hint={product?.eligibility?.minMonthlyIncome ? `Minimum ${formatINR(product.eligibility.minMonthlyIncome)} for this product` : 'Net in-hand income'}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="e.g. 95000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  error={fieldErrors.monthlyIncome}
                />
              </Field>

              <Field label="Existing monthly EMIs (₹)" hint="Total monthly commitment across all existing loans (0 if none)">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={existingEmis}
                  onChange={(e) => setExistingEmis(e.target.value)}
                />
              </Field>

              <Field
                label="Amount (₹)"
                required
                error={fieldErrors.amount}
                hint={product ? `Up to ${formatINR(product.maxAmount)} for this product` : undefined}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="e.g. 2500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  error={fieldErrors.amount}
                />
              </Field>

              <Field
                label="Tenure (months)"
                required
                error={fieldErrors.tenure}
                hint={product ? `${product.tenureMinMonths}–${product.tenureMaxMonths} months for this product` : undefined}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={product?.tenureMinMonths}
                  max={product?.tenureMaxMonths}
                  placeholder="e.g. 120"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  error={fieldErrors.tenure}
                />
              </Field>

              <Field label="Disbursement account" required error={fieldErrors.accountId}>
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  error={fieldErrors.accountId}
                >
                  <option value="">Choose an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Purpose of the loan" required error={fieldErrors.purpose}>
              <Input
                type="text"
                placeholder="e.g. Residential apartment purchase"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                error={fieldErrors.purpose}
              />
            </Field>

            {product && (
              <div className="rounded-lg border border-ink-100 bg-porcelain-100/70 px-4 py-3">
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-600">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                  <span>{feeLine(product)}</span>
                </p>
              </div>
            )}

            {/* Live EMI preview */}
            <div className="rounded-lg border border-midnight-100 bg-midnight-50 px-4 py-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">
                Indicative EMI preview
              </p>
              {emiPreview && product ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-ink-500">Monthly EMI at {product.rateMin.toFixed(2)}% p.a.</p>
                    <p className="tnum mt-0.5 font-display text-2xl font-semibold text-midnight-950">
                      {formatINR(emiPreview.emi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Total interest</p>
                    <p className="tnum mt-0.5 text-base font-semibold text-ink-800">
                      {formatINR(emiPreview.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Total repayment</p>
                    <p className="tnum mt-0.5 text-base font-semibold text-ink-800">
                      {formatINR(emiPreview.totalPayment)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-500">
                  Enter an amount and tenure to see the EMI at the lowest rate for this product. Your sanctioned rate may differ after review.
                </p>
              )}
            </div>

            {/* Mandatory Consents */}
            <div className="space-y-3 rounded-lg border border-ink-200 bg-porcelain-50 p-4">
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cicConsent}
                    onChange={(e) => setCicConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I authorize FinEdge Bank to pull and assess my credit information report from CIBIL, Experian, Equifax, or CRIF High Mark for credit underwriting.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {fieldErrors.cicConsent && <p className="text-xs text-danger-600 pl-7">{fieldErrors.cicConsent}</p>}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mitcConsent}
                    onChange={(e) => setMitcConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I have read and agree to the Most Important Terms &amp; Conditions (MITC) for the <strong className="text-midnight-950">{product?.name}</strong>: interest rates {product?.rateMin?.toFixed(2)}% – {product?.rateMax?.toFixed(2)}% p.a., processing fee {product?.processingFee?.pct}% (min {product?.processingFee?.min === 0 ? 'Nil' : formatINRWhole(product?.processingFee?.min || 0)}). Floating-rate loans carry zero prepayment penalty.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {fieldErrors.mitcConsent && <p className="text-xs text-danger-600 pl-7">{fieldErrors.mitcConsent}</p>}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxResidentIndia}
                    onChange={(e) => setTaxResidentIndia(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I confirm that I am a tax resident of India and not a tax resident of any other country.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {fieldErrors.taxResidentIndia && <p className="text-xs text-danger-600 pl-7">{fieldErrors.taxResidentIndia}</p>}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notPep}
                    onChange={(e) => setNotPep(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-midnight-900 focus:ring-gold-500"
                  />
                  <span className="text-xs leading-relaxed text-ink-700">
                    I confirm that I am not a Politically Exposed Person (PEP) or related to one.<span className="text-danger-600"> *</span>
                  </span>
                </label>
                {fieldErrors.notPep && <p className="text-xs text-danger-600 pl-7">{fieldErrors.notPep}</p>}
              </div>
            </div>

            <FormError message={formError} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" loading={submitting} disabled={accounts.length === 0}>
                Submit loan application
              </Button>
              {accounts.length === 0 && (
                <p className="text-[13px] text-ink-500">You need an active FinEdge account before you can apply.</p>
              )}
            </div>
          </form>

          {successApp && (
            <div className="mt-6 rounded-lg border border-success-600/25 bg-success-50 px-4 py-4" role="status">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Application submitted successfully</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                      Reference <span className="font-semibold text-ink-800">{successApp.id}</span>
                      {' · '}{successApp.productName}
                      {' · '}{formatINR(successApp.amount)} over {successApp.tenureMonths} months
                      {successApp.emi ? <> · Indicative EMI {formatINR(successApp.emi)}</> : null}
                      . Our team will review your application next — no additional action is needed.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={scrollToTracker}>
                  Track application
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ---------------- (b) My Applications tracker ---------------- */}
      <section id="loan-applications" aria-labelledby="loan-apps-heading" className="scroll-mt-24">
        <h3 id="loan-apps-heading" className="mb-4 font-display text-xl font-semibold text-midnight-950">
          My applications
        </h3>
        {applications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No loan applications yet"
            body="When you apply for a loan, its progress through document verification, review and decision will appear here."
          />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const appProduct = getLoanBySlug(app.productSlug);
              const productName = app.productName || appProduct?.name || 'Loan';
              const rate = app.rate ?? appProduct?.rateMin;
              const isGold = app.productSlug === 'gold-loan';
              const steps = (app.steps || []).map((s) => ({
                ...s,
                date: s.date ? formatDate(s.date) : '—',
              }));
              return (
                <Card key={app.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-midnight-950">{productName}</p>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        Reference {app.id} · Applied {formatDate(app.submittedAt || app.appliedAt || app.createdAt)}
                      </p>
                    </div>
                    <StatusChip status={app.status} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-ink-500">Amount</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">{formatINR(app.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Tenure</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {app.tenureMonths ? `${app.tenureMonths} months` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">{isGold ? 'Repayment' : 'Indicative EMI'}</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {isGold ? 'Bullet repayment at maturity' : (app.emi ? formatINR(app.emi) : '—')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Rate</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {rate != null ? `${Number(rate).toFixed(2)}% p.a.` : '—'}
                      </dd>
                    </div>
                  </dl>

                  {app.purpose && (
                    <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-600">
                      <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
                      <span>{app.purpose}</span>
                    </p>
                  )}

                  {steps.length > 0 && (
                    <div className="mt-5 border-t border-ink-100 pt-5">
                      <Stepper steps={steps} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- (c) My Loans ---------------- */}
      <section aria-labelledby="my-loans-heading">
        <h3 id="my-loans-heading" className="mb-4 font-display text-xl font-semibold text-midnight-950">
          My loans
        </h3>
        {loans.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No active loans"
            body="Once an application is approved and disbursed, the loan and its full EMI schedule will appear here."
          />
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => {
              const expanded = expandedLoanId === loan.id;
              const scheduleRows = (loan.schedule || []).map((row) => ({
                ...row,
                dueDateLabel: formatDate(row.dueDate),
              }));
              return (
                <Card key={loan.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-midnight-950">{loan.productName || 'Loan'}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <BadgeCheck className="h-4 w-4 text-midnight-700" aria-hidden />
                          Disbursement ref {loan.disbursementRef || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4 text-midnight-700" aria-hidden />
                          Started {formatDate(loan.startDate)}
                        </span>
                      </p>
                    </div>
                    <StatusChip status={loan.status} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-ink-500">Principal</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">{formatINR(loan.principal)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Rate</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {loan.rate != null ? `${Number(loan.rate).toFixed(2)}% p.a.` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Tenure</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {loan.tenureMonths ? `${loan.tenureMonths} months` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Monthly EMI</dt>
                      <dd className="tnum mt-0.5 text-sm font-semibold text-ink-800">
                        {loan.emi ? formatINR(loan.emi) : '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-ink-100 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedLoanId(expanded ? null : loan.id)}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <>Hide EMI schedule <ChevronUp className="h-4 w-4" aria-hidden /></>
                      ) : (
                        <>View EMI schedule <ChevronDown className="h-4 w-4" aria-hidden /></>
                      )}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="mt-4">
                      {scheduleRows.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-ink-500">
                          <Wallet className="h-4 w-4" aria-hidden /> No schedule is available for this loan yet.
                        </p>
                      ) : (
                        <div className="max-h-[440px] overflow-y-auto">
                          <Table
                            columns={[
                              { key: 'month', label: 'Month' },
                              { key: 'dueDate', label: 'Due date', render: (r) => r.dueDateLabel },
                              { key: 'emi', label: 'EMI', align: 'right', render: (r) => <span className="tnum">{formatINR(r.emi)}</span> },
                              { key: 'principal', label: 'Principal', align: 'right', render: (r) => <span className="tnum">{formatINR(r.principal)}</span> },
                              { key: 'interest', label: 'Interest', align: 'right', render: (r) => <span className="tnum">{formatINR(r.interest)}</span> },
                              { key: 'balance', label: 'Balance', align: 'right', render: (r) => <span className="tnum">{formatINR(r.balance)}</span> },
                            ]}
                            rows={scheduleRows}
                            rowKey={(r) => r.month}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
