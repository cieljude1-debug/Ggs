/**
 * Synthesizes high-quality chimes/intro sounds using Web Audio API
 */
export interface ChimeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const PRESET_CHIMES: ChimeDefinition[] = [
  { id: 'ping', name: 'Digital Ping', description: 'A short modern digital beep', emoji: '🔔' },
  { id: 'double', name: 'Double Chime', description: 'Two harmonious high-quality notes', emoji: '🎵' },
  { id: 'bell', name: 'Ambient Bell', description: 'A deep resonant service bell decay', emoji: '🔮' },
  { id: 'triad', name: 'Ascending Triad', description: 'Three rapid cheerful ascending tones', emoji: '✨' },
  { id: 'sweep', name: 'Space Sweep', description: 'A futuristic ascending frequency sweep', emoji: '🚀' },
];

export function playSynthesizedChime(
  context: AudioContext,
  chimeId: string,
  volume: number,
  onEnded?: () => void
): { stop: () => void } {
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0, context.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.02);
  masterGain.connect(context.destination);

  let duration = 0.5; // default duration

  const cleanup = () => {
    oscs.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
      osc.disconnect();
    });
    gains.forEach(g => g.disconnect());
    try {
      masterGain.disconnect();
    } catch (e) {}
  };

  const scheduleStop = (delay: number) => {
    const timer = setTimeout(() => {
      cleanup();
      if (onEnded) onEnded();
    }, delay * 1000);
    return timer;
  };

  const now = context.currentTime;
  let stopTimer: NodeJS.Timeout | null = null;

  switch (chimeId) {
    case 'ping': {
      duration = 0.4;
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5 note
      
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      osc.connect(gain);
      gain.connect(masterGain);
      oscs.push(osc);
      gains.push(gain);
      
      osc.start(now);
      stopTimer = scheduleStop(duration);
      break;
    }
    case 'double': {
      duration = 0.6;
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain1 = context.createGain();
      const gain2 = context.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(1, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      oscs.push(osc1, osc2);
      gains.push(gain1, gain2);

      osc1.start(now);
      osc2.start(now + 0.15);
      stopTimer = scheduleStop(duration + 0.05);
      break;
    }
    case 'bell': {
      duration = 1.2;
      const f1 = 440; // A4
      const f2 = 440 * 1.5; // Fifth (E5)
      const f3 = 440 * 2.0; // Octave (A5)

      const frequencies = [f1, f2, f3];
      const mix = [0.6, 0.3, 0.2];

      frequencies.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(mix[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration - (idx * 0.2));

        osc.connect(gain);
        gain.connect(masterGain);

        oscs.push(osc);
        gains.push(gain);
        osc.start(now);
      });

      stopTimer = scheduleStop(duration);
      break;
    }
    case 'triad': {
      duration = 0.7;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const intervals = [0, 0.1, 0.2];

      notes.forEach((freq, idx) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + intervals[idx]);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.8, now + intervals[idx]);
        gain.gain.exponentialRampToValueAtTime(0.001, now + intervals[idx] + 0.35);

        osc.connect(gain);
        gain.connect(masterGain);

        oscs.push(osc);
        gains.push(gain);
        osc.start(now + intervals[idx]);
      });

      stopTimer = scheduleStop(duration + 0.1);
      break;
    }
    case 'sweep': {
      duration = 0.5;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      oscs.push(osc);
      gains.push(gain);
      osc.start(now);

      stopTimer = scheduleStop(duration);
      break;
    }
    default: {
      if (onEnded) onEnded();
      break;
    }
  }

  return {
    stop: () => {
      if (stopTimer) clearTimeout(stopTimer);
      cleanup();
    }
  };
}
