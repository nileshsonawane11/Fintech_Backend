import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link, NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadN, setUnreadN] = useState(0);

  // 15-Minute Session Inactivity Lock
  const [idleSeconds, setIdleSeconds] = useState(900); // 15 mins
  const [sessionLocked, setSessionLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    const handleActivity = () => {
      if (!sessionLocked) {
        setIdleSeconds(900);
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
    // Demo password or user password
    if (unlockPassword === 'Password@123' || unlockPassword === user?.password) {
      setSessionLocked(false);
      setIdleSeconds(900);
      setUnlockPassword('');
      setUnlockError('');
    } else {
      setUnlockError('Invalid password. Use your account password to resume.');
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

  const linkCls = ({ isActive }) =>
    `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive || (n_tab => tabParam === n_tab)
        ? 'bg-midnight-800 text-porcelain-50'
        : 'text-midnight-200 hover:bg-midnight-800/60 hover:text-porcelain-50'
    }`;

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

        <div className="mt-5 rounded-lg bg-midnight-950/60 p-3 text-xs leading-relaxed text-midnight-200 border border-midnight-800">
          <p className="text-[11px] uppercase tracking-wider text-gold-400 font-semibold">Active Customer</p>
          <p className="mt-0.5 font-semibold text-porcelain-50 truncate">{user?.fullName || user?.name || 'Vikramaditya Sharma'}</p>
          <p className="font-mono text-[11px] text-porcelain-300 truncate">ID: {user?.customerId || 'CUS-100234'}</p>
        </div>

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
                  <span className="rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-bold text-white">{unreadN}</span>
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
      <header className="sticky top-0 z-40 flex items-center justify-between bg-midnight-900 px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-midnight-950 text-gold-300">
            <Landmark className="h-4 w-4" />
          </span>
          <span className="font-display font-semibold text-porcelain-50">FinEdge</span>
        </Link>
        <button
          onClick={async () => {
            if (logout) await logout();
            navigate('/');
          }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-midnight-200 hover:text-porcelain-50"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      {/* Main Content View */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-7">
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
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-100 bg-white lg:hidden shadow-modal" aria-label="Primary mobile nav">
        <div className="grid grid-cols-5">
          {bottomItems.map((n) => {
            const isItemActive = (n.end && activeSection === 'overview') || (!n.end && activeSection === n.tab);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  isItemActive ? 'text-midnight-900 font-bold' : 'text-ink-500'
                }`}
              >
                {isItemActive && <span className="absolute inset-x-6 top-0 h-[3px] rounded-full bg-gold-400" aria-hidden />}
                <n.icon className="h-5 w-5" aria-hidden />
                {n.label.replace('Pay & Transfer', 'Transfer').replace('Overview', 'Home')}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${moreOpen ? 'text-midnight-900 font-bold' : 'text-ink-500'}`}
            aria-expanded={moreOpen}
          >
            <Landmark className="h-5 w-5" aria-hidden /> More
          </button>
        </div>
        {moreOpen && (
          <div className="grid grid-cols-2 gap-1 border-t border-ink-100 bg-porcelain-50 px-3 py-3">
            {moreItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-700 hover:bg-midnight-50"
              >
                <n.icon className="h-4 w-4 text-midnight-700" aria-hidden /> {n.label}
              </NavLink>
            ))}
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
              Your NetBanking session was paused after 15 minutes of inactivity to protect your account. Enter your password to resume where you left off.
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
