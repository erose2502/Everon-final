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
      {/* Header Section */}
      <div className="job-card-header-enhanced">
        <div className="job-title-section">
          <h3 className="job-title-enhanced">{job.title}</h3>
          <div className="job-meta-badges">
            {job.match_score && (
              <span 
                className="match-score-enhanced" 
                style={{ backgroundColor: getMatchScoreColor(job.match_score) }}
              >
                <span className="match-icon">🎯</span>
                {job.match_score}% Match
              </span>
            )}
            {job.type && (
              <span className="job-type-badge">
                <span className="type-icon">⏰</span>
                {job.type}
              </span>
            )}
            {job.remote && (
              <span className="remote-badge">
                <span className="remote-icon">🌐</span>
                Remote
              </span>
            )}
          </div>
        </div>
        
        <div className="company-info">
          <h4 className="job-company-enhanced">
            <span className="company-icon">🏢</span>
            {job.company}
          </h4>
          <div className="job-details-row">
            <span className="job-location-enhanced">
              <span className="location-icon">📍</span>
              {job.location}
            </span>
            {job.salary && (
              <span className="job-salary-enhanced">
                <span className="salary-icon">💰</span>
                {job.salary}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body Section */}
      <div className="job-card-body-enhanced">
        {job.description && (
          <div className="job-description-section">
            <h5 className="section-title">
              <span className="desc-icon">📝</span>
              Job Description
            </h5>
            <p className="job-description-enhanced">{job.description}</p>
          </div>
        )}

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
