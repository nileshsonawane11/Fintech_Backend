import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Update ManagerPortalPage.jsx
const managerFile = path.resolve(__dirname, '..', 'src', 'pages', 'manager', 'ManagerPortalPage.jsx');
let mgrCode = fs.readFileSync(managerFile, 'utf8');

// Replace mobile header and pill nav in ManagerPortalPage.jsx
const oldMgrHeader = `{/* Mobile Top Header */}
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
        {visibleNav.filter((n) => n.to).map((n) => {
          const isCurrent = pathname === n.to || pathname === n.altTo;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={\`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium \${
                isCurrent ? 'bg-midnight-900 text-porcelain-50 font-semibold' : 'bg-white text-ink-700 border border-ink-200'
              }\`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>`;

const newMgrHeader = `{/* Mobile Top Header */}
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

      {/* Mobile Nav Strip with Accessible 44px Horizontal Pills */}
      <nav className="flex gap-1.5 overflow-x-auto border-b border-ink-200 bg-porcelain-100/90 px-3 py-2 lg:hidden [scrollbar-width:none] touch-pan-x" aria-label="Staff mobile nav">
        {visibleNav.filter((n) => n.to).map((n) => {
          const isCurrent = pathname === n.to || pathname === n.altTo;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={\`whitespace-nowrap min-h-[44px] inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors \${
                isCurrent ? 'bg-midnight-900 text-porcelain-50 shadow-xs' : 'bg-white text-ink-700 border border-ink-200 hover:border-midnight-400'
              }\`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>`;

if (mgrCode.includes('{/* Mobile Top Header */}')) {
  mgrCode = mgrCode.replace(oldMgrHeader, newMgrHeader);
  fs.writeFileSync(managerFile, mgrCode, 'utf8');
  console.log('ManagerPortalPage.jsx header updated.');
} else {
  console.log('Warning: Manager header pattern not matched.');
}

// 2. Update PortalDashboardPage.jsx
const portalFile = path.resolve(__dirname, '..', 'src', 'pages', 'portal', 'PortalDashboardPage.jsx');
let portalCode = fs.readFileSync(portalFile, 'utf8');

// Ensure user menu state is tracked
if (!portalCode.includes('avatarMenuOpen')) {
  portalCode = portalCode.replace(
    'const [moreOpen, setMoreOpen] = useState(false);',
    'const [moreOpen, setMoreOpen] = useState(false);\n  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);'
  );
}

// Replace Portal mobile top header and bottom tab bar
const oldPortalHeader = `{/* Mobile Top Header */}
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
      </header>`;

const newPortalHeader = `{/* Mobile Top Header with unread notification badge & avatar menu (Fix 2.1) */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-midnight-900 px-4 py-2.5 lg:hidden border-b border-midnight-950 shadow-xs">
        <Link to="/" className="flex items-center gap-2" aria-label="FinEdge Bank Home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-midnight-950 text-gold-300 shadow-xs">
            <Landmark className="h-4 w-4" />
          </span>
          <span className="font-display font-semibold text-porcelain-50 text-base">FinEdge</span>
        </Link>

        <div className="flex items-center gap-2 relative">
          {/* Unread notification bell on mobile top bar */}
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

          {/* User Avatar Menu Trigger */}
          <button
            type="button"
            onClick={() => setAvatarMenuOpen((v) => !v)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full bg-midnight-800 border border-midnight-700 text-porcelain-100 text-xs font-bold px-2 py-1"
            aria-expanded={avatarMenuOpen}
            aria-label="User profile and settings"
          >
            <span>{user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CU'}</span>
          </button>

          {/* Avatar Menu Dropdown Sheet/Menu */}
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
      </header>`;

portalCode = portalCode.replace(oldPortalHeader, newPortalHeader);

// Update mobile bottom tab bar
const oldBottomNav = `{/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-100 bg-white lg:hidden shadow-modal" aria-label="Primary mobile nav">
        <div className="grid grid-cols-5">
          {bottomItems.map((n) => {
            const isItemActive = (n.end && activeSection === 'overview') || (!n.end && activeSection === n.tab);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={\`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium \${
                  isItemActive ? 'text-midnight-900 font-bold' : 'text-ink-500'
                }\`}
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
            className={\`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium \${moreOpen ? 'text-midnight-900 font-bold' : 'text-ink-500'}\`}
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
      </nav>`;

const newBottomNav = `{/* Mobile Bottom Tab Bar with Safe-Area & 44px targets (Fix 2.1 & 4.5) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white lg:hidden shadow-modal pb-[env(safe-area-inset-bottom)]" aria-label="Primary mobile nav">
        <div className="grid grid-cols-5">
          {bottomItems.map((n) => {
            const isItemActive = (n.end && activeSection === 'overview') || (!n.end && activeSection === n.tab);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={\`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors \${
                  isItemActive ? 'text-midnight-950 font-bold' : 'text-ink-600 hover:text-midnight-900'
                }\`}
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
            className={\`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors \${
              moreOpen || moreItems.some((m) => activeSection === m.tab) ? 'text-midnight-950 font-bold' : 'text-ink-600 hover:text-midnight-900'
            }\`}
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
                  className={\`flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors \${
                    isSectionActive
                      ? 'bg-midnight-900 text-porcelain-50 shadow-xs'
                      : 'text-ink-700 bg-white border border-ink-100 hover:bg-midnight-50'
                  }\`}
                >
                  <n.icon className={\`h-4 w-4 shrink-0 \${isSectionActive ? 'text-gold-400' : 'text-midnight-700'}\`} aria-hidden />
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
      </nav>`;

portalCode = portalCode.replace(oldBottomNav, newBottomNav);

// Ensure main has safe area bottom padding
portalCode = portalCode.replace(
  'className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-7"',
  'className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-7"'
);

fs.writeFileSync(portalFile, portalCode, 'utf8');
console.log('PortalDashboardPage.jsx updated with mobile header, avatar menu & bottom navigation.');
