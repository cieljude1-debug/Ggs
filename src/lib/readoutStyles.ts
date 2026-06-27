import { AppNotification, AppName } from '../types';
import { SUPPORTED_APPS } from './constants';

export type ReadingStyle = 
  | 'natural' 
  | 'casual' 
  | 'professional' 
  | 'discreet' 
  | 'urgent' 
  | 'storyteller' 
  | 'sarcastic';

export interface ReadingStyleMeta {
  id: ReadingStyle;
  name: string;
  emoji: string;
  description: string;
  sampleText: string;
}

export const READING_STYLES: ReadingStyleMeta[] = [
  {
    id: 'natural',
    name: 'Natural / Narrative',
    emoji: '😊',
    description: 'A standard, human conversational readout that is natural and clear.',
    sampleText: 'Jessica Martinez on WhatsApp says: Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'casual',
    name: 'Casual / Chatty',
    emoji: '💬',
    description: 'A warm, relaxed, friendly companion style that is chatty and informal.',
    sampleText: 'Hey! Jessica Martinez pinged you on WhatsApp and said: Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'professional',
    name: 'Professional Assistant',
    emoji: '💼',
    description: 'A formal broadcasting assistant tone, ideal for busy work hours or hands-free driving.',
    sampleText: 'Incoming transmission on WhatsApp from Jessica Martinez. The message content reads: Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'discreet',
    name: 'Discreet / Minimal',
    emoji: '🤫',
    description: 'A quiet, short-and-sweet style that keeps it quick and non-obtrusive.',
    sampleText: 'Psst... Jessica Martinez, WhatsApp. Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'urgent',
    name: 'Urgent / Alert',
    emoji: '🚨',
    description: 'An attention-grabbing, direct alert style for important updates.',
    sampleText: 'Alert! Urgent update from Jessica Martinez on WhatsApp: Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'storyteller',
    name: 'Dramatic Storyteller',
    emoji: '📖',
    description: 'A playful narrative style that reads notifications like they are stories.',
    sampleText: 'In your WhatsApp messages, Jessica Martinez wrote to you, quote: Hey! Are we still meeting for coffee at 2 PM today?',
  },
  {
    id: 'sarcastic',
    name: 'Playful / Witty Assistant',
    emoji: '😏',
    description: 'A fun, slightly cheeky assistant style to brighten your day.',
    sampleText: 'Look who is talking! It is Jessica Martinez on WhatsApp. They are saying: Hey! Are we still meeting for coffee at 2 PM today?',
  },
];

export function sanitizeForTTS(text: string, isSender: boolean = false): string {
  if (!text) return '';

  let cleaned = text;

  // If we are sanitizing a sender name (like a contact)
  if (isSender) {
    // Rephrase "Mom ❤️" or "Mom heart" or "Mom heavy black heart" to just "Mom"
    cleaned = cleaned.replace(/\bMom\s*(❤️|❤|heavy black heart|red heart|heart|💕|💖|👩|👵)?/gi, 'Mom');
    
    // Also handle other common relationship tags nicely
    cleaned = cleaned.replace(/\bDad\s*(❤️|❤|heavy black heart|red heart|heart|👨|👴)?/gi, 'Dad');
    cleaned = cleaned.replace(/\bSis\s*(❤️|❤|heart|👩|👧)?/gi, 'Sis');
    cleaned = cleaned.replace(/\bBro\s*(❤️|❤|heart|👨|👦)?/gi, 'Bro');
    cleaned = cleaned.replace(/\bWife\s*(❤️|❤|heart|💍|👰)?/gi, 'Wife');
    cleaned = cleaned.replace(/\bHubby\s*(❤️|❤|heart|💍|🤵)?/gi, 'Hubby');
    cleaned = cleaned.replace(/\bBabe\s*(❤️|❤|heart|😘|👩‍❤️‍👨)?/gi, 'Babe');
    cleaned = cleaned.replace(/\bHoney\s*(❤️|❤|heart|🍯|🐝)?/gi, 'Honey');
  }

  // Remove any remaining raw word translations of hearts that some TTS engines read literally
  cleaned = cleaned.replace(/\b(heavy red heart|heavy black heart|red heart|black heart|heart emoji)\b/gi, '');

  // Strip emojis and high unicode symbols by filtering code points
  let result = '';
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.codePointAt(i);
    if (code === undefined) continue;

    // If it's a surrogate pair, skip the extra index to avoid reading it again
    if (code > 0xffff) {
      i++;
    }

    // Identify if the code point belongs to typical emoji/symbol ranges
    const isEmoji = 
      (code >= 0x1f300 && code <= 0x1faff) || // Misc Symbols/Pictographs, Emoticons, Symbols
      (code >= 0x2600 && code <= 0x27bf) ||   // Misc Symbols & Dingbats
      (code >= 0xfe00 && code <= 0xfe0f) ||   // Variation Selectors
      (code >= 0x1f900 && code <= 0x1f9ff) || // Supplemental Symbols
      (code >= 0x1f600 && code <= 0x1f64f) || // Emoticons
      (code >= 0x1f680 && code <= 0x1f6ff) || // Transport
      (code >= 0x2000 && code <= 0x206f) ||   // General Punctuation (invisible formatting/layouts)
      code === 0x200d;                        // ZWJ

    if (!isEmoji) {
      result += String.fromCodePoint(code);
    }
  }

  // Clean up any remaining extra spacing or orphaned punctuation
  result = result.replace(/\s+/g, ' ').trim();
  
  // If we ended up with nothing (e.g. only emojis were present), fallback to a friendly default
  if (!result) {
    return isSender ? 'Someone' : 'a message';
  }

  return result;
}

export function generateSpeechText(
  notification: AppNotification,
  readContent: 'all' | 'sender_only' | 'summary_only',
  style: ReadingStyle = 'natural'
): string {
  const appDisplayName = SUPPORTED_APPS[notification.appName]?.displayName || notification.appName;
  const sender = sanitizeForTTS(notification.title || 'Someone', true);
  const body = sanitizeForTTS(notification.body || 'no text', false);

  switch (style) {
    case 'casual':
      if (readContent === 'summary_only') {
        return `Heads up! There is a new ping on ${appDisplayName}.`;
      }
      if (readContent === 'sender_only') {
        return `Hey, looks like ${sender} is trying to reach you on ${appDisplayName}.`;
      }
      return `Hey! ${sender} pinged you on ${appDisplayName} and said: ${body}`;

    case 'professional':
      if (readContent === 'summary_only') {
        return `System notice: ${appDisplayName} has received a new alert.`;
      }
      if (readContent === 'sender_only') {
        return `A new communication has arrived on ${appDisplayName} from ${sender}.`;
      }
      return `Incoming transmission on ${appDisplayName} from ${sender}. The message content reads: ${body}`;

    case 'discreet':
      if (readContent === 'summary_only') {
        return `${appDisplayName} update.`;
      }
      if (readContent === 'sender_only') {
        return `Quick note from ${sender} on ${appDisplayName}.`;
      }
      return `Psst... ${sender}, ${appDisplayName}. ${body}`;

    case 'urgent':
      if (readContent === 'summary_only') {
        return `Priority alert! Action needed on ${appDisplayName}.`;
      }
      if (readContent === 'sender_only') {
        return `Attention required: incoming notification from ${sender} on ${appDisplayName}.`;
      }
      return `Alert! Urgent update from ${sender} on ${appDisplayName}: ${body}`;

    case 'storyteller':
      if (readContent === 'summary_only') {
        return `A new chapter unfolds in your ${appDisplayName} alerts.`;
      }
      if (readContent === 'sender_only') {
        return `You have a new story update from ${sender} on ${appDisplayName}.`;
      }
      return `In your ${appDisplayName} messages, ${sender} wrote to you, quote: ${body}`;

    case 'sarcastic':
      if (readContent === 'summary_only') {
        return `Great news, your beloved ${appDisplayName} app has another alert for you.`;
      }
      if (readContent === 'sender_only') {
        return `Oh look, ${sender} is bothering you on ${appDisplayName} again.`;
      }
      return `Look who is talking! It is ${sender} on ${appDisplayName}. They are saying: ${body}`;

    case 'natural':
    default:
      if (readContent === 'summary_only') {
        return `Attention, you have a new notification from ${appDisplayName}.`;
      }
      if (readContent === 'sender_only') {
        return `You have got a message on ${appDisplayName} from ${sender}.`;
      }
      return `${sender} on ${appDisplayName} says: ${body}`;
  }
}
