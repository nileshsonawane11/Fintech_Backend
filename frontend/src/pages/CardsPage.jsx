import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/common/UIComponents';
import { ApplyModal } from '../components/common/ApplyModal';
import { CARDS_DATA } from '../data/bankingData';
import { CheckCircle2, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';

export const CardsPage = () => {
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
          <Badge variant="dark" className="mb-3">Credit & Debit Cards</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1C1B1F] tracking-tight">
            Engineered for Power, Privilege, and Everyday Value
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3">
            From precision-crafted stainless steel luxury metal cards with zero forex markup to lifetime free everyday cards and guaranteed approval FD-backed cards.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CARDS_DATA.map((card) => {
            const isMetal = card.tier.toLowerCase().includes('metal');
            return (
              <div key={card.id} id={card.id} className="scroll-mt-24 flex">
                <Card className={`p-6 flex flex-col justify-between w-full hover:shadow-xl transition-all duration-300 ${
                  isMetal ? 'border-t-4 border-t-amber-500 bg-gradient-to-b from-white to-gray-50' : 'border-t-4 border-t-[#9D1D27]'
                }`}>
                  <div>
                    {/* Simulated Credit Card Graphic */}
                    <div className={`w-full h-44 rounded-2xl p-5 text-white flex flex-col justify-between mb-6 shadow-md relative overflow-hidden ${
                      card.cardImage === 'metal-dark'
                        ? 'bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 border border-gray-700'
                        : card.cardImage === 'metal-gold'
                        ? 'bg-gradient-to-tr from-amber-900 via-amber-800 to-amber-600 border border-amber-500'
                        : card.cardImage === 'wow-blue'
                        ? 'bg-gradient-to-tr from-blue-900 to-cyan-700'
                        : card.cardImage === 'debit-slate'
                        ? 'bg-gradient-to-tr from-slate-900 to-slate-700'
                        : 'bg-gradient-to-tr from-[#9D1D27] to-[#5A0A10]'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm tracking-wider uppercase opacity-90">FinEdge Bank</span>
                        {isMetal ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                            <Sparkles className="w-3 h-3 text-amber-300" /> Metal
                          </span>
                        ) : (
                          <CreditCard className="w-5 h-5 opacity-70" />
                        )}
                      </div>
                      <div className="my-auto font-mono text-base tracking-widest opacity-80">
                        •••• •••• •••• 9842
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider opacity-60">Cardholder</div>
                          <div className="text-xs font-semibold tracking-wide">VIKRAMADITYA SHARMA</div>
                        </div>
                        <span className="font-bold text-xs uppercase tracking-wider opacity-90">{card.title.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-[#1C1B1F]">{card.title}</h3>
                    </div>
                    <Badge variant={isMetal ? 'gold' : 'crimson'} className="mb-3">{card.tier}</Badge>
                    <p className="text-xs text-gray-600 mb-4">{card.tagline}</p>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 mb-4">
                      <div><strong className="text-gray-700">Annual Fee:</strong> {card.annualFee}</div>
                      <div><strong className="text-gray-700">Rewards:</strong> {card.rewards}</div>
                    </div>

                    <ul className="text-xs text-gray-600 space-y-2 mb-6">
                      {card.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                    <Button onClick={() => handleApply(card)} variant="primary" className="w-full">
                      Apply Online
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })}
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
