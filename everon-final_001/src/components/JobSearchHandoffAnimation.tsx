import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface JobSearchHandoffAnimationProps {
  title?: string;
  subtitle?: string;
  size?: number;
  onClose?: () => void;
}

const JobSearchHandoffAnimation: React.FC<JobSearchHandoffAnimationProps> = ({ 
  title = "🔍 Finding Your Perfect Job",
  subtitle = "Searching for the best opportunities...",
  size = 200,
  onClose
}) => {
  return (
    <div className="job-search-handoff-container">
      {onClose && (
        <button 
          className="job-search-close-btn" 
          onClick={onClose}
          aria-label="Close job search animation"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      
      <div className="job-search-animation-wrapper">
        <DotLottieReact
          src="https://lottie.host/13c83b06-beef-487c-b4f7-2f8c7ad89f6c/IlHyf2gxgk.lottie"
          loop
          autoplay
          style={{ 
            width: size, 
            height: size,
            margin: '0 auto'
          }}
        />
      </div>
      
      <div className="job-search-content">
        <h3 className="job-search-title">{title}</h3>
        <p className="job-search-subtitle">{subtitle}</p>
        
        <div className="job-search-progress">
          <div className="progress-dots">
            <span className="dot active"></span>
            <span className="dot active"></span>
            <span className="dot active"></span>
            <span className="dot pulsing"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSearchHandoffAnimation;