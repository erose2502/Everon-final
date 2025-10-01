// LiveKit Voice Agent Service
// This will handle real-time speech-to-speech conversations
import { Room } from 'livekit-client';

export interface LiveKitVoiceAgentConfig {
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
  roomName: string;
}

export interface VoiceSession {
  id: string;
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  room?: Room; // LiveKit Room instance
}

export class LiveKitVoiceAgent {
  private config: LiveKitVoiceAgentConfig;
  private currentSession: VoiceSession | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private room: Room | null = null;
  private speechRecognition: any = null;
  private speechLanguage: string = 'en-US';
  public onSpeechRecognized: ((text: string) => void) | null = null;
  
  constructor(config: LiveKitVoiceAgentConfig) {
    this.config = config;
  }

  setSpeechLanguage(languageCode: string) {
    this.speechLanguage = languageCode;
    console.log(`🌍 Speech recognition language set to: ${languageCode}`);
  }

  private async generateAccessToken(): Promise<{ token: string; wsUrl: string }> {
    // Development mode: Generate token client-side for testing
    // In production, this should be done on your backend server
    try {
      // First try the API endpoint (for production/Vercel)
      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: this.config.roomName,
          identity: `user_${Date.now()}`,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          token: data.token,
          wsUrl: data.wsUrl
        };
      }
    } catch (error) {
      console.log('API endpoint not available, using development mode');
    }

    // Development fallback: Client-side token generation (NOT for production)
    try {
      const { AccessToken } = await import('livekit-server-sdk');
      
      const token = new AccessToken(
        this.config.apiKey,
        this.config.apiSecret,
        {
          identity: `user_${Date.now()}`,
          name: `User ${Date.now()}`,
        }
      );

      token.addGrant({
        roomJoin: true,
        room: this.config.roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const jwt = await token.toJwt();
      
      console.log('Generated development token for LiveKit');
      return {
        token: jwt,
        wsUrl: this.config.wsUrl
      };
    } catch (error) {
      console.error('Development token generation failed:', error);
      throw new Error('Failed to generate LiveKit access token. Please ensure LiveKit credentials are properly configured.');
    }
  }

  async startVoiceSession(): Promise<VoiceSession> {
    try {
      // Initialize audio context
      this.audioContext = new AudioContext();
      
      // Generate access token
      console.log('Generating LiveKit access token...');
      const { token, wsUrl } = await this.generateAccessToken();
      
      // Create LiveKit room
      this.room = new Room();
      
      // Connect to LiveKit room with timeout
      console.log('🔌 Connecting to LiveKit room...');
      
      const connectWithTimeout = () => {
        return Promise.race([
          this.room!.connect(wsUrl, token),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
          )
        ]);
      };

      await connectWithTimeout();
      console.log('✅ Connected to LiveKit successfully!');
      
      // Get user media (microphone) with mobile-friendly constraints
      console.log('📱 Requesting microphone access...');
      
      // Detect mobile and adjust constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      let audioConstraints: MediaStreamConstraints;
      if (isMobile) {
        console.log('📱 Mobile device detected, using simplified audio constraints');
        audioConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Some mobile browsers have issues with this
            autoGainControl: false,   // Some mobile browsers have issues with this
          }
        };
      } else {
        // Desktop - use higher quality settings
        audioConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        };
      }

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        console.log('✅ Microphone access granted successfully');
      } catch (micError) {
        console.error('❌ Microphone access failed:', micError);
        const errorMessage = micError instanceof Error ? micError.message : 'Unknown error';
        
        // Try with even simpler constraints on mobile
        if (isMobile) {
          console.log('📱 Retrying with basic audio constraints...');
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone access granted with basic constraints');
          } catch (basicError) {
            console.error('❌ Basic microphone access also failed:', basicError);
            const basicErrorMessage = basicError instanceof Error ? basicError.message : 'Unknown error';
            throw new Error(`Microphone permission denied. Please enable microphone access in your browser settings and try again. Error: ${basicErrorMessage}`);
          }
        } else {
          throw new Error(`Microphone access failed: ${errorMessage}`);
        }
      }

      // Create session
      const session: VoiceSession = {
        id: `voice_${Date.now()}`,
        isActive: true,
        isListening: false,
        isSpeaking: false,
        room: this.room,
      };

      this.currentSession = session;
      
      console.log('LiveKit Voice Session started successfully:', session.id);
      return session;
      
    } catch (error) {
      console.error('Failed to start voice session:', error);
      
      // Clean up on failure
      if (this.room) {
        await this.room.disconnect();
        this.room = null;
      }
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      throw error;
    }
  }

  async stopVoiceSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      this.currentSession.isListening = false;
      this.currentSession.isSpeaking = false;
    }

    // Disconnect from LiveKit room
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    // Clean up media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clean up audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('LiveKit Voice Session stopped');
    this.currentSession = null;
  }

  async startListening(): Promise<void> {
    if (this.currentSession && this.currentSession.isActive && this.room) {
      this.currentSession.isListening = true;
      console.log('Started listening...');
      
      try {
        // Create audio track from microphone
        if (this.mediaStream) {
          const { LocalAudioTrack } = await import('livekit-client');
          const audioTrack = new LocalAudioTrack(this.mediaStream.getAudioTracks()[0]);
          
          // Publish audio track to room
          await this.room.localParticipant.publishTrack(audioTrack, {
            name: 'microphone',
          });
          
          console.log('Audio track published to LiveKit room');
          
          // Set up speech recognition for now (until we have proper LiveKit agent)
          this.setupSpeechRecognition();
        }
      } catch (error) {
        console.error('Failed to start listening:', error);
        this.currentSession.isListening = false;
      }
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported on this browser');
      if (this.currentSession) {
        this.currentSession.isListening = false;
      }
      throw new Error('Speech recognition is not supported on this browser. Please try using a different browser like Chrome or Safari.');
    }

    console.log('🎤 Setting up speech recognition for continuous listening...');
    
    // Detect mobile for better error handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      console.log('📱 Mobile device detected - using mobile-optimized speech recognition');
    }
    
    const recognition = new SpeechRecognition();
    
    // Mobile-optimized settings
    if (isMobile) {
      recognition.continuous = false;           // Mobile works better with single utterances
      recognition.interimResults = false;       // Mobile has issues with interim results
      recognition.maxAlternatives = 1;          // Reduce processing on mobile
    } else {
      recognition.continuous = false;           // Keep consistent across platforms
      recognition.interimResults = false;       // More reliable
      recognition.maxAlternatives = 3;          // Desktop can handle more alternatives
    }
    
    recognition.lang = this.speechLanguage;
    
    console.log(`🎤 Speech recognition configured for ${isMobile ? 'mobile' : 'desktop'} with language: ${this.speechLanguage}`);

    recognition.onstart = () => {
      console.log('🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Speech recognized:', transcript);
      
      // Stop listening immediately when speech is detected
      if (this.currentSession) {
        this.currentSession.isListening = false;
      }
      
      // Trigger callback if set
      if (this.onSpeechRecognized) {
        this.onSpeechRecognized(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      // Only log non-aborted errors (aborted is normal when stopping)
      if (event.error !== 'aborted') {
        console.error('🚨 Speech recognition error:', event.error);
        
        // Provide mobile-specific error messages
        if (isMobile && (event.error === 'not-allowed' || event.error === 'permission-denied')) {
          console.error('📱 Mobile microphone permission issue detected');
          throw new Error('Microphone permission required. Please enable microphone access and try again.');
        } else if (event.error === 'network') {
          console.error('🌐 Network error during speech recognition');
          throw new Error('Network error occurred. Please check your internet connection and try again.');
        } else if (event.error === 'no-speech') {
          console.warn('🔇 No speech detected - this is normal, will try again');
        }
      }
      
      if (this.currentSession) {
        this.currentSession.isListening = false;
      }
    };

    recognition.onend = () => {
      // Don't auto-restart here - let the conversation flow handle it
    };

    try {
      recognition.start();
      this.speechRecognition = recognition;
      console.log('🎤 Speech recognition start() called');
    } catch (error) {
      console.error('🚨 Failed to start speech recognition:', error);
      if (this.currentSession) {
        this.currentSession.isListening = false;
      }
    }
  }

  async stopListening(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.isListening = false;
      console.log('Stopped listening...');
      
      // Stop speech recognition
      if (this.speechRecognition) {
        this.speechRecognition.stop();
        this.speechRecognition = null;
      }
      
      // Unpublish audio tracks
      if (this.room) {
        const tracks = Array.from(this.room.localParticipant.trackPublications.values());
        tracks.forEach((publication) => {
          if (publication.track) {
            this.room?.localParticipant.unpublishTrack(publication.track);
          }
        });
      }
    }
  }

  async speak(text: string): Promise<void> {
    if (this.currentSession && this.currentSession.isActive) {
      this.currentSession.isSpeaking = true;
      console.log('Speaking:', text);
      
      // In real implementation:
      // - Send text to LiveKit voice agent
      // - Receive audio stream
      // - Play audio through speakers
      // - Handle interruptions
      
      // Simulate speaking duration
      setTimeout(() => {
        if (this.currentSession) {
          this.currentSession.isSpeaking = false;
        }
      }, 2000);
    }
  }

  getCurrentSession(): VoiceSession | null {
    return this.currentSession;
  }

  isActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  isListening(): boolean {
    return this.currentSession?.isListening ?? false;
  }

  isSpeaking(): boolean {
    return this.currentSession?.isSpeaking ?? false;
  }
}

// Default configuration (you'll need to get these from LiveKit dashboard)
export const defaultLiveKitConfig: LiveKitVoiceAgentConfig = {
  wsUrl: 'wss://your-livekit-server.com', // Replace with your LiveKit server
  apiKey: 'your-api-key', // Replace with your API key
  apiSecret: 'your-api-secret', // Replace with your API secret
  roomName: 'everon-voice-chat'
};

// Singleton instance
let livekitVoiceAgent: LiveKitVoiceAgent | null = null;

export const getLiveKitVoiceAgent = (config?: LiveKitVoiceAgentConfig): LiveKitVoiceAgent => {
  if (!livekitVoiceAgent) {
    livekitVoiceAgent = new LiveKitVoiceAgent(config || defaultLiveKitConfig);
  }
  return livekitVoiceAgent;
};