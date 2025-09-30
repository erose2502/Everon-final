import React, { useState, useRef, useEffect } from 'react';
import { JobSearchResult } from '../types/job';
import JobCard from './JobCard';
import './SwipeableJobCards.css';

interface SwipeableJobCardsProps {
  jobs: JobSearchResult[];
}

const SwipeableJobCards: React.FC<SwipeableJobCardsProps> = ({ jobs }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);
  const [dragVelocity, setDragVelocity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastMoveTime = useRef(Date.now());
  const lastPosition = useRef(0);

  const SWIPE_THRESHOLD = 100; // Minimum drag distance to trigger swipe
  const VELOCITY_THRESHOLD = 0.5; // Minimum velocity for quick swipes
  const maxIndex = jobs.length - 1;

  const calculateVelocity = (currentX: number) => {
    const now = Date.now();
    const timeDelta = now - lastMoveTime.current;
    const positionDelta = currentX - lastPosition.current;
    
    if (timeDelta > 0) {
      const velocity = positionDelta / timeDelta;
      setDragVelocity(velocity);
    }
    
    lastMoveTime.current = now;
    lastPosition.current = currentX;
  };

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setDragDistance(0);
    setDragVelocity(0);
    lastMoveTime.current = Date.now();
    lastPosition.current = clientX;
    
    // Cancel any ongoing animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    setDragDistance(deltaX);
    calculateVelocity(clientX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Determine if we should swipe based on distance or velocity
    const shouldSwipeLeft = dragDistance < -SWIPE_THRESHOLD || 
                           (dragDistance < -20 && dragVelocity < -VELOCITY_THRESHOLD);
    const shouldSwipeRight = dragDistance > SWIPE_THRESHOLD || 
                            (dragDistance > 20 && dragVelocity > VELOCITY_THRESHOLD);
    
    if (shouldSwipeLeft && currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    } else if (shouldSwipeRight && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    
    // Reset drag state
    setDragDistance(0);
    setDragVelocity(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Add mouse event listeners for drag support
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const getTransformValue = () => {
    const baseTransform = -currentIndex * 100; // Move by 100% per card
    
    if (isDragging && dragDistance !== 0) {
      // Add drag offset as a percentage of container width
      const containerWidth = containerRef.current?.offsetWidth || 300;
      const dragPercent = (dragDistance / containerWidth) * 100;
      return baseTransform + dragPercent;
    }
    
    return baseTransform;
  };

  // Handle indicator click to jump to specific card
  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="carousel-job-cards">
      <div className="carousel-header">
        <h3>🎯 Job Opportunities</h3>
        <div className="job-counter">
          <span className="current">{currentIndex + 1}</span>
          <span className="divider">/</span>
          <span className="total">{jobs.length}</span>
        </div>
      </div>

      <div className="carousel-container" ref={containerRef}>
        {/* Previous Button - Desktop Only */}
        {jobs.length > 1 && (
          <button 
            className="carousel-nav-btn carousel-nav-prev"
            onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="Previous job"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div
          className="carousel-track"
          style={{
            transform: `translateX(${getTransformValue()}%)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          {jobs.map((job, index) => (
            <div key={index} className="carousel-card">
              <JobCard job={job} />
            </div>
          ))}
        </div>

        {/* Next Button - Desktop Only */}
        {jobs.length > 1 && (
          <button 
            className="carousel-nav-btn carousel-nav-next"
            onClick={() => currentIndex < maxIndex && setCurrentIndex(currentIndex + 1)}
            disabled={currentIndex === maxIndex}
            aria-label="Next job"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Progress indicators */}
      <div className="carousel-indicators">
        {jobs.map((_, index) => (
          <div
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => handleIndicatorClick(index)}
            role="button"
            tabIndex={0}
            aria-label={`Go to job ${index + 1}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleIndicatorClick(index);
              }
            }}
          />
        ))}
      </div>

      {/* Drag hint for first-time users */}
      {currentIndex === 0 && jobs.length > 1 && (
        <div className="drag-hint">
          <div className="hint-content">
            <span className="hint-icon">👈</span>
            <span className="hint-text">Drag to browse jobs</span>
            <span className="hint-icon">👉</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableJobCards;