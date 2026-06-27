import React, { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Signal, Bell, Send, Trash2, 
  MessageSquare, Mail, Slack, Compass, Calendar, Cpu, 
  Lock, HardDrive, Volume2, ShieldCheck, Play, Radio, Crown, AlertCircle
} from 'lucide-react';
import { AppNotification, AppName, VoiceProfile, AppVoiceConfig, TTSConfig, PlayStoreSimConfig, BillingState } from '../types';
import { SUPPORTED_APPS, MOCK_SENDER_MESSAGES } from '../lib/constants';
import { generateSpeechText, READING_STYLES } from '../lib/readoutStyles';

interface PhoneSimulatorProps {
  notifications: AppNotification[];
  isPlayingNotification: AppNotification | null;
  onTriggerNotification: (appName: AppName, sender: string, body: string) => void;
  onClearHistory: () => void;
  voiceProfiles: VoiceProfile[];
  appConfigs: AppVoiceConfig[];
  ttsConfig: TTSConfig;
  playStoreSim: PlayStoreSimConfig;
  billing: BillingState;
  onUpgrade?: () => void;
  onStopPlayback?: () => void;
  onUpdateTTSConfig?: (config: TTSConfig) => void;
}

export default function PhoneSimulator({
  notifications,
  isPlayingNotification,
  onTriggerNotification,
  onClearHistory,
  voiceProfiles,
  appConfigs,
  ttsConfig,
  playStoreSim,
  billing,
  onUpgrade,
  onStopPlayback,
  onUpdateTTSConfig,
}: PhoneSimulatorProps) {
  const [phoneTime, setPhoneTime] = useState('12:00');
  const [selectedAppToMock, setSelectedAppToMock] = useState<AppName>('WhatsApp');
  const [customSender, setCustomSender] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isPhoneUnlocked, setIsPhoneUnlocked] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [isNearEar, setIsNearEar] = useState(false);
  const [sensorFeedback, setSensorFeedback] = useState<string | null>(null);

  // Trigger stop on active playback when gestures are simulated
  useEffect(() => {
    if (!ttsConfig.proximityMuteEnabled) return;
    if (isPlayingNotification && (isFaceDown || isNearEar)) {
      onStopPlayback?.();
      setSensorFeedback(
        isFaceDown 
          ? '🔇 Silenced via Face-Down gesture!' 
          : '🔇 Silenced via Near-Ear proximity!'
      );
      // Auto-clear feedback after 4 seconds
      const timer = setTimeout(() => setSensorFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [isPlayingNotification, isFaceDown, isNearEar, ttsConfig.proximityMuteEnabled, onStopPlayback]);

  // Update mock phone clock in real time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12; // 12-hour format
      setPhoneTime(`${hrs}:${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAppMeta = (appName: AppName) => {
    return SUPPORTED_APPS[appName] || SUPPORTED_APPS.System;
  };

  const getAppIcon = (appName: AppName, color: string, size = 16) => {
    const props = { className: 'shrink-0', style: { color }, size };
    const iconName = getAppMeta(appName).iconName;
    switch (iconName) {
      case 'MessageSquare': return <MessageSquare {...props} />;
      case 'Mail': return <Mail {...props} />;
      case 'Slack': return <Slack {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Calendar': return <Calendar {...props} />;
      default: return <Cpu {...props} />;
    }
  };

  const handleTriggerMock = () => {
    if (billing.plan === 'free' && notifications.length >= 5) {
      setShowUpgradeDialog(true);
      return;
    }
    const appMeta = getAppMeta(selectedAppToMock);
    const finalSender = customSender.trim() || appMeta.defaultSender;
    const finalBody = customBody.trim() || appMeta.defaultBody;

    onTriggerNotification(selectedAppToMock, finalSender, finalBody);
    setCustomSender('');
    setCustomBody('');
  };

  const handleQuickTrigger = (sender: string, body: string) => {
    if (billing.plan === 'free' && notifications.length >= 5) {
      setShowUpgradeDialog(true);
      return;
    }
    onTriggerNotification(selectedAppToMock, sender, body);
  };

  // Calculate local storage size estimate
  const getStorageEstimate = () => {
    let count = voiceProfiles.length;
    let sizeEstimateBytes = voiceProfiles.reduce((acc, curr) => acc + (curr.blob?.size || 15000), 0);
    let sizeKB = (sizeEstimateBytes / 1024).toFixed(1);
    return { count, sizeKB };
  };

  const storage = getStorageEstimate();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full" id="phone-simulator-wrapper">
      {/* Mock Notification Trigger Panel (xl:col-span-5) */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        
        {/* Trigger Controller Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col justify-between text-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
              <h3 className="font-semibold text-white text-sm">Notification Injector</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Inject simulated push notifications into the system to test how your custom voice and pitch shifts read them out in real time.
            </p>

            {/* Selector Grid of App logos */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {(Object.keys(SUPPORTED_APPS) as AppName[]).map((app) => {
                const meta = SUPPORTED_APPS[app];
                const isSelected = selectedAppToMock === app;
                return (
                  <button
                    key={app}
                    onClick={() => {
                      setSelectedAppToMock(app);
                      setCustomSender('');
                      setCustomBody('');
                    }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-purple-500/20 border border-purple-500/50 text-white scale-105' 
                        : 'border border-white/5 hover:border-white/15 hover:bg-white/5 text-slate-400'
                    }`}
                    title={meta.displayName}
                    id={`mock-trigger-${app}`}
                  >
                    {getAppIcon(app, isSelected ? meta.color : '#94a3b8', 18)}
                    <span className="text-[9px] mt-1 font-semibold truncate max-w-[48px]">{meta.displayName}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sender Name (Optional)
                </label>
                <input
                  type="text"
                  className="w-full text-xs bg-slate-900/60 border border-white/10 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition"
                  placeholder={`e.g. ${getAppMeta(selectedAppToMock).defaultSender}`}
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Message Body (Optional)
                </label>
                <textarea
                  className="w-full text-xs bg-slate-900/60 border border-white/10 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition resize-none h-14"
                  placeholder={`e.g. ${getAppMeta(selectedAppToMock).defaultBody}`}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Template Selection list */}
            <div className="mb-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Preset Templates
              </span>
              <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                {MOCK_SENDER_MESSAGES[selectedAppToMock].map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickTrigger(msg.sender, msg.body)}
                    className="w-full text-left p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 truncate transition hover:border-white/15"
                  >
                    <strong className="text-white">{msg.sender}:</strong> "{msg.body}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleTriggerMock}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-tr from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-purple-500/20"
            id="trigger-mock-btn"
          >
            <Send className="w-3.5 h-3.5" />
            Inject Alert Event
          </button>
        </div>

        {/* Security & Sandbox Credentials info card */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
            <ShieldCheck className="w-4.5 h-4.5 text-purple-400" />
            Vocal Sandbox Integrity Lock
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-purple-400" /> Cryptographic Privacy:</span>
              <span className="font-semibold text-white">100% On-Device</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-purple-400" /> Stored Audio Snippets:</span>
              <span className="font-semibold text-white">{storage.count} clips ({storage.sizeKB} KB)</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 leading-tight">
              All recordings, imports, and TTS rendering are secured strictly inside your browser sandbox database. No telemetry, logs, or audio recordings ever leak to any remote servers.
            </p>
          </div>
        </div>

        {/* Proximity & Gesture Simulator Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col gap-4 text-slate-100 animate-fadeIn" id="proximity-gesture-simulator">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-white tracking-wide uppercase">Hardware Gesture Simulator</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Simulate physical device triggers to test natural on-the-go muting gestures.
              </p>
            </div>
          </div>

          {/* Toggle Switch for Enable/Disable proximity muting */}
          <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs">
            <span className="font-semibold text-slate-200">Enable Gesture Muting</span>
            <button
              type="button"
              onClick={() => {
                if (onUpdateTTSConfig) {
                  onUpdateTTSConfig({
                    ...ttsConfig,
                    proximityMuteEnabled: !ttsConfig.proximityMuteEnabled,
                  });
                }
              }}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                ttsConfig.proximityMuteEnabled ? 'bg-purple-600' : 'bg-slate-700'
              }`}
              id="gesture-muting-toggle"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  ttsConfig.proximityMuteEnabled ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Face down button */}
            <button
              type="button"
              onClick={() => {
                setIsFaceDown(!isFaceDown);
                if (!isFaceDown) setIsNearEar(false);
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                isFaceDown
                  ? 'bg-purple-600/10 border-purple-500/50 text-white font-extrabold'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5'
              }`}
              id="simulate-face-down-btn"
            >
              <span className="text-lg">📱🔄</span>
              <span className="text-[10px] font-bold block">Flip Face Down</span>
              <span className="text-[8px] text-slate-400 leading-tight">
                {isFaceDown ? 'Simulated: Down' : 'Simulated: Up'}
              </span>
            </button>

            {/* Near ear button */}
            <button
              type="button"
              onClick={() => {
                setIsNearEar(!isNearEar);
                if (!isNearEar) setIsFaceDown(false);
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                isNearEar
                  ? 'bg-purple-600/10 border-purple-500/50 text-white font-extrabold'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5'
              }`}
              id="simulate-near-ear-btn"
            >
              <span className="text-lg">👂📱</span>
              <span className="text-[10px] font-bold block">Hold to Ear</span>
              <span className="text-[8px] text-slate-400 leading-tight">
                {isNearEar ? 'Simulated: Near' : 'Simulated: Far'}
              </span>
            </button>
          </div>

          {/* Sensor Status / Feedback message */}
          {sensorFeedback && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-extrabold text-center animate-pulse">
              {sensorFeedback}
            </div>
          )}

          <div className="text-[9px] text-slate-500 leading-relaxed text-center px-1">
            💡 <strong>Real Device Sensor:</strong> Open the app on your phone and place it face-down on a desk to mute any announcements naturally.
          </div>
        </div>

      </div>

      <div className="xl:col-span-7 flex justify-center items-center py-2">
        <div 
          className="relative w-[310px] h-[610px] bg-slate-950 rounded-[48px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col select-none overflow-hidden" 
          id="android-device-container"
          style={{
            transform: isFaceDown 
              ? 'perspective(1000px) rotateY(180deg) scale(0.95)' 
              : 'perspective(1000px) rotateY(0deg) scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isFaceDown && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[44px] z-50 flex flex-col items-center justify-between p-8 text-center" style={{ transform: 'rotateY(180deg)' }}>
              {/* Back Camera Module */}
              <div className="w-16 h-28 bg-slate-900/80 border border-white/10 rounded-3xl p-3 flex flex-col gap-2 shadow-inner mt-8">
                <div className="w-9 h-9 bg-black rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-950 rounded-full border border-blue-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  </div>
                </div>
                <div className="w-9 h-9 bg-black rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-4 h-4 bg-slate-950 rounded-full border border-slate-900 flex items-center justify-center">
                    <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                  </div>
                </div>
                <div className="w-6 h-3 bg-yellow-500 rounded-full mx-auto" title="LED Flash" />
              </div>

              {/* Logo / Badge */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Vocal Notify v2.0</span>
              </div>

              {/* Status Indicator */}
              <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1" />
                Phone is Face Down
              </div>
            </div>
          )}
          
          {/* Speaker ear slit */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full z-40 flex items-center justify-center">
            <span className="w-6 h-0.5 bg-slate-900 rounded-full" />
          </div>

          {/* Camera Punchhole Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-slate-950 rounded-full z-40 border border-slate-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-blue-950 rounded-full animate-pulse" />
          </div>

          {/* Android Inner Screen Content */}
          <div className="flex-1 w-full bg-slate-900 rounded-[36px] overflow-hidden flex flex-col relative" id="android-inner-screen">
            {isNearEar && !isFaceDown && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 mb-3 animate-pulse">
                  <Radio className="w-10 h-10 text-purple-400 animate-ping" />
                </div>
                <h4 className="text-white font-extrabold text-sm tracking-tight">Proximity Sensor Blocked</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-[200px]">
                  Phone is simulated as held near your ear or face. Speech readout is silenced.
                </p>
                <button 
                  type="button"
                  onClick={() => setIsNearEar(false)}
                  className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-[11px] font-bold cursor-pointer transition border border-white/5"
                >
                  Simulate Remove from Ear
                </button>
              </div>
            )}
            
            {/* Status Bar */}
            <div className="h-8 px-5 flex items-center justify-between text-[11px] font-bold text-gray-300 bg-slate-900 z-40 relative">
              <span className="font-mono text-xs">{phoneTime}</span>
              <div className="flex items-center gap-1.5">
                {isPlayingNotification && (
                  <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse mr-1" />
                )}
                <Wifi className="w-3.5 h-3.5" />
                <Signal className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Dynamic Real-time Audio Spectrum overlay on Lockscreen */}
            {isPlayingNotification && (
              <div className="absolute inset-x-0 bottom-12 h-20 bg-gradient-to-t from-purple-950/40 to-transparent flex items-end justify-center gap-1 px-4 py-2 z-20">
                {Array(24).fill(0).map((_, idx) => {
                  const animDur = 0.5 + Math.random() * 0.8;
                  const delay = idx * 0.05;
                  return (
                    <div
                      key={idx}
                      className="w-1 bg-purple-400 rounded-full transition-all"
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        animation: `pulseHeight ${animDur}s ease-in-out ${delay}s infinite alternate`
                      }}
                    />
                  );
                })}
                <style>{`
                  @keyframes pulseHeight {
                    0% { height: 10%; }
                    100% { height: 95%; }
                  }
                `}</style>
              </div>
            )}

            {/* Main Screen Space */}
            <div className="flex-1 flex flex-col p-4 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
              
              {/* SLIDING NOTIFICATION BANNER (Triggered when announcement is active) */}
              {isPlayingNotification ? (
                <div className="absolute top-2 inset-x-3 bg-white/10 backdrop-blur-xl rounded-2xl p-3.5 shadow-xl border border-white/15 z-50 animate-slideDown flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${getAppMeta(isPlayingNotification.appName).color}25` }}>
                    {getAppIcon(isPlayingNotification.appName, getAppMeta(isPlayingNotification.appName).color, 18)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-slate-100">
                      <span className="text-[11px] font-extrabold text-white tracking-tight">
                        {isPlayingNotification.title}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">Just now</span>
                    </div>
                    <p className="text-[11px] text-slate-200 truncate mt-0.5 leading-normal">
                      {isPlayingNotification.body}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] text-purple-400 font-extrabold uppercase tracking-wider animate-pulse">
                      <Volume2 className="w-3 h-3" /> Voice Readout playing...
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Home / Lock Screen Interface */}
              <div className="flex-1 flex flex-col justify-between py-6">
                
                {/* Upper Clock & Lock Info */}
                <div className="text-center">
                  <span className="text-xs text-purple-300/80 font-bold tracking-widest uppercase flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3 text-purple-400" /> SECURE CONSOLE
                  </span>
                  <h1 className="text-4xl font-extrabold text-white mt-1.5 tracking-tight font-mono">
                    {phoneTime.split(' ')[0]}
                  </h1>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
                    Wednesday, June 24
                  </p>
                </div>

                {/* Simulated Android Status banners */}
                <div className="mt-4 px-1 space-y-2">
                  {!playStoreSim.notificationAccess && (
                    <div className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl flex items-start gap-2 text-slate-100" id="lockscreen-perm-alert">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9.5px] font-bold text-red-300 block">Listener Service Denied</span>
                        <span className="text-[8.5px] text-slate-300 block mt-0.5 leading-normal text-left">
                          Vocal reader is offline. Grant access in Play Store Compliance tab.
                        </span>
                      </div>
                    </div>
                  )}

                  {playStoreSim.foregroundServiceNotification && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-start gap-2 text-slate-100" id="lockscreen-foreground-notify">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-[9.5px] font-bold text-emerald-300 block">VocalNotify Announcer Active</span>
                        <span className="text-[8.5px] text-slate-300 block mt-0.5 leading-normal">
                          Foreground service running • Listening to alert streams
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inner Notifications Shade / Logs Board (Center) */}
                <div className="flex-1 bg-slate-950/50 backdrop-blur-xs rounded-2xl border border-slate-800/80 mt-6 mb-4 p-3 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-indigo-400" />
                      Readout Logs ({notifications.length})
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={onClearHistory}
                        className="text-gray-500 hover:text-red-400 transition"
                        title="Clear history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <Bell className="w-8 h-8 text-slate-800 mb-2" />
                      <span className="text-[11px] font-semibold text-slate-500">No recent announcements</span>
                      <p className="text-[9px] text-slate-600 max-w-[160px] mt-0.5 leading-normal">
                        Inject a mock alert above to trigger the low-latency local voice synthesizer.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[200px] pr-0.5">
                      {notifications.map((notif) => {
                        const appMeta = getAppMeta(notif.appName);
                        const config = appConfigs.find((c) => c.appName === notif.appName) || {
                          readContent: 'all' as const,
                          readingStyle: 'natural' as const,
                        };
                        const spokenText = generateSpeechText(notif, config.readContent, config.readingStyle || 'natural');
                        const styleMeta = READING_STYLES.find(s => s.id === (config.readingStyle || 'natural'));

                        return (
                          <div
                            key={notif.id}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/60 flex flex-col gap-1.5 transition"
                          >
                            <div className="flex items-start gap-2.5 w-full">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${appMeta.color}15` }}>
                                {getAppIcon(notif.appName, appMeta.color, 14)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-200 block truncate leading-tight">
                                    {notif.title}
                                  </span>
                                  <span className="text-[8px] text-slate-500 shrink-0 font-mono">
                                    {notif.timestamp}
                                  </span>
                                </div>
                                <p className="text-[9px] text-gray-400 truncate mt-0.5 leading-normal">
                                  {notif.body}
                                </p>
                              </div>
                            </div>
                            
                            {/* Spoken Readout Transcript */}
                            {notif.mutedByKeyword ? (
                              <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 w-full min-w-0">
                                <span className="text-[7.5px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 font-black shrink-0 tracking-wider uppercase">
                                  🔕 MUTED
                                </span>
                                <span className="text-[8.5px] text-amber-200/90 truncate flex-1 font-medium">
                                  Blocked by keyword filter: <b className="font-mono text-purple-300">"{notif.mutedByKeyword}"</b>
                                </span>
                              </div>
                            ) : (
                              <div className="pt-1.5 border-t border-white/5 flex items-center gap-1 w-full min-w-0">
                                <span 
                                  className="text-[7.5px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold shrink-0 tracking-wider uppercase"
                                  title={`Style: ${styleMeta?.name}`}
                                >
                                  {styleMeta?.emoji || '🎙️'} {styleMeta?.name?.split(' ')[0]}
                                </span>
                                <span className="text-[8.5px] text-indigo-200/90 truncate italic flex-1" title={spokenText}>
                                  "{spokenText}"
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dynamic Ad or Premium Banner */}
                  {billing.plan === 'free' ? (
                    <div 
                      onClick={() => onUpgrade && onUpgrade()}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/15 to-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2 cursor-pointer hover:from-purple-500/15 hover:to-indigo-500/20 transition-all text-left mt-2 shadow-xs"
                      id="sponsored-play-ad"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[7px] font-black uppercase text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded tracking-widest inline-block mb-1">
                          Play Store Offer
                        </span>
                        <p className="text-[9.5px] font-extrabold text-white leading-tight">
                          Upgrade to Premium
                        </p>
                        <p className="text-[8px] text-slate-300 leading-normal mt-0.5">
                          Get unlimited voice alerts, smart summaries & zero ads. 30 Days Free Trial!
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpgrade && onUpgrade();
                        }}
                        className="px-2 py-1 rounded bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[8px] uppercase tracking-wider shrink-0 transition"
                      >
                        Upgrade
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-left mt-2">
                      <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-extrabold text-indigo-300 block">
                          Premium Active • Ad-Free
                        </span>
                        <span className="text-[8px] text-slate-400 block leading-tight mt-0.5">
                          Unlimited voice notifications, natural voices, priority AI pipelines.
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex justify-center gap-12 text-slate-500">
                  <div className="w-3 h-3 border-2 border-slate-600 rounded-xs rotate-45" />
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 rounded-full" />
                  <div className="w-3 h-3 border-y-2 border-r-2 border-slate-600 rounded-l-xs" />
                </div>
              </div>

            </div>

            {/* Android Navigation Pill Pill Bar at the very bottom */}
            <div className="h-5 flex items-center justify-center pb-2 bg-slate-950/20">
              <span className="w-20 h-1 bg-gray-500/50 rounded-full" />
            </div>

          </div>
        </div>
      </div>

      {/* Simulated Android Material 3 Dialog for Upgrade */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-[#1c1b22] border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-left text-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-yellow-400/10 text-yellow-400">
                <Crown className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white tracking-tight">
                  Premium Feature Required
                </h4>
                <span className="text-[10px] text-slate-400">Google Play Subscriptions</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              You have reached the <b>Basic Free Plan cap of 5 notifications</b>.
              <br /><br />
              Upgrade to <b>VocalNotify Announcer Premium</b> to unlock:
            </p>

            <ul className="space-y-2 mb-6 text-[11px] text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✔</span> Unlimited voice notifications (no caps)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✔</span> Emotional, human-like voice synthesis
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✔</span> Smart conversation summaries & zero ads
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowUpgradeDialog(false);
                  if (onUpgrade) onUpgrade();
                }}
                className="w-full py-3 bg-gradient-to-tr from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-500/10 cursor-pointer text-center"
                id="dialog-upgrade-btn"
              >
                Upgrade & Start 30-Day Free Trial
              </button>
              <button
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer text-center"
                id="dialog-close-btn"
              >
                Continue with Free Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
