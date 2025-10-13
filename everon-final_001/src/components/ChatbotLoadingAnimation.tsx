import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface ChatbotLoadingAnimationProps {
  message?: string;
}

const ChatbotLoadingAnimation: React.FC<ChatbotLoadingAnimationProps> = ({ 
  message = "Everon is thinking..." 
}) => {
  return (
    <div className="chat-bubble-row assistant-row">
      <div className="chat-bubble assistant-bubble loading-bubble">
        <div className="loading-animation-wrapper">
          <DotLottieReact
            src="https://lottie.host/f141c87f-9931-4ca6-abda-6faf2df1c9c9/F4hkPTo9zO.lottie"
            loop
            autoplay
          />
        </div>
        <p className="chatbot-loading-text">{message}</p>
      </div>
    </div>
  );
};

export default ChatbotLoadingAnimation;
