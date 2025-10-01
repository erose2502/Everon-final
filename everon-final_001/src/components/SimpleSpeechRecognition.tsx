// Simple Speech Recognition Component
import { useState, useEffect, useCallback } from 'react';
import { autoDetectAndUpdateLanguage } from '../utils/languageUtils';

interface SimpleSpeechRecognitionProps {
  onTranscript: (transcript: string, language: string) => void;
  onError?: (error: string) => void;
  language: string;
  detectedLang: string;
  isActive: boolean;
  onLanguageUpdate: (lang: string) => void;
  onDetectedLangUpdate: (code: string) => void;
}

export const useSimpleSpeechRecognition = ({
  onTranscript,
  onError,
  language,
  detectedLang,
  onLanguageUpdate,
  onDetectedLangUpdate
}: SimpleSpeechRecognitionProps) => {
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('🚨 Speech Recognition not supported in this browser');
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = false;
    newRecognition.interimResults = false;
    newRecognition.lang = detectedLang;

    newRecognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
    };

    newRecognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log('🗣️ Speech recognized:', transcript, `(confidence: ${confidence})`);
      
      // Auto-detect language from user input
      const detectedLanguage = autoDetectAndUpdateLanguage(
        transcript, 
        language, 
        onLanguageUpdate, 
        onDetectedLangUpdate
      );
      
      // Update recognition language for next time
      newRecognition.lang = detectedLang;
      
      // Call the transcript handler
      onTranscript(transcript, detectedLanguage);
    };

    newRecognition.onerror = (event: any) => {
      console.error('🚨 Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Speech recognition failed';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Try speaking louder.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone access denied or unavailable.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied.';
          break;
        case 'network':
          errorMessage = 'Network error occurred.';
          break;
        case 'aborted':
          // Don't show error for aborted - it's usually intentional
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      onError?.(errorMessage);
    };

    newRecognition.onend = () => {
      console.log('🔇 Speech recognition ended');
      setIsListening(false);
    };

    setRecognition(newRecognition);

    return () => {
      if (newRecognition) {
        try {
          newRecognition.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [detectedLang, onTranscript, onError, language, onLanguageUpdate, onDetectedLangUpdate]);

  const startListening = useCallback(() => {
    if (!recognition) {
      console.error('🚨 Speech recognition not available');
      onError?.('Speech recognition not available');
      return;
    }

    if (isListening) {
      console.log('🎤 Already listening...');
      return;
    }

    try {
      recognition.start();
      console.log('🎤 Starting speech recognition...');
    } catch (error) {
      console.error('🚨 Failed to start speech recognition:', error);
      onError?.('Failed to start speech recognition');
    }
  }, [recognition, isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      console.log('🛑 Stopping speech recognition...');
    }
  }, [recognition, isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    isSupported: !!recognition
  };
};