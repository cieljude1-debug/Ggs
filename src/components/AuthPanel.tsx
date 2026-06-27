import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Lock, ShieldAlert, Sparkles, LogOut, Loader2,
  CheckCircle, ArrowRight, Server, Key, HelpCircle, Eye, EyeOff, Info, Crown
} from 'lucide-react';
import { 
  loginWithEmail, registerWithEmail, logoutUser, 
  getFirebaseMode, getIsFirebaseInitialized 
} from '../lib/firebase';
import { UserProfile, AuthState } from '../types';

interface AuthPanelProps {
  currentUser: UserProfile | null;
  onAuthStateChange: (user: UserProfile | null) => void;
  isPremium: boolean;
  onUpgradeClick?: () => void;
  theme?: 'frosted' | 'high-contrast';
}

export default function AuthPanel({
  currentUser,
  onAuthStateChange,
  isPremium,
  onUpgradeClick,
  theme = 'frosted',
}: AuthPanelProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isLiveFirebase = getFirebaseMode() === 'live';

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (tab === 'signup' && !displayName) {
      setError('Please provide a display name.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (tab === 'login') {
        const user = await loginWithEmail(email, password);
        onAuthStateChange(user);
        setSuccessMsg(`Welcome back, ${user.displayName}!`);
      } else {
        const user = await registerWithEmail(email, password, displayName);
        onAuthStateChange(user);
        setSuccessMsg(`Account successfully created for ${user.displayName}!`);
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onAuthStateChange(null);
      clearForm();
      setSuccessMsg('You have signed out successfully.');
    } catch (err: any) {
      setError(err?.message || 'Error signing out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6" id="firebase-auth-panel-container">
      {/* Firebase Status Banner */}
      <div className={`p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isLiveFirebase 
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' 
          : 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${
            isLiveFirebase ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">
              Auth Integration Engine: {isLiveFirebase ? 'Live Firebase' : 'Simulated Sandbox'}
            </span>
            <p className="text-[10px] text-slate-300 leading-normal mt-1">
              {isLiveFirebase 
                ? 'Your app is actively synchronized with your secure Firebase Cloud Authentication project.' 
                : 'Firebase is currently running in simulated browser-sandbox mode. To complete the automated setup, please accept the terms in the Firebase popup. To connect manually, check your .env.example or setup.md.'}
            </p>
          </div>
        </div>
        
        {!isLiveFirebase && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-bold uppercase tracking-wider shrink-0 select-none">
              Offline-Safe Fallback Active
            </span>
          </div>
        )}
      </div>

      {/* Main Panel layout */}
      <div className={`p-6 rounded-3xl ${
        theme === 'high-contrast' 
          ? 'bg-black border-4 border-white' 
          : 'bg-white/5 border border-white/10 backdrop-blur-md'
      } relative overflow-hidden shadow-2xl text-left`}>
        
        {/* Decorative elements */}
        {theme !== 'high-contrast' && (
          <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        )}

        {currentUser ? (
          /* Profile and Logged In Area */
          <div className="space-y-6 relative z-10" id="user-profile-active">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md relative">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  {isPremium && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] shadow-lg animate-bounce border-2 border-slate-900 text-slate-950 font-black">
                      ★
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white leading-tight">
                      {currentUser.displayName}
                    </h3>
                    {isPremium ? (
                      <span className="text-[9px] bg-yellow-400 text-black font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5 fill-black" /> Premium
                      </span>
                    ) : (
                      <span className="text-[9px] bg-white/10 text-slate-300 font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">
                        Free Account
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                id="profile-sign-out-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Sign Out
              </button>
            </div>

            {/* Premium feature overview connected to Auth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Synchronized Cloud Data Status
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-200">
                    Voice configurations and custom vocal settings bound to: <b>{currentUser.uid.startsWith('sim_') ? 'Simulated Local Instance' : 'Google Cloud Auth'}</b>.
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-normal pt-1">
                  User Account Registered: <b>{currentUser.createdAt}</b>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Play Store Subscriptions
                  </span>
                  <p className="text-xs text-slate-300 mt-1">
                    {isPremium 
                      ? 'You have complete unlimited developer access. Vocal announcements are fully active.' 
                      : 'You are currently on the basic free plan. Notification announce readings are limited to 5 sessions.'}
                  </p>
                </div>
                {!isPremium && onUpgradeClick && (
                  <button
                    onClick={onUpgradeClick}
                    className="w-full sm:w-auto self-start px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/10 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-yellow-300" />
                    Unlock Premium Announcer
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Authentication Form (Login / Register) */
          <div className="space-y-6 relative z-10" id="user-profile-inactive">
            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="text-xl font-black text-white tracking-tight">
                {tab === 'login' ? 'Welcome to VocalNotify' : 'Create VocalNotify Account'}
              </h2>
              <p className="text-xs text-slate-300 leading-normal">
                {tab === 'login' 
                  ? 'Access your voice profiles, custom accent configurations, and subscription privileges securely.' 
                  : 'Register to back up your custom AI voice configurations, upload background recordings, and start your free trial.'}
              </p>
            </div>

            {/* Form Toggle Tabs */}
            <div className="flex border-b border-white/10 max-w-sm">
              <button
                onClick={() => { setTab('login'); setError(null); }}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  tab === 'login' ? 'border-purple-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                id="auth-tab-login"
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab('signup'); setError(null); }}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  tab === 'signup' ? 'border-purple-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                id="auth-tab-register"
              >
                Sign Up
              </button>
            </div>

            {/* Error and Success notifications */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs flex items-start gap-2.5 max-w-lg"
                  id="auth-error-banner"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5 max-w-lg"
                  id="auth-success-banner"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth Form */}
            <form onSubmit={handleAuthAction} className="space-y-4 max-w-lg" id="vocal-auth-form">
              {tab === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Ama Serwaa"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
                      required={tab === 'signup'}
                      id="auth-input-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
                    required
                    id="auth-input-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
                    required
                    id="auth-input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {tab === 'signup' && (
                  <span className="text-[9px] text-slate-400 block mt-1">
                    Password must be at least 6 characters.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-500/5 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                id="auth-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    Authenticating Securely...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {tab === 'login' ? 'Sign In Securely' : 'Create & Register Account'}
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
