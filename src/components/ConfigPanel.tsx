import React, { useState, useEffect } from 'react';
import { 
  Settings, Sliders, Volume2, Play, Trash2, 
  MessageSquare, Mail, Slack, Compass, Calendar, Cpu, 
  HelpCircle, Check, Info, Sparkles, ChevronRight, Mic,
  Moon, BellOff, Clock, ShieldCheck, AlertCircle, FileText, Package, CheckCircle2
} from 'lucide-react';
import { AppName, AppVoiceConfig, VoiceProfile, TTSConfig, DNDConfig, PlayStoreSimConfig, MutedKeyword } from '../types';
import { SUPPORTED_APPS } from '../lib/constants';
import { playAudioWithSettings } from '../lib/pitchShifter';
import { READING_STYLES } from '../lib/readoutStyles';
import { ACCENT_PRESETS, findMatchingVoice } from '../lib/accentPresets';

interface ConfigPanelProps {
  appConfigs: AppVoiceConfig[];
  voiceProfiles: VoiceProfile[];
  ttsConfig: TTSConfig;
  dndConfig: DNDConfig;
  playStoreSim: PlayStoreSimConfig;
  mutedKeywords: MutedKeyword[];
  onUpdateAppConfig: (config: AppVoiceConfig) => void;
  onUpdateTTSConfig: (config: TTSConfig) => void;
  onUpdateDNDConfig: (config: DNDConfig) => void;
  onUpdatePlayStoreSim: (config: PlayStoreSimConfig) => void;
  onUpdateMutedKeywords: (keywords: MutedKeyword[]) => void;
  onDeleteVoiceProfile: (id: string) => void;
  onPreviewVoice: (appName: AppName) => void;
}

export default function ConfigPanel({
  appConfigs,
  voiceProfiles,
  ttsConfig,
  dndConfig,
  playStoreSim,
  mutedKeywords,
  onUpdateAppConfig,
  onUpdateTTSConfig,
  onUpdateDNDConfig,
  onUpdatePlayStoreSim,
  onUpdateMutedKeywords,
  onDeleteVoiceProfile,
  onPreviewVoice,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'apps' | 'tts' | 'dnd' | 'library' | 'playstore'>('apps');
  const [selectedAppName, setSelectedAppName] = useState<AppName>('WhatsApp');
  const [nativeVoices, setNativeVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingProfile, setIsPlayingProfile] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const activeAudioRef = React.useRef<{ stop: () => void } | null>(null);

  // Load SpeechSynthesis Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        // Filter some popular, clean voices to prevent cluttering or keep all
        setNativeVoices(voices);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleAddKeyword = () => {
    if (!newKeywordInput.trim()) return;
    const cleanPattern = newKeywordInput.trim();
    
    // Prevent duplicate patterns (case-insensitive check)
    if (mutedKeywords.some(k => k.pattern.toLowerCase() === cleanPattern.toLowerCase())) {
      setNewKeywordInput('');
      return;
    }

    const newKw: MutedKeyword = {
      id: `kw_${Date.now()}`,
      pattern: cleanPattern,
      enabled: true,
      matchCount: 0
    };

    onUpdateMutedKeywords([...mutedKeywords, newKw]);
    setNewKeywordInput('');
  };

  const handleToggleKeyword = (id: string) => {
    const updated = mutedKeywords.map(k => {
      if (k.id === id) {
        return { ...k, enabled: !k.enabled };
      }
      return k;
    });
    onUpdateMutedKeywords(updated);
  };

  const handleResetMatchCount = (id: string) => {
    const updated = mutedKeywords.map(k => {
      if (k.id === id) {
        return { ...k, matchCount: 0 };
      }
      return k;
    });
    onUpdateMutedKeywords(updated);
  };

  const handleRemoveKeyword = (id: string) => {
    const updated = mutedKeywords.filter(k => k.id !== id);
    onUpdateMutedKeywords(updated);
  };

  const activeConfig: AppVoiceConfig = appConfigs.find((c) => c.appName === selectedAppName) || {
    appName: selectedAppName,
    voiceProfileId: 'tts',
    pitchShift: 0,
    speed: 1.0,
    volume: 0.8,
    enabled: true,
    readContent: 'all',
    readingStyle: 'natural',
  };

  const selectedAppMetadata = SUPPORTED_APPS[selectedAppName];

  const handleAppConfigChange = (key: keyof AppVoiceConfig, value: any) => {
    onUpdateAppConfig({
      ...activeConfig,
      [key]: value,
    });
  };

  const handlePlayVoiceProfile = (profile: VoiceProfile) => {
    // If already playing, stop it
    if (activeAudioRef.current) {
      activeAudioRef.current.stop();
      if (isPlayingProfile === profile.id) {
        setIsPlayingProfile(null);
        activeAudioRef.current = null;
        return;
      }
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      setIsPlayingProfile(profile.id);

      // We need to fetch and decode the blob data to play it with pitch shifting
      if (profile.blob) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            const playback = playAudioWithSettings(
              audioCtx,
              audioBuffer,
              1.0, // Default preview speed
              0,   // Default preview pitch
              1.0, // Default volume
              ttsConfig.agcEnabled ?? true,
              () => {
                setIsPlayingProfile(null);
                activeAudioRef.current = null;
                audioCtx.close();
              }
            );

            activeAudioRef.current = playback;
          } catch (e) {
            console.error('Error decoding preview audio', e);
            setIsPlayingProfile(null);
            audioCtx.close();
          }
        };
        reader.readAsArrayBuffer(profile.blob);
      }
    } catch (err) {
      console.error('Web Audio failed', err);
      setIsPlayingProfile(null);
    }
  };

  const getAppIcon = (iconName: string, color: string, size = 18) => {
    const props = { className: 'shrink-0', style: { color }, size };
    switch (iconName) {
      case 'MessageSquare': return <MessageSquare {...props} />;
      case 'Mail': return <Mail {...props} />;
      case 'Slack': return <Slack {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Calendar': return <Calendar {...props} />;
      default: return <Cpu {...props} />;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden flex flex-col h-full text-slate-100" id="config-panel">
      {/* Tab Header */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-white/10 bg-white/5 p-2 gap-1">
        <button
          onClick={() => setActiveTab('apps')}
          className={`flex-1 min-w-[125px] shrink-0 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-2xl transition-all ${
            activeTab === 'apps'
              ? 'bg-white/10 text-white shadow-md border border-white/15 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-apps"
        >
          <Sliders className="w-4 h-4" />
          App Mapping
        </button>
        <button
          onClick={() => setActiveTab('tts')}
          className={`flex-1 min-w-[125px] shrink-0 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-2xl transition-all ${
            activeTab === 'tts'
              ? 'bg-white/10 text-white shadow-md border border-white/15 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-tts"
        >
          <Volume2 className="w-4 h-4" />
          TTS Engine
        </button>
        <button
          onClick={() => setActiveTab('dnd')}
          className={`flex-1 min-w-[125px] shrink-0 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-2xl transition-all ${
            activeTab === 'dnd'
              ? 'bg-white/10 text-white shadow-md border border-white/15 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-dnd"
        >
          <BellOff className="w-4 h-4" />
          Muting & Filters
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 min-w-[155px] shrink-0 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-2xl transition-all ${
            activeTab === 'library'
              ? 'bg-white/10 text-white shadow-md border border-white/15 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-library"
        >
          <Mic className="w-4 h-4" />
          My Voice Library ({voiceProfiles.length})
        </button>
        <button
          onClick={() => setActiveTab('playstore')}
          className={`flex-1 min-w-[175px] shrink-0 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-2xl transition-all ${
            activeTab === 'playstore'
              ? 'bg-white/10 text-white shadow-md border border-white/15 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-playstore"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Play Store Compliance
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* APPS TAB */}
        {activeTab === 'apps' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
            {/* Apps List (Left Panel) */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Active Android Applications
              </span>
              {(Object.keys(SUPPORTED_APPS) as AppName[]).map((appName) => {
                const appMeta = SUPPORTED_APPS[appName];
                const appConfig = appConfigs.find((c) => c.appName === appName);
                const isSelected = selectedAppName === appName;
                const isEnabled = appConfig?.enabled ?? true;

                return (
                  <button
                    key={appName}
                    onClick={() => setSelectedAppName(appName)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all group ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/5 hover:border-white/15 bg-white/5'
                    }`}
                    id={`app-selector-${appName}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: `${appMeta.color}20` }}>
                        {getAppIcon(appMeta.iconName, appMeta.color, 20)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          {appMeta.displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {appConfig?.voiceProfileId === 'tts' 
                            ? 'Native Speech Engine' 
                            : (voiceProfiles.find(v => v.id === appConfig?.voiceProfileId)?.name || 'Custom Recorded Announcement')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`} />
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'translate-x-0.5 text-purple-400' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected App Configuration (Right Panel) */}
            <div className="md:col-span-7 border border-white/10 rounded-2xl p-5 bg-white/5">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedAppMetadata.color}20` }}>
                    {getAppIcon(selectedAppMetadata.iconName, selectedAppMetadata.color, 16)}
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {selectedAppMetadata.displayName} Readout Configuration
                  </h4>
                </div>

                {/* Enable / Disable toggle */}
                <button
                  onClick={() => handleAppConfigChange('enabled', !activeConfig.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    activeConfig.enabled ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                  id="app-toggle-btn"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                      activeConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {!activeConfig.enabled ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <Volume2 className="w-12 h-12 text-slate-500 mb-3 stroke-1" />
                  <p className="text-sm font-medium text-slate-300">Notifications Muted</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Voice readout is disabled for {selectedAppMetadata.displayName}. Toggle on above to restore custom voice announcements.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-fadeIn">
                  {/* Voice Source Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Voice / Announcer Source
                    </label>
                    <select
                      value={activeConfig.voiceProfileId}
                      onChange={(e) => handleAppConfigChange('voiceProfileId', e.target.value)}
                      className="w-full text-sm bg-slate-900/60 border border-white/10 text-slate-100 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer"
                      id="voice-source-select"
                    >
                      <option value="tts">Native Device Text-To-Speech (SpeechSynthesis)</option>
                      {voiceProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          🎙️ {profile.name} ({profile.type === 'record' ? 'Recorded Clip' : 'Imported Audio'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0 text-purple-400 mt-0.5" />
                      <span>
                        {activeConfig.voiceProfileId === 'tts'
                          ? 'Translates incoming message text to voice directly on device.'
                          : 'Plays your pre-recorded audio snippet as an announcement chime before reading the sender content.'}
                      </span>
                    </p>
                  </div>

                  {/* Playback speed (rate) slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span className="uppercase tracking-wider">Announcer Speed</span>
                      <span className="text-purple-400 font-mono">{activeConfig.speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={activeConfig.speed}
                      onChange={(e) => handleAppConfigChange('speed', parseFloat(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>Slow (0.5x)</span>
                      <span>Normal</span>
                      <span>Fast (2.5x)</span>
                    </div>
                  </div>

                  {/* Pitch Shift slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span className="uppercase tracking-wider">Announcer Pitch Tuning</span>
                      <span className="text-purple-400 font-mono">
                        {activeConfig.pitchShift > 0 ? `+${activeConfig.pitchShift}` : activeConfig.pitchShift} semitones
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={activeConfig.pitchShift}
                      onChange={(e) => handleAppConfigChange('pitchShift', parseInt(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>Deep Voice (-12)</span>
                      <span>Default (0)</span>
                      <span>High Pitch (+12)</span>
                    </div>
                  </div>

                  {/* Readout detail level */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      Content Announcement Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'all', title: 'Full Content', desc: 'App + Sender + Body' },
                        { id: 'sender_only', title: 'Sender Only', desc: 'App + Sender name' },
                        { id: 'summary_only', title: 'App Summary', desc: 'App alert chime only' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAppConfigChange('readContent', item.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            activeConfig.readContent === item.id
                              ? 'border-purple-500/50 bg-purple-500/10 text-white shadow-sm'
                              : 'border-white/5 hover:border-white/15 bg-white/5 text-slate-300'
                          }`}
                        >
                          <span className="text-xs font-bold block">{item.title}</span>
                          <span className="text-[10px] text-slate-400 leading-tight mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reading Style Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      Vocal Reading Style / Tone
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {READING_STYLES.map((style) => {
                        const isSelected = (activeConfig.readingStyle || 'natural') === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => handleAppConfigChange('readingStyle', style.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'border-purple-500/50 bg-purple-500/15 text-white shadow-sm'
                                : 'border-white/5 hover:border-white/10 bg-white/5 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-sm shrink-0">{style.emoji}</span>
                              <span className="text-xs font-bold block">{style.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 leading-snug mb-1">
                              {style.description}
                            </span>
                            <span className="text-[9px] text-purple-300/85 italic font-mono truncate w-full mt-1 border-t border-white/5 pt-1 block" title={style.sampleText}>
                              e.g., "{style.sampleText.replace('Hey! Are we still meeting for coffee at 2 PM today?', '...')}"
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Audio Preview */}
                  <div className="pt-3">
                    <button
                      onClick={() => onPreviewVoice(selectedAppName)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-tr from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-purple-500/20"
                      id="preview-voice-btn"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Test Alert Announcement
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TTS ENGINE SETTINGS TAB */}
        {activeTab === 'tts' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 flex gap-4">
              <Sparkles className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-white">Native Android Text-To-Speech (TTS)</h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Vocal Notification Reader leverages your device's built-in local TTS engine to synthesise dynamic notification scripts on the fly. No server round-trips, safeguarding 100% of your message confidentiality.
                </p>
              </div>
            </div>

            {/* System Vocal Accents & Personalities */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1">
                  Vocal Accent Personality Profiles
                </label>
                <p className="text-xs text-slate-400 mb-4">
                  Choose a pre-tuned speech profile to instantly emulate custom native accents. The system auto-detects local offline speech engines to activate deep pronunciation CADENCE.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-fadeIn" id="accent-personality-grid">
                  {ACCENT_PRESETS.map((preset) => {
                    const isActive = (ttsConfig.accentId || 'default') === preset.id;
                    const matchedNativeVoice = findMatchingVoice(nativeVoices, preset.id);
                    
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          const matched = findMatchingVoice(nativeVoices, preset.id);
                          onUpdateTTSConfig({
                            ...ttsConfig,
                            accentId: preset.id,
                            voiceURI: matched ? matched.voiceURI : ttsConfig.voiceURI,
                            pitch: preset.defaultPitch,
                            rate: preset.defaultRate
                          });
                        }}
                        className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-36 cursor-pointer ${
                          isActive
                            ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/30'
                            : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'
                        }`}
                        id={`accent-btn-${preset.id}`}
                      >
                        {/* Active Indicator Badge */}
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white p-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg leading-none">{preset.emoji}</span>
                            <span className="text-xs font-black text-white">{preset.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-3 leading-normal">
                            {preset.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between mt-auto w-full">
                          <span className="text-[9px] font-mono text-slate-500">
                            Speed: {preset.defaultRate.toFixed(2)}x
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] px-1 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              matchedNativeVoice 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                            }`}>
                              {matchedNativeVoice ? 'Native Match' : 'Synthetic'}
                            </span>

                            {/* Hover Play Button */}
                            <span
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof window !== 'undefined' && window.speechSynthesis) {
                                  window.speechSynthesis.cancel();
                                  const ut = new SpeechSynthesisUtterance(preset.samplePhrase);
                                  const matched = findMatchingVoice(nativeVoices, preset.id);
                                  if (matched) ut.voice = matched;
                                  ut.pitch = preset.defaultPitch;
                                  ut.rate = preset.defaultRate;
                                  window.speechSynthesis.speak(ut);
                                }
                              }}
                              className="bg-slate-800/80 hover:bg-slate-700 hover:text-white p-1 rounded-lg border border-white/5 text-slate-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                              title="Play Voice Sample"
                            >
                              <Volume2 className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Native Voice Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Local Engine Voice Override
                </label>
                <select
                  value={ttsConfig.voiceURI}
                  onChange={(e) => onUpdateTTSConfig({ ...ttsConfig, voiceURI: e.target.value })}
                  className="w-full text-sm bg-slate-900/60 border border-white/10 text-slate-100 rounded-xl px-3.5 py-3 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer"
                  id="tts-voice-select"
                >
                  {nativeVoices.length === 0 ? (
                    <option value="">-- Standard System Voice (Default) --</option>
                  ) : (
                    <>
                      <option value="">-- Standard System Voice (Default) --</option>
                      {nativeVoices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#12121e] text-slate-100">
                          {voice.name} ({voice.lang}) {voice.localService ? '• Offline Capable' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                  <span>
                    Offline voices provide the lowest latency and highest reliability since speech conversion takes place locally inside the device CPU.
                  </span>
                </p>
              </div>

              {/* TTS Native Pitch */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span className="uppercase tracking-wider">Fine-Tuned Pitch Offset</span>
                  <span className="text-purple-400 font-mono">{ttsConfig.pitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsConfig.pitch}
                  onChange={(e) => onUpdateTTSConfig({ ...ttsConfig, pitch: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              {/* TTS Native Speed */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span className="uppercase tracking-wider">Fine-Tuned Speed Factor</span>
                  <span className="text-purple-400 font-mono">{ttsConfig.rate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={ttsConfig.rate}
                  onChange={(e) => onUpdateTTSConfig({ ...ttsConfig, rate: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              {/* Automatic Gain Control (AGC) */}
              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl flex items-start gap-3 justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Auto-Gain Control (AGC)</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      ttsConfig.agcEnabled ?? true 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {ttsConfig.agcEnabled ?? true ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Automatically normalize playback levels. Levels out loud cues and boosts quiet voice recordings for consistent announcement volumes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateTTSConfig({ ...ttsConfig, agcEnabled: !(ttsConfig.agcEnabled ?? true) })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    ttsConfig.agcEnabled ?? true ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                  id="agc-toggle-btn"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      ttsConfig.agcEnabled ?? true ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* General Tester */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      const preset = ACCENT_PRESETS.find(p => p.id === (ttsConfig.accentId || 'default'));
                      const phrase = preset 
                        ? `Vocal testing: ${preset.name} is online. ${preset.samplePhrase}` 
                        : 'Vocal notification service is fully operational. Dynamic voice cloning is set to 100% private local execution.';
                      
                      const utt = new SpeechSynthesisUtterance(phrase);
                      
                      let matchedVoice: SpeechSynthesisVoice | null = null;
                      if (ttsConfig.accentId && ttsConfig.accentId !== 'default') {
                        matchedVoice = findMatchingVoice(nativeVoices, ttsConfig.accentId);
                      }
                      if (!matchedVoice && ttsConfig.voiceURI) {
                        matchedVoice = nativeVoices.find(v => v.voiceURI === ttsConfig.voiceURI) || null;
                      }
                      if (matchedVoice) {
                        utt.voice = matchedVoice;
                      }
                      
                      utt.pitch = ttsConfig.pitch;
                      utt.rate = ttsConfig.rate;
                      window.speechSynthesis.speak(utt);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 border border-white/10 hover:bg-white/15 active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition animate-fadeIn"
                  id="test-speech-engine-btn"
                >
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  Test Selected Accent Engine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DO NOT DISTURB TAB */}
        {activeTab === 'dnd' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 flex gap-4">
              <Moon className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-white">Do Not Disturb (Quiet Hours) Schedule</h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Automatically mute the vocal notification reader during specified hours of the day. This keeps your phone quiet during bedtime or focus intervals, without needing to manually toggle individual app mappings.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="border border-white/10 bg-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dndConfig.enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                  <BellOff className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Enable Do Not Disturb Schedule</span>
                  <span className="text-xs text-slate-400">Enforce automatic quiet hours muting</span>
                </div>
              </div>

              <button
                onClick={() => onUpdateDNDConfig({ ...dndConfig, enabled: !dndConfig.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                  dndConfig.enabled ? 'bg-purple-500' : 'bg-slate-700'
                }`}
                id="dnd-enable-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    dndConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {dndConfig.enabled && (
              <div className="space-y-6 animate-fadeIn">
                {/* Time Range Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-white/10 bg-white/5 rounded-2xl p-5 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Mute From (Start Time)
                    </label>
                    <input
                      type="time"
                      value={dndConfig.startTime}
                      onChange={(e) => onUpdateDNDConfig({ ...dndConfig, startTime: e.target.value })}
                      className="w-full text-base font-bold bg-slate-900/60 border border-white/10 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer"
                      id="dnd-start-time"
                    />
                    <span className="text-[10px] text-slate-400 block">Typical bedtime: 10:00 PM (22:00)</span>
                  </div>

                  <div className="border border-white/10 bg-white/5 rounded-2xl p-5 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Unmute At (End Time)
                    </label>
                    <input
                      type="time"
                      value={dndConfig.endTime}
                      onChange={(e) => onUpdateDNDConfig({ ...dndConfig, endTime: e.target.value })}
                      className="w-full text-base font-bold bg-slate-900/60 border border-white/10 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer"
                      id="dnd-end-time"
                    />
                    <span className="text-[10px] text-slate-400 block">Typical wakeup: 07:00 AM (07:00)</span>
                  </div>
                </div>

                {/* Preset Recommendations */}
                <div>
                  <span className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                    Quick Schedule Presets
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { title: '🌙 Bedtime Mute', desc: '10 PM - 7 AM', start: '22:00', end: '07:00' },
                      { title: '💼 Focus/Work', desc: '9 AM - 5 PM', start: '09:00', end: '17:00' },
                      { title: '🍽️ Lunch Hour', desc: '12 PM - 1 PM', start: '12:00', end: '13:00' },
                    ].map((preset) => (
                      <button
                        key={preset.title}
                        onClick={() => onUpdateDNDConfig({ ...dndConfig, startTime: preset.start, endTime: preset.end })}
                        className="p-3.5 rounded-xl border border-white/5 bg-white/5 text-left hover:bg-white/10 hover:border-white/15 transition-all flex flex-col justify-between cursor-pointer"
                      >
                        <span className="text-xs font-bold text-white block">{preset.title}</span>
                        <span className="text-[10px] text-purple-400 font-mono mt-1">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Indicator Card */}
                <div className={`border rounded-2xl p-5 flex items-center gap-4 ${
                  (() => {
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const currentVal = currentHours * 60 + currentMinutes;

                    const [startH, startM] = dndConfig.startTime.split(':').map(Number);
                    const startVal = startH * 60 + startM;

                    const [endH, endM] = dndConfig.endTime.split(':').map(Number);
                    const endVal = endH * 60 + endM;

                    const isActive = startVal <= endVal
                      ? (currentVal >= startVal && currentVal < endVal)
                      : (currentVal >= startVal || currentVal < endVal);

                    return isActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200';
                  })()
                }`}>
                  {(() => {
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const currentVal = currentHours * 60 + currentMinutes;

                    const [startH, startM] = dndConfig.startTime.split(':').map(Number);
                    const startVal = startH * 60 + startM;

                    const [endH, endM] = dndConfig.endTime.split(':').map(Number);
                    const endVal = endH * 60 + endM;

                    const isActive = startVal <= endVal
                      ? (currentVal >= startVal && currentVal < endVal)
                      : (currentVal >= startVal || currentVal < endVal);

                    return (
                      <>
                        <div className={`w-3 h-3 rounded-full shrink-0 ${isActive ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <div>
                          <span className="text-xs font-bold block">
                            {isActive ? 'Do Not Disturb Currently Active (Notification Reader Muted)' : 'Vocal Reader Operational (Outside Quiet Hours)'}
                          </span>
                          <span className="text-[10px] opacity-80 leading-relaxed block mt-0.5">
                            {isActive 
                              ? `All voice clone announcements and Native TTS readings are currently blocked until ${dndConfig.endTime}.`
                              : `Quiet hours will automatically enable at ${dndConfig.startTime}.`}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Keyword-based Filtering & Muting System */}
            <div className="border-t border-white/10 pt-6 space-y-4">
              <div className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-white">Keyword-based Announcement Muter</h5>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Mute specific notifications automatically based on their content. If an incoming message body or title contains any of your active keywords (e.g., 'Marketing', 'Promotions', 'Ad'), it will be silenced without sounding any voice alerts.
                  </p>
                </div>
              </div>

              {/* Add New Keyword Form */}
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    placeholder="Enter keyword to mute (e.g., 'Promo', 'Spam')..."
                    className="w-full text-xs bg-slate-900/60 border border-white/10 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    id="new-keyword-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-black tracking-wider uppercase px-5 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/10 cursor-pointer shrink-0"
                  id="add-keyword-btn"
                >
                  Add Keyword
                </button>
              </div>

              {/* Keywords List */}
              <div className="space-y-2.5">
                {mutedKeywords.length === 0 ? (
                  <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs">
                    No active mute keywords. All incoming notification bodies will be processed.
                  </div>
                ) : (
                  mutedKeywords.map((kw) => (
                    <div
                      key={kw.id}
                      className="border border-white/5 bg-slate-950/25 rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleKeyword(kw.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                            kw.enabled ? 'bg-purple-500/85' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                              kw.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div>
                          <span className={`text-xs font-bold font-mono tracking-tight block ${kw.enabled ? 'text-white' : 'text-slate-500 line-through'}`}>
                            "{kw.pattern}"
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Muted <b className="text-purple-400">{kw.matchCount}</b> time{kw.matchCount !== 1 ? 's' : ''} so far
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {kw.matchCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleResetMatchCount(kw.id)}
                            className="text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition"
                            title="Reset matches counter"
                          >
                            Reset Count
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                          title="Delete keyword"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* LIBRARY MANAGEMENT TAB */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              My Saved Vocal Announcements ({voiceProfiles.length})
            </span>

            {voiceProfiles.length === 0 ? (
              <div className="border border-dashed border-white/15 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center">
                <Mic className="w-10 h-10 text-slate-500 stroke-1 mb-2" />
                <span className="text-sm font-medium text-slate-300">No recordings stored yet</span>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Use the Recording or Uploading tools on the left to add personalized vocal alerts, allowing you to hear your own voice read out incoming alerts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voiceProfiles.map((profile) => {
                  const dateStr = new Date(profile.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const sizeKB = profile.blob ? `${(profile.blob.size / 1024).toFixed(1)} KB` : '';
                  const isPlaying = isPlayingProfile === profile.id;

                  return (
                    <div
                      key={profile.id}
                      className="border border-white/5 bg-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayVoiceProfile(profile)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isPlaying
                              ? 'bg-purple-500 text-white animate-pulse'
                              : 'bg-white/10 hover:bg-white/15 text-purple-400 border border-white/10'
                          }`}
                        >
                          <Play className={`w-4 h-4 ${isPlaying ? 'fill-white text-white' : 'fill-purple-400 text-purple-400'}`} />
                        </button>
                        <div>
                          <span className="text-xs font-bold text-white block truncate max-w-[150px]">
                            {profile.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {profile.type === 'record' ? '🎙️ Record' : '📂 Import'} • {profile.duration.toFixed(1)}s {sizeKB ? `• ${sizeKB}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm">
                          {dateStr}
                        </span>
                        <button
                          onClick={() => onDeleteVoiceProfile(profile.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete voice profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PLAY STORE COMPLIANCE TAB */}
        {activeTab === 'playstore' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold block text-emerald-300">
                  Google Play Store Publishing Checklist (Status: Compliant)
                </span>
                <span className="text-[10px] text-slate-300 leading-relaxed block mt-0.5">
                  This panel validates the app's structural compliance with the latest <b>Google Play Store Developer Policies</b>. It handles critical background service permissions, prominent data privacy disclosures, and sandbox simulation parameters.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Simulated Android OS Permissions & Toggles */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Android OS System Simulation
                </span>

                {/* Toggle 1: Notification Listener Permission */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${playStoreSim.notificationAccess ? 'bg-purple-500/20 text-purple-300' : 'bg-red-500/20 text-red-300'}`}>
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white block">Notification Listener Service</span>
                      <button
                        type="button"
                        onClick={() => onUpdatePlayStoreSim({
                          ...playStoreSim,
                          notificationAccess: !playStoreSim.notificationAccess
                        })}
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer uppercase font-mono tracking-wider transition-all ${
                          playStoreSim.notificationAccess
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {playStoreSim.notificationAccess ? 'Granted' : 'Denied'}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal mt-1 block">
                      Enables the <code>BIND_NOTIFICATION_LISTENER_SERVICE</code> permission allowing the background worker to catch alerts. If denied, the vocal reader is blocked.
                    </span>
                  </div>
                </div>

                {/* Toggle 2: Battery Optimization Bypass */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${playStoreSim.batteryOptimizationsBypassed ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-500/20 text-slate-400'}`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white block">Ignore Battery Optimizations</span>
                      <button
                        type="button"
                        onClick={() => onUpdatePlayStoreSim({
                          ...playStoreSim,
                          batteryOptimizationsBypassed: !playStoreSim.batteryOptimizationsBypassed
                        })}
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer uppercase font-mono tracking-wider transition-all ${
                          playStoreSim.batteryOptimizationsBypassed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-white/5'
                        }`}
                      >
                        {playStoreSim.batteryOptimizationsBypassed ? 'Exempt' : 'Standard'}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal mt-1 block">
                      Prevents the Android system from aggressively putting the speech engines to sleep under standard sleep states or Doze mode.
                    </span>
                  </div>
                </div>

                {/* Toggle 3: Persistent Foreground Notification */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${playStoreSim.foregroundServiceNotification ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-500/20 text-slate-400'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white block">Foreground Notification Pin</span>
                      <button
                        type="button"
                        onClick={() => onUpdatePlayStoreSim({
                          ...playStoreSim,
                          foregroundServiceNotification: !playStoreSim.foregroundServiceNotification
                        })}
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer uppercase font-mono tracking-wider transition-all ${
                          playStoreSim.foregroundServiceNotification
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-white/5'
                        }`}
                      >
                        {playStoreSim.foregroundServiceNotification ? 'Pinned' : 'Hidden'}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal mt-1 block">
                      Ensures compliance with Google Play's Foreground Service (FGS) mandates by showing an ongoing status-bar banner informing users that background monitoring is active.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Manifest Details & Policy Compliance Disclosure */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Google Play Store Manifest & Metadata
                </span>

                <div className="p-4 rounded-2xl bg-[#0e0e16]/80 border border-white/5 font-mono space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-[10px]">
                    <span className="text-slate-400">Package Identifier</span>
                    <span className="text-indigo-300">com.vocalnotify.companion</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-[10px]">
                    <span className="text-slate-400">Target Android SDK</span>
                    <span className="text-indigo-300">API 34 (Android 14)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-[10px]">
                    <span className="text-slate-400">Content Rating</span>
                    <span className="text-indigo-300">PEGI 3 (Everyone)</span>
                  </div>
                  <div className="flex items-start justify-between text-[10px]">
                    <span className="text-slate-400">Play Permissions</span>
                    <div className="text-right flex flex-col gap-0.5 max-w-[180px] text-slate-300 text-[9px]">
                      <span>• BIND_NOTIFICATION_LISTENER</span>
                      <span>• FOREGROUND_SERVICE_MEDIA_PLAYBACK</span>
                      <span>• POST_NOTIFICATIONS</span>
                    </div>
                  </div>
                </div>

                {/* Prominent Privacy Policy & Data Disclosure */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Prominent Disclosure & Privacy Act</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Under Google Play Developer policies, applications accessing standard notification APIs must provide a prominent user data agreement.
                  </p>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/15 text-[9px] text-indigo-200/90 leading-relaxed font-mono italic">
                    "VocalNotify Companion processes incoming alert data strictly in-memory (RAM) during speech synthesis. Message contents and sender information are never logged, never written to disk, and never transmitted over any network."
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5 justify-between">
                    <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> GDPR & COPPA Compliant
                    </span>
                    <span className="text-[9.5px] text-purple-300 font-bold hover:underline cursor-pointer">
                      View Privacy Policy Link
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
