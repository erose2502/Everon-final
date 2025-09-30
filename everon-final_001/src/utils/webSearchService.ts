// Web Search Service using Perplexity API for real-time information
import { JobSearchResult, UserProfile } from '../types/job';

interface PerplexitySearchResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  web_results?: {
    title: string;
    url: string;
    snippet: string;
  }[];
  citations?: string[];
}


export interface SearchResult {
  query: string;
  content: string;
  summary: string;
  sources?: string[];
  timestamp: Date;
}

export interface JobMarketInsight {
  title: string;
  description: string;
  trend: 'rising' | 'stable' | 'declining';
  salary_range?: string;
  skills_in_demand?: string[];
  growth_rate?: string;
}

class WebSearchService {
  private readonly apiKey: string;
  private readonly chatUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    console.log('🔧 DEBUG: Raw API key from env:', import.meta.env.VITE_PERPLEXITY_API_KEY);
    
    if (!this.apiKey) {
      console.error('⚠️ VITE_PERPLEXITY_API_KEY is not set in environment variables');
      console.error('🔧 Available env vars:', Object.keys(import.meta.env));
    } else {
      console.log('✅ Perplexity API key loaded successfully:', this.apiKey.substring(0, 10) + '...');
      console.log('📡 Using Perplexity Chat API endpoint:', this.chatUrl);
      
      if (!this.apiKey.startsWith('pplx-')) {
        console.warn('⚠️ API key format might be incorrect. Perplexity keys should start with "pplx-"');
      }
    }
    if (!this.apiKey) {
      throw new Error('Perplexity API key not found in environment variables');
    }
  }

  /**
   * Perform general web search using Perplexity AI with sonar model
   */
  async search(query: string): Promise<SearchResult> {
    try {
      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful search assistant. Provide comprehensive, accurate, and up-to-date information based on real-time web search results. Include relevant sources and key insights.'
            },
            {
              role: 'user',
              content: `Search for: ${query}. Provide a detailed summary with key insights and current information.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          return_citations: true,
          return_related_questions: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexitySearchResponse = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('No content received from Perplexity API');
      }

      const content = data.choices[0].message.content;
      
      return {
        query,
        content,
        summary: this.extractSummary(content),
        sources: data.citations,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Web search error:', error);
      throw new Error(`Failed to perform web search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for current job trends and market insights
   */
  async getJobMarketTrends(industry?: string, location?: string): Promise<JobMarketInsight[]> {
    const baseQuery = `current job market trends ${new Date().getFullYear()}`;
    const industryFilter = industry ? ` in ${industry}` : '';
    const locationFilter = location ? ` for ${location}` : ' United States';
    
    const query = `${baseQuery}${industryFilter}${locationFilter} salary growth hiring demand skills`;

    try {
      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a job market analyst. Provide structured insights about current job trends, salary ranges, in-demand skills, and market growth. Format your response as a comprehensive analysis with specific data points.'
            },
            {
              role: 'user',
              content: `Analyze the current job market trends for ${query}. Include: 1) Top trending roles 2) Salary ranges 3) Most in-demand skills 4) Growth projections 5) Market opportunities. Be specific and data-driven.`
            }
          ],
          max_tokens: 1200,
          temperature: 0.2,
          return_citations: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexitySearchResponse = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      return this.parseJobMarketInsights(content);
    } catch (error) {
      console.error('Job market trends error:', error);
      throw new Error(`Failed to get job market trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for real-time job opportunities using sonar model
   */
  async searchJobs(query: string, userProfile?: UserProfile): Promise<JobSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key is not configured. Please set VITE_PERPLEXITY_API_KEY in your environment variables.');
    }

    const profileContext = userProfile 
      ? ` for someone with ${userProfile.experience} experience in ${userProfile.skills?.join(', ')}`
      : '';
    
    // Include location in search if available
    const locationContext = userProfile?.location 
      ? ` in ${userProfile.location} or remote`
      : '';
    
    const searchQuery = `current job openings ${query}${profileContext}${locationContext} ${new Date().getFullYear()} site:indeed.com OR site:linkedin.com OR site:glassdoor.com`;

    console.log('🔍 Searching jobs with query:', searchQuery);

    try {
      const requestBody = {
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are an expert job search assistant. Search comprehensively for real job listings and provide detailed information for each position. For EVERY job you find, you MUST include: 1) Complete job title, 2) Company name, 3) EXACT LOCATION (city, state, or 'Remote'), 4) Salary/compensation if available, 5) DETAILED job description (minimum 2-3 sentences explaining responsibilities, requirements, and what the role involves). Take your time to search thoroughly and provide comprehensive details for each position. Never leave descriptions empty or vague."
          },
          {
            role: "user",
            content: `Search extensively for current job openings: ${searchQuery}. 

For EACH job posting you find, provide this complete information:
- **Job Title:** [Full position title]
- **Company:** [Company name]  
- **Location:** [City, State OR Remote]
- **Salary:** [If available, include range]
- **Description:** [Detailed description of 2-3+ sentences covering: main responsibilities, required skills/experience, and key aspects of the role]

Search thoroughly and take time to find quality listings with comprehensive details. Focus on real, active job postings from reputable sources.`
          }
        ],
        max_tokens: 3000, // Increased for more detailed job descriptions
        temperature: 0.1, // Lower temperature for more accurate results
        return_citations: true,
        search_recency_filter: "month", // Only recent postings
        search_domain_filter: ["indeed.com", "linkedin.com", "glassdoor.com"] // Focus on quality job sites
      };

      console.log('📡 Sending request to Perplexity API:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response received with status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📡 Perplexity API error response:', errorText);
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexitySearchResponse = await response.json();
      console.log('📡 Response data:', JSON.stringify(data, null, 2));
      
      const content = data.choices[0]?.message?.content || '';
      console.log('📡 Job search content received (first 300 chars):', content.substring(0, 300));
      
      // Parse the content to extract job listings
      const jobs = this.parseJobResults(content, query, userProfile);
      
      // Add citation URLs if available
      if (data.citations && data.citations.length > 0) {
        jobs.forEach((job, index) => {
          if (!job.url && data.citations && data.citations[index]) {
            job.url = data.citations[index];
          }
        });
      }
      
      return jobs;
    } catch (error) {
      console.error('Job search error:', error);
      throw new Error(`Failed to search jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get market changes and economic indicators affecting jobs
   */
  async getMarketChanges(industry?: string): Promise<SearchResult> {
    const query = industry 
      ? `${industry} industry market changes economic impact jobs ${new Date().getFullYear()}`
      : `job market economic changes employment trends ${new Date().getFullYear()}`;

    return this.search(query);
  }

  /**
   * Extract summary from content
   */
  private extractSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '...' : '');
  }

  /**
   * Parse job market insights from Perplexity response
   */
  private parseJobMarketInsights(content: string): JobMarketInsight[] {
    const insights: JobMarketInsight[] = [];
    
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentInsight: Partial<JobMarketInsight> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for job titles or roles
      if (trimmed.match(/^(\d+\.|-|•)?\s*([A-Z][a-z\s]+(?:Developer|Engineer|Manager|Analyst|Specialist|Coordinator))/i)) {
        if (currentInsight.title) {
          insights.push(currentInsight as JobMarketInsight);
        }
        currentInsight = {
          title: trimmed.replace(/^(\d+\.|-|•)/, '').trim(),
          description: '',
          trend: 'rising'
        };
      }
      
      // Look for salary information
      if (trimmed.match(/\$[\d,]+/)) {
        currentInsight.salary_range = trimmed.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/)?.[0] || '';
      }
      
      // Look for skills
      if (trimmed.toLowerCase().includes('skills') || trimmed.toLowerCase().includes('require')) {
        const skills = trimmed.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
        currentInsight.skills_in_demand = skills.slice(0, 5);
      }
      
      if (!currentInsight.description && trimmed.length > 20) {
        currentInsight.description = trimmed;
      }
    }
    
    if (currentInsight.title) {
      insights.push(currentInsight as JobMarketInsight);
    }
    
    if (insights.length === 0) {
      insights.push({
        title: 'General Market Trends',
        description: content.substring(0, 200) + '...',
        trend: 'stable'
      });
    }
    
    return insights.slice(0, 5);
  }

  /**
   * Parse job results from Perplexity response
   */
  private parseJobResults(content: string, originalQuery: string, userProfile?: UserProfile): JobSearchResult[] {
    console.log('🔧 DEBUG: Parsing job results from content');
    
    const jobs: JobSearchResult[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentJob: Partial<JobSearchResult> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and very short lines
      if (trimmed.length < 10) continue;
      
      // Look for job title patterns (numbered lists, bullets, or bold text indicators)
      const titleMatch = trimmed.match(/^(?:\d+\.|[-•*]|\*\*)\s*(.+?)(?:\*\*)?(?:\s+at\s+|\s+-\s+)?(.+)?$/i);
      
      if (titleMatch) {
        // Save previous job if exists
        if (currentJob.title) {
          jobs.push(this.finalizeJob(currentJob, originalQuery, userProfile));
        }
        
        // Start new job
        const titlePart = titleMatch[1]?.trim() || '';
        const companyPart = titleMatch[2]?.trim();
        
        // Check if "at Company" pattern exists
        const atMatch = titlePart.match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
          currentJob = {
            title: atMatch[1].trim(),
            company: atMatch[2].trim(),
            location: 'Location not specified',
            description: '',
            requirements: [],
            match_score: 75
          };
        } else {
          currentJob = {
            title: titlePart,
            company: companyPart || 'Company not specified',
            location: 'Location not specified',
            description: '',
            requirements: [],
            match_score: 75
          };
        }
      }
      // Look for location indicators - improved patterns
      else if (currentJob.title) {
        // Check for explicit location patterns
        const locationPatterns = [
          /(?:location|located|based|office):\s*(.+)/i,
          /(.+?),\s*[A-Z]{2}(?:\s+\d{5})?/i, // City, State format
          /(remote|work from home|wfh)/i,
          /in\s+([^,\n]+(?:,\s*[A-Z]{2})?)/i, // "in City, State" format
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/i // Direct City, State
        ];
        
        for (const pattern of locationPatterns) {
          const locationMatch = trimmed.match(pattern);
          if (locationMatch) {
            let location = locationMatch[1]?.trim() || locationMatch[0]?.trim();
            if (location && location.toLowerCase().includes('remote')) {
              location = 'Remote';
            }
            if (location && location !== currentJob.location) {
              currentJob.location = location;
              break;
            }
          }
        }
      }
      // Look for salary
      else if (trimmed.match(/\$[\d,]+/i) && currentJob.title) {
        const salaryMatch = trimmed.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*(?:per\s*year|\/year|annually|\/yr))?/i);
        if (salaryMatch) {
          currentJob.salary = salaryMatch[0];
        }
      }
      // Add to description - capture more detailed content
      else if (currentJob.title && trimmed.length > 15) {
        // Skip lines that are just metadata
        if (!trimmed.match(/^(posted|updated|id:|ref:|source:)/i)) {
          const separator = currentJob.description ? ' ' : '';
          currentJob.description = (currentJob.description || '') + separator + trimmed;
        }
      }
    }
    
    // Add the last job
    if (currentJob.title) {
      jobs.push(this.finalizeJob(currentJob, originalQuery, userProfile));
    }
    
    // If no jobs were parsed, create fallback jobs
    if (jobs.length === 0) {
      console.log('🔧 DEBUG: No jobs parsed, creating fallback results');
      return this.createFallbackJobs(originalQuery, content, userProfile);
    }
    
    console.log(`🔧 DEBUG: Successfully parsed ${jobs.length} jobs`);
    return jobs.slice(0, 10);
  }
  
  /**
   * Finalize a job object with defaults and cleanup
   */
  private finalizeJob(job: Partial<JobSearchResult>, query: string, userProfile?: UserProfile): JobSearchResult {
    // Clean up location by removing markdown and formatting
    let cleanLocation = (job.location || '')
      .replace(/^\*\*[^*]*\*\*\s*/, '') // Remove **Location:**
      .replace(/^Location:\s*/i, '') // Remove Location:
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .trim();

    // Use better location fallback based on user profile and query
    if (!cleanLocation || cleanLocation === 'Location not specified') {
      if (userProfile?.preferences?.remote) {
        cleanLocation = 'Remote';
      } else if (userProfile?.location) {
        cleanLocation = `${userProfile.location} area`;
      } else if (query.toLowerCase().includes('remote')) {
        cleanLocation = 'Remote';
      } else {
        cleanLocation = 'Location varies';
      }
    }

    // Clean up description by removing source references and formatting
    const cleanDescription = (job.description || '')
      .replace(/\[Source:[^\]]*\]/g, '') // Remove [Source: ...]
      .replace(/^\*\*[^*]*\*\*\s*/, '') // Remove **Description:**
      .replace(/^Description:\s*/i, '') // Remove Description:
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .trim();

    // Ensure description is never empty
    let finalDescription = cleanDescription.substring(0, 800) || '';
    if (!finalDescription || finalDescription.length < 50) {
      const jobRole = job.title || 'this position';
      const companyName = job.company || 'the company';
      finalDescription = `This ${jobRole.toLowerCase()} role at ${companyName} offers an exciting opportunity to contribute to the team's success. The position involves key responsibilities in the field and requires relevant skills and experience. Interested candidates should contact the company directly for detailed job requirements and application procedures.`;
    }

    return {
      title: job.title || 'Job Title Not Found',
      company: job.company || 'Company Not Specified',
      location: cleanLocation,
      salary: job.salary,
      description: finalDescription,
      requirements: job.requirements || [],
      url: job.url,
      posted_date: job.posted_date || new Date().toISOString(),
      match_score: this.calculateMatchScore(job.title || '', cleanDescription || '', query)
    };
  }
  
  /**
   * Create fallback jobs when parsing fails
   */
  private createFallbackJobs(query: string, content: string, userProfile?: UserProfile): JobSearchResult[] {
    // Try to extract any job-like information from the content
    const hasJobInfo = content.match(/job|position|role|hiring|opening/i);
    
    if (!hasJobInfo) {
      return [{
        title: `${query} positions available`,
        company: 'Various Companies',
        location: userProfile?.location ? `${userProfile.location} area` : 'Multiple Locations',
        description: 'Based on current market data, multiple positions are available. Please check job boards like Indeed, LinkedIn, and Glassdoor for specific listings.',
        requirements: [],
        match_score: 60,
        posted_date: new Date().toISOString()
      }];
    }
    
    // Extract some information from content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    
    return [{
      title: `${query} Opportunities`,
      company: 'Multiple Employers',
      location: userProfile?.location ? `${userProfile.location} area` : 'Various Locations',
      description: sentences.slice(0, 3).join('. ') || 'Job opportunities available in this field.',
      requirements: [],
      match_score: 65,
      posted_date: new Date().toISOString()
    }];
  }

  /**
   * Calculate match score based on keyword overlap
   */
  private calculateMatchScore(title: string, description: string, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const contentText = `${title} ${description}`.toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentText.includes(word)) {
        matches++;
      }
    }
    
    return Math.min(100, Math.round((matches / Math.max(queryWords.length, 1)) * 100));
  }
}

export const webSearchService = new WebSearchService();