import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { LoansPage } from './pages/LoansPage';
import { CardsPage } from './pages/CardsPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { PortalLoginPage } from './pages/portal/PortalLoginPage';
import { PortalDashboardPage } from './pages/portal/PortalDashboardPage';
import { ManagerLoginPage } from './pages/manager/ManagerLoginPage';
import { ManagerPortalPage } from './pages/manager/ManagerPortalPage';

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
  const { isManagerAuthenticated } = useAuth();
  if (!isManagerAuthenticated) {
    return <Navigate to="/manager/login" replace />;
  }
  return children;
};

// Dynamic Shell to hide customer Header/Footer when inside Manager Operations Terminal
function AppContent() {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith('/manager');

  return (
    <div className="flex flex-col min-h-screen">
      {!isManagerRoute && <Header />}
      <main className="flex-1">
        <Routes>
          {/* Public Customer Marketing & Product Showcase */}
          <Route path="/" element={<HomePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />

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

          {/* Separate Bank Manager & Staff Operations Portal */}
          <Route path="/manager/login" element={<ManagerLoginPage />} />
          <Route
            path="/manager"
            element={<Navigate to="/manager/dashboard" replace />}
          />
          <Route
            path="/manager/dashboard"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/customers"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/kyc"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/account-applications"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/card-applications"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/users"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/roles"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/permissions"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />
          <Route
            path="/manager/audit-logs"
            element={
              <ManagerProtectedRoute>
                <ManagerPortalPage />
              </ManagerProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isManagerRoute && <Footer />}
    </div>
  );
}

export function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
