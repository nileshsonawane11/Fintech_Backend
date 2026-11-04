import React from 'react';
import { useLocation, useNavigate, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  CreditCard,
  FileSearch,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Landmark
} from 'lucide-react';

// Import split manager section components
import ManagerDashboardSection from './sections/ManagerDashboardSection';
import ManagerCustomersSection from './sections/ManagerCustomersSection';
import ManagerKycSection from './sections/ManagerKycSection';
import ManagerAccountsSection from './sections/ManagerAccountsSection';
import ManagerCardsSection from './sections/ManagerCardsSection';
import ManagerLoansSection from './sections/ManagerLoansSection';
import ManagerInvestmentsSection from './sections/ManagerInvestmentsSection';
import ManagerStaffSection from './sections/ManagerStaffSection';
import ManagerAuditSection from './sections/ManagerAuditSection';
import ManagerReportsSection from './sections/ManagerReportsSection';
import ManagerTicketsSection from './sections/ManagerTicketsSection';

const NAV = [
  { group: 'Work queues' },
  { to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/manager/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { to: '/manager/account-applications', altTo: '/manager/accounts', label: 'Account Applications', icon: FileText },
  { to: '/manager/loans', label: 'Loan Applications', icon: Receipt },
  { to: '/manager/investments', altTo: '/manager/investment-applications', label: 'Investment Applications', icon: TrendingUp },
  { to: '/manager/card-applications', altTo: '/manager/cards', label: 'Card Applications', icon: CreditCard },
  { to: '/manager/tickets', altTo: '/manager/support', label: 'Support Tickets', icon: LifeBuoy },
  { group: 'Records' },
  { to: '/manager/customers', label: 'Customers', icon: Users },
  { to: '/manager/audit-logs', altTo: '/manager/audit', label: 'Audit Log', icon: FileSearch },
  { to: '/manager/reports', label: 'Reports', icon: BarChart3 },
  { group: 'Admin' },
  { to: '/manager/users', altTo: '/manager/staff', label: 'Staff & Roles', icon: ShieldCheck },
];

export const ManagerPortalPage = () => {
  const { managerUser, managerLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname.replace(/\/$/, '');

  let activeSection = 'dashboard';

  if (pathname === '/manager/dashboard' || pathname === '/manager') {
    activeSection = 'dashboard';
  } else if (pathname === '/manager/customers') {
    activeSection = 'customers';
  } else if (pathname === '/manager/kyc') {
    activeSection = 'kyc';
  } else if (pathname === '/manager/account-applications' || pathname === '/manager/accounts') {
    activeSection = 'accounts';
  } else if (pathname === '/manager/card-applications' || pathname === '/manager/cards') {
    activeSection = 'cards';
  } else if (pathname === '/manager/loans') {
    activeSection = 'loans';
  } else if (pathname === '/manager/investments' || pathname === '/manager/investment-applications') {
    activeSection = 'investments';
  } else if (pathname === '/manager/users' || pathname === '/manager/roles' || pathname === '/manager/permissions' || pathname === '/manager/staff') {
    activeSection = 'staff';
  } else if (pathname === '/manager/audit-logs' || pathname === '/manager/audit') {
    activeSection = 'audit';
  } else if (pathname === '/manager/reports') {
    activeSection = 'reports';
  } else if (pathname === '/manager/tickets' || pathname === '/manager/support') {
    activeSection = 'tickets';
  }

  const handleLogout = async () => {
    if (managerLogout) await managerLogout();
    navigate('/manager/login');
  };

  return (
    <div className="min-h-screen bg-porcelain-100 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-midnight-900 px-3 py-5 lg:flex border-r border-midnight-950">
        <div className="px-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FinEdge Bank — home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-950 text-gold-300 shadow-sm">
              <Landmark className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold text-porcelain-50">
              FinEdge Bank
            </span>
          </Link>
        </div>

        <div className="mt-5 mx-2 rounded-lg bg-midnight-950/60 p-3 text-xs leading-relaxed text-midnight-200 border border-midnight-800">
          <p className="text-[10px] uppercase tracking-wider text-gold-400 font-semibold">Staff Clearance</p>
          <p className="mt-0.5 font-semibold text-porcelain-50 truncate">{managerUser?.name || 'Chief Branch Manager'}</p>
          <p className="text-[11px] text-porcelain-300 truncate">{managerUser?.roleTitle || managerUser?.role || 'BANK_MANAGER'}</p>
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-1" aria-label="Staff console">
          {NAV.map((n, i) =>
            n.group ? (
              <p key={i} className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-midnight-300">
                {n.group}
              </p>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => {
                  const isCurrent = isActive || pathname === n.altTo;
                  return `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-midnight-800 text-porcelain-50'
                      : 'text-midnight-200 hover:bg-midnight-800/60 hover:text-porcelain-50'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const isCurrent = isActive || pathname === n.altTo;
                  return (
                    <>
                      {isCurrent && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold-400" aria-hidden />
                      )}
                      <n.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
                      <span className="flex-1">{n.label}</span>
                    </>
                  );
                }}
              </NavLink>
            )
          )}
        </nav>

        <div className="pt-3 border-t border-midnight-800 px-1">
          <button
            type="button"
            onClick={handleLogout}
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
          <span className="font-display font-semibold text-porcelain-50">Staff Terminal</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-porcelain-200 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      {/* Mobile Nav Strip */}
      <nav className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-porcelain-50 px-3 py-2 lg:hidden" aria-label="Staff mobile nav">
        {NAV.filter((n) => n.to).map((n) => {
          const isCurrent = pathname === n.to || pathname === n.altTo;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                isCurrent ? 'bg-midnight-900 text-porcelain-50 font-semibold' : 'bg-white text-ink-700 border border-ink-200'
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Main Operations Container */}
      <main className="w-full flex-1 px-4 py-5 sm:px-6 lg:py-7 overflow-x-auto">
        {activeSection === 'dashboard' && <ManagerDashboardSection />}
        {activeSection === 'customers' && <ManagerCustomersSection />}
        {activeSection === 'kyc' && <ManagerKycSection />}
        {activeSection === 'accounts' && <ManagerAccountsSection />}
        {activeSection === 'cards' && <ManagerCardsSection />}
        {activeSection === 'loans' && <ManagerLoansSection />}
        {activeSection === 'investments' && <ManagerInvestmentsSection />}
        {activeSection === 'staff' && <ManagerStaffSection />}
        {activeSection === 'audit' && <ManagerAuditSection />}
        {activeSection === 'reports' && <ManagerReportsSection />}
        {activeSection === 'tickets' && <ManagerTicketsSection />}
      </main>
    </div>
  );
};

export default ManagerPortalPage;
