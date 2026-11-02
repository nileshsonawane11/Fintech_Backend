import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight, Bell, CheckCircle2, FileText, LifeBuoy, PiggyBank, ShieldCheck,
} from 'lucide-react';
import {
  Button, EmptyState, FormError, PageLoading, SectionHeader, useToast,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../../services/portalBridge.js';

function iconFor(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('TRANSACTION') || t.includes('PAYMENT') || t.includes('TRANSFER')) return ArrowLeftRight;
  if (t.includes('SUPPORT') || t.includes('TICKET')) return LifeBuoy;
  if (t.includes('SECURITY') || t.includes('LOGIN') || t.includes('PASSWORD')) return ShieldCheck;
  if (t.includes('INVESTMENT') || t.includes('SIP') || t.includes('DEPOSIT')) return PiggyBank;
  if (t.includes('SUCCESS')) return CheckCircle2;
  if (t.includes('APPLICATION') || t.includes('KYC') || t.includes('LOAN') || t.includes('CARD') || t.includes('ACTION')) return FileText;
  return Bell;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  useDbTick();
  const { toast } = useToast();
  const customerId = user?.customerId;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    setLoading(true);
    listNotifications(customerId)
      .then((rows) => {
        if (!live) return;
        const sorted = [...(rows || [])].sort((a, b) => ((a.createdAt || '') < (b.createdAt || '') ? 1 : -1));
        setItems(sorted);
        setError('');
      })
      .catch((err) => { if (live) setError(err?.message || 'We could not load your notifications.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId]);

  const unread = items.filter((n) => !n.read).length;

  async function handleOpen(n) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(customerId, n.id);
    } catch {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      toast({ tone: 'error', title: 'Could not mark as read', body: 'Please try again.' });
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(customerId);
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      toast({ title: 'All caught up', body: 'Every notification has been marked as read.' });
    } catch {
      toast({ tone: 'error', title: 'Could not mark all as read', body: 'Please try again.' });
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <SectionHeader titleAs="h1"
        eyebrow="Notifications"
        title="Notifications"
        description={unread > 0 ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}. Select one to mark it read.` : 'Account, application and security updates from FinEdge.'}
        action={(
          <Button variant="secondary" onClick={handleMarkAll} loading={markingAll} disabled={unread === 0}>
            Mark all read
          </Button>
        )}
      />
      <FormError message={error} />

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          body="There are no notifications right now. New account, application and security updates will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
          <ul className="divide-y divide-ink-100">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              const isUnread = !n.read;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-midnight-50/60 ${
                      isUnread ? 'bg-midnight-50/50' : ''
                    }`}
                    aria-label={isUnread ? `${n.title} (unread)` : n.title}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-2 text-sm text-ink-900 ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {n.title || 'Notification'}
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden />}
                      </span>
                      {n.body && <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-600">{n.body}</span>}
                      <span className="mt-1 block text-xs text-ink-500">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
