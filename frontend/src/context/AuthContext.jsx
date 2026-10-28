import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('finedge_demo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem('finedge_applications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'APP-98241',
        productType: 'Savings Account',
        productName: 'FIRST High Yield Savings Account',
        applicantName: 'Vikramaditya Sharma',
        status: 'Under Verification',
        date: '2026-10-12',
        steps: [
          { name: 'Application Submitted', completed: true, date: '2026-10-12' },
          { name: 'Document Verification', completed: true, date: '2026-10-13' },
          { name: 'Video KYC Scheduled', completed: false, date: 'Pending' },
          { name: 'Account Activation', completed: false, date: 'Pending' }
        ]
      },
      {
        id: 'APP-84192',
        productType: 'Loan',
        productName: 'Instant Personal Loan',
        applicantName: 'Vikramaditya Sharma',
        amount: '₹ 5,00,000',
        status: 'Approved',
        date: '2026-10-08',
        steps: [
          { name: 'Application Submitted', completed: true, date: '2026-10-08' },
          { name: 'Credit Assessment', completed: true, date: '2026-10-09' },
          { name: 'Agreement Signed', completed: true, date: '2026-10-10' },
          { name: 'Disbursal Ready', completed: true, date: '2026-10-11' }
        ]
      }
    ];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('finedge_demo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('finedge_demo_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('finedge_applications', JSON.stringify(applications));
  }, [applications]);

  const login = (mobileOrEmail) => {
    const mockUser = {
      name: 'Vikramaditya Sharma',
      email: mobileOrEmail.includes('@') ? mobileOrEmail : 'vikram.sharma@example.com',
      mobile: mobileOrEmail.includes('@') ? '+91 98765 43210' : mobileOrEmail,
      customerId: 'CUST-8491029',
      primaryAccount: '10049281920',
      balance: 148290.50,
      activeCards: 2,
      lastLogin: new Date().toLocaleString('en-IN')
    };
    setUser(mockUser);
    return mockUser;
  };

  const logout = () => {
    setUser(null);
  };

  const submitApplication = (applicationData) => {
    const newApp = {
      id: `APP-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      steps: [
        { name: 'Application Submitted', completed: true, date: new Date().toISOString().split('T')[0] },
        { name: 'Initial Verification', completed: false, date: 'In Progress' },
        { name: 'Video KYC / Inspection', completed: false, date: 'Pending' },
        { name: 'Final Approval', completed: false, date: 'Pending' }
      ],
      ...applicationData
    };
    setApplications(prev => [newApp, ...prev]);
    return newApp;
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      applications,
      submitApplication
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
