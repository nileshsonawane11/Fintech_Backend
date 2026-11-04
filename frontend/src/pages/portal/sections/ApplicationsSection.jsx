import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, FileText, Landmark, Receipt, TrendingUp } from 'lucide-react';
import {
  Card, EmptyState, FormError, PageLoading, SectionHeader, StatusChip, Stepper,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import { formatDate, formatDateTime, formatINR, productDisplayName } from '../../../lib/format.js';
import { listMyLoanApplications, listMyCardApplications, listMyInvestmentApplications, listAccountApplications } from '../../../services/portalBridge.js';

const ctaCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-midnight-800 px-4 py-2.5 text-sm font-medium text-porcelain-50 shadow-sm transition-colors hover:bg-midnight-700';

function newestFirst(rows, dateOf) {
  return [...(rows || [])].sort((a, b) => {
    const da = dateOf(a) || '';
    const db = dateOf(b) || '';
    return da < db ? 1 : da > db ? -1 : 0;
  });
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  useDbTick();
  const customerId = user?.customerId;
  const [loans, setLoans] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customerId) return undefined;
    let live = true;
    setLoading(true);
    Promise.allSettled([
      listMyLoanApplications(customerId),
      listMyCardApplications(customerId),
      listMyInvestmentApplications(customerId),
      listAccountApplications({}),
    ]).then(([loanRes, cardRes, invRes, accRes]) => {
      if (!live) return;
      if (loanRes.status === 'fulfilled') setLoans(newestFirst(loanRes.value, (a) => a.submittedAt || a.appliedAt));
      if (cardRes.status === 'fulfilled') setCards(newestFirst(cardRes.value, (a) => a.submittedAt || a.appliedAt));
      if (invRes.status === 'fulfilled') setInvestments(newestFirst(invRes.value, (a) => a.submittedAt || a.appliedAt));
      if (accRes.status === 'fulfilled') {
        const mine = (accRes.value || []).filter((a) => a.customerId === customerId);
        setAccounts(newestFirst(mine, (a) => a.submittedAt || a.appliedAt || a.createdAt));
      }
      const failed = [loanRes, cardRes, invRes, accRes].filter((r) => r.status === 'rejected');
      setError(failed.length === 4 ? 'We could not load your applications. Please try again.' : '');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [customerId]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-10">
      <SectionHeader titleAs="h1"
        eyebrow="Tracker"
        title="My applications"
        description="Every application you have made with FinEdge — loans, cards and accounts — with its current stage. Rejected and declined applications stay visible here so the outcome is never hidden."
      />
      <FormError message={error} />

      {/* Loans */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
          <Receipt className="h-5 w-5 text-midnight-700" aria-hidden /> Loan applications
          <span className="text-sm font-normal text-ink-500">({loans.length})</span>
        </h3>
        {loans.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No loan applications yet"
            body="When you apply for a loan, its progress will appear here stage by stage."
            action={<Link to="/portal/loans" className={ctaCls}>Explore loans</Link>}
          />
        ) : (
          <div className="space-y-4">
            {loans.map((app) => (
              <Card key={app.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{productDisplayName(app) || 'Loan application'}</p>
                    <p className="tnum mt-0.5 text-[13px] text-ink-500">
                      {app.id} · {formatINR(app.amount)} over {app.tenureMonths || '—'} months
                      {app.emi ? ` · EMI ${formatINR(app.emi)}` : ''}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-500">Submitted {formatDate(app.submittedAt || app.appliedAt)}</p>
                  </div>
                  <StatusChip status={app.status} />
                </div>
                {Array.isArray(app.steps) && app.steps.length > 0 && (
                  <div className="mt-5">
                    <Stepper
                      steps={app.steps.map((s) => ({
                        label: s.label,
                        state: s.state,
                        date: s.date ? formatDate(s.date) : undefined,
                      }))}
                    />
                  </div>
                )}
                {app.purpose && <p className="mt-3 text-[13px] leading-relaxed text-ink-600">Purpose: {app.purpose}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
          <CreditCard className="h-5 w-5 text-midnight-700" aria-hidden /> Card applications
          <span className="text-sm font-normal text-ink-500">({cards.length})</span>
        </h3>
        {cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No card applications yet"
            body="Card applications you submit will appear here until the card is issued or the application is closed."
            action={<Link to="/portal/cards" className={ctaCls}>Explore cards</Link>}
          />
        ) : (
          <div className="space-y-3">
            {cards.map((app) => (
              <Card key={app.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{app.productName || app.variant || productDisplayName(app) || 'Card application'}</p>
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      {app.id} · {(app.kind || app.cardType || 'Card')} card
                      {app.requestedLimit ? ` · Requested limit ${formatINR(app.requestedLimit)}` : ''}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-500">Submitted {formatDateTime(app.submittedAt || app.appliedAt)}</p>
                  </div>
                  <StatusChip status={app.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Accounts */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
          <Landmark className="h-5 w-5 text-midnight-700" aria-hidden /> Account applications
          <span className="text-sm font-normal text-ink-500">({accounts.length})</span>
        </h3>
        {accounts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No account applications yet"
            body="Accounts you apply for on the public site will be tracked here while they are reviewed."
            action={<Link to="/accounts" className={ctaCls}>Browse accounts</Link>}
          />
        ) : (
          <div className="space-y-3">
            {accounts.map((app) => (
              <Card key={app.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{app.productName || app.accountType || 'Account application'}</p>
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      {app.id}
                      {app.accountType ? ` · ${app.accountType}` : ''}
                      {app.initialFunding != null ? ` · Initial funding ${formatINR(app.initialFunding)}` : ''}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-500">Submitted {formatDateTime(app.submittedAt || app.appliedAt || app.createdAt)}</p>
                  </div>
                  <StatusChip status={app.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Investments */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-midnight-950">
          <TrendingUp className="h-5 w-5 text-midnight-700" aria-hidden /> Investment applications
          <span className="text-sm font-normal text-ink-500">({investments.length})</span>
        </h3>
        {investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investment applications yet"
            body="Applications for Fixed Deposits, Recurring Deposits, SIPs or SSY will appear here with live tracking."
            action={<Link to="/investments" className={ctaCls}>Explore investments</Link>}
          />
        ) : (
          <div className="space-y-4">
            {investments.map((app) => {
              const d = app.investmentDetails || {};
              let detailLine = '';
              if (app.kind === 'FD') {
                detailLine = `${formatINR(d.depositAmount || d.amount)} · ${d.tenureBand || '—'} · ${d.appliedRate ? d.appliedRate + '% p.a.' : '—'}${d.maturityValue ? ` · Maturity ${formatINR(d.maturityValue)}` : ''}`;
              } else if (app.kind === 'RD') {
                detailLine = `${formatINR(d.monthlyDeposit || d.monthlyAmount)}/mo · ${d.tenureBand || '—'}${d.maturityValue ? ` · Maturity ${formatINR(d.maturityValue)}` : ''}`;
              } else if (app.kind === 'SIP') {
                detailLine = `${d.fundCategory || 'Mutual Fund'} · ${formatINR(d.monthlyInvestment || d.monthlyAmount)}/mo (Debit Day ${d.sipDate || 5}) · ${d.durationYears || '—'} yrs`;
              } else if (app.kind === 'SSY') {
                detailLine = `${formatINR(d.annualDeposit)}/yr · Child: ${d.childName || '—'}${d.maturityValue ? ` · Maturity ${formatINR(d.maturityValue)}` : ''}`;
              }

              return (
                <Card key={app.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{app.productName || 'Investment Application'}</p>
                      <p className="tnum mt-0.5 text-[13px] text-ink-500">
                        {app.id} {detailLine ? `· ${detailLine}` : ''}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">Submitted {formatDate(app.submittedAt || app.appliedAt)}</p>
                    </div>
                    <StatusChip status={app.status} />
                  </div>
                  {Array.isArray(app.steps) && app.steps.length > 0 && (
                    <div className="mt-5">
                      <Stepper
                        steps={app.steps.map((s) => ({
                          label: s.label,
                          state: s.state,
                          date: s.date ? formatDate(s.date) : undefined,
                        }))}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
