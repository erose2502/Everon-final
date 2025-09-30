import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface StartupAnimationProps {
  onComplete: () => void;
}

const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2200);

    // Complete after fade out
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`startup-animation-overlay ${isFadingOut ? 'fading-out' : ''}`}>
      <div className="startup-animation-content">
        <DotLottieReact
          src="https://lottie.host/90cde54b-6b59-455c-9904-bc9c318d19af/p7cNRNGHh3.lottie"
          loop
          autoplay
          style={{ width: '300px', height: '300px' }}
        />
        <h1 className="startup-title">Everon</h1>
        <p className="startup-subtitle">AI Career Coach</p>
      </div>
    </div>
  );
};

export default StartupAnimation;