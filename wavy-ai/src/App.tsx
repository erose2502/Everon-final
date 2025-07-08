import { useState } from 'react'
import './App.css'
import { askOpenAIAgent } from './agents'
import ParticleBackground from './ParticleBackground';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await askOpenAIAgent(input);
      setMessages(msgs => [...msgs, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'Error: ' + (e as Error).message }]);
    }
    setLoading(false);
  }

  return (
    <div className="chat-container" style={{ position: 'relative', zIndex: 1 }}>
      <ParticleBackground />
      <h1>Everon</h1>
      <h2>Elijah's AI Assistant</h2>
      <div className="chat-bubble-stack">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Everon'}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant">Everon is typing...</div>}
      </div>
      {/* Chat input as a rounded bubble with send button */}
      <div className="chat-input-bubble" style={{ borderRadius: 30 }}>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask Everon about your career questions..."
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default App
