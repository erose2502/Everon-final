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
    systemPromptAddition: 'Automatically detect the user\'s language and respond in the same language. Support English, French, Arabic, Spanish, Swahili, Chinese, Swedish, Portuguese, Hindi, German, Japanese, and Korean.'
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
  portuguese: {
    code: 'pt',
    name: 'Português',
    voiceCode: 'pt-BR',
    speechRecognitionCode: 'pt-BR',
    greeting: 'Olá! Eu sou Everon, seu coach de carreira com IA.',
    systemPromptAddition: 'Responda apenas em português. Você é um especialista em recrutamento e aconselhamento de carreira.'
  },
  hindi: {
    code: 'hi',
    name: 'हिन्दी',
    voiceCode: 'hi-IN',
    speechRecognitionCode: 'hi-IN',
    greeting: 'नमस्ते! मैं एवरॉन हूं, आपका AI करियर कोच।',
    systemPromptAddition: 'केवल हिंदी में जवाब दें। आप भर्ती और करियर परामर्श के विशेषज्ञ हैं।'
  },
  german: {
    code: 'de',
    name: 'Deutsch',
    voiceCode: 'de-DE',
    speechRecognitionCode: 'de-DE',
    greeting: 'Hallo! Ich bin Everon, dein KI-Karrierecoach.',
    systemPromptAddition: 'Antworte nur auf Deutsch. Du bist Experte für Recruiting und Karriereberatung.'
  },
  japanese: {
    code: 'ja',
    name: '日本語',
    voiceCode: 'ja-JP',
    speechRecognitionCode: 'ja-JP',
    greeting: 'こんにちは！私はEveron、あなたのAIキャリアコーチです。',
    systemPromptAddition: '日本語のみで回答してください。あなたは採用とキャリアカウンセリングの専門家です。'
  },
  korean: {
    code: 'ko',
    name: '한국어',
    voiceCode: 'ko-KR',
    speechRecognitionCode: 'ko-KR',
    greeting: '안녕하세요! 저는 Everon, 당신의 AI 커리어 코치입니다.',
    systemPromptAddition: '한국어로만 답변하세요. 당신은 채용 및 경력 상담 전문가입니다.'
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
  portuguese: /\b(olá|oi|bom|dia|tarde|noite|obrigado|obrigada|por favor|desculpe|perdão|trabalho|emprego|vaga|carreira|português|procuro|preciso|quero|tenho|sou|estou|em|no|na|nos|nas|um|uma|uns|umas|o|a|os|as|de|do|da|dos|das|por|para|com|sem|muito|mais|menos|bom|ruim|sim|não|que|como|quando|onde|quem|porque|também|mas|se|fazer|ir|vir|ser|estar|ter|haver|poder|querer|dever|dizer|ver|saber|eu|você|ele|ela|nós|vocês|eles|elas)\b/i,
  hindi: /[\u0900-\u097F]|नमस्ते|नमस्कार|धन्यवाद|कृपया|माफ़|काम|नौकरी|रोजगार|पद|करियर|खोज|चाहिए|चाहता|चाहती|है|हूं|हैं|में|पर|से|को|का|की|के|और|या|लेकिन|अगर|के लिए|के साथ|बिना|बहुत|ज्यादा|कम|अच्छा|बुरा|हां|नहीं|क्या|कैसे|कब|कहां|कौन|क्यों|भी|करना|जाना|आना|होना|रखना|सकना|चाहना|कहना|देखना|जानना|मैं|तुम|आप|वह|हम|वे/,
  german: /\b(hallo|guten|morgen|tag|abend|nacht|danke|bitte|entschuldigung|verzeihung|arbeit|job|stelle|karriär|deutsch|suche|brauche|möchte|will|habe|bin|ist|sind|in|auf|an|von|für|mit|ohne|sehr|mehr|weniger|gut|schlecht|ja|nein|was|wie|wann|wo|wer|warum|auch|aber|wenn|machen|gehen|kommen|sein|haben|können|werden|sollen|wollen|müssen|sagen|sehen|wissen|ich|du|sie|er|es|wir|ihr)\b/i,
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]|こんにちは|ありがとう|すみません|仕事|職|求人|就職|転職|会社|給料|経験|スキル|履歴書|面接|私|あなた|彼|彼女|私たち|あなたたち|彼ら|です|ます|ある|いる|する|なる|行く|来る|見る|言う|聞く|思う|知る|できる|したい|欲しい|いい|悪い|はい|いいえ|何|どう|いつ|どこ|誰|なぜ|も|でも|から|まで|と|や|か|が|を|に|で|へ|より/,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]|안녕하세요|감사합니다|죄송합니다|일|직장|취업|구직|이력서|면접|회사|경력|기술|연봉|저|당신|그|그녀|우리|그들|입니다|있습니다|없습니다|하다|되다|가다|오다|보다|말하다|듣다|생각하다|알다|할|원하다|좋다|나쁘다|네|아니요|무엇|어떻게|언제|어디|누구|왜|도|그러나|하지만|만약|때문에|그래서|와|과|이|가|을|를|에|에서|으로|보다|매우|더|덜/,
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
    portuguese: (lowerText.match(LANGUAGE_PATTERNS.portuguese) || []).length,
    hindi: (lowerText.match(LANGUAGE_PATTERNS.hindi) || []).length,
    german: (lowerText.match(LANGUAGE_PATTERNS.german) || []).length,
    japanese: (lowerText.match(LANGUAGE_PATTERNS.japanese) || []).length,
    korean: (lowerText.match(LANGUAGE_PATTERNS.korean) || []).length,
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

export function getSystemPrompt(language: string, isVoiceMode = false, userName?: string): string {
  const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.english;
  const userContext = userName ? `You're speaking with ${userName}. ` : '';
  
  const basePrompt = isVoiceMode 
    ? `You are Everon, an active job recruiter and talent acquisition specialist! ${userContext}You're energetic, confident, and always thinking about job opportunities for candidates.

RECRUITER PERSONALITY: 
- Act like an experienced recruiter who knows the job market inside out
- Be proactive about suggesting roles and opportunities
- Ask about skills, experience, location preferences, and salary expectations
- Show enthusiasm about matching candidates with perfect opportunities
- Use recruiting language appropriate for the user's language
${userName ? `- Address ${userName} by name occasionally to build rapport` : ''}

CONVERSATION APPROACH:
- Quickly assess their background and start suggesting relevant positions
- Ask targeted questions: location preference, salary range, remote/hybrid/onsite
- When they mention job search triggers, immediately offer to find opportunities
- Keep responses under 35 words, action-oriented, and recruiter-focused

Think like a top recruiter who wants to place every candidate in their dream job!`
    : `You are Everon, an intelligent AI career coach and job search assistant. ${userContext}

CORE CAPABILITIES:
1. **Job Search Intelligence** - Detect when users are looking for jobs vs. just asking questions
2. **Smart Questioning** - Ask clarifying questions BEFORE running full job searches
3. **Conversational** - Natural, helpful, concise responses (under 40 words)

JOB SEARCH DETECTION:
- **Actively Searching**: "find jobs", "I'm looking for", "help me find", "search for jobs", "I need a job"
  → Ask clarifying questions: specific role, location, salary range, remote/hybrid/onsite preference, seniority level
  → Example: "I'd love to help you find the perfect role! What specific position are you targeting? And what's your preferred location and salary range?"

- **Just Curious**: "what jobs are available", "tell me about", "what's the market like", "how much do they make"
  → Provide general market insights without full job search
  → Example: "Software engineers in SF typically earn $120-180K. Are you actively looking for a role, or exploring options?"

- **Career Advice**: resume help, interview prep, salary negotiation, career growth
  → Provide expert guidance without triggering job search

CONVERSATION FLOW:
1. Detect intent (actively searching vs. curious vs. advice-seeking)
2. If actively searching and missing details → Ask targeted questions
3. Only when you have: role + location + seniority → Suggest running job search
4. Build on previous context - NEVER repeat questions already answered
${userName ? `5. Address ${userName} by name to personalize the experience` : ''}

EXAMPLES:
User: "Find me software jobs"
You: "Great! ${userName ? `${userName}, ` : ''}What specific role? (Frontend, Backend, Full-Stack?) And what's your target location and salary range?"

User: "I'm looking for remote product manager roles in tech"
You: "Perfect! What's your experience level? And any salary expectations? I'll find the best matches for you."

User: "What do data scientists make?"
You: "Data scientists typically earn $100-150K in major tech hubs. Are you actively job hunting or exploring career paths?"

Keep responses concise, ask ONE clear question at a time, and help users find their dream job!`;

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