import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/common/UIComponents';
import { ApplyModal } from '../components/common/ApplyModal';
import { INVESTMENTS_DATA } from '../data/bankingData';
import { CheckCircle2, ShieldCheck, TrendingUp, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InvestmentsPage = () => {
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
          <Badge variant="gold" className="mb-3">Wealth & High Returns</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1C1B1F] tracking-tight">
            Grow & Protect Your Capital with Certainty
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3">
            Explore guaranteed Fixed & Recurring Deposits, tax-free Sukanya Samriddhi Yojana (SSY), and long-term wealth compounding via Direct Mutual Fund SIPs.
          </p>
          <div className="mt-4">
            <Link to="/calculators">
              <Button variant="outline" size="sm" icon={Calculator}>
                Calculate your maturity returns with our live calculator
              </Button>
            </Link>
          </div>
        </div>

        {/* Investment Stack */}
        <div className="space-y-8">
          {INVESTMENTS_DATA.map((inv) => (
            <div 
              key={inv.id} 
              id={inv.id} 
              className="scroll-mt-24"
            >
              <Card className="p-6 md:p-8 hover:shadow-md transition-shadow border-l-4 border-l-[#C9A227]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Details & Features */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-[#1C1B1F]">{inv.title}</h2>
                      <Badge variant="gold">{inv.rate}</Badge>
                    </div>

                    <p className="text-sm text-gray-700 font-medium">{inv.tagline}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {inv.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs">
                      {inv.benefits.map((b, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 font-semibold">
                          ★ {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: CTA Box */}
                  <div className="lg:col-span-4 bg-amber-50/40 rounded-xl p-6 border border-amber-200 text-center space-y-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Estimated Return</div>
                    <div className="text-3xl font-black text-amber-900">{inv.rate}</div>
                    <p className="text-xs text-gray-600">Tenure: {inv.tenure}</p>

                    <Button
                      onClick={() => handleApply(inv)}
                      variant="primary"
                      className="w-full shadow-sm"
                    >
                      Invest Online
                    </Button>
                    <div className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>DICGC Insured / Govt Guaranteed</span>
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
