import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Mic, UploadCloud, Bell, RefreshCw, 
  Settings, Sparkles, Sliders, Play, Trash2, HelpCircle, 
  Info, ShieldCheck, Lock, HardDrive, Phone, Radio, Volume1, ArrowRight, User,
  Contrast, LayoutGrid, Moon, BellOff, Crown
} from 'lucide-react';
import { AppNotification, AppVoiceConfig, VoiceProfile, TTSConfig, AppName, DNDConfig, PlayStoreSimConfig, BillingState, UserProfile, MutedKeyword } from './types';
import { getAllVoiceProfiles, deleteVoiceProfile } from './lib/indexedDb';
import { playAudioWithSettings } from './lib/pitchShifter';
import { SUPPORTED_APPS } from './lib/constants';
import { generateSpeechText, ReadingStyle } from './lib/readoutStyles';
import { subscribeToAuthChanges } from './lib/firebase';
import { ACCENT_PRESETS, findMatchingVoice } from './lib/accentPresets';
import { playSynthesizedChime } from './lib/chimeSynthesizer';
import VoiceRecorder from './components/VoiceRecorder';
import AudioImport from './components/AudioImport';
import ConfigPanel from './components/ConfigPanel';
import PhoneSimulator from './components/PhoneSimulator';
import PaywallPanel from './components/PaywallPanel';
import AuthPanel from './components/AuthPanel';
import ChimeSettingsPanel from './components/ChimeSettingsPanel';

// Initial App Voice Configurations
const DEFAULT_APP_CONFIGS: AppVoiceConfig[] = [
  { appName: 'WhatsApp', voiceProfileId: 'tts', pitchShift: 0, speed: 1.0, volume: 0.8, enabled: true, readContent: 'all', readingStyle: 'natural' },
  { appName: 'Gmail', voiceProfileId: 'tts', pitchShift: -3, speed: 1.1, volume: 0.8, enabled: true, readContent: 'all', readingStyle: 'natural' },
  { appName: 'Slack', voiceProfileId: 'tts', pitchShift: 3, speed: 1.2, volume: 0.9, enabled: true, readContent: 'all', readingStyle: 'natural' },
  { appName: 'Discord', voiceProfileId: 'tts', pitchShift: 5, speed: 1.0, volume: 0.8, enabled: true, readContent: 'all', readingStyle: 'natural' },
  { appName: 'Calendar', voiceProfileId: 'tts', pitchShift: -1, speed: 0.9, volume: 0.8, enabled: true, readContent: 'all', readingStyle: 'natural' },
  { appName: 'System', voiceProfileId: 'tts', pitchShift: -5, speed: 1.1, volume: 0.7, enabled: true, readContent: 'summary_only', readingStyle: 'natural' },
];

const DEFAULT_TTS_CONFIG: TTSConfig = {
  voiceURI: '',
  pitch: 1.0,
  rate: 1.0,
  volume: 0.8,
  accentId: 'default',
  agcEnabled: true,
  chimeId: 'none',
  chimeVolumeBalance: 50,
  proximityMuteEnabled: true,
};

const DEFAULT_DND_CONFIG: DNDConfig = {
  enabled: false,
  startTime: '22:00',
  endTime: '07:00',
};

const DEFAULT_PLAY_STORE_SIM: PlayStoreSimConfig = {
  notificationAccess: true,
  batteryOptimizationsBypassed: false,
  foregroundServiceNotification: true,
};

const DEFAULT_BILLING_STATE: BillingState = {
  plan: 'free',
  isTrial: false,
  trialDaysLeft: 0,
  expiryDate: null,
  paymentMethod: null,
  status: 'none'
};

export default function App() {
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [appConfigs, setAppConfigs] = useState<AppVoiceConfig[]>([]);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>(DEFAULT_TTS_CONFIG);
  const [dndConfig, setDndConfig] = useState<DNDConfig>(DEFAULT_DND_CONFIG);
  const [playStoreSim, setPlayStoreSim] = useState<PlayStoreSimConfig>(DEFAULT_PLAY_STORE_SIM);
  const [billing, setBilling] = useState<BillingState>(DEFAULT_BILLING_STATE);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPlayingNotification, setIsPlayingNotification] = useState<AppNotification | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'routing' | 'studio' | 'simulator' | 'billing' | 'auth'>('all');
  const [mutedKeywords, setMutedKeywords] = useState<MutedKeyword[]>(() => {
    const saved = localStorage.getItem('vocal_notify_muted_keywords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse muted keywords', e);
      }
    }
    return [
      { id: 'kw_1', pattern: 'marketing', enabled: true, matchCount: 0 },
      { id: 'kw_2', pattern: 'promotion', enabled: true, matchCount: 0 },
      { id: 'kw_3', pattern: 'advertisement', enabled: true, matchCount: 0 },
      { id: 'kw_4', pattern: 'offer', enabled: false, matchCount: 0 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('vocal_notify_muted_keywords', JSON.stringify(mutedKeywords));
  }, [mutedKeywords]);
  
  // Audio Playback & Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activePlaybackRef = useRef<{ stop: () => void } | null>(null);
  const [isAudioEngineActivated, setIsAudioEngineActivated] = useState(false);
  const [theme, setTheme] = useState<'frosted' | 'high-contrast'>(() => {
    return (localStorage.getItem('vocal_notify_theme') as 'frosted' | 'high-contrast') || 'frosted';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'frosted' ? 'high-contrast' : 'frosted';
    setTheme(nextTheme);
    localStorage.setItem('vocal_notify_theme', nextTheme);
  };

  // Initialize and load saved local state
  useEffect(() => {
    // Load Voice Profiles from IndexedDB
    const loadVoiceProfiles = async () => {
      try {
        const profiles = await getAllVoiceProfiles();
        setVoiceProfiles(profiles);
      } catch (err) {
        console.error('IndexedDB load failed. Local empty profiles set.', err);
      }
    };
    loadVoiceProfiles();

    // Load App Configurations from LocalStorage
    const storedAppConfigs = localStorage.getItem('vocal_notify_app_configs');
    if (storedAppConfigs) {
      try {
        setAppConfigs(JSON.parse(storedAppConfigs));
      } catch (e) {
        setAppConfigs(DEFAULT_APP_CONFIGS);
      }
    } else {
      setAppConfigs(DEFAULT_APP_CONFIGS);
    }

    // Load TTS General Settings from LocalStorage
    const storedTTSConfig = localStorage.getItem('vocal_notify_tts_config');
    if (storedTTSConfig) {
      try {
        setTtsConfig(JSON.parse(storedTTSConfig));
      } catch (e) {
        setTtsConfig(DEFAULT_TTS_CONFIG);
      }
    } else {
      setTtsConfig(DEFAULT_TTS_CONFIG);
    }

    // Load DND Settings from LocalStorage
    const storedDNDConfig = localStorage.getItem('vocal_notify_dnd_config');
    if (storedDNDConfig) {
      try {
        setDndConfig(JSON.parse(storedDNDConfig));
      } catch (e) {
        setDndConfig(DEFAULT_DND_CONFIG);
      }
    } else {
      setDndConfig(DEFAULT_DND_CONFIG);
    }

    // Load Play Store Simulation config from LocalStorage
    const storedPlaySim = localStorage.getItem('vocal_notify_play_store_sim');
    if (storedPlaySim) {
      try {
        setPlayStoreSim(JSON.parse(storedPlaySim));
      } catch (e) {
        setPlayStoreSim(DEFAULT_PLAY_STORE_SIM);
      }
    } else {
      setPlayStoreSim(DEFAULT_PLAY_STORE_SIM);
    }

    // Load Billing config from LocalStorage
    const storedBilling = localStorage.getItem('vocal_notify_billing_state');
    if (storedBilling) {
      try {
        setBilling(JSON.parse(storedBilling));
      } catch (e) {
        setBilling(DEFAULT_BILLING_STATE);
      }
    } else {
      setBilling(DEFAULT_BILLING_STATE);
    }
  }, []);

  // Subscribe to Firebase Auth Changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync state modifications back to LocalStorage
  const handleUpdateBilling = (updatedConfig: BillingState) => {
    setBilling(updatedConfig);
    localStorage.setItem('vocal_notify_billing_state', JSON.stringify(updatedConfig));
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, isPremium: updatedConfig.plan !== 'free' } : null);
    }
  };

  const handleUpdateAppConfig = (updatedConfig: AppVoiceConfig) => {
    const updated = appConfigs.map((c) => (c.appName === updatedConfig.appName ? updatedConfig : c));
    setAppConfigs(updated);
    localStorage.setItem('vocal_notify_app_configs', JSON.stringify(updated));
  };

  const handleUpdateTTSConfig = (updatedConfig: TTSConfig) => {
    setTtsConfig(updatedConfig);
    localStorage.setItem('vocal_notify_tts_config', JSON.stringify(updatedConfig));
  };

  const handleUpdateDNDConfig = (updatedConfig: DNDConfig) => {
    setDndConfig(updatedConfig);
    localStorage.setItem('vocal_notify_dnd_config', JSON.stringify(updatedConfig));
  };

  const handleUpdatePlayStoreSim = (updatedConfig: PlayStoreSimConfig) => {
    setPlayStoreSim(updatedConfig);
    localStorage.setItem('vocal_notify_play_store_sim', JSON.stringify(updatedConfig));
  };

  const isCurrentlyInDND = () => {
    if (!dndConfig.enabled) return false;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentVal = currentHours * 60 + currentMinutes;

    const [startH, startM] = dndConfig.startTime.split(':').map(Number);
    const startVal = startH * 60 + startM;

    const [endH, endM] = dndConfig.endTime.split(':').map(Number);
    const endVal = endH * 60 + endM;

    if (startVal <= endVal) {
      return currentVal >= startVal && currentVal < endVal;
    } else {
      return currentVal >= startVal || currentVal < endVal;
    }
  };

  const handleProfileSaved = (newProfile: VoiceProfile) => {
    setVoiceProfiles((prev) => [newProfile, ...prev]);
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteVoiceProfile(id);
      // Clean up references in app configurations if deleted
      const updatedConfigs = appConfigs.map((config) => {
        if (config.voiceProfileId === id) {
          return { ...config, voiceProfileId: 'tts' };
        }
        return config;
      });
      setAppConfigs(updatedConfigs);
      localStorage.setItem('vocal_notify_app_configs', JSON.stringify(updatedConfigs));

      // Update state
      setVoiceProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
  };

  // Safe AudioContext Activator
  const activateAudioEngine = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsAudioEngineActivated(true);
  };

  // core voice alert readout script trigger
  const triggerNotificationReadout = (notification: AppNotification) => {
    // Check if Simulated Notification Listener permission is granted
    if (!playStoreSim.notificationAccess) {
      console.warn('Notification readout blocked: Android Notification Listener Access permission is currently simulated as DENIED.');
      return;
    }

    // Check if Do Not Disturb schedule is active
    if (isCurrentlyInDND()) {
      console.log('Notification readout blocked by active Do Not Disturb schedule.');
      return;
    }

    // Check if notification is muted by a keyword filter
    if (notification.mutedByKeyword) {
      console.log(`Notification readout muted by keyword: "${notification.mutedByKeyword}"`);
      // Increment match count
      setMutedKeywords(prev => prev.map(kw => {
        if (kw.pattern.toLowerCase().trim() === notification.mutedByKeyword?.toLowerCase().trim()) {
          return { ...kw, matchCount: kw.matchCount + 1 };
        }
        return kw;
      }));
      return;
    }

    // 1. Cancel any active native speech Synthesis to minimize latency
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 2. Stop any ongoing custom audio playback node
    if (activePlaybackRef.current) {
      activePlaybackRef.current.stop();
      activePlaybackRef.current = null;
    }

    // Find custom app rules
    const config = appConfigs.find((c) => c.appName === notification.appName) || {
      appName: notification.appName,
      voiceProfileId: 'tts',
      pitchShift: 0,
      speed: 1.0,
      volume: 0.8,
      enabled: true,
      readContent: 'all',
      readingStyle: 'natural',
    };

    if (!config.enabled) {
      return; // Do not read out muted apps
    }

    setIsPlayingNotification(notification);

    // Initialize/resume Audio Context if active
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Stage 1: Check if using a custom recorded or imported audio announcer chime
    const isCustomVoice = config.voiceProfileId !== 'tts';
    const activeProfile = isCustomVoice ? voiceProfiles.find((p) => p.id === config.voiceProfileId) : null;

    // Calculate chime and TTS volume multipliers based on the configured volume balance
    const balance = ttsConfig.chimeVolumeBalance ?? 50;
    let chimeMultiplier = 1.0;
    let ttsMultiplier = 1.0;
    if (balance < 50) {
      // < 50 favors Chime (Chime stays at 1.0, TTS gets quieter)
      ttsMultiplier = balance / 50;
    } else if (balance > 50) {
      // > 50 favors TTS (TTS stays at 1.0, Chime gets quieter)
      chimeMultiplier = (100 - balance) / 50;
    }

    const playTTSOnly = (volumeMult: number) => {
      // Create text narration body based on style and level
      const speechText = generateSpeechText(notification, config.readContent, config.readingStyle || 'natural');

      const utterance = new SpeechSynthesisUtterance(speechText);
      
      // Load selected native voice URI or accent preset voice
      let matchedVoice: SpeechSynthesisVoice | null = null;
      if (ttsConfig.accentId && ttsConfig.accentId !== 'default') {
        const voices = window.speechSynthesis.getVoices();
        matchedVoice = findMatchingVoice(voices, ttsConfig.accentId);
      }
      
      if (!matchedVoice && ttsConfig.voiceURI) {
        matchedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === ttsConfig.voiceURI) || null;
      }
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // Customize speech factors independently based on accent profile and user configs
      const preset = ACCENT_PRESETS.find(p => p.id === (ttsConfig.accentId || 'default'));
      const basePitch = preset ? preset.defaultPitch : ttsConfig.pitch;
      const baseRate = preset ? preset.defaultRate : ttsConfig.rate;

      // Adjust pitch by offsetting slightly if pitchShift is set
      const pitchOffset = config.pitchShift / 12; // convert semitones to factor
      utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch + pitchOffset));
      utterance.rate = Math.max(0.5, Math.min(2.5, config.speed * baseRate)); // Speed is multiplied by base rate of the accent
      utterance.volume = config.volume * volumeMult;

      utterance.onend = () => {
        setIsPlayingNotification(null);
      };

      utterance.onerror = () => {
        setIsPlayingNotification(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    const playSpeechPhase = () => {
      if (activeProfile && activeProfile.blob) {
        // Read the Blob data, decode, and play using our real-time pitch-shifter node!
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            // Decode Audio Data locally
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            const playback = playAudioWithSettings(
              audioCtx,
              audioBuffer,
              config.speed,
              config.pitchShift,
              config.volume * ttsMultiplier,
              ttsConfig.agcEnabled ?? true,
              () => {
                // Custom intro completed. Now trigger TTS content body read-out
                activePlaybackRef.current = null;
                playTTSOnly(ttsMultiplier);
              }
            );
            
            activePlaybackRef.current = playback;
          } catch (e) {
            console.error('Error decoding custom alert audio. Falling back to immediate TTS.', e);
            playTTSOnly(ttsMultiplier);
          }
        };
        reader.readAsArrayBuffer(activeProfile.blob);
      } else {
        playTTSOnly(ttsMultiplier);
      }
    };

    const hasChime = ttsConfig.chimeId && ttsConfig.chimeId !== 'none';
    if (hasChime) {
      const chimeVolume = config.volume * chimeMultiplier;
      const chimePlayback = playSynthesizedChime(audioCtx, ttsConfig.chimeId!, chimeVolume, () => {
        activePlaybackRef.current = null;
        playSpeechPhase();
      });
      activePlaybackRef.current = chimePlayback;
    } else {
      playSpeechPhase();
    }
  };

  const handleStopPlayback = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (activePlaybackRef.current) {
      activePlaybackRef.current.stop();
      activePlaybackRef.current = null;
    }
    setIsPlayingNotification(null);
  };

  // Real sensor orientation/proximity listeners
  useEffect(() => {
    if (!ttsConfig.proximityMuteEnabled) return;

    // 1. Device orientation (Face down detection)
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isPlayingNotification) return;
      const { beta } = event;
      if (beta !== null && (beta > 170 || beta < -170)) {
        console.log('Real hardware sensor: Face-down detected! Muting readout.');
        handleStopPlayback();
      }
    };

    // 2. Proximity Sensor API (W3C standard)
    let sensor: any = null;
    if (typeof window !== 'undefined' && 'ProximitySensor' in window) {
      try {
        sensor = new (window as any).ProximitySensor();
        sensor.addEventListener('reading', () => {
          if (sensor.near && isPlayingNotification) {
            console.log('Real hardware sensor: Near-ear proximity detected! Muting readout.');
            handleStopPlayback();
          }
        });
        sensor.start();
      } catch (e) {
        console.warn('ProximitySensor API not fully supported or blocked by permissions:', e);
      }
    }

    // 3. User Proximity Event (Legacy/experimental)
    const handleUserProximity = (event: any) => {
      if (isPlayingNotification && event.near) {
        console.log('Real hardware sensor: Legacy user proximity near detected! Muting readout.');
        handleStopPlayback();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('userproximity' as any, handleUserProximity);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('userproximity' as any, handleUserProximity);
      if (sensor) {
        try {
          sensor.stop();
        } catch (e) {}
      }
    };
  }, [isPlayingNotification, ttsConfig.proximityMuteEnabled]);

  const handleTriggerIncomingNotification = (appName: AppName, sender: string, body: string) => {
    // Auto-activate audio engine if first interaction
    activateAudioEngine();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const bodyText = (body || '').toLowerCase();
    const titleText = (sender || '').toLowerCase();
    const matchedKeyword = mutedKeywords.find(kw => {
      if (!kw.enabled || !kw.pattern.trim()) return false;
      const term = kw.pattern.toLowerCase().trim();
      return bodyText.includes(term) || titleText.includes(term);
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      appName,
      title: sender,
      body,
      timestamp,
      read: false,
      mutedByKeyword: matchedKeyword ? matchedKeyword.pattern : undefined,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    
    // Trigger the real-time audio announcement
    triggerNotificationReadout(newNotif);
  };

  const handlePreviewVoice = (appName: AppName) => {
    // Auto-activate audio engine
    activateAudioEngine();

    const appMeta = SUPPORTED_APPS[appName];
    const previewNotif: AppNotification = {
      id: `preview_${Date.now()}`,
      appName,
      title: appMeta.defaultSender,
      body: appMeta.defaultBody,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    triggerNotificationReadout(previewNotif);
  };

  return (
    <div className={`min-h-screen ${theme === 'high-contrast' ? 'bg-black text-white theme-high-contrast' : 'bg-[#0a0a0f] text-slate-100'} flex flex-col font-sans relative overflow-x-hidden`} id="app-root-container">
      {/* Background Mesh Gradients */}
      {theme !== 'high-contrast' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
        </div>
      )}

      {/* Dynamic Navigation Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5 py-4 px-6 sticky top-0 z-50 shadow-lg" id="navigation-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                VocalNotify
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2 py-0.5 rounded-full">
                  Companion
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Local-First Voice Announcer & Pitch-Shifter Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {/* DND status badge */}
            {dndConfig.enabled && (
              <div 
                className={`text-xs font-bold px-2.5 sm:px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isCurrentlyInDND()
                    ? theme === 'high-contrast'
                      ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : 'bg-white/5 text-slate-400 border border-white/5'
                }`} 
                title={`DND Range: ${dndConfig.startTime} to ${dndConfig.endTime}`}
                id="header-dnd-badge"
              >
                {isCurrentlyInDND() ? <Moon className="w-3.5 h-3.5 sm:w-4 h-4" /> : <Bell className="w-3.5 h-3.5 sm:w-4 h-4" />}
                <span className="hidden md:inline">{isCurrentlyInDND() ? 'DND Active (Muted)' : 'DND Scheduled'}</span>
                <span className="inline md:hidden text-[10px]">{isCurrentlyInDND() ? 'Muted' : 'DND'}</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`text-xs font-bold px-2.5 sm:px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
              title="Switch Theme"
              id="theme-toggle-btn"
            >
              <Contrast className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden sm:inline">{theme === 'high-contrast' ? 'Contrast' : 'Frosted'}</span>
            </button>

            {/* Audio Engine Unlocked status indicators */}
            {isAudioEngineActivated ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Engine Active</span>
                <span className="inline sm:hidden">Active</span>
              </span>
            ) : (
              <button
                onClick={activateAudioEngine}
                className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                id="activate-audio-banner-btn"
              >
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden sm:inline">Unlock Audio</span>
                <span className="inline sm:hidden">Unlock</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tab Bar for distributing sections */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-6 z-20" id="section-nav-container">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-1.5 flex overflow-x-auto no-scrollbar gap-1 md:gap-2 shadow-xl">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 min-w-[140px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'all'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-purple-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-all"
          >
            <LayoutGrid className={`w-4 h-4 ${viewMode === 'all' ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>Dashboard View</span>
          </button>
          
          <button
            onClick={() => setViewMode('routing')}
            className={`flex-1 min-w-[140px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'routing'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-blue-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-routing"
          >
            <Settings className={`w-4 h-4 ${viewMode === 'routing' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Routing Hub</span>
          </button>

          <button
            onClick={() => setViewMode('studio')}
            className={`flex-1 min-w-[140px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'studio'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-emerald-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-studio"
          >
            <Mic className={`w-4 h-4 ${viewMode === 'studio' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Voice Sandbox</span>
          </button>

          <button
            onClick={() => setViewMode('simulator')}
            className={`flex-1 min-w-[150px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'simulator'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-indigo-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-simulator"
          >
            <Phone className={`w-4 h-4 ${viewMode === 'simulator' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>Terminal Simulator</span>
          </button>

          <button
            onClick={() => setViewMode('billing')}
            className={`flex-1 min-w-[160px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
              viewMode === 'billing'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-amber-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-billing"
          >
            <Crown className={`w-4 h-4 ${viewMode === 'billing' ? 'text-yellow-400' : 'text-slate-400'} ${billing.plan !== 'free' ? 'animate-pulse' : ''}`} />
            <span>Google Play Billing</span>
            {billing.plan === 'free' ? (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
            ) : (
              <span className="text-[8px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded-full font-black scale-90 uppercase">Pro</span>
            )}
          </button>

          <button
            onClick={() => setViewMode('auth')}
            className={`flex-1 min-w-[150px] md:min-w-0 shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
              viewMode === 'auth'
                ? theme === 'high-contrast'
                  ? 'bg-yellow-400 text-black border-2 border-yellow-400'
                  : 'bg-white/10 text-white border border-white/15 shadow-md shadow-purple-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            id="nav-tab-auth"
          >
            <User className={`w-4 h-4 ${viewMode === 'auth' ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>{currentUser ? currentUser.displayName : 'Connect Auth'}</span>
            {currentUser ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 z-10" id="main-content-grid">
        
        {viewMode === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* LEFT COLUMN: Controls, Custom Recording, and File upload (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
              {/* Main App Config Panel tabbed card */}
              <div className="flex-1 min-h-[460px]">
                <ConfigPanel
                  appConfigs={appConfigs}
                  voiceProfiles={voiceProfiles}
                  ttsConfig={ttsConfig}
                  dndConfig={dndConfig}
                  playStoreSim={playStoreSim}
                  mutedKeywords={mutedKeywords}
                  onUpdateAppConfig={handleUpdateAppConfig}
                  onUpdateTTSConfig={handleUpdateTTSConfig}
                  onUpdateDNDConfig={handleUpdateDNDConfig}
                  onUpdatePlayStoreSim={handleUpdatePlayStoreSim}
                  onUpdateMutedKeywords={setMutedKeywords}
                  onDeleteVoiceProfile={handleDeleteProfile}
                  onPreviewVoice={handlePreviewVoice}
                />
              </div>

              {/* Local Audio Acquisition Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VoiceRecorder onProfileSaved={handleProfileSaved} />
                <AudioImport onProfileImported={handleProfileSaved} />
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Smartphone simulation device shell (lg:col-span-4) */}
            <div className="lg:col-span-4 h-full flex flex-col">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between text-slate-100">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-4">
                    <h2 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-purple-400" />
                      Live Android Terminal
                    </h2>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Simulated Ingress Screen
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    This simulated Android lockscreen visualizes incoming push announcements as they trigger your custom voice clones in real time.
                  </p>
                </div>

                <PhoneSimulator
                  notifications={notifications}
                  isPlayingNotification={isPlayingNotification}
                  onTriggerNotification={handleTriggerIncomingNotification}
                  onClearHistory={() => setNotifications([])}
                  voiceProfiles={voiceProfiles}
                  appConfigs={appConfigs}
                  ttsConfig={ttsConfig}
                  playStoreSim={playStoreSim}
                  billing={billing}
                  onUpgrade={() => setViewMode('billing')}
                  onStopPlayback={handleStopPlayback}
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'routing' && (
          <div className="w-full h-full min-h-[500px]">
            <ConfigPanel
              appConfigs={appConfigs}
              voiceProfiles={voiceProfiles}
              ttsConfig={ttsConfig}
              dndConfig={dndConfig}
              playStoreSim={playStoreSim}
              mutedKeywords={mutedKeywords}
              onUpdateAppConfig={handleUpdateAppConfig}
              onUpdateTTSConfig={handleUpdateTTSConfig}
              onUpdateDNDConfig={handleUpdateDNDConfig}
              onUpdatePlayStoreSim={handleUpdatePlayStoreSim}
              onUpdateMutedKeywords={setMutedKeywords}
              onDeleteVoiceProfile={handleDeleteProfile}
              onPreviewVoice={handlePreviewVoice}
            />
          </div>
        )}

        {viewMode === 'studio' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                <Mic className="w-5 h-5 text-emerald-400" />
                Vocal Acquisition Sandbox
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Record your voice or import pre-recorded alert sound files to configure personalized, low-latency push notifications.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VoiceRecorder onProfileSaved={handleProfileSaved} />
              <AudioImport onProfileImported={handleProfileSaved} />
            </div>

            {/* Chime and Intro Sound Settings */}
            <ChimeSettingsPanel
              ttsConfig={ttsConfig}
              onUpdateTTSConfig={handleUpdateTTSConfig}
              audioCtxRef={audioCtxRef}
            />
          </div>
        )}

        {viewMode === 'simulator' && (
          <div className="max-w-md mx-auto h-full">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-slate-100">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-4">
                  <h2 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-purple-400" />
                    Live Android Terminal
                  </h2>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Simulated Ingress Screen
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  This simulated Android lockscreen visualizes incoming push announcements as they trigger your custom voice clones in real time.
                </p>
              </div>

              <PhoneSimulator
                notifications={notifications}
                isPlayingNotification={isPlayingNotification}
                onTriggerNotification={handleTriggerIncomingNotification}
                onClearHistory={() => setNotifications([])}
                voiceProfiles={voiceProfiles}
                appConfigs={appConfigs}
                ttsConfig={ttsConfig}
                playStoreSim={playStoreSim}
                billing={billing}
                onUpgrade={() => setViewMode('billing')}
                onStopPlayback={handleStopPlayback}
              />
            </div>
          </div>
        )}

        {viewMode === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <PaywallPanel
              billingState={billing}
              onUpdateBilling={handleUpdateBilling}
              theme={theme}
            />
          </div>
        )}

        {viewMode === 'auth' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <AuthPanel
              currentUser={currentUser}
              onAuthStateChange={(user) => {
                setCurrentUser(user);
                if (user) {
                  user.isPremium = billing.plan !== 'free';
                }
              }}
              isPremium={billing.plan !== 'free'}
              onUpgradeClick={() => setViewMode('billing')}
              theme={theme}
            />
          </div>
        )}

      </main>

      {/* Footer information section */}
      <footer className="border-t border-white/10 bg-white/5 py-4 px-6 text-center text-[11px] text-slate-400 z-10" id="application-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © 2026 VocalNotify Companion. All rights reserved.
          </span>
          <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-slate-300 font-mono">
            <Lock className="w-3.5 h-3.5 text-purple-400" /> Sandboxed Local Instance • No Server Sync Active
          </span>
        </div>
      </footer>

      {/* FLOATING AUDIO INITIALIZER OVERLAY FOR COMPLIANCE */}
      {!isAudioEngineActivated && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-[#12121e]/90 border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center text-slate-100 backdrop-blur-xl">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-2xl text-white flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-white tracking-tight">
              Unlock VocalNotify Audio Engine
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              To support private, low-latency client-side speech synthesis and pitch-shifting without sending audio to remote servers, please click below to grant local AudioContext access.
            </p>
            <button
              onClick={activateAudioEngine}
              className="mt-5 w-full flex items-center justify-center gap-1.5 px-5 py-3 bg-gradient-to-tr from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 active:scale-95 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/20"
              id="activate-overlay-btn"
            >
              Start Local Service
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
