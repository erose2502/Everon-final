import React from 'react';
import '../App.css';

const ThinkingAnimation: React.FC = () => {
  return (
    <div className="thinking-animation">
      <div className="thinking-bubble">
        <div className="thinking-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        <div className="thinking-text">AI thinking...</div>
      </div>
    </div>
  );
};

export default ThinkingAnimation;
