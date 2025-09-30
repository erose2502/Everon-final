import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface HandoffAnimationProps {
  title?: string;
  subtitle?: string;
  size?: number;
}

const HandoffAnimation: React.FC<HandoffAnimationProps> = ({ 
  title = "Processing Your Resume",
  subtitle = "Our AI is analyzing your experience...",
  size = 200
}) => {
  return (
    <div className="handoff-animation-container">
      <div className="handoff-animation-wrapper">
        <DotLottieReact
          src="https://lottie.host/8d0fdcbf-50ef-4b01-bd2d-09bd41cb2018/EZdRSGTQIB.lottie"
          loop
          autoplay
          style={{ 
            width: size, 
            height: size,
            margin: '0 auto'
          }}
        />
      </div>
      
      <div className="handoff-content">
        <h3 className="handoff-title">{title}</h3>
        <p className="handoff-subtitle">{subtitle}</p>
        
        <div className="handoff-progress">
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

export default HandoffAnimation;