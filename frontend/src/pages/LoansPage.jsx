import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/common/UIComponents';
import { ApplyModal } from '../components/common/ApplyModal';
import { LOANS_DATA } from '../data/bankingData';
import { CheckCircle2, ShieldCheck, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoansPage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleApply = (product) => {
    setSelectedProduct(product);
    setIsApplyModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <Badge variant="blue" className="mb-3">Retail & Business Finance</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1C1B1F] tracking-tight">
            Comprehensive Financing with Transparent Pricing
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3">
            Choose from Home Loans, MSME Business Credit, Kisan Agri Loans, Vehicle, Instant Gold Loans, Loan Against Property (LAP), and Global Education Loans.
          </p>
          <div className="mt-4">
            <Link to="/calculators">
              <Button variant="outline" size="sm" icon={Calculator}>
                Estimate your monthly EMI with our live calculator
              </Button>
            </Link>
          </div>
        </div>

        {/* Loan Stack */}
        <div className="space-y-8">
          {LOANS_DATA.map((loan) => (
            <div 
              key={loan.id} 
              id={loan.id} 
              className="scroll-mt-24"
            >
              <Card className="p-6 md:p-8 hover:shadow-md transition-shadow border-l-4 border-l-[#0288D1]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Details & Features */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-[#1C1B1F]">{loan.title}</h2>
                      <Badge variant="blue">{loan.interestRate}</Badge>
                    </div>

                    <p className="text-sm text-gray-700 font-medium">{loan.tagline}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {loan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-6 text-xs text-gray-500">
                      <div>
                        <strong className="text-gray-700">Max Sanction:</strong> {loan.maxAmount}
                      </div>
                      <div>
                        <strong className="text-gray-700">Tenure:</strong> {loan.tenure}
                      </div>
                      <div>
                        <strong className="text-gray-700">Eligibility:</strong> {loan.eligibility}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CTA Box */}
                  <div className="lg:col-span-4 bg-blue-50/40 rounded-xl p-6 border border-blue-100 text-center space-y-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Interest Rate</div>
                    <div className="text-3xl font-black text-blue-900">{loan.interestRate}</div>
                    <p className="text-xs text-gray-600">Sanctioned digitally with transparent processing fee.</p>

                    <Button
                      onClick={() => handleApply(loan)}
                      variant="primary"
                      className="w-full shadow-sm"
                    >
                      Apply for Loan
                    </Button>
                    <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Zero foreclosure penalty on floating rate</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};
