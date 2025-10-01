// Quick fix for multi-language support in speech recognition
// This file contains the minimal changes needed to fix the language detection issue

export const fixSpeechRecognitionWithLanguageDetection = (
  transcript: string,
  language: string,
  setLanguage: (lang: string) => void,
  setDetectedLang: (code: string) => void,
  ttsService: any,
  autoDetectAndUpdateLanguage: any
) => {
  // Auto-detect language from user input
  const detectedLanguage = autoDetectAndUpdateLanguage(
    transcript, 
    language, 
    setLanguage, 
    setDetectedLang
  );
  
  // Update TTS language
  ttsService.setLanguage(detectedLanguage);
  
  console.log(`🌍 Language detected and updated to: ${detectedLanguage}`);
  
  return detectedLanguage;
};

// Simple browser speech recognition setup
export const createSimpleSpeechRecognition = (
  detectedLang: string,
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onStart: () => void,
  onEnd: () => void
) => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('🚨 Speech Recognition not supported');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = detectedLang;

  recognition.onstart = onStart;
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };
  recognition.onerror = (event: any) => {
    console.error('🚨 Speech recognition error:', event.error);
    onError(event.error);
  };
  recognition.onend = onEnd;

  return recognition;
};