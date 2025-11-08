import React, { useState, useEffect } from 'react';
import './LanguageSuggestion.css';

interface LanguageSuggestionProps {
  onClose: () => void;
}

const LanguageSuggestion: React.FC<LanguageSuggestionProps> = ({ onClose }) => {
  const [currentTip, setCurrentTip] = useState(0);

  const languageTips = [
    {
      flag: '🇺🇸',
      language: 'English',
      example: 'Hello, I\'m looking for a job',
      description: 'Default language - just start typing!'
    },
    {
      flag: '🇫🇷',
      language: 'Français',
      example: 'Bonjour, je cherche un travail',
      description: 'Type in French and I\'ll automatically detect it'
    },
    {
      flag: '🇸🇦',
      language: 'العربية',
      example: 'مرحبا، أبحث عن وظيفة',
      description: 'Type in Arabic and I\'ll respond in Arabic'
    },
    {
      flag: '🇪🇸',
      language: 'Español',
      example: 'Hola, busco trabajo',
      description: 'Type in Spanish for Spanish responses'
    },
    {
      flag: '🇰🇪',
      language: 'Kiswahili',
      example: 'Hujambo, natafuta kazi',
      description: 'Type in Swahili and I\'ll understand'
    },
    {
      flag: '🇨🇳',
      language: '中文',
      example: '你好，我在找工作',
      description: 'Type in Chinese for Chinese responses'
    },
    {
      flag: '🇸🇪',
      language: 'Svenska',
      example: 'Hej, jag söker jobb',
      description: 'Type in Swedish and I\'ll respond in Swedish'
    },
    {
      flag: '🇧🇷',
      language: 'Português',
      example: 'Olá, estou procurando emprego',
      description: 'Type in Portuguese for Portuguese responses'
    },
    {
      flag: '🇮🇳',
      language: 'हिन्दी',
      example: 'नमस्ते, मैं नौकरी खोज रहा हूं',
      description: 'Type in Hindi and I\'ll respond in Hindi'
    },
    {
      flag: '🇩🇪',
      language: 'Deutsch',
      example: 'Hallo, ich suche einen Job',
      description: 'Type in German for German responses'
    },
    {
      flag: '🇯🇵',
      language: '日本語',
      example: 'こんにちは、仕事を探しています',
      description: 'Type in Japanese and I\'ll respond in Japanese'
    },
    {
      flag: '🇰🇷',
      language: '한국어',
      example: '안녕하세요, 일자리를 찾고 있습니다',
      description: 'Type in Korean for Korean responses'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % languageTips.length);
    }, 3000); // Change tip every 3 seconds

    return () => clearInterval(interval);
  }, [languageTips.length]);

  return (
    <div className="language-suggestion-overlay">
      <div className="language-suggestion-card">
        <button className="close-btn" onClick={onClose} title="Close">
          ×
        </button>
        
        <h3>🌍 Multi-Language Support</h3>
        <p className="main-description">
          I automatically detect your language! Just start typing in any of these languages:
        </p>
        
        <div className="language-tip-carousel">
          <div className="language-tip active">
            <div className="language-header">
              <span className="flag">{languageTips[currentTip].flag}</span>
              <span className="language-name">{languageTips[currentTip].language}</span>
            </div>
            <div className="example-text">"{languageTips[currentTip].example}"</div>
            <div className="description">{languageTips[currentTip].description}</div>
          </div>
        </div>
        
        <div className="carousel-indicators">
          {languageTips.map((_, index) => (
            <span 
              key={index}
              className={`indicator ${index === currentTip ? 'active' : ''}`}
              onClick={() => setCurrentTip(index)}
            />
          ))}
        </div>
        
        <div className="action-section">
          <p className="how-to">
            💡 <strong>How it works:</strong> Just type your message in any language and I'll automatically detect and respond in the same language!
          </p>
          <button className="try-now-btn" onClick={onClose}>
            Try It Now!
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSuggestion;