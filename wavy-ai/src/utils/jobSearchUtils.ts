// Utility functions for searching jobs and ranking them by resume fit

export interface JobResult {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: 'Indeed' | 'Glassdoor' | 'LinkedIn';
  fitScore: number; // 0-100
}

export async function searchJobs(query: string, resumeText: string): Promise<JobResult[]> {
  // TODO: Integrate with real APIs or scraping endpoints
  // For now, return mock data
  const mockJobs: JobResult[] = [
    {
      title: 'Frontend Developer',
      company: 'Techify',
      location: 'Remote',
      url: 'https://www.indeed.com/viewjob?jk=123',
      description: 'Build cool web apps with React and TypeScript.',
      source: 'Indeed',
      fitScore: 92,
    },
    {
      title: 'UI/UX Designer',
      company: 'DesignHub',
      location: 'New York, NY',
      url: 'https://www.glassdoor.com/job-listing/456',
      description: 'Create stunning user experiences for mobile and web.',
      source: 'Glassdoor',
      fitScore: 78,
    },
    {
      title: 'Software Engineer',
      company: 'LinkedIn',
      location: 'San Francisco, CA',
      url: 'https://www.linkedin.com/jobs/view/789',
      description: 'Work on scalable backend systems and APIs.',
      source: 'LinkedIn',
      fitScore: 85,
    },
  ];
  // Sort by fitScore descending
  return mockJobs.sort((a, b) => b.fitScore - a.fitScore);
}
