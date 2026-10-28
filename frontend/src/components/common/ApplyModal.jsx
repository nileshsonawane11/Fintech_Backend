import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './UIComponents';
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const ApplyModal = ({ isOpen, onClose, product }) => {
  const { submitApplication } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    panNumber: '',
    pincode: '',
    annualIncome: '₹ 5,00,000 - ₹ 10,00,000',
    employmentType: 'Salaried',
    termsAccepted: false
  });
  const [submittedApp, setSubmittedApp] = useState(null);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Please enter your legal name as on PAN';
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile number';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
      errs.panNumber = 'Enter a valid 10-digit PAN (e.g. ABCDE1234F)';
    }
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) errs.pincode = 'Enter a valid 6-digit Indian PIN code';
    if (!formData.termsAccepted) errs.termsAccepted = 'You must authorize KYC and consent to credit checks';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newApp = submitApplication({
      productType: product?.category || 'Banking Service',
      productName: product?.title || 'FinEdge Product',
      applicantName: formData.fullName,
      mobile: formData.mobile,
      email: formData.email,
      income: formData.annualIncome,
      pan: formData.panNumber.toUpperCase()
    });

    setSubmittedApp(newApp);
  };

  const handleClose = () => {
    setSubmittedApp(null);
    setFormData({
      fullName: '',
      mobile: '',
      email: '',
      panNumber: '',
      pincode: '',
      annualIncome: '₹ 5,00,000 - ₹ 10,00,000',
      employmentType: 'Salaried',
      termsAccepted: false
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-apply-title"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <span className="text-xs font-semibold text-[#9D1D27] uppercase tracking-wider">Fast Digital Onboarding</span>
            <h3 id="modal-apply-title" className="text-lg font-bold text-[#1C1B1F]">
              Apply for {product?.title || 'FinEdge Banking'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {submittedApp ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Application Submitted Successfully!</h4>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Thank you, <strong className="text-gray-900">{submittedApp.applicantName}</strong>. Your application for <strong className="text-gray-900">{submittedApp.productName}</strong> has been logged into our core banking engine.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Application Reference ID:</span>
                  <span className="font-mono font-bold text-[#9D1D27]">{submittedApp.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Status:</span>
                  <span className="font-semibold text-amber-600">{submittedApp.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Step:</span>
                  <span className="text-gray-800">Video KYC link sent via SMS</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Simulated Demo Operation:</strong> No real credit bureau or Aadhaar lookup was executed. You can track this application in your Customer Portal.
                </span>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button onClick={handleClose} variant="primary">
                  Done & Back to Browse
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>256-bit SSL encrypted. Direct RBI-compliant digital paperless onboarding.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number (Aadhaar linked) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent Account Number (PAN) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  {errors.panNumber && <p className="text-xs text-red-600 mt-1">{errors.panNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Residential PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6-digit PIN"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  />
                  {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                  >
                    <option value="Salaried">Salaried (Corporate / Govt)</option>
                    <option value="Self-Employed">Self-Employed Professional (Doctor/CA)</option>
                    <option value="Business">Business Owner / Merchant</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired / Senior Citizen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Approximate Annual Income Bracket</label>
                <select
                  value={formData.annualIncome}
                  onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9D1D27]/30 focus:border-[#9D1D27]"
                >
                  <option value="Up to ₹ 3,00,000">Up to ₹ 3,00,000</option>
                  <option value="₹ 3,00,000 - ₹ 5,00,000">₹ 3,00,000 - ₹ 5,00,000</option>
                  <option value="₹ 5,00,000 - ₹ 10,00,000">₹ 5,00,000 - ₹ 10,00,000</option>
                  <option value="₹ 10,00,000 - ₹ 25,00,000">₹ 10,00,000 - ₹ 25,00,000</option>
                  <option value="Above ₹ 25,00,000">Above ₹ 25,00,000</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="mt-0.5 rounded text-[#9D1D27] focus:ring-[#9D1D27]"
                  />
                  <span>
                    I confirm that the details provided are accurate and authorize FinEdge Bank to pull credit bureau information and conduct Video KYC as per RBI Master Directions.
                  </span>
                </label>
                {errors.termsAccepted && <p className="text-xs text-red-600 mt-1">{errors.termsAccepted}</p>}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button type="button" onClick={handleClose} variant="ghost">Cancel</Button>
                <Button type="submit" variant="primary">Submit Application</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
