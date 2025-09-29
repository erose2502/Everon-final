import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Import the worker as a URL so the bundled worker matches the installed pdfjs-dist version (Vite-friendly)
// The `?url` suffix tells Vite to return the file URL instead of bundling its contents.
// the package provides .mjs worker files; import the existing file with .mjs extension so Vite can resolve it
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import './App.css';
import { askOpenAIAgent } from './agents';
import ParticleBackground from './ParticleBackground';
import ChatBubble, { StreamingBubble } from './components/ChatBubble';
import VoiceSpectrum from './components/VoiceSpectrum';

declare global {
  interface Window {
    mammoth?: any;
  }
}

// Use the worker URL from the installed package to avoid version mismatch with any public worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  meta?: { structured?: boolean };
}


function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [partialReply, setPartialReply] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true); // TTS enabled by default
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string, type: string, url: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Language preference state
  const [language] = useState<'english' | 'french' | 'swahili' | 'arabic' | 'spanish' | 'auto'>('english');
    // For auto-detect, store last detected language
  const [detectedLang, setDetectedLang] = useState<string>('en-US');

  // --- Phase 3: Job Search State ---
  // Removed unused jobSearchLoading state

  // Example resume text (replace with actual resume parsing later)

  // (Removed unused handleJobSearch function)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialReply]);

  // Keep voiceModeRef in sync with voiceMode
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);


  const sendMessage = async (text?: string) => {
    const messageToSend = (text || input).trim();
    if (!messageToSend) return;

    console.log('sendMessage called. voiceMode:', voiceMode, 'messageToSend:', messageToSend);

    setMessages((prev: Message[]) => [...prev, { role: 'user', content: messageToSend }]);
    setInput('');
    setLoading(true);
    setPartialReply('');

    // Compose language instruction, using detectedLang if auto
    let languageInstruction = '';
    let langForPrompt = language;
    if (language === 'auto') {
      if (detectedLang.startsWith('fr')) langForPrompt = 'french';
      else if (detectedLang.startsWith('sw')) langForPrompt = 'swahili';
      else if (detectedLang.startsWith('ar')) langForPrompt = 'arabic';
      else if (detectedLang.startsWith('es')) langForPrompt = 'spanish';
      else langForPrompt = 'english';
    }
    switch (langForPrompt) {
      case 'french':
        languageInstruction = 'Please respond in French.';
        break;
      case 'swahili':
        languageInstruction = 'Please respond in Swahili.';
        break;
      case 'arabic':
        languageInstruction = 'Please respond in Arabic.';
        break;
      case 'spanish':
        languageInstruction = 'Please respond in Spanish.';
        break;
      default:
        languageInstruction = 'Please respond in English.';
    }

    try {
      const fullReply = await askOpenAIAgent(languageInstruction + '\n' + messageToSend, (partial) => {
        // Only show partial reply if NOT in voice mode to avoid duplicates
        if (!voiceModeRef.current) {
          setPartialReply(partial);
        }
      });
      
      console.log('Got AI response, fullReply length:', fullReply.length);
      
      // Add the assistant's response to messages
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: fullReply }]);
      
      // Determine if we should speak the response
      const shouldSpeak = voiceModeRef.current || ttsEnabled;
      console.log('shouldSpeak:', shouldSpeak, 'voiceModeRef:', voiceModeRef.current, 'ttsEnabled:', ttsEnabled);
      
      if (shouldSpeak) {
        console.log('About to call speakText...');
        await speakText(fullReply);
        console.log('speakText completed');
      }
      
      // If in voice mode, automatically start listening again after response
      if (voiceModeRef.current) {
        console.log('Voice mode active, scheduling next listening session...');
        // Small delay to ensure audio cleanup and give user a moment to respond
        setTimeout(() => {
          console.log('Timeout executed. voiceModeRef:', voiceModeRef.current, 'isListening:', isListening, 'isSpeaking:', isSpeaking);
          // Double-check we're still in voice mode and not currently busy
          if (voiceModeRef.current && !isListening && !isSpeaking) {
            console.log('Starting listening for next user input...');
            startListening();
          } else {
            console.log('Cannot start listening - conditions not met');
          }
        }, 1000); // Slightly longer delay for better audio separation
      } else {
        console.log('Not in voice mode, skipping continuous listening');
      }
    } catch (err) {
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Error: ' + (err as Error).message }]);
    } finally {
      setLoading(false);
      setPartialReply('');
    }
  };

  // Speak text using OpenAI's TTS API with Alloy voice
  const speakText = async (text: string) => {
    try {
      // Stop any ongoing speech and listening
      stopSpeaking();
      setIsListening(false);
      setIsSpeaking(true);


      // Use detected language for TTS if auto, else use selected
      let langPref = language;
      if (language === 'auto') {
        if (detectedLang.startsWith('fr')) langPref = 'french';
        else if (detectedLang.startsWith('sw')) langPref = 'swahili';
        else if (detectedLang.startsWith('ar')) langPref = 'arabic';
        else if (detectedLang.startsWith('es')) langPref = 'spanish';
        else langPref = 'english';
      }

      if (langPref !== 'english') {
        return fallbackSpeech(text, langPref);
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: text,
          speed: 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Return a promise that resolves when audio finishes
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          console.log('OpenAI TTS audio finished playing');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          resolve();
        };

        audio.onerror = () => {
          console.log('OpenAI TTS audio error');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(new Error('Audio playback error'));
        };

        audio.play().then(() => {
          console.log('OpenAI TTS audio started playing');
        }).catch((err) => {
          console.log('OpenAI TTS audio play error:', err);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(err);
        });
      });

    } catch (e) {
      console.error('OpenAI TTS error:', e);
      setIsSpeaking(false);
      // Fallback to browser speech synthesis
      return fallbackSpeech(text, language);
    }
  };

  // Stop any ongoing speech
  const stopSpeaking = () => {
    // Stop OpenAI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  };

  // Fallback to browser speech synthesis if OpenAI TTS fails or for non-English
  const fallbackSpeech = (text: string, langPref?: string): Promise<void> => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      setIsSpeaking(false);
      return Promise.resolve();
    }

    // Map language preference to BCP-47 code
    let langCode = 'en-US';
    switch (langPref) {
      case 'french':
        langCode = 'fr-FR'; break;
      case 'swahili':
        langCode = 'sw-KE'; break;
      case 'arabic':
        langCode = 'ar-EG'; break;
      case 'spanish':
        langCode = 'es-ES'; break;
      default:
        langCode = 'en-US';
    }

    return new Promise<void>((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langCode;
        utter.rate = 0.9;
        utter.pitch = 1.0;

        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utter.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.error('Fallback TTS error', e);
        setIsSpeaking(false);
        resolve();
      }
    });
  };

  const startListening = () => {
    console.log('startListening called. isSpeaking:', isSpeaking, 'isListening:', isListening);

    // Don't start listening if already speaking or listening
    if (isSpeaking || isListening) {
      console.log('Cannot start listening: already speaking or listening');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    console.log('Initializing speech recognition...');

    // Stop any ongoing speech before starting to listen
    stopSpeaking();

    const recognition = new SpeechRecognition();
    // Set recognition language for auto-detect or user preference
    let recogLang = '';
    if (language !== 'auto') {
      switch (language) {
        case 'french': recogLang = 'fr-FR'; break;
        case 'swahili': recogLang = 'sw-KE'; break;
        case 'arabic': recogLang = 'ar-EG'; break;
        case 'spanish': recogLang = 'es-ES'; break;
        case 'english': recogLang = 'en-US'; break;
        default: recogLang = '';
      }
    }
    // For auto-detect, recogLang remains '' (empty string)
    recognition.lang = recogLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    console.log('Speech recognition started, listening for input...');

    recognition.onresult = async (event: any) => {
      // Try to get detected language from event
      let detected = recogLang;
      if (language === 'auto' && event.results && event.results[0][0]?.language) {
        detected = event.results[0][0].language;
      }
      if (language === 'auto' && detected) {
        setDetectedLang(detected);
      }
      const transcript = event.results[0][0].transcript;
      console.log('Voice recognition result received. transcript:', transcript, 'detectedLang:', detected, 'current voiceModeRef:', voiceModeRef.current);
      setIsListening(false);

      // Additional check: don't process if we're currently speaking
      if (isSpeaking) {
        console.log('Ignoring voice input while speaking');
        return;
      }

      // Send the transcribed message (TTS will happen automatically in sendMessage)
      await sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        alert('Voice recognition error: ' + event.error);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPreviewFile({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
  };

  const processPreviewFile = async () => {
    if (!previewFile) return;
    const { type, url, name } = previewFile;
    setPreviewFile(null);
    setUploadStatus(`Analyzing ${name}...`);
    let parsedText = '';

    try {
      if (type === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument(url).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          parsedText += content.items.map((item: any) => item.str).join(' ');
        }
      } else if (type.includes('wordprocessingml') && window.mammoth) {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        parsedText = result.value.replace(/<[^>]+>/g, ' ');
      } else if (type.startsWith('text/')) {
        parsedText = await (await fetch(url)).text();
      } else {
        throw new Error('Unsupported file type.');
      }

      const agentPrompt = `Please provide a professional review of the following resume. Format the response with these sections: **Summary**, **Strengths**, **Areas for Improvement**, and **Suggestions**.\n\nResume:\n${parsedText}`;
      setLoading(true);
      const fullReply = await askOpenAIAgent(agentPrompt, setPartialReply);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: fullReply, meta: { structured: true } }]);
    } catch (err) {
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Error processing file: ' + (err as Error).message }]);
    } finally {
      setLoading(false);
      setPartialReply('');
      setUploadStatus(null);
    }
  };

  // Fetch jobs from backend (Glassdoor API)

  return (
    <div className="app-container">
      {previewFile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Preview: {previewFile.name}</h3>
            {previewFile.type.startsWith('image/') ? <img src={previewFile.url} alt="preview" /> : <iframe src={previewFile.url} title="preview" />}
            <div className="modal-actions">
              <button onClick={() => setPreviewFile(null)}>Cancel</button>
              <button onClick={processPreviewFile}>Confirm & Upload</button>
            </div>
          </div>
        </div>
      )}

  <ParticleBackground isSpeaking={isSpeaking} />
      <main className="main-content">

        <header className="app-header">
          <h1>Everon</h1>
          <h2>Your AI Career Coach</h2>
          <p>Ask Everon about your career questions!</p>
        </header>

        <div className="chat-window">
          {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
          {messages.map((msg: Message, idx: number) => (
            <ChatBubble
              key={idx}
              msg={msg}
              isLastMessage={idx === messages.length - 1}
              index={idx}
            />
          ))}
          {loading && partialReply && !voiceMode && messages[messages.length - 1]?.role !== 'assistant' && <StreamingBubble partialReply={partialReply} />}
          <div ref={chatEndRef} />
        </div>

        <form className="input-bar" onSubmit={(e: React.FormEvent) => { e.preventDefault(); sendMessage(); }}>
          <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4.5 4.5 0 0 1 6.36 6.36l-9.2 9.2a2.5 2.5 0 1 1-3.54-3.54l8.49-8.49" />
            </svg>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />
          </button>
          
          <button
            type="button"
            title={ttsEnabled ? "Disable Text-to-Speech for manual text input" : "Enable Text-to-Speech for manual text input"}
            className={`icon-btn tts-toggle ${ttsEnabled ? 'active' : ''} ${voiceMode ? 'disabled' : ''}`}
            onClick={() => setTtsEnabled(prev => !prev)}
            disabled={voiceMode}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              {ttsEnabled && <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>}
              {!ttsEnabled && <line x1="23" y1="9" x2="17" y2="15"></line>}
              {!ttsEnabled && <line x1="17" y1="9" x2="23" y2="15"></line>}
            </svg>
          </button>

          {isSpeaking && (
            <button
              type="button"
              title="Stop Speaking"
              className="icon-btn stop-btn"
              onClick={stopSpeaking}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" fill="currentColor"></rect>
              </svg>
            </button>
          )}
          
          <button
            type="button"
            title={voiceMode ? "Exit Voice Mode (Click to stop continuous voice chat)" : isListening ? "Listening... (Click to stop)" : "Start Voice Chat (Click for single use, hold for continuous mode)"}
            className={`icon-btn mic-btn ${voiceMode ? 'voice-mode' : ''} ${isListening ? 'listening' : ''}`}
            disabled={loading || isSpeaking}
            onClick={() => {
              if (voiceMode) {
                // If in voice mode, clicking toggles it off
                console.log('Exiting voice mode');
                setVoiceMode(false);
                setIsListening(false);
                stopSpeaking();
              } else if (isListening) {
                // If currently listening (single session), stop listening
                console.log('Stopping single listening session');
                setIsListening(false);
              } else {
                // Start listening - single press for one-time
                console.log('Starting single voice input');
                startListening();
              }
            }}
            onMouseDown={() => {
              // Start timer for long press detection (only if not already in voice mode)
              if (!voiceMode && !isListening) {
                const longPressTimer = setTimeout(() => {
                  console.log('Long press detected - enabling continuous voice mode');
                  setVoiceMode(true);
                  startListening();
                }, 800); // 800ms for long press
                
                // Store timer to clear on mouse up
                (window as any).micLongPressTimer = longPressTimer;
              }
            }}
            onMouseUp={() => {
              // Clear long press timer
              if ((window as any).micLongPressTimer) {
                clearTimeout((window as any).micLongPressTimer);
                delete (window as any).micLongPressTimer;
              }
            }}
            onMouseLeave={() => {
              // Clear long press timer if mouse leaves button
              if ((window as any).micLongPressTimer) {
                clearTimeout((window as any).micLongPressTimer);
                delete (window as any).micLongPressTimer;
              }
            }}
          >
            {voiceMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '18px' }}>
                🎤🔄
              </div>
            ) : isListening ? (
              <VoiceSpectrum />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            )}
          </button>
          <input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="Ask Everon..."
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="icon-btn send-btn" disabled={loading || !input.trim()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;