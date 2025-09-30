import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import dataAnalysisAnimationUrl from '../assets/Data Analysis.lottie?url';

interface LottieAnimationProps {
  size?: number;
  className?: string;
}

interface VideoAnimationProps {
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onEnded?: () => void;
}

// Data Analysis Lottie Animation - For loading/processing states
export const DataAnalysisAnimation: React.FC<LottieAnimationProps> = ({ 
  size = 120, 
  className = '' 
}) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load Lottie animation data
    fetch(dataAnalysisAnimationUrl)
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(console.error);
  }, []);

  if (!animationData) {
    return (
      <div className={`data-analysis-loading ${className}`} style={{ width: size, height: size }}>
        <div className="loading-placeholder"></div>
      </div>
    );
  }

  return (
    <div className={`data-analysis-animation ${className}`}>
      <Lottie
        animationData={animationData}
        style={{ 
          width: size, 
          height: size,
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
        loop={true}
        renderer="svg" // Use SVG renderer for crisp quality
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: false,
          hideOnTransparent: true,
        }}
      />
    </div>
  );
};

// Rocket Success Animation - For achievement/success states
export const RocketSuccessAnimation: React.FC<VideoAnimationProps> = ({ 
  autoPlay = true, 
  loop = false, 
  className = '',
  onEnded 
}) => {
  return (
    <div className={`rocket-success-animation ${className}`}>
      <video
        autoPlay={autoPlay}
        loop={loop}
        muted
        playsInline
        onEnded={onEnded}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          borderRadius: '12px',
          transform: 'translateZ(0)', // Force hardware acceleration
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <source src="/src/assets/Businessman flies up with rocket.webm" type="video/webm" />
      </video>
    </div>
  );
};

// Premium Processing Indicator - Combines glassmorphic design with Lottie
export const PremiumProcessingIndicator: React.FC<{ message?: string }> = ({ 
  message = "Processing..." 
}) => {
  return (
    <div className="premium-processing-indicator">
      <div className="processing-glass-card">
        <DataAnalysisAnimation size={80} />
        <p className="processing-message">{message}</p>
      </div>
    </div>
  );
};

// Success Celebration Modal
export const SuccessCelebration: React.FC<{ 
  isVisible: boolean; 
  onComplete: () => void;
  title: string;
  message: string;
}> = ({ 
  isVisible, 
  onComplete, 
  title, 
  message 
}) => {
  if (!isVisible) return null;

  return (
    <div className="success-celebration-overlay">
      <div className="success-celebration-content">
        <button 
          className="success-close-btn" 
          onClick={onComplete}
          aria-label="Close celebration"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <RocketSuccessAnimation 
          autoPlay={true} 
          loop={false}
          onEnded={onComplete}
          className="success-video"
        />
        <div className="success-text">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
};