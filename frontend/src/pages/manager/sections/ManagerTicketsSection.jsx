import React, { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Send, X } from 'lucide-react';
import {
  Button, EmptyState, Field, PageLoading, SectionHeader, StatusChip, Tabs, Textarea, useToast,
} from '../../../components/ui.jsx';
import { formatDate, formatDateTime } from '../../../lib/format.js';
import { getCategoryLabel } from '../../../data/supportCategories.js';
import { listAllTickets, replyTicket, setTicketStatus } from '../../../services/managerBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

const TAB_DEFS = [
  { id: 'ALL', label: 'All', statuses: null },
  { id: 'OPEN', label: 'Open', statuses: ['OPEN'] },
  { id: 'IN_PROGRESS', label: 'In Progress', statuses: ['IN_PROGRESS'] },
  { id: 'RESOLVED', label: 'Resolved', statuses: ['RESOLVED'] },
];

export default function ManagerTicketsPage() {
  useDbTick();
  const { managerUser, user: custUser } = useAuth();
  const user = managerUser || custUser;
  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'AUDIT_COMPLIANCE';
  const actor = user?.fullName || user?.name || 'Customer Support Specialist';
  const actorRole = user?.role || 'CUSTOMER_SUPPORT';

  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = () => {
    listAllTickets({})
      .then((rows) => { setTickets(rows); setError(''); })
      .catch((e) => setError(e.message || 'Could not load tickets.'));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const map = { ALL: tickets?.length || 0 };
    for (const def of TAB_DEFS.slice(1)) {
      map[def.id] = (tickets || []).filter((t) => def.statuses.includes(t.status)).length;
    }
    return map;
  }, [tickets]);

  const visible = useMemo(() => {
    if (!tickets) return null;
    const def = TAB_DEFS.find((d) => d.id === tab);
    if (!def?.statuses) return tickets;
    return tickets.filter((t) => def.statuses.includes(t.status));
  }, [tickets, tab]);

    useEffect(() => {
    if (!selectedId) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);

  const selected = useMemo(
    () => (tickets || []).find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  useEffect(() => { setReply(''); }, [selectedId]);

  async function handleReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await replyTicket(selected.id, { from: 'STAFF', body: reply.trim(), actor, actorRole, actorEmail: user?.email });
      toast({ title: 'Reply sent', body: `Your reply was added to ticket ${selected.id}.` });
      setReply('');
      load();
    } catch (e) {
      toast({ tone: 'error', title: 'Reply failed', body: e.message });
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(status, successTitle) {
    if (!selected) return;
    setStatusBusy(true);
    try {
      await setTicketStatus(selected.id, status, { actor, actorRole, actorEmail: user?.email });
      toast({ title: successTitle, body: `Ticket ${selected.id} is now ${status === 'RESOLVED' ? 'resolved' : 'in progress'}.` });
      load();
    } catch (e) {
      toast({ tone: 'error', title: 'Status change failed', body: e.message });
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Work queues"
        title="Support Tickets"
        description="Tickets raised by customers in their portal appear here. Replies go straight back into the customer's My Requests thread."
      />

      <div className="mb-5">
        <Tabs
          tabs={TAB_DEFS.map((d) => ({ id: d.id, label: d.label, count: counts[d.id] }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {error ? (
        <EmptyState variant="error" icon={LifeBuoy} title="Could not load tickets" body={error} />
      ) : !visible ? (
        <PageLoading />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={tab === 'ALL' ? 'No tickets yet' : `No ${TAB_DEFS.find((d) => d.id === tab)?.label.toLowerCase()} tickets`}
          body={tab === 'ALL' ? 'Tickets raised by customers will appear here.' : 'Nothing is in this state right now — try another tab.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
          <ul className="divide-y divide-ink-50">
            {visible.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-midnight-50/60 ${selectedId === t.id ? 'bg-midnight-50' : ''}`}
                  aria-pressed={selectedId === t.id}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">{t.subject || '—'}</span>
                    <span className="block text-[13px] text-ink-500">
                      {t.customer?.fullName || '—'} · {t.id} · {getCategoryLabel(t.category)} · Raised {formatDate(t.createdAt)}
                    </span>
                  </span>
                  <StatusChip status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Ticket thread">
          <div className="absolute inset-0 bg-midnight-950/60" onClick={() => setSelectedId(null)} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col bg-white shadow-modal overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-midnight-950">{selected.subject || '—'}</h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  {selected.customer?.fullName || '—'} · {selected.id} · {getCategoryLabel(selected.category)} · Raised {formatDate(selected.createdAt)}
                </p>
                <div className="mt-2"><StatusChip status={selected.status} /></div>
              </div>
              <button onClick={() => setSelectedId(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors" aria-label="Close ticket">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
              {selected.description && !selected.messages?.some(m => (m.text === selected.description || m.body === selected.description || m.message === selected.description)) && (
                <div className="rounded-xl bg-porcelain-100 px-3.5 py-3">
                  <p className="text-xs font-semibold text-ink-500">{selected.customer?.fullName || 'Customer'} · {formatDateTime(selected.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{selected.description}</p>
                </div>
              )}
              {(selected.messages || []).map((m, i) => {
                const staffSide = m.from === 'STAFF' || m.from === 'SUPPORT' || m.senderType === 'STAFF';
                return (
                  <div key={i} className={`rounded-xl px-3.5 py-3 ${staffSide ? 'bg-midnight-50' : 'bg-porcelain-100'}`}>
                    <p className="text-xs font-semibold text-ink-500">
                      {staffSide ? 'FinEdge support' : (selected.customer?.fullName || 'Customer')} · {formatDateTime(m.at || m.timestamp)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{m.text || m.body || m.message || '—'}</p>
                  </div>
                );
              })}
              {(selected.messages || []).length === 0 && !selected.description && (
                <p className="text-sm text-ink-500">No messages on this ticket —</p>
              )}
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-ink-100 bg-porcelain-50 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap gap-2">
                {selected.status === 'OPEN' && (
                  <Button size="sm" variant="secondary" loading={statusBusy} disabled={isAuditor} title={isAuditor ? 'Auditors have read-only access and cannot change ticket status' : undefined} onClick={() => handleStatus('IN_PROGRESS', 'Ticket in progress')}>
                    Start progress
                  </Button>
                )}
                {selected.status !== 'RESOLVED' && (
                  <Button size="sm" variant="primary" loading={statusBusy} disabled={isAuditor} title={isAuditor ? 'Auditors have read-only access and cannot change ticket status' : undefined} onClick={() => handleStatus('RESOLVED', 'Ticket resolved')}>
                    Resolve
                  </Button>
                )}
                {selected.status === 'RESOLVED' && <p className="text-[13px] text-ink-500">This ticket is resolved.</p>}
              </div>
              <Field label="Reply to customer">
                <Textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply the customer will see in My Requests…"
                  disabled={isAuditor}
                  title={isAuditor ? 'Auditors have read-only access and cannot reply to tickets' : undefined}
                />
              </Field>
              <div className="flex justify-end">
                <Button loading={sending} disabled={!reply.trim() || isAuditor} title={isAuditor ? 'Auditors have read-only access and cannot reply to tickets' : undefined} onClick={handleReply}>
                  <Send className="h-4 w-4" aria-hidden /> Send reply
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
