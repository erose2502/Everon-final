import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface VoiceCaptureAnimationProps {
  title?: string;
  subtitle?: string;
  size?: number;
}

const VoiceCaptureAnimation: React.FC<VoiceCaptureAnimationProps> = ({ 
  title = "Voice Detected",
  subtitle,
  size = 140
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const captureMessages = [
    "I'm capturing your voice...",
    "Keep speaking, I'm listening...",
    "Recording your question...",
    "Getting every word..."
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % captureMessages.length);
    }, 1500); // Faster cycling for active voice capture
    
    return () => clearInterval(interval);
  }, [captureMessages.length]);
  
  const currentSubtitle = subtitle || captureMessages[messageIndex];
  return (
    <div className="voice-capture-container">
      <div className="voice-capture-wrapper">
        <DotLottieReact
          src="https://lottie.host/c09c0f6f-8d22-430a-9631-4cdebc527f43/FVKdrcgopY.lottie"
          loop
          autoplay
          style={{ 
            width: size, 
            height: size,
            margin: '0 auto'
          }}
        />
      </div>
      
      <div className="voice-capture-content">
        <h3 className="voice-capture-title">{title}</h3>
        <p className="voice-capture-subtitle">{currentSubtitle}</p>
        
        <div className="voice-wave-indicator">
          <div className="wave-bars">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCaptureAnimation;