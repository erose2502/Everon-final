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
    this.apiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_PERPLEXITY_API_KEY : '';
    console.log('🔧 DEBUG: Raw API key from env:', this.apiKey);
    
    if (!this.apiKey) {
      console.error('⚠️ VITE_PERPLEXITY_API_KEY is not set in environment variables');
      console.error('🔧 Available env vars:', typeof import.meta !== 'undefined' && import.meta.env ? Object.keys(import.meta.env) : 'import.meta.env not available');
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
    
    const searchQuery = `current job openings ${query}${profileContext}${locationContext} ${new Date().getFullYear()} site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:careers OR site:jobs`;

    console.log('🔍 Searching jobs with query:', searchQuery);

    try {
      const requestBody = {
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are an expert job search assistant that provides PERFECTLY FORMATTED job listings. Your responses must be structured EXACTLY as specified for clean UI display.

CRITICAL FORMATTING RULES:
1. Start each job with **Job Title:** followed by the EXACT position name ONLY
2. Next line: **Company:** followed by the company name ONLY  
3. Next line: **Location:** followed by city, state OR "Remote" ONLY
4. Next line: **Salary:** followed by the salary range (e.g., "$80,000 - $120,000/year" or "$50 - $75/hour")
   - ALWAYS try to include salary information from the job posting
   - If exact salary not listed, provide typical range for that role based on market data
   - Format: "$XX,XXX - $XX,XXX/year" or "$XX - $XX/hour" or "Competitive (est. $XX,XXX - $XX,XXX)"
5. Next line: **Description:** followed by 2-4 complete sentences about the role

SEARCH COMPREHENSIVE SOURCES:
- Indeed.com job postings
- LinkedIn job listings
- Glassdoor opportunities
- Company career pages (careers.company.com)
- Local company websites with job openings
- Well-reviewed employers in the area

QUALITY STANDARDS:
- Each job MUST have a specific job title (not vague descriptions)
- Each job MUST have a real company name (not "Various" or "Multiple")
- Each job MUST have a specific location (city, state) or "Remote"
- Each job SHOULD include salary range (from posting or market estimate)
- Descriptions MUST be detailed (50+ words minimum)
- ONLY include REAL, ACTIVE job postings from the past 30 days
- Take your time to find 5 high-quality, well-formatted listings`
          },
          {
            role: "user",
            content: `Search thoroughly for 5 current job openings: ${searchQuery}

Find jobs from:
✓ Indeed.com and LinkedIn job boards
✓ Company career websites (e.g., microsoft.com/careers, google.com/jobs)  
✓ Glassdoor listings
✓ Local businesses with strong reviews hiring in the area
✓ Company-specific job portals

For EACH of the 5 jobs, provide EXACTLY this format:

**Job Title:** [Exact position title - be specific, not generic]
**Company:** [Real company name]
**Location:** [City, State OR Remote]
**Salary:** [$XX,XXX - $XX,XXX/year OR $XX - $XX/hour OR Competitive (est. $XX,XXX - $XX,XXX)]
**Description:** [2-4 detailed sentences covering: main responsibilities, key requirements, what makes this role unique, and what the company does. Minimum 50 words.]

IMPORTANT: Always include salary information. If the job posting shows salary, use it. If not, provide a market-based estimate for that role and location.

Take time to search comprehensively. Focus on quality over speed. Return 5 well-formatted, detailed job listings with salary ranges.`
          }
        ],
        max_tokens: 4000, // Increased for comprehensive search
        temperature: 0.2, // Low for accurate, factual results
        return_citations: true,
        search_recency_filter: "month", // Only recent postings
        search_domain_filter: ["indeed.com", "linkedin.com", "glassdoor.com", "careers", "jobs"] // Comprehensive sources
      };

      console.log('📡 Sending request to Perplexity API for comprehensive job search');

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
      console.log('📡 Response data received');
      
      const content = data.choices[0]?.message?.content || '';
      console.log('📡 Job search content received, length:', content.length);
      
      // Parse the content to extract job listings
      const jobs = this.parseJobResults(content, query, userProfile);
      
      // Add citation URLs if available
      if (data.citations && data.citations.length > 0) {
        console.log('📎 Available citations:', data.citations);
        
        // Try to match jobs with citations intelligently
        // Filter for job-related URLs (career pages, job boards)
        const jobUrls = data.citations.filter(url => 
          url.includes('indeed.com') || 
          url.includes('linkedin.com') || 
          url.includes('glassdoor.com') ||
          url.includes('/careers') ||
          url.includes('/jobs') ||
          url.includes('/job/') ||
          url.includes('/career/') ||
          url.includes('apply')
        );
        
        console.log('🔗 Filtered job URLs:', jobUrls);
        
        jobs.forEach((job, index) => {
          if (!job.url) {
            // First try to use filtered job URLs
            if (jobUrls[index]) {
              job.url = jobUrls[index];
              console.log(`✅ Assigned URL to ${job.title}: ${job.url}`);
            } 
            // Fallback to any citation
            else if (data.citations && data.citations[index]) {
              job.url = data.citations[index];
              console.log(`⚠️ Assigned fallback URL to ${job.title}: ${job.url}`);
            } 
            // If still no URL, create a Google search link as last resort
            else {
              const searchQuery = encodeURIComponent(`${job.title} ${job.company} ${job.location || ''} job apply`);
              job.url = `https://www.google.com/search?q=${searchQuery}`;
              console.log(`🔍 Generated Google search URL for ${job.title}: ${job.url}`);
            }
          }
        });
      } else {
        console.log('⚠️ No citations received from Perplexity API');
        // Generate Google search URLs for all jobs if no citations
        jobs.forEach((job) => {
          if (!job.url) {
            const searchQuery = encodeURIComponent(`${job.title} ${job.company} ${job.location || ''} job apply`);
            job.url = `https://www.google.com/search?q=${searchQuery}`;
            console.log(`🔍 Generated Google search URL for ${job.title}: ${job.url}`);
          }
        });
      }
      
      console.log(`✅ Successfully found ${jobs.length} job listings`);
      jobs.forEach((job, idx) => {
        console.log(`  ${idx + 1}. ${job.title} at ${job.company} - URL: ${job.url || 'NO URL'}`);
      });
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
    console.log('🔧 Parsing job results from structured content');
    
    const jobs: JobSearchResult[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentJob: Partial<JobSearchResult> = {};
    let isCollectingDescription = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (trimmed.length < 3) continue;
      
      // Detect **Job Title:** - this starts a new job
      if (trimmed.match(/^\*\*Job Title:\*\*/i) || trimmed.match(/^Job Title:/i)) {
        // Save previous job if it has complete data
        if (currentJob.title && currentJob.company && currentJob.description && currentJob.description.length > 50) {
          jobs.push(this.finalizeJob(currentJob, originalQuery, userProfile));
        }
        
        // Start new job
        const title = trimmed
          .replace(/^\*\*Job Title:\*\*\s*/i, '')
          .replace(/^Job Title:\s*/i, '')
          .trim();
        
        currentJob = {
          title: title,
          company: '',
          location: '',
          description: '',
          requirements: [],
          match_score: 75
        };
        isCollectingDescription = false;
        console.log('📝 Found job title:', title);
      }
      // Detect **Company:**
      else if (trimmed.match(/^\*\*Company:\*\*/i) || trimmed.match(/^Company:/i)) {
        const company = trimmed
          .replace(/^\*\*Company:\*\*\s*/i, '')
          .replace(/^Company:\s*/i, '')
          .trim();
        currentJob.company = company;
        console.log('🏢 Found company:', company);
      }
      // Detect **Location:**
      else if (trimmed.match(/^\*\*Location:\*\*/i) || trimmed.match(/^Location:/i)) {
        const location = trimmed
          .replace(/^\*\*Location:\*\*\s*/i, '')
          .replace(/^Location:\s*/i, '')
          .trim();
        currentJob.location = location;
        console.log('📍 Found location:', location);
      }
      // Detect **Salary:**
      else if (trimmed.match(/^\*\*Salary:\*\*/i) || trimmed.match(/^Salary:/i)) {
        const salary = trimmed
          .replace(/^\*\*Salary:\*\*\s*/i, '')
          .replace(/^Salary:\s*/i, '')
          .trim();
        if (salary && !salary.match(/not available|not specified|n\/a/i)) {
          currentJob.salary = salary;
          console.log('💰 Found salary:', salary);
        }
      }
      // Detect **Description:** - start collecting description
      else if (trimmed.match(/^\*\*Description:\*\*/i) || trimmed.match(/^Description:/i)) {
        const descStart = trimmed
          .replace(/^\*\*Description:\*\*\s*/i, '')
          .replace(/^Description:\s*/i, '')
          .trim();
        currentJob.description = descStart;
        isCollectingDescription = true;
        console.log('📄 Starting description collection');
      }
      // Continue collecting description if we're in description mode
      else if (isCollectingDescription && currentJob.title) {
        // Stop collecting if we hit another field marker or new job
        if (trimmed.match(/^\*\*[A-Z]/)) {
          isCollectingDescription = false;
        } else {
          // Add to description
          const separator = currentJob.description ? ' ' : '';
          currentJob.description = (currentJob.description || '') + separator + trimmed;
        }
      }
      // Fallback: if we have a title but no explicit fields, try to extract info
      else if (currentJob.title && !currentJob.company && trimmed.length > 10) {
        // Look for company mentions
        const companyPattern = trimmed.match(/(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&.,-]+?)(?:\s+in|\s+located|,|$)/);
        if (companyPattern && !currentJob.company) {
          currentJob.company = companyPattern[1].trim();
        }
      }
    }
    
    // Save the last job if complete
    if (currentJob.title && currentJob.company && currentJob.description && currentJob.description.length > 50) {
      jobs.push(this.finalizeJob(currentJob, originalQuery, userProfile));
    }
    
    console.log(`✅ Successfully parsed ${jobs.length} complete jobs from structured format`);
    
    // If no jobs were parsed with the structured format, create fallback
    if (jobs.length === 0) {
      console.log('⚠️ No structured jobs found, creating fallback');
      return this.createFallbackJobs(originalQuery, content, userProfile);
    }
    
    return jobs.slice(0, 5); // Limit to 5 jobs
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

    // Use better location fallback - prioritize Remote over generic text
    if (!cleanLocation || cleanLocation === 'Location not specified' || cleanLocation === 'Not specified') {
      if (userProfile?.preferences?.remote || query.toLowerCase().includes('remote')) {
        cleanLocation = 'Remote';
      } else if (userProfile?.location) {
        cleanLocation = userProfile.location;
      } else {
        cleanLocation = 'Remote'; // Default to Remote instead of "Location varies"
      }
    }

    // Clean up description by removing source references and formatting
    const cleanDescription = (job.description || '')
      .replace(/\[Source:[^\]]*\]/g, '') // Remove [Source: ...]
      .replace(/^\*\*[^*]*\*\*\s*/, '') // Remove **Description:**
      .replace(/^Description:\s*/i, '') // Remove Description:
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .trim();

    // Clean up title - remove any formatting
    const cleanTitle = (job.title || '')
      .replace(/^\*\*[^*]*\*\*\s*/, '')
      .replace(/^Job Title:\s*/i, '')
      .replace(/^[-•*]\s*/, '')
      .trim();

    // Clean up company
    const cleanCompany = (job.company || '')
      .replace(/^\*\*[^*]*\*\*\s*/, '')
      .replace(/^Company:\s*/i, '')
      .replace(/^[-•*]\s*/, '')
      .trim();

    // Only use fallback description if we have NO description at all
    let finalDescription = cleanDescription.substring(0, 800) || '';
    if (!finalDescription) {
      finalDescription = `Position available. Please check the job posting for detailed requirements and responsibilities.`;
    }

    return {
      title: cleanTitle || 'Position Available',
      company: cleanCompany || 'See Job Posting',
      location: cleanLocation,
      salary: job.salary,
      description: finalDescription,
      requirements: job.requirements || [],
      url: job.url,
      posted_date: job.posted_date || new Date().toISOString(),
      match_score: this.calculateMatchScore(cleanTitle || '', finalDescription || '', query)
    };
  }
  
  /**
   * Create fallback jobs when parsing fails
   */
  private createFallbackJobs(query: string, content: string, userProfile?: UserProfile): JobSearchResult[] {
    console.log('⚠️ Creating fallback jobs - structured parsing failed');
    
    // Extract any useful information from the content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const hasJobKeywords = content.match(/\b(developer|engineer|manager|analyst|specialist|coordinator|designer|consultant)\b/gi);
    
    if (hasJobKeywords && hasJobKeywords.length > 0) {
      // Try to create jobs based on mentioned roles
      const roles = [...new Set(hasJobKeywords.map(r => r.toLowerCase()))].slice(0, 5);
      
      return roles.map((role, index) => ({
        title: `${role.charAt(0).toUpperCase() + role.slice(1)} Position`,
        company: 'Multiple Employers',
        location: userProfile?.location || 'Remote',
        description: sentences[index] || `Seeking qualified ${role}s. Visit job boards like Indeed, LinkedIn, and company career pages for specific listings and application details.`,
        requirements: [],
        match_score: 60 + (index * 2),
        posted_date: new Date().toISOString()
      }));
    }
    
    // Ultimate fallback - single generic result
    return [{
      title: `${query} Opportunities`,
      company: 'Various Companies',
      location: userProfile?.location || 'Multiple Locations',
      description: 'Multiple job opportunities are available. Please search on Indeed.com, LinkedIn.com, and company career websites for current openings. Use specific job titles and locations for best results.',
      requirements: [],
      match_score: 50,
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