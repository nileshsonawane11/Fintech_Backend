import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link, NavLink, useParams } from 'react-router-dom';
import { useAuth, useDbTick } from '../../context/AuthContext';
import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  FileText,
  Home,
  Landmark,
  LifeBuoy,
  LogOut,
  PiggyBank,
  Receipt,
  User,
  Users,
  Wallet,
  Lock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Logo } from '../../components/layout/Header';
import { Button, Input, Modal } from '../../components/ui.jsx';
import { unreadCount } from '../../services/portalBridge.js';
import { getDb, getSetting } from '../../services/api.js';

// Import split section components
import DashboardSection from './sections/DashboardSection';
import AccountsSection from './sections/AccountsSection';
import AccountDetailSection from './sections/AccountDetailSection';
import TransfersSection from './sections/TransfersSection';
import BeneficiariesSection from './sections/BeneficiariesSection';
import LoansSection from './sections/LoansSection';
import CardsSection from './sections/CardsSection';
import InvestmentsSection from './sections/InvestmentsSection';
import KycSection from './sections/KycSection';
import ApplicationsSection from './sections/ApplicationsSection';
import NotificationsSection from './sections/NotificationsSection';
import ProfileSection from './sections/ProfileSection';
import SupportSection from './sections/SupportSection';

const NAV = [
  { to: '/portal', tab: 'overview', label: 'Overview', icon: Home, end: true },
  { to: '/portal/accounts', tab: 'accounts', label: 'Accounts', icon: Wallet },
  { to: '/portal/transfers', tab: 'transfers', label: 'Pay & Transfer', icon: ArrowLeftRight },
  { to: '/portal/beneficiaries', tab: 'beneficiaries', label: 'Beneficiaries', icon: Users },
  { to: '/portal/loans', tab: 'loans', label: 'Loans', icon: Receipt },
  { to: '/portal/cards', tab: 'cards', label: 'Cards', icon: CreditCard },
  { to: '/portal/investments', tab: 'investments', label: 'Investments', icon: PiggyBank },
  { to: '/portal/kyc', tab: 'kyc', label: 'KYC', icon: FileText },
  { to: '/portal/applications', tab: 'applications', label: 'Applications', icon: Landmark },
  { to: '/portal/notifications', tab: 'notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  { to: '/portal/support', tab: 'support', label: 'Support', icon: LifeBuoy },
  { to: '/portal/profile', tab: 'profile', label: 'Profile', icon: User },
];

const BOTTOM = ['/portal', '/portal/accounts', '/portal/transfers', '/portal/cards'];
const bottomItems = NAV.filter((n) => BOTTOM.includes(n.to));
const moreItems = NAV.filter((n) => !BOTTOM.includes(n.to));

export const PortalDashboardPage = () => {
  const { user, logout } = useAuth();
  useDbTick();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [unreadN, setUnreadN] = useState(0);

  // Sync sidebar unread badge with unreadCount
  useEffect(() => {
    if (!user?.customerId) return;
    unreadCount(user.customerId).then((c) => setUnreadN(c || 0)).catch(() => {});
  }, [user?.customerId, location.pathname]);

  // 15-Minute Session Inactivity Lock
  const lockMinutes = Number(getSetting('inactivityLockMinutes')) || 15;
  const lockSeconds = lockMinutes * 60;
  const [idleSeconds, setIdleSeconds] = useState(lockSeconds);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    const handleActivity = () => {
      if (!sessionLocked) {
        setIdleSeconds(lockSeconds);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const timer = setInterval(() => {
      setIdleSeconds((prev) => {
        if (prev <= 1) {
          setSessionLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(timer);
    };
  }, [sessionLocked]);

  const handleUnlockSession = (e) => {
    e.preventDefault();
    if (!unlockPassword) {
      setUnlockError('Password required');
      return;
    }

    try {
      const db = getDb();
      const cust = (db.customers || []).find((c) => c.customerId === user?.customerId);
      const expectedPw = cust?.password || user?.password;

      if (expectedPw && unlockPassword === expectedPw) {
        setSessionLocked(false);
        setIdleSeconds(lockSeconds);
        setUnlockPassword('');
        setUnlockError('');
      } else {
        setUnlockError('Invalid password. Use your account password to resume.');
      }
    } catch {
      setUnlockError('Could not verify credentials. Please try again.');
    }
  };

  // Determine active section from URL path or ?tab= query
  const pathname = location.pathname.replace(/\/$/, '');
  const tabParam = searchParams.get('tab');

  let activeSection = 'overview';
  let accountDetailId = null;

  if (pathname.startsWith('/portal/accounts/')) {
    activeSection = 'account-detail';
    accountDetailId = pathname.replace('/portal/accounts/', '');
  } else if (pathname === '/portal/accounts' || tabParam === 'accounts') {
    activeSection = 'accounts';
  } else if (pathname === '/portal/transfers' || tabParam === 'transfers') {
    activeSection = 'transfers';
  } else if (pathname === '/portal/beneficiaries' || tabParam === 'beneficiaries') {
    activeSection = 'beneficiaries';
  } else if (pathname === '/portal/loans' || tabParam === 'loans') {
    activeSection = 'loans';
  } else if (pathname === '/portal/cards' || tabParam === 'cards') {
    activeSection = 'cards';
  } else if (pathname === '/portal/investments' || tabParam === 'investments') {
    activeSection = 'investments';
  } else if (pathname === '/portal/kyc' || tabParam === 'kyc') {
    activeSection = 'kyc';
  } else if (pathname === '/portal/applications' || tabParam === 'applications' || tabParam === 'requests') {
    activeSection = 'applications';
  } else if (pathname === '/portal/notifications' || tabParam === 'notifications') {
    activeSection = 'notifications';
  } else if (pathname === '/portal/profile' || tabParam === 'profile') {
    activeSection = 'profile';
  } else if (pathname === '/portal/support' || tabParam === 'support') {
    activeSection = 'support';
  } else {
    activeSection = 'overview';
  }

  return (
    <div className="min-h-screen bg-porcelain-100 lg:flex">
      {/* Sidebar ≥ lg */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-midnight-900 px-4 py-5 lg:flex border-r border-midnight-950">
        <Link to="/" className="flex items-center gap-2.5 px-2" aria-label="FinEdge Bank — home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-950 text-gold-300 shadow-sm">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold text-porcelain-50">
            FinEdge Bank
          </span>
        </Link>

        {user && (
          <div className="mt-5 rounded-lg bg-midnight-950/60 p-3 text-xs leading-relaxed text-midnight-200 border border-midnight-800">
            <p className="text-xs uppercase tracking-wider text-gold-400 font-semibold">Active Customer</p>
            <p className="mt-0.5 font-semibold text-porcelain-50 truncate">{user?.fullName || user?.name || ''}</p>
            <p className="font-mono text-xs text-porcelain-300 truncate">ID: {user?.customerId || ''}</p>
          </div>
        )}

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto" aria-label="Customer portal">
          {NAV.map((n) => {
            const isItemActive = (n.end && activeSection === 'overview') || (!n.end && activeSection === n.tab);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isItemActive
                    ? 'bg-midnight-800 text-porcelain-50'
                    : 'text-midnight-200 hover:bg-midnight-800/60 hover:text-porcelain-50'
                }`}
              >
                {isItemActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold-400" aria-hidden />
                )}
                <n.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
                <span className="flex-1">{n.label}</span>
                {n.badge === 'unread' && unreadN > 0 && (
                  <span className="animate-notification-pop rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-bold text-white motion-reduce:animate-none">{unreadN}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-midnight-800">
          <button
            type="button"
            onClick={async () => {
              if (logout) await logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-midnight-200 transition-colors hover:bg-midnight-800 hover:text-porcelain-50"
          >
            <LogOut className="h-4.5 w-4.5" aria-hidden /> Logout Session
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-midnight-900 px-4 py-2.5 lg:hidden border-b border-midnight-950 shadow-xs">
        <Link to="/" className="flex items-center gap-2" aria-label="FinEdge Bank Home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-midnight-950 text-gold-300 shadow-xs">
            <Landmark className="h-4 w-4" />
          </span>
          <span className="font-display font-semibold text-porcelain-50 text-base">FinEdge</span>
        </Link>

        <div className="flex items-center gap-2 relative">
          <Link
            to="/portal/notifications"
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-porcelain-300 hover:text-porcelain-50 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadN > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-midnight-900" />
            )}
          </Link>

          <button
            type="button"
            onClick={() => setAvatarMenuOpen((v) => !v)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full bg-midnight-800 border border-midnight-700 text-porcelain-100 text-xs font-bold px-2 py-1"
            aria-expanded={avatarMenuOpen}
            aria-label="User profile and settings"
          >
            <span>{user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CU'}</span>
          </button>

          {avatarMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-ink-200 bg-white p-3 shadow-modal animate-scale-in text-left">
              <div className="pb-2 border-b border-ink-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Signed In As</p>
                <p className="text-sm font-semibold text-midnight-950 truncate">{user?.fullName || user?.name || 'Customer'}</p>
                <p className="font-mono text-xs text-ink-500 truncate">ID: {user?.customerId}</p>
              </div>
              <div className="py-2 space-y-1">
                <Link
                  to="/portal/profile"
                  onClick={() => setAvatarMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-800 hover:bg-porcelain-100 transition-colors"
                >
                  <User className="h-4 w-4 text-midnight-700" /> Profile & Security
                </Link>
                <Link
                  to="/portal/support"
                  onClick={() => setAvatarMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-800 hover:bg-porcelain-100 transition-colors"
                >
                  <LifeBuoy className="h-4 w-4 text-midnight-700" /> Help & Support
                </Link>
              </div>
              <div className="pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={async () => {
                    setAvatarMenuOpen(false);
                    if (logout) await logout();
                    navigate('/');
                  }}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Logout Session
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content View */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-7">
        <div key={activeSection} className="animate-portal-crossfade motion-reduce:animate-none">
          {activeSection === 'overview' && <DashboardSection />}
          {activeSection === 'accounts' && <AccountsSection />}
          {activeSection === 'account-detail' && <AccountDetailSection accountId={accountDetailId} />}
          {activeSection === 'transfers' && <TransfersSection />}
          {activeSection === 'beneficiaries' && <BeneficiariesSection />}
          {activeSection === 'loans' && <LoansSection />}
          {activeSection === 'cards' && <CardsSection />}
          {activeSection === 'investments' && <InvestmentsSection />}
          {activeSection === 'kyc' && <KycSection />}
          {activeSection === 'applications' && <ApplicationsSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'profile' && <ProfileSection />}
          {activeSection === 'support' && <SupportSection />}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white lg:hidden shadow-modal pb-[env(safe-area-inset-bottom)]" aria-label="Primary mobile nav">
        <div className="grid grid-cols-5">
          {bottomItems.map((n) => {
            const isItemActive = (n.end && activeSection === 'overview') || (!n.end && activeSection === n.tab);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors ${
                  isItemActive ? 'text-midnight-950 font-bold' : 'text-ink-600 hover:text-midnight-900'
                }`}
              >
                {isItemActive && <span className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-gold-500" aria-hidden />}
                <n.icon className="h-5 w-5" aria-hidden />
                <span className="truncate">{n.label.replace('Pay & Transfer', 'Transfer').replace('Overview', 'Home')}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors ${
              moreOpen || moreItems.some((m) => activeSection === m.tab) ? 'text-midnight-950 font-bold' : 'text-ink-600 hover:text-midnight-900'
            }`}
            aria-expanded={moreOpen}
            aria-label="More navigation sections"
          >
            {(moreOpen || moreItems.some((m) => activeSection === m.tab)) && (
              <span className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-gold-500" aria-hidden />
            )}
            <Landmark className="h-5 w-5" aria-hidden />
            <span className="truncate">More</span>
            {unreadN > 0 && !moreOpen && (
              <span className="absolute right-4 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
            )}
          </button>
        </div>
        {moreOpen && (
          <div className="grid grid-cols-2 gap-1.5 border-t border-ink-100 bg-porcelain-50 px-3 py-3 max-h-[50vh] overflow-y-auto">
            {moreItems.map((n) => {
              const isSectionActive = activeSection === n.tab;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isSectionActive
                      ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                      : 'text-ink-700 bg-white border border-ink-100 hover:bg-midnight-50'
                  }`}
                >
                  <n.icon className={`h-4 w-4 shrink-0 ${isSectionActive ? 'text-gold-400' : 'text-midnight-700'}`} aria-hidden />
                  <span className="truncate flex-1">{n.label}</span>
                  {n.badge === 'unread' && unreadN > 0 && (
                    <span className="rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-bold text-white shrink-0">
                      {unreadN}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Session Inactivity Lock Modal */}
      {sessionLocked && (
        <Modal
          open={sessionLocked}
          onClose={() => {}}
          title="Session Paused Due to Inactivity"
        >
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Your NetBanking session was paused after {lockMinutes} minutes of inactivity to protect your account. Enter your password to resume where you left off.
            </p>
            {unlockError && <p className="text-xs text-danger-600 font-medium">{unlockError}</p>}
            <form onSubmit={handleUnlockSession} className="space-y-3">
              <Input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Enter account password"
                autoFocus
              />
              <Button variant="primary" type="submit" className="w-full">
                Resume Secure Session
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PortalDashboardPage;
