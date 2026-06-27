export type AppName = 'WhatsApp' | 'Gmail' | 'Slack' | 'Discord' | 'Calendar' | 'System';

export interface AppNotification {
  id: string;
  appName: AppName;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  speakerPlayed?: boolean;
  mutedByKeyword?: string; // If muted by a keyword filter
}

export interface VoiceProfile {
  id: string;
  name: string;
  type: 'record' | 'import' | 'default';
  blob?: Blob;
  url: string; // Object URL for preview/playback
  duration: number; // in seconds
  createdAt: string;
}

export interface AppVoiceConfig {
  appName: AppName;
  voiceProfileId: string; // 'tts' or ID of custom voice profile
  pitchShift: number; // Pitch offset in semitones (-12 to +12)
  speed: number; // Playback speed (0.5 to 2.5)
  volume: number; // 0 to 1
  enabled: boolean;
  readContent: 'all' | 'sender_only' | 'summary_only';
  readingStyle?: 'natural' | 'professional' | 'casual' | 'discreet' | 'urgent';
}

export interface TTSConfig {
  voiceURI: string; // Native speech synthesis voice URI
  pitch: number; // Native TTS pitch (0.5 to 2.0)
  rate: number; // Native TTS speed rate (0.5 to 2.5)
  volume: number; // 0 to 1
  accentId?: string; // Selected accent preset ID
  agcEnabled?: boolean; // Automatic Gain Control toggle
  chimeId?: string; // 'none' or preset chime ID
  chimeVolumeBalance?: number; // Volume balance percentage between Chime and TTS (0-100, 50 is balanced)
  proximityMuteEnabled?: boolean; // Toggle for gesture / proximity based muting
}

export interface DNDConfig {
  enabled: boolean;
  startTime: string; // "HH:MM" 24h format
  endTime: string;   // "HH:MM" 24h format
}

export interface AppInfo {
  name: AppName;
  displayName: string;
  color: string;
  iconName: string;
  defaultSender: string;
  defaultBody: string;
}

export interface PlayStoreSimConfig {
  notificationAccess: boolean;
  batteryOptimizationsBypassed: boolean;
  foregroundServiceNotification: boolean;
}

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

export interface BillingState {
  plan: SubscriptionPlan;
  isTrial: boolean;
  trialDaysLeft: number;
  expiryDate: string | null;
  paymentMethod: string | null;
  status: 'active' | 'cancelled' | 'none';
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  isPremium?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  mode: 'live' | 'simulated';
}

export interface MutedKeyword {
  id: string;
  pattern: string; // The keyword or phrase to mute (e.g. 'Marketing')
  enabled: boolean;
  matchCount: number; // Number of notifications muted by this keyword
}



