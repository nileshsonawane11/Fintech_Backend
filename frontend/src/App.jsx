import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }
  return children;
};

export function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/loans" element={<LoansPage />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/calculators" element={<CalculatorsPage />} />
                <Route path="/portal/login" element={<PortalLoginPage />} />
                <Route 
                  path="/portal" 
                  element={
                    <ProtectedRoute>
                      <PortalDashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
