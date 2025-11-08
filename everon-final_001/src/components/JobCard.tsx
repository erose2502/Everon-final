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

  // Clean description - remove asterisks and format properly
  const cleanDescription = (desc?: string) => {
    if (!desc) return 'No description available';
    return desc
      .replace(/\*+/g, '') // Remove all asterisks
      .replace(/Job Title:/gi, '')
      .replace(/Company:/gi, '')
      .replace(/Location:/gi, '')
      .replace(/Description:/gi, '')
      .replace(/Job Description:/gi, '')
      .replace(/This role at/gi, '')
      .replace(/offers an exciting opportunity/gi, 'offers an exciting opportunity')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Clean any field that might have asterisks or extra labels
  const cleanText = (text?: string, fallback: string = 'Not specified') => {
    if (!text || text.trim() === '' || text === '0') return fallback;
    return text
      .replace(/\*+/g, '')
      .replace(/Job Title:\s*/gi, '')
      .replace(/Company:\s*/gi, '')
      .replace(/Location:\s*/gi, '')
      .trim();
  };

  return (
    <div className="job-card-modern" style={{ cursor: job.url ? 'pointer' : 'default' }}>
      {/* Header */}
      <div className="job-header">
        <div className="job-header-top">
          <h3 className="job-title-modern">{cleanText(job.title, 'Position Available')}</h3>
          {(job.match_score && job.match_score > 0) ? (
            <div 
              className="match-badge" 
              style={{ backgroundColor: getMatchScoreColor(job.match_score) }}
            >
              {job.match_score}%
            </div>
          ) : null}
        </div>
        
        <div className="job-company-info">
          <span className="company-name-modern">{cleanText(job.company, 'Company')}</span>
          {job.remote && <span className="pill-badge pill-remote">🌍 Remote</span>}
          {job.type && <span className="pill-badge pill-type">{job.type.replace('-', ' ')}</span>}
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="job-metadata-bar">
        {job.location && job.location !== '0' && (
          <div className="metadata-item">
            <span className="meta-icon">📍</span>
            <span className="meta-text">{cleanText(job.location, 'Remote')}</span>
          </div>
        )}
        <div className="metadata-item metadata-salary">
          <span className="meta-icon">💰</span>
          <span className="meta-text">{job.salary || 'Salary not disclosed'}</span>
        </div>
        <div className="metadata-item metadata-date">
          <span className="meta-icon">📅</span>
          <span className="meta-text">{formatDate(job.posted_date)}</span>
        </div>
      </div>

      {/* Description */}
      <div className="job-description-modern">
        <p>{cleanDescription(job.description)}</p>
      </div>

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <div className="job-requirements-modern">
          <div className="requirements-header">
            <span className="requirements-icon">✓</span>
            <span className="requirements-title">Requirements</span>
          </div>
          <div className="requirements-grid">
            {job.requirements.slice(0, 6).map((req, index) => (
              <span key={index} className="requirement-chip">
                {req}
              </span>
            ))}
            {job.requirements.length > 6 && (
              <span className="requirement-chip requirement-more">
                +{job.requirements.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="job-footer-modern">
        {job.url ? (
          <button className="apply-btn-modern" onClick={handleCardClick}>
            <span>View Job</span>
            <span className="arrow-icon">→</span>
          </button>
        ) : (
          <div className="no-link-text">Contact company directly</div>
        )}
      </div>
    </div>
  );
};

export default JobCard;
