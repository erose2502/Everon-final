import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getUserChatSessions, loadChatSession, deleteChatSession, ChatSession } from '../services/chatHistoryService';

interface ChatHistorySidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (sessionId: string, messages: any[]) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  user,
  isOpen,
  onClose,
  onLoadSession,
  onNewChat,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadSessions();
    }
  }, [user, isOpen]);

  const loadSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userSessions = await getUserChatSessions(user.uid);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      const session = await loadChatSession(sessionId);
      if (session) {
        onLoadSession(sessionId, session.messages);
        onClose();
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation?')) return;
    
    setDeletingId(sessionId);
    try {
      const success = await deleteChatSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="sidebar-overlay" onClick={onClose}></div>
      
      {/* Sidebar */}
      <div className="chat-history-sidebar">
        <div className="sidebar-header">
          <h2>Chat History</h2>
          <button className="sidebar-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="new-chat-icon">+</span>
          New Chat
        </button>

        <div className="sessions-list">
          {loading ? (
            <div className="sessions-loading">
              <div className="loading-spinner"></div>
              <p>Loading conversations...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="sessions-empty">
              <p>No saved conversations yet</p>
              <small>Your chats will appear here</small>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${currentSessionId === session.id ? 'active' : ''} ${deletingId === session.id ? 'deleting' : ''}`}
                onClick={() => handleLoadSession(session.id)}
              >
                <div className="session-content">
                  <h3 className="session-title">{session.title}</h3>
                  <p className="session-preview">
                    {session.messages[session.messages.length - 1]?.content.substring(0, 60) || 'No messages'}...
                  </p>
                  <div className="session-meta">
                    <span className="session-date">{formatDate(session.updatedAt.getTime())}</span>
                    {session.language !== 'english' && (
                      <span className="session-language">{session.language}</span>
                    )}
                  </div>
                </div>
                <button
                  className="delete-session-btn"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  disabled={deletingId === session.id}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ChatHistorySidebar;
