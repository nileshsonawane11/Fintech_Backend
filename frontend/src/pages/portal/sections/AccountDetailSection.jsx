import { traceData } from '../../../lib/trace.js';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Download, FileText, Landmark, Layers, Plus, SearchX } from 'lucide-react';
import { Button, Card, EmptyState, Field, FormError, Input, Modal, PageLoading, SectionHeader, StatusChip, Table, useToast } from '../../../components/ui.jsx';
import { formatDate, formatINR, maskAccount } from '../../../lib/format.js';
import { getAccount, listAccounts, listMyCards, listTransactions, statementCsv } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { accountLabel } from './AccountsSection.jsx';
import { InPortalAccountApplyModal } from '../../../components/common/InPortalAccountApplyModal.jsx';

function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AccountDetailPage({ accountId }) {
  const { id: paramId } = useParams();
  const id = accountId || paramId;
  const { toast } = useToast();
  const { user } = useAuth();
  useDbTick();
  const [pdfBusy, setPdfBusy] = useState(false);

  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState('');
  const [transactions, setTransactions] = useState(null);
  const [txnError, setTxnError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Additional data for Part 4, 7, 9
  const [cards, setCards] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [allAccountsModalOpen, setAllAccountsModalOpen] = useState(false);

  // Preference-driven format default (Fix 78)
  const preferredFormat = (() => {
    try {
      const raw = window.localStorage.getItem('finedge-prefs');
      if (raw) return JSON.parse(raw).statementFormat || 'PDF';
    } catch {}
    return 'PDF';
  })();

  const loadAccountAndCards = useCallback(() => {
    let alive = true;
    traceData('PortalAccountDetail');
    getAccount(id)
      .then((acc) => { if (alive) setAccount(acc); })
      .catch((e) => { if (alive) setAccountError(e.message || 'Account not found.'); });

    if (user?.customerId) {
      listMyCards(user.customerId)
        .then((cardList) => { if (alive) setCards(cardList || []); })
        .catch(() => {});

      listAccounts(user.customerId)
        .then((accList) => { if (alive) setAllAccounts(accList || []); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [id, user?.customerId]);

  useEffect(() => {
    loadAccountAndCards();
  }, [loadAccountAndCards]);

  const loadTransactions = useCallback(() => {
    let alive = true;
    setTxnError('');
    listTransactions(id, { from: from || undefined, to: to || undefined })
      .then((rows) => { if (alive) setTransactions(rows); })
      .catch((e) => { if (alive) { setTxnError(e.message || 'We could not load transactions.'); setTransactions([]); } });
    return () => { alive = false; };
  }, [id, from, to]);

  useEffect(() => loadTransactions(), [loadTransactions]);

  const filtered = Boolean(from || to);

  const clearFilters = () => { setFrom(''); setTo(''); };

  const quickThisMonth = () => {
    const now = new Date();
    setFrom(isoDay(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(isoDay(now));
  };

  const quickLast3Months = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    setFrom(isoDay(start));
    setTo(isoDay(now));
  };

  const downloadCsv = () => {
    if (!account || !transactions) return;
    const csv = statementCsv(account, transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finedge-statement-${account.accountNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Statement downloaded', body: 'Your statement CSV has been saved to your downloads.' });
  };

  const downloadPdf = async () => {
    if (!account || !transactions) return;
    setPdfBusy(true);
    try {
      const { downloadStatementPdf } = await import('../../../lib/statementPdf.js');
      await downloadStatementPdf({ account, transactions, customerName: user?.name || '' });
      toast({ title: 'Statement downloaded', body: 'Your statement PDF has been saved to your downloads.' });
    } catch {
      toast({ tone: 'error', title: 'Could not generate PDF', body: 'The statement PDF could not be created. Please try the CSV download instead.' });
    } finally {
      setPdfBusy(false);
    }
  };

  if (accountError) {
    return (
      <div>
        <Link to="/portal/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to accounts
        </Link>
        <EmptyState
          variant="error"
          icon={SearchX}
          title="Account not found"
          body={accountError}
          action={<Link to="/portal/accounts"><Button variant="secondary">Back to accounts</Button></Link>}
        />
      </div>
    );
  }

  if (!account) return <PageLoading />;

  // Filter cards linked to this account (Part 7)
  const linkedCards = (cards || []).filter(c => 
    c.linkedAccountId === account.id || 
    c.linkedAccountId === account.accountId || 
    c.linkedAccountId === account.accountNumber ||
    c.linkedAccountId === account.rawAccountNumber
  );

  const totalAllAccounts = (allAccounts || []).reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const columns = [
    { key: 'date', label: 'Date', render: (t) => <span className="whitespace-nowrap">{formatDate(t.date)}</span> },
    {
      key: 'description',
      label: 'Description',
      render: (t) => (
        <span>
          <span className="block font-medium text-ink-900">{t.description || '—'}</span>
          {t.category && <span className="block text-xs text-ink-500">{t.category}</span>}
        </span>
      ),
    },
    { key: 'reference', label: 'Reference', render: (t) => <span className="tnum text-[13px] text-ink-600">{t.reference || '—'}</span> },
    { key: 'debit', label: 'Debit', align: 'right', render: (t) => (t.type === 'DEBIT' ? <span className="tnum">{formatINR(t.amount)}</span> : <span className="text-ink-300">—</span>) },
    { key: 'credit', label: 'Credit', align: 'right', render: (t) => (t.type === 'CREDIT' ? <span className="tnum text-success-600">{formatINR(t.amount)}</span> : <span className="text-ink-300">—</span>) },
    { key: 'balance', label: 'Balance', align: 'right', render: (t) => <span className="tnum font-medium">{t.balance != null ? formatINR(t.balance) : '—'}</span> },
  ];

  return (
    <div>
      {/* Top Header Affordances */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/portal/accounts" className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to accounts
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Part 9: All-accounts balance view affordance */}
          <Button variant="secondary" size="sm" onClick={() => setAllAccountsModalOpen(true)}>
            <Layers className="h-4 w-4" aria-hidden /> View All Accounts Balance
          </Button>
          {/* Part 4: Apply for an account affordance inside account detail view */}
          <Button variant="primary" size="sm" onClick={() => setApplyModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Apply for an Account
          </Button>
        </div>
      </div>

      <Card className="mb-6 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-primary">{accountLabel(account)}</p>
            <h1 className="tnum mt-1 font-sans text-2xl font-semibold text-midnight-950">{maskAccount(account.accountNumber)}</h1>
            <p className="tnum mt-1 text-[13px] text-ink-500">
              Account {account.accountNumber || '—'}{account.ifsc ? ` · IFSC ${account.ifsc}` : ''}{account.branch ? ` · ${account.branch}` : ''}
            </p>
          </div>
          <StatusChip status={account.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-ink-100 pt-4">
          <div>
            <p className="text-xs text-ink-500">Available balance</p>
            <p className="tnum mt-0.5 font-sans text-2xl font-semibold text-midnight-950">{formatINR(account.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Opened</p>
            <p className="mt-0.5 text-sm font-medium text-ink-800">{formatDate(account.openedAt)}</p>
          </div>
          {typeof account.interestRate === 'number' && account.interestRate > 0 && (
            <div>
              <p className="text-xs text-ink-500">Interest rate</p>
              <p className="tnum mt-0.5 text-sm font-medium text-ink-800">{account.interestRate}% p.a.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Part 7: Issued Cards Section */}
      <Card className="mb-6 px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <CreditCard className="h-4.5 w-4.5 text-bank-primary" />
            Cards Issued Against This Account
          </h2>
          <span className="text-xs font-medium text-ink-500">
            {linkedCards.length} {linkedCards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>
        {linkedCards.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {linkedCards.map((c) => {
              const isBlocked = c.status === 'BLOCKED';
              const isTempBlocked = isBlocked && c.blockType === 'TEMPORARY';
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-ink-200 bg-porcelain-50 p-4 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-ink-200 text-bank-primary shadow-xs">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 text-sm truncate">{c.productName || c.cardName}</p>
                      <p className="font-mono text-ink-500 text-xs truncate mt-0.5">
                        {c.maskedCardNumber || c.number} · {c.cardType || c.kind}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate mt-0.5">
                        Cardholder: {user?.name || 'Customer'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {isBlocked ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${isTempBlocked ? 'bg-amber-100 text-amber-800' : 'bg-danger-100 text-danger-800'}`}>
                        {isTempBlocked ? 'TEMPORARILY BLOCKED' : 'PERMANENTLY BLOCKED'}
                      </span>
                    ) : (
                      <StatusChip status={c.status} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-ink-200 p-6 text-center">
            <CreditCard className="mx-auto h-7 w-7 text-ink-300 mb-1.5" />
            <p className="text-sm font-medium text-ink-600">No cards issued against this account.</p>
            <p className="text-xs text-ink-400 mt-0.5">Debit or credit cards linked to this account number will appear here.</p>
          </div>
        )}
      </Card>

      <SectionHeader
        eyebrow="Statement"
        title="Transactions"
        description="Your account statement for the selected period. Download a PDF or CSV copy for your records."
        action={(
          <div className="flex flex-wrap gap-2">
            {preferredFormat === 'CSV' ? (
              <>
                <Button variant="primary" onClick={downloadCsv} disabled={!transactions || transactions.length === 0}>
                  <Download className="h-4 w-4" aria-hidden /> Download CSV
                </Button>
                <Button variant="secondary" onClick={downloadPdf} loading={pdfBusy} disabled={!transactions || transactions.length === 0}>
                  <FileText className="h-4 w-4" aria-hidden /> Download PDF
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" onClick={downloadPdf} loading={pdfBusy} disabled={!transactions || transactions.length === 0}>
                  <FileText className="h-4 w-4" aria-hidden /> Download PDF
                </Button>
                <Button variant="secondary" onClick={downloadCsv} disabled={!transactions || transactions.length === 0}>
                  <Download className="h-4 w-4" aria-hidden /> Download CSV
                </Button>
              </>
            )}
          </div>
        )}
      />

      <Card className="mb-5 px-4 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Field label="From date">
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </Field>
          </div>
          <div className="w-44">
            <Field label="To date">
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Button variant="secondary" size="sm" onClick={quickThisMonth}>This month</Button>
            <Button variant="secondary" size="sm" onClick={quickLast3Months}>Last 3 months</Button>
            {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}>View all</Button>}
          </div>
        </div>
      </Card>

      <FormError message={txnError} />

      {txnError ? (
        <Card className="p-6 text-center my-4">
          <p className="text-sm text-danger-600 mb-3">{txnError}</p>
          <Button variant="secondary" size="sm" onClick={loadTransactions}>Retry loading transactions</Button>
        </Card>
      ) : transactions === null ? (
        <PageLoading />
      ) : (
        <Table
          columns={columns}
          rows={transactions || []}
          rowKey={(t) => t.id || `${t.date}-${t.reference}`}
          empty={
            filtered ? (
              <EmptyState
                icon={FileText}
                title="No transactions in this period"
                body="No transactions fall inside the dates you selected. Try a wider range, or view the full statement."
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No transactions yet"
                body="There has been no activity on this account yet. Transactions will appear here as soon as money moves in or out."
              />
            )
          }
        />
      )}

      {/* Part 9: All Accounts Balance Overview Modal */}
      <Modal
        open={allAccountsModalOpen}
        onClose={() => setAllAccountsModalOpen(false)}
        title="All Accounts Balance Overview"
        footer={
          <Button variant="primary" onClick={() => setAllAccountsModalOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-500">
            Live balance across all FinEdge accounts in your name. All figures match your portal dashboard and accounts list.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(allAccounts || []).map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  acc.id === id ? 'border-bank-primary bg-bank-primary-light/20' : 'border-ink-200 bg-porcelain-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${acc.id === id ? 'bg-bank-primary text-white' : 'bg-porcelain-100 text-ink-700'}`}>
                    <Landmark className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{accountLabel(acc)}</p>
                    <p className="font-mono text-xs text-ink-500">{maskAccount(acc.accountNumber)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="tnum font-sans text-sm font-bold text-ink-900">{formatINR(acc.balance)}</p>
                  <StatusChip status={acc.status} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-midnight-950 p-4 text-white flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-300 font-semibold">Total Combined Balance</p>
              <p className="text-xs text-ink-400 mt-0.5">Sum across {allAccounts.length} {allAccounts.length === 1 ? 'account' : 'accounts'}</p>
            </div>
            <p className="tnum font-sans text-2xl font-bold text-white">
              {formatINR(totalAllAccounts)}
            </p>
          </div>
        </div>
      </Modal>

      {/* Part 4: In-Portal Account Application Modal */}
      <InPortalAccountApplyModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onApplied={() => loadAccountAndCards()}
      />
    </div>
  );
}
