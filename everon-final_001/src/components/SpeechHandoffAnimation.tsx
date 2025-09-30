import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface SpeechHandoffAnimationProps {
  title?: string;
  subtitle?: string;
  size?: number;
}

const SpeechHandoffAnimation: React.FC<SpeechHandoffAnimationProps> = ({ 
  title = "Processing Your Voice",
  subtitle,
  size = 160
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const processingMessages = [
    "Analyzing your question...",
    "Understanding context...",
    "Crafting personalized advice...",
    "Preparing your response..."
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % processingMessages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [processingMessages.length]);
  
  const currentSubtitle = subtitle || processingMessages[messageIndex];
  return (
    <div className="speech-handoff-container">
      <div className="speech-handoff-wrapper">
        <DotLottieReact
          src="https://lottie.host/5f7cada7-967e-4f43-a1ca-fc2c7af103bc/imlhVl2bqy.lottie"
          loop
          autoplay
          style={{ 
            width: size, 
            height: size,
            margin: '0 auto'
          }}
        />
      </div>
      
      <div className="speech-handoff-content">
        <h3 className="speech-handoff-title">{title}</h3>
        <p className="speech-handoff-subtitle">{currentSubtitle}</p>
        
        <div className="speech-thinking-indicator">
          <div className="thinking-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechHandoffAnimation;