import { useServerMode } from '../../lib/serverMode.js';
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
  ShieldAlert,
  TrendingUp,
  Users,
  Landmark,
  KeyRound
} from 'lucide-react';
import { Button } from '../../components/ui.jsx';
import { SectionErrorBoundary } from '../../components/common/RouteErrorBoundary.jsx';
import { hasSectionAccess } from '../../services/managerBridge.js';

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
import ManagerUserManagementSection from './sections/ManagerUserManagementSection';
import ManagerRolesPermissionsSection from './sections/ManagerRolesPermissionsSection';
import ManagerProductCatalogueSection from './sections/ManagerProductCatalogueSection';
import ManagerSiteContentSection from './sections/ManagerSiteContentSection';
import ManagerPlatformSettingsSection from './sections/ManagerPlatformSettingsSection';
import { Package, Globe, Sliders } from 'lucide-react';

const NAV_ITEMS = [
  { group: 'Work queues' },
  { section: 'dashboard', to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'kyc', to: '/manager/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { section: 'accounts', to: '/manager/account-applications', altTo: '/manager/accounts', label: 'Account Applications', icon: FileText },
  { section: 'loans', to: '/manager/loans', label: 'Loan Applications', icon: Receipt },
  { section: 'investments', to: '/manager/investments', altTo: '/manager/investment-applications', label: 'Investment Applications', icon: TrendingUp },
  { section: 'cards', to: '/manager/card-applications', altTo: '/manager/cards', label: 'Card Applications', icon: CreditCard },
  { section: 'tickets', to: '/manager/tickets', altTo: '/manager/support', label: 'Support Tickets', icon: LifeBuoy },
  { group: 'Records' },
  { section: 'customers', to: '/manager/customers', label: 'Customers', icon: Users },
  { section: 'audit', to: '/manager/audit-logs', altTo: '/manager/audit', label: 'Audit Log', icon: FileSearch },
  { section: 'reports', to: '/manager/reports', label: 'Reports', icon: BarChart3 },
  { group: 'Admin' },
  { section: 'staff', to: '/manager/users', altTo: '/manager/staff', label: 'Staff & Roles', icon: ShieldCheck, hideForAdmin: true },
  { group: 'Administration', adminOnly: true },
  { section: 'user-management', to: '/manager/user-management', label: 'User Management', icon: Users, adminOnly: true },
  { section: 'roles-permissions', to: '/manager/roles-permissions', label: 'Roles & Permissions', icon: KeyRound, adminOnly: true },
  { section: 'product-catalogue', to: '/manager/product-catalogue', label: 'Product Catalogue', icon: Package, adminOnly: true },
  { section: 'site-content', to: '/manager/site-content', label: 'Site Content', icon: Globe, adminOnly: true },
  { section: 'platform-settings', to: '/manager/platform-settings', label: 'Platform Settings', icon: Sliders, adminOnly: true },
];



export const ManagerPortalPage = () => {
  const { managerUser, managerLogout } = useAuth();
  const navigate = useNavigate();
  const { isDemo } = useServerMode();
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
  } else if (pathname === '/manager/user-management') {
    activeSection = 'user-management';
  } else if (pathname === '/manager/roles-permissions') {
    activeSection = 'roles-permissions';
  } else if (pathname === '/manager/product-catalogue') {
    activeSection = 'product-catalogue';
  } else if (pathname === '/manager/site-content') {
    activeSection = 'site-content';
  } else if (pathname === '/manager/platform-settings') {
    activeSection = 'platform-settings';
  }

  const handleLogout = async () => {
    if (managerLogout) await managerLogout();
    navigate('/manager/login');
  };

  const isAllowed = hasSectionAccess(activeSection, managerUser);

  // Filter NAV items based on current staff role permissions
  const isAdmin = managerUser?.role === 'ADMIN';
  const visibleNav = [];
  let currentGroup = null;
  let currentGroupItems = [];

  NAV_ITEMS.forEach((item) => {
    if (item.group) {
      if (item.adminOnly && !isAdmin) return;
      if (currentGroup && currentGroupItems.length > 0) {
        visibleNav.push(currentGroup, ...currentGroupItems);
      }
      currentGroup = item;
      currentGroupItems = [];
    } else {
      if (item.hideForAdmin && isAdmin) return;
      if (item.adminOnly && !isAdmin) return;
      if (hasSectionAccess(item.section, managerUser)) {
        currentGroupItems.push(item);
      }
    }
  });
  if (currentGroup && currentGroupItems.length > 0) {
    visibleNav.push(currentGroup, ...currentGroupItems);
  }

  return (
    <div className="min-h-screen bg-porcelain-100 flex flex-col">
      {isDemo && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-center text-xs font-medium text-amber-900 tracking-wide z-20 shrink-0">
          Demo mode · demonstration data — nothing here is a real bank record.
        </div>
      )}
      <div className="flex-1 lg:flex">
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
          <p className="text-xs uppercase tracking-wider text-gold-400 font-semibold">Staff Clearance</p>
          <p className="mt-0.5 font-semibold text-porcelain-50 truncate">{managerUser?.fullName || managerUser?.name || 'Chief Branch Manager'}</p>
          <p className="text-xs text-porcelain-300 truncate">{managerUser?.roleTitle || managerUser?.role || 'BANK_MANAGER'}</p>
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-1" aria-label="Staff console">
          {visibleNav.map((n, i) =>
            n.group ? (
              <p key={i} className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-midnight-300">
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
      <header className="sticky top-0 z-40 flex items-center justify-between bg-midnight-900 px-4 py-2.5 lg:hidden border-b border-midnight-950 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="FinEdge Bank Home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-midnight-950 text-gold-300 shadow-xs">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="font-display font-semibold text-porcelain-50 text-sm">Staff Ops</span>
          </Link>
          <span className="inline-block truncate rounded-full bg-midnight-950/80 px-2.5 py-0.5 text-xs font-semibold text-gold-400 border border-midnight-800">
            {managerUser?.roleTitle || managerUser?.role || 'BANK_MANAGER'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-porcelain-200 hover:bg-midnight-800 hover:text-white transition-colors"
          aria-label="Logout Staff Session"
        >
          <LogOut className="h-4 w-4" /> <span>Logout</span>
        </button>
      </header>

      {/* Mobile Nav Strip */}
      <nav className="flex gap-1.5 overflow-x-auto border-b border-ink-200 bg-porcelain-100/90 px-3 py-2 lg:hidden [scrollbar-width:none] touch-pan-x" aria-label="Staff mobile nav">
        {visibleNav.filter((n) => n.to).map((n) => {
          const isCurrent = pathname === n.to || pathname === n.altTo;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`whitespace-nowrap min-h-[44px] inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                isCurrent ? 'bg-midnight-900 text-porcelain-50 shadow-xs' : 'bg-white text-ink-700 border border-ink-200 hover:border-midnight-400'
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Main Operations Container */}
      <main className="w-full flex-1 px-4 py-5 sm:px-6 lg:py-7 overflow-x-auto">
        {!isAllowed ? (
          <div className="mx-auto max-w-lg rounded-xl border border-danger-200 bg-white p-8 text-center shadow-card mt-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-semibold text-midnight-950">Access Denied</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Your staff clearance level ({managerUser?.roleTitle || managerUser?.role || 'Staff'}) lacks permissions for this section. Direct operational actions are prohibited.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => navigate('/manager/dashboard')}>Return to Dashboard</Button>
            </div>
          </div>
        ) : (
          <SectionErrorBoundary title={'Unable to load ' + activeSection}>
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
            {activeSection === 'user-management' && <ManagerUserManagementSection />}
            {activeSection === 'roles-permissions' && <ManagerRolesPermissionsSection />}
            {activeSection === 'product-catalogue' && <ManagerProductCatalogueSection />}
            {activeSection === 'site-content' && <ManagerSiteContentSection />}
            {activeSection === 'platform-settings' && <ManagerPlatformSettingsSection />}
          </SectionErrorBoundary>
        )}
      </main>
      </div>
    </div>
  );
};

export default ManagerPortalPage;
