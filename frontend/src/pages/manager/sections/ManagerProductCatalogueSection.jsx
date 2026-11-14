import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';

import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Field,
  EmptyState,
  PageLoading,
  Modal,
  Table,
  StatusChip,
  useToast,
} from '../../../components/ui.jsx';

import { formatINR, formatINRWhole, formatDateTime } from '../../../lib/format.js';
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminSetProductStatus,
  adminDeleteProduct,
} from '../../../services/managerBridge.js';
import {
  Package,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Landmark,
  Receipt,
} from 'lucide-react';

export default function ManagerProductCatalogueSection() {
  const { managerUser } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('account'); // 'account' | 'loan' | 'card' | 'investment'
  const [search, setSearch] = useState('');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'account',
    tagline: '',
    overview: '',
    accountType: 'savings',
    amb: 10000,
    penalty: '₹250/mo below AMB',
    debitCardAnnualFee: 299,
    rateMin: 3.25,
    rateMax: 6.75,
    amountMin: 10000,
    amountMax: 5000000,
    annualFee: 499,
    joiningFee: 499,
    cardType: 'credit',
    kind: 'FD',
    rate: 7.10,
    features: 'Zero balance maintenance option\nComplimentary airport lounge access',
    eligibility: 'Resident Indian individual\nAge 18 to 65 years',
    documents: 'PAN card\nAadhaar card for proof of address',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Status Modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [productForStatus, setProductForStatus] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadProducts = async () => {
    traceData('ManagerProductCatalogue');
    try {
      setLoading(true);
      setError('');
      const list = await adminListProducts();
      console.log(list)
      setProducts(list);
      console.log(products)
    } catch (e) {
      console.log(e)
      setError(e.detail || e.message || 'Could not load products catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [p.name, p.slug, p.tagline, p.overview, p.category].map((v) =>
        (v || '').toLowerCase()
      );
      return haystack.some((v) => v.includes(q));
    });
  }, [products, activeCategory, search]);

  const openAddModal = () => {
    setEditingSlug(null);
    setFormError('');
    setForm({
      name: '',
      category: activeCategory,
      tagline: 'Tailored for everyday banking needs',
      overview: 'Comprehensive financial solution with premier privileges and digital convenience.',
      accountType: 'savings',
      amb: 10000,
      penalty: '₹250/mo below AMB',
      debitCardAnnualFee: 299,
      rateMin: 3.5,
      rateMax: 7.0,
      amountMin: 25000,
      amountMax: 5000000,
      annualFee: 499,
      joiningFee: 499,
      cardType: 'credit',
      kind: 'FD',
      rate: 7.15,
      features: 'Full digital onboarding\nComplimentary cyber insurance',
      eligibility: 'Resident Indian individual\nAge 18 to 65 years',
      documents: 'PAN card\nAadhaar card',
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingSlug(p.slug);
    setFormError('');
    setForm({
      name: p.name || '',
      category: p.category || activeCategory,
      tagline: p.tagline || '',
      overview: p.overview || '',
      accountType: p.accountType || 'savings',
      amb: p.amb || 10000,
      penalty: p.penalty || '₹250/mo below AMB',
      debitCardAnnualFee: p.debitCardAnnualFee != null ? p.debitCardAnnualFee : 299,
      rateMin: p.rateMin != null ? p.rateMin : 3.5,
      rateMax: p.rateMax != null ? p.rateMax : 7.0,
      amountMin: p.amountMin != null ? p.amountMin : 25000,
      amountMax: p.amountMax != null ? p.amountMax : 5000000,
      annualFee: p.annualFee != null ? p.annualFee : 0,
      joiningFee: p.joiningFee != null ? p.joiningFee : 0,
      cardType: p.cardType || 'credit',
      kind: p.kind || 'FD',
      rate: p.rate != null ? p.rate : 7.0,
      features: Array.isArray(p.features) ? p.features.join('\n') : (p.features || ''),
      eligibility: Array.isArray(p.eligibility) ? p.eligibility.join('\n') : (p.eligibility || ''),
      documents: Array.isArray(p.documents) ? p.documents.join('\n') : (p.documents || ''),
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    traceForm('ProductCatalogueSave', form);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        tagline: form.tagline.trim(),
        overview: form.overview.trim(),
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
        eligibility: form.eligibility.split('\n').map((s) => s.trim()).filter(Boolean),
        documents: form.documents.split('\n').map((s) => s.trim()).filter(Boolean),
      };

      if (form.category === 'account') {
        payload.accountType = form.accountType;
        payload.amb = Number(form.amb);
        payload.penalty = form.penalty;
        payload.debitCardAnnualFee = Number(form.debitCardAnnualFee);
        payload.rateSlabs = [
          { min: 0, max: 100000, rate: Number(form.rateMin), label: 'Up to ₹1 lakh' },
          { min: 100000, max: 1000000, rate: Number(form.rateMax), label: '₹1 lakh to ₹10 lakh' },
          { min: 1000000, max: null, rate: Number(form.rateMax), label: 'Above ₹10 lakh' },
        ];
      } else if (form.category === 'loan') {
        payload.rateMin = Number(form.rateMin);
        payload.rateMax = Number(form.rateMax);
        payload.amountMin = Number(form.amountMin);
        payload.amountMax = Number(form.amountMax);
      } else if (form.category === 'card') {
        payload.cardType = form.cardType;
        payload.annualFee = Number(form.annualFee);
        payload.joiningFee = Number(form.joiningFee);
      } else if (form.category === 'investment') {
        payload.kind = form.kind;
        payload.rate = Number(form.rate);
      }

      if (editingSlug) {
        await adminUpdateProduct(editingSlug, payload, 'Admin updated product attributes');
        toast({ title: 'Product Updated', body: `Saved changes to product ${payload.name}.` });
      } else {
        const created = await adminCreateProduct(payload);
        toast({ title: 'Product Created', body: `Product "${created.name}" is now live in the catalogue.` });
      }

      setModalOpen(false);
      loadProducts();
    } catch (err) {
      setFormError(err.detail || err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!productForStatus) return;
    setStatusUpdating(true);
    const nextStatus = productForStatus.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adminSetProductStatus(productForStatus.slug, nextStatus, statusReason.trim() || 'Admin toggled status');
      toast({
        title: `Product ${nextStatus === 'ACTIVE' ? 'Reactivated' : 'Deactivated'}`,
        body: `${productForStatus.name} is now ${nextStatus.toLowerCase()}.`,
      });
      setStatusModalOpen(false);
      setProductForStatus(null);
      setStatusReason('');
      loadProducts();
    } catch (err) {
      toast({ tone: 'error', title: 'Status Update Failed', body: err.detail || err.message });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminDeleteProduct(productToDelete.slug);
      toast({
        title: 'Product Deleted',
        body: `Unused product "${productToDelete.name}" has been permanently removed.`,
      });
      setDeleteModalOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (err) {
      setDeleteError(err.detail || err.message || 'Cannot delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const getHeadlineFact = (p) => {
    if (p.category === 'account') {
      if (p.rateSlabs && p.rateSlabs.length > 0) {
        const top = Math.max(...p.rateSlabs.map((s) => s.rate));
        return `Up to ${top.toFixed(2)}% p.a.`;
      }
      return 'Standard Savings';
    }
    if (p.category === 'loan') {
      if (p.rateMin != null) return `From ${p.rateMin.toFixed(2)}% p.a.`;
      return 'Competitive Rates';
    }
    if (p.category === 'card') {
      if (p.annualFee === 0) return 'No annual fee';
      if (p.annualFee != null) return `₹${p.annualFee}/yr`;
      return 'Free Lifetime';
    }
    if (p.category === 'investment') {
      if (p.rate != null) return `${p.rate.toFixed(2)}% p.a.`;
      if (p.rateGrid && p.rateGrid.length > 0) {
        const top = Math.max(...p.rateGrid.map((r) => r.general));
        return `Up to ${top.toFixed(2)}% p.a.`;
      }
      return 'Guaranteed Returns';
    }
    return '—';
  };

  const columns = [
    {
      key: 'name',
      label: 'Product & Slug',
      render: (p) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-ink-900">{p.name}</span>
            {p.status === 'INACTIVE' && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Discontinued
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-ink-500">{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'rateFee',
      label: 'Headline Rate / Fee',
      render: (p) => <span className="font-semibold text-xs text-midnight-950">{getHeadlineFact(p)}</span>,
    },
    {
      key: 'limits',
      label: 'Limits / AMB',
      render: (p) => {
        if (p.category === 'account') {
          return <span className="text-xs text-ink-700">AMB {formatINR(p.amb || 0)}</span>;
        }
        if (p.category === 'loan') {
          return (
            <span className="text-xs text-ink-700">
              {formatINRWhole(p.amountMin || 10000)} — {formatINRWhole(p.amountMax || 5000000)}
            </span>
          );
        }
        if (p.category === 'card') {
          return <span className="text-xs text-ink-700">{p.cardType === 'credit' ? 'Credit Card' : 'Debit Card'}</span>;
        }
        return <span className="text-xs text-ink-500">—</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            p.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          {p.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Administration',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openEditModal(p)} title="Edit product parameters">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setProductForStatus(p);
              setStatusReason('');
              setStatusModalOpen(true);
            }}
            title={p.status === 'ACTIVE' ? 'Deactivate product' : 'Reactivate product'}
          >
            {p.status === 'ACTIVE' ? <PowerOff className="h-3.5 w-3.5 text-amber-600" /> : <Power className="h-3.5 w-3.5 text-emerald-600" />}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setProductToDelete(p);
              setDeleteError('');
              setDeleteModalOpen(true);
            }}
            title="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5 text-danger-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        titleAs="h1"
        eyebrow="Administration"
        title="Product Catalogue"
        description="Unified financial product catalogue. Manage dynamic retail banking products, configure rates and charges, and control lifecycle propagation across public and authenticated surfaces."
        action={
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Product
          </Button>
        }
      />

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-ink-200 pb-3">
        <div className="flex gap-2">
          {[
            { id: 'account', label: 'Savings & Current Accounts', icon: Landmark },
            { id: 'loan', label: 'Retail Lending & Loans', icon: Receipt },
            { id: 'card', label: 'Credit & Debit Cards', icon: CreditCard },
            { id: 'investment', label: 'Term Deposits & Wealth', icon: TrendingUp },
          ].map((cat) => {
            const isCurrent = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-midnight-900 text-white shadow-xs'
                    : 'bg-white text-ink-700 border border-ink-200 hover:border-gold-300'
                }`}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input
            className="pl-8 text-xs py-1.5"
            placeholder="Search category products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <EmptyState variant="error" icon={Package} title="Could not load catalogue" body={error} />
      ) : loading ? (
        <PageLoading />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products in this category"
          body="Use the Add Product button above to instantiate new retail banking offerings."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table columns={columns} rows={filteredProducts} rowKey={(p) => p.slug} />
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSlug ? `Edit Product: ${form.name}` : `Add New ${form.category.toUpperCase()} Product`}
          size="lg"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Category" required>
                <Select
                  value={form.category}
                  disabled={Boolean(editingSlug)}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="account">Account (Savings / Current)</option>
                  <option value="loan">Loan (Home / Auto / Gold / Personal)</option>
                  <option value="card">Card (Credit / Debit)</option>
                  <option value="investment">Investment (FD / RD / SIP / SSY)</option>
                </Select>
              </Field>

              <Field label="Product Marketing Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. FinEdge Premier Wealth Savings"
                  required
                />
              </Field>
            </div>

            <Field label="Headline Tagline" required>
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="e.g. Higher yields with zero minimum balance friction"
                required
              />
            </Field>

            <Field label="Product Overview / Description" required>
              <textarea
                value={form.overview}
                onChange={(e) => setForm({ ...form, overview: e.target.value })}
                placeholder="Comprehensive description of product features..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={2}
                required
              />
            </Field>

            {/* Category-Specific Real Schemas (Spec E2) */}
            {form.category === 'account' && (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3 space-y-3">
                <p className="font-semibold text-midnight-950 uppercase text-xs tracking-wider">
                  Account Financial Schema & Slabs
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Account Type">
                    <Select
                      value={form.accountType}
                      onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    >
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                      <option value="salary">Salary Account</option>
                    </Select>
                  </Field>
                  <Field label="Average Monthly Balance (₹)">
                    <Input
                      type="number"
                      value={form.amb}
                      onChange={(e) => setForm({ ...form, amb: e.target.value })}
                      min="0"
                    />
                  </Field>
                  <Field label="Base Rate Min (%)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rateMin}
                      onChange={(e) => setForm({ ...form, rateMin: e.target.value })}
                      min="0"
                      max="30"
                    />
                  </Field>
                  <Field label="Top Slab Rate (%)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rateMax}
                      onChange={(e) => setForm({ ...form, rateMax: e.target.value })}
                      min="0"
                      max="30"
                    />
                  </Field>
                </div>
              </div>
            )}

            {form.category === 'loan' && (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3 space-y-3">
                <p className="font-semibold text-midnight-950 uppercase text-xs tracking-wider">
                  Loan Rate & Principal Sizing
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Min Rate (%)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rateMin}
                      onChange={(e) => setForm({ ...form, rateMin: e.target.value })}
                      min="0"
                      max="30"
                    />
                  </Field>
                  <Field label="Max Rate (%)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rateMax}
                      onChange={(e) => setForm({ ...form, rateMax: e.target.value })}
                      min="0"
                      max="30"
                    />
                  </Field>
                  <Field label="Min Loan Amount (₹)">
                    <Input
                      type="number"
                      value={form.amountMin}
                      onChange={(e) => setForm({ ...form, amountMin: e.target.value })}
                      min="1000"
                    />
                  </Field>
                  <Field label="Max Loan Amount (₹)">
                    <Input
                      type="number"
                      value={form.amountMax}
                      onChange={(e) => setForm({ ...form, amountMax: e.target.value })}
                      min="1000"
                    />
                  </Field>
                </div>
              </div>
            )}

            {form.category === 'card' && (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3 space-y-3">
                <p className="font-semibold text-midnight-950 uppercase text-xs tracking-wider">
                  Card Pricing & Schedule
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Card Classification">
                    <Select
                      value={form.cardType}
                      onChange={(e) => setForm({ ...form, cardType: e.target.value })}
                    >
                      <option value="credit">Credit Card</option>
                      <option value="debit">Debit Card</option>
                    </Select>
                  </Field>
                  <Field label="Annual Maintenance Fee (₹)">
                    <Input
                      type="number"
                      value={form.annualFee}
                      onChange={(e) => setForm({ ...form, annualFee: e.target.value })}
                      min="0"
                    />
                  </Field>
                  <Field label="Joining / Issuance Fee (₹)">
                    <Input
                      type="number"
                      value={form.joiningFee}
                      onChange={(e) => setForm({ ...form, joiningFee: e.target.value })}
                      min="0"
                    />
                  </Field>
                </div>
              </div>
            )}

            {form.category === 'investment' && (
              <div className="rounded-xl border border-ink-100 bg-porcelain-50 p-3 space-y-3">
                <p className="font-semibold text-midnight-950 uppercase text-xs tracking-wider">
                  Investment Yield Structure
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Investment Scheme Kind">
                    <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                      <option value="FD">Fixed Deposit (FD)</option>
                      <option value="RD">Recurring Deposit (RD)</option>
                      <option value="SIP">Systematic Investment Plan (SIP)</option>
                      <option value="SSY">Sukanya Samriddhi Yojana (SSY)</option>
                    </Select>
                  </Field>
                  <Field label="Benchmark Rate (% p.a.)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.rate}
                      onChange={(e) => setForm({ ...form, rate: e.target.value })}
                      min="0"
                      max="30"
                    />
                  </Field>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Features (one per line)">
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                />
              </Field>
              <Field label="Eligibility Criteria (one per line)">
                <textarea
                  value={form.eligibility}
                  onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                />
              </Field>
              <Field label="Required Documents (one per line)">
                <textarea
                  value={form.documents}
                  onChange={(e) => setForm({ ...form, documents: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                {editingSlug ? 'Save Product Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* STATUS TOGGLE MODAL */}
      {statusModalOpen && productForStatus && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Confirm Product ${productForStatus.status === 'ACTIVE' ? 'Deactivation' : 'Reactivation'}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              You are about to {productForStatus.status === 'ACTIVE' ? 'deactivate' : 'reactivate'} the product{' '}
              <strong>{productForStatus.name}</strong>.
              {productForStatus.status === 'ACTIVE' &&
                ' Deactivated products immediately vanish from public menus, catalogues, comparison, calculators, and apply flows. Existing customer accounts and applications will preserve the product name and carry a Discontinued marker.'}
            </p>

            <Field label="Mandatory Reason / Justification" required>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="State the regulatory or product strategy reason..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={productForStatus.status === 'ACTIVE' ? 'danger' : 'primary'}
                loading={statusUpdating}
                onClick={handleStatusToggle}
              >
                Confirm {productForStatus.status === 'ACTIVE' ? 'Deactivation' : 'Reactivation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE PRODUCT MODAL (Guarded per Spec E3) */}
      {deleteModalOpen && productToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Delete Product: ${productToDelete.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              Are you sure you want to permanently delete <strong>{productToDelete.name}</strong> (
              <code className="font-mono">{productToDelete.slug}</code>)?
            </p>

            {deleteError ? (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-800 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-danger-900">
                  <AlertTriangle className="h-4 w-4" /> Deletion Refused (Referential Integrity Guard)
                </p>
                <p className="text-xs leading-relaxed">{deleteError}</p>
                <p className="text-xs text-danger-700 italic">
                  Tip: Deactivate the product instead to discontinue future offerings while safeguarding customer history.
                </p>
              </div>
            ) : (
              <p className="text-ink-500 text-xs">
                Products that have never been referenced by any accounts, cards, loans, or applications will be purged permanently.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDeleteProduct}>
                Delete Product
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
