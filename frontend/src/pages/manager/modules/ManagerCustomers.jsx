import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  ShieldCheck, 
  Building, 
  CreditCard, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  X,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

export const ManagerCustomers = ({
  customersList,
  onCreateCustomer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [revealedPanCustId, setRevealedPanCustId] = useState(null);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustPan, setNewCustPan] = useState('');
  const [newCustOccupation, setNewCustOccupation] = useState('SALARIED');
  const [newCustIncome, setNewCustIncome] = useState('1000000_1500000');
  const [newCustCity, setNewCustCity] = useState('Mumbai');
  const [newCustState, setNewCustState] = useState('MAHARASHTRA');
  const [submitting, setSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customersList.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (c.fullName || '').toLowerCase().includes(q) ||
          (c.customerId || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.mobileNumber || '').includes(q) ||
          (c.pan || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customersList, searchQuery]);

  const handleSubmitOnboard = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateCustomer({
        fullName: newCustName,
        email: newCustEmail,
        mobileNumber: newCustMobile,
        pan: newCustPan.toUpperCase(),
        occupation: newCustOccupation,
        annualIncomeRange: newCustIncome,
        city: newCustCity,
        state: newCustState
      });
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustMobile('');
      setNewCustPan('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Enterprise Customer Master Directory</h2>
          <p className="text-xs text-slate-500">Central Customer Information File (CIF) & Multi-Account Cross-References</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, CIF, mobile, PAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-midnight-900"
            />
          </div>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-3.5 py-1.5 bg-midnight-900 hover:bg-midnight-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Onboard Customer
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <th className="px-5 py-3.5">Customer CIF</th>
                <th className="px-5 py-3.5">Full Legal Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">KYC Clearance</th>
                <th className="px-5 py-3.5">AML Risk</th>
                <th className="px-5 py-3.5 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.customerId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">
                    {c.customerId}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{c.fullName}</div>
                    <div className="text-[11px] text-slate-400">{c.occupation || 'Salaried'}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <div>{c.email}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{c.mobileNumber}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.kycStatus === 'APPROVED' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {c.kycStatus || 'APPROVED'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {c.riskCategory || 'LOW'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No customers found matching the search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Dossier Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
                  {selectedCustomer.customerId}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedCustomer.fullName}</h3>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedCustomer.mobileNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">PAN Identity (Audit Gated):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">
                    {revealedPanCustId === selectedCustomer.customerId ? (selectedCustomer.pan || 'BPKPS1234K') : '••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRevealedPanCustId(revealedPanCustId === selectedCustomer.customerId ? null : selectedCustomer.customerId)}
                    className="text-midnight-900 hover:underline text-[11px] font-semibold"
                  >
                    {revealedPanCustId === selectedCustomer.customerId ? 'Mask' : 'Reveal (Audit)'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">KYC Status:</span>
                <span className="font-semibold text-emerald-700">Verified & Approved</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Home Branch:</span>
                <span className="font-semibold text-slate-900">Nariman Point Branch, Mumbai (FNEG0001001)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Onboard New Retail Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOnboard} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Srikant Ramanathan"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="srikant@finedge-mail.in"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="9820198402"
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength="10"
                    placeholder="BPKPS1234K"
                    value={newCustPan}
                    onChange={(e) => setNewCustPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono focus:outline-none focus:ring-2 focus:ring-midnight-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
                  <select
                    value={newCustOccupation}
                    onChange={(e) => setNewCustOccupation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="SALARIED">Salaried</option>
                    <option value="SELF_EMPLOYED">Self-Employed</option>
                    <option value="BUSINESS">Business Owner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="MAHARASHTRA">Maharashtra</option>
                    <option value="DELHI">Delhi NCR</option>
                    <option value="KARNATAKA">Karnataka</option>
                    <option value="TAMIL_NADU">Tamil Nadu</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-midnight-900 hover:bg-midnight-800 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating CIF...' : 'Create Customer Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
