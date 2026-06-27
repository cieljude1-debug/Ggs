import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { saveVoiceProfile } from '../lib/indexedDb';
import { VoiceProfile } from '../types';
import { checkAudioQuality } from '../lib/audioQualityChecker';

interface AudioImportProps {
  onProfileImported: (profile: VoiceProfile) => void;
}

export default function AudioImport({ onProfileImported }: AudioImportProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAudioFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Invalid file type. Please select an audio file (MP3, WAV, M4A, etc.).');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Analyze the file's audio quality
      const qualityResult = await checkAudioQuality(file);
      if (!qualityResult.isValid) {
        setError(`Import rejected: ${qualityResult.reason}`);
        setIsProcessing(false);
        return;
      }

      const duration = qualityResult.metrics?.duration || 1;

      // Save to IndexedDB
      const profile = await saveVoiceProfile({
        id: `import_${Date.now()}`,
        name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        type: 'import',
        blob: file,
        duration: duration,
      });

      onProfileImported(profile);
      setSuccessMsg(`"${profile.name}" passed quality checks and was imported successfully!`);
    } catch (err: any) {
      console.error('Error importing audio file:', err);
      setError('Could not read or process the audio file. Make sure the file is not corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAudioDurationFallback = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      });
      audio.addEventListener('error', () => {
        resolve(0);
        URL.revokeObjectURL(url);
      });
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl text-slate-100" id="audio-import-module">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-purple-400" />
          Import Audio File
        </h3>
      </div>

      <p className="text-xs text-slate-300 mb-6 leading-relaxed">
        Upload pre-recorded voice files or ringtones from your computer to use as personalized alerts. Fully encrypted and stored entirely in your local browser storage.
      </p>

      {error && (
        <div className="bg-red-500/10 text-red-200 p-3 rounded-xl text-xs mb-4 flex items-start gap-2 border border-red-500/20 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 text-emerald-300 p-3 rounded-xl text-xs mb-4 flex items-start gap-2 border border-emerald-500/20 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
          isDragActive
            ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
            : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
        }`}
        id="drag-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mb-3" />
            <span className="text-sm font-medium text-white">Decoding and storing audio...</span>
            <span className="text-xs text-slate-400 mt-1">Measuring duration and structuring buffers</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 text-purple-400 flex items-center justify-center mb-3">
              <FileAudio className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-200">
              Drag & drop audio here, or <span className="text-purple-400 underline font-semibold">browse</span>
            </span>
            <span className="text-xs text-slate-400 mt-1">Supports MP3, WAV, M4A, OGG up to 25MB</span>
          </div>
        )}
      </div>
    </div>
  );
}
