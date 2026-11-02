import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, EyeOff, Search, Users, X } from 'lucide-react';
import { Button, Card, EmptyState, Input, PageLoading, SectionHeader, StatusChip, Table, useToast } from '../../../components/ui.jsx';
import { formatDate, formatINR, maskAccount, maskPan, productDisplayName, statusLabel } from '../../../lib/format.js';
import { getCustomerDetail, listCustomers } from '../../../services/managerBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function customersCsv(rows) {
  return [
    ['Customer', 'CIF', 'Email', 'Mobile', 'PAN', 'KYC Status', 'Risk', 'Created'].map(esc).join(','),
    ...rows.map((c) => [c.fullName, c.id, c.email, c.mobile, c.pan, c.kycStatus, c.riskCategory, c.createdAt].map(esc).join(',')),
  ].join('\n');
}

function addressText(address) {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  return [address.line1, address.line2, address.city, address.state, address.pin].filter(Boolean).join(', ') || '—';
}

export default function ManagerCustomersPage() {
  useDbTick();
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    listCustomers({ query: query.trim() || undefined })
      .then((r) => { if (alive) { setRows(r); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || 'Could not load customers.'); });
    return () => { alive = false; };
  }, [query]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let alive = true;
    setDetailLoading(true);
    getCustomerDetail(selectedId)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) toast({ tone: 'error', title: 'Could not load customer', body: e.message }); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const columns = useMemo(() => [
    {
      key: 'fullName', label: 'Customer',
      render: (c) => (
        <div>
          <p className="font-semibold text-ink-900">{c.fullName || '—'}</p>
          <p className="text-xs text-ink-500">DOB {c.dob ? formatDate(c.dob) : '—'}</p>
        </div>
      ),
    },
    { key: 'id', label: 'CIF', render: (c) => <span className="font-mono text-[13px]">{c.id}</span> },
    {
      key: 'contact', label: 'Contact',
      render: (c) => (
        <div>
          <p className="text-[13px]">{c.email || '—'}</p>
          <p className="text-[13px] text-ink-500">{c.mobile || '—'}</p>
        </div>
      ),
    },
    {
      key: 'pan', label: 'PAN',
      render: (c) => {
        const shown = !!revealed[c.id];
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[13px]">{shown ? (c.pan || '—') : maskPan(c.pan)}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRevealed((r) => ({ ...r, [c.id]: !r[c.id] })); }}
              className="rounded p-1 text-ink-500 hover:bg-midnight-50 hover:text-midnight-800"
              aria-label={shown ? `Hide PAN for ${c.fullName}` : `Reveal PAN for ${c.fullName}`}
              title={shown ? 'Hide PAN' : 'Reveal PAN for this session only'}
            >
              {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </span>
        );
      },
    },
    { key: 'kycStatus', label: 'KYC', render: (c) => <StatusChip status={c.kycStatus} /> },
    { key: 'riskCategory', label: 'Risk', render: (c) => <span className="text-ink-600">{c.riskCategory ? statusLabel(c.riskCategory) : '—'}</span> },
    { key: 'createdAt', label: 'Created', render: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span> },
  ], [revealed]);

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="Records"
        title="Customers"
        description="Search the customer directory by name, PAN, email, CIF or mobile. PANs are masked by default — a reveal applies only to this view, for this session."
        action={(
          <Button
            variant="ghost"
            onClick={() => { if (rows?.length) downloadCsv('finedge-customers.csv', customersCsv(rows)); }}
            disabled={!rows?.length}
          >
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search name, PAN, email, CIF or mobile…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        {rows && <p className="text-sm text-ink-500" aria-live="polite">{rows.length} {rows.length === 1 ? 'customer' : 'customers'} found</p>}
      </div>

      {error ? (
        <EmptyState variant="error" icon={Users} title="Could not load customers" body={error} />
      ) : !rows ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No customers match this search" body="Try a different name, PAN, email, CIF or mobile number." />
      ) : (
        <Table columns={columns} rows={rows} rowKey={(c) => c.id} onRowClick={(c) => setSelectedId(c.id)} />
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Customer detail">
          <div className="absolute inset-0 bg-midnight-950/60" onClick={() => setSelectedId(null)} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-modal">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-midnight-950">{detail?.customer?.fullName || 'Customer'}</h3>
                <p className="text-xs text-ink-500">{detail?.customer?.id || selectedId}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800" aria-label="Close customer detail">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {detailLoading || !detail ? <PageLoading /> : (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">Contact</h4>
                    <Card className="space-y-1.5 p-4 text-sm">
                      <p><span className="text-ink-500">Email:</span> {detail.customer.email || '—'}</p>
                      <p><span className="text-ink-500">Mobile:</span> {detail.customer.mobile || '—'}</p>
                      <p><span className="text-ink-500">Date of birth:</span> {formatDate(detail.customer.dob)}</p>
                      <p><span className="text-ink-500">PAN:</span> <span className="font-mono text-[13px]">{maskPan(detail.customer.pan)}</span></p>
                      <p><span className="text-ink-500">Address:</span> {addressText(detail.customer.address)}</p>
                      <p><span className="text-ink-500">Customer since:</span> {formatDate(detail.customer.createdAt)}</p>
                    </Card>
                  </section>

                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">KYC summary</h4>
                    <Card className="space-y-2 p-4 text-sm">
                      <p className="flex items-center gap-2">Status <StatusChip status={detail.customer.kycStatus} /></p>
                      <p className="flex items-center gap-2">Risk category <span className="font-medium text-ink-800">{detail.customer.riskCategory ? statusLabel(detail.customer.riskCategory) : '—'}</span></p>
                      <p className="text-[13px] leading-relaxed text-ink-600">
                        {detail.customer.kycStatus === 'VERIFIED'
                          ? 'KYC is verified for this customer. Document checks were completed through the simulated verification flow used in this demonstration.'
                          : 'KYC is not yet verified for this customer. Cases in progress appear in the KYC Queue for review.'}
                      </p>
                    </Card>
                  </section>

                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">Accounts</h4>
                    {detail.accounts.length === 0 ? <p className="text-sm text-ink-500">No accounts —</p> : (
                      <div className="space-y-2">
                        {detail.accounts.map((a) => (
                          <Card key={a.id} className="flex items-center justify-between p-4 text-sm">
                            <div>
                              <p className="font-medium text-ink-900">{a.productName || statusLabel(a.type)} · {maskAccount(a.accountNumber)}</p>
                              <p className="text-xs text-ink-500">{a.id} · Opened {formatDate(a.openedAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="tnum font-semibold text-ink-900">{formatINR(a.balance)}</p>
                              <StatusChip status={a.status} />
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">Loans</h4>
                    {detail.loans.length === 0 ? <p className="text-sm text-ink-500">No loans —</p> : (
                      <div className="space-y-2">
                        {detail.loans.map((l) => (
                          <Card key={l.id} className="flex items-center justify-between p-4 text-sm">
                            <div>
                              <p className="font-medium text-ink-900">{productDisplayName(l) || statusLabel(l.type) || 'Loan'}</p>
                              <p className="text-xs text-ink-500">{l.id}</p>
                            </div>
                            <div className="text-right">
                              <p className="tnum font-semibold text-ink-900">{formatINR(l.principal ?? l.amount)}</p>
                              <StatusChip status={l.status} />
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">Cards</h4>
                    {detail.cards.length === 0 ? <p className="text-sm text-ink-500">No cards —</p> : (
                      <div className="space-y-2">
                        {detail.cards.map((cd) => (
                          <Card key={cd.id} className="flex items-center justify-between p-4 text-sm">
                            <div>
                              <p className="font-medium text-ink-900">{cd.productName || cd.variant || statusLabel(cd.type || cd.cardType) || 'Card'} · {maskAccount(cd.cardNumber || cd.number)}</p>
                              <p className="text-xs text-ink-500">{cd.id}</p>
                            </div>
                            <StatusChip status={cd.status} />
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h4 className="mb-2 text-[13px] font-semibold text-ink-700">Recent tickets</h4>
                    {detail.tickets.length === 0 ? <p className="text-sm text-ink-500">No support tickets —</p> : (
                      <div className="space-y-2">
                        {detail.tickets.slice(0, 5).map((t) => (
                          <Card key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">{t.subject || '—'}</p>
                              <p className="text-xs text-ink-500">{t.id} · {formatDate(t.createdAt)}</p>
                            </div>
                            <StatusChip status={t.status} />
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                  {user?.role === 'AUDITOR' && <p className="text-xs text-ink-500">Auditor view is read-only.</p>}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
