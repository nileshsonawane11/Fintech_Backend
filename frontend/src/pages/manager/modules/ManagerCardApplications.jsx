import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Building, 
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';

export const ManagerCardApplications = ({
  cardAppsQueue,
  onApprove,
  onReject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCardApp, setSelectedCardApp] = useState(null);

  const filteredCardApps = useMemo(() => {
    return cardAppsQueue.filter(c => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (c.customerName || '').toLowerCase().includes(q) ||
          (c.cardName || '').toLowerCase().includes(q) ||
          (c.cardApplicationId || '').toLowerCase().includes(q) ||
          (c.customerId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cardAppsQueue, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Card Issuance & Underwriting Queue</h2>
          <p className="text-xs text-slate-500">Automated Credit Scoring, Bureau Cross-Checks & Sanctions</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by card or customer..."
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
            <option value="ALL">All Application Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved & Issued</option>
            <option value="REJECTED">Declined</option>
          </select>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="px-5 py-3.5">Application ID</th>
                <th className="px-5 py-3.5">Applicant Name</th>
                <th className="px-5 py-3.5">Card Product</th>
                <th className="px-5 py-3.5">Linked Account</th>
                <th className="px-5 py-3.5">Bureau Score</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCardApps.map((c) => (
                <tr key={c.cardApplicationId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">
                    {c.cardApplicationId}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{c.customerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">CIF: {c.customerId}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">{c.cardName}</span>
                    <div className="text-[11px] text-slate-400 uppercase">{c.cardType}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-600">
                    {c.linkedAccountId}
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      782 (CIBIL Prime)
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.status === 'APPROVED' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : c.status === 'REJECTED' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.status === 'PENDING_APPROVAL' ? (
                      <button
                        onClick={() => setSelectedCardApp(c)}
                        className="px-3 py-1.5 bg-midnight-900 hover:bg-midnight-800 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                      >
                        Underwrite
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedCardApp(c)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                      >
                        View Record
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCardApps.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No card applications match the active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Underwriting Modal */}
      {selectedCardApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
                  {selectedCardApp.cardApplicationId}
                </span>
                <h3 className="text-base font-bold text-slate-900">Credit Card Sanction Review</h3>
              </div>
              <button onClick={() => setSelectedCardApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cardholder:</span>
                <span className="font-bold text-slate-900">{selectedCardApp.customerName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Card Product:</span>
                <span className="font-semibold text-slate-900">{selectedCardApp.cardName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Linked Core Account:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedCardApp.linkedAccountId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-semibold text-slate-900">Registered Residential Address (ADDR-1001)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Bureau Underwriting Status:</span>
                <span className="font-semibold text-emerald-700">Prime Approved (Score: 782)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCardApp(null)}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              {selectedCardApp.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const appToReject = selectedCardApp;
                      setSelectedCardApp(null);
                      onReject(appToReject);
                    }}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg"
                  >
                    Decline Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const appToApprove = selectedCardApp;
                      setSelectedCardApp(null);
                      onApprove(appToApprove);
                    }}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Authorize & Issue Card
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
