import React, { useState } from 'react';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
  userName?: string;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  animation?: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: `Welcome to Everon${userName ? `, ${userName}` : ''}! 👋`,
      description: "Your AI-powered career coach that helps you find jobs, prepare for interviews, and accelerate your career growth.",
      icon: "🚀",
      animation: "fade-in"
    },
    {
      id: 2,
      title: "Voice & Text Conversations 🎤",
      description: "Talk to me just like a real career coach. Use voice or text to search for jobs, get career advice, and prepare for interviews.",
      icon: "💬",
      animation: "slide-up"
    },
    {
      id: 3,
      title: "Smart Job Search 🔍",
      description: "I search Indeed, LinkedIn, Glassdoor, and company career pages to find the perfect opportunities for you. Just tell me what you're looking for!",
      icon: "💼",
      animation: "slide-up"
    },
    {
      id: 4,
      title: "Resume Intelligence 📄",
      description: "Upload your resume and I'll analyze it, suggest improvements, and help you tailor it for specific jobs to beat ATS systems.",
      icon: "✨",
      animation: "slide-up"
    },
    {
      id: 5,
      title: "Interview Preparation 🎯",
      description: "Get company-specific interview questions, practice with AI, and receive personalized coaching to nail your interviews.",
      icon: "💪",
      animation: "slide-up"
    },
    {
      id: 6,
      title: "Multi-Language Support 🌍",
      description: "I speak 13 languages including English, Spanish, French, Chinese, and more. Choose your preferred language anytime!",
      icon: "🗣️",
      animation: "slide-up"
    },
    {
      id: 7,
      title: "Ready to Get Started? 🎉",
      description: "Let's find your dream job! Try asking me something like: 'Find me software engineering jobs in New York' or 'Help me prepare for a product manager interview.'",
      icon: "🌟",
      animation: "slide-up"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('everon_onboarding_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('everon_onboarding_completed', 'true');
    onComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="onboarding-progress-container">
          <div 
            className="onboarding-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Counter */}
        <div className="onboarding-step-counter">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Content */}
        <div className={`onboarding-content ${isAnimating ? 'animating' : ''}`}>
          <div className="onboarding-icon">{step.icon}</div>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>
        </div>

        {/* Navigation Dots */}
        <div className="onboarding-dots">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`onboarding-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentStep(index);
                  setIsAnimating(false);
                }, 300);
              }}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="onboarding-actions">
          <button 
            className="onboarding-btn onboarding-btn-secondary"
            onClick={handleSkip}
          >
            Skip
          </button>

          <div className="onboarding-nav-buttons">
            {currentStep > 0 && (
              <button 
                className="onboarding-btn onboarding-btn-ghost"
                onClick={handlePrevious}
              >
                ← Back
              </button>
            )}
            
            <button 
              className="onboarding-btn onboarding-btn-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Let's Go! 🚀" : 'Next →'}
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        {currentStep === steps.length - 1 && (
          <div className="onboarding-quick-tips">
            <h4>💡 Quick Tips to Get Started:</h4>
            <ul>
              <li>Click the microphone icon to use voice mode</li>
              <li>Upload your resume for personalized job matching</li>
              <li>Save your favorite jobs by creating an account</li>
              <li>Ask me anything about your career goals!</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
