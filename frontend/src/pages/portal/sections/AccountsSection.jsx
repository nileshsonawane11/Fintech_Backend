import { traceData } from '../../../lib/trace.js';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Landmark, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, FormError, PageLoading, SectionHeader, StatusChip } from '../../../components/ui.jsx';
import { formatDate, formatINR, maskAccount } from '../../../lib/format.js';
import { listAccounts } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';

export const ACCOUNT_LABELS = {
  SAVINGS: 'Everyday Savings',
  CURRENT: 'Trade Current',
  SALARY: 'Payroll Salary',
  STUDENT: 'Campus Student',
  MINOR: 'Sprout Minor',
};

export function accountLabel(account) {
  if (!account) return '—';
  return ACCOUNT_LABELS[account.type] || account.productName || 'FinEdge Account';
}

export default function AccountsPage() {
  const { user } = useAuth();
  useDbTick();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.customerId) return;
    traceData('PortalAccounts');
    let alive = true;
    listAccounts(user.customerId)
      .then((rows) => { if (alive) setAccounts(rows); })
      .catch((e) => { if (alive) setError(e.message || 'We could not load your accounts.'); });
    return () => { alive = false; };
  }, [user?.customerId]);

  if (!accounts && !error) return <PageLoading />;

  const total = (accounts || []).reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div>
      <SectionHeader titleAs="h1"
        eyebrow="My accounts"
        title="Accounts"
        description="Every FinEdge account in your name. Select an account to see its statement and recent activity."
      />

      <FormError message={error} />

      {accounts && accounts.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">Total balance</p>
            <p className="tnum mt-1 font-display text-3xl font-semibold text-midnight-950">{formatINR(total)}</p>
            <p className="mt-1 text-[13px] text-ink-500">Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
          </div>
          <Link to="/portal/transfers">
            <Button>Make a transfer</Button>
          </Link>
        </Card>
      )}

      {accounts && accounts.length === 0 && !error && (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          body="You do not have any FinEdge accounts yet. Once an account is opened for you, it will appear here with its balance and statement."
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <Link key={account.id} to={`/portal/accounts/${account.id}`} className="group block focus:outline-none">
              <Card className="h-full px-5 py-5 transition-colors group-hover:border-midnight-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-midnight-50 text-midnight-700">
                      <Landmark className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-ink-900">{accountLabel(account)}</p>
                      <p className="tnum text-[13px] text-ink-500">{maskAccount(account.accountNumber)}</p>
                    </div>
                  </div>
                  <StatusChip status={account.status} />
                </div>

                <p className="tnum mt-5 font-display text-2xl font-semibold text-midnight-950">{formatINR(account.balance)}</p>
                <p className="text-xs text-ink-500">Available balance</p>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink-100 pt-4 text-[13px]">
                  <div>
                    <dt className="text-ink-500">IFSC</dt>
                    <dd className="tnum font-medium text-ink-800">{account.ifsc || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Opened</dt>
                    <dd className="font-medium text-ink-800">{formatDate(account.openedAt)}</dd>
                  </div>
                  {account.branch && (
                    <div className="col-span-2">
                      <dt className="text-ink-500">Branch</dt>
                      <dd className="font-medium text-ink-800">{account.branch}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-midnight-800 group-hover:text-midnight-600">
                  View statement <ArrowRight className="h-4 w-4" aria-hidden />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
