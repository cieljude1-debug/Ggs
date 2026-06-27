import React, { useState, useRef } from 'react';
import { Sliders, Play, Check, Sparkles, Volume2, HelpCircle, Bell } from 'lucide-react';
import { TTSConfig } from '../types';
import { PRESET_CHIMES, playSynthesizedChime } from '../lib/chimeSynthesizer';

interface ChimeSettingsPanelProps {
  ttsConfig: TTSConfig;
  onUpdateTTSConfig: (config: TTSConfig) => void;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
}

export default function ChimeSettingsPanel({
  ttsConfig,
  onUpdateTTSConfig,
  audioCtxRef,
}: ChimeSettingsPanelProps) {
  const [isPlayingChime, setIsPlayingChime] = useState<string | null>(null);
  const [isPlayingTestSequence, setIsPlayingTestSequence] = useState(false);
  const activeChimePlaybackRef = useRef<{ stop: () => void } | null>(null);

  const currentChimeId = ttsConfig.chimeId || 'none';
  const currentBalance = ttsConfig.chimeVolumeBalance !== undefined ? ttsConfig.chimeVolumeBalance : 50;

  const handleSelectChime = (chimeId: string) => {
    onUpdateTTSConfig({
      ...ttsConfig,
      chimeId,
    });
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTTSConfig({
      ...ttsConfig,
      chimeVolumeBalance: parseInt(e.target.value, 10),
    });
  };

  const stopActivePlayback = () => {
    if (activeChimePlaybackRef.current) {
      activeChimePlaybackRef.current.stop();
      activeChimePlaybackRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingChime(null);
    setIsPlayingTestSequence(false);
  };

  const initAudioCtx = async (): Promise<AudioContext> => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return audioCtx;
  };

  const handlePreviewChime = async (chimeId: string) => {
    stopActivePlayback();
    if (chimeId === 'none') return;

    try {
      const audioCtx = await initAudioCtx();
      setIsPlayingChime(chimeId);

      const playback = playSynthesizedChime(
        audioCtx,
        chimeId,
        (ttsConfig.volume || 0.8) * 0.8, // Play at slight attenuation for test preview
        () => {
          setIsPlayingChime(null);
          activeChimePlaybackRef.current = null;
        }
      );
      activeChimePlaybackRef.current = playback;
    } catch (e) {
      console.error('Failed to play chime preview:', e);
      setIsPlayingChime(null);
    }
  };

  const handleTestSequence = async () => {
    stopActivePlayback();
    if (currentChimeId === 'none') {
      // Just speak TTS directly
      setIsPlayingTestSequence(true);
      const utterance = new SpeechSynthesisUtterance('Chime is disabled. Playing voice readout directly.');
      utterance.volume = ttsConfig.volume || 0.8;
      utterance.onend = () => setIsPlayingTestSequence(false);
      utterance.onerror = () => setIsPlayingTestSequence(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      const audioCtx = await initAudioCtx();
      setIsPlayingTestSequence(true);

      // Compute volume multipliers based on current balance
      let chimeMultiplier = 1.0;
      let ttsMultiplier = 1.0;
      if (currentBalance < 50) {
        ttsMultiplier = currentBalance / 50;
      } else if (currentBalance > 50) {
        chimeMultiplier = (100 - currentBalance) / 50;
      }

      const volume = ttsConfig.volume || 0.8;
      const chimeVolume = volume * chimeMultiplier;

      const playback = playSynthesizedChime(
        audioCtx,
        currentChimeId,
        chimeVolume,
        () => {
          activeChimePlaybackRef.current = null;
          
          // Now trigger Speech Synthesis
          const utterance = new SpeechSynthesisUtterance(
            `Incoming WhatsApp message from Sis: Hey, let's grab coffee soon!`
          );
          utterance.volume = volume * ttsMultiplier;
          
          utterance.onend = () => {
            setIsPlayingTestSequence(false);
          };
          utterance.onerror = () => {
            setIsPlayingTestSequence(false);
          };

          window.speechSynthesis.speak(utterance);
        }
      );
      activeChimePlaybackRef.current = playback;
    } catch (e) {
      console.error('Failed to run test sound sequence:', e);
      setIsPlayingTestSequence(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100" id="chime-settings-panel">
      {/* Header Info */}
      <div className="flex items-start gap-4 pb-4 border-b border-white/10">
        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 shrink-0">
          <Bell className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
            Intro Sounds & Notification Chimes
            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
              NEW
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure an atmospheric sound or melody to ring immediately before the custom AI voice clone narrates your notifications.
          </p>
        </div>
      </div>

      {/* Select Intro Sound / Chime */}
      <div className="space-y-3">
        <label className="text-xs font-extrabold text-slate-300 tracking-wide uppercase block">
          Select Intro Sound
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* None Option */}
          <button
            type="button"
            onClick={() => handleSelectChime('none')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition cursor-pointer ${
              currentChimeId === 'none'
                ? 'bg-purple-600/10 border-purple-500/40 text-white'
                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">🔇 Disable Intro Chime</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Read notifications immediately</span>
            </div>
            {currentChimeId === 'none' && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
          </button>

          {/* Preset Chimes */}
          {PRESET_CHIMES.map((chime) => (
            <div
              key={chime.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                currentChimeId === chime.id
                  ? 'bg-purple-600/10 border-purple-500/40 text-white'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
              }`}
            >
              <div
                onClick={() => handleSelectChime(chime.id)}
                className="flex-1 text-left cursor-pointer pr-2"
              >
                <span className="text-xs font-bold block">
                  {chime.emoji} {chime.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                  {chime.description}
                </span>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreviewChime(chime.id)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isPlayingChime === chime.id
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 animate-pulse'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Preview chime"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                {currentChimeId === chime.id && (
                  <div className="p-1 text-purple-400">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume Balance Control */}
      {currentChimeId !== 'none' && (
        <div className="space-y-4 p-5 bg-slate-900/40 border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300 tracking-wide uppercase flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              Volume Balance
            </span>
            <span className="text-xs text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/15">
              {currentBalance === 50
                ? 'Balanced (50:50)'
                : currentBalance < 50
                ? `Chime Heavy (${100 - currentBalance * 2}% / ${currentBalance * 2}%)`
                : `Speech Heavy (${(100 - currentBalance) * 2}% / ${(currentBalance - 50) * 2 + 100}%)`}
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={currentBalance}
              onChange={handleBalanceChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-hidden"
              id="volume-balance-slider"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>🔊 Full Chime / No Speech</span>
              <span>Equal Balance</span>
              <span>No Chime / Full Speech 🔊</span>
            </div>
          </div>

          <div className="flex gap-3 p-3.5 bg-purple-500/5 rounded-xl border border-purple-500/10 text-[11px] text-slate-300 leading-relaxed">
            <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p>
              Adjusting this slider controls the relative volume gain. Moving to the left makes the chime alert loud and clear while softening the voice clone readout. Moving to the right emphasizes natural speech readout over the chime intro.
            </p>
          </div>
        </div>
      )}

      {/* Play Test Sequence */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-left">
          <span className="text-xs font-extrabold text-slate-300 block">Test Your Configuration</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">
            Hear how the chime and TTS voice blend together in a simulated WhatsApp coffee invite.
          </span>
        </div>

        <button
          type="button"
          onClick={isPlayingTestSequence || isPlayingChime ? stopActivePlayback : handleTestSequence}
          className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border ${
            isPlayingTestSequence || isPlayingChime
              ? 'bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-transparent shadow-emerald-500/10'
          }`}
          id="test-chime-sequence-btn"
        >
          {isPlayingTestSequence || isPlayingChime ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Stop Sound Playback
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-current" />
              Test Full Sequence
            </>
          )}
        </button>
      </div>
    </div>
  );
}
