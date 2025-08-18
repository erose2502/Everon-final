import React, { useState, useEffect, useRef } from 'react';

// TTSHighlight component: highlights the word currently being spoken
function TTSHighlight({ text }: { text: string }) {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const words = text ? text.split(/\s+/) : [];

  useEffect(() => {
    if (!text) return;
    setCurrentWordIdx(0);
    let idx = 0;
    const interval = setInterval(() => {
      setCurrentWordIdx(idx);
      idx++;
      if (idx === words.length) {
        clearInterval(interval);
        // Keep last word highlighted for 300ms
        setTimeout(() => {
          setCurrentWordIdx(words.length - 1);
        }, 300);
      }
    }, 40);
    return () => {
      clearInterval(interval);
    };
  }, [text]);

  return (
    <span>
      {words.map((word, i) => (
        <span key={i} style={i === currentWordIdx ? { background: 'rgba(79,140,255,0.18)', color: '#4f8cff', borderRadius: 4, padding: '0 2px', transition: 'background 0.2s' } : {}}>
          {word + (i < words.length - 1 ? ' ' : '')}
        </span>
      ))}
    </span>
  );
}
// TTSHighlight component: highlights the word currently being spoken
// ✅ App.tsx
// PDF parsing (pdfjs)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Use a same-origin worker served from the app's `public/` folder to avoid
// CORS and dynamic import issues. The worker file will be committed to the
// `public/pdf.worker.min.js` path on the `pdf-worker-local` branch.
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
import './App.css';
import { askOpenAIAgent } from './agents';
import ParticleBackground from './ParticleBackground';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [partialReply, setPartialReply] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [voiceMode] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Track whether user is near the bottom of the chat window so we don't force-scroll
  const handleScroll = () => {
    const el = chatWindowRef.current;
    if (!el) return;
    const threshold = 120; // px from bottom considered "at bottom"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  };

  const safeScrollToEnd = (opts: ScrollIntoViewOptions = { behavior: 'smooth' }) => {
    if (isAtBottom) {
      chatEndRef.current?.scrollIntoView(opts);
    }
  };

  // Auto-scroll to latest message when messages change but only if user is at/near bottom
  useEffect(() => {
  safeScrollToEnd();
  }, [messages, loading, partialReply, isAtBottom]);

  // Initialize scroll state and update on resize or when messages change
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [messages.length]);

  const sendMessage = async (text?: string) => {
    let messageToSend = text ?? input;
    if (!messageToSend.trim()) return;

    // Only prepend name if not greeted yet
    if (userName && !hasGreeted) {
      messageToSend = `My name is ${userName}. ${messageToSend}`;
    }

    setMessages((prev) => [...prev, { role: 'user', content: text ?? input }]);
    setInput('');
    setLoading(true);
    setPartialReply('');

    try {
      const fullReply = await askOpenAIAgent(messageToSend, (partial) => {
  setPartialReply(partial);
  safeScrollToEnd();
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }]);
      setPartialReply('');

      // Try to extract user's name from the agent's reply if it asks for it
      if (!userName) {
        const match = fullReply.match(/Nice to meet you, (\w+)/i) || fullReply.match(/your name is (\w+)/i);
        if (match && match[1]) {
          setUserName(match[1]);
          setHasGreeted(true);
        } else {
          const userMatch = (text ?? input).match(/my name is (\w+)/i);
          if (userMatch && userMatch[1]) {
            setUserName(userMatch[1]);
            setHasGreeted(true);
          }
        }
      } else if (!hasGreeted && fullReply.toLowerCase().includes(userName.toLowerCase())) {
        setHasGreeted(true);
      }

      // Use OpenAI TTS for assistant reply
      try {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY || (window as any).OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key not found');
        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: fullReply,
            voice: 'alloy',
          }),
        });
        if (!ttsResponse.ok) throw new Error('TTS request failed');
        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } catch (ttsErr) {
        if ('speechSynthesis' in window) {
          const utter = new window.SpeechSynthesisUtterance(fullReply);
          utter.lang = 'en-US';
          window.speechSynthesis.speak(utter);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: ' + (err as Error).message }]);
      setPartialReply('');
    } finally {
      setLoading(false);
      setTimeout(() => {
        safeScrollToEnd();
      }, 100);
    }
  };

  // Voice recognition logic
  const startListening = () => {
    if (!voiceMode) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = (event: any) => {
      alert('Voice recognition error: ' + event.error);
    };
    recognition.start();
  };

  // File upload handler (simple, safe): supports text files. PDFs are rejected with a message.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      // ensure value is cleared so the user can re-open the picker reliably
      inputEl.value = '';
      return;
    }
    // clear the input value early so re-uploading the same file is possible
    inputEl.value = '';
  const lowerName = file.name.toLowerCase();
  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      setLoading(true);
      setPartialReply('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        try {
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          setMessages((prev) => [...prev, { role: 'user', content: `PDF uploaded: ${file.name}\n${text}` }]);
          try {
            const fullReply = await askOpenAIAgent(`Read and analyze this PDF resume: ${file.name}\n${text}`, (partial) => {
              setPartialReply(partial);
              safeScrollToEnd();
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }]);
            setPartialReply('');
          } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Error reading PDF file.' }]);
          }
        } catch (pdfErr) {
          const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
          setMessages((prev) => [...prev, { role: 'assistant', content: `Failed to parse PDF: ${msg}` }]);
        }
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx')) {
      // DOCX — use mammoth in the browser to extract raw text
      setLoading(true);
      setPartialReply('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const mammothMod: any = await import('mammoth');
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammothMod.convertToHtml({ arrayBuffer });
          // naive strip of HTML to get plain text
          const text = (result?.value ?? '').replace(/<[^>]+>/g, ' ');
          setMessages((prev) => [...prev, { role: 'user', content: `DOCX uploaded: ${file.name}\n${text}` }]);
          try {
            const fullReply = await askOpenAIAgent(`Read and analyze this DOCX resume: ${file.name}\n${text}`, (partial) => {
              setPartialReply(partial);
              safeScrollToEnd();
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }]);
            setPartialReply('');
          } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Error reading DOCX file.' }]);
          }
        } catch (docxErr) {
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to parse DOCX. Please upload a plain text or PDF file.' }]);
        }
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'].some(ext => lowerName.endsWith(ext))) {
      // Image — attempt OCR in-browser using tesseract.js
      setLoading(true);
      setPartialReply('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          let tesseractMod: any;
          try {
            tesseractMod = await import('tesseract.js');
          } catch (importErr) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to load OCR engine.' }]);
            setLoading(false);
            return;
          }
          const imageData = event.target?.result as string;
          const { data } = await tesseractMod.recognize(imageData, 'eng');
          setMessages((prev) => [...prev, { role: 'user', content: `Image uploaded: ${file.name}\n${data.text}` }]);
          try {
            const fullReply = await askOpenAIAgent(`Read and analyze this image resume: ${file.name}\n${data.text}`, (partial) => {
              setPartialReply(partial);
              safeScrollToEnd();
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }]);
            setPartialReply('');
          } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Error reading image file.' }]);
          }
        } catch (ocrErr) {
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to parse image.' }]);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          setMessages((prev) => [...prev, { role: 'user', content: `File uploaded: ${file.name}\n${fileContent}` }]);
          setLoading(true);
          setPartialReply('');
          try {
            const fullReply = await askOpenAIAgent(`Read and analyze this file: ${file.name}\n${fileContent}`, (partial) => {
              setPartialReply(partial);
              safeScrollToEnd();
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: fullReply }]);
            setPartialReply('');
          } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Error reading file.' }]);
          }
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="gpt-root">
      <ParticleBackground isSpeaking={false} />
      <div className="gpt-main gpt-centered" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8vh', marginBottom: '0', position: 'relative' }}>
        <div className="gpt-header gpt-centered-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#f3f3f3', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>Everon</h1>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#e0e0e0', marginBottom: '0.5rem' }}>Your Ai Career Coach</h2>
          <p className="gpt-subtext" style={{ fontSize: '1.12rem', color: '#bdbdbd', marginBottom: '1.2rem' }}>Ask Everon about your career questions!</p>
        </div>
  <div ref={chatWindowRef} onScroll={handleScroll} className="gpt-chat-window" style={{ marginBottom: '0', width: '100%' }}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`gpt-message gpt-message-${msg.role}`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                marginBottom: 10,
                width: '100%',
                paddingLeft: msg.role === 'user' ? '20%' : '5%',
                paddingRight: msg.role === 'user' ? '5%' : '20%',
              }}>
              <div
                className={msg.role === 'assistant' ? 'gpt-bubble gpt-bubble-assistant glass-card' : 'gpt-bubble gpt-bubble-user glass-bubble'}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginLeft: msg.role === 'user' ? 'auto' : 0,
                  marginRight: msg.role === 'assistant' ? 'auto' : 0,
                  maxWidth: '500px',
                  minWidth: '120px',
                  padding: '1rem 1.5rem',
                  wordBreak: 'break-word',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(79,140,255,0.92) 0%, rgba(44,62,80,0.88) 100%)'
                    : 'linear-gradient(135deg, rgba(34,193,195,0.92) 0%, rgba(30,39,46,0.88) 100%)',
                  boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(12px) saturate(1.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '2rem',
                }}
              >
                <div className={msg.role === 'assistant' ? 'gpt-assistant-content' : ''}>{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && partialReply && (
            <div className="gpt-message gpt-message-assistant" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', width: '100%' }}>
              <div className="gpt-bubble gpt-bubble-assistant glass-card" style={{ maxWidth: '70%' }}>
                <div className="gpt-assistant-content">
                  <TTSHighlight text={partialReply} />
                  <span className="gpt-cursor">|</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form className="gpt-input-row gpt-centered-input glass-inputbar" style={{ margin: '0 auto', marginBottom: '32px', maxWidth: '520px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', borderRadius: '32px', backdropFilter: 'blur(16px) saturate(1.2)', background: 'rgba(34,34,34,0.55)', position: 'absolute', left: '50%', bottom: '4vh', transform: 'translateX(-50%)' }} onSubmit={e => { e.preventDefault(); sendMessage(); }}>
          <button className="gpt-upload-btn" type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', padding: '0 8px', borderRadius: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 6.5l-5.5 5.5-5.5-5.5" />
              <rect x="3" y="17" width="18" height="4" rx="2" />
              <path d="M12 17V3" />
            </svg>
            <input id="file-upload" ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" style={{display: 'none'}} onChange={handleFileUpload} />
          </button>
          <button className="gpt-mic-btn" type="button" disabled={loading || !voiceMode} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', padding: '0 8px', borderRadius: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={startListening}>
            <svg width="24" height="24" stroke="currentColor" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
          <input
            className="gpt-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Everon..."
            disabled={loading}
            autoFocus
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#f3f3f3', fontSize: '1.12rem', padding: '14px 18px', borderRadius: '12px' }}
          />
          <button className="gpt-send-btn" type="submit" disabled={loading || !input.trim()} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', padding: '0 8px', borderRadius: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;