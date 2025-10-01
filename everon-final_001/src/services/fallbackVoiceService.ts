// Fallback Voice Service - Browser Speech Recognition without LiveKit
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class FallbackVoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private language: string = 'en-US';
  public onSpeechRecognized: ((transcript: string) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onStart: (() => void) | null = null;
  public onEnd: (() => void) | null = null;

  constructor() {
    // Check for browser speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('🚨 Speech Recognition not supported in this browser');
      return;
    }

    this.setupSpeechRecognition();
  }

  private setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure speech recognition
    this.recognition.continuous = false; // Single phrase recognition
    this.recognition.interimResults = false;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      console.log('🎤 Browser speech recognition started');
      this.isListening = true;
      this.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log('🗣️ Speech recognized:', transcript, `(confidence: ${confidence})`);
      
      if (this.onSpeechRecognized) {
        this.onSpeechRecognized(transcript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚨 Speech recognition error:', event.error);
      this.isListening = false;
      
      // Handle different error types
      let errorMessage = 'Speech recognition failed';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Try speaking louder or closer to the microphone.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone access denied or unavailable.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        case 'aborted':
          // Don't show error for aborted - it's usually intentional
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      this.onError?.(errorMessage);
    };

    this.recognition.onend = () => {
      console.log('🔇 Speech recognition ended');
      this.isListening = false;
      this.onEnd?.();
    };
  }

  setLanguage(languageCode: string) {
    this.language = languageCode;
    if (this.recognition) {
      this.recognition.lang = languageCode;
    }
    console.log(`🌍 Fallback speech recognition language set to: ${languageCode}`);
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    if (this.isListening) {
      console.log('🎤 Already listening...');
      return;
    }

    try {
      this.recognition.start();
      console.log('🎤 Starting browser speech recognition...');
    } catch (error) {
      console.error('🚨 Failed to start speech recognition:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      console.log('🛑 Stopping speech recognition...');
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

// Singleton instance
let fallbackVoiceService: FallbackVoiceService | null = null;

export function getFallbackVoiceService(): FallbackVoiceService {
  if (!fallbackVoiceService) {
    fallbackVoiceService = new FallbackVoiceService();
  }
  return fallbackVoiceService;
}