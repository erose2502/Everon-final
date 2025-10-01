import { useState, useCallback, useEffect } from 'react';
import { getLiveKitVoiceAgent, VoiceSession, LiveKitVoiceAgentConfig } from '../services/livekitVoiceAgent';

export interface UseLiveKitVoiceReturn {
  // Voice session state
  session: VoiceSession | null;
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  
  // Voice session controls
  startVoiceSession: () => Promise<void>;
  stopVoiceSession: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  
  // Error handling
  error: string | null;
}

export const useLiveKitVoice = (config?: LiveKitVoiceAgentConfig, onMessage?: (message: string) => void, language?: string): UseLiveKitVoiceReturn => {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const voiceAgent = getLiveKitVoiceAgent(config);
  
  // Set up speech recognition callback
  useEffect(() => {
    if (onMessage) {
      voiceAgent.onSpeechRecognized = (transcript: string) => {
        console.log('Speech recognized via LiveKit:', transcript);
        onMessage(transcript);
      };
    }
    
    return () => {
      voiceAgent.onSpeechRecognized = null;
    };
  }, [voiceAgent, onMessage]);

  // Update speech language when it changes
  useEffect(() => {
    if (language) {
      voiceAgent.setSpeechLanguage(language);
    }
  }, [voiceAgent, language]);
  
  // Sync state with voice agent
  useEffect(() => {
    const updateState = () => {
      const currentSession = voiceAgent.getCurrentSession();
      setSession(currentSession);
      setIsActive(voiceAgent.isActive());
      setIsListening(voiceAgent.isListening());
      setIsSpeaking(voiceAgent.isSpeaking());
    };
    
    // Update state every 100ms while active
    let interval: number | null = null;
    if (voiceAgent.isActive()) {
      interval = setInterval(updateState, 100);
    }
    
    // Initial update
    updateState();
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [voiceAgent, isActive]);
  
  const startVoiceSession = useCallback(async () => {
    try {
      setError(null);
      const newSession = await voiceAgent.startVoiceSession();
      setSession(newSession);
      setIsActive(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice session';
      setError(errorMessage);
      console.error('Voice session error:', err);
    }
  }, [voiceAgent]);
  
  const stopVoiceSession = useCallback(async () => {
    try {
      setError(null);
      await voiceAgent.stopVoiceSession();
      setSession(null);
      setIsActive(false);
      setIsListening(false);
      setIsSpeaking(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop voice session';
      setError(errorMessage);
      console.error('Stop voice session error:', err);
    }
  }, [voiceAgent]);
  
  const startListening = useCallback(async () => {
    if (!isActive) {
      await startVoiceSession();
    }
    
    try {
      setError(null);
      await voiceAgent.startListening();
      setIsListening(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMessage);
      console.error('Start listening error:', err);
    }
  }, [voiceAgent, isActive, startVoiceSession]);
  
  const stopListening = useCallback(async () => {
    try {
      setError(null);
      await voiceAgent.stopListening();
      setIsListening(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop listening';
      setError(errorMessage);
      console.error('Stop listening error:', err);
    }
  }, [voiceAgent]);
  
  const speak = useCallback(async (text: string) => {
    if (!isActive) {
      await startVoiceSession();
    }
    
    try {
      setError(null);
      await voiceAgent.speak(text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to speak';
      setError(errorMessage);
      console.error('Speak error:', err);
    }
  }, [voiceAgent, isActive, startVoiceSession]);
  
  return {
    session,
    isActive,
    isListening,
    isSpeaking,
    startVoiceSession,
    stopVoiceSession,
    startListening,
    stopListening,
    speak,
    error
  };
};