import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface ChatbotAnimationProps {
  size?: number;
  isListening?: boolean;
  isSpeaking?: boolean;
}

const ChatbotAnimation: React.FC<ChatbotAnimationProps> = ({ 
  size = 120,
  isListening = false,
  isSpeaking = false
}) => {
  return (
    <div className={`chatbot-animation-wrapper ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      <DotLottieReact
        src="https://lottie.host/6b583972-f57b-4627-ba18-df1958aa55b3/cXP7r0Tzqv.lottie"
        loop
        autoplay
        style={{ 
          width: size, 
          height: size,
          margin: '0 auto'
        }}
      />
    </div>
  );
};

export default ChatbotAnimation;