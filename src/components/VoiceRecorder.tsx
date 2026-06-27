import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Save, Volume2, Music, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { saveVoiceProfile } from '../lib/indexedDb';
import { VoiceProfile } from '../types';
import { checkAudioQuality } from '../lib/audioQualityChecker';

interface VoiceRecorderProps {
  onProfileSaved: (profile: VoiceProfile) => void;
}

export default function VoiceRecorder({ onProfileSaved }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(30).fill(10));
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clean up streams and recordings on unmount
  useEffect(() => {
    return () => {
      stopStreams();
    };
  }, []);

  const stopStreams = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setQualityError(null);
      setIsSaved(false);
      setRecordedBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setRecordingTime(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start Web Audio visualizer
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert audio frequency data to simplified bar heights (0-100 scale)
        const levels: number[] = [];
        const step = Math.ceil(bufferLength / 30);
        for (let i = 0; i < 30; i++) {
          let sum = 0;
          const start = i * step;
          for (let j = 0; j < step && (start + j) < bufferLength; j++) {
            sum += dataArray[start + j];
          }
          const val = Math.max(12, Math.round((sum / step) * 0.4));
          levels.push(val);
        }
        setAudioLevel(levels);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      
      updateVisualizer();

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsAnalyzing(true);
        setQualityError(null);
        setError(null);

        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          const result = await checkAudioQuality(blob);
          setIsAnalyzing(false);

          if (!result.isValid) {
            setQualityError(result.reason || 'Audio quality check failed.');
            setRecordedBlob(null);
            setPreviewUrl(null);
            return;
          }

          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          
          // Auto-name recording
          const defaultName = `Voice Alert ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
          setCustomName(defaultName);
        } catch (err: any) {
          console.error('Error checking audio quality:', err);
          setIsAnalyzing(false);
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          
          const defaultName = `Voice Alert ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
          setCustomName(defaultName);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please enable microphone permission in your browser.'
          : 'Could not access microphone. Make sure it is connected and supported by your browser.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopStreams();
  };

  const saveRecording = async () => {
    if (!recordedBlob || !customName.trim()) return;

    try {
      const profile = await saveVoiceProfile({
        id: `voice_${Date.now()}`,
        name: customName.trim(),
        type: 'record',
        blob: recordedBlob,
        duration: recordingTime || 1,
      });

      onProfileSaved(profile);
      setIsSaved(true);
      setCustomName('');
      // Keep state so they can see success
    } catch (err: any) {
      console.error('Error saving recording:', err);
      setError('Failed to save recording to your local device database.');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl text-slate-100" id="voice-recorder-module">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Mic className="w-5 h-5 text-emerald-400" />
          Local Voice Recorder
        </h3>
        <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono px-2 py-1 rounded-full flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
          {isRecording ? 'RECORDING' : 'READY'}
        </span>
      </div>

      <p className="text-xs text-slate-300 mb-6 leading-relaxed">
        Record short cues (e.g. "Yo! New SMS!", "Attention, Slack Alert") using your microphone. Processing and saving happens 100% locally in your browser sandbox.
      </p>

      {error && (
        <div className="bg-red-500/10 text-red-200 p-3 rounded-xl text-xs mb-4 leading-relaxed border border-red-500/20">
          {error}
        </div>
      )}

      {/* Visualizer and Status Display */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden mb-6">
        {isRecording ? (
          <div className="flex flex-col items-center w-full z-10">
            {/* Live Waveform representation */}
            <div className="flex items-end justify-center gap-1.5 h-14 w-full mb-4">
              {audioLevel.map((lvl, index) => (
                <div
                  key={index}
                  className="w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 transition-all duration-75"
                  style={{ height: `${lvl}%` }}
                />
              ))}
            </div>
            <span className="text-2xl font-semibold font-mono text-white animate-pulse">
              {formatTime(recordingTime)}
            </span>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center text-center animate-fadeIn z-10">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
            <span className="text-sm font-medium text-white">Analyzing Audio Quality...</span>
            <span className="text-xs text-slate-400 mt-1">Verifying volume, clarity, and duration</span>
          </div>
        ) : qualityError ? (
          <div className="flex flex-col items-center text-center px-4 animate-fadeIn z-10">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-rose-400">Quality Rejected</span>
            <span className="text-xs text-slate-300 mt-1 max-w-xs">{qualityError}</span>
            <span className="text-[10px] text-slate-400 mt-2 font-mono">Please re-record a higher quality clip</span>
          </div>
        ) : recordedBlob ? (
          <div className="flex flex-col items-center w-full z-10">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-white">Recording captured successfully</span>
            <span className="text-xs text-slate-400 mt-1 font-mono">
              {formatTime(recordingTime)} • {(recordedBlob.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 text-emerald-400 border border-white/5 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-200">Click below to start recording</span>
            <span className="text-xs text-slate-400 mt-1">High quality, low latency local capture</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex justify-center gap-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20"
            id="start-recording-btn"
          >
            <Mic className="w-4 h-4" />
            Record Voice
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-tr from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white text-sm font-medium transition shadow-lg shadow-red-500/20"
            id="stop-recording-btn"
          >
            <Square className="w-4 h-4 animate-ping" />
            Stop Recording
          </button>
        )}
      </div>

      {/* Save Settings Form */}
      {recordedBlob && !isSaved && (
        <div className="border-t border-white/10 pt-5 animate-fadeIn">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Custom Name
            </label>
            <input
              type="text"
              className="w-full text-sm bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="e.g. My General Voice Announcement"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setRecordedBlob(null);
                setPreviewUrl(null);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-white/10 hover:bg-white/5 active:scale-98 rounded-xl text-xs font-medium text-slate-300 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard
            </button>
            <button
              onClick={saveRecording}
              disabled={!customName.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-98 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save to Device
            </button>
          </div>
        </div>
      )}

      {isSaved && (
        <div className="border-t border-white/10 pt-4 text-center animate-fadeIn">
          <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Successfully saved! Available in the settings above.
          </p>
          <button
            onClick={() => {
              setIsSaved(false);
              setRecordedBlob(null);
              setPreviewUrl(null);
            }}
            className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-medium"
          >
            Record another clip
          </button>
        </div>
      )}
    </div>
  );
}
