import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, SearchX } from 'lucide-react';
import { Button, Card, EmptyState, Field, FormError, Input, PageLoading, SectionHeader, StatusChip, Table, useToast } from '../../../components/ui.jsx';
import { formatDate, formatINR, maskAccount } from '../../../lib/format.js';
import { getAccount, listTransactions, statementCsv } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { accountLabel } from './AccountsSection.jsx';

function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AccountDetailPage() {
  const { id } = useParams();
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

  useEffect(() => {
    let alive = true;
    getAccount(id)
      .then((acc) => { if (alive) setAccount(acc); })
      .catch((e) => { if (alive) setAccountError(e.message || 'Account not found.'); });
    return () => { alive = false; };
  }, [id]);

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
    { key: 'balance', label: 'Balance', align: 'right', render: (t) => <span className="tnum font-medium">{formatINR(t.balance)}</span> },
  ];

  return (
    <div>
      <Link to="/portal/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-midnight-800 hover:text-midnight-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to accounts
      </Link>

      <Card className="mb-6 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">{accountLabel(account)}</p>
            <h1 className="tnum mt-1 font-display text-2xl font-semibold text-midnight-950">{maskAccount(account.accountNumber)}</h1>
            <p className="tnum mt-1 text-[13px] text-ink-500">
              Account {account.accountNumber || '—'}{account.ifsc ? ` · IFSC ${account.ifsc}` : ''}{account.branch ? ` · ${account.branch}` : ''}
            </p>
          </div>
          <StatusChip status={account.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-ink-100 pt-4">
          <div>
            <p className="text-xs text-ink-500">Available balance</p>
            <p className="tnum mt-0.5 font-display text-2xl font-semibold text-midnight-950">{formatINR(account.balance)}</p>
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

      <SectionHeader
        eyebrow="Statement"
        title="Transactions"
        description="Your account statement for the selected period. Download a PDF or CSV copy for your records."
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadPdf} loading={pdfBusy} disabled={!transactions || transactions.length === 0}>
              <FileText className="h-4 w-4" aria-hidden /> Download PDF
            </Button>
            <Button variant="secondary" onClick={downloadCsv} disabled={!transactions || transactions.length === 0}>
              <Download className="h-4 w-4" aria-hidden /> Download CSV
            </Button>
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

      {transactions === null && !txnError ? (
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
    </div>
  );
}
