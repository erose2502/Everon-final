import React, { useState } from 'react';
import ChatbotAnimation from './ChatbotAnimation';
import SpeechHandoffAnimation from './SpeechHandoffAnimation';
import VoiceCaptureAnimation from './VoiceCaptureAnimation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SpeechModeUIProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing?: boolean;
  isTTSSpeaking?: boolean;
  onToggleListening: () => void;
  onEndSpeechMode: () => void;
  transcript?: string;
  error?: string | null;
  recentMessages?: Message[]; // Show recent conversation context
}

const SpeechModeUI: React.FC<SpeechModeUIProps> = ({
  isListening,
  isSpeaking,
  isProcessing = false,
  isTTSSpeaking = false,
  onToggleListening,
  onEndSpeechMode,
  transcript,
  error,
  recentMessages = []
}) => {
  const [showConversationHistory, setShowConversationHistory] = useState(false);

  return (
    <div className="speech-mode-overlay">
      <div className="speech-mode-container">
        {/* Header */}
        <div className="speech-mode-header">
          <div className="header-left">
            <h2>Voice Chat with Everon</h2>
          </div>
          
          <div className="header-actions">
            <button 
              className="close-speech-mode"
              onClick={onEndSpeechMode}
              title="Exit Speech Mode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Voice Interface */}
        <div className="speech-mode-main">
          {/* Voice Visualizer */}
          <div className="voice-visualizer">
            {isProcessing ? (
              <SpeechHandoffAnimation
                title="Processing Your Voice"
                size={160}
              />
            ) : isSpeaking ? (
              <VoiceCaptureAnimation
                title="Voice Detected"
                size={140}
              />
            ) : (
              <div className={`voice-circle ${isListening ? 'listening' : ''} ${isTTSSpeaking ? 'speaking' : ''}`}>
                <ChatbotAnimation 
                  size={200}
                  isListening={isListening}
                  isSpeaking={isTTSSpeaking}
                />
              </div>
            )}
          </div>

          {/* Recruiter Instructions */}
          <div className="recruiter-prompt">
            <p>🎯 <strong>Active Recruiter Mode</strong></p>
            <p>Tell me about your background or say things like:</p>
            <div className="recruiter-examples">
              <span>"Find me a software developer job in New York"</span>
              <span>"I'm looking for remote marketing roles"</span>
              <span>"Show me data analyst positions near me"</span>
            </div>
          </div>

          {/* Status */}
          <div className="voice-status">
            {error ? (
              <p className="voice-error">{error}</p>
            ) : isProcessing ? (
              <div className="premium-status">
                <p>🧠 Crafting your personalized response...</p>
                <div className="processing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            ) : isTTSSpeaking ? (
              <p>🗣️ Everon is responding...</p>
            ) : isSpeaking ? (
              <p>�️ Capturing your voice... keep talking!</p>
            ) : isListening ? (
              <p>👂 Listening... Speak naturally</p>
            ) : (
              <p>🗣️ Ready to listen</p>
            )}
          </div>

          {/* Current Transcript Display */}
          {transcript && (
            <div className="transcript-display">
              <p>"{transcript}"</p>
            </div>
          )}

          {/* Collapsible Recent Conversation History */}
          {recentMessages.length > 0 && (
            <div className="conversation-history-dropdown">
              <button 
                className="conversation-toggle"
                onClick={() => setShowConversationHistory(!showConversationHistory)}
              >
                <span className="toggle-text">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Recent Conversation ({recentMessages.length})
                </span>
                <svg 
                  className={`toggle-arrow ${showConversationHistory ? 'expanded' : ''}`}
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
              
              {showConversationHistory && (
                <div className="conversation-dropdown-content">
                  <div className="messages-scroll">
                    {recentMessages.slice(-6).map((msg, idx) => (
                      <div key={idx} className={`message ${msg.role}`}>
                        <strong>{msg.role === 'user' ? 'You:' : 'Everon:'}</strong>
                        <span>{msg.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Controls */}
          <div className="voice-controls">
            {/* Main Voice Control Button - Centered */}
            <button 
              className={`voice-control-btn ${isListening ? 'active' : ''}`}
              onClick={onToggleListening}
              disabled={isSpeaking}
            >
              {isListening ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                  Stop Listening
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="22"></line>
                    <line x1="8" y1="22" x2="16" y2="22"></line>
                  </svg>
                  Start Listening
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="speech-instructions">
            <p>� Tell me what kind of job you're looking for - I'll find opportunities for you!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechModeUI;