export interface AccentPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  langPrefixes: string[];
  defaultPitch: number;
  defaultRate: number;
  samplePhrase: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'default',
    name: 'Standard System Voice',
    emoji: '🤖',
    description: 'The default natural text-to-speech voice configured on your active system.',
    langPrefixes: [],
    defaultPitch: 1.0,
    defaultRate: 1.0,
    samplePhrase: 'Hello, I will read out your mobile notifications clearly.'
  },
  {
    id: 'indian',
    name: 'Aarav (Indian English)',
    emoji: '🇮🇳',
    description: 'A polite, clear, and articulate Indian English cadence. Speaks with natural rhythm and rising tones.',
    langPrefixes: ['en-IN', 'hi-IN'],
    defaultPitch: 1.15,
    defaultRate: 0.95,
    samplePhrase: 'Namaste! I will announce your WhatsApp and Gmail notifications now.'
  },
  {
    id: 'nigerian',
    name: 'Amara (Nigerian Accent)',
    emoji: '🇳🇬',
    description: 'A vibrant, warm, and highly expressive West African accent with rhythmic, melodic syllable stresses.',
    langPrefixes: ['en-NG', 'yo-NG', 'ha-NG', 'ig-NG'],
    defaultPitch: 0.95,
    defaultRate: 1.05,
    samplePhrase: 'Welcome. I am ready to read your messages for you. Let us get started!'
  },
  {
    id: 'countryside',
    name: 'Bobby (Countryside Drawl)',
    emoji: '🤠',
    description: 'A relaxed, slow-paced Southern countryside drawl with warm, folk-like low-pitched tones.',
    langPrefixes: ['en-US', 'en-GB'],
    defaultPitch: 0.82,
    defaultRate: 0.85,
    samplePhrase: 'Howdy! I am going to slow down and read them notifications for you, nice and easy.'
  },
  {
    id: 'russian',
    name: 'Dmitri (Russian Accent)',
    emoji: '🇷🇺',
    description: 'A deep, bold, and resonant Russian-cadenced English. Strong consonants with low, steady pacing.',
    langPrefixes: ['ru-RU', 'en-RU'],
    defaultPitch: 0.88,
    defaultRate: 0.92,
    samplePhrase: 'Standing by. I will transmit and read incoming alerts from system database.'
  },
  {
    id: 'british',
    name: 'Alastair (British RP)',
    emoji: '🇬🇧',
    description: 'A formal, highly sophisticated British Received Pronunciation voice with precise enunciation and noble tones.',
    langPrefixes: ['en-GB', 'en-IE'],
    defaultPitch: 1.05,
    defaultRate: 0.98,
    samplePhrase: 'Good day. I shall proceed to recite your correspondence with utmost diligence.'
  },
  {
    id: 'australian',
    name: 'Kylie (Australian Accent)',
    emoji: '🇦🇺',
    description: 'A friendly, high-energy Australian accent with upward pitch inflections on sentence endings.',
    langPrefixes: ['en-AU', 'en-NZ'],
    defaultPitch: 1.12,
    defaultRate: 1.05,
    samplePhrase: 'G\'day mate! I will read out your latest messages and notifications as they land.'
  },
  {
    id: 'french',
    name: 'Chloé (French Accent)',
    emoji: '🇫🇷',
    description: 'A smooth, soft French-accented English readout with gentle cadence and flowing syllables.',
    langPrefixes: ['fr-FR', 'en-FR'],
    defaultPitch: 1.05,
    defaultRate: 0.90,
    samplePhrase: 'Bonjour. I will read your notifications with a elegant, relaxed speed.'
  },
  {
    id: 'japanese',
    name: 'Yuki (Japanese Accent)',
    emoji: '🇯🇵',
    description: 'A polite, clear Japanese-accented English with high clarity and steady tempo.',
    langPrefixes: ['ja-JP', 'en-JP'],
    defaultPitch: 1.20,
    defaultRate: 1.00,
    samplePhrase: 'Konnichiwa. Your notifications are synchronized and ready to announce.'
  }
];

export function findMatchingVoice(voices: SpeechSynthesisVoice[], presetId: string): SpeechSynthesisVoice | null {
  const preset = ACCENT_PRESETS.find(p => p.id === presetId);
  if (!preset || !preset.langPrefixes || preset.langPrefixes.length === 0) {
    return null;
  }
  
  // 1. Try to find an exact language match
  for (const prefix of preset.langPrefixes) {
    const matched = voices.find(v => v.lang.toLowerCase() === prefix.toLowerCase());
    if (matched) return matched;
  }
  
  // 2. Try to find a loose match starting with prefix (e.g. en-IN in en-IN-Premium)
  for (const prefix of preset.langPrefixes) {
    const matched = voices.find(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
    if (matched) return matched;
  }

  // 3. Try to find language code match (e.g. "ru" for "ru-RU")
  for (const prefix of preset.langPrefixes) {
    const languageCode = prefix.split('-')[0].toLowerCase();
    const matched = voices.find(v => v.lang.toLowerCase().startsWith(languageCode));
    if (matched) return matched;
  }
  
  return null;
}
