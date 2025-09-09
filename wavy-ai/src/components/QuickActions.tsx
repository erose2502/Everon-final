import React from 'react';

interface QuickActionsProps {
  promptSuggestions: Record<string, string[]>;
  activeAction: string | null;
  setActiveAction: (action: string | null) => void;
  setInput: (input: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ promptSuggestions, activeAction, setActiveAction, setInput }) => {
  const keys = Object.keys(promptSuggestions);
  const visibleActions = keys.slice(0, 3); // limit to 3 actions to keep the row compact

  // simple inline icons per action label
  const actionIcon = (label: string) => {
    if (label.toLowerCase().includes('resume')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7h6M8 11h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (label.toLowerCase().includes('job')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M9 3h6v4H9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      );
    }
    // default icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const suggestionIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2v20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5 9h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setActiveAction(null); // Close the dropdown after selection
  };

  return (
    <div className="quick-actions-container">
      <div className="quick-actions-bar">
        {visibleActions.map(action => (
          <button
            key={action}
            className={`quick-action-btn ${activeAction === action ? 'active' : ''}`}
            onClick={() => setActiveAction(activeAction === action ? null : action)}
          >
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {actionIcon(action)}
              <span>{action}</span>
            </span>
          </button>
        ))}
      </div>

      {activeAction && promptSuggestions[activeAction] && (
        <div className="suggestions-dropdown">
          {promptSuggestions[activeAction].map((suggestion, idx) => (
            <button
              key={idx}
              className="suggestion-btn"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ opacity: 0.9 }}>{suggestionIcon}</span>
                <span style={{ textAlign: 'left' }}>{suggestion}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickActions;