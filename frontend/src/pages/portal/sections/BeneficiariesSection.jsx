import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button, Card, EmptyState, Field, FormError, Input, Modal, PageLoading, SectionHeader, Table, useToast } from '../../../components/ui.jsx';
import { formatDate, maskAccount } from '../../../lib/format.js';
import { addBeneficiary, deleteBeneficiary, listAccounts, listBeneficiaries } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMPTY_FORM = { name: '', accountNumber: '', confirmAccountNumber: '', ifsc: '', bankName: '' };

export default function BeneficiariesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  useDbTick();

  const [beneficiaries, setBeneficiaries] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(() => {
    traceData('PortalBeneficiaries');
    if (!user?.customerId) return;
    Promise.all([
      listBeneficiaries(user.customerId),
      listAccounts(user.customerId)
    ])
      .then(([bens, accs]) => {
        setBeneficiaries(bens || []);
        setAccounts(accs || []);
      })
      .catch((e) => setLoadError(e.message || 'We could not load your beneficiaries.'));
  }, [user?.customerId]);

  useEffect(load, [load]);

  const set = (key) => (e) => {
    const value = key === 'ifsc' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    const next = {};
    const acct = form.accountNumber.replace(/\s/g, '');
    if (!form.name.trim()) next.name = 'Enter the beneficiary’s full name.';
    if (!acct) next.accountNumber = 'Enter the account number.';
    else if (!/^\d+$/.test(acct)) next.accountNumber = 'Account numbers contain digits only.';
    else if (acct.length < 9 || acct.length > 18) next.accountNumber = 'Account numbers are 9 to 18 digits.';
    if (!form.confirmAccountNumber) next.confirmAccountNumber = 'Re-enter the account number to confirm it.';
    else if (form.confirmAccountNumber.replace(/\s/g, '') !== acct) next.confirmAccountNumber = 'The account numbers do not match.';
    if (!form.ifsc.trim()) next.ifsc = 'Enter the IFSC.';
    else if (!IFSC_RE.test(form.ifsc.trim())) next.ifsc = 'Enter a valid IFSC — 4 letters, then 0, then 6 letters or digits (e.g. FEDG0004521).';
    if (!form.bankName.trim()) next.bankName = 'Enter the bank name.';

    // Check if adding own account
    const isOwn = (accounts || []).some((a) => {
      const cleanRaw = (a.rawAccountNumber || a.accountNumber || '').replace(/[^0-9]/g, '');
      const cleanInput = acct.replace(/[^0-9]/g, '');
      return cleanRaw && cleanInput && (cleanRaw === cleanInput || cleanRaw.endsWith(cleanInput) || cleanInput.endsWith(cleanRaw));
    });
    if (isOwn) {
      next.accountNumber = 'You cannot add your own account as a beneficiary.';
    }

    // Check duplicate account number + IFSC
    const isDuplicate = (beneficiaries || []).some((b) => {
      const bAcct = (b.accountNumber || '').replace(/[^0-9]/g, '');
      const inputAcct = acct.replace(/[^0-9]/g, '');
      const bIfsc = (b.ifsc || b.ifscCode || '').toUpperCase();
      const inputIfsc = form.ifsc.trim().toUpperCase();
      return bAcct === inputAcct && bIfsc === inputIfsc;
    });
    if (isDuplicate) {
      next.accountNumber = 'You already have a beneficiary with this account.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    traceForm('AddBeneficiary', {
      name: form.name.trim(),
      accountNumber: form.accountNumber.replace(/\s/g, ''),
      ifsc: form.ifsc.trim(),
      bankName: form.bankName.trim(),
    });
    setAdding(true);
    try {
      const ben = await addBeneficiary(user.customerId, {
        name: form.name.trim(),
        accountNumber: form.accountNumber.replace(/\s/g, ''),
        ifsc: form.ifsc.trim(),
        bankName: form.bankName.trim(),
      });
      toast({ title: 'Beneficiary added', body: `${ben.name} · ${ben.bankName} · ${maskAccount(ben.accountNumber)}` });
      setForm(EMPTY_FORM);
      setErrors({});
      load();
    } catch (err) {
      setFormError(err.message || 'We could not add this beneficiary. Please check the details and try again.');
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    traceForm('DeleteBeneficiary', { beneficiaryId: deleteTarget.id, name: deleteTarget.name });
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteBeneficiary(user.customerId, deleteTarget.id);
      toast({ title: 'Beneficiary removed', body: `${deleteTarget.name} is no longer in your beneficiary list.` });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err.message || 'We could not remove this beneficiary. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('add-beneficiary-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('beneficiary-name')?.focus({ preventScroll: true });
  };

  const columns = [
    {
      key: 'name',
      label: 'Beneficiary',
      render: (b) => (
        <span>
          <span className="block font-medium text-ink-900">{b.name}</span>
          {b.nickname && <span className="block text-xs text-ink-500">{b.nickname}</span>}
        </span>
      ),
    },
    {
      key: 'accountNumber',
      label: 'Account',
      render: (b) => (
        <span>
          <span className="tnum block">{maskAccount(b.accountNumber)}</span>
          <span className="block text-xs text-ink-500">{b.bankName || '—'}</span>
        </span>
      ),
    },
    { key: 'ifsc', label: 'IFSC', render: (b) => <span className="tnum">{b.ifsc || '—'}</span> },
    { key: 'added', label: 'Added', render: (b) => formatDate(b.createdAt || b.addedAt) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (b) => (
        <Button variant="danger" size="sm" onClick={() => { setDeleteError(''); setDeleteTarget(b); }}>
          <Trash2 className="h-4 w-4" aria-hidden /> Remove
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Payments"
        title="Beneficiaries"
        description="People and businesses you pay regularly. Transfers to a beneficiary use the account details saved here, so check them carefully before adding."
      />

      <FormError message={loadError} />

      {beneficiaries === null && !loadError ? (
        <PageLoading />
      ) : (
        <Table
          columns={columns}
          rows={beneficiaries || []}
          rowKey={(b) => b.id}
          empty={
            <EmptyState
              icon={Users}
              title="No beneficiaries yet"
              body="Add the first person or business you want to pay. You will need their account number, IFSC and bank name."
              action={<Button onClick={scrollToForm}><Plus className="h-4 w-4" aria-hidden /> Add a beneficiary</Button>}
            />
          }
        />
      )}

      <Card id="add-beneficiary-form" className="mt-6 scroll-mt-6 px-5 py-5">
        <h2 className="font-display text-xl font-semibold text-midnight-950">Add a beneficiary</h2>
        <p className="mt-1 text-sm text-ink-600">Details are taken from the beneficiary’s bank records. The account number must be entered twice so a typing mistake cannot send money to the wrong account.</p>

        <form onSubmit={submit} noValidate className="mt-5 grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}>
              <Input id="beneficiary-name" value={form.name} error={errors.name} placeholder="e.g. Sunita Mehta" onChange={set('name')} />
            </Field>
            <Field label="Bank name" required error={errors.bankName}>
              <Input value={form.bankName} error={errors.bankName} placeholder="e.g. Janata Sahakari Bank" onChange={set('bankName')} />
            </Field>
            <Field label="Account number" required error={errors.accountNumber}>
              <Input className="tnum" inputMode="numeric" value={form.accountNumber} error={errors.accountNumber} placeholder="9 to 18 digits" onChange={set('accountNumber')} />
            </Field>
            <Field label="Re-enter account number" required error={errors.confirmAccountNumber}>
              <Input className="tnum" inputMode="numeric" value={form.confirmAccountNumber} error={errors.confirmAccountNumber} placeholder="Same account number again" onChange={set('confirmAccountNumber')} />
            </Field>
            <Field label="IFSC" required error={errors.ifsc} hint="11 characters — for FinEdge accounts it starts with FEDG.">
              <Input className="tnum uppercase" value={form.ifsc} error={errors.ifsc} placeholder="e.g. FEDG0004521" maxLength={11} onChange={set('ifsc')} />
            </Field>
          </div>

          <FormError message={formError} />

          <div>
            <Button type="submit" loading={adding}>
              <Plus className="h-4 w-4" aria-hidden /> Add beneficiary
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Remove beneficiary"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>Remove beneficiary</Button>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-ink-700">
          Remove <span className="font-semibold text-ink-900">{deleteTarget?.name}</span>
          {deleteTarget ? <> ({deleteTarget.bankName || '—'} · {maskAccount(deleteTarget.accountNumber)})</> : null} from your
          beneficiaries? You can add them again later, but any transfer you were preparing to them will need to be started again.
        </p>
        <div className="mt-4">
          <FormError message={deleteError} />
        </div>
      </Modal>
    </div>
  );
}
