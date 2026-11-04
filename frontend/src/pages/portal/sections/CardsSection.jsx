import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  Nfc,
  PackageCheck,
  Plane,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  FormError,
  Input,
  Modal,
  PageLoading,
  SectionHeader,
  Select,
  StatusChip,
  useToast,
} from '../../../components/ui.jsx';
import { formatDate, formatINR, formatINRWhole, maskAccount, maskCard } from '../../../lib/format.js';
import TiltCard from '../../../components/TiltCard.jsx';
import { CardVisual } from '../../../components/common/CardVisual.jsx';
import { CARDS, getCardBySlug } from '../../../data/products.js';
import {
  applyCard,
  blockCard,
  listMyCardApplications,
  listMyCards,
  payCard,
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
function CardPanel({ card, accounts, holderName, actorName, onBlockRequest, onRefresh }) {
  const { toast } = useToast();
  const blocked = card.status === 'BLOCKED';
  const disabled = blocked || card.status !== 'ACTIVE';
  const isCredit = card.kind === 'CREDIT';

  // Dynamic limits bounded by the card's product specification in products.js
  const product = useMemo(() => {
    return getCardBySlug(card.productSlug) ||
      CARDS.find((c) => c.slug === card.productSlug || c.name.toLowerCase() === (card.productName || '').toLowerCase()) ||
      CARDS[0];
  }, [card.productSlug, card.productName]);

  const posMax = product?.limits?.posDaily || (isCredit ? 150000 : 100000);
  const atmMax = product?.limits?.atmDaily || (isCredit ? 25000 : 40000);

  const defaultControls = { online: true, atm: true, international: false, contactless: true };
  const defaultLimits = { dailySpend: Math.min(50000, posMax), atmWithdrawal: Math.min(25000, atmMax) };

  const [controls, setControls] = useState(() => ({
    ...defaultControls,
    online: card.controls?.online ?? true,
    atm: card.controls?.atm ?? true,
    international: card.controls?.international ?? false,
    contactless: card.controls?.contactless ?? true,
  }));

  const [draftLimits, setDraftLimits] = useState(() => ({
    dailySpend: Math.min(card.limits?.spendDaily ?? card.limits?.dailySpend ?? defaultLimits.dailySpend, posMax),
    atmWithdrawal: Math.min(card.limits?.atmDaily ?? card.limits?.atmWithdrawal ?? defaultLimits.atmWithdrawal, atmMax),
  }));
  const [savedLimits, setSavedLimits] = useState(() => ({ ...draftLimits }));
  const draggingRef = useRef(false);

  // Bill payment state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payOption, setPayOption] = useState('MIN'); // 'FULL' or 'MIN'
  const [payAccountId, setPayAccountId] = useState(() => (accounts[0]?.id || ''));
  const [paying, setPaying] = useState(false);

  // PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Replacement modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceReason, setReplaceReason] = useState('Damaged physical card');
  const [requestingReplace, setRequestingReplace] = useState(false);

  // Sync controls and limits when card updates
  useEffect(() => {
    setControls({
      online: card.controls?.online ?? true,
      atm: card.controls?.atm ?? true,
      international: card.controls?.international ?? false,
      contactless: card.controls?.contactless ?? true,
    });
  }, [card.controls, card.status]);

  useEffect(() => {
    if (draggingRef.current) return;
    const next = {
      dailySpend: Math.min(card.limits?.spendDaily ?? card.limits?.dailySpend ?? defaultLimits.dailySpend, posMax),
      atmWithdrawal: Math.min(card.limits?.atmDaily ?? card.limits?.atmWithdrawal ?? defaultLimits.atmWithdrawal, atmMax),
    };
    setDraftLimits(next);
    setSavedLimits(next);
  }, [card.limits, card.status, posMax, atmMax]);

  async function toggleChannel(key) {
    if (disabled) return;
    const previous = controls;
    const next = { ...controls, [key]: !controls[key] };
    setControls(next); // optimistic
    try {
      await updateCardControls(card.id, { controls: { [key]: next[key] } }, actorName);
      toast({
        tone: 'success',
        title: 'Card control updated',
        body: `${CHANNELS.find((c) => c.key === key)?.label} is now ${next[key] ? 'enabled' : 'disabled'}.`,
      });
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
      await updateCardControls(card.id, {
        limits: {
          spendDaily: draftLimits.dailySpend,
          dailySpend: draftLimits.dailySpend,
          atmDaily: draftLimits.atmWithdrawal,
          atmWithdrawal: draftLimits.atmWithdrawal,
        },
      }, actorName);
      setSavedLimits({ ...draftLimits });
      toast({ tone: 'success', title: 'Limits updated', body: 'Your daily card limits have been saved.' });
    } catch (err) {
      setDraftLimits(previous);
      toast({
        tone: 'error',
        title: 'Could not save card limits',
        body: err?.message || 'Please try again.',
      });
    }
  }

  async function handlePayBill() {
    if (!payAccountId) {
      toast({ tone: 'error', title: 'Select account', body: 'Please select an account to pay from.' });
      return;
    }
    const amountToPay = payOption === 'FULL' ? (card.outstanding || 0) : (card.minDue || 0);
    if (amountToPay <= 0) {
      toast({ tone: 'info', title: 'No dues', body: 'There is no outstanding balance due on this card.' });
      setPayModalOpen(false);
      return;
    }
    setPaying(true);
    try {
      const res = await payCard(card.id, { accountId: payAccountId, amount: amountToPay });
      toast({
        tone: 'success',
        title: 'Payment successful',
        body: `₹${amountToPay.toLocaleString('en-IN')} paid towards ${card.productName}. Reference: ${res.reference || 'PAY-CARD'}`,
      });
      setPayModalOpen(false);
      onRefresh();
    } catch (err) {
      toast({
        tone: 'error',
        title: 'Payment failed',
        body: err?.message || 'Could not process card payment. Please verify account balance.',
      });
    } finally {
      setPaying(false);
    }
  }

  async function handleSetPin(e) {
    e.preventDefault();
    setPinError('');
    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    setSavingPin(true);
    try {
      await updateCardControls(card.id, { pinSet: true }, actorName);
      toast({
        tone: 'success',
        title: 'PIN set successfully',
        body: `A new 4-digit PIN has been configured for card ending in ${String(card.number || '').slice(-4)}.`,
      });
      setPinModalOpen(false);
      setPin('');
      setConfirmPin('');
    } catch (err) {
      setPinError(err?.message || 'Failed to update PIN. Please try again.');
    } finally {
      setSavingPin(false);
    }
  }

  async function handleRequestReplacement() {
    setRequestingReplace(true);
    try {
      const app = await applyCard(card.customerId, {
        productSlug: card.productSlug,
        productName: `${card.productName} (Replacement)`,
        kind: 'Replacement',
        reason: replaceReason,
        accountId: card.linkedAccountId || accounts[0]?.id,
      });
      toast({
        tone: 'success',
        title: 'Replacement requested',
        body: `Replacement request (${app.id}) submitted. It will be dispatched after approval.`,
      });
      setReplaceModalOpen(false);
      onRefresh();
    } catch (err) {
      toast({
        tone: 'error',
        title: 'Request failed',
        body: err?.message || 'Could not request replacement card.',
      });
    } finally {
      setRequestingReplace(false);
    }
  }

  const last4 = card.number ? String(card.number).replace(/\s/g, '').slice(-4) : '••••';
  const available =
    isCredit && card.limit != null && card.outstanding != null ? Math.max(0, card.limit - card.outstanding) : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-midnight-950">{card.productName || 'FinEdge Card'}</p>
          <span className="rounded-full border border-ink-200 bg-porcelain-100 px-2 py-0.5 text-xs font-bold tracking-wide text-ink-600">
            {card.kind} · {card.network}
          </span>
        </div>
        <StatusChip status={card.status} />
      </div>

      {/* Card visual — true card aspect ratio */}
      <TiltCard maxTilt={8} sweepKey={card.id || card.number || 'portal-card'} className="w-full max-w-md mt-4">
        <CardVisual
          card={card}
          holderName={holderName}
          shadow={false}
          className={blocked ? 'opacity-80' : ''}
        />
      </TiltCard>
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
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={disabled || (card.outstanding || 0) <= 0}
              onClick={() => setPayModalOpen(true)}
            >
              Pay now
            </Button>
            <span className="text-xs text-ink-500">Simulated settlement from linked account</span>
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

      {/* Limits — bounded by product specification */}
      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${card.id}-spend`} className="text-sm font-medium text-ink-800">
              Daily spend limit (POS & Online)
            </label>
            <span className="tnum text-sm font-semibold text-midnight-900">
              {formatINRWhole(draftLimits.dailySpend)}
            </span>
          </div>
          <input
            id={`${card.id}-spend`}
            type="range"
            min={5000}
            max={posMax}
            step={5000}
            value={draftLimits.dailySpend}
            disabled={disabled}
            aria-valuetext={formatINRWhole(draftLimits.dailySpend)}
            onChange={(e) =>
              setDraftLimits((prev) => ({ ...prev, dailySpend: Number(e.target.value) }))
            }
            onPointerDown={() => { draggingRef.current = true; }}
            onMouseUp={commitLimits}
            onTouchEnd={commitLimits}
            onKeyUp={commitLimits}
            className="mt-2 w-full accent-midnight-800 disabled:opacity-50"
          />
          <div className="tnum mt-1 flex justify-between text-xs text-ink-500">
            <span>₹5,000</span>
            <span>Max: {formatINRWhole(posMax)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${card.id}-atm`} className="text-sm font-medium text-ink-800">
              ATM withdrawal limit (per day)
            </label>
            <span className="tnum text-sm font-semibold text-midnight-900">
              {formatINRWhole(draftLimits.atmWithdrawal)}
            </span>
          </div>
          <input
            id={`${card.id}-atm`}
            type="range"
            min={5000}
            max={atmMax}
            step={5000}
            value={draftLimits.atmWithdrawal}
            disabled={disabled}
            aria-valuetext={formatINRWhole(draftLimits.atmWithdrawal)}
            onChange={(e) =>
              setDraftLimits((prev) => ({ ...prev, atmWithdrawal: Number(e.target.value) }))
            }
            onPointerDown={() => { draggingRef.current = true; }}
            onMouseUp={commitLimits}
            onTouchEnd={commitLimits}
            onKeyUp={commitLimits}
            className="mt-2 w-full accent-midnight-800 disabled:opacity-50"
          />
          <div className="tnum mt-1 flex justify-between text-xs text-ink-500">
            <span>₹5,000</span>
            <span>Max: {formatINRWhole(atmMax)}</span>
          </div>
        </div>
        <p className="text-[13px] text-ink-500">Limits save when you release the slider.</p>
      </div>

      {/* Services footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {!blocked && (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPinModalOpen(true)}>
                <KeyRound className="h-4 w-4" aria-hidden /> Set / Change PIN
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setReplaceModalOpen(true)}>
                <RefreshCw className="h-4 w-4" aria-hidden /> Request replacement
              </Button>
            </>
          )}
        </div>
        {!blocked && (
          <Button type="button" variant="danger" size="sm" onClick={() => onBlockRequest(card)}>
            <Ban className="h-4 w-4" aria-hidden /> Block card
          </Button>
        )}
      </div>

      {/* Bill Pay Modal */}
      {isCredit && (
        <Modal
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Pay Credit Card Bill — ${card.productName}`}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setPayModalOpen(false)} disabled={paying}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handlePayBill} loading={paying}>
                Pay {formatINR(payOption === 'FULL' ? (card.outstanding || 0) : (card.minDue || 0))}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              Select payment amount and the FinEdge funding account to debit.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 cursor-pointer">
                <input
                  type="radio"
                  name="payAmt"
                  value="MIN"
                  checked={payOption === 'MIN'}
                  onChange={() => setPayOption('MIN')}
                  className="accent-midnight-800"
                />
                <div>
                  <span className="block text-sm font-semibold text-ink-900">
                    Minimum Amount Due: {formatINR(card.minDue || 0)}
                  </span>
                  <span className="block text-xs text-ink-500">Pay minimum due to avoid late payment penalties</span>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 cursor-pointer">
                <input
                  type="radio"
                  name="payAmt"
                  value="FULL"
                  checked={payOption === 'FULL'}
                  onChange={() => setPayOption('FULL')}
                  className="accent-midnight-800"
                />
                <div>
                  <span className="block text-sm font-semibold text-ink-900">
                    Total Outstanding: {formatINR(card.outstanding || 0)}
                  </span>
                  <span className="block text-xs text-ink-500">Clear full statement balance</span>
                </div>
              </label>
            </div>

            <Field label="Debited from account" required>
              <Select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.productName || a.type} · {maskAccount(a.accountNumber)} ({formatINR(a.balance)})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Modal>
      )}

      {/* Set PIN Modal */}
      <Modal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title="Set / Change ATM PIN"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPinModalOpen(false)} disabled={savingPin}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSetPin} loading={savingPin}>
              Save new PIN
            </Button>
          </>
        }
      >
        <form onSubmit={handleSetPin} className="space-y-4">
          <p className="text-sm text-ink-600">
            Enter a confidential 4-digit PIN for ATM and retail chip-and-PIN transactions.
          </p>
          <FormError message={pinError} />
          <Field label="Enter 4-digit PIN" required>
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label="Confirm 4-digit PIN" required>
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </form>
      </Modal>

      {/* Replacement Card Modal */}
      <Modal
        open={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        title="Request Replacement Card"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setReplaceModalOpen(false)} disabled={requestingReplace}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleRequestReplacement} loading={requestingReplace}>
              Submit request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            A replacement card will be issued with the same card product features. Please select the reason for replacement:
          </p>
          <Field label="Reason for replacement" required>
            <Select value={replaceReason} onChange={(e) => setReplaceReason(e.target.value)}>
              <option value="Damaged physical card">Damaged physical card</option>
              <option value="Chip / contactless malfunction">Chip / contactless malfunction</option>
              <option value="Card lost or misplaced">Card lost or misplaced</option>
              <option value="Name correction / design upgrade">Name correction / design upgrade</option>
            </Select>
          </Field>
          <p className="text-xs text-ink-500">
            Your replacement request will appear in your card applications tracker and dispatch status will update upon manager dispatch.
          </p>
        </div>
      </Modal>
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
  const [refreshCount, setRefreshCount] = useState(0);

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
        setCards(myCards || []);
        setCardApplications(myApps || []);
        setAccounts(accs || []);
        setAccountId((prev) => {
          if (prev && accs.some((a) => a.id === prev)) return prev;
          const active = accs.find((a) => a.status === 'ACTIVE') || accs[0];
          return active ? active.id : '';
        });
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
  }, [customerId, refreshCount]);

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
      setRefreshCount((c) => c + 1);
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

    // Check duplicate by product (not kind)
    const existing = cardApplications.find(
      (a) =>
        (a.productSlug === product.slug || a.cardName === product.name || a.productName === product.name) &&
        ['PENDING_APPROVAL', 'UNDER_REVIEW', 'SUBMITTED'].includes(a.status)
    );
    if (existing) {
      setFormError(`An active application (${existing.id}) for ${product.name} is currently under review.`);
      return;
    }

    setSubmitting(true);
    try {
      const app = await applyCard(customerId, {
        productSlug: product.slug,
        productName: product.name,
        cardName: product.name,
        kind: product.cardType === 'credit' ? 'CREDIT' : 'DEBIT',
        cardType: product.cardType === 'credit' ? 'CREDIT' : 'DEBIT',
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
            {cards.map((card, idx) => (
              <CardPanel
                key={card.id || card.cardId || card.number || idx}
                card={card}
                accounts={accounts}
                holderName={user?.name}
                actorName={actorName}
                onBlockRequest={setBlockTarget}
                onRefresh={() => setRefreshCount((c) => c + 1)}
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
                  {accounts.map((a, idx) => (
                    <option key={a.id || a.accountId || idx} value={a.id}>{accountLabel(a)}</option>
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
            {cardApplications.map((app, idx) => {
              const product = getCardBySlug(app.productSlug);
              const name = app.productName || product?.name || app.variant || 'Card application';
              const kind = app.kind || app.cardType || (product ? (product.cardType === 'credit' ? 'CREDIT' : 'DEBIT') : null);
              return (
                <Card key={app.id || app.applicationId || idx} className="p-4 sm:p-5">
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
