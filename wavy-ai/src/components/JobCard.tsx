import React from 'react';
import { JobResult } from '../utils/jobSearchUtils';
import './JobCard.css';

interface JobCardProps {
  job: JobResult;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <a className="job-card" href={job.url} target="_blank" rel="noopener noreferrer">
      <div className="job-card-header">
        <span className="job-title">{job.title}</span>
        <span className="job-company">@ {job.company}</span>
        <span className="job-source">[{job.source}]</span>
      </div>
      <div className="job-card-body">
        <span className="job-location">{job.location}</span>
        <p className="job-description">{job.description}</p>
      </div>
      <div className="job-card-footer">
        <span className="fit-score">Chance: <b>{job.fitScore}%</b></span>
      </div>
    </a>
  );
};

export default JobCard;
