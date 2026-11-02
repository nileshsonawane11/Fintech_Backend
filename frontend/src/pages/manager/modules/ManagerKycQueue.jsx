import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  User, 
  MapPin, 
  Clock, 
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Eye,
  X
} from 'lucide-react';

export const ManagerKycQueue = ({
  kycQueue,
  onApprove,
  onReject,
  onRequestInfo,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState(kycQueue[0]?.kycCaseId || null);

  // Inspector local state
  const [inspectorRisk, setInspectorRisk] = useState('LOW');
  const [inspectorRemarks, setInspectorRemarks] = useState('All statutory documents and CKYC records verified. Approved.');

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return kycQueue.filter(k => {
      if (statusFilter !== 'ALL' && k.status !== statusFilter) return false;
      if (riskFilter !== 'ALL' && k.riskCategory !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (k.fullName || '').toLowerCase().includes(q) ||
          (k.kycCaseId || '').toLowerCase().includes(q) ||
          (k.customerId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [kycQueue, statusFilter, riskFilter, searchQuery]);

  const selectedCase = useMemo(() => {
    return kycQueue.find(k => k.kycCaseId === selectedCaseId) || filteredQueue[0] || null;
  }, [kycQueue, selectedCaseId, filteredQueue]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Statutory KYC Verification Queue</h2>
          <p className="text-xs text-slate-500">RBI Master Direction on Customer Due Diligence & CKYC Verification</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or case ID..."
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
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Queue Table (Left) + Case Dossier Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cases ({filteredQueue.length})
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Click case to inspect evidence</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((k) => {
                  const isSelected = selectedCase?.kycCaseId === k.kycCaseId;
                  return (
                    <tr
                      key={k.kycCaseId}
                      onClick={() => setSelectedCaseId(k.kycCaseId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-red-50/60 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {k.kycCaseId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 font-semibold">{k.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">CIF: {k.customerId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          k.riskCategory === 'HIGH' 
                            ? 'bg-red-100 text-red-800' 
                            : k.riskCategory === 'MEDIUM' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {k.riskCategory || 'LOW'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          k.status === 'APPROVED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : k.status === 'REJECTED' 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {k.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className={`w-4 h-4 inline-block ${isSelected ? 'text-midnight-900' : 'text-slate-400'}`} />
                      </td>
                    </tr>
                  );
                })}
                {filteredQueue.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No KYC verification cases match the active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Case Dossier Inspector (Right Pane) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          {selectedCase ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    {selectedCase.kycCaseId}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{selectedCase.fullName}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  selectedCase.status === 'APPROVED' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : selectedCase.status === 'REJECTED' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {selectedCase.status}
                </span>
              </div>

              {/* Demographic & Identity Matrix */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Permanent PAN:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCase.panNumberMasked || 'BPKPS••••K'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gender / DOB:</span>
                  <span className="font-semibold text-slate-900">{selectedCase.gender || 'MALE'} • 1988-06-12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Occupation:</span>
                  <span className="font-semibold text-slate-900">{selectedCase.occupation || 'SALARIED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Income Slab:</span>
                  <span className="font-semibold text-slate-900">₹10L – ₹15L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aadhaar e-KYC Consent:</span>
                  <span className="font-semibold text-emerald-700">Verified & Recorded</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Residential Address:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCase.residentialAddress?.line1 || '402, FinEdge Horizon Towers'}, {selectedCase.residentialAddress?.city || 'Mumbai'}, {selectedCase.residentialAddress?.state || 'Maharashtra'} - {selectedCase.residentialAddress?.postalCode || '400051'}
                  </span>
                </div>
              </div>

              {/* Submitted Documents Inspection */}
              <div>
                <h4 className="text-[13px] font-semibold text-slate-700 mb-2">
                  Document Artifacts ({selectedCase.documents?.length || 2})
                </h4>
                <div className="space-y-2">
                  {(selectedCase.documents || [
                    { documentType: 'PAN_CARD', fileName: 'pan_card_copy.pdf' },
                    { documentType: 'ADDRESS_PROOF', fileName: 'electricity_bill.pdf' }
                  ]).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-midnight-900" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{doc.documentType}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{doc.fileName}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Legible
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Controls (Maker-Checker Workflow) */}
              <div className="pt-2 border-t border-slate-100 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Anti-Money Laundering Risk Rating</label>
                  <select
                    value={inspectorRisk}
                    onChange={(e) => setInspectorRisk(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="LOW">Low Risk (Standard Retail Customer)</option>
                    <option value="MEDIUM">Medium Risk (High Volume Account)</option>
                    <option value="HIGH">High Risk (Politically Exposed Person / Cross-Border)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Compliance Verification Notes</label>
                  <textarea
                    rows="2"
                    value={inspectorRemarks}
                    onChange={(e) => setInspectorRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Enter compliance underwriting notes..."
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onRequestInfo(selectedCase)}
                    className="py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
                  >
                    Request Info
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(selectedCase)}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-lg transition-colors text-xs"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(selectedCase)}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorize & Approve KYC
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Select a verification case from the queue to inspect compliance evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
