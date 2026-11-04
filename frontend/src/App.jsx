import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/UIComponents';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { RouteErrorBoundary, RouteSuspenseFallback } from './components/common/RouteErrorBoundary';

// Public Catalogues & Marketing Routes (bundled in public chunk to guarantee 0 CLS, instant cold deep-links, and $\le 220$KB initial JS)
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { LoansPage } from './pages/LoansPage';
import { CardsPage } from './pages/CardsPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

// Lazy-loaded Legal & Regulatory Pages
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsConditionsPage = lazy(() => import('./pages/legal/TermsConditionsPage').then(m => ({ default: m.TermsConditionsPage })));
const DisclosuresPage = lazy(() => import('./pages/legal/DisclosuresPage').then(m => ({ default: m.DisclosuresPage })));
const GrievanceRedressalPage = lazy(() => import('./pages/legal/GrievanceRedressalPage').then(m => ({ default: m.GrievanceRedressalPage })));
const FairPracticeCodePage = lazy(() => import('./pages/legal/FairPracticeCodePage').then(m => ({ default: m.FairPracticeCodePage })));
const ScheduleOfChargesPage = lazy(() => import('./pages/legal/ScheduleOfChargesPage').then(m => ({ default: m.ScheduleOfChargesPage })));

// Lazy-loaded Customer NetBanking Portal (isolated: never ships to public visitors)
const PortalLoginPage = lazy(() => import('./pages/portal/PortalLoginPage').then(m => ({ default: m.PortalLoginPage })));
const PortalDashboardPage = lazy(() => import('./pages/portal/PortalDashboardPage').then(m => ({ default: m.PortalDashboardPage })));

// Lazy-loaded Manager Operations Terminal (isolated: never ships to public visitors)
const ManagerLoginPage = lazy(() => import('./pages/manager/ManagerLoginPage').then(m => ({ default: m.ManagerLoginPage })));
const ManagerPortalPage = lazy(() => import('./pages/manager/ManagerPortalPage').then(m => ({ default: m.ManagerPortalPage })));

// Customer Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }
  return children;
};

// Manager Protected Route Guard
const ManagerProtectedRoute = ({ children }) => {
  const { isManagerAuthenticated, managerUser } = useAuth();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('finedge_manager_token') : null;
  if (!managerUser && !token) {
    return <Navigate to="/manager/login" replace />;
  }
  return children;
};

function AppContent() {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith('/manager');

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      {!isManagerRoute && <Header />}
      <main key={location.pathname} className="flex-1 animate-fade-in motion-reduce:animate-none">
        <RouteErrorBoundary>
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Routes>
              {/* Public Customer Marketing & Product Showcase */}
              <Route path="/" element={<HomePage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:slug" element={<ProductDetailPage categoryHint="Accounts" />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/loans/:slug" element={<ProductDetailPage categoryHint="Loans" />} />
              <Route path="/cards" element={<CardsPage />} />
              <Route path="/cards/:slug" element={<ProductDetailPage categoryHint="Cards" />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/investments/:slug" element={<ProductDetailPage categoryHint="Investments" />} />
              <Route path="/calculators" element={<CalculatorsPage />} />

              {/* Legal, Trust & Regulatory Routes */}
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-and-conditions" element={<TermsConditionsPage />} />
              <Route path="/disclosures" element={<DisclosuresPage />} />
              <Route path="/grievance-redressal" element={<GrievanceRedressalPage />} />
              <Route path="/fair-practice-code" element={<FairPracticeCodePage />} />
              <Route path="/schedule-of-charges" element={<ScheduleOfChargesPage />} />

              {/* Customer NetBanking Portal */}
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <PortalDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/*"
                element={
                  <ProtectedRoute>
                    <PortalDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Bank Manager & Staff Operations Portal */}
              <Route path="/manager/login" element={<ManagerLoginPage />} />
              <Route
                path="/manager"
                element={<Navigate to="/manager/dashboard" replace />}
              />
              <Route
                path="/manager/*"
                element={
                  <ManagerProtectedRoute>
                    <ManagerPortalPage />
                  </ManagerProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
      {!isManagerRoute && <Footer />}
    </div>
  );
}

export function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
