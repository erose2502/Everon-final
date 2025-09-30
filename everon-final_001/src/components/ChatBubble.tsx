import React from 'react';
import SpeakingIndicator from './SpeakingIndicator';
import TypingDots from './TypingDots';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  meta?: { structured?: boolean };
}

// Corrected props - removed isLoading and partialReply
interface ChatBubbleProps {
  msg: Message;
  isLastMessage: boolean;
  isSpeaking?: boolean;
  index?: number; // used for staggered animation timing
  onPlayTTS?: (text: string) => void;
  onPauseTTS?: () => void;
  onResumeTTS?: () => void;
  ttsEnabled?: boolean;
  isTTSActive?: boolean;
  isTTSPaused?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  msg, 
  isLastMessage, 
  isSpeaking, 
  index, 
  onPlayTTS, 
  onPauseTTS, 
  onResumeTTS, 
  ttsEnabled, 
  isTTSActive, 
  isTTSPaused 
}) => {
  // User Message Bubble
  if (msg.role === 'user') {
    return (
      <div className="chat-bubble-row user-row">
        <div className="chat-bubble user-bubble" style={{ ['--delay' as any]: `${(index ?? 0) * 60}ms` }}>{msg.content}</div>
      </div>
    );
  }

  // Structured Response (e.g., Resume Review)
  if (msg.meta?.structured) {
    const lines: string[] = msg.content.split(/\r?\n/);
    type Section = { type: 'heading' | 'list' | 'paragraph'; content: string | string[] };
    const sectionIcons: Record<string, string> = {
      Summary: '📝',
      Strengths: '💪',
      'Areas for Improvement': '⚠️',
      Suggestions: '💡',
    };
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    lines.forEach((line: string) => {
      const headingMatch = line.match(/^\*\*([A-Za-z ]+)\*\*/);
      if (headingMatch) {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'heading', content: headingMatch[1] };
      } else if (/^[-*•]/.test(line.trim())) {
        if (!currentSection || currentSection.type !== 'list') {
          if (currentSection) sections.push(currentSection);
          currentSection = { type: 'list', content: [] };
        }
        (currentSection.content as string[]).push(line.replace(/^[-*•]\s*/, ''));
      } else if (line.trim()) {
        if (!currentSection || currentSection.type !== 'paragraph') {
          if (currentSection) sections.push(currentSection);
          currentSection = { type: 'paragraph', content: line.trim() };
        } else {
          currentSection.content += ' ' + line.trim();
        }
      }
    });
    if (currentSection) sections.push(currentSection);

    return (
      <div className="chat-bubble-row assistant-row">
        <div className="chat-bubble structured-bubble" style={{ ['--delay' as any]: `${(index ?? 0) * 60}ms` }}>
          {sections.map((section, i) => {
            if (section.type === 'heading') {
              const headingText = String(section.content).replace(/\*\*/g, '').trim();
              const icon = sectionIcons[headingText] || '✨';
              return (
                <h2 key={i} className="structured-heading">
                  <span>{icon}</span>
                  {headingText}
                </h2>
              );
            }
            if (section.type === 'list') {
              return (
                <ul key={i} className="structured-list">
                  {(section.content as string[]).map((item, j) => (
                    <li key={j}>
                      <span>✅</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            return <p key={i} className="structured-paragraph">{section.content}</p>;
          })}
          {/* TTS Controls for structured responses */}
          {ttsEnabled && onPlayTTS && (
            <div className="tts-controls">
              {!isTTSActive ? (
                <button 
                  className="tts-btn" 
                  onClick={() => onPlayTTS(msg.content)}
                  title="Play with text-to-speech"
                  disabled={isSpeaking}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              ) : (
                <>
                  {!isTTSPaused ? (
                    <button 
                      className="tts-btn active" 
                      onClick={onPauseTTS}
                      title="Pause text-to-speech"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    </button>
                  ) : (
                    <button 
                      className="tts-btn paused" 
                      onClick={onResumeTTS}
                      title="Resume text-to-speech"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard Assistant Message
  return (
    <div className="chat-bubble-row assistant-row">
      <div className="chat-bubble assistant-bubble" style={{ ['--delay' as any]: `${(index ?? 0) * 60}ms` }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        {isLastMessage && isSpeaking && <div style={{ marginTop: 8 }}><SpeakingIndicator /></div>}
        {/* TTS Controls */}
        {ttsEnabled && onPlayTTS && (
          <div className="tts-controls">
            {!isTTSActive ? (
              <button 
                className="tts-btn" 
                onClick={() => onPlayTTS(msg.content)}
                title="Play with text-to-speech"
                disabled={isSpeaking}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </button>
            ) : (
              <>
                {!isTTSPaused ? (
                  <button 
                    className="tts-btn active" 
                    onClick={onPauseTTS}
                    title="Pause text-to-speech"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                  </button>
                ) : (
                  <button 
                    className="tts-btn paused" 
                    onClick={onResumeTTS}
                    title="Resume text-to-speech"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Component for showing the streaming reply
export const StreamingBubble: React.FC<{ partialReply: string }> = ({ partialReply }) => (
  <div className="chat-bubble-row assistant-row">
    <div className="chat-bubble assistant-bubble">
      <div style={{ whiteSpace: 'pre-wrap' }}>{partialReply}</div>
      <TypingDots />
    </div>
  </div>
);


export default ChatBubble;