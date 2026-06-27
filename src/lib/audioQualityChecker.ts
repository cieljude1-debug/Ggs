export interface AudioQualityResult {
  isValid: boolean;
  reason?: string;
  metrics?: {
    duration: number;
    peakAmplitude: number;
    rms: number;
    clippingRatio: number;
  };
}

/**
 * Analyzes an audio blob/file for quality metrics:
 * 1. Duration check (reject if < 0.5 seconds)
 * 2. Peak amplitude check (reject if < 0.02 - silent/extremely quiet)
 * 3. Clipping check (reject if clipping ratio > 15% - heavy distortion)
 */
export async function checkAudioQuality(blob: Blob): Promise<AudioQualityResult> {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (decodeErr) {
      audioCtx.close();
      return {
        isValid: false,
        reason: 'Failed to decode audio. The file format is invalid, corrupted, or unsupported.'
      };
    }
    
    const duration = audioBuffer.duration;
    
    // Check 1: Duration too short
    if (duration < 0.5) {
      audioCtx.close();
      return {
        isValid: false,
        reason: 'Audio is too short (under 0.5 seconds). Please record a longer alert.',
        metrics: { duration, peakAmplitude: 0, rms: 0, clippingRatio: 0 }
      };
    }
    
    const pcm = audioBuffer.getChannelData(0);
    const length = pcm.length;
    
    if (length === 0) {
      audioCtx.close();
      return {
        isValid: false,
        reason: 'The audio track is completely empty.',
        metrics: { duration, peakAmplitude: 0, rms: 0, clippingRatio: 0 }
      };
    }
    
    // Subsample up to 10,000 samples to keep performance lightning-fast
    const step = Math.max(1, Math.floor(length / 10000));
    let peakAmplitude = 0;
    let sumSquares = 0;
    let clipCount = 0;
    let count = 0;
    
    for (let i = 0; i < length; i += step) {
      const sample = pcm[i];
      const absVal = Math.abs(sample);
      
      if (absVal > peakAmplitude) {
        peakAmplitude = absVal;
      }
      sumSquares += sample * sample;
      
      // Values close to 1.0 indicate clipping
      if (absVal > 0.98) {
        clipCount++;
      }
      count++;
    }
    
    const rms = Math.sqrt(sumSquares / count);
    const clippingRatio = clipCount / count;
    
    audioCtx.close();
    
    // Check 2: Too quiet / pure silence
    if (peakAmplitude < 0.02) {
      return {
        isValid: false,
        reason: 'Audio is too quiet or silent. Please check your mic volume or upload a louder file.',
        metrics: { duration, peakAmplitude, rms, clippingRatio }
      };
    }
    
    // Check 3: Severe clipping distortion (e.g. mic blowing, static noise, overdrive)
    if (clippingRatio > 0.15) {
      return {
        isValid: false,
        reason: 'Audio is severely distorted/clipping. Please lower your recording input or use a cleaner file.',
        metrics: { duration, peakAmplitude, rms, clippingRatio }
      };
    }
    
    return {
      isValid: true,
      metrics: { duration, peakAmplitude, rms, clippingRatio }
    };
  } catch (err: any) {
    console.error('Audio quality analysis exception:', err);
    return {
      isValid: false,
      reason: `Quality analysis failed: ${err.message || 'Unknown error'}`
    };
  }
}
