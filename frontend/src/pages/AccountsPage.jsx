import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/common/UIComponents';
import { ApplyModal } from '../components/common/ApplyModal';
import { ACCOUNTS_DATA } from '../data/bankingData';
import { CheckCircle2, ShieldCheck, Percent, ArrowRight } from 'lucide-react';

export const AccountsPage = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleApply = (product) => {
    setSelectedProduct(product);
    setIsApplyModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb / Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <Badge variant="crimson" className="mb-3">Savings & Current Accounts</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1C1B1F] tracking-tight">
            Accounts Designed for Every Stage of Life
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3">
            From high-yield monthly compounding savings to feature-rich corporate salary accounts and MSME current accounts with auto-sweep capabilities.
          </p>
        </div>

        {/* Product Cards Stack */}
        <div className="space-y-8">
          {ACCOUNTS_DATA.map((acc) => (
            <div 
              key={acc.id} 
              id={acc.id} 
              className="scroll-mt-24"
            >
              <Card className="p-6 md:p-8 hover:shadow-md transition-shadow border-l-4 border-l-[#9D1D27]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Details & Features */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-[#1C1B1F]">{acc.title}</h2>
                      <Badge variant="crimson">{acc.interestRate}</Badge>
                    </div>

                    <p className="text-sm text-gray-700 font-medium">{acc.tagline}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {acc.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-6 text-xs text-gray-500">
                      <div>
                        <strong className="text-gray-700">Minimum Balance:</strong> {acc.minBalance}
                      </div>
                      <div>
                        <strong className="text-gray-700">Eligibility:</strong> {acc.eligibility}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CTA & Action Box */}
                  <div className="lg:col-span-4 bg-gray-50 rounded-xl p-6 border border-gray-200 text-center space-y-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Interest Proposition</div>
                    <div className="text-3xl font-black text-[#9D1D27]">{acc.interestRate}</div>
                    <p className="text-xs text-gray-600">Calculated on daily balance, credited monthly to your account.</p>

                    <Button
                      onClick={() => handleApply(acc)}
                      variant="primary"
                      className="w-full shadow-sm"
                    >
                      Open Account Online
                    </Button>
                    <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                      <span>Instant paperless video KYC</span>
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
