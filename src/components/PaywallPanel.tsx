import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Check, Crown, CreditCard, Lock, ShieldCheck, 
  AlertCircle, ChevronRight, TrendingUp, X, CheckCircle2, RefreshCw
} from 'lucide-react';
import { BillingState, SubscriptionPlan } from '../types';

interface PaywallPanelProps {
  billingState: BillingState;
  onUpdateBilling: (state: BillingState) => void;
  onClose?: () => void;
  theme?: 'frosted' | 'high-contrast';
}

export default function PaywallPanel({
  billingState,
  onUpdateBilling,
  onClose,
  theme = 'frosted',
}: PaywallPanelProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(billingState.plan !== 'free' ? billingState.plan : 'yearly');
  const [showPlaySheet, setShowPlaySheet] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'visa' | 'momo' | 'play_balance'>('visa');
  const [purchaseStep, setPurchaseStep] = useState<'details' | 'processing' | 'success'>('details');

  const monthlyCost = 19.99;
  const yearlyCost = 149.99;
  const equivalentMonthlyYearly = +(yearlyCost / 12).toFixed(2);
  const savingsAmount = +(monthlyCost * 12 - yearlyCost).toFixed(2);
  const savingsPercent = Math.round(((monthlyCost * 12 - yearlyCost) / (monthlyCost * 12)) * 100);

  const premiumFeatures = [
    { title: "Unlimited voice notifications", desc: "No session reading caps or message limits" },
    { title: "Natural human-like notification reading", desc: "Powered by deep AI models with emotional pitch & breaths" },
    { title: "Smart notification summaries", desc: "Condenses long multi-message conversations instantly" },
    { title: "Multiple AI voices", desc: "Access 12+ natural masculine & feminine voice personas" },
    { title: "Custom voice personalities", desc: "Tweak accents, speed, pitch, and custom vocabulary filters" },
    { title: "Ad-free experience", desc: "Completely removes promotional simulation banners" },
    { title: "Priority AI processing", desc: "Low-latency voice generation with dedicated server queue" }
  ];

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleStartTrial = () => {
    if (selectedPlan === 'free') {
      // Transition back to Free
      onUpdateBilling({
        plan: 'free',
        isTrial: false,
        trialDaysLeft: 0,
        expiryDate: null,
        paymentMethod: null,
        status: 'none'
      });
      if (onClose) onClose();
    } else {
      // Show simulated Google Play Billing sheet
      setPurchaseStep('details');
      setShowPlaySheet(true);
    }
  };

  const handleConfirmSubscribe = () => {
    setPurchaseStep('processing');
    setTimeout(() => {
      setPurchaseStep('success');
      setTimeout(() => {
        // Complete simulated purchase
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        onUpdateBilling({
          plan: selectedPlan,
          isTrial: true,
          trialDaysLeft: 30,
          expiryDate: trialEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          paymentMethod: selectedPaymentMethod === 'visa' 
            ? 'Visa •••• 4242' 
            : selectedPaymentMethod === 'momo' 
              ? 'MTN Mobile Money' 
              : 'Google Play Balance',
          status: 'active'
        });
        
        setShowPlaySheet(false);
        if (onClose) onClose();
      }, 1500);
    }, 1800);
  };

  const handleCancelSubscription = () => {
    onUpdateBilling({
      ...billingState,
      status: 'cancelled',
      expiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    });
  };

  const handleRestoreSubscription = () => {
    onUpdateBilling({
      plan: 'free',
      isTrial: false,
      trialDaysLeft: 0,
      expiryDate: null,
      paymentMethod: null,
      status: 'none'
    });
  };

  return (
    <div className="w-full space-y-6" id="play-billing-paywall-panel">
      {/* Active Subscription Status Banner if already Premium */}
      {billingState.plan !== 'free' && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-indigo-300 block">
                Premium Active via Google Play ({billingState.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan)
              </span>
              <span className="text-[10px] text-slate-300 block mt-0.5">
                {billingState.isTrial ? '30-Day Free Trial' : 'Subscription'} • Expires/Renews: <b>{billingState.expiryDate}</b> via {billingState.paymentMethod}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {billingState.status === 'active' ? (
              <button
                onClick={handleCancelSubscription}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-[10px] font-bold cursor-pointer transition-all"
              >
                Cancel Renewal
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg">Will cancel soon</span>
                <button
                  onClick={handleRestoreSubscription}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold cursor-pointer transition-all"
                >
                  Downgrade Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paywall Container */}
      <div className={`p-6 rounded-3xl ${theme === 'high-contrast' ? 'bg-black border-4 border-white' : 'bg-white/5 border border-white/10 backdrop-blur-md'} relative overflow-hidden shadow-2xl`}>
        {/* Background lights for high-end look */}
        {theme !== 'high-contrast' && (
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        )}

        {/* Header Title Section */}
        <div className="text-center space-y-2 relative z-10 max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[10px] font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            Google Play Subscription
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
            Unlock VocalNotify Announcer Premium
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Choose your companion plan. Get human-like readings, smart summaries, and total freedom. Start with a 30-day risk-free trial.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
          
          {/* PLAN 1: FREE PLAN */}
          <div 
            onClick={() => handleSelectPlan('free')}
            className={`p-4 rounded-2xl cursor-pointer border transition-all text-left flex flex-col justify-between ${
              selectedPlan === 'free'
                ? theme === 'high-contrast'
                  ? 'border-white bg-white/25 text-white ring-2 ring-white'
                  : 'border-slate-500 bg-slate-500/10 ring-2 ring-slate-500/40 text-white'
                : theme === 'high-contrast'
                  ? 'border-white/40 bg-black text-slate-300 hover:border-white'
                  : 'border-white/5 bg-white/5 hover:bg-white/8 text-slate-300 hover:border-white/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                <span className="text-xs font-extrabold tracking-wide uppercase text-slate-300">Basic Free</span>
                {selectedPlan === 'free' && <Check className="w-4 h-4 text-slate-300 shrink-0" />}
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-black text-white">GHS 0.00</span>
                <span className="text-[10px] text-slate-400 block font-medium">Free Forever</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[10px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-slate-400 shrink-0" />
                  Max 3 voice alerts / session
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-slate-400 shrink-0" />
                  Standard robotic TTS pitch
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <span>• Ad banners in simulator</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 mt-4 border-t border-white/5 text-[9px] text-slate-400 font-semibold uppercase text-center tracking-wider">
              Selected Option
            </div>
          </div>

          {/* PLAN 2: PREMIUM MONTHLY */}
          <div 
            onClick={() => handleSelectPlan('monthly')}
            className={`p-4 rounded-2xl cursor-pointer border transition-all text-left flex flex-col justify-between relative ${
              selectedPlan === 'monthly'
                ? theme === 'high-contrast'
                  ? 'border-yellow-400 bg-white/25 text-white ring-2 ring-yellow-400'
                  : 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/40 text-white'
                : theme === 'high-contrast'
                  ? 'border-white/40 bg-black text-slate-300 hover:border-white'
                  : 'border-white/5 bg-white/5 hover:bg-white/8 text-slate-300 hover:border-white/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                <span className="text-xs font-extrabold tracking-wide uppercase text-purple-300">Monthly</span>
                {selectedPlan === 'monthly' && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">GHS 19.99</span>
                  <span className="text-[10px] text-slate-400">/mo</span>
                </div>
                <span className="text-[9.5px] text-purple-400 font-extrabold block">30-Day Free Trial</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[10px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Unlimited voice readouts
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  All premium natural AI voices
                </li>
                <li className="flex items-center gap-1.5 text-purple-400 font-semibold">
                  <span>✨ Cancel anytime instantly</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 mt-4 border-t border-white/5 text-[9px] text-slate-400 font-semibold uppercase text-center tracking-wider">
              30 Days Free Then GHS 19.99
            </div>
          </div>

          {/* PLAN 3: PREMIUM YEARLY (BEST VALUE) */}
          <div 
            onClick={() => handleSelectPlan('yearly')}
            className={`p-4 rounded-2xl cursor-pointer border transition-all text-left flex flex-col justify-between relative overflow-hidden ${
              selectedPlan === 'yearly'
                ? theme === 'high-contrast'
                  ? 'border-yellow-400 bg-white/25 text-white ring-2 ring-yellow-400'
                  : 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/40 text-white'
                : theme === 'high-contrast'
                  ? 'border-white/40 bg-black text-slate-300 hover:border-white'
                  : 'border-indigo-500/30 bg-white/5 hover:bg-white/8 text-slate-300 hover:border-indigo-500/50'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-bl-xl tracking-wider flex items-center gap-0.5 z-10">
              <TrendingUp className="w-2.5 h-2.5" />
              Best Value
            </div>

            <div>
              <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20 mb-3">
                <span className="text-xs font-extrabold tracking-wide uppercase text-indigo-300">Yearly Plan</span>
                {selectedPlan === 'yearly' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">GHS 149.99</span>
                  <span className="text-[10px] text-slate-400">/yr</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    Save {savingsPercent}%
                  </span>
                  <span className="text-[9px] text-indigo-300 font-bold">
                    (GHS {equivalentMonthlyYearly}/mo equiv.)
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-[10px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Save <b>GHS {savingsAmount} / year</b>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  30-Day Free Trial included
                </li>
                <li className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <span>🔥 Full Premium Access</span>
                </li>
              </ul>
            </div>
            <div className="pt-4 mt-4 border-t border-white/5 text-[9px] text-indigo-300 font-bold uppercase text-center tracking-wider">
              30 Days Free Then GHS 149.99
            </div>
          </div>
        </div>

        {/* Feature Comparison Chart / List */}
        <div className="space-y-4 mb-8 text-left relative z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
            Premium Feature Suite Comparison
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {premiumFeatures.map((feature, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all flex items-start gap-3"
              >
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-white block">{feature.title}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons & Policies */}
        <div className="space-y-4 text-center relative z-10 max-w-md mx-auto">
          {selectedPlan !== 'free' ? (
            <button
              onClick={handleStartTrial}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 transform active:scale-98 ${
                theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-black font-extrabold'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 hover:shadow-indigo-500/10'
              }`}
              id="paywall-trial-btn"
            >
              <Sparkles className="w-4 h-4 animate-bounce shrink-0" />
              Start 30-Day Free Trial
            </button>
          ) : (
            <button
              onClick={handleStartTrial}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 transform active:scale-98 ${
                theme === 'high-contrast'
                  ? 'bg-white text-black hover:bg-slate-200 border-2 border-black font-extrabold'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
              id="paywall-free-btn"
            >
              Confirm Selection of Free Plan
            </button>
          )}

          {selectedPlan !== 'free' && (
            <button
              onClick={() => {
                setSelectedPlan('free');
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer inline-block"
              id="paywall-continue-free-btn"
            >
              Continue with Free Plan (Limited Version)
            </button>
          )}

          <p className="text-[9px] text-slate-500 leading-relaxed max-w-sm mx-auto">
            Secure billing handled by <b>Google Play Commerce</b>. After the 30-day trial, your selected plan will be automatically billed. Cancel anytime from your Google Play Subscriptions account page at least 24h before trial ends.
          </p>
        </div>
      </div>

      {/* Simulated Google Play Billing Sheet Modal Overlay */}
      <AnimatePresence>
        {showPlaySheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
            {/* Click-outside to close */}
            <div className="absolute inset-0" onClick={() => setShowPlaySheet(false)}></div>

            {/* Google Play Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#13131a] rounded-t-3xl border-t border-slate-800 p-6 space-y-5 text-slate-200 z-10 shadow-2xl pb-8"
              id="google-play-billing-sheet"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {/* Google Play Colorful Square Logo Simulation */}
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center font-black text-white text-[10px]">
                    ▶
                  </div>
                  <span className="text-xs font-black tracking-wider uppercase text-slate-300 font-mono">
                    Google Play
                  </span>
                </div>
                <button 
                  onClick={() => setShowPlaySheet(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {purchaseStep === 'details' && (
                <>
                  {/* Subscription details */}
                  <div className="space-y-3 text-left">
                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">
                      Subscription Item
                    </span>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-extrabold text-white leading-tight">
                          VocalNotify Announcer Premium ({selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'})
                        </h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Offered by vocalnotify.companion
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white">GHS 0.00</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Trial Price</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-slate-300 space-y-2 leading-relaxed">
                      <div className="flex justify-between items-center text-slate-100">
                        <span className="font-bold flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          30 Days Free Trial
                        </span>
                        <span>Expires July 25, 2026</span>
                      </div>
                      <p className="text-slate-400">
                        Starting July 25, 2026, you will be automatically charged <b>{selectedPlan === 'yearly' ? 'GHS 149.99/year' : 'GHS 19.99/month'}</b> unless cancelled earlier.
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods Selection */}
                  <div className="space-y-2.5 text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Select Payment Method
                    </span>

                    {/* Method 1: Credit Card */}
                    <div 
                      onClick={() => setSelectedPaymentMethod('visa')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedPaymentMethod === 'visa' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold">Visa •••• 4242</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPaymentMethod === 'visa' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        {selectedPaymentMethod === 'visa' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>

                    {/* Method 2: Mobile Money */}
                    <div 
                      onClick={() => setSelectedPaymentMethod('momo')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedPaymentMethod === 'momo' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-yellow-500 flex items-center justify-center text-[8px] text-black font-black font-mono shrink-0">MTN</div>
                        <span className="text-xs font-bold">MTN Mobile Money (Ghana GHS)</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPaymentMethod === 'momo' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        {selectedPaymentMethod === 'momo' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>

                    {/* Method 3: Google Play Balance */}
                    <div 
                      onClick={() => setSelectedPaymentMethod('play_balance')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedPaymentMethod === 'play_balance' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0">G</div>
                        <span className="text-xs font-bold">Google Play Balance (GHS 250.00)</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPaymentMethod === 'play_balance' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        {selectedPaymentMethod === 'play_balance' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>

                  {/* Play Terms and Subscribe Button */}
                  <div className="pt-2 space-y-3">
                    <p className="text-[9px] text-slate-500 text-left leading-relaxed">
                      By tapping "Subscribe", you agree to the Google Play Terms of Service and authorize this recurring payment. Cancel anytime on Play Store subscriptions. No partial refunds.
                    </p>
                    <button
                      onClick={handleConfirmSubscribe}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wide shadow-lg cursor-pointer transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Subscribe & Start Trial
                    </button>
                  </div>
                </>
              )}

              {purchaseStep === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white">Processing Google Play Transaction</h4>
                    <p className="text-[10px] text-slate-400">
                      Communicating securely with Google Play Billing Services...
                    </p>
                  </div>
                </div>
              )}

              {purchaseStep === 'success' && (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg animate-bounce">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white">Subscription Confirmed!</h4>
                    <p className="text-[10px] text-emerald-400 font-semibold">
                      Your 30-day Free Trial is now active.
                    </p>
                    <p className="text-[9px] text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
                      Enjoy unlimited premium announcer announcements, natural AI human-like reading styles, summaries, and customized voices!
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
