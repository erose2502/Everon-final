// Language Detection and Multi-language Support Utilities

export interface LanguageConfig {
  code: string;
  name: string;
  voiceCode: string; // For TTS
  speechRecognitionCode: string; // For speech recognition
  greeting: string;
  systemPromptAddition: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  auto: {
    code: 'auto',
    name: 'Auto-detect',
    voiceCode: 'en-US',
    speechRecognitionCode: 'en-US',
    greeting: 'Hello! I can communicate in multiple languages.',
    systemPromptAddition: 'Automatically detect the user\'s language and respond in the same language. Support English, French, Arabic, Spanish, Swahili, Chinese, Swedish, Twi, and Fante.'
  },
  english: {
    code: 'en',
    name: 'English',
    voiceCode: 'en-US',
    speechRecognitionCode: 'en-US',
    greeting: 'Hello! I\'m Everon, your AI career coach.',
    systemPromptAddition: 'Respond in English only.'
  },
  french: {
    code: 'fr',
    name: 'Français',
    voiceCode: 'fr-FR',
    speechRecognitionCode: 'fr-FR',
    greeting: 'Bonjour! Je suis Everon, votre conseiller en carrière IA.',
    systemPromptAddition: 'Répondez en français uniquement. Vous êtes un expert en recrutement et conseil en carrière.'
  },
  arabic: {
    code: 'ar',
    name: 'العربية',
    voiceCode: 'ar-SA',
    speechRecognitionCode: 'ar-SA',
    greeting: 'مرحباً! أنا إيفرون، مستشار المهن الذكي الخاص بك.',
    systemPromptAddition: 'الرد باللغة العربية فقط. أنت خبير في التوظيف والاستشارات المهنية.'
  },
  spanish: {
    code: 'es',
    name: 'Español',
    voiceCode: 'es-ES',
    speechRecognitionCode: 'es-ES',
    greeting: '¡Hola! Soy Everon, tu consejero de carrera con IA.',
    systemPromptAddition: 'Responde solo en español. Eres un experto en reclutamiento y asesoramiento profesional.'
  },
  swahili: {
    code: 'sw',
    name: 'Kiswahili',
    voiceCode: 'en-US', // Use English TTS as fallback for Swahili
    speechRecognitionCode: 'sw-KE',
    greeting: 'Hujambo! Mimi ni Everon, mshauri wako wa kazi wa AI.',
    systemPromptAddition: 'Jibu kwa Kiswahili tu. Wewe ni mtaalamu wa ajira na ushauri wa kazi.'
  },
  chinese: {
    code: 'zh',
    name: '中文',
    voiceCode: 'zh-CN',
    speechRecognitionCode: 'zh-CN',
    greeting: '你好！我是Everon，你的AI职业顾问。',
    systemPromptAddition: '只用中文回答。你是招聘和职业咨询专家。'
  },
  swedish: {
    code: 'sv',
    name: 'Svenska',
    voiceCode: 'sv-SE',
    speechRecognitionCode: 'sv-SE',
    greeting: 'Hej! Jag är Everon, din AI-karriärcoach.',
    systemPromptAddition: 'Svara endast på svenska. Du är expert på rekrytering och karriärrådgivning.'
  },
  twi: {
    code: 'tw',
    name: 'Twi',
    voiceCode: 'en-US', // Use English TTS as fallback for Twi
    speechRecognitionCode: 'en-US', // Fallback to English for speech recognition
    greeting: 'Maakye! Me din de Everon, me yɛ wo AI adwumayɛfo kafo.',
    systemPromptAddition: 'Respond in Twi only. You are an expert in recruitment and career counseling.'
  },
  fante: {
    code: 'fat',
    name: 'Fante',
    voiceCode: 'en-US', // Use English TTS as fallback for Fante
    speechRecognitionCode: 'en-US', // Fallback to English for speech recognition
    greeting: 'Mema wo akye! Me din de Everon, meyɛ wo AI adwuma kafo.',
    systemPromptAddition: 'Respond in Fante only. You are an expert in recruitment and career counseling.'
  }
};

// Enhanced language detection patterns
const LANGUAGE_PATTERNS = {
  french: /\b(bonjour|salut|merci|bonsoir|ça va|comment|allez|vous|travail|emploi|poste|carrière|français|je|suis|cherche|travaille|dans|une|un|le|la|les|de|du|des|pour|avec|sur|par|en|au|aux|ce|cette|ces|oui|non|très|bien|mal|avoir|être|faire|aller|venir|voir|savoir|pouvoir|vouloir|devoir)\b/i,
  arabic: /[\u0600-\u06FF]|مرحبا|السلام|وظيفة|عمل|شغل|كيف|الحال|أهلا|مساء|صباح|الخير|شكرا|من|إلى|في|على|عن|مع|هذا|هذه|ذلك|تلك|أنا|أنت|هو|هي|نحن|أنتم|هم|هن/,
  spanish: /\b(hola|buenos|días|tardes|noches|gracias|por favor|disculpe|perdón|trabajo|empleo|puesto|carrera|español|busco|necesito|quiero|tengo|soy|estoy|en|el|la|los|las|un|una|unos|unas|de|del|por|para|con|sin|muy|más|menos|bien|mal|sí|no|qué|cómo|cuándo|dónde|quién|porque|también|pero|si|hacer|ir|venir|ser|estar|tener|haber|poder|querer|deber|decir|ver|saber)\b/i,
  swahili: /\b(hujambo|mambo|karibu|asante|sawa|pole|samahani|kazi|ajira|natafuta|ninahitaji|nina|niko|katika|kwa|na|ya|wa|la|za|cha|vya|pa|ku|mu|mimi|wewe|yeye|sisi|nyinyi|wao|nzuri|mbaya|ndio|hapana|nini|namna|lini|wapi|nani|kwa nini|pia|lakini|kama|kufanya|kwenda|kuja|kuwa|kuwepo|kuwa na|kuweza|kutaka|kulazimika|kusema|kuona|kujua)\b/i,
  chinese: /[\u4e00-\u9fff]|你好|您好|工作|职业|职位|招聘|求职|找工作|公司|薪水|经验|技能|简历|面试|我|你|他|她|我们|你们|他们|是|有|在|的|了|和|或者|但是|如果|因为|所以|什么|怎么|什么时候|哪里|为什么|也|很|非常|好|不好|是的|不是|谢谢|请|对不起/,
  swedish: /\b(hej|hallå|tack|ursäkta|förlåt|arbete|jobb|tjänst|karriär|svenska|söker|behöver|vill|har|är|i|på|av|för|med|utan|mycket|mer|mindre|bra|dåligt|ja|nej|vad|hur|när|var|vem|varför|också|men|om|göra|gå|komma|vara|ha|kan|ska|skulle|säga|se|veta|jag|du|han|hon|vi|ni|de)\b/i,
  twi: /\b(maakye|maaha|mema wo akye|medaase|wo ho te sɛn|yɛ|me|wo|ɔno|yɛn|mo|wɔn|adwuma|merehwehwɛ|mehia|mepɛ|me wɔ|me yɛ|wɔ|na|ne|a|ɛ|no|saa|dabi|ɛdeɛn|ɛyɛ dɛn|berɛ bɛn|ɛhe|hwan|ɛno nti|nso|sɛ|yɛ|kɔ|ba|tena|wɔ|tumi|pɛ|ka|hwɛ|nim)\b/i,
  fante: /\b(mema wo akye|maakye|medaase|wo ho te dɛn|yɛ|me|wo|ɔno|yɛn|mo|wɔn|edwuma|merehwehwɛ|mehia|mepɛ|me wɔ|meyɛ|wɔ|na|ne|a|ɛ|no|aane|daabi|dɛn|ɛyɛ dɛn|daa|he|hwan|nso|sɛ|yɛ|kɔ|ba|tena|wɔ|tumi|pɛ|ka|hwɛ|nim)\b/i,
  english: /\b(hello|hi|hey|good|morning|afternoon|evening|night|thanks|thank you|please|excuse me|sorry|job|work|career|position|looking|searching|need|want|have|am|is|are|in|on|at|the|a|an|and|or|but|if|to|for|with|without|very|more|less|good|bad|yes|no|what|how|when|where|who|why|also|make|go|come|be|have|can|will|should|say|see|know)\b/i
};

export function detectLanguage(text: string): string {
  console.log('🔍 Detecting language for:', text.substring(0, 50) + '...');
  
  const lowerText = text.toLowerCase();
  
  // Score each language based on pattern matches
  const scores = {
    arabic: (lowerText.match(LANGUAGE_PATTERNS.arabic) || []).length,
    french: (lowerText.match(LANGUAGE_PATTERNS.french) || []).length,
    spanish: (lowerText.match(LANGUAGE_PATTERNS.spanish) || []).length,
    swahili: (lowerText.match(LANGUAGE_PATTERNS.swahili) || []).length,
    chinese: (lowerText.match(LANGUAGE_PATTERNS.chinese) || []).length,
    swedish: (lowerText.match(LANGUAGE_PATTERNS.swedish) || []).length,
    twi: (lowerText.match(LANGUAGE_PATTERNS.twi) || []).length,
    fante: (lowerText.match(LANGUAGE_PATTERNS.fante) || []).length,
    english: (lowerText.match(LANGUAGE_PATTERNS.english) || []).length
  };
  
  console.log('🔍 Language scores:', scores);
  
  // Find the language with the highest score
  const detectedLang = Object.entries(scores).reduce((max, [lang, score]) => 
    score > max.score ? { language: lang, score } : max,
    { language: 'english', score: 0 }
  ).language;
  
  // Only switch if we have a confident detection (score > 0 for non-English)
  const minScore = detectedLang === 'english' ? 1 : 1; // Lower threshold for non-English
  
  if (scores[detectedLang as keyof typeof scores] >= minScore) {
    console.log(`🌍 Detected language: ${detectedLang} (confidence: ${scores[detectedLang as keyof typeof scores]})`);
    return detectedLang;
  }
  
  console.log('🌍 Using default: english (low confidence detection)');
  return 'english';
}

export function getSystemPrompt(language: string, isVoiceMode = false): string {
  const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.english;
  const basePrompt = isVoiceMode 
    ? `You are Everon, an active job recruiter and talent acquisition specialist! You're energetic, confident, and always thinking about job opportunities for candidates.

RECRUITER PERSONALITY: 
- Act like an experienced recruiter who knows the job market inside out
- Be proactive about suggesting roles and opportunities
- Ask about skills, experience, location preferences, and salary expectations
- Show enthusiasm about matching candidates with perfect opportunities
- Use recruiting language appropriate for the user's language

CONVERSATION APPROACH:
- Quickly assess their background and start suggesting relevant positions
- Ask targeted questions: location preference, salary range, remote/hybrid/onsite
- When they mention job search triggers, immediately offer to find opportunities
- Keep responses under 35 words, action-oriented, and recruiter-focused

Think like a top recruiter who wants to place every candidate in their dream job!`
    : `You are Everon, a job-focused career coach. Keep responses under 40 words. 

ANALYZE conversation for: job role, location, salary, experience. Only ask for missing information. If you have enough details, provide specific job advice or recommendations. Never repeat questions about information already provided.`;

  return `${basePrompt}\n\nLANGUAGE INSTRUCTION: ${config.systemPromptAddition}`;
}

export function getGreeting(language: string): string {
  const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.english;
  return config.greeting;
}

export function getTTSVoiceCode(language: string): string {
  const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.english;
  return config.voiceCode;
}

export function getSpeechRecognitionCode(language: string): string {
  const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.english;
  return config.speechRecognitionCode;
}

// Auto-detect language from user input and update language preference
export function autoDetectAndUpdateLanguage(
  text: string, 
  currentLanguage: string, 
  setLanguage: (lang: string) => void,
  setDetectedLang: (code: string) => void
): string {
  if (currentLanguage === 'auto') {
    const detectedLanguage = detectLanguage(text);
    
    // Always update to the detected language (including English)
    setLanguage(detectedLanguage);
    setDetectedLang(SUPPORTED_LANGUAGES[detectedLanguage].speechRecognitionCode);
    
    console.log(`🌍 Auto-detected and set language: ${detectedLanguage}`);
    return detectedLanguage;
  }
  return currentLanguage;
}