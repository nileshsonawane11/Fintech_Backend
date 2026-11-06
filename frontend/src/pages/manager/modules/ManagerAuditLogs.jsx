import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Lock, 
  AlertCircle 
} from 'lucide-react';

export const ManagerAuditLogs = ({
  auditList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    return auditList.map((log, index) => ({
      ...log,
      sequentialId: `AUD-${10001 + index}`
    })).filter(l => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (actorFilter !== 'ALL' && l.actorType !== actorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (l.action || '').toLowerCase().includes(q) ||
          (l.actorId || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q) ||
          (l.sequentialId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditList, statusFilter, actorFilter, searchQuery]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Audit ID', 'Timestamp', 'Actor Type', 'Actor ID', 'Action Event', 'Status', 'Event Details'];
    const rows = filteredLogs.map(l => [
      `"${l.sequentialId}"`,
      `"${l.timestamp || new Date().toISOString()}"`,
      `"${l.actorType || 'STAFF'}"`,
      `"${l.actorId || 'STF-001'}"`,
      `"${(l.action || 'AUDIT_EVENT').replace(/"/g, '""')}"`,
      `"${l.status || 'SUCCESS'}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinEdge_Compliance_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Statutory Compliance Audit Log (Non-Repudiation)</h2>
          <p className="text-xs text-slate-500">Immutable ledger tracking security events, underwriting decisions & operator actions</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-midnight-900"
            />
          </div>

          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Actors</option>
            <option value="STAFF">Staff Operator</option>
            <option value="CUSTOMER">Customer Action</option>
            <option value="SYSTEM">Core System</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed / Rejected</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="px-5 py-3.5">Audit ID</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Event Details & Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.map((log) => {
                const isFailed = log.status === 'FAILED' || log.status === 'REJECTED';
                return (
                  <tr key={log.id || log.sequentialId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {log.sequentialId}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : new Date().toISOString().slice(0, 19)}
                    </td>
                    <td className="px-5 py-3.5 font-sans whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{log.actorId || 'STF-001'}</span>
                      <span className="text-xs text-slate-400 block font-mono">({log.actorType || 'STAFF'})</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap font-mono">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-sans">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 w-fit ${
                        isFailed ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isFailed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-sans text-slate-600 max-w-xs truncate">
                      {log.details || log.targetId || 'Event recorded'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-sans">
                    No compliance audit entries match the current filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
