import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building, 
  User, 
  Clock, 
  DollarSign,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';

export const ManagerAccountApplications = ({
  accountAppsQueue,
  customersList,
  onApprove,
  onReject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);

  const filteredApps = useMemo(() => {
    return accountAppsQueue.filter(a => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (productFilter !== 'ALL' && a.productCode !== productFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (a.customerName || '').toLowerCase().includes(q) ||
          (a.accountApplicationId || '').toLowerCase().includes(q) ||
          (a.customerId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accountAppsQueue, statusFilter, productFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Account Opening Underwriting Queue</h2>
          <p className="text-xs text-slate-500">Maker-Checker Authorization for Deposit & Commercial Account Creation</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by applicant or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-midnight-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Products</option>
            <option value="SAVINGS_REGULAR">Prime Savings</option>
            <option value="SAVINGS_SENIOR">Senior Citizen Savings</option>
            <option value="CURRENT_BUSINESS">Business Current</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="px-5 py-3.5">Application ID</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Product Type</th>
                <th className="px-5 py-3.5 text-right">Initial Funding</th>
                <th className="px-5 py-3.5">KYC Clearance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Underwrite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => {
                const customer = customersList.find(c => c.customerId === app.customerId);
                const isKycApproved = customer?.kycStatus === 'APPROVED';

                return (
                  <tr key={app.accountApplicationId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {app.accountApplicationId}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{app.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">CIF: {app.customerId}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">
                        {app.productCode === 'SAVINGS_REGULAR' ? 'FinEdge Prime Savings' : app.productCode === 'CURRENT_BUSINESS' ? 'FinEdge Business Current' : app.productCode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(app.initialFundingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                        isKycApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isKycApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isKycApproved ? 'KYC Verified' : 'KYC Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        app.status === 'APPROVED' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : app.status === 'REJECTED' 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {app.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-1.5 bg-midnight-900 hover:bg-midnight-800 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                        >
                          Review & Underwrite
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No account applications match the active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Underwriting Inspection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
                  {selectedApp.accountApplicationId}
                </span>
                <h3 className="text-base font-bold text-slate-900">Underwrite Account Application</h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{selectedApp.customerName} ({selectedApp.customerId})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-900">{selectedApp.productCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Initial Funding Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{Number(selectedApp.initialFundingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {selectedApp.nominee && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800">Designated Nominee:</div>
                  <div className="text-slate-600">
                    {selectedApp.nominee.fullName} ({selectedApp.nominee.relationship}) • Contact: {selectedApp.nominee.mobileNumber}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              {selectedApp.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const appToReject = selectedApp;
                      setSelectedApp(null);
                      onReject(appToReject);
                    }}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const appToApprove = selectedApp;
                      setSelectedApp(null);
                      onApprove(appToApprove);
                    }}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Materialize Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
