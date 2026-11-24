import { traceData } from '../../../lib/trace.js';
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CreditCard, Landmark, Plus, Wallet } from 'lucide-react';
import { Button, Card, EmptyState, FormError, PageLoading, SectionHeader, StatusChip } from '../../../components/ui.jsx';
import { formatDate, formatINR, maskAccount } from '../../../lib/format.js';
import { listAccounts, listMyCards } from '../../../services/portalBridge.js';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { InPortalAccountApplyModal } from '../../../components/common/InPortalAccountApplyModal.jsx';

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
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState(null);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');
  const [applyModalOpen, setApplyModalOpen] = useState(() => searchParams.get('apply') === '1' || searchParams.get('action') === 'apply');

  useEffect(() => {
    if (searchParams.get('apply') === '1' || searchParams.get('action') === 'apply') {
      setApplyModalOpen(true);
    }
  }, [searchParams]);

  const loadData = useCallback(() => {
    if (!user?.customerId) return;
    traceData('PortalAccounts');
    let alive = true;
    listAccounts(user.customerId)
      .then((rows) => { if (alive) setAccounts(rows); })
      .catch((e) => { if (alive) setError(e.message || 'We could not load your accounts.'); });

    listMyCards(user.customerId)
      .then((cardRows) => { if (alive) setCards(cardRows || []); })
      .catch(() => {});

    return () => { alive = false; };
  }, [user?.customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!accounts && !error) return <PageLoading />;

  const total = (accounts || []).reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div>
      <SectionHeader
        titleAs="h1"
        eyebrow="My accounts"
        title="Accounts"
        description="Every FinEdge account in your name. Select an account to see its statement and recent activity."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setApplyModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Apply for an Account
            </Button>
          </div>
        }
      />

      <FormError message={error} />

      {accounts && accounts.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-primary">Total balance</p>
            <p className="tnum mt-1 font-sans text-3xl font-semibold text-midnight-950">{formatINR(total)}</p>
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
          action={
            <Button onClick={() => setApplyModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Apply for an Account
            </Button>
          }
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const linkedCards = (cards || []).filter(c => 
              c.linkedAccountId === account.id || 
              c.linkedAccountId === account.accountId || 
              c.linkedAccountId === account.accountNumber ||
              c.linkedAccountId === account.rawAccountNumber
            );

            return (
              <Card key={account.id} className="flex flex-col justify-between h-full px-5 py-5 transition-colors hover:border-midnight-300">
                <div>
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

                  <p className="tnum mt-5 font-sans text-2xl font-semibold text-midnight-950">{formatINR(account.balance)}</p>
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

                  {/* Part 7: Cards issued against this account */}
                  <div className="mt-4 border-t border-ink-100 pt-3">
                    <p className="text-xs font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-bank-primary" />
                      Issued Cards
                    </p>
                    {linkedCards.length > 0 ? (
                      <div className="space-y-2">
                        {linkedCards.map((c) => {
                          const isBlocked = c.status === 'BLOCKED';
                          const isTempBlocked = isBlocked && c.blockType === 'TEMPORARY';
                          return (
                            <div
                              key={c.id}
                              className="rounded-lg border border-ink-200 bg-porcelain-50 p-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CreditCard className="h-4 w-4 shrink-0 text-ink-600" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink-900 truncate">{c.productName || c.cardName}</p>
                                  <p className="font-mono text-ink-500 text-[11px] truncate">
                                    {c.maskedCardNumber || c.number} · {user?.name || 'Cardholder'}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {isBlocked ? (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isTempBlocked ? 'bg-amber-100 text-amber-800' : 'bg-danger-100 text-danger-800'}`}>
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
                      <p className="text-xs text-ink-500 italic py-1">No cards issued against this account.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-ink-100 pt-3">
                  <Link
                    to={`/portal/accounts/${account.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-midnight-800 hover:text-midnight-600"
                  >
                    View statement <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Part 4: In-Portal Account Application Modal */}
      <InPortalAccountApplyModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onApplied={() => loadData()}
      />
    </div>
  );
}
