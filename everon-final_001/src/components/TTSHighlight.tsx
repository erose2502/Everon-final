import React, { useState, useEffect, useRef } from 'react';

const TTSHighlight: React.FC<{ text: string }> = ({ text }) => {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const words = text ? text.split(/\s+/) : [];
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!text) {
      setCurrentWordIdx(-1);
      return;
    }
    setCurrentWordIdx(0);
    let idx = 0;
    intervalRef.current = window.setInterval(() => {
      setCurrentWordIdx(idx);
      idx++;
      if (idx >= words.length && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 120); // Adjusted speed for readability

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, words.length]);

  return (
    <span>
      {words.map((word, i) => (
        <span key={i} className={`tts-word ${i <= currentWordIdx ? 'active' : ''}`}>
          {word}{' '}
        </span>
      ))}
    </span>
  );
};

export default TTSHighlight;