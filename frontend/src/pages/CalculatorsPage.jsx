import React, { useState, useMemo } from 'react';
import { Card, Badge, Button } from '../components/common/UIComponents';
import { Calculator, RotateCcw, AlertCircle, Info, TrendingUp, Landmark, Percent } from 'lucide-react';

export const CalculatorsPage = () => {
  const [activeTab, setActiveTab] = useState('emi'); // 'emi', 'fd', 'rd', 'savings', 'sip'

  // 1. EMI Calculator States
  const [loanAmount, setLoanAmount] = useState(2500000); // 25 Lakhs
  const [interestRate, setInterestRate] = useState(8.75); // 8.75%
  const [tenureYears, setTenureYears] = useState(20); // 20 years

  // 2. Fixed Deposit States
  const [fdAmount, setFdAmount] = useState(100000); // 1 Lakh
  const [fdRate, setFdRate] = useState(7.10); // 7.10%
  const [fdTenureMonths, setFdTenureMonths] = useState(36); // 36 months (3 years)
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);

  // 3. Recurring Deposit States
  const [rdMonthly, setRdMonthly] = useState(5000); // 5000/month
  const [rdRate, setRdRate] = useState(7.10); // 7.10%
  const [rdTenureMonths, setRdTenureMonths] = useState(24); // 24 months

  // 4. Savings Account Monthly Interest Compounding States
  const [savingsBalance, setSavingsBalance] = useState(200000); // 2 Lakhs
  const [savingsRate, setSavingsRate] = useState(7.00); // 7.00%

  // 5. SIP Calculator States
  const [sipMonthly, setSipMonthly] = useState(5000); // 5000/month
  const [sipRate, setSipRate] = useState(12.0); // 12% expected annual return
  const [sipYears, setSipYears] = useState(10); // 10 years

  // --- Calculations ---

  // EMI Math: P * r * (1+r)^n / ((1+r)^n - 1)
  const emiResults = useMemo(() => {
    const P = loanAmount;
    const r = interestRate / (12 * 100);
    const n = tenureYears * 12;
    if (r === 0) {
      const emi = P / n;
      return { emi: Math.round(emi), totalPayable: P, totalInterest: 0 };
    }
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayable = emi * n;
    const totalInterest = totalPayable - P;
    return {
      emi: Math.round(emi),
      totalPayable: Math.round(totalPayable),
      totalInterest: Math.round(totalInterest)
    };
  }, [loanAmount, interestRate, tenureYears]);

  // FD Math: A = P * (1 + r/400)^(4*t) (Quarterly compounding as per RBI)
  const fdResults = useMemo(() => {
    const effectiveRate = isSeniorCitizen ? fdRate + 0.50 : fdRate;
    const t = fdTenureMonths / 12;
    const P = fdAmount;
    const A = P * Math.pow(1 + effectiveRate / 400, 4 * t);
    const interestEarned = A - P;
    return {
      maturityAmount: Math.round(A),
      interestEarned: Math.round(interestEarned),
      effectiveRate
    };
  }, [fdAmount, fdRate, fdTenureMonths, isSeniorCitizen]);

  // RD Math: Standard Indian Quarterly Compounded RD formula
  const rdResults = useMemo(() => {
    const P = rdMonthly;
    const n = rdTenureMonths;
    const r = rdRate / 100;
    // Approximating compound interest on recurring installments
    let totalMaturity = 0;
    for (let i = 1; i <= n; i++) {
      const t = (n - i + 1) / 12;
      totalMaturity += P * Math.pow(1 + r / 4, 4 * t);
    }
    const totalDeposited = P * n;
    const interestEarned = totalMaturity - totalDeposited;
    return {
      totalDeposited: Math.round(totalDeposited),
      maturityAmount: Math.round(totalMaturity),
      interestEarned: Math.round(interestEarned)
    };
  }, [rdMonthly, rdRate, rdTenureMonths]);

  // Savings Account Monthly Compounding Math: A = P * (1 + r/1200)^12
  const savingsResults = useMemo(() => {
    const monthlyRate = savingsRate / 1200;
    const oneMonthInterest = savingsBalance * monthlyRate;
    const annualCompoundInterest = savingsBalance * (Math.pow(1 + monthlyRate, 12) - 1);
    return {
      monthlyCredit: Math.round(oneMonthInterest),
      annualInterest: Math.round(annualCompoundInterest)
    };
  }, [savingsBalance, savingsRate]);

  // SIP Math: M = P * ((1+i)^n - 1) / i * (1+i)
  const sipResults = useMemo(() => {
    const P = sipMonthly;
    const i = sipRate / (12 * 100);
    const n = sipYears * 12;
    const totalInvestment = P * n;
    const maturity = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const wealthGain = maturity - totalInvestment;
    return {
      totalInvestment: Math.round(totalInvestment),
      maturityAmount: Math.round(maturity),
      wealthGain: Math.round(wealthGain)
    };
  }, [sipMonthly, sipRate, sipYears]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="crimson" className="mb-3">Live Mathematical Models</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1C1B1F] tracking-tight">
            Interactive Financial Calculators
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3">
            Real-time recalculation with verifiable formula standards. Plan your EMIs, evaluate maturity returns, and project long-term wealth growth.
          </p>
        </div>

        {/* Calculator Category Navigation */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-6 no-scrollbar">
          {[
            { id: 'emi', label: 'Loan EMI Calculator' },
            { id: 'fd', label: 'Fixed Deposit (FD)' },
            { id: 'rd', label: 'Recurring Deposit (RD)' },
            { id: 'savings', label: 'Monthly Interest Savings' },
            { id: 'sip', label: 'Mutual Fund SIP Growth' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-standard ${
                activeTab === tab.id
                  ? 'bg-[#9D1D27] text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Calculator Display Cards */}
        <div className="max-w-5xl mx-auto">
          {/* 1. EMI CALCULATOR */}
          {activeTab === 'emi' && (
            <Card className="p-6 md:p-10 border-t-4 border-t-[#9D1D27]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Sliders Area */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Loan Amount</label>
                      <span className="font-mono text-base font-bold text-[#9D1D27]">₹ {loanAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={50000}
                      max={10000000}
                      step={50000}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full accent-[#9D1D27] cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>₹50,000</span>
                      <span>₹50 Lakhs</span>
                      <span>₹1 Crore</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Interest Rate (% p.a.)</label>
                      <span className="font-mono text-base font-bold text-[#9D1D27]">{interestRate}%</span>
                    </div>
                    <input
                      type="range"
                      min={6.0}
                      max={18.0}
                      step={0.1}
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full accent-[#9D1D27] cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>6.0%</span>
                      <span>12.0%</span>
                      <span>18.0%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tenure (Years)</label>
                      <span className="font-mono text-base font-bold text-[#9D1D27]">{tenureYears} Years ({tenureYears * 12} Months)</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={tenureYears}
                      onChange={(e) => setTenureYears(Number(e.target.value))}
                      className="w-full accent-[#9D1D27] cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>1 Year</span>
                      <span>15 Years</span>
                      <span>30 Years</span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setLoanAmount(2500000); setInterestRate(8.75); setTenureYears(20); }}
                      icon={RotateCcw}
                    >
                      Reset Defaults
                    </Button>
                  </div>
                </div>

                {/* Results Visual Box */}
                <div className="lg:col-span-5 bg-gradient-to-br from-[#1C1B1F] to-[#2A1015] rounded-2xl p-6 md:p-8 text-white space-y-5 shadow-xl">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Monthly EMI Payable</span>
                    <div className="text-3xl md:text-4xl font-black text-white mt-1">
                      ₹ {emiResults.emi.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-gray-400">per month for {tenureYears} years</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Principal Amount:</span>
                      <span className="font-bold font-mono">₹ {loanAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Total Interest Amount:</span>
                      <span className="font-bold font-mono text-amber-300">₹ {emiResults.totalInterest.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-white/10 pt-2 font-bold text-sm">
                      <span className="text-gray-200">Total Amount Payable:</span>
                      <span className="font-mono text-white">₹ {emiResults.totalPayable.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-2.5 text-[10px] text-gray-300 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span>Calculated using standard reducing balance compounding formula: EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ - 1).</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 2. FIXED DEPOSIT CALCULATOR */}
          {activeTab === 'fd' && (
            <Card className="p-6 md:p-10 border-t-4 border-t-[#C9A227]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Deposit Amount</label>
                      <span className="font-mono text-base font-bold text-amber-800">₹ {fdAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={5000000}
                      step={10000}
                      value={fdAmount}
                      onChange={(e) => setFdAmount(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tenure in Months</label>
                      <span className="font-mono text-base font-bold text-amber-800">{fdTenureMonths} Months ({(fdTenureMonths/12).toFixed(1)} Yrs)</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={120}
                      step={6}
                      value={fdTenureMonths}
                      onChange={(e) => setFdTenureMonths(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">Senior Citizen Advantage</span>
                      <span className="text-[11px] text-amber-700">Add +0.50% p.a. additional interest bonus</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSeniorCitizen}
                        onChange={(e) => setIsSeniorCitizen(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-[#1C1B1F] to-[#2B2312] rounded-2xl p-6 md:p-8 text-white space-y-5 shadow-xl">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Total Maturity Value</span>
                    <div className="text-3xl md:text-4xl font-black text-white mt-1">
                      ₹ {fdResults.maturityAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-gray-400">Effective Rate: {fdResults.effectiveRate}% p.a.</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Invested Capital:</span>
                      <span className="font-bold font-mono">₹ {fdAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Total Interest Earned:</span>
                      <span className="font-bold font-mono text-green-400">₹ {fdResults.interestEarned.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-2.5 text-[10px] text-gray-300 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span>Compounded quarterly as per standard RBI mandates: A = P × (1 + r/400)⁴ᵗ.</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 3. RECURRING DEPOSIT CALCULATOR */}
          {activeTab === 'rd' && (
            <Card className="p-6 md:p-10 border-t-4 border-t-[#0288D1]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Monthly Installment Amount</label>
                      <span className="font-mono text-base font-bold text-blue-800">₹ {rdMonthly.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={100000}
                      step={500}
                      value={rdMonthly}
                      onChange={(e) => setRdMonthly(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tenure in Months</label>
                      <span className="font-mono text-base font-bold text-blue-800">{rdTenureMonths} Months</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={60}
                      step={6}
                      value={rdTenureMonths}
                      onChange={(e) => setRdTenureMonths(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-[#1C1B1F] to-[#0F2236] rounded-2xl p-6 md:p-8 text-white space-y-5 shadow-xl">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Maturity Corpus</span>
                    <div className="text-3xl md:text-4xl font-black text-white mt-1">
                      ₹ {rdResults.maturityAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Total Deposited Amount:</span>
                      <span className="font-bold font-mono">₹ {rdResults.totalDeposited.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Total Interest Earned:</span>
                      <span className="font-bold font-mono text-green-400">₹ {rdResults.interestEarned.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 4. SAVINGS MONTHLY INTEREST CALCULATOR */}
          {activeTab === 'savings' && (
            <Card className="p-6 md:p-10 border-t-4 border-t-[#2E7D32]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Average Daily Savings Balance</label>
                      <span className="font-mono text-base font-bold text-green-800">₹ {savingsBalance.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={2500000}
                      step={10000}
                      value={savingsBalance}
                      onChange={(e) => setSavingsBalance(Number(e.target.value))}
                      className="w-full accent-green-600 cursor-pointer"
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-900 space-y-1">
                    <span className="font-bold text-green-950 block">Why Monthly Compounding Matters:</span>
                    <p>
                      Standard banks credit interest quarterly. FinEdge credits your interest monthly on the 30th/31st, allowing your interest to earn interest 12 times a year.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-[#1C1B1F] to-[#122A16] rounded-2xl p-6 md:p-8 text-white space-y-5 shadow-xl">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-green-400">Monthly Interest Credit</span>
                    <div className="text-3xl md:text-4xl font-black text-white mt-1">
                      +₹ {savingsResults.monthlyCredit.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-gray-400">Credited to account every single month</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Annual Compounded Return:</span>
                      <span className="font-bold font-mono text-green-400">₹ {savingsResults.annualInterest.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 5. SIP CALCULATOR */}
          {activeTab === 'sip' && (
            <Card className="p-6 md:p-10 border-t-4 border-t-[#0288D1]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Monthly SIP Investment</label>
                      <span className="font-mono text-base font-bold text-blue-800">₹ {sipMonthly.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={100000}
                      step={500}
                      value={sipMonthly}
                      onChange={(e) => setSipMonthly(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Expected Return Rate (% p.a.)</label>
                      <span className="font-mono text-base font-bold text-blue-800">{sipRate}%</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={20}
                      step={0.5}
                      value={sipRate}
                      onChange={(e) => setSipRate(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Duration in Years</label>
                      <span className="font-mono text-base font-bold text-blue-800">{sipYears} Years</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={sipYears}
                      onChange={(e) => setSipYears(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-[#1C1B1F] to-[#0A1A2E] rounded-2xl p-6 md:p-8 text-white space-y-5 shadow-xl">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Projected Wealth Corpus</span>
                    <div className="text-3xl md:text-4xl font-black text-white mt-1">
                      ₹ {sipResults.maturityAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Total Invested Amount:</span>
                      <span className="font-bold font-mono">₹ {sipResults.totalInvestment.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Estimated Capital Gains:</span>
                      <span className="font-bold font-mono text-green-400">+₹ {sipResults.wealthGain.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-2.5 text-[10px] text-gray-300 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                    <span>Mutual fund returns are market-linked and not guaranteed. Historical CAGR used for projection.</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Mandatory Disclaimers Strip */}
          <div className="mt-8 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-950 block">Important Mathematical Disclaimer:</strong>
              <p>
                The outputs generated by these financial calculators are indicative and strictly for illustrative planning purposes. Final sanctioned EMI, loan interest rates, and deposit maturity values are subject to individual credit assessment, tenure verification, applicable statutory taxes, and prevailing RBI guidelines at the time of agreement execution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
