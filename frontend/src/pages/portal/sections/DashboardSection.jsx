import Reveal from '../../../components/Reveal.jsx';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, CalendarClock, ChevronRight,
  CreditCard, Eye, EyeOff, FileCheck2, PiggyBank, Receipt, Search,
  TrendingDown, TrendingUp, Download, Sparkles, Wallet
} from 'lucide-react';
import {
  Button, Card, EmptyState, PageLoading, StatusChip, Stepper,
} from '../../../components/ui.jsx';
import { useAuth, useDbTick } from '../../../context/AuthContext.jsx';
import * as accountsApi from '../../../services/portalBridge.js';
import * as kycApi from '../../../services/portalBridge.js';
import * as loansApi from '../../../services/portalBridge.js';
import * as supportApi from '../../../services/portalBridge.js';
import { formatDate, formatDateTime, formatINR, formatSignedINR, maskAccount, productDisplayName } from '../../../lib/format.js';
import { FD } from '../../../data/products.js';

const ACCOUNT_TYPE_LABELS = {
  SAVINGS: 'Everyday Savings',
  CURRENT: 'Trade Current',
  SALARY: 'Payroll Salary',
  STUDENT: 'Campus Student',
  MINOR: 'Sprout Minor',
};

function typeLabel(type) {
  if (!type) return 'Account';
  return ACCOUNT_TYPE_LABELS[type] || String(type).charAt(0) + String(type).slice(1).toLowerCase();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const maxFdRate = Math.max(...(FD.rateGrid || []).map(g => g.general || 0));
const maxFdRateSub = `FD up to ${maxFdRate.toFixed(2)}% p.a.`;

const TOP_FREQUENT_ACTIONS = [
  { to: '/portal/transfers', label: 'Transfer Funds', sub: 'NEFT, IMPS & UPI', icon: ArrowLeftRight },
  { to: '/portal/transfers?mode=upi', label: 'Pay Bills & UPI', sub: 'Utilities & merchants', icon: Receipt },
  { to: '/portal/accounts', label: 'View Statement', sub: 'Download reports', icon: Download },
  { to: '/portal/cards', label: 'Manage Cards', sub: 'Limits & freeze', icon: CreditCard },
  { to: '/portal/investments', label: 'Book Deposit', sub: maxFdRateSub, icon: PiggyBank },
];

const ACTIVE_APP_STATUSES = ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'UNDER_REVIEW', 'INFO_REQUIRED', 'APPROVED', 'PENDING', 'BOOKED'];

function SubHead({ title, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      {action}
    </div>
  );
}

function TextLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-midnight-800 hover:text-midnight-600">
      {children} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  useDbTick();
  const customerId = user?.customerId;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [monthTxns, setMonthTxns] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const [applications, setApplications] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [unread, setUnread] = useState(0);

  // Privacy-conscious balance toggle (persisted)
  const [showBalance, setShowBalance] = useState(() => {
    try {
      return localStorage.getItem('finedge_show_balance') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('finedge_show_balance', String(next));
      } catch {}
      return next;
    });
  };

  // Search and filter on transactions
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'

  const load = useCallback(async () => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const [accs, profile, apps, unreadN, hlds, crds, myLoans, bens] = await Promise.all([
        accountsApi.listAccounts(customerId),
        kycApi.getMyProfile(customerId).catch(() => null),
        accountsApi.listMyApplications(customerId).catch(() => []),
        supportApi.unreadCount(customerId).catch(() => 0),
        accountsApi.listHoldings(customerId).catch(() => []),
        accountsApi.listMyCards(customerId).catch(() => []),
        loansApi.listMyLoans(customerId).catch(() => []),
        accountsApi.listBeneficiaries(customerId).catch(() => []),
      ]);
      setAccounts(accs || []);
      setHoldings(hlds || []);
      setCards(crds || []);
      setLoans(myLoans || []);
      setBeneficiaries(bens || []);

      const perAccount = await Promise.all(
        (accs || []).map(async (a) => {
          const txns = await accountsApi.listTransactions(a.id);
          return txns.map((t) => ({ ...t, account: a }));
        }),
      );
      const allTxns = perAccount.flat().sort((a, b) => (a.date < b.date ? 1 : -1));
      setRecentTxns(allTxns.slice(0, 12));

      // Current calendar month window
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = allTxns.filter(t => String(t.date).slice(0, 7) === currentYearMonth);
      setMonthTxns(inMonth);

      if (profile?.kycCase) {
        let status = profile.customer?.kycStatus || profile.kycCase?.status || null;
        if (profile.kycCase?.status === 'APPROVED') status = 'VERIFIED';
        if (profile.kycCase?.status === 'INFO_REQUIRED') status = 'PENDING';
        setKycStatus(status);
      }
      setApplications((apps || []).filter((a) => ACTIVE_APP_STATUSES.includes(a.status)));
      setUnread(unreadN || 0);
    } catch (err) {
      setLoadError(err.message || 'We could not load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading />;

  if (loadError) {
    return (
      <EmptyState
        variant="error"
        icon={Wallet}
        title="Your dashboard didn’t load"
        body={loadError}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const primaryAccount = accounts[0] || null;
  const firstName = (user?.name || user?.fullName || '').split(' ')[0] || 'there';
  const lastLogin = user?.lastLogin || user?.lastLoginAt;
  const money = (v) => (showBalance ? formatINR(v) : '••••••');

  // Month Cash Flow calculations over defined calendar window
  const now = new Date();
  const currentMonthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthCredits = monthTxns
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthDebits = monthTxns
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Real deposits snapshot from holdings
  const totalHoldingsPrincipal = holdings.reduce(
    (sum, h) => sum + Number(h.depositAmount || h.principal || h.monthlyInstallment || h.annualDeposit || 0),
    0
  );

  // Cards snapshot
  const creditCards = cards.filter((c) => c.kind === 'CREDIT');
  const totalCreditOutstanding = creditCards.reduce((sum, c) => sum + Number(c.outstanding || 0), 0);

  // Fix 10: Upcoming obligations strip
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingLoan = loans.find((l) => l.status === 'ACTIVE' && l.nextEmiDate);
  const maturingDeposits = holdings.filter(
    (h) => h.status === 'ACTIVE' && h.maturityDate && h.maturityDate >= todayStr && h.maturityDate <= thirtyDaysFromNow
  );
  const activeSips = holdings.filter((h) => h.status === 'ACTIVE' && h.kind === 'SIP');

  const hasObligations = Boolean(upcomingLoan || maturingDeposits.length > 0 || activeSips.length > 0);

  const filteredTxns = recentTxns.filter((t) => {
    if (txnFilter === 'CREDIT' && t.type !== 'CREDIT') return false;
    if (txnFilter === 'DEBIT' && t.type !== 'DEBIT') return false;
    if (txnSearch.trim()) {
      const q = txnSearch.toLowerCase();
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const refMatch = (t.reference || t.referenceNumber || '').toLowerCase().includes(q);
      const amtMatch = String(t.amount || '').includes(q);
      return descMatch || refMatch || amtMatch;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Simulation Banner Notice */}
      <div className="flex items-center justify-between rounded-lg border border-gold-400/30 bg-gold-400/10 px-4 py-2 text-xs text-midnight-950">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-600" />
          <span className="font-semibold">Demonstration Environment</span>
          <span className="hidden sm:inline text-ink-600">— Simulated payment rails &amp; balances. No real money is moved.</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-gold-700">ACTIVE SESSION</span>
      </div>

      {/* Greeting row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-midnight-950 sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Customer ID: <span className="font-mono font-medium text-ink-800">{user?.customerId || ''}</span>
            {lastLogin ? <> · Last sign-in: {formatDateTime(lastLogin)}</> : null}
          </p>
        </div>
        <Link
          to="/portal/notifications"
          className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-midnight-900 transition-colors hover:border-midnight-400 shadow-sm"
        >
          <Bell className="h-4 w-4 text-ink-600" aria-hidden />
          <span>Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-bold text-white">{unread}</span>
          )}
        </Link>
      </div>

      {/* KYC Alert if not verified */}
      {kycStatus && kycStatus !== 'VERIFIED' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-600/30 bg-warning-50 px-4 py-3.5">
          <FileCheck2 className="h-5 w-5 shrink-0 text-warning-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">Your statutory KYC review is in progress</p>
            <p className="text-[13px] leading-relaxed text-ink-600">
              Transactions and high-value limits will activate once identity verification is approved.
            </p>
          </div>
          <StatusChip status={kycStatus} />
          <Link to="/portal/kyc">
            <Button size="sm">Review KYC Documents</Button>
          </Link>
        </div>
      )}

      {/* Lead Summary: Privacy-conscious Account Balance */}
      <Reveal treatment="B" staggerIndex={0}>
        <div className="rounded-xl bg-midnight-900 px-5 py-6 text-porcelain-50 shadow-card sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">Total balance</p>
                <button
                  type="button"
                  onClick={toggleShowBalance}
                  className="inline-flex items-center gap-1 rounded bg-midnight-800/80 px-2 py-0.5 text-[11px] font-medium text-midnight-200 hover:text-white"
                  title={showBalance ? 'Click to hide balance' : 'Click to reveal balance'}
                >
                  {showBalance ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <p className="tnum mt-2 font-display text-3xl font-semibold sm:text-4xl text-porcelain-50">{money(totalBalance)}</p>
              <p className="mt-1 text-[13px] text-midnight-200">
                Across {accounts.length} active {accounts.length === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </div>

          {primaryAccount && (
            <Link
              to={`/portal/accounts/${primaryAccount.id}`}
              className="mt-6 flex items-center gap-3 border-t border-porcelain-50/15 pt-4 transition-colors hover:text-white"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{typeLabel(primaryAccount.type)}</span>
                <span className="tnum block text-[13px] text-midnight-200">{maskAccount(primaryAccount.accountNumber)}</span>
              </span>
              <span className="tnum text-sm font-semibold">{money(primaryAccount.balance)}</span>
              <ChevronRight className="h-4.5 w-4.5 shrink-0 text-midnight-300" aria-hidden />
            </Link>
          )}
        </div>
      </Reveal>

      {/* Fix 10: Upcoming Obligations Strip (Rendered ONLY when non-empty) */}
      {hasObligations && (
        <section aria-label="Upcoming Obligations">
          <SubHead title="Upcoming Obligations" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingLoan && (
              <Card className="p-4 shadow-sm border border-ink-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-midnight-50 text-midnight-800">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500">Next Loan EMI</p>
                    <p className="tnum font-display text-base font-semibold text-midnight-950">
                      {formatINR(upcomingLoan.emi || upcomingLoan.monthlyEmi)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-600">
                      Due on {formatDate(upcomingLoan.nextEmiDate)} · {upcomingLoan.productName}
                    </p>
                    <Link to="/portal/loans" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-midnight-800 hover:text-midnight-600">
                      View loan schedule <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {maturingDeposits.length > 0 && (
              <Card className="p-4 shadow-sm border border-ink-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-400/20 text-gold-700">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500">Deposit Maturing Soon</p>
                    <p className="tnum font-display text-base font-semibold text-midnight-950">
                      {formatINR(maturingDeposits[0].maturityAmount || maturingDeposits[0].depositAmount)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-600">
                      Matures on {formatDate(maturingDeposits[0].maturityDate)} · {maturingDeposits[0].productName}
                    </p>
                    <Link to="/portal/investments" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-midnight-800 hover:text-midnight-600">
                      View deposit holdings <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {activeSips.length > 0 && (
              <Card className="p-4 shadow-sm border border-ink-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500">Upcoming SIP Instalment</p>
                    <p className="tnum font-display text-base font-semibold text-midnight-950">
                      {formatINR(activeSips[0].monthlyAmount)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-600">
                      Debit day: {activeSips[0].debitDate || 5}th of each month · {activeSips[0].productName}
                    </p>
                    <Link to="/portal/investments" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-midnight-800 hover:text-midnight-600">
                      Manage SIPs <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Top Frequent Actions */}
      <Reveal treatment="B" staggerIndex={1}>
        <section aria-label="Frequent Actions">
          <SubHead title="Frequent Actions" />
          <Card className="overflow-hidden border border-ink-100 shadow-sm">
            <div className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-3 lg:grid-cols-5">
              {TOP_FREQUENT_ACTIONS.map((q) => (
                <Link
                  key={q.to + q.label}
                  to={q.to}
                  className="bg-white p-4 transition-all hover:bg-midnight-50/60 group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-50 text-midnight-800 group-hover:bg-midnight-900 group-hover:text-gold-300 transition-colors">
                    <q.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="mt-3 block text-sm font-semibold text-ink-900">{q.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{q.sub}</span>
                </Link>
              ))}
            </div>

            {/* Fix 10: Quick Pay / Pay again row */}
            {beneficiaries.length > 0 && (
              <div className="border-t border-ink-100 bg-porcelain-50/70 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[13px] font-semibold text-ink-700">Pay again:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {beneficiaries.slice(0, 4).map((b) => (
                      <Link
                        key={b.id}
                        to={`/portal/transfers?beneficiary=${b.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-800 hover:border-midnight-500 hover:text-midnight-950 transition-colors shadow-xs"
                      >
                        <span>{b.name}</span>
                        <span className="text-ink-400">· {b.bankName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>
      </Reveal>

      {/* Accounts & Quick Portfolio Distribution */}
      <section>
        <SubHead title="Your Accounts" action={<TextLink to="/portal/accounts">View all accounts</TextLink>} />
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts registered yet"
            body="Once your verification is complete and accounts are allocated, they will appear here with live ledger balances."
            action={<Link to="/portal/kyc"><Button size="sm">Submit KYC</Button></Link>}
          />
        ) : (
          <Card className="divide-y divide-ink-100 overflow-hidden shadow-sm">
            {accounts.map((a) => (
              <Link
                key={a.id}
                to={`/portal/accounts/${a.id}`}
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-midnight-50/60 sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-midnight-50 text-midnight-800">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{typeLabel(a.type)}</span>
                  <span className="tnum block text-[13px] text-ink-500">
                    {maskAccount(a.accountNumber)} {a.openedAt ? `· Opened ${formatDate(a.openedAt)}` : ''}
                  </span>
                </span>
                {a.status && a.status !== 'ACTIVE' && <StatusChip status={a.status} className="hidden sm:inline-flex" />}
                <div className="text-right">
                  <span className="tnum block text-sm font-bold text-ink-900">{money(a.balance)}</span>
                  <span className="text-[13px] text-ink-500">Available</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 shrink-0 text-ink-300" aria-hidden />
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* Defined Window: Cash Flow Overview */}
      <section aria-label="Monthly Cashflow Snapshot">
        <SubHead title={`Cash flow — ${currentMonthLabel}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50 text-success-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Total Credits</p>
                <p className="tnum font-display text-base font-semibold text-success-700">
                  {showBalance ? formatINR(monthCredits) : '••••••'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Total Debits</p>
                <p className="tnum font-display text-base font-semibold text-ink-900">
                  {showBalance ? formatINR(monthDebits) : '••••••'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-50 text-midnight-800">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Cards</p>
                {creditCards.length > 0 ? (
                  <p className="tnum font-display text-base font-semibold text-ink-900">
                    {showBalance ? formatINR(totalCreditOutstanding) : '••••••'}
                  </p>
                ) : (
                  <p className="font-display text-base font-semibold text-ink-900">
                    <Link to="/portal/cards" className="text-xs text-midnight-700 underline hover:text-midnight-900">
                      {cards.length} active debit {cards.length === 1 ? 'card' : 'cards'} →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/20 text-gold-700">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Deposits</p>
                {totalHoldingsPrincipal > 0 ? (
                  <p className="tnum font-display text-base font-semibold text-ink-900">
                    {showBalance ? formatINR(totalHoldingsPrincipal) : '••••••'}
                  </p>
                ) : (
                  <p className="font-display text-base font-semibold text-ink-900">
                    <Link to="/portal/investments" className="text-xs text-midnight-700 underline hover:text-midnight-900">
                      No deposits yet →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Dual Column: Filterable Transactions & Active Applications */}
      <div className="grid gap-8 lg:grid-cols-5">
        
        {/* Recent Transactions with Search & Debit/Credit Filters */}
        <section className="min-w-0 lg:col-span-3">
          <SubHead title="Recent Transactions" action={<TextLink to="/portal/accounts">Detailed Statements</TextLink>} />
          
          <Card className="overflow-hidden shadow-sm">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-ink-100 bg-porcelain-50 p-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search description, ref, or amount..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-midnight-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                {['ALL', 'CREDIT', 'DEBIT'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTxnFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      txnFilter === f
                        ? 'bg-midnight-900 text-porcelain-50'
                        : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-ink-500">
                No transactions match your search filter.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {filteredTxns.map((t) => {
                  const isCredit = t.type === 'CREDIT';
                  return (
                    <div key={t.id || `${t.accountId}-${t.reference}-${t.date}`} className="flex items-center gap-3 px-4 py-3.5 sm:px-5 hover:bg-midnight-50/40 transition-colors">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-success-50 text-success-600' : 'bg-ink-100 text-ink-600'}`}>
                        {isCredit
                          ? <ArrowDownLeft className="h-4 w-4" aria-hidden />
                          : <ArrowUpRight className="h-4 w-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">{t.description}</span>
                        <span className="block text-[13px] text-ink-500">
                          {formatDate(t.date)} · <span className="font-mono">{t.reference || 'TXN-SIM'}</span> · {typeLabel(t.account?.type)}
                        </span>
                      </span>
                      <div className="text-right">
                        <span className={`tnum block text-sm font-semibold ${isCredit ? 'text-success-600' : 'text-ink-900'}`}>
                          {showBalance ? formatSignedINR(isCredit ? t.amount : -Number(t.amount)) : '••••••'}
                        </span>
                        <span className={`text-[13px] font-medium ${isCredit ? 'text-success-600' : 'text-ink-500'}`}>
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Active Applications */}
        <section className="min-w-0 lg:col-span-2">
          <SubHead title="Active Applications" action={<TextLink to="/portal/applications">Track All</TextLink>} />
          {applications.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No applications in progress"
              body="Loan and card applications you submit will show real-time status right here."
              action={<Link to="/portal/loans"><Button size="sm">Explore Loans</Button></Link>}
            />
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 3).map((app, i) => (
                <Card key={app.id || app.accountApplicationId || app.applicationId || app.cardApplicationId || i} className="p-4 shadow-sm border border-ink-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {productDisplayName(app) || app.productName || 'FinEdge Facility'}
                      </p>
                      <p className="tnum mt-0.5 text-[13px] text-ink-500">
                        {formatINR(app.amount)} · Submitted {formatDate(app.submittedAt || app.appliedAt || app.createdAt)}
                      </p>
                    </div>
                    <StatusChip status={app.status} />
                  </div>

                  {Array.isArray(app.steps) && app.steps.length > 0 && (
                    <div className="mt-3">
                      <Stepper steps={app.steps.map((s) => ({ ...s, date: s.date ? formatDate(s.date) : undefined }))} />
                    </div>
                  )}

                  <Link
                    to="/portal/applications"
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-midnight-800 hover:text-midnight-600"
                  >
                    View application details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
