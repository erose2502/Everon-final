// Job Search Utility using Perplexity API for real-time job matching
import type { JobSearchResult, UserProfile } from '../types/job';

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

export class JobSearchService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    if (!this.apiKey) {
      throw new Error('Perplexity API key not found in environment variables');
    }
  }

  /**
   * Extract user profile information from resume text
   */
  extractUserProfile(resumeText: string): UserProfile {
    // Basic extraction logic - can be enhanced with more sophisticated parsing
    const skills = this.extractSkills(resumeText);
    const experience = this.extractExperience(resumeText);
    const location = this.extractLocation(resumeText);
    const jobTitle = this.extractJobTitle(resumeText);

    return {
      skills,
      experience,
      location,
      jobTitle,
      preferences: {
        remote: resumeText.toLowerCase().includes('remote'),
        salary: this.extractSalary(resumeText),
        industry: this.extractIndustry(resumeText)
      }
    };
  }

  /**
   * Search for jobs using Perplexity AI with personalized queries
   */
  async searchJobs(
    userProfile: UserProfile, 
    query?: string,
    location?: string
  ): Promise<JobSearchResult[]> {
    try {
      const searchQuery = this.buildSearchQuery(userProfile, query, location);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are a job search assistant. Find real-time job postings that match the user's profile. 
              Return results in JSON format with the following structure:
              {
                "jobs": [
                  {
                    "title": "Job Title",
                    "company": "Company Name",
                    "location": "Location",
                    "salary": "Salary Range",
                    "description": "Brief description",
                    "requirements": ["requirement1", "requirement2"],
                    "url": "job posting url",
                    "posted_date": "date",
                    "match_score": 85
                  }
                ]
              }
              Focus on jobs posted within the last 7 days. Include match score based on profile alignment.`
            },
            {
              role: 'user',
              content: searchQuery
            }
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data: PerplexityResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      return this.parseJobResults(content);
    } catch (error) {
      console.error('Job search error:', error);
      throw new Error(`Failed to search jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build personalized search query based on user profile
   */
  private buildSearchQuery(userProfile: UserProfile, customQuery?: string, location?: string): string {
    const { skills, experience, jobTitle, preferences } = userProfile;
    
    let query = `Find current job openings for ${jobTitle || 'software developer'} positions `;
    
    if (location || userProfile.location) {
      query += `in ${location || userProfile.location} `;
    }
    
    if (preferences.remote) {
      query += `(including remote opportunities) `;
    }
    
    query += `requiring skills in ${skills.slice(0, 5).join(', ')}. `;
    
    if (experience) {
      query += `Looking for ${experience} level positions. `;
    }
    
    if (preferences.salary) {
      query += `Salary range around ${preferences.salary}. `;
    }
    
    if (customQuery) {
      query += `Additional requirements: ${customQuery}. `;
    }
    
    query += `Please search job boards like LinkedIn, Indeed, Glassdoor, AngelList, and company career pages for recent postings.`;
    
    return query;
  }

  /**
   * Parse job results from Perplexity response
   */
  private parseJobResults(content: string): JobSearchResult[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, parse text format
        return this.parseTextResults(content);
      }

      const jsonData = JSON.parse(jsonMatch[0]);
      return jsonData.jobs || [];
    } catch (error) {
      console.warn('Failed to parse JSON, falling back to text parsing:', error);
      return this.parseTextResults(content);
    }
  }

  /**
   * Parse text-based job results as fallback
   */
  private parseTextResults(content: string): JobSearchResult[] {
    const jobs: JobSearchResult[] = [];
    const lines = content.split('\n');
    
    let currentJob: Partial<JobSearchResult> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('Title:') || trimmed.includes('Job:')) {
        if (currentJob.title) {
          jobs.push(currentJob as JobSearchResult);
          currentJob = {};
        }
        currentJob.title = trimmed.split(':')[1]?.trim() || '';
      } else if (trimmed.includes('Company:')) {
        currentJob.company = trimmed.split(':')[1]?.trim() || '';
      } else if (trimmed.includes('Location:')) {
        currentJob.location = trimmed.split(':')[1]?.trim() || '';
      } else if (trimmed.includes('Salary:')) {
        currentJob.salary = trimmed.split(':')[1]?.trim() || '';
      }
    }
    
    if (currentJob.title) {
      jobs.push(currentJob as JobSearchResult);
    }
    
    return jobs;
  }

  // Helper methods for profile extraction
  private extractSkills(text: string): string[] {
    const skillPatterns = [
      /skills?:\s*([^.\n]+)/i,
      /technologies?:\s*([^.\n]+)/i,
      /expertise:\s*([^.\n]+)/i
    ];
    
    const skills: string[] = [];
    for (const pattern of skillPatterns) {
      const match = text.match(pattern);
      if (match) {
        skills.push(...match[1].split(/[,;]/).map(s => s.trim()));
      }
    }
    
    // Common tech skills extraction
    const commonSkills = ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java', 'C++', 'SQL', 'AWS', 'Docker'];
    for (const skill of commonSkills) {
      if (text.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }
    
    return skills.slice(0, 10); // Limit to top 10 skills
  }

  private extractExperience(text: string): string {
    const expPatterns = [
      /(\d+)\s*years?\s*(?:of\s*)?experience/i,
      /experience:\s*(\d+\s*years?)/i,
      /(senior|junior|mid-level|entry-level)/i
    ];
    
    for (const pattern of expPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'Mid-level';
  }

  private extractLocation(text: string): string {
    const locationPatterns = [
      /location:\s*([^.\n,]+)/i,
      /address:\s*([^.\n,]+)/i,
      /(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Remote';
  }

  private extractJobTitle(text: string): string {
    const titlePatterns = [
      /(?:job\s*title|position|role):\s*([^.\n]+)/i,
      /(software\s*engineer|developer|programmer|analyst|manager|director|consultant|specialist)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Software Developer';
  }

  private extractSalary(text: string): string {
    const salaryPattern = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g;
    const matches = text.match(salaryPattern);
    return matches ? matches[0] : '';
  }

  private extractIndustry(text: string): string {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing'];
    for (const industry of industries) {
      if (text.toLowerCase().includes(industry.toLowerCase())) {
        return industry;
      }
    }
    return 'Technology';
  }
}

export const jobSearchService = new JobSearchService();