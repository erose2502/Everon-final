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
    
    const searchQuery = `current job openings ${query}${profileContext} ${new Date().getFullYear()} site:indeed.com OR site:linkedin.com OR site:glassdoor.com`;

    console.log('🔍 Searching jobs with query:', searchQuery);

    try {
      const requestBody = {
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a job search assistant. Search for real job listings and provide specific details including job title, company name, location, salary (if available), and a brief description. Only include actual job postings you find."
          },
          {
            role: "user",
            content: `Find current job openings: ${searchQuery}. For each job, provide: job title, company, location, salary range (if available), and brief description. Focus on real, active job postings.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
        return_citations: true,
        search_recency_filter: "month" // Only recent postings
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
      const jobs = this.parseJobResults(content, query);
      
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
  private parseJobResults(content: string, originalQuery: string): JobSearchResult[] {
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
          jobs.push(this.finalizeJob(currentJob, originalQuery));
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
      // Look for location indicators
      else if (trimmed.match(/location|located|based|office|remote/i) && currentJob.title) {
        const locationMatch = trimmed.match(/(?:location|located|based|office):\s*(.+)|(.+?),\s*[A-Z]{2}|remote/i);
        if (locationMatch) {
          currentJob.location = (locationMatch[1] || locationMatch[2] || 'Remote').trim();
        }
      }
      // Look for salary
      else if (trimmed.match(/\$[\d,]+/i) && currentJob.title) {
        const salaryMatch = trimmed.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*(?:per\s*year|\/year|annually|\/yr))?/i);
        if (salaryMatch) {
          currentJob.salary = salaryMatch[0];
        }
      }
      // Add to description
      else if (currentJob.title && trimmed.length > 20) {
        currentJob.description = (currentJob.description || '') + ' ' + trimmed;
      }
    }
    
    // Add the last job
    if (currentJob.title) {
      jobs.push(this.finalizeJob(currentJob, originalQuery));
    }
    
    // If no jobs were parsed, create fallback jobs
    if (jobs.length === 0) {
      console.log('🔧 DEBUG: No jobs parsed, creating fallback results');
      return this.createFallbackJobs(originalQuery, content);
    }
    
    console.log(`🔧 DEBUG: Successfully parsed ${jobs.length} jobs`);
    return jobs.slice(0, 10);
  }
  
  /**
   * Finalize a job object with defaults and cleanup
   */
  private finalizeJob(job: Partial<JobSearchResult>, query: string): JobSearchResult {
    // Clean up location by removing markdown and formatting
    const cleanLocation = (job.location || '')
      .replace(/^\*\*[^*]*\*\*\s*/, '') // Remove **Location:**
      .replace(/^Location:\s*/i, '') // Remove Location:
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .trim();

    // Clean up description by removing source references and formatting
    const cleanDescription = (job.description || '')
      .replace(/\[Source:[^\]]*\]/g, '') // Remove [Source: ...]
      .replace(/^\*\*[^*]*\*\*\s*/, '') // Remove **Description:**
      .replace(/^Description:\s*/i, '') // Remove Description:
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .trim();

    return {
      title: job.title || 'Job Title Not Found',
      company: job.company || 'Company Not Specified',
      location: cleanLocation || 'Location Not Specified',
      salary: job.salary,
      description: cleanDescription.substring(0, 500) || 'Contact company for job details.',
      requirements: job.requirements || [],
      url: job.url,
      posted_date: job.posted_date || new Date().toISOString(),
      match_score: this.calculateMatchScore(job.title || '', cleanDescription || '', query)
    };
  }
  
  /**
   * Create fallback jobs when parsing fails
   */
  private createFallbackJobs(query: string, content: string): JobSearchResult[] {
    // Try to extract any job-like information from the content
    const hasJobInfo = content.match(/job|position|role|hiring|opening/i);
    
    if (!hasJobInfo) {
      return [{
        title: `${query} positions available`,
        company: 'Various Companies',
        location: 'Multiple Locations',
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
      location: 'Various Locations',
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