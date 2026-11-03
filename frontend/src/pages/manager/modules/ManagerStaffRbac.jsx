import React, { useState } from 'react';
import { 
  Building2, 
  Key, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  UserPlus, 
  ShieldCheck, 
  X
} from 'lucide-react';

export const ManagerStaffRbac = ({
  staffList,
  onCreateStaff,
  onToggleStatus
}) => {
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Operations');
  const [newStaffRole, setNewStaffRole] = useState('KYC_OFFICER');
  const [submitting, setSubmitting] = useState(false);

  // Deactivation confirmation modal state
  const [staffToDeactivate, setStaffToDeactivate] = useState(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateStaff({
        fullName: newStaffName,
        email: newStaffEmail,
        department: newStaffDept,
        role: newStaffRole
      });
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffEmail('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC) & Staff Governance</h2>
          <p className="text-xs text-slate-500">Dual-Control Permissions Matrix, Maker-Checker Policies & Employee Provisioning</p>
        </div>

        <button
          onClick={() => setShowAddStaffModal(true)}
          className="px-3.5 py-1.5 bg-midnight-900 hover:bg-midnight-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" /> Provision Staff User
        </button>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="px-5 py-3.5">Staff ID</th>
                <th className="px-5 py-3.5">Employee Name</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((staff) => {
                const isActive = staff.status === 'ACTIVE';
                return (
                  <tr key={staff.staffId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {staff.staffId}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{staff.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{staff.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {staff.department || 'Operations'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        staff.role === 'BANK_MANAGER'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : staff.role === 'KYC_OFFICER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {staff.roleTitle || staff.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {staff.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {staff.role !== 'BANK_MANAGER' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setStaffToDeactivate(staff);
                            } else {
                              onToggleStatus(staff.staffId, staff.status);
                            }
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            isActive
                              ? 'text-red-700 hover:bg-red-50 border border-red-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {isActive ? 'Revoke Access' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Granular Role Permission Policies</h3>
        <p className="text-xs text-slate-500 mb-4">
          Statutory segregation of duties mandated by banking regulatory guidelines.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30">
            <div className="font-bold text-purple-900">Chief Branch Manager</div>
            <div className="text-[11px] text-purple-700 mt-1 mb-3">All permissions + Staff provisioning</div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Account Underwriting & Creation</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Card Limits & Sanctions</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Staff Revocation & RBAC</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Audit Log Inspection & Export</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30">
            <div className="font-bold text-blue-900">KYC Verification Officer</div>
            <div className="text-[11px] text-blue-700 mt-1 mb-3">Statutory identity & AML review only</div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Customer Due Diligence (CDD)</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> CKYC Document Inspection</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> AML Risk Categorization</li>
              <li className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" /> No Account Materialization Power</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="font-bold text-slate-900">Account & Card Operations Specialist</div>
            <div className="text-[11px] text-slate-500 mt-1 mb-3">Processing and dispatch fulfillment</div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Initial Funding Verifications</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Card Embossing Queue</li>
              <li className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" /> No KYC Status Overrides</li>
              <li className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" /> No Staff Creation Privileges</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Deactivation Confirmation Modal */}
      {staffToDeactivate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-red-600 pb-3 border-b border-slate-200">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Revoke Staff Access Privileges</h3>
            </div>

            <p className="text-xs text-slate-600 py-4 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-900">{staffToDeactivate.fullName}</strong> ({staffToDeactivate.staffId})? Their active operational session will be terminated and all terminal permissions revoked immediately.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setStaffToDeactivate(null)}
                className="py-2 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = staffToDeactivate;
                  setStaffToDeactivate(null);
                  onToggleStatus(s.staffId, s.status);
                }}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Provision Internal Staff Member</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Meera Nambiar"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  placeholder="meera.nambiar@finedge.in"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="Operations">Operations & Processing</option>
                  <option value="Compliance">Regulatory Compliance</option>
                  <option value="Risk & Underwriting">Risk & Underwriting</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designated Role & Authority</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="KYC_OFFICER">KYC Verification Officer</option>
                  <option value="ACCOUNT_OPS">Account & Card Operations Specialist</option>
                  <option value="BANK_MANAGER">Branch Manager (Dual Authorization Power)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-midnight-900 hover:bg-midnight-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Provisioning...' : 'Provision Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
