import React, { useState } from 'react';
import { Button, Card, Field, FormError, Input, Modal, useToast } from '../ui.jsx';
import { ACCOUNTS } from '../../data/products.js';
import { applyAccount } from '../../services/portalBridge.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatINR } from '../../lib/format.js';
import { Landmark, CheckCircle2 } from 'lucide-react';

export function InPortalAccountApplyModal({ open, onClose, onApplied }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSlug, setSelectedSlug] = useState('everyday-savings');
  const [initialDeposit, setInitialDeposit] = useState('10000');
  const [branch, setBranch] = useState('FinEdge Digital Branch, Mumbai');
  const [nomineeName, setNomineeName] = useState('Nominee on file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const selectedProduct = ACCOUNTS.find(a => a.slug === selectedSlug) || ACCOUNTS[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.customerId) {
      setError('Please sign in to apply for an account.');
      return;
    }
    const depositNum = Number(initialDeposit);
    if (isNaN(depositNum) || depositNum < 1000) {
      setError('Initial deposit must be at least ₹1,000.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const app = await applyAccount(user.customerId, {
        accountType: selectedProduct.name,
        productCode: selectedProduct.slug.toUpperCase().replace(/-/g, '_'),
        productName: selectedProduct.name,
        initialFunding: depositNum,
        branch,
        nominee: { fullName: nomineeName || 'Nominee on file', relationship: 'Family' }
      });
      setSuccess(app);
      toast({
        tone: 'success',
        title: 'Account application submitted',
        body: `Application ${app.id} for ${selectedProduct.name} submitted successfully.`
      });
      if (onApplied) onApplied(app);
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to submit account application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Apply for an Account"
      footer={
        success ? (
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              Submit Application
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-sans text-lg font-bold text-ink-900">Application Submitted</h3>
          <p className="text-sm text-ink-600">
            Your application for <strong>{success.productName}</strong> has been received under reference{' '}
            <span className="font-mono font-semibold text-ink-900">{success.id}</span>. It is now under review by operations.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError message={error} />
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-2">
              Select Account Product <span className="text-danger-600">*</span>
            </label>
            <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
              {ACCOUNTS.map((acc) => {
                const isSelected = selectedSlug === acc.slug;
                return (
                  <button
                    key={acc.slug}
                    type="button"
                    onClick={() => setSelectedSlug(acc.slug)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-bank-primary bg-bank-primary-light/30 ring-1 ring-bank-primary'
                        : 'border-ink-200 bg-white hover:border-ink-300'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-bank-primary text-white' : 'bg-porcelain-100 text-ink-600'}`}>
                      <Landmark className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{acc.name}</p>
                      <p className="text-xs text-ink-500 line-clamp-1">{acc.tagline || acc.overview}</p>
                      {acc.amb && (
                        <p className="mt-1 text-[11px] font-medium text-bank-primary">
                          Min balance: {typeof acc.amb === 'object' ? (acc.amb.label || (acc.amb.amount ? formatINR(acc.amb.amount) : 'Zero balance')) : String(acc.amb)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Initial Deposit (₹)" required hint="Minimum ₹1,000">
              <Input
                type="number"
                min="1000"
                step="500"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                placeholder="10000"
              />
            </Field>

            <Field label="Branch Location">
              <Input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="FinEdge Digital Branch, Mumbai"
              />
            </Field>
          </div>

          <Field label="Nominee Full Name" hint="Registered with account documentation">
            <Input
              type="text"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="Nominee on file"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export default InPortalAccountApplyModal;
