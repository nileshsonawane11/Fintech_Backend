import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LifeBuoy, Mail, MessageSquare, Phone, Plus, Scale, Send } from 'lucide-react';
import {
  Button, Card, EmptyState, Field, FormError, Input, PageLoading,
  SectionHeader, Select, StatusChip, Textarea, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatDateTime, formatINR, statusLabel } from '../../../lib/format.js';
import { BRAND } from '../../../data/products.js';
import { SUPPORT_CATEGORIES, getCategoryLabel } from '../../../data/supportCategories.js';
import { listAccounts, listTransactions } from '../../../services/portalBridge.js';
import { listMyTickets, raiseTicket, replyTicket } from '../../../services/portalBridge.js';

const CATEGORIES = SUPPORT_CATEGORIES.map((c) => c.label);
const DESC_MAX = 1000;

export default function SupportPage() {
  const { user } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const customerId = user?.customerId;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replying, setReplying] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [recentTxns, setRecentTxns] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    setLoading(true);
    listMyTickets(customerId)
      .then((rows) => {
        if (!live) return;
        const sorted = [...(rows || [])].sort((a, b) => ((a.updatedAt || a.createdAt || '') < (b.updatedAt || b.createdAt || '') ? 1 : -1));
        setTickets(sorted);
        setLoadError('');
      })
      .catch((err) => { if (live) setLoadError(err?.message || 'We could not load your requests.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId, refresh]);

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    listAccounts(customerId)
      .then(async (accounts) => {
        const first = (accounts || [])[0];
        if (!first) return;
        const txns = await listTransactions(first.id);
        if (live) setRecentTxns((txns || []).slice(0, 10));
      })
      .catch(() => { /* transaction reference is optional — the form works without it */ });
    return () => { live = false; };
  }, [customerId]);

  async function handleReply(ticket) {
    const body = replyDraft.trim();
    if (!body || replying) return;
    setReplying(true);
    try {
      await replyTicket(ticket.id, { from: 'CUSTOMER', body, actor: user?.name || 'Customer', actorRole: 'CUSTOMER' });
      setReplyDraft('');
      setRefresh((r) => r + 1);
      toast({ title: 'Reply sent', body: `Your message was added to request ${ticket.id}.` });
    } catch {
      toast({ tone: 'error', title: 'Reply not sent', body: 'Please try again.' });
    } finally {
      setReplying(false);
    }
  }

  async function handleRaise(e) {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    if (!category) next.category = 'Choose a category.';
    if (subject.trim().length < 5) next.subject = 'Give your request a short subject (5+ characters).';
    if (description.trim().length < 20) next.description = 'A few details help us resolve faster (20+ characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setFormError('');
    try {
      const ticket = await raiseTicket(customerId, {
        category,
        subject: subject.trim(),
        description: description.trim(),
        transactionRef: txnRef || '',
      });
      setHighlightId(ticket.id);
      setExpandedId(ticket.id);
      setShowForm(false);
      setSubject('');
      setDescription('');
      setTxnRef('');
      setCategory(CATEGORIES[0]);
      setRefresh((r) => r + 1);
      toast({ title: 'Request raised', body: `Your ticket ID is ${ticket.id}. Our team will reply here.` });
    } catch (err) {
      setFormError(err?.message || 'We could not raise your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && tickets.length === 0) return <PageLoading />;

  return (
    <div className="space-y-8">
      <SectionHeader titleAs="h1"
        eyebrow="Support"
        title="Support & my requests"
        description="Your requests come first — open one to read the full conversation and reply. Staff responses appear in the same thread."
      />
      <FormError message={loadError} />

      {/* My Requests — first */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
            <MessageSquare className="h-5 w-5 text-midnight-700" aria-hidden /> My requests
            <span className="text-sm font-normal text-ink-500">({tickets.length})</span>
          </h3>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden /> Raise a request
          </Button>
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No requests yet"
            body="When you raise a request, it will appear here with its status and the full conversation with our team."
          />
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const expanded = expandedId === t.id;
              const highlighted = highlightId === t.id;
              return (
                <Card key={t.id} className={`p-5 ${highlighted ? 'border-midnight-300 bg-midnight-50/40' : ''}`}>
                  <button
                    type="button"
                    onClick={() => { setExpandedId(expanded ? null : t.id); setReplyDraft(''); }}
                    className="flex w-full items-start justify-between gap-3 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink-900">{t.subject || 'Support request'}</span>
                        {highlighted && <span className="rounded-full bg-midnight-800 px-2 py-0.5 text-xs font-bold text-porcelain-50">New</span>}
                      </span>
                      <span className="mt-1 block text-[13px] text-ink-500">
                        {t.id} · {getCategoryLabel(t.category)} · Updated {formatDateTime(t.updatedAt || t.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusChip status={t.status} />
                      <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                    </span>
                  </button>

                  {expanded && (
                    <div className="mt-4 border-t border-ink-100 pt-4">
                      {t.transactionRef && (
                        <p className="tnum mb-3 text-[13px] text-ink-500">Transaction reference: {t.transactionRef}</p>
                      )}
                      <div className="space-y-3">
                        {(t.messages || []).map((m, i) => {
                          const mine = String(m.from || '').toUpperCase() === 'CUSTOMER' || m.senderType === 'CUSTOMER';
                          return (
                            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${mine ? 'bg-midnight-800 text-porcelain-50' : 'bg-porcelain-100 text-ink-800'}`}>
                                <p className={`text-xs font-semibold ${mine ? 'text-gold-300' : 'text-midnight-700'}`}>
                                  {mine ? 'You' : 'FinEdge support'} · {formatDateTime(m.at || m.timestamp)}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.text || m.body || m.message || ''}</p>
                              </div>
                            </div>
                          );
                        })}
                        {(t.messages || []).length === 0 && (
                          <p className="text-sm text-ink-500">{t.description || 'No messages yet.'}</p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Textarea
                          rows={2}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Write a reply to the support team…"
                          aria-label={`Reply to request ${t.id}`}
                          className="flex-1"
                        />
                        <Button onClick={() => handleReply(t)} loading={replying} disabled={!replyDraft.trim()} className="shrink-0 self-end">
                          <Send className="h-4 w-4" aria-hidden /> Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Channel strip */}
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="tel:18002674100" className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-colors hover:border-midnight-400">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
              <Phone className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink-900">Call us</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-600">{BRAND.support.phone}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{BRAND.support.hours}</span>
            </span>
          </a>
          <a href={`mailto:${BRAND.support.email}`} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-colors hover:border-midnight-400">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink-900">Email us</span>
              <span className="mt-0.5 block break-all text-[13px] leading-relaxed text-ink-600">{BRAND.support.email}</span>
              <span className="mt-0.5 block text-xs text-ink-500">We reply within 2 working days</span>
            </span>
          </a>
          <Link to="/grievance-redressal" className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-colors hover:border-midnight-400">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
              <Scale className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink-900">Grievance redressal</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-600">Escalate an unresolved complaint through the formal grievance process.</span>
            </span>
          </Link>
        </div>
      </section>

      {/* Raise a request — below, behind the button state */}
      {showForm && (
        <Card className="p-5">
          <h3 className="font-display text-lg font-semibold text-midnight-950">Raise a request</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Tell us what went wrong. Never include your password, PIN or any one-time code in a support message.
          </p>
          <form onSubmit={handleRaise} className="mt-5 space-y-4" noValidate>
            <FormError message={formError} />
            <Field label="Category" required error={errors.category}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Request category">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                      category === c
                        ? 'border-midnight-800 bg-midnight-800 text-porcelain-50'
                        : 'border-ink-200 bg-white text-ink-700 hover:border-midnight-400 hover:text-midnight-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Subject" required error={errors.subject}>
              <Input
                type="text" value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrors((x) => ({ ...x, subject: undefined })); }}
                placeholder="One line that sums up the problem"
                error={errors.subject}
              />
            </Field>
            <Field
              label="Description"
              required
              error={errors.description}
              hint={`${description.length} / ${DESC_MAX} characters`}
            >
              <Textarea
                rows={5}
                maxLength={DESC_MAX}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((x) => ({ ...x, description: undefined })); }}
                placeholder="Dates, amounts, transaction references, and what you expected instead."
                error={errors.description}
              />
            </Field>
            <Field label="Transaction reference (optional)" hint="If this is about a payment, pick the transaction so the team can find it faster.">
              <Select value={txnRef} onChange={(e) => setTxnRef(e.target.value)}>
                <option value="">No specific transaction</option>
                {recentTxns.map((t) => (
                  <option key={t.id} value={t.reference || t.id}>
                    {formatDate(t.date)} · {t.description} · {formatINR(t.amount)} · {t.reference || t.id}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={submitting} disabled={submitting}>
                Submit request
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
