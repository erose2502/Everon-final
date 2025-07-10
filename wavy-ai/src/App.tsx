import { useState, useRef } from 'react';
import './App.css';
import { streamOpenAIAgent } from './streamAgent';
import { searchJobs } from './jobTool';
import ParticleBackground from './ParticleBackground';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [liveReply, setLiveReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [outputMode, setOutputMode] = useState<'voice' | 'text'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.toLowerCase();
      if (!transcript) return;
      if (transcript.startsWith("hey everon")) {
        const command = transcript.replace("hey everon", "").trim();
        if (command) sendMessage(command);
      }
    };

    recognition.onerror = (event: any) => {
      alert('Voice recognition error: ' + event.error);
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const sendMessage = async (text?: string) => {
    const messageToSend = text ?? input;
    if (!messageToSend.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: messageToSend }]);
    setInput('');
    setLiveReply('');
    setLoading(true);
    setIsTyping(true);

    try {
      if (/job|work|career|apply|hiring|remote/i.test(messageToSend)) {
        const jobLinks = await searchJobs(messageToSend);
        const jobText = `🔍 Found these job listings:\n\n` + jobLinks.map((link: string) => `- ${link}`).join('\n');
        setMessages((prev) => [...prev, { role: 'assistant', content: jobText }]);
        return;
      }

      let reply = '';
      await streamOpenAIAgent(messageToSend, (token: string) => {
        reply += token;
        setLiveReply((prev) => prev + token);
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      if (outputMode === 'voice') {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: 'tts-1-hd', voice: 'alloy', input: reply })
        });

        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);

        setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          if (outputMode === 'voice') startListening();
        };
        await audio.play();
      }
    } catch (err) {
      console.error('❌ Streaming failed:', err);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-container">
      <ParticleBackground isSpeaking={isSpeaking} />
      <h1 className="title">Everon</h1>
      <h2 className="subtitle">ELijah's AI Assistant</h2>
      <p className="description">
        Ask Everon anything! Type or use voice commands starting with "Hey Everon".
      </p>
      <div className="mode-toggle">
        <button onClick={() => setOutputMode((prev) => (prev === 'voice' ? 'text' : 'voice'))}>
          Mode: {outputMode === 'voice' ? '🎙 Voice' : '💬 Text'}
        </button>
      </div>

      <div className="chat-bubble-stack">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Everon'}:</strong> {msg.content}
          </div>
        ))}
        {isTyping && liveReply && (
          <div className="chat-bubble assistant">
            <strong>Everon:</strong> {liveReply}
          </div>
        )}
        {isTyping && !liveReply && (
          <div className="chat-bubble assistant">
            <em>Everon is typing...</em>
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input-bubble">
          <button
            onClick={startListening}
            disabled={loading}
            className={isListening ? 'mic-icon-animated' : 'mic-btn'}
          >
            <svg width="24" height="24" stroke="currentColor" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>

          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask Everon..."
          />

          <button onClick={() => sendMessage()} className="send-btn" disabled={!input.trim() || loading}>
            {loading ? <span className="spinner" /> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
