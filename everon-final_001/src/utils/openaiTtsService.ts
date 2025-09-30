// High-Quality Text-to-Speech Service using OpenAI TTS API
class TTSService {
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {}

  async speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  } = {}): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Stop any current audio
        this.stop();

        // Clean up text for better speech
        const cleanText = this.preprocessText(text);
        
        // Add a small delay before speaking to ensure audio system is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('🔊 Starting OpenAI TTS for:', cleanText.substring(0, 50) + '...');

        // Use OpenAI TTS API for high-quality voice
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'tts-1-hd', // High-quality model
            voice: 'alloy', // Professional female voice
            input: cleanText,
            speed: options.rate ?? 1.0
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS API error: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        this.currentAudio = new Audio(audioUrl);
        
        // Set volume
        this.currentAudio.volume = options.volume ?? 0.9;

        // Set up event listeners
        this.currentAudio.onloadstart = () => {
          console.log('🔊 OpenAI TTS Started - Microphone should be muted to prevent feedback');
          options.onStart?.();
        };

        this.currentAudio.onended = () => {
          console.log('🔊 OpenAI TTS Ended - Safe to resume microphone');
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          options.onEnd?.();
          resolve();
        };

        this.currentAudio.onerror = (event) => {
          console.error('🔊 OpenAI TTS Audio Error:', event);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          options.onError?.(event);
          reject(new Error('Audio playback error'));
        };

        // Start playing
        await this.currentAudio.play();
        console.log('🔊 OpenAI TTS audio started playing');

      } catch (error) {
        console.error('🔊 OpenAI TTS Error:', error);
        options.onError?.(error);
        reject(error);
      }
    });
  }

  private preprocessText(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      // Replace emojis with descriptions for better speech
      .replace(/🎯/g, 'target')
      .replace(/🚀/g, 'rocket')
      .replace(/💼/g, 'briefcase')
      .replace(/📄/g, 'document')
      .replace(/🧠/g, 'brain')
      .replace(/🗣️/g, 'speaking')
      .replace(/👂/g, 'listening')
      .replace(/🎤/g, 'microphone')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      } catch (error) {
        console.warn('Error stopping audio:', error);
      }
    }
  }

  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(console.error);
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();