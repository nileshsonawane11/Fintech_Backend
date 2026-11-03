import React, { useEffect, useRef, useState } from 'react';
import { FileText, ShieldCheck, Upload } from 'lucide-react';
import {
  Button, Card, Checkbox, Field, FormError, Input, PageLoading,
  SectionHeader, StatusChip, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatDateTime, formatINR, maskPan, statusLabel } from '../../../lib/format.js';
import { getMyKyc, submitKyc } from '../../../services/portalBridge.js';

const DOC_TYPES = [
  { type: 'PAN', label: 'PAN card', hint: 'Clear photo or scan of your PAN card' },
  { type: 'AADHAAR', label: 'Aadhaar card', hint: 'Front and back, in a single file if possible' },
  { type: 'ADDRESS_PROOF', label: 'Address proof', hint: 'Utility bill, rental agreement or passport' },
  { type: 'PHOTO', label: 'Passport-size photograph', hint: 'Recent photograph against a plain background' },
];

const EDITABLE_STATUSES = ['NOT_STARTED', 'PENDING', 'REJECTED', 'INFO_REQUIRED'];

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-[13px] font-medium text-ink-500">{label}</dt>
      <dd className="text-sm font-medium text-ink-900">{children || '—'}</dd>
    </div>
  );
}

function emptyDocs() {
  return Object.fromEntries(DOC_TYPES.map((d) => [d.type, { name: '', state: '' }]));
}

export default function KycPage() {
  const { user } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const customerId = user?.customerId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [form, setForm] = useState({
    fullName: '', pan: '', dob: '', mobile: '',
    line1: '', city: '', state: '', pin: '',
    occupation: '', annualIncome: '',
  });
  const [docs, setDocs] = useState(emptyDocs);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initialisedFor = useRef(null);

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    setLoading(true);
    getMyKyc(customerId)
      .then((res) => { if (live) { setData(res); setLoadError(''); } })
      .catch((err) => { if (live) setLoadError(err?.message || 'We could not load your KYC record.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId, refresh]);

  // Prefill the form + document list from the current record, once per customer.
  useEffect(() => {
    const customer = data?.customer;
    if (!customer || initialisedFor.current === customer.id) return;
    initialisedFor.current = customer.id;
    setForm({
      fullName: customer.fullName || '',
      pan: customer.pan || '',
      dob: customer.dob || '',
      mobile: customer.mobile || '',
      line1: customer.address?.line1 || '',
      city: customer.address?.city || '',
      state: customer.address?.state || '',
      pin: customer.address?.pin || '',
      occupation: customer.occupation || '',
      annualIncome: customer.annualIncome != null ? String(customer.annualIncome) : '',
    });
    const next = emptyDocs();
    for (const d of data?.kycCase?.documents || []) {
      const key = String(d.type || '').toUpperCase();
      if (next[key]) next[key] = { name: d.name || '', state: d.state || 'UPLOADED' };
    }
    setDocs(next);
  }, [data]);

  if (loading && !data) return <PageLoading />;
  if (loadError && !data) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="KYC" title="Know Your Customer" />
        <FormError message={loadError} />
      </div>
    );
  }

  const customer = data?.customer || {};
  const kycCase = data?.kycCase || null;
  const kycStatus = customer.kycStatus || 'NOT_STARTED';
  const showForm = editing || (EDITABLE_STATUSES.includes(kycStatus) && !justSubmitted);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function onDocFile(type) {
    return (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setDocs((prev) => ({ ...prev, [type]: { name: file.name, state: 'UPLOADED' } }));
      setErrors((prev) => ({ ...prev, [`doc_${type}`]: undefined }));
    };
  }

  function validate() {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Enter your full name as on your PAN.';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan.trim())) next.pan = 'Enter a valid PAN (for example, ABCDE1234F).';
    if (!form.dob) next.dob = 'Enter your date of birth.';
    const digits = form.mobile.replace(/\D/g, '');
    const local = digits.length > 10 ? digits.slice(-10) : digits;
    if (!/^[6-9]\d{9}$/.test(local)) next.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (!form.line1.trim()) next.line1 = 'Enter your address line.';
    if (!form.city.trim()) next.city = 'Enter your city.';
    if (!form.state.trim()) next.state = 'Enter your state.';
    if (!/^\d{6}$/.test(form.pin.trim())) next.pin = 'Enter a valid 6-digit PIN code.';
    if (!form.occupation.trim()) next.occupation = 'Enter your occupation.';
    if (!(Number(form.annualIncome) > 0)) next.annualIncome = 'Enter your annual income.';
    for (const d of DOC_TYPES) {
      if (!docs[d.type]?.name) next[`doc_${d.type}`] = `Upload your ${d.label.toLowerCase()}.`;
    }
    if (!consent) next.consent = 'Please give your consent to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFormError('');
    const digits = form.mobile.replace(/\D/g, '');
    const local = digits.length > 10 ? digits.slice(-10) : digits;
    const payload = {
      fullName: form.fullName.trim(),
      pan: form.pan.trim().toUpperCase(),
      dob: form.dob,
      mobile: local,
      address: {
        line1: form.line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pin: form.pin.trim(),
      },
      occupation: form.occupation.trim(),
      annualIncome: Number(form.annualIncome),
    };
    const documents = DOC_TYPES.map((d) => ({
      name: docs[d.type].name,
      type: d.type,
      state: 'UPLOADED',
    }));
    try {
      await submitKyc(customerId, payload, documents);
      setJustSubmitted(true);
      setEditing(false);
      setConsent(false);
      setRefresh((r) => r + 1);
      toast({ title: 'KYC submitted', body: 'Your details are now pending review by a FinEdge officer.' });
    } catch (err) {
      setFormError(err?.message || 'We could not submit your KYC. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const addressText = customer.address
    ? [customer.address.line1, customer.address.line2, customer.address.city, customer.address.state, customer.address.pin].filter(Boolean).join(', ')
    : '';

  return (
    <div className="space-y-6">
      <SectionHeader
        titleAs="h1"
        eyebrow="KYC"
        title="Know Your Customer"
        description="Your identity record with FinEdge. Document verification on this platform is a simulation — an officer reviews what you submit before your status changes."
      />
      <FormError message={loadError} />

      {/* Status band */}
      <Card className="border-midnight-200 bg-midnight-50 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs font-medium text-ink-500">KYC status</p>
            <div className="mt-1"><StatusChip status={kycStatus} /></div>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-500">Case ID</p>
            <p className="tnum mt-1 text-sm font-semibold text-ink-900">{kycCase?.id || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-500">Submitted on</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{kycCase?.submittedAt ? formatDateTime(kycCase.submittedAt) : '—'}</p>
          </div>
          {kycStatus === 'PENDING' && (
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-midnight-700" aria-hidden />
              Your KYC is pending. A FinEdge officer will review your details and documents (simulation) and update this status.
            </p>
          )}
          {!showForm && (
            <div className="ml-auto">
              <Button
                variant="secondary"
                onClick={() => { setEditing(true); setJustSubmitted(false); }}
              >
                Update KYC
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!showForm ? (
        <Card className="p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-midnight-950">Your recorded details</h3>
          <dl>
            <Row label="Full name">{customer.fullName || '—'}</Row>
            <Row label="PAN">{maskPan(customer.pan)}</Row>
            <Row label="Date of birth">{customer.dob ? formatDate(customer.dob) : '—'}</Row>
            <Row label="Mobile">{customer.mobile || '—'}</Row>
            <Row label="Email">{customer.email || '—'}</Row>
            <Row label="Address">{addressText || '—'}</Row>
            <Row label="Occupation">{customer.occupation || '—'}</Row>
            <Row label="Annual income">{customer.annualIncome != null ? formatINR(customer.annualIncome) : '—'}</Row>
          </dl>
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-semibold text-ink-800">Documents on file</p>
            {(kycCase?.documents || []).length === 0 ? (
              <p className="text-sm text-ink-500">No documents on file yet.</p>
            ) : (
              <ul className="space-y-2">
                {kycCase.documents.map((d, i) => (
                  <li key={`${d.type}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-porcelain-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-ink-800">
                      <FileText className="h-4 w-4 text-midnight-700" aria-hidden /> {d.name || statusLabel(d.type)}
                    </span>
                    <StatusChip status={d.state} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="font-display text-lg font-semibold text-midnight-950">
            {kycStatus === 'NOT_STARTED' ? 'Submit your KYC' : 'Update your KYC'}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Every field below is sent for verification. Document verification is a simulation on this platform — files are recorded by name and reviewed by an officer, not machine-verified.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
            <FormError message={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.fullName} hint="Exactly as printed on your PAN card">
                <Input type="text" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
              </Field>
              <Field label="PAN" required error={errors.pan}>
                <Input type="text" value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F" className="uppercase" error={errors.pan} />
              </Field>
              <Field label="Date of birth" required error={errors.dob}>
                <Input type="date" value={form.dob} onChange={set('dob')} error={errors.dob} />
              </Field>
              <Field label="Mobile number" required error={errors.mobile} hint="10-digit number registered with Aadhaar">
                <Input type="tel" inputMode="numeric" autoComplete="tel" value={form.mobile} onChange={set('mobile')} error={errors.mobile} />
              </Field>
            </div>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink-900">Residential address</legend>
              <Field label="Address line 1" required error={errors.line1}>
                <Input type="text" autoComplete="street-address" value={form.line1} onChange={set('line1')} placeholder="Flat, building, street" error={errors.line1} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="City" required error={errors.city}>
                  <Input type="text" value={form.city} onChange={set('city')} error={errors.city} />
                </Field>
                <Field label="State" required error={errors.state}>
                  <Input type="text" value={form.state} onChange={set('state')} error={errors.state} />
                </Field>
                <Field label="PIN code" required error={errors.pin}>
                  <Input type="text" inputMode="numeric" value={form.pin} onChange={set('pin')} placeholder="6-digit PIN" error={errors.pin} />
                </Field>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Occupation" required error={errors.occupation}>
                <Input type="text" value={form.occupation} onChange={set('occupation')} placeholder="For example, Software engineer" error={errors.occupation} />
              </Field>
              <Field label="Annual income (₹)" required error={errors.annualIncome}>
                <Input type="number" min="1" step="1000" value={form.annualIncome} onChange={set('annualIncome')} error={errors.annualIncome} />
              </Field>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink-900">Documents</legend>
              <p className="text-[13px] leading-relaxed text-ink-500">
                Choose a file for each document. Only the file name is recorded in this simulation — the document itself is not uploaded or machine-verified.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {DOC_TYPES.map((d) => {
                  const doc = docs[d.type] || { name: '', state: '' };
                  return (
                    <div key={d.type} className="rounded-lg border border-ink-100 bg-porcelain-50 px-3 py-3">
                      <p className="text-sm font-semibold text-ink-900">{d.label}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{d.hint}</p>
                      <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-midnight-900 hover:border-midnight-400">
                        <Upload className="h-4 w-4" aria-hidden />
                        {doc.name ? 'Replace file' : 'Choose file'}
                        <input type="file" className="sr-only" onChange={onDocFile(d.type)} aria-label={`Upload ${d.label}`} />
                      </label>
                      {doc.name && (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-700">
                          <span className="break-all">{doc.name}</span>
                          <StatusChip status={doc.state || 'UPLOADED'} />
                        </p>
                      )}
                      {errors[`doc_${d.type}`] && (
                        <p className="mt-1 text-xs font-medium text-danger-600" role="alert">{errors[`doc_${d.type}`]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <Checkbox
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); setErrors((prev) => ({ ...prev, consent: undefined })); }}
              error={errors.consent}
              label="I consent to FinEdge Bank using my Aadhaar number and the documents above to verify my identity for KYC, and to an officer reviewing them for that purpose. I understand that on this demonstration platform Aadhaar and document verification are a simulation — no real verification is performed against any government database, and no document file leaves this device; only the file names I select are recorded."
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={submitting} disabled={!consent}>
                Submit KYC for review
              </Button>
              {(editing || kycStatus === 'VERIFIED') && (
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
            {!consent && (
              <p className="text-xs text-ink-500">The submit button enables once you give the Aadhaar consent above.</p>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}
