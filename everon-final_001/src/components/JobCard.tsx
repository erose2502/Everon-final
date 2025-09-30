import React from 'react';
import { JobSearchResult } from '../types/job';
import './JobCard.css';

interface JobCardProps {
  job: JobSearchResult;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    } else {
      e.preventDefault();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently posted';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    } catch {
      return 'Recently posted';
    }
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return '#6b7280';
    if (score >= 90) return '#10b981'; // green
    if (score >= 75) return '#f59e0b'; // yellow
    if (score >= 60) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="job-card-enhanced" onClick={handleCardClick} style={{ cursor: job.url ? 'pointer' : 'default' }}>
      {/* Header Section - Clean & Compelling Design */}
      <div className="job-card-header-clean">
        <div className="header-main">
          <div className="title-company-row">
            <h3 className="job-title-clean">{job.title}</h3>
            <div className="match-indicator">
              {job.match_score && (
                <div 
                  className="match-score-clean" 
                  style={{ backgroundColor: getMatchScoreColor(job.match_score) }}
                >
                  {job.match_score}%
                </div>
              )}
            </div>
          </div>
          
          <div className="company-row">
            <span className="company-name">{job.company}</span>
            {job.remote && <span className="remote-tag">Remote OK</span>}
          </div>
        </div>
        
        <div className="header-meta">
          {job.salary && (
            <div className="salary-display">
              <span className="salary-amount">{job.salary}</span>
            </div>
          )}
          <div className="job-badges">
            {job.type && (
              <span className="type-badge">{job.type.replace('-', ' ')}</span>
            )}
            <span className="posted-date">{formatDate(job.posted_date)}</span>
          </div>
        </div>
      </div>

      {/* Body Section */}
      <div className="job-card-body-enhanced">
        {/* Location Section */}
        <div className="job-location-section">
          <span className="location-icon">📍</span>
          <span className="location-text">{job.location}</span>
        </div>

        {/* Description Section - Always show */}
        <div className="job-description-section">
          <h5 className="section-title">
            <span className="desc-icon">📝</span>
            Job Description
          </h5>
          <p className="job-description-enhanced">{job.description}</p>
        </div>

        {job.requirements && job.requirements.length > 0 && (
          <div className="job-requirements-section">
            <h5 className="section-title">
              <span className="req-icon">✅</span>
              Requirements ({job.requirements.length})
            </h5>
            <div className="requirements-tags">
              {job.requirements.slice(0, 5).map((req, index) => (
                <span key={index} className="requirement-tag">
                  {req}
                </span>
              ))}
              {job.requirements.length > 5 && (
                <span className="requirement-tag more-req">
                  +{job.requirements.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="job-card-footer">
        <div className="job-posted-date">
          <span className="date-icon">🕒</span>
          {formatDate(job.posted_date)}
        </div>
        {job.url ? (
          <div className="apply-button">
            <span className="apply-icon">🚀</span>
            Click to Apply
          </div>
        ) : (
          <div className="no-link-notice">
            <span className="info-icon">ℹ️</span>
            Contact company directly
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCard;
