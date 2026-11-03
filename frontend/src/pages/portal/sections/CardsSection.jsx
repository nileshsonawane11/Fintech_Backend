import React, { useEffect, useRef, useState } from 'react';
import {
  Ban,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
  Nfc,
  PackageCheck,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  FormError,
  Modal,
  PageLoading,
  SectionHeader,
  Select,
  StatusChip,
  useToast,
} from '../../../components/ui.jsx';
import { formatDate, formatINR, formatINRWhole, maskAccount, maskCard } from '../../../lib/format.js';
import { CARDS, getCardBySlug } from '../../../data/products.js';
import {
  applyCard,
  blockCard,
  listMyCardApplications,
  listMyCards,
  updateCardControls,
} from '../../../services/portalBridge.js';
import { listAccounts } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const CHANNELS = [
  { key: 'online', label: 'Online payments', hint: 'E-commerce and in-app purchases', icon: Globe },
  { key: 'atm', label: 'ATM withdrawals', hint: 'Cash withdrawals at ATMs', icon: Banknote },
  { key: 'international', label: 'International use', hint: 'Overseas and foreign-currency spends', icon: Plane },
  { key: 'contactless', label: 'Contactless', hint: 'Tap to pay without a PIN up to the contactless limit', icon: Nfc },
];

const LIMIT_SLIDERS = [
  { key: 'dailySpend', label: 'Daily spend limit', min: 5000, max: 300000, step: 5000 },
  { key: 'atmWithdrawal', label: 'ATM withdrawal limit (per day)', min: 5000, max: 100000, step: 5000 },
];

const DEFAULT_CONTROLS = { online: true, atm: true, international: false, contactless: true };
const DEFAULT_LIMITS = { dailySpend: 50000, atmWithdrawal: 25000 };

function feeLabel(value) {
  if (value == null) return '—';
  return value === 0 ? 'Nil' : formatINRWhole(value);
}

function accountLabel(account) {
  const type = account.type ? account.type.charAt(0) + account.type.slice(1).toLowerCase() : 'Account';
  return `${type} · ${maskAccount(account.accountNumber)} · ${formatINR(account.balance)}`;
}

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-midnight-700' : 'bg-ink-200'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
        aria-hidden
      />
    </button>
  );
}

/* One issued card: visual, billing band (credit), controls, limits, services. */
function CardPanel({ card, holderName, actorName, onBlockRequest }) {
  const { toast } = useToast();
  const blocked = card.status === 'BLOCKED';
  const disabled = blocked || card.status !== 'ACTIVE';
  const isCredit = card.kind === 'CREDIT';

  const [controls, setControls] = useState(() => ({ ...DEFAULT_CONTROLS, ...(card.controls || {}) }));
  const [draftLimits, setDraftLimits] = useState(() => ({ ...DEFAULT_LIMITS, ...(card.limits || {}) }));
  const [savedLimits, setSavedLimits] = useState(() => ({ ...DEFAULT_LIMITS, ...(card.limits || {}) }));
  const draggingRef = useRef(false);

  // Sync from the store when the card changes elsewhere (e.g. it was blocked).
  const controlsKey = JSON.stringify(card.controls || {});
  const limitsKey = JSON.stringify(card.limits || {});
  useEffect(() => {
    setControls({ ...DEFAULT_CONTROLS, ...(card.controls || {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsKey, card.status]);
  useEffect(() => {
    if (draggingRef.current) return;
    const next = { ...DEFAULT_LIMITS, ...(card.limits || {}) };
    setDraftLimits(next);
    setSavedLimits(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitsKey, card.status]);

  async function toggleChannel(key) {
    if (disabled) return;
    const previous = controls;
    const next = { ...controls, [key]: !controls[key] };
    setControls(next); // optimistic
    try {
      await updateCardControls(card.id, { controls: { [key]: next[key] } }, actorName);
    } catch (err) {
      setControls(previous); // revert
      toast({
        tone: 'error',
        title: 'Could not update card controls',
        body: err?.message || 'Please try again.',
      });
    }
  }

  async function commitLimits() {
    draggingRef.current = false;
    if (disabled) return;
    if (
      draftLimits.dailySpend === savedLimits.dailySpend &&
      draftLimits.atmWithdrawal === savedLimits.atmWithdrawal
    ) {
      return;
    }
    const previous = savedLimits;
    try {
      await updateCardControls(card.id, { limits: { ...draftLimits } }, actorName);
      setSavedLimits({ ...draftLimits });
      toast({ tone: 'success', title: 'Saved', body: 'Your card limits have been updated.' });
    } catch (err) {
      setDraftLimits(previous);
      toast({
        tone: 'error',
        title: 'Could not save card limits',
        body: err?.message || 'Please try again.',
      });
    }
  }

  const last4 = card.number ? String(card.number).replace(/\s/g, '').slice(-4) : '••••';
  const available =
    isCredit && card.limit != null && card.outstanding != null ? card.limit - card.outstanding : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-midnight-950">{card.productName || 'FinEdge Card'}</p>
        <StatusChip status={card.status} />
      </div>

      {/* Card visual — true card aspect ratio */}
      <div
        className={`relative mt-4 aspect-[1.586/1] w-full max-w-md overflow-hidden rounded-2xl bg-midnight-900 p-5 text-porcelain-50 shadow-raised ${
          blocked ? 'opacity-80' : ''
        }`}
        aria-label={`${card.productName || 'Card'} ending ${last4}`}
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-gold-500/20" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-midnight-600/40" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-lg font-semibold tracking-wide">FinEdge</p>
            <span className="rounded-full border border-porcelain-50/40 px-2.5 py-0.5 text-xs font-bold tracking-[0.14em]">
              {isCredit ? 'CREDIT' : 'DEBIT'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="block h-8 w-11 rounded-md border border-gold-300/70 bg-gold-200/30"
              aria-hidden
            >
              <span className="mx-auto mt-[13px] block h-px w-8 bg-gold-300/70" />
            </span>
            <Nfc className="h-5 w-5 text-porcelain-50/80" aria-hidden />
          </div>
          <div>
            <p className="tnum text-lg tracking-[0.18em] sm:text-xl">
              ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;{last4}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="truncate text-[13px] font-medium uppercase tracking-wide text-porcelain-50/85">
                {holderName || 'Card holder'}
              </p>
              <p className="shrink-0 text-[13px] font-medium text-porcelain-50/85">
                {card.productName || ''}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-ink-500">
        Card number {maskCard(card.number)}
        {card.dispatchRef ? <> · Dispatch reference {card.dispatchRef}</> : null}
      </p>

      {/* Billing band — credit cards only */}
      {isCredit && (
        <div className="mt-5 rounded-lg border border-ink-100 bg-porcelain-100/70 px-4 py-4">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-500">Outstanding</dt>
              <dd className="tnum mt-0.5 text-base font-semibold text-ink-900">
                {card.outstanding != null ? formatINR(card.outstanding) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Minimum due</dt>
              <dd className="tnum mt-0.5 text-base font-semibold text-ink-900">
                {card.minDue != null ? formatINR(card.minDue) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Due date</dt>
              <dd className="mt-0.5 text-base font-semibold text-ink-900">{formatDate(card.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Credit limit</dt>
              <dd className="tnum mt-0.5 text-base font-semibold text-ink-900">
                {card.limit != null ? formatINR(card.limit) : '—'}
              </dd>
              {available != null && (
                <dd className="tnum text-xs text-ink-500">Available {formatINR(available)}</dd>
              )}
            </div>
          </dl>
          <div className="mt-4">
            <Button
              type="button"
             
              size="sm"
              onClick={() =>
                toast({
                  tone: 'info',
                  title: 'Payment is simulated in this prototype',
                  body: 'No real payment is taken here. In the live product this would open the bill-payment flow for this card.',
                })
              }
            >
              Pay now
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <ShieldCheck className="h-4 w-4 text-midnight-700" aria-hidden /> Card controls
        </p>
        {blocked && (
          <p className="mt-1.5 text-[13px] text-ink-500">
            This card is blocked. Controls are disabled — please contact support if you need a replacement.
          </p>
        )}
        <ul className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-100">
          {CHANNELS.map((ch) => (
            <li key={ch.key} className="flex items-center gap-3 px-4 py-3">
              <ch.icon className="h-5 w-5 shrink-0 text-midnight-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-800">{ch.label}</span>
                <span className="block text-[13px] text-ink-500">{ch.hint}</span>
              </span>
              <Toggle
                label={ch.label}
                checked={!!controls[ch.key]}
                disabled={disabled}
                onChange={() => toggleChannel(ch.key)}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Limits — commit on release only */}
      <div className="mt-6 space-y-5">
        {LIMIT_SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${card.id}-${s.key}`} className="text-sm font-medium text-ink-800">
                {s.label}
              </label>
              <span className="tnum text-sm font-semibold text-midnight-900">
                {formatINRWhole(draftLimits[s.key])}
              </span>
            </div>
            <input
              id={`${card.id}-${s.key}`}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={draftLimits[s.key]}
              disabled={disabled}
              aria-valuetext={formatINRWhole(draftLimits[s.key])}
              onChange={(e) =>
                setDraftLimits((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))
              }
              onPointerDown={() => {
                draggingRef.current = true;
              }}
              onMouseUp={commitLimits}
              onTouchEnd={commitLimits}
              onKeyUp={commitLimits}
              className="mt-2 w-full accent-midnight-800 disabled:opacity-50"
            />
            <div className="tnum mt-1 flex justify-between text-xs text-ink-500">
              <span>{formatINRWhole(s.min)}</span>
              <span>{formatINRWhole(s.max)}</span>
            </div>
          </div>
        ))}
        <p className="text-[13px] text-ink-500">Limits save when you release the slider.</p>
      </div>

      {/* Services footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="flex items-center gap-2 text-[13px] text-ink-500">
          <PackageCheck className="h-4 w-4 text-midnight-700" aria-hidden />
          {card.dispatchRef ? `Dispatched · reference ${card.dispatchRef}` : 'Card services'}
        </p>
        {!blocked && (
          <Button type="button" variant="danger" size="sm" onClick={() => onBlockRequest(card)}>
            <Ban className="h-4 w-4" aria-hidden /> Block card
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function CardsPage() {
  const { user } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const customerId = user?.customerId;
  const actorName = user?.name || 'Customer';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cards, setCards] = useState([]);
  const [cardApplications, setCardApplications] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const dataKeyRef = useRef('');

  // ---- block flow ----
  const [blockTarget, setBlockTarget] = useState(null);
  const [blocking, setBlocking] = useState(false);

  // ---- apply form state ----
  const [selectedSlug, setSelectedSlug] = useState(CARDS[0]?.slug || '');
  const [accountId, setAccountId] = useState('');
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successApp, setSuccessApp] = useState(null);

  // Live reload (same change-guarded pattern as the Loans page).
  useEffect(() => {
    let live = true;
    if (!customerId) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const [myCards, myApps, accs] = await Promise.all([
          listMyCards(customerId),
          listMyCardApplications(customerId),
          listAccounts(customerId),
        ]);
        if (!live) return;
        const key = JSON.stringify([myCards, myApps, accs]);
        if (key !== dataKeyRef.current) {
          dataKeyRef.current = key;
          setCards(myCards);
          setCardApplications(myApps);
          setAccounts(accs);
          setAccountId((prev) => {
            if (prev && accs.some((a) => a.id === prev)) return prev;
            const active = accs.find((a) => a.status === 'ACTIVE') || accs[0];
            return active ? active.id : '';
          });
        }
        setLoadError('');
      } catch (err) {
        if (live) setLoadError(err?.message || 'We could not load your cards. Please try again.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  });

  async function confirmBlock() {
    if (!blockTarget) return;
    setBlocking(true);
    try {
      await blockCard(blockTarget.id, actorName);
      toast({
        tone: 'success',
        title: 'Card blocked',
        body: `${blockTarget.productName || 'Your card'} ending ${String(blockTarget.number || '').slice(-4)} is now blocked and cannot be used.`,
      });
      setBlockTarget(null);
    } catch (err) {
      toast({
        tone: 'error',
        title: 'Could not block this card',
        body: err?.message || 'Please try again or contact support.',
      });
    } finally {
      setBlocking(false);
    }
  }

  async function handleApply(e) {
    e.preventDefault();
    setFormError('');
    const product = CARDS.find((c) => c.slug === selectedSlug);
    const errors = {};
    if (!product) errors.product = 'Choose a card.';
    if (!accountId) errors.accountId = 'Choose the account to link this card to.';
    if (!consent) errors.consent = 'Please confirm you agree to the card terms before applying.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !product || !customerId) return;
    setSubmitting(true);
    try {
      const app = await applyCard(customerId, {
        productSlug: product.slug,
        productName: product.name,
        kind: product.cardType === 'credit' ? 'CREDIT' : 'DEBIT',
        accountId,
      });
      setSuccessApp(app);
      setCardApplications((prev) => [app, ...prev.filter((a) => a.id !== app.id)]);
      setConsent(false);
      toast({
        tone: 'success',
        title: 'Card application submitted',
        body: `Reference ${app.id}. Your application is now in the issuance queue.`,
      });
    } catch (err) {
      setFormError(err?.message || 'We could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-10">
      <SectionHeader titleAs="h1"
        eyebrow="Cards"
        title="My cards"
        description="Manage your FinEdge credit and debit cards — billing, channel controls and daily limits — and apply for a new card when you need one."
      />

      {loadError && <FormError message={loadError} />}

      {/* ---------------- (a) My Cards ---------------- */}
      <section aria-labelledby="my-cards-heading">
        <h3 id="my-cards-heading" className="sr-only">Your cards</h3>
        {cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No cards yet"
            body="You do not have an issued FinEdge card yet. Apply below and, once issued, your card will appear here with its controls and limits."
          />
        ) : (
          <div className="space-y-5">
            {cards.map((card) => (
              <CardPanel
                key={card.id}
                card={card}
                holderName={user?.name}
                actorName={actorName}
                onBlockRequest={setBlockTarget}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- (b) Apply for a card ---------------- */}
      <section aria-labelledby="card-apply-heading">
        <h3 id="card-apply-heading" className="mb-4 font-display text-xl font-semibold text-midnight-950">
          Apply for a card
        </h3>
        <Card className="p-5 sm:p-6">
          <form onSubmit={handleApply} noValidate className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-700">
                Choose a card <span className="text-danger-600">*</span>
              </p>
              {fieldErrors.product && (
                <p className="mb-2 text-xs font-medium text-danger-600" role="alert">{fieldErrors.product}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Card products">
                {CARDS.map((c) => {
                  const selected = selectedSlug === c.slug;
                  const isCredit = c.cardType === 'credit';
                  return (
                    <label
                      key={c.slug}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        selected
                          ? 'border-midnight-600 bg-midnight-50 ring-1 ring-midnight-600'
                          : 'border-ink-200 bg-white hover:border-midnight-400'
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="card-product"
                          value={c.slug}
                          checked={selected}
                          onChange={() => setSelectedSlug(c.slug)}
                          className="mt-1 h-4 w-4 shrink-0 accent-midnight-800"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                            <span className="rounded-full border border-ink-200 bg-porcelain-100 px-2 py-0.5 text-xs font-bold tracking-wide text-ink-600">
                              {isCredit ? 'CREDIT' : 'DEBIT'}
                            </span>
                          </span>
                          <span className="mt-1 block text-[13px] leading-relaxed text-ink-500">{c.tagline}</span>
                          <span className="tnum mt-2 block space-y-0.5 text-[13px] text-ink-600">
                            <span className="block">Joining fee: {feeLabel(c.joiningFee)}</span>
                            <span className="block">Annual fee: {feeLabel(c.annualFee)}</span>
                            {isCredit && c.aprPct != null && (
                              <span className="block">Finance charge: {c.aprPct}% APR</span>
                            )}
                            {c.network && <span className="block">Network: {c.network}</span>}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="max-w-md">
              <Field label="Linked account" required error={fieldErrors.accountId}>
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

            <Checkbox
              label="I confirm that the details above are correct and I agree to the card terms, fee schedule and — for credit cards — repayment obligations for this demonstration platform."
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              error={fieldErrors.consent}
            />

            <FormError message={formError} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" loading={submitting} disabled={!consent || accounts.length === 0}>
                Submit application
              </Button>
              {accounts.length === 0 && (
                <p className="text-[13px] text-ink-500">You need an active FinEdge account before you can apply.</p>
              )}
            </div>
          </form>

          {successApp && (
            <div className="mt-6 rounded-lg border border-success-600/25 bg-success-50 px-4 py-4" role="status">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-ink-900">Card application submitted</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                    Reference <span className="font-semibold text-ink-800">{successApp.id}</span>
                    {' · '}{successApp.productName}. Your application is in the issuance queue below — once a
                    card is issued it will appear under My cards with its dispatch reference.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ---------------- (c) My card applications ---------------- */}
      <section aria-labelledby="card-apps-heading">
        <h3 id="card-apps-heading" className="mb-4 font-display text-xl font-semibold text-midnight-950">
          My card applications
        </h3>
        {cardApplications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No card applications yet"
            body="Applications you submit for a new FinEdge card will be tracked here until a card is issued or a decision is made."
          />
        ) : (
          <div className="space-y-3">
            {cardApplications.map((app) => {
              const product = getCardBySlug(app.productSlug);
              const name = app.productName || product?.name || app.variant || 'Card application';
              const kind = app.kind || app.cardType || (product ? (product.cardType === 'credit' ? 'CREDIT' : 'DEBIT') : null);
              return (
                <Card key={app.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                        {name}
                        {kind && (
                          <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs font-bold tracking-wide text-ink-600">
                            {kind}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        Reference {app.id} · Applied {formatDate(app.submittedAt || app.appliedAt)}
                        {app.dispatchRef ? <> · Dispatch {app.dispatchRef}</> : null}
                      </p>
                    </div>
                    <StatusChip status={app.status} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- Block confirmation ---------------- */}
      <Modal
        open={!!blockTarget}
        onClose={() => {
          if (!blocking) setBlockTarget(null);
        }}
        title="Block this card?"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBlockTarget(null)}
              disabled={blocking}
            >
              Keep card active
            </Button>
            <Button type="button" variant="danger" onClick={confirmBlock} loading={blocking}>
              <Ban className="h-4 w-4" aria-hidden /> Block card
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-600">
          {blockTarget?.productName || 'This card'}
          {blockTarget?.number ? <> ending {String(blockTarget.number).slice(-4)}</> : null} will be
          blocked immediately. It will no longer work for payments, ATM withdrawals or online purchases,
          and its controls will be disabled. If you did not request this, please contact support instead.
        </p>
      </Modal>
    </div>
  );
}
