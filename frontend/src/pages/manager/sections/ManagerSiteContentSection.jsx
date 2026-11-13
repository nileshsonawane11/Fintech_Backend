import { traceForm, traceData } from '../../../lib/trace.js';
import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Save,
  FileText,
  Phone,
  ShieldCheck,
  Layers,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageLoading,
  SectionHeader,
  Select,
  StatusChip,
  Tabs,
  useToast
} from '../../../components/ui.jsx';
import { adminGetSiteContent, adminUpdateSiteContent } from '../../../services/managerBridge.js';
import { getProducts } from '../../../services/api.js';

export default function ManagerSiteContentSection() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('homepage');

  // Reason & Save Modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [pendingSaveKey, setPendingSaveKey] = useState(null);
  const [saveReason, setSaveReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Editable drafts per section
  const [heroDraft, setHeroDraft] = useState({ headline: '', subtext: '', primaryCtaLabel: '', primaryCtaTo: '', secondaryCtaLabel: '', secondaryCtaTo: '' });
  const [offersDraft, setOffersDraft] = useState([]);
  const [faqsDraft, setFaqsDraft] = useState([]);
  const [whyDraft, setWhyDraft] = useState([]);
  const [footerDraft, setFooterDraft] = useState({ brandTagline: '', supportPhone: '', supportEmail: '', supportHours: '', addressLines: ['', '', ''], grievanceOfficerName: '', grievanceOfficerEmail: '' });
  const [supportDraft, setSupportDraft] = useState({ introLine: '', contactRows: [] });
  const [chargesDraft, setChargesDraft] = useState({ accountServices: [], debitCardMisc: [], paymentsMisc: [], atmCashMisc: [], chequesDdMisc: [] });
  const [legalDraft, setLegalDraft] = useState({});

  const loadData = async () => {
    traceData('ManagerSiteContent');
    try {
      setLoading(true);
      const allContent = await adminGetSiteContent();
      const allProducts = getProducts({ includeInactive: true });
      setContent(allContent);
      setProducts(allProducts || []);

      if (allContent.hero) setHeroDraft(JSON.parse(JSON.stringify(allContent.hero)));
      if (allContent.offers) setOffersDraft(JSON.parse(JSON.stringify(allContent.offers)));
      if (allContent.faqs) setFaqsDraft(JSON.parse(JSON.stringify(allContent.faqs)));
      if (allContent.whyPoints) setWhyDraft(JSON.parse(JSON.stringify(allContent.whyPoints)));
      if (allContent.footer) {
        const f = JSON.parse(JSON.stringify(allContent.footer));
        if (!Array.isArray(f.addressLines)) f.addressLines = ['', '', ''];
        setFooterDraft(f);
      }
      if (allContent.support) setSupportDraft(JSON.parse(JSON.stringify(allContent.support)));
      if (allContent.charges) setChargesDraft(JSON.parse(JSON.stringify(allContent.charges)));
      if (allContent.legalPages) setLegalDraft(JSON.parse(JSON.stringify(allContent.legalPages)));
    } catch (err) {
      console.error('Failed to load site content', err);
      addToast(err.detail || err.message || 'Failed to load site content', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openSaveModal = (key) => {
    setValidationError('');
    setSaveReason('');

    // Pre-save validation
    if (key === 'hero') {
      if (!heroDraft.headline?.trim()) {
        setValidationError('Homepage hero headline cannot be empty.');
        return;
      }
      if (!heroDraft.subtext?.trim()) {
        setValidationError('Homepage hero subtext cannot be empty.');
        return;
      }
      if (!heroDraft.primaryCtaLabel?.trim()) {
        setValidationError('Primary CTA label cannot be empty.');
        return;
      }
    } else if (key === 'offers') {
      const productSlugs = new Set(products.map((p) => p.slug));
      for (const off of offersDraft) {
        if (!off.title?.trim()) {
          setValidationError('All seasonal offers must have a title.');
          return;
        }
        if (!off.summary?.trim()) {
          setValidationError('All seasonal offers must have a summary.');
          return;
        }
        const s = off.productSlug || off.linkedProductSlug;
        if (s && !productSlugs.has(s)) {
          setValidationError(`Linked product slug "${s}" does not exist in the catalogue. Please select an existing product.`);
          return;
        }
      }
    } else if (key === 'faqs') {
      for (const faq of faqsDraft) {
        if (!faq.q?.trim() || !faq.a?.trim()) {
          setValidationError('All FAQs must contain both a question and an answer.');
          return;
        }
      }
    } else if (key === 'whyPoints') {
      for (const wp of whyDraft) {
        if (!wp.title?.trim() || !wp.body?.trim()) {
          setValidationError('All Why FinEdge points must contain both a title and descriptive body.');
          return;
        }
      }
    } else if (key === 'footer') {
      if (footerDraft.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(footerDraft.supportEmail.trim())) {
        setValidationError('Support email must be a valid email address.');
        return;
      }
      if (footerDraft.grievanceOfficerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(footerDraft.grievanceOfficerEmail.trim())) {
        setValidationError('Grievance Officer email must be a valid email address.');
        return;
      }
      if (!footerDraft.supportPhone?.trim()) {
        setValidationError('Support phone number is required.');
        return;
      }
    } else if (key === 'legalPages') {
      for (const [slug, page] of Object.entries(legalDraft)) {
        if (!Array.isArray(page.sections) || page.sections.length === 0) {
          setValidationError(`Legal page "${slug}" must retain at least one section.`);
          return;
        }
        for (const sec of page.sections) {
          if (!Array.isArray(sec.paragraphs) || sec.paragraphs.length === 0 || !sec.paragraphs.some((p) => p && p.trim())) {
            setValidationError(`Section "${sec.heading || sec.id}" on page "${slug}" must contain at least one non-empty paragraph.`);
            return;
          }
        }
      }
    }

    setPendingSaveKey(key);
    setSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    traceForm('SiteContentUpdate', { pendingSaveKey, saveReason });
    setSaving(true);
    try {
      let draftToSave = null;
      if (pendingSaveKey === 'hero') draftToSave = heroDraft;
      else if (pendingSaveKey === 'offers') draftToSave = offersDraft;
      else if (pendingSaveKey === 'faqs') draftToSave = faqsDraft;
      else if (pendingSaveKey === 'whyPoints') draftToSave = whyDraft;
      else if (pendingSaveKey === 'footer') draftToSave = footerDraft;
      else if (pendingSaveKey === 'support') draftToSave = supportDraft;
      else if (pendingSaveKey === 'charges') draftToSave = chargesDraft;
      else if (pendingSaveKey === 'legalPages') draftToSave = legalDraft;

      await adminUpdateSiteContent(pendingSaveKey, draftToSave, saveReason.trim());
      addToast(`Site content for ${pendingSaveKey} updated successfully.`, 'success');
      setSaveModalOpen(false);
      setPendingSaveKey(null);
      setSaveReason('');
      await loadData();
    } catch (err) {
      console.error('Failed to update site content', err);
      setValidationError(err.detail || err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Helper actions for list editors
  const moveItem = (list, setList, idx, dir) => {
    const next = [...list];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    next.forEach((item, i) => { item.order = i + 1; });
    setList(next);
  };

  const deleteItem = (list, setList, idx) => {
    const next = list.filter((_, i) => i !== idx);
    next.forEach((item, i) => { item.order = i + 1; });
    setList(next);
  };

  if (loading) return <PageLoading message="Loading site content administration..." />;

  const subTabs = [
    { id: 'homepage', label: 'Homepage' },
    { id: 'footer', label: 'Footer & Contact' },
    { id: 'charges', label: 'Charges (Non-Product)' },
    { id: 'legal', label: 'Legal Pages' },
    { id: 'support', label: 'Support Content' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Administration"
        title="Site Content Management"
        description="Admin-controlled structured content blocks across FinEdge public and customer channels. Changes update consuming surfaces dynamically."
      />

      <Tabs tabs={subTabs} active={activeTab} onChange={setActiveTab} />

      {/* ====================================================================== */}
      {/* TAB 1: HOMEPAGE (Hero, Offers, FAQs, Why Points) */}
      {/* ====================================================================== */}
      {activeTab === 'homepage' && (
        <div className="space-y-8">
          {/* Hero Block */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">Homepage Hero Banner</h3>
                <p className="text-xs text-ink-500 mt-0.5">Primary value proposition, subtext and CTA buttons above the fold.</p>
              </div>
              <Button variant="primary" onClick={() => openSaveModal('hero')} className="min-h-11">
                <Save className="h-4 w-4 mr-2" /> Save Hero Block
              </Button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Hero Headline" required hint="Primary display headline (H1) on desktop and mobile">
                  <Input
                    value={heroDraft.headline}
                    onChange={(e) => setHeroDraft({ ...heroDraft, headline: e.target.value })}
                    placeholder="Enter engaging headline..."
                    required
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Hero Subtext" required hint="Explanatory narrative underneath the main headline">
                  <textarea
                    value={heroDraft.subtext}
                    onChange={(e) => setHeroDraft({ ...heroDraft, subtext: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-ink-300 p-3 text-xs focus:border-midnight-500 focus:outline-hidden"
                    placeholder="Enter descriptive copy..."
                    required
                  />
                </Field>
              </div>

              <Field label="Primary CTA Label" required>
                <Input
                  value={heroDraft.primaryCtaLabel}
                  onChange={(e) => setHeroDraft({ ...heroDraft, primaryCtaLabel: e.target.value })}
                  placeholder="e.g. Open an account"
                  required
                />
              </Field>

              <Field label="Primary CTA Link Path" required>
                <Input
                  value={heroDraft.primaryCtaTo}
                  onChange={(e) => setHeroDraft({ ...heroDraft, primaryCtaTo: e.target.value })}
                  placeholder="e.g. /accounts"
                  required
                />
              </Field>

              <Field label="Secondary CTA Label">
                <Input
                  value={heroDraft.secondaryCtaLabel}
                  onChange={(e) => setHeroDraft({ ...heroDraft, secondaryCtaLabel: e.target.value })}
                  placeholder="e.g. Try the calculators"
                />
              </Field>

              <Field label="Secondary CTA Link Path">
                <Input
                  value={heroDraft.secondaryCtaTo}
                  onChange={(e) => setHeroDraft({ ...heroDraft, secondaryCtaTo: e.target.value })}
                  placeholder="e.g. /calculators"
                />
              </Field>
            </div>
          </Card>

          {/* Seasonal Offers List Editor */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">Seasonal Offers ({offersDraft.length})</h3>
                <p className="text-xs text-ink-500 mt-0.5">Manage promotional campaigns linked to catalogue products. Deleting all hides the section cleanly.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOffersDraft([
                      ...offersDraft,
                      {
                        id: `offer-${Date.now()}`,
                        title: 'New Festive Privilege',
                        category: 'Accounts',
                        productSlug: products[0]?.slug || '',
                        summary: 'Promotional terms and customer benefit statement.',
                        highlight: 'Limited Time Perk',
                        validTill: '2027-03-31',
                        active: true,
                      },
                    ]);
                  }}
                  className="min-h-11"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Offer
                </Button>
                <Button variant="primary" onClick={() => openSaveModal('offers')} className="min-h-11">
                  <Save className="h-4 w-4 mr-2" /> Save Offers
                </Button>
              </div>
            </div>

            {offersDraft.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
                <p className="text-xs text-ink-500">No seasonal offers active. The offers section on the homepage is hidden cleanly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {offersDraft.map((offer, idx) => (
                  <div key={offer.id || idx} className="rounded-xl border border-ink-200 p-4 bg-porcelain-50/50 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-midnight-900 text-xs font-bold text-porcelain-50">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-midnight-950">{offer.title || 'Untitled Offer'}</span>
                        <StatusChip status={offer.active ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(offersDraft, setOffersDraft, idx, -1)}
                          disabled={idx === 0}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(offersDraft, setOffersDraft, idx, 1)}
                          disabled={idx === offersDraft.length - 1}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(offersDraft, setOffersDraft, idx)}
                          className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                          title="Delete offer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Offer Title" required>
                        <Input
                          value={offer.title}
                          onChange={(e) => {
                            const next = [...offersDraft];
                            next[idx].title = e.target.value;
                            setOffersDraft(next);
                          }}
                        />
                      </Field>

                      <Field label="Linked Catalogue Product" hint="Must belong to Product Catalogue">
                        <Select
                          value={offer.productSlug || offer.linkedProductSlug || ''}
                          onChange={(e) => {
                            const next = [...offersDraft];
                            next[idx].productSlug = e.target.value;
                            next[idx].linkedProductSlug = e.target.value;
                            setOffersDraft(next);
                          }}
                        >
                          <option value="">-- No Linked Product --</option>
                          {products.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name} ({p.slug})
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Privilege Highlight Badge">
                        <Input
                          value={offer.highlight || ''}
                          onChange={(e) => {
                            const next = [...offersDraft];
                            next[idx].highlight = e.target.value;
                            setOffersDraft(next);
                          }}
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Summary Description" required>
                          <Input
                            value={offer.summary}
                            onChange={(e) => {
                              const next = [...offersDraft];
                              next[idx].summary = e.target.value;
                              setOffersDraft(next);
                            }}
                          />
                        </Field>
                      </div>

                      <div className="flex items-center gap-4 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-800">
                          <input
                            type="checkbox"
                            checked={offer.active !== false}
                            onChange={(e) => {
                              const next = [...offersDraft];
                              next[idx].active = e.target.checked;
                              setOffersDraft(next);
                            }}
                            className="h-4 w-4 rounded border-ink-300 text-midnight-600"
                          />
                          Active Campaign
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* FAQs List Editor */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">Frequently Asked Questions ({faqsDraft.length})</h3>
                <p className="text-xs text-ink-500 mt-0.5">Customer-facing Q&A accordion. Zero active FAQs hides the section cleanly.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFaqsDraft([
                      ...faqsDraft,
                      {
                        id: `faq-${Date.now()}`,
                        q: 'New Question?',
                        a: 'Clear, direct answer explaining policy or process.',
                        order: faqsDraft.length + 1,
                        active: true,
                      },
                    ]);
                  }}
                  className="min-h-11"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add FAQ
                </Button>
                <Button variant="primary" onClick={() => openSaveModal('faqs')} className="min-h-11">
                  <Save className="h-4 w-4 mr-2" /> Save FAQs
                </Button>
              </div>
            </div>

            {faqsDraft.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
                <p className="text-xs text-ink-500">No FAQs active. The FAQ section on the homepage is hidden cleanly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {faqsDraft.map((faq, idx) => (
                  <div key={faq.id || idx} className="rounded-xl border border-ink-200 p-4 bg-porcelain-50/50 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-midnight-900 text-xs font-bold text-porcelain-50">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-midnight-950">{faq.q}</span>
                        <StatusChip status={faq.active ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(faqsDraft, setFaqsDraft, idx, -1)}
                          disabled={idx === 0}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(faqsDraft, setFaqsDraft, idx, 1)}
                          disabled={idx === faqsDraft.length - 1}
                          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(faqsDraft, setFaqsDraft, idx)}
                          className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                          title="Delete FAQ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-3">
                        <Field label="Question" required>
                          <Input
                            value={faq.q}
                            onChange={(e) => {
                              const next = [...faqsDraft];
                              next[idx].q = e.target.value;
                              setFaqsDraft(next);
                            }}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-3">
                        <Field label="Answer" required>
                          <textarea
                            value={faq.a}
                            onChange={(e) => {
                              const next = [...faqsDraft];
                              next[idx].a = e.target.value;
                              setFaqsDraft(next);
                            }}
                            rows={3}
                            className="w-full rounded-lg border border-ink-300 p-3 text-xs focus:border-midnight-500 focus:outline-hidden"
                          />
                        </Field>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-800">
                          <input
                            type="checkbox"
                            checked={faq.active !== false}
                            onChange={(e) => {
                              const next = [...faqsDraft];
                              next[idx].active = e.target.checked;
                              setFaqsDraft(next);
                            }}
                            className="h-4 w-4 rounded border-ink-300 text-midnight-600"
                          />
                          Show in Accordion
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Why FinEdge Trust Points */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">Why FinEdge Trust Points ({whyDraft.length})</h3>
                <p className="text-xs text-ink-500 mt-0.5">Value pillars displayed alongside brand photography.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setWhyDraft([
                      ...whyDraft,
                      {
                        id: `why-${Date.now()}`,
                        title: 'New Value Pillar',
                        body: 'Transparent terms and customer-aligned banking philosophy.',
                        badge: 'Honest Banking',
                        linkText: 'Explore accounts',
                        linkTo: '/accounts',
                        order: whyDraft.length + 1,
                        active: true,
                      },
                    ]);
                  }}
                  className="min-h-11"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Trust Point
                </Button>
                <Button variant="primary" onClick={() => openSaveModal('whyPoints')} className="min-h-11">
                  <Save className="h-4 w-4 mr-2" /> Save Trust Points
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {whyDraft.map((point, idx) => (
                <div key={point.id || idx} className="rounded-xl border border-ink-200 p-4 bg-porcelain-50/50 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-midnight-900 text-xs font-bold text-porcelain-50">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-midnight-950">{point.title}</span>
                      <StatusChip status={point.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(whyDraft, setWhyDraft, idx, -1)}
                        disabled={idx === 0}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(whyDraft, setWhyDraft, idx, 1)}
                        disabled={idx === whyDraft.length - 1}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(whyDraft, setWhyDraft, idx)}
                        className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                        title="Delete point"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Point Title" required>
                      <Input
                        value={point.title}
                        onChange={(e) => {
                          const next = [...whyDraft];
                          next[idx].title = e.target.value;
                          setWhyDraft(next);
                        }}
                      />
                    </Field>
                    <Field label="Badge / Category">
                      <Input
                        value={point.badge || ''}
                        onChange={(e) => {
                          const next = [...whyDraft];
                          next[idx].badge = e.target.value;
                          setWhyDraft(next);
                        }}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Descriptive Body Copy" required>
                        <textarea
                          value={point.body}
                          onChange={(e) => {
                            const next = [...whyDraft];
                            next[idx].body = e.target.value;
                            setWhyDraft(next);
                          }}
                          rows={2}
                          className="w-full rounded-lg border border-ink-300 p-3 text-xs focus:border-midnight-500 focus:outline-hidden"
                        />
                      </Field>
                    </div>
                    <Field label="Action Link Text">
                      <Input
                        value={point.linkText || ''}
                        onChange={(e) => {
                          const next = [...whyDraft];
                          next[idx].linkText = e.target.value;
                          setWhyDraft(next);
                        }}
                      />
                    </Field>
                    <Field label="Action Link Path">
                      <Input
                        value={point.linkTo || ''}
                        onChange={(e) => {
                          const next = [...whyDraft];
                          next[idx].linkTo = e.target.value;
                          setWhyDraft(next);
                        }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 2: FOOTER & CONTACT */}
      {/* ====================================================================== */}
      {activeTab === 'footer' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Footer & Contact Details</h3>
              <p className="text-xs text-ink-500 mt-0.5">Brand contact points propagated to footer, Grievance desk, and Support portal.</p>
            </div>
            <Button variant="primary" onClick={() => openSaveModal('footer')} className="min-h-11">
              <Save className="h-4 w-4 mr-2" /> Save Footer & Contact
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Brand Prototype Tagline" required>
                <textarea
                  value={footerDraft.brandTagline}
                  onChange={(e) => setFooterDraft({ ...footerDraft, brandTagline: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-ink-300 p-3 text-xs focus:border-midnight-500 focus:outline-hidden"
                />
              </Field>
            </div>

            <Field label="Support Phone Number" required>
              <Input
                value={footerDraft.supportPhone}
                onChange={(e) => setFooterDraft({ ...footerDraft, supportPhone: e.target.value })}
                placeholder="1800 267 4100"
              />
            </Field>

            <Field label="Support Email Address" required hint="One source: updates footer, support & grievance">
              <Input
                type="email"
                value={footerDraft.supportEmail}
                onChange={(e) => setFooterDraft({ ...footerDraft, supportEmail: e.target.value })}
                placeholder="care@finedge.bank"
              />
            </Field>

            <Field label="Support Operating Hours" required>
              <Input
                value={footerDraft.supportHours}
                onChange={(e) => setFooterDraft({ ...footerDraft, supportHours: e.target.value })}
                placeholder="Mon–Sat, 9:00 AM – 7:00 PM IST"
              />
            </Field>

            <Field label="Grievance Officer Name" required>
              <Input
                value={footerDraft.grievanceOfficerName}
                onChange={(e) => setFooterDraft({ ...footerDraft, grievanceOfficerName: e.target.value })}
                placeholder="Rajeshwari Iyer"
              />
            </Field>

            <Field label="Grievance Officer Email" required>
              <Input
                type="email"
                value={footerDraft.grievanceOfficerEmail}
                onChange={(e) => setFooterDraft({ ...footerDraft, grievanceOfficerEmail: e.target.value })}
                placeholder="grievance.officer@finedge.bank"
              />
            </Field>

            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-ink-900">Headquarters Address Lines</label>
              {(footerDraft.addressLines || []).map((line, idx) => (
                <Input
                  key={idx}
                  value={line}
                  onChange={(e) => {
                    const next = [...(footerDraft.addressLines || [])];
                    next[idx] = e.target.value;
                    setFooterDraft({ ...footerDraft, addressLines: next });
                  }}
                  placeholder={`Address line ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ====================================================================== */}
      {/* TAB 3: CHARGES — NON-PRODUCT ROWS */}
      {/* ====================================================================== */}
      {activeTab === 'charges' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">Schedule of Charges — Non-Product Rows</h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Product fee rows derive directly from the Product Catalogue. Only non-product account services, miscellaneous card charges, and payment fees are edited here.
                </p>
              </div>
              <Button variant="primary" onClick={() => openSaveModal('charges')} className="min-h-11">
                <Save className="h-4 w-4 mr-2" /> Save Non-Product Charges
              </Button>
            </div>

            {/* Account Services */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-midnight-900">Account Services ({chargesDraft.accountServices?.length || 0} rows)</h4>
              <div className="space-y-2">
                {(chargesDraft.accountServices || []).map((row, idx) => (
                  <div key={row.id || idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-ink-100 bg-porcelain-50/60">
                    <div className="col-span-6">
                      <Input
                        value={row.service}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.accountServices[idx].service = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Service name"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={row.charge}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.accountServices[idx].charge = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Charge (e.g. Nil, ₹400)"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={row.note || ''}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.accountServices[idx].note = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Note / standard"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Miscellaneous Debit Card Charges */}
            <div className="space-y-4 mt-8 pt-6 border-t border-ink-100">
              <h4 className="text-sm font-semibold text-midnight-900">Debit Card Miscellaneous Charges ({chargesDraft.debitCardMisc?.length || 0} rows)</h4>
              <div className="space-y-2">
                {(chargesDraft.debitCardMisc || []).map((row, idx) => (
                  <div key={row.id || idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-ink-100 bg-porcelain-50/60">
                    <div className="col-span-6">
                      <Input
                        value={row.service}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.debitCardMisc[idx].service = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={row.charge}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.debitCardMisc[idx].charge = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Charge"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={row.note || ''}
                        onChange={(e) => {
                          const next = { ...chargesDraft };
                          next.debitCardMisc[idx].note = e.target.value;
                          setChargesDraft(next);
                        }}
                        placeholder="Note"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 4: LEGAL PAGES */}
      {/* ====================================================================== */}
      {activeTab === 'legal' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Legal Policy Page Paragraphs</h3>
              <p className="text-xs text-ink-500 mt-0.5">Edit store-backed paragraphs. Routes, titles, and statutory structures remain preserved.</p>
            </div>
            <Button variant="primary" onClick={() => openSaveModal('legalPages')} className="min-h-11">
              <Save className="h-4 w-4 mr-2" /> Save Legal Pages
            </Button>
          </div>

          <div className="space-y-8">
            {Object.entries(legalDraft).map(([slug, page]) => (
              <div key={slug} className="rounded-xl border border-ink-200 p-5 bg-porcelain-50/50 space-y-4">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-midnight-950">{page.title} (/{slug})</h4>
                    <p className="text-xs text-ink-500">{page.subtitle}</p>
                  </div>
                  <span className="text-xs font-semibold text-ink-600 bg-white px-2.5 py-1 rounded-md border border-ink-200">
                    {page.sections?.length || 0} sections
                  </span>
                </div>

                <div className="space-y-4">
                  {(page.sections || []).map((sec, secIdx) => (
                    <div key={sec.id || secIdx} className="space-y-2 p-3 bg-white rounded-lg border border-ink-100">
                      <p className="text-xs font-bold text-midnight-900">{sec.heading || sec.id}</p>
                      {(sec.paragraphs || []).map((p, pIdx) => (
                        <textarea
                          key={pIdx}
                          value={p}
                          onChange={(e) => {
                            const next = JSON.parse(JSON.stringify(legalDraft));
                            next[slug].sections[secIdx].paragraphs[pIdx] = e.target.value;
                            setLegalDraft(next);
                          }}
                          rows={3}
                          className="w-full rounded-lg border border-ink-300 p-2.5 text-xs focus:border-midnight-500 focus:outline-hidden"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ====================================================================== */}
      {/* TAB 5: SUPPORT CONTENT */}
      {/* ====================================================================== */}
      {activeTab === 'support' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-6">
            <div>
              <h3 className="text-base font-semibold text-midnight-950">Support & Grievance Contact Rows</h3>
              <p className="text-xs text-ink-500 mt-0.5">Channels listed on public and portal support portals.</p>
            </div>
            <Button variant="primary" onClick={() => openSaveModal('support')} className="min-h-11">
              <Save className="h-4 w-4 mr-2" /> Save Support Content
            </Button>
          </div>

          <div className="space-y-6">
            <Field label="Introductory Notice Line" required>
              <textarea
                value={supportDraft.introLine}
                onChange={(e) => setSupportDraft({ ...supportDraft, introLine: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-ink-300 p-3 text-xs focus:border-midnight-500 focus:outline-hidden"
              />
            </Field>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-ink-900">Contact Channel Desks</label>
              {(supportDraft.contactRows || []).map((row, idx) => (
                <div key={row.id || idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-ink-100 bg-porcelain-50/60">
                  <div className="col-span-4">
                    <Input
                      value={row.label}
                      onChange={(e) => {
                        const next = { ...supportDraft };
                        next.contactRows[idx].label = e.target.value;
                        setSupportDraft(next);
                      }}
                      placeholder="Channel label"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={row.value}
                      onChange={(e) => {
                        const next = { ...supportDraft };
                        next.contactRows[idx].value = e.target.value;
                        setSupportDraft(next);
                      }}
                      placeholder="Value / address / phone"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={row.note || ''}
                      onChange={(e) => {
                        const next = { ...supportDraft };
                        next.contactRows[idx].note = e.target.value;
                        setSupportDraft(next);
                      }}
                      placeholder="Hours / availability"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ====================================================================== */}
      {/* AUDITED CONFIRMATION & REASON MODAL */}
      {/* ====================================================================== */}
      {saveModalOpen && (
        <Modal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          title={`Confirm Update: ${pendingSaveKey?.toUpperCase()}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-700 leading-relaxed">
              You are updating the store-backed content block <strong>{pendingSaveKey}</strong>. All consuming public and portal surfaces will reflect these changes immediately.
            </p>

            {validationError && (
              <div className="rounded-lg bg-danger-50 p-3 border border-danger-200 text-danger-700 font-medium">
                {validationError}
              </div>
            )}

            <Field label="Mandatory Justification Reason" required hint="Recorded in the immutable non-repudiation security audit trail">
              <textarea
                value={saveReason}
                onChange={(e) => setSaveReason(e.target.value)}
                placeholder="State the regulatory, marketing, or operational reason..."
                className="w-full rounded-lg border border-ink-300 p-2 text-xs focus:border-midnight-500 focus:outline-hidden"
                rows={3}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} onClick={handleConfirmSave}>
                Confirm &amp; Publish Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
