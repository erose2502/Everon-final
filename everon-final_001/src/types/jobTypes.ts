// Type definitions for job search functionality

export interface JobSearchResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  url?: string;
  posted_date?: string;
  match_score?: number;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote?: boolean;
}

export interface UserProfile {
  skills: string[];
  experience: string;
  location: string;
  jobTitle: string;
  preferences: {
    remote: boolean;
    salary?: string;
    industry?: string;
    jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  };
}

export interface JobSearchFilters {
  location?: string;
  salary?: string;
  remote?: boolean;
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience?: string;
  industry?: string;
}

export interface JobSearchParams {
  query?: string;
  filters?: JobSearchFilters;
  userProfile?: UserProfile;
  limit?: number;
}